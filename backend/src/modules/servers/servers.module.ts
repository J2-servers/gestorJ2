import { Module } from '@nestjs/common';
import { ServersController } from './servers.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [ServersController],
  providers: [PrismaService],
})
export class ServersModule {}
