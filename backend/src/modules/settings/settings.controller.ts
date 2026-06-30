import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UpdatePaymentSettingsDto, UpdateSettingsDto } from './dto';
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

  @Get('payments')
  @Roles('admin')
  getPayments(@CurrentUser() user: RequestUser) {
    return this.settings.getPaymentSettings(user.sub);
  }

  @Patch('payments')
  @Roles('admin')
  updatePayments(@CurrentUser() user: RequestUser, @Body() dto: UpdatePaymentSettingsDto) {
    return this.settings.updatePaymentSettings(user.sub, dto);
  }

  @Patch('payments/:id/toggle')
  @Roles('admin')
  togglePayment(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: { active?: boolean }) {
    return this.settings.togglePaymentSettings(user.sub, id, Boolean(body.active));
  }
}
