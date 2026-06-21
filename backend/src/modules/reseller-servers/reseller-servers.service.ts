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
        ...(isStaff ? { supplier: true, serverFornecedor: { include: { fornecedor: true } } } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(user: RequestUser, dto: CreateResellerServerDto) {
    const data = { ...dto };

    if (user.role === 'reseller') {
      // O revendedor so pode se cadastrar a si mesmo (ignora qualquer resellerId enviado).
      data.resellerId = user.sub;
      delete data.supplierId;
      delete data.serverFornecedorId;
    } else if (!data.resellerId) {
      throw new BadRequestException('Revendedor obrigatorio para criar vinculo');
    } else if (user.role === 'admin' && data.resellerId !== user.sub) {
      // Admin: para si mesmo, para um revendedor sob sua gestao ou para
      // revendedores migrados/orfaos. O importador historico nao tinha parentId,
      // mas esses resellers ainda precisam receber servidores.
      const reseller = await this.prisma.user.findUnique({ where: { id: data.resellerId } });
      if (
        !reseller ||
        reseller.role !== UserRole.reseller ||
        (reseller.parentId !== user.sub && reseller.parentId !== null)
      ) {
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
    if (!Number.isFinite(Number(data.valuePerCredit)) || Number(data.valuePerCredit) <= 0) {
      throw new BadRequestException('Valor por credito obrigatorio');
    }
    await this.assertProviderLink(data.serverFornecedorId, data.supplierId, data.serverId);

    // Reativa/atualiza se ja existir o mesmo vinculo (resellerId+serverId+login),
    // evitando erro de duplicidade ao "recadastrar".
    const existing = await this.prisma.resellerServer.findUnique({
      where: { resellerId_serverId_login: { resellerId, serverId: data.serverId, login } },
    });
    if (existing) {
      const updateData =
        user.role === 'reseller'
          ? {
              active: true,
            }
          : {
              valuePerCredit: data.valuePerCredit,
              ...(data.serverFornecedorId !== undefined ? { serverFornecedorId: data.serverFornecedorId } : {}),
              ...(data.supplierId !== undefined ? { supplierId: data.supplierId } : {}),
              active: true,
            };
      return this.prisma.resellerServer.update({
        where: { id: existing.id },
        data: updateData,
        include: this.resellerServerIncludeFor(user),
      });
    }

    return this.prisma.resellerServer.create({
      data: { ...data, resellerId, login },
      include: this.resellerServerIncludeFor(user),
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
      if (!reseller || (reseller.parentId !== user.sub && reseller.parentId !== null)) {
        throw new ForbiddenException('Vinculo fora do escopo deste admin');
      }
    }

    // Apenas admin/dev podem definir o fornecedor (oculto ao revendedor)
    const data = { ...dto };
    if (user.role !== 'admin' && user.role !== 'dev') {
      delete data.supplierId;
      delete data.serverFornecedorId;
      delete data.valuePerCredit;
    }
    if (data.login !== undefined) {
      data.login = data.login.trim();
      if (!data.login) throw new BadRequestException('Login obrigatorio');
    }
    await this.assertProviderLink(data.serverFornecedorId, data.supplierId, current.serverId);

    return this.prisma.resellerServer.update({
      where: { id },
      data,
      include: this.resellerServerIncludeFor(user),
    });
  }

  async remove(user: RequestUser, id: string) {
    const current = await this.prisma.resellerServer.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Vinculo nao encontrado');
    if (user.role === 'admin' && current.resellerId !== user.sub) {
      const reseller = await this.prisma.user.findUnique({ where: { id: current.resellerId } });
      if (!reseller || (reseller.parentId !== user.sub && reseller.parentId !== null)) {
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

  private resellerServerIncludeFor(user: RequestUser) {
    const isStaff = user.role === 'admin' || user.role === 'dev';
    return {
      server: this.serverIncludeFor(user),
      reseller: { select: { id: true, name: true, email: true } },
      ...(isStaff ? { supplier: true, serverFornecedor: { include: { fornecedor: true } } } : {}),
    } as const;
  }

  private async assertProviderLink(
    serverFornecedorId: string | null | undefined,
    supplierId: string | null | undefined,
    serverId: string,
  ) {
    if (serverFornecedorId) {
      const link = await this.prisma.serverFornecedor.findUnique({
        where: { id: serverFornecedorId },
      });
      if (!link || !link.active || link.serverId !== serverId) {
        throw new BadRequestException('Fornecedor invalido para este servidor');
      }
    }
    if (supplierId) {
      const supplier = await this.prisma.supplier.findUnique({ where: { id: supplierId } });
      if (!supplier || !supplier.active || supplier.serverId !== serverId) {
        throw new BadRequestException('Fornecedor legado invalido para este servidor');
      }
    }
  }
}
