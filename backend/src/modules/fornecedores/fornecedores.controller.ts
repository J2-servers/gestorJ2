import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateFornecedorDto, UpdateFornecedorDto } from './dto';
import { FornecedoresService } from './fornecedores.service';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('fornecedores')
export class FornecedoresController {
  constructor(private readonly fornecedores: FornecedoresService) {}

  @Get()
  @Roles('admin', 'dev')
  list() {
    return this.fornecedores.list();
  }

  @Post()
  @Roles('admin', 'dev')
  create(@Body() dto: CreateFornecedorDto) {
    return this.fornecedores.create(dto);
  }

  @Patch(':id')
  @Roles('admin', 'dev')
  update(@Param('id') id: string, @Body() dto: UpdateFornecedorDto) {
    return this.fornecedores.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin', 'dev')
  remove(@Param('id') id: string) {
    return this.fornecedores.remove(id);
  }

  @Patch(':id/reactivate')
  @Roles('admin', 'dev')
  reactivate(@Param('id') id: string) {
    return this.fornecedores.reactivate(id);
  }
}
