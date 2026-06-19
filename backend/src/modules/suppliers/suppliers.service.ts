import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto, UpdateSupplierDto } from './dto';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  list(serverId?: string) {
    return this.prisma.supplier.findMany({
      where: { active: true, ...(serverId ? { serverId } : {}) },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(dto: CreateSupplierDto) {
    const server = await this.prisma.server.findUnique({ where: { id: dto.serverId } });
    if (!server || !server.active) throw new NotFoundException('Servidor nao encontrado');
    return this.prisma.supplier.create({
      data: {
        ...dto,
        name: dto.name.trim(),
        panelLogin: dto.panelLogin.trim(),
        panelLink: dto.panelLink?.trim() || null,
      },
    });
  }

  async update(id: string, dto: UpdateSupplierDto) {
    const current = await this.ensure(id);
    const data = {
      ...dto,
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.panelLogin !== undefined ? { panelLogin: dto.panelLogin.trim() } : {}),
      ...(dto.panelLink !== undefined ? { panelLink: dto.panelLink.trim() || null } : {}),
    };
    if (data.name === '') throw new BadRequestException('Nome obrigatorio');
    if (data.panelLogin === '') throw new BadRequestException('Login do painel obrigatorio');
    if (data.active === true) {
      const server = await this.prisma.server.findUnique({ where: { id: current.serverId } });
      if (!server || !server.active) throw new BadRequestException('Servidor do fornecedor esta inativo');
    }
    return this.prisma.supplier.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.ensure(id);
    // soft delete: desativa e desvincula dos reseller-servers
    await this.prisma.resellerServer.updateMany({ where: { supplierId: id }, data: { supplierId: null } });
    return this.prisma.supplier.update({ where: { id }, data: { active: false } });
  }

  private async ensure(id: string) {
    const s = await this.prisma.supplier.findUnique({ where: { id } });
    if (!s) throw new NotFoundException('Fornecedor nao encontrado');
    return s;
  }
}
