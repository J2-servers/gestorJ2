import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentType, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { RequestUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateMeDto, UpdateUserDto } from './dto';

const selectUser = {
  id: true,
  email: true,
  name: true,
  phone: true,
  profileImageUrl: true,
  role: true,
  status: true,
  paymentType: true,
  parentId: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  me(userId: string) {
    return this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: selectUser });
  }

  list(current: RequestUser) {
    // Admin ve seus revendedores + resgata orfaos (parentId null) de auto-cadastros
    // antigos, que de outra forma ficariam invisiveis.
    const where =
      current.role === 'admin'
        ? { OR: [{ parentId: current.sub }, { role: UserRole.reseller, parentId: null }] }
        : {};
    return this.prisma.user.findMany({ where, select: selectUser, orderBy: { createdAt: 'desc' } });
  }

  async create(current: RequestUser, dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();
    const exists = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (exists) throw new ConflictException('Email ja cadastrado');

    // POLÍTICA DE 2 ADMINS: o sistema NUNCA cria contas administrativas pela API.
    // Os 2 admins (operacional + recuperação) existem apenas via seed inicial.
    // Qualquer criação aqui é forçada para revendedor, vinculada ao admin atual.
    return this.prisma.user.create({
      data: {
        email,
        name: dto.name.trim(),
        phone: dto.phone?.trim() || null,
        passwordHash: dto.password ? await bcrypt.hash(dto.password, 12) : null,
        role: UserRole.reseller,
        status: UserStatus.active,
        paymentType: dto.paymentType || PaymentType.prepaid,
        parentId: current.sub,
      },
      select: selectUser,
    });
  }

  updateMe(userId: string, dto: UpdateMeDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...dto,
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone.trim() || null } : {}),
        ...(dto.profileImageUrl !== undefined ? { profileImageUrl: dto.profileImageUrl.trim() || null } : {}),
      },
      select: selectUser,
    });
  }

  async update(current: RequestUser, id: string, dto: UpdateUserDto) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('Usuario nao encontrado');
    if (current.role !== 'dev' && target.id !== current.sub && target.parentId !== current.sub) {
      throw new ForbiddenException('Sem permissao para editar este usuario');
    }

    // Protecao do modelo break-glass 2-admins: nunca promover via API para
    // admin/recovery, nem rebaixar as contas administrativas existentes.
    if (dto.role && dto.role !== target.role) {
      if (dto.role === UserRole.admin || dto.role === UserRole.recovery) {
        throw new ForbiddenException('Promover para admin/recovery e bloqueado (modelo 2-admins). Use o seed/recuperacao.');
      }
      if (target.role === UserRole.admin || target.role === UserRole.recovery) {
        throw new ForbiddenException('Nao e permitido alterar o papel das contas administrativas.');
      }
    }

    const { password, ...data } = dto;
    if (current.role !== 'dev') {
      delete data.parentId;
      delete data.role;
    }
    if (data.name !== undefined) data.name = data.name.trim();
    if (data.phone !== undefined) data.phone = data.phone.trim() || undefined;
    if (data.profileImageUrl !== undefined) data.profileImageUrl = data.profileImageUrl.trim() || undefined;
    const passwordData = password ? { passwordHash: await bcrypt.hash(password, 12) } : {};

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: { ...data, ...passwordData },
        select: selectUser,
      });

      if (password) {
        await tx.refreshToken.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }

      return updated;
    });
  }

  async remove(current: RequestUser, id: string) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('Usuario nao encontrado');
    if (target.role !== UserRole.reseller) {
      throw new ForbiddenException('Contas administrativas nao podem ser removidas por esta rota');
    }
    if (current.role !== 'dev' && target.parentId !== current.sub) {
      throw new ForbiddenException('Sem permissao para remover este usuario');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: { status: UserStatus.blocked },
        select: selectUser,
      });

      await tx.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      return updated;
    });
  }
}
