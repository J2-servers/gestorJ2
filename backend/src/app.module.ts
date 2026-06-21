import 'dotenv/config';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { getJwtSecret } from './common/config/jwt.config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { RecoveryLockdownGuard } from './common/guards/recovery-lockdown.guard';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuditModule } from './modules/audit/audit.module';
import { CreditRequestsModule } from './modules/credit-requests/credit-requests.module';
import { ChatModule } from './modules/chat/chat.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { HealthModule } from './modules/health/health.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { MessagesModule } from './modules/messages/messages.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { RecoveryModule } from './modules/recovery/recovery.module';
import { ResellerServersModule } from './modules/reseller-servers/reseller-servers.module';
import { ServersModule } from './modules/servers/servers.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { FornecedoresModule } from './modules/fornecedores/fornecedores.module';
import { ServerFornecedoresModule } from './modules/server-fornecedores/server-fornecedores.module';
import { SettingsModule } from './modules/settings/settings.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { ImportModule } from './modules/import/import.module';
import { UsersModule } from './modules/users/users.module';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';
import { isRedisDisabled } from './modules/whatsapp/whatsapp-queue-fallback';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ secret: getJwtSecret(config) }),
    }),
    ...(isRedisDisabled()
      ? []
      : [
          BullModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
              connection: {
                host: config.get<string>('REDIS_HOST') || 'localhost',
                port: config.get<number>('REDIS_PORT') || 6379,
                password: config.get<string>('REDIS_PASSWORD') || undefined,
                username: config.get<string>('REDIS_USERNAME') || undefined,
                // resiliencia: se o Redis estiver fora, continua tentando reconectar
                // em silencio em vez de derrubar o processo.
                maxRetriesPerRequest: null,
                enableOfflineQueue: true,
                retryStrategy: (times: number) => Math.min(times * 500, 5000),
              },
            }),
          }),
        ]),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    ServersModule,
    SuppliersModule,
    FornecedoresModule,
    ServerFornecedoresModule,
    ResellerServersModule,
    SettingsModule,
    CreditRequestsModule,
    ChatModule,
    MessagesModule,
    NotificationsModule,
    WhatsAppModule,
    InvoicesModule,
    TemplatesModule,
    AnalyticsModule,
    DashboardModule,
    UploadsModule,
    AuditModule,
    RecoveryModule,
    MaintenanceModule,
    ImportModule,
  ],
  providers: [
    // Guard global: política default-deny para a conta de recuperação
    { provide: APP_GUARD, useClass: RecoveryLockdownGuard },
    // Filtro global de exceções (persiste erros 5xx via Prisma para a página de Manutenção)
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
