import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ImportOrdersDto } from './dto';
import { ImportService } from './import.service';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin', 'dev')
@Controller('import')
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Post('orders/preview')
  preview(@Body() dto: ImportOrdersDto) {
    return this.importService.preview(dto.csv, dto.mapping, dto.costs);
  }

  @Post('orders/commit')
  commit(@CurrentUser() user: RequestUser, @Body() dto: ImportOrdersDto) {
    return this.importService.commit(user.sub, dto.csv, dto.mapping, dto.costs);
  }
}
