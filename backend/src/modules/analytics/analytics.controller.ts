import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AnalyticsService } from './analytics.service';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get()
  @Roles('admin', 'dev')
  get(@CurrentUser() user: RequestUser) {
    return this.analytics.getAdminAnalytics(user.sub);
  }
}
