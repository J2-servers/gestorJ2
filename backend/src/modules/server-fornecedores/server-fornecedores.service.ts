import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServerFornecedorDto, UpdateServerFornecedorDto } from './dto';

@Injectable()
export class ServerFornecedoresService {
  constructor(private readonly prisma: PrismaService) {}

  listByServer(serverId: string) {
    return this.prisma.serverFornecedor.findMany({
      where: { serverId },
      include: { fornecedor: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  listAll() {
    return this.prisma.serverFornecedor.findMany({
      include: { server: { select: { id: true, name: true } }, fornecedor: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(dto: CreateServerFornecedorDto) {
    const server = await this.prisma.server.findUnique({ where: { id: dto.serverId } });
    if (!server || !server.active) throw new NotFoundException('Servidor nao encontrado');

    const fornecedor = await this.prisma.fornecedor.findUnique({ where: { id: dto.fornecedorId } });
    if (!fornecedor || !fornecedor.active) throw new NotFoundException('Fornecedor nao encontrado');

    const existing = await this.prisma.serverFornecedor.findUnique({
      where: { serverId_fornecedorId: { serverId: dto.serverId, fornecedorId: dto.fornecedorId } },
    });
    if (existing) {
      if (existing.active) {
        throw new BadRequestException('Este fornecedor ja esta vinculado a este servidor');
      }
      return this.prisma.serverFornecedor.update({
        where: { id: existing.id },
        data: {
          costPerCredit: dto.costPerCredit,
          panelLogin: dto.panelLogin.trim(),
          panelLink: dto.panelLink?.trim() || null,
          panelPassword: dto.panelPassword?.trim() || null,
          notes: dto.notes?.trim() || null,
          active: true,
        },
        include: { fornecedor: true },
      });
    }

    return this.prisma.serverFornecedor.create({
      data: {
        serverId: dto.serverId,
        fornecedorId: dto.fornecedorId,
        costPerCredit: dto.costPerCredit,
        panelLogin: dto.panelLogin.trim(),
        panelLink: dto.panelLink?.trim() || null,
        panelPassword: dto.panelPassword?.trim() || null,
        notes: dto.notes?.trim() || null,
        active: dto.active ?? true,
      },
      include: { fornecedor: true },
    });
  }

  async update(id: string, dto: UpdateServerFornecedorDto) {
    await this.ensure(id);
    const data: Record<string, unknown> = {};
    if (dto.costPerCredit !== undefined) data.costPerCredit = dto.costPerCredit;
    if (dto.panelLogin !== undefined) {
      const login = dto.panelLogin.trim();
      if (!login) throw new BadRequestException('Login do painel obrigatorio');
      data.panelLogin = login;
    }
    if (dto.panelLink !== undefined) data.panelLink = dto.panelLink?.trim() || null;
    if (dto.panelPassword !== undefined) data.panelPassword = dto.panelPassword?.trim() || null;
    if (dto.notes !== undefined) data.notes = dto.notes?.trim() || null;
    if (dto.active !== undefined) data.active = dto.active;

    return this.prisma.serverFornecedor.update({
      where: { id },
      data,
      include: { fornecedor: true },
    });
  }

  async remove(id: string) {
    await this.ensure(id);
    return this.prisma.serverFornecedor.update({
      where: { id },
      data: { active: false },
      include: { fornecedor: true },
    });
  }

  private async ensure(id: string) {
    const sf = await this.prisma.serverFornecedor.findUnique({ where: { id } });
    if (!sf) throw new NotFoundException('Vinculo fornecedor-servidor nao encontrado');
    return sf;
  }
}
