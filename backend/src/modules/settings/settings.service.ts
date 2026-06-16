import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RequestUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto } from './dto';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  getForAdmin(adminId: string) {
    return this.prisma.settings.upsert({
      where: { adminId },
      create: { adminId, companyName: 'Gestor J2' },
      update: {},
    });
  }

  async getPublicForUser(user: RequestUser) {
    const adminId =
      user.role === 'admin'
        ? user.sub
        : (await this.prisma.user.findUnique({ where: { id: user.sub }, select: { parentId: true } }))?.parentId;

    if (!adminId) {
      return null;
    }

    return this.prisma.settings.upsert({
      where: { adminId },
      create: { adminId, companyName: 'Gestor J2' },
      update: {},
      select: {
        id: true,
        adminId: true,
        companyName: true,
        cnpj: true,
        address: true,
        phone: true,
        email: true,
        faviconUrl: true,
        sidebarLogoUrl: true,
        profileIconUrl: true,
        loginLogoUrl: true,
        loginBackgroundUrl: true,
        adminWhatsapp: true,
        pixKeys: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  updateForAdmin(adminId: string, dto: UpdateSettingsDto) {
    const data = Object.fromEntries(Object.entries({
      ...dto,
      pixKeys: dto.pixKeys as Prisma.InputJsonValue | undefined,
    }).filter(([, value]) => value !== undefined));

    return this.prisma.settings.upsert({
      where: { adminId },
      create: {
        adminId,
        companyName: dto.companyName || 'Gestor J2',
        cnpj: dto.cnpj,
        address: dto.address,
        phone: dto.phone,
        email: dto.email,
        faviconUrl: dto.faviconUrl,
        sidebarLogoUrl: dto.sidebarLogoUrl,
        profileIconUrl: dto.profileIconUrl,
        loginLogoUrl: dto.loginLogoUrl,
        loginBackgroundUrl: dto.loginBackgroundUrl,
        adminWhatsapp: dto.adminWhatsapp,
        whatsappProvider: dto.whatsappProvider || 'evolution',
        evolutionApiUrl: dto.evolutionApiUrl,
        evolutionInstance: dto.evolutionInstance,
        evolutionApiKeyRef: dto.evolutionApiKeyRef,
        n8nWebhookUrl: dto.n8nWebhookUrl,
        fcmServerKey: dto.fcmServerKey,
        pixKeys: (dto.pixKeys || []) as Prisma.InputJsonValue,
      },
      update: data,
    });
  }
}

