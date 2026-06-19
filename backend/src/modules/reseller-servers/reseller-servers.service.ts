import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
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
          ? {
              OR: [
                { resellerId: user.sub },
                { reseller: { parentId: user.sub } },
                { reseller: { role: UserRole.reseller, parentId: null } },
              ],
            }
          : {};
    const isStaff = user.role === 'admin' || user.role === 'dev';
    return this.prisma.resellerServer.findMany({
      where,
      include: {
        server: isStaff
          ? true
          : { select: { id: true, name: true, panelLink: true, valuePerCredit: true, active: true } },
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
    } else if (!data.resellerId) {
      throw new BadRequestException('Revendedor obrigatorio para criar vinculo');
    } else if (user.role === 'admin' && data.resellerId !== user.sub) {
      // admin: para si mesmo ou para um revendedor sob sua gestao
      const reseller = await this.prisma.user.findUnique({ where: { id: data.resellerId } });
      if (!reseller || reseller.role !== UserRole.reseller || reseller.parentId !== user.sub) {
        throw new ForbiddenException('Revendedor fora do escopo deste admin');
      }
    }

    const resellerId = data.resellerId;
    if (!resellerId) throw new BadRequestException('Revendedor obrigatorio para criar vinculo');

    const server = await this.prisma.server.findUnique({ where: { id: data.serverId } });
    if (!server || !server.active) throw new NotFoundException('Servidor nao encontrado');

    const reseller = await this.prisma.user.findUnique({ where: { id: resellerId } });
    if (!reseller || reseller.role !== UserRole.reseller) throw new NotFoundException('Revendedor nao encontrado');
    if (reseller.status !== UserStatus.active) throw new ForbiddenException('Revendedor bloqueado ou inativo');

    const login = data.login.trim();
    if (!login) throw new BadRequestException('Login obrigatorio');

    // Reativa/atualiza se ja existir o mesmo vinculo (resellerId+serverId+login),
    // evitando erro de duplicidade ao "recadastrar".
    const existing = await this.prisma.resellerServer.findUnique({
      where: { resellerId_serverId_login: { resellerId, serverId: data.serverId, login } },
    });
    if (existing) {
      return this.prisma.resellerServer.update({
        where: { id: existing.id },
        data: { valuePerCredit: data.valuePerCredit, active: true },
        include: { server: this.serverIncludeFor(user) },
      });
    }

    return this.prisma.resellerServer.create({
      data: { ...data, resellerId, login },
      include: { server: this.serverIncludeFor(user) },
    });
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
    if (data.login !== undefined) {
      data.login = data.login.trim();
      if (!data.login) throw new BadRequestException('Login obrigatorio');
    }
    if (data.supplierId) {
      const supplier = await this.prisma.supplier.findUnique({ where: { id: data.supplierId } });
      if (!supplier || !supplier.active || supplier.serverId !== current.serverId) {
        throw new BadRequestException('Fornecedor invalido para este servidor');
      }
    }

    return this.prisma.resellerServer.update({
      where: { id },
      data,
      include: {
        server: this.serverIncludeFor(user),
        ...(user.role === 'admin' || user.role === 'dev' ? { supplier: true } : {}),
      },
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

  private serverIncludeFor(user: RequestUser) {
    return user.role === 'admin' || user.role === 'dev'
      ? true
      : { select: { id: true, name: true, panelLink: true, valuePerCredit: true, active: true } };
  }
}
