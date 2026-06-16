import { Injectable, NotFoundException } from '@nestjs/common';
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

  create(dto: CreateSupplierDto) {
    return this.prisma.supplier.create({ data: { ...dto } });
  }

  async update(id: string, dto: UpdateSupplierDto) {
    await this.ensure(id);
    return this.prisma.supplier.update({ where: { id }, data: { ...dto } });
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
