import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { RequestUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { CreateResellerServerDto, UpdateResellerServerDto } from './dto';

@Injectable()
export class ResellerServersService {
  constructor(private readonly prisma: PrismaService) {}

  list(user: RequestUser) {
    const where =
      user.role === 'reseller'
        ? { resellerId: user.sub, active: true }
        : user.role === 'admin'
          ? { OR: [{ resellerId: user.sub }, { reseller: { parentId: user.sub } }] }
          : {};
    const isStaff = user.role === 'admin' || user.role === 'dev';
    return this.prisma.resellerServer.findMany({
      where,
      include: {
        server: true,
        reseller: { select: { id: true, name: true, email: true } },
        // fornecedor so e exposto para admin/dev — NUNCA para o revendedor
        ...(isStaff ? { supplier: true } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(user: RequestUser, dto: CreateResellerServerDto) {
    const data = { ...dto };

    if (user.role === 'reseller') {
      // O revendedor so pode se cadastrar a si mesmo (ignora qualquer resellerId enviado).
      data.resellerId = user.sub;
    } else if (user.role === 'admin' && data.resellerId !== user.sub) {
      // admin: para si mesmo ou para um revendedor sob sua gestao
      const reseller = await this.prisma.user.findUnique({ where: { id: data.resellerId } });
      if (!reseller || reseller.parentId !== user.sub) {
        throw new ForbiddenException('Revendedor fora do escopo deste admin');
      }
    }

    const server = await this.prisma.server.findUnique({ where: { id: data.serverId } });
    if (!server) throw new NotFoundException('Servidor nao encontrado');

    // Reativa/atualiza se ja existir o mesmo vinculo (resellerId+serverId+login),
    // evitando erro de duplicidade ao "recadastrar".
    const existing = await this.prisma.resellerServer.findUnique({
      where: { resellerId_serverId_login: { resellerId: data.resellerId, serverId: data.serverId, login: data.login } },
    });
    if (existing) {
      return this.prisma.resellerServer.update({
        where: { id: existing.id },
        data: { valuePerCredit: data.valuePerCredit, active: true },
        include: { server: true },
      });
    }

    return this.prisma.resellerServer.create({ data, include: { server: true } });
  }

  async update(user: RequestUser, id: string, dto: UpdateResellerServerDto) {
    const current = await this.prisma.resellerServer.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Vinculo nao encontrado');
    if (user.role === 'reseller' && current.resellerId !== user.sub) {
      throw new ForbiddenException('Sem permissao para editar este vinculo');
    }
    if (user.role === 'admin' && current.resellerId !== user.sub) {
      const reseller = await this.prisma.user.findUnique({ where: { id: current.resellerId } });
      if (!reseller || reseller.parentId !== user.sub) {
        throw new ForbiddenException('Vinculo fora do escopo deste admin');
      }
    }

    // Apenas admin/dev podem definir o fornecedor (oculto ao revendedor)
    const data = { ...dto };
    if (user.role !== 'admin' && user.role !== 'dev') delete data.supplierId;

    return this.prisma.resellerServer.update({
      where: { id },
      data,
      include: { server: true, ...(user.role === 'admin' || user.role === 'dev' ? { supplier: true } : {}) },
    });
  }

  async remove(user: RequestUser, id: string) {
    const current = await this.prisma.resellerServer.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Vinculo nao encontrado');
    if (user.role === 'admin' && current.resellerId !== user.sub) {
      const reseller = await this.prisma.user.findUnique({ where: { id: current.resellerId } });
      if (!reseller || reseller.parentId !== user.sub) {
        throw new ForbiddenException('Vinculo fora do escopo deste admin');
      }
    }

    return this.prisma.resellerServer.update({
      where: { id },
      data: { active: false },
      include: { server: true },
    });
  }
}
