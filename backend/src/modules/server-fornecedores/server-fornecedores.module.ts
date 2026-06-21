import { Module } from '@nestjs/common';
import { ServerFornecedoresController } from './server-fornecedores.controller';
import { ServerFornecedoresService } from './server-fornecedores.service';

@Module({
  controllers: [ServerFornecedoresController],
  providers: [ServerFornecedoresService],
  exports: [ServerFornecedoresService],
})
export class ServerFornecedoresModule {}
