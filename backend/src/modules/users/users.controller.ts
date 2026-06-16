import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AllowRecovery } from '../../common/decorators/allow-recovery.decorator';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateUserDto, UpdateMeDto, UpdateUserDto } from './dto';
import { UsersService } from './users.service';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  @AllowRecovery() // a conta de recuperação precisa saber quem ela é
  me(@CurrentUser() user: RequestUser) {
    return this.users.me(user.sub);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: RequestUser, @Body() dto: UpdateMeDto) {
    return this.users.updateMe(user.sub, dto);
  }

  @Get()
  @Roles('admin', 'dev')
  list(@CurrentUser() user: RequestUser) {
    return this.users.list(user);
  }

  @Post()
  @Roles('admin', 'dev')
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateUserDto) {
    return this.users.create(user, dto);
  }

  @Patch(':id')
  @Roles('admin', 'dev')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(user, id, dto);
  }

  @Delete(':id')
  @Roles('admin', 'dev')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.users.remove(user, id);
  }
}
