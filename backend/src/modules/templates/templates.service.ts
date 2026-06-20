import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RequestUser } from '../../common/decorators/current-user.decorator';
import { CreateTemplateDto, UpdateTemplateDto } from './dto';

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  list(adminId: string) {
    return this.prisma.messageTemplate.findMany({
      where: { adminId },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(adminId: string, dto: CreateTemplateDto) {
    return this.prisma.messageTemplate.create({
      data: {
        adminId,
        name: dto.name.trim(),
        type: dto.type,
        content: dto.content.trim(),
        active: dto.active ?? true,
      },
    });
  }

  async update(user: RequestUser, id: string, dto: UpdateTemplateDto) {
    const template = await this.prisma.messageTemplate.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Template não encontrado');
    if (template.adminId !== user.sub && user.role !== 'dev') {
      throw new ForbiddenException('Sem permissão');
    }
    return this.prisma.messageTemplate.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.content !== undefined ? { content: dto.content.trim() } : {}),
      },
    });
  }

  async remove(user: RequestUser, id: string) {
    const template = await this.prisma.messageTemplate.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Template não encontrado');
    if (template.adminId !== user.sub && user.role !== 'dev') {
      throw new ForbiddenException('Sem permissão');
    }
    return this.prisma.messageTemplate.update({ where: { id }, data: { active: false } });
  }

  findActive(adminId: string, type: string) {
    return this.prisma.messageTemplate.findFirst({
      where: { adminId, type, active: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  applyVariables(content: string, vars: Record<string, string>): string {
    return content.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
  }
}
