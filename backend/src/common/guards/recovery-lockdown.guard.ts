import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { getJwtSecret } from '../config/jwt.config';
import { ALLOW_RECOVERY_KEY } from '../decorators/allow-recovery.decorator';

/**
 * Guard GLOBAL com política DEFAULT-DENY para a conta de recuperação.
 *
 * A conta `recovery` (segurança/fallback) é bloqueada em TODAS as rotas, exceto
 * as explicitamente marcadas com @AllowRecovery(). Assim ela NUNCA enxerga nada
 * das operações do administrador — só pode trocar credenciais.
 *
 * Decodifica o token por conta própria (independe da ordem dos guards de
 * controller). Para tokens não-recovery ou ausentes, deixa o fluxo normal seguir.
 */
@Injectable()
export class RecoveryLockdownGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(req);
    if (!token) return true; // sem token → fluxo de auth normal cuida

    let payload: { role?: string } | undefined;
    try {
      payload = this.jwt.verify(token, { secret: getJwtSecret(this.config) });
    } catch {
      return true; // token inválido/expirado → deixa o JwtAuthGuard retornar 401
    }

    if (payload?.role !== 'recovery') return true; // não é recovery → sem restrição aqui

    const allowed = this.reflector.getAllAndOverride<boolean>(ALLOW_RECOVERY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (allowed) return true;

    throw new ForbiddenException(
      'Conta de recuperação: acesso restrito à troca de credenciais do administrador.',
    );
  }

  private extractToken(req: Request): string | null {
    const cookieToken = (req as any).cookies?.['access_token'];
    if (cookieToken) return cookieToken;
    const auth = req.headers?.authorization;
    if (auth?.startsWith('Bearer ')) return auth.slice(7);
    const queryToken = req.query?.['auth'];
    if (typeof queryToken === 'string') return queryToken;
    return null;
  }
}
