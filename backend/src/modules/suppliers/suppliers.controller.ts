import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateSupplierDto, UpdateSupplierDto } from './dto';
import { SuppliersService } from './suppliers.service';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliers: SuppliersService) {}

  @Get()
  @Roles('admin', 'dev')
  list(@Query('serverId') serverId?: string) {
    return this.suppliers.list(serverId);
  }

  @Post()
  @Roles('admin', 'dev')
  create(@Body() dto: CreateSupplierDto) {
    return this.suppliers.create(dto);
  }

  @Patch(':id')
  @Roles('admin', 'dev')
  update(@Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.suppliers.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin', 'dev')
  remove(@Param('id') id: string) {
    return this.suppliers.remove(id);
  }
}
