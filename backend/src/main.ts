import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const origin = (config.get<string>('FRONTEND_ORIGIN') || 'http://localhost:5174')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  app.use(helmet());
  app.use(cookieParser());
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
