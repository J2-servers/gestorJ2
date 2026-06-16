import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { getJwtSecret } from '../../common/config/jwt.config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.['access_token'] ?? null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        // Allow ?auth=<token> query param for SSE (EventSource cannot set headers)
        (req: Request) => (req?.query?.['auth'] as string) ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(config),
    });
  }

  validate(payload: { sub: string; email: string; role: 'admin' | 'reseller' | 'dev' | 'recovery' }) {
    return payload;
  }
}
