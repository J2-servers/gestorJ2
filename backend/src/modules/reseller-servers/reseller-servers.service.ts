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
    return this.prisma.resellerServer.findMany({
      where,
      include: { server: true, reseller: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(user: RequestUser, dto: CreateResellerServerDto) {
    if (user.role === 'admin' && dto.resellerId !== user.sub) {
      // admin pode cadastrar para si mesmo (resellerId === proprio id)
      // ou para um revendedor sob sua gestao
      const reseller = await this.prisma.user.findUnique({ where: { id: dto.resellerId } });
      if (!reseller || reseller.parentId !== user.sub) {
        throw new ForbiddenException('Revendedor fora do escopo deste admin');
      }
    }
    return this.prisma.resellerServer.create({ data: dto, include: { server: true } });
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

    return this.prisma.resellerServer.update({
      where: { id },
      data: dto,
      include: { server: true },
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
