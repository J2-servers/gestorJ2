import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFornecedorDto, UpdateFornecedorDto } from './dto';

@Injectable()
export class FornecedoresService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.fornecedor.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { serverFornecedores: true } },
      },
    });
  }

  async create(dto: CreateFornecedorDto) {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Nome do fornecedor obrigatorio');
    return this.prisma.fornecedor.create({
      data: {
        name,
        contact: dto.contact?.trim() || null,
        notes: dto.notes?.trim() || null,
        active: dto.active ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateFornecedorDto) {
    await this.ensure(id);
    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new BadRequestException('Nome do fornecedor obrigatorio');
      data.name = name;
    }
    if (dto.contact !== undefined) data.contact = dto.contact?.trim() || null;
    if (dto.notes !== undefined) data.notes = dto.notes?.trim() || null;
    if (dto.active !== undefined) data.active = dto.active;
    return this.prisma.fornecedor.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.ensure(id);
    return this.prisma.fornecedor.update({
      where: { id },
      data: { active: false },
    });
  }

  async reactivate(id: string) {
    await this.ensure(id);
    return this.prisma.fornecedor.update({
      where: { id },
      data: { active: true },
    });
  }

  private async ensure(id: string) {
    const f = await this.prisma.fornecedor.findUnique({ where: { id } });
    if (!f) throw new NotFoundException('Fornecedor nao encontrado');
    return f;
  }
}
