import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsOptional, IsString, IsArray } from 'class-validator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { WhatsAppService } from './whatsapp.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

class BroadcastDto {
  @IsString()
  message!: string;

  @IsOptional()
  @IsArray()
  userIds?: string[];

  @IsOptional()
  @IsString()
  targetType?: 'all' | 'prepaid' | 'postpaid';
}

class TestMessageDto {
  @IsString()
  phone!: string;

  @IsString()
  message!: string;
}

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('whatsapp')
export class WhatsAppController {
  constructor(
    private readonly whatsapp: WhatsAppService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Get('status')
  @Roles('admin', 'dev')
  async status(@CurrentUser() user: RequestUser) {
    const settings = await this.prisma.settings.findUnique({ where: { adminId: user.sub } });
    const apiUrl = settings?.evolutionApiUrl || this.config.get<string>('EVOLUTION_API_URL');
    const apiKey = settings?.evolutionApiKeyRef || this.config.get<string>('EVOLUTION_API_KEY');
    const instance = settings?.evolutionInstance || this.config.get<string>('EVOLUTION_INSTANCE');

    if (!apiUrl || !apiKey || !instance) {
      return { connected: false, state: 'not_configured', message: 'Evolution API não configurada' };
    }

    try {
      const res = await fetch(`${apiUrl.replace(/\/$/, '')}/instance/connectionState/${instance}`, {
        headers: { apikey: apiKey },
        signal: AbortSignal.timeout(5000),
      });
      const data = await res.json().catch(() => ({}));
      return {
        connected: data?.instance?.state === 'open',
        state: data?.instance?.state || 'unknown',
        instance,
        raw: data,
      };
    } catch (err) {
      return { connected: false, state: 'error', message: (err as Error).message };
    }
  }

  @Get('qr')
  @Roles('admin', 'dev')
  async qrCode(@CurrentUser() user: RequestUser) {
    const settings = await this.prisma.settings.findUnique({ where: { adminId: user.sub } });
    const apiUrl = settings?.evolutionApiUrl || this.config.get<string>('EVOLUTION_API_URL');
    const apiKey = settings?.evolutionApiKeyRef || this.config.get<string>('EVOLUTION_API_KEY');
    const instance = settings?.evolutionInstance || this.config.get<string>('EVOLUTION_INSTANCE');

    if (!apiUrl || !apiKey || !instance) {
      return { success: false, message: 'Evolution API não configurada' };
    }

    try {
      const res = await fetch(`${apiUrl.replace(/\/$/, '')}/instance/connect/${instance}`, {
        headers: { apikey: apiKey },
        signal: AbortSignal.timeout(10000),
      });
      const data = await res.json().catch(() => ({}));
      return { success: res.ok, data };
    } catch (err) {
      return { success: false, message: (err as Error).message };
    }
  }

  @Post('test')
  @Roles('admin', 'dev')
  async test(@CurrentUser() user: RequestUser, @Body() dto: TestMessageDto) {
    const log = await this.whatsapp.enqueue({
      phone: dto.phone,
      message: dto.message,
      relatedEntityId: `test-${user.sub}`,
    });
    return { queued: true, logId: log.id };
  }

  @Get('logs')
  @Roles('admin', 'dev')
  async logs(@Query('limit') limit?: string) {
    return this.prisma.whatsAppLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(limit) || 100, 500),
    });
  }

  @Get('queue')
  @Roles('admin', 'dev')
  queueStatus() {
    return this.whatsapp.queueStatus();
  }

  @Post('queue/retry-failed')
  @Roles('admin', 'dev')
  retryFailed() {
    return this.whatsapp.retryFailed();
  }

  @Post('queue/clear-pending')
  @Roles('admin', 'dev')
  clearPending() {
    return this.whatsapp.clearPending();
  }

  @Post('broadcast')
  @Roles('admin', 'dev')
  async broadcast(@CurrentUser() user: RequestUser, @Body() dto: BroadcastDto) {
    const resellerIds = await this.prisma.user
      .findMany({ where: { parentId: user.sub }, select: { id: true } })
      .then((u) => u.map((x) => x.id));

    let where: Record<string, unknown> = { id: { in: resellerIds } };

    if (dto.userIds?.length) {
      where = { id: { in: dto.userIds.filter((id) => resellerIds.includes(id)) } };
    } else if (dto.targetType === 'prepaid') {
      where = { id: { in: resellerIds }, paymentType: 'prepaid' };
    } else if (dto.targetType === 'postpaid') {
      where = { id: { in: resellerIds }, paymentType: 'postpaid' };
    }

    const targets = await this.prisma.user.findMany({
      where,
      select: { id: true, name: true, phone: true },
    });

    let queued = 0;
    let skipped = 0;

    for (const target of targets) {
      if (!target.phone) { skipped++; continue; }
      await this.whatsapp.enqueue({
        phone: target.phone,
        message: dto.message,
        relatedEntityId: `broadcast-${user.sub}`,
      });
      queued++;
    }

    return { queued, skippedNoPhone: skipped, total: targets.length };
  }
}
