import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateResellerServerDto, UpdateResellerServerDto } from './dto';
import { ResellerServersService } from './reseller-servers.service';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('reseller-servers')
export class ResellerServersController {
  constructor(private readonly resellerServers: ResellerServersService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.resellerServers.list(user);
  }

  @Post()
  @Roles('admin', 'dev')
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateResellerServerDto) {
    return this.resellerServers.create(user, dto);
  }

  @Patch(':id')
  @Roles('admin', 'dev', 'reseller')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateResellerServerDto) {
    return this.resellerServers.update(user, id, dto);
  }

  @Delete(':id')
  @Roles('admin', 'dev')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.resellerServers.remove(user, id);
  }
}
