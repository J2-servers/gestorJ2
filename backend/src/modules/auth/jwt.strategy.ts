import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { UserStatus } from '@prisma/client';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { getJwtSecret } from '../../common/config/jwt.config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.['access_token'] ?? null,
        (req: Request) => req?.cookies?.['access_token_client'] ?? null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        // Allow ?auth=<token> query param for SSE (EventSource cannot set headers)
        (req: Request) => (req?.query?.['auth'] as string) ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(config),
    });
  }

  async validate(payload: { sub: string; email: string; role: 'admin' | 'reseller' | 'dev' | 'recovery' }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, status: true },
    });

    if (!user || user.status !== UserStatus.active) {
      throw new UnauthorizedException('Usuario inativo ou bloqueado');
    }

    return { sub: user.id, email: user.email, role: user.role };
  }
}
