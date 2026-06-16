import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UpdateSettingsDto } from './dto';
import { SettingsService } from './settings.service';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('public')
  getPublic(@CurrentUser() user: RequestUser) {
    return this.settings.getPublicForUser(user);
  }

  @Get()
  @Roles('admin')
  get(@CurrentUser() user: RequestUser) {
    return this.settings.getForAdmin(user.sub);
  }

  @Patch()
  @Roles('admin')
  update(@CurrentUser() user: RequestUser, @Body() dto: UpdateSettingsDto) {
    return this.settings.updateForAdmin(user.sub, dto);
  }
}
