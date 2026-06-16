import { SetMetadata } from '@nestjs/common';

/**
 * Marca uma rota como acessível pela conta de recuperação (role `recovery`).
 * Sem este decorator, o RecoveryLockdownGuard BLOQUEIA a conta de recuperação
 * em qualquer rota (default-deny).
 */
export const ALLOW_RECOVERY_KEY = 'allow_recovery';
export const AllowRecovery = () => SetMetadata(ALLOW_RECOVERY_KEY, true);
