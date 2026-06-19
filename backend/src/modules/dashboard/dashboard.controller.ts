import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { DashboardService } from './dashboard.service';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('admin')
  @Roles('admin', 'dev')
  adminDashboard(@CurrentUser() user: RequestUser) {
    return this.dashboard.adminDashboard(user);
  }

  @Get('reseller')
  @Roles('reseller')
  resellerDashboard(@CurrentUser() user: RequestUser) {
    return this.dashboard.resellerDashboard(user.sub);
  }
}
