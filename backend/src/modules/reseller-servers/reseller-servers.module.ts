import { Module } from '@nestjs/common';
import { ResellerServersController } from './reseller-servers.controller';
import { ResellerServersService } from './reseller-servers.service';

@Module({
  controllers: [ResellerServersController],
  providers: [ResellerServersService],
})
export class ResellerServersModule {}
