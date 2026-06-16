import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { ChangeOwnPasswordDto, ResetAdminCredentialsDto } from './dto';

@Injectable()
export class RecoveryService {
  constructor(private readonly prisma: PrismaService) {}

  /** Identidade mínima do admin operacional — só para a conta de recuperação saber de quem reseta. */
  async getOperationalAdmin() {
    const admin = await this.prisma.user.findFirst({
      where: { role: UserRole.admin },
      select: { id: true, email: true, name: true, updatedAt: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!admin) throw new NotFoundException('Administrador operacional não encontrado.');
    return admin;
  }

  /** Troca e-mail e/ou senha do admin operacional. Revoga todas as sessões dele. */
  async resetOperationalCredentials(recoveryUserId: string, dto: ResetAdminCredentialsDto) {
    if (!dto.email && !dto.password) {
      throw new BadRequestException('Informe um novo e-mail e/ou uma nova senha.');
    }

    const admin = await this.prisma.user.findFirst({
      where: { role: UserRole.admin },
      orderBy: { createdAt: 'asc' },
    });
    if (!admin) throw new NotFoundException('Administrador operacional não encontrado.');

    const data: { email?: string; passwordHash?: string } = {};

    if (dto.email && dto.email !== admin.email) {
      const taken = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (taken && taken.id !== admin.id) {
        throw new ConflictException('Este e-mail já está em uso.');
      }
      data.email = dto.email;
    }

    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 12);
    }

    if (!Object.keys(data).length) {
      throw new BadRequestException('Nenhuma alteração a aplicar.');
    }

    const recovery = await this.prisma.user.findUnique({ where: { id: recoveryUserId } });

    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id: admin.id },
        data,
        select: { id: true, email: true, name: true },
      });
      // Força o admin operacional a relogar com as novas credenciais
      await tx.refreshToken.updateMany({
        where: { userId: admin.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          userId: recoveryUserId,
          userName: recovery?.name ?? 'Conta de recuperação',
          action: 'recovery.reset_admin_credentials',
          details: [
            data.email ? 'email alterado' : null,
            data.passwordHash ? 'senha alterada' : null,
          ]
            .filter(Boolean)
            .join('; '),
        },
      });
      return u;
    });

    return { success: true, admin: updated };
  }

  /** A conta de recuperação rotaciona a própria senha (higiene break-glass). */
  async changeOwnPassword(recoveryUserId: string, dto: ChangeOwnPasswordDto) {
    await this.prisma.user.update({
      where: { id: recoveryUserId },
      data: { passwordHash: await bcrypt.hash(dto.password, 12) },
    });
    // Revoga as próprias sessões antigas
    await this.prisma.refreshToken.updateMany({
      where: { userId: recoveryUserId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }
}
