import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

// Resiliencia: erros de conexao com Redis (BullMQ) nao devem derrubar o app.
const isInfraConnError = (v: unknown) =>
  /ECONNREFUSED|ETIMEDOUT|ENOTFOUND|ECONNRESET|Connection is closed|NOAUTH|WRONGPASS|redis/i.test(
    String((v as { message?: string })?.message ?? v),
  );
process.on('uncaughtException', (err) => {
  if (isInfraConnError(err)) {
    console.warn('[infra] erro de conexao ignorado:', String(err?.message ?? err));
    return;
  }
  console.error('uncaughtException:', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  if (isInfraConnError(reason)) {
    console.warn('[infra] rejeicao de conexao ignorada:', String((reason as { message?: string })?.message ?? reason));
    return;
  }
  console.error('unhandledRejection:', reason);
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const config = app.get(ConfigService);
  app.getHttpAdapter().getInstance()?.set?.('trust proxy', 1);
  const origin = (config.get<string>('FRONTEND_ORIGIN') || 'http://localhost:5190')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  // Permite desenvolvimento local (Vite) conectar no backend implantado.
  for (const devOrigin of [
    'http://localhost:5190',
    'http://127.0.0.1:5190',
    'http://localhost:5199',
    'http://127.0.0.1:5199',
    'http://localhost:4173',
  ]) {
    if (!origin.includes(devOrigin)) origin.push(devOrigin);
  }

  app.use(helmet());
  app.use(cookieParser());
  // Limite maior para importacao de CSV (muitos pedidos de uma vez).
  const { json, urlencoded } = await import('express');
  app.use(json({ limit: '20mb' }));
  app.use(urlencoded({ extended: true, limit: '20mb' }));
  app.enableCors({
    origin,
    credentials: true,
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  // HttpExceptionFilter é registrado via APP_FILTER no AppModule (precisa de DI do Prisma).

  await app.listen(config.get<number>('PORT') || 3333);
}

bootstrap();
