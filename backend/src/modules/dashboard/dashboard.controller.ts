import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';

@UseGuards(AuthGuard('jwt'))
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('admin')
  adminDashboard(@CurrentUser() user: RequestUser) {
    return this.dashboard.adminDashboard(user.sub);
  }

  @Get('reseller')
  resellerDashboard(@CurrentUser() user: RequestUser) {
    return this.dashboard.resellerDashboard(user.sub);
  }
}
