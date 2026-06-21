import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateServerFornecedorDto, UpdateServerFornecedorDto } from './dto';
import { ServerFornecedoresService } from './server-fornecedores.service';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('server-fornecedores')
export class ServerFornecedoresController {
  constructor(private readonly serverFornecedores: ServerFornecedoresService) {}

  @Get()
  @Roles('admin', 'dev')
  list(@Query('serverId') serverId?: string) {
    if (serverId) return this.serverFornecedores.listByServer(serverId);
    return this.serverFornecedores.listAll();
  }

  @Post()
  @Roles('admin', 'dev')
  create(@Body() dto: CreateServerFornecedorDto) {
    return this.serverFornecedores.create(dto);
  }

  @Patch(':id')
  @Roles('admin', 'dev')
  update(@Param('id') id: string, @Body() dto: UpdateServerFornecedorDto) {
    return this.serverFornecedores.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin', 'dev')
  remove(@Param('id') id: string) {
    return this.serverFornecedores.remove(id);
  }
}
