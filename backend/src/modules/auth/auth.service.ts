import { ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PaymentType, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { BootstrapAdminDto, LoginDto, RegisterDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async bootstrapStatus() {
    const [operationalAdmins, recoveryAdmins] = await Promise.all([
      this.prisma.user.count({ where: { role: UserRole.admin } }),
      this.prisma.user.count({ where: { role: UserRole.recovery } }),
    ]);

    return {
      canBootstrap: operationalAdmins === 0 && recoveryAdmins === 0,
      operationalAdmins,
      recoveryAdmins,
      policy: 'one_operational_admin_one_recovery_admin',
    };
  }

  async bootstrapAdmins(dto: BootstrapAdminDto) {
    if (dto.email === dto.recoveryEmail) {
      throw new ConflictException('Use emails diferentes para o admin operacional e a conta de recuperacao');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const [operationalAdmins, recoveryAdmins] = await Promise.all([
        tx.user.count({ where: { role: UserRole.admin } }),
        tx.user.count({ where: { role: UserRole.recovery } }),
      ]);

      if (operationalAdmins > 0 || recoveryAdmins > 0) {
        throw new ForbiddenException('Bootstrap bloqueado: as contas administrativas iniciais ja existem');
      }

      const existingEmail = await tx.user.findFirst({
        where: { email: { in: [dto.email, dto.recoveryEmail] } },
        select: { email: true },
      });
      if (existingEmail) throw new ConflictException(`Email ja cadastrado: ${existingEmail.email}`);

      const [adminPasswordHash, recoveryPasswordHash] = await Promise.all([
        bcrypt.hash(dto.password, 12),
        bcrypt.hash(dto.recoveryPassword, 12),
      ]);

      const admin = await tx.user.create({
        data: {
          email: dto.email,
          name: dto.name,
          passwordHash: adminPasswordHash,
          role: UserRole.admin,
          status: UserStatus.active,
          paymentType: PaymentType.prepaid,
        },
      });

      const recovery = await tx.user.create({
        data: {
          email: dto.recoveryEmail,
          name: 'Conta de Recuperacao',
          passwordHash: recoveryPasswordHash,
          role: UserRole.recovery,
          status: UserStatus.active,
        },
      });

      await tx.settings.create({
        data: {
          adminId: admin.id,
          companyName: 'Gestor J2',
        },
      });

      await tx.auditLog.create({
        data: {
          userId: admin.id,
          userName: admin.name,
          action: 'auth.bootstrap_admins',
          details: JSON.stringify({
            operationalAdminEmail: admin.email,
            recoveryAdminEmail: recovery.email,
          }),
        },
      });

      return admin;
    });

    return this.issueTokens(result);
  }

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email ja cadastrado');

    // Vincula o reseller auto-cadastrado ao admin operacional (modelo de 1 admin).
    // Sem isso o reseller fica orfao (parentId null) e nao aparece na lista do admin.
    const admin = await this.prisma.user.findFirst({
      where: { role: UserRole.admin },
      orderBy: { createdAt: 'asc' },
    });

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        phone: dto.phone?.trim() || null,
        passwordHash: await bcrypt.hash(dto.password, 12),
        role: UserRole.reseller,
        parentId: admin?.id ?? null,
      },
    });

    return this.issueTokens(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user?.passwordHash) throw new UnauthorizedException('Credenciais invalidas');

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Credenciais invalidas');
    if (user.status !== UserStatus.active) throw new UnauthorizedException('Usuario inativo ou bloqueado');

    return this.issueTokens(user);
  }

  async refreshAccess(rawRefreshToken: string) {
    const tokenHash = this.hashToken(rawRefreshToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    const user = await this.prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user || user.status !== UserStatus.active) {
      throw new UnauthorizedException('Usuário inativo');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(user);
  }

  async logout(userId: string, rawRefreshToken?: string) {
    if (rawRefreshToken) {
      const tokenHash = this.hashToken(rawRefreshToken);
      await this.prisma.refreshToken.updateMany({
        where: { userId, tokenHash },
        data: { revokedAt: new Date() },
      });
    } else {
      await this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return { success: true };
  }

  private async issueTokens(user: { id: string; email: string; role: UserRole; name: string }) {
    const accessToken = this.jwt.sign({ sub: user.id, email: user.email, role: user.role });

    const rawRefresh = randomBytes(48).toString('hex');
    const tokenHash = this.hashToken(rawRefresh);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.prisma.refreshToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    return {
      accessToken,
      refreshToken: rawRefresh,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  }

  private hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }
}
