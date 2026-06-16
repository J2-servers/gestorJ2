import { ConfigService } from '@nestjs/config';

/** Fonte única do segredo JWT — usada pela strategy, pelo AuthModule e pelos guards. */
export function getJwtSecret(config: ConfigService): string {
  const secret = config.get<string>('JWT_SECRET');
  if (config.get<string>('NODE_ENV') === 'production' && (!secret || secret.length < 32)) {
    throw new Error('JWT_SECRET obrigatorio e forte em producao.');
  }
  return secret || 'dev-only-secret-change-me';
}
