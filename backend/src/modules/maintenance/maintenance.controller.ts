import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { MaintenanceService } from './maintenance.service';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin', 'dev')
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenance: MaintenanceService) {}

  @Get('overview')
  overview() {
    return this.maintenance.overview();
  }

  @Get('system-overview')
  systemOverview() {
    return this.maintenance.systemOverview();
  }

  @Get('errors')
  errors(@Query('limit') limit?: string) {
    return this.maintenance.listErrors(limit ? Number(limit) : 100);
  }

  @Patch('errors/:id/resolve')
  resolveError(@Param('id') id: string) {
    return this.maintenance.resolveError(id);
  }

  @Delete('errors')
  clearErrors(@CurrentUser() user: RequestUser) {
    return this.maintenance.clearErrors(user);
  }

  @Get('scripts')
  scripts() {
    return this.maintenance.listScripts();
  }

  @Post('scripts/:id/diagnose')
  diagnose(@Param('id') id: string) {
    return this.maintenance.diagnose(id);
  }

  @Post('scripts/:id/apply')
  apply(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.maintenance.apply(id, user);
  }

  @Get('whatsapp-queue')
  whatsappQueue() {
    return this.maintenance.whatsappQueue();
  }

  @Post('whatsapp-queue/retry')
  retryWhatsapp(@CurrentUser() user: RequestUser) {
    return this.maintenance.retryWhatsapp(user);
  }

  @Get('migrations')
  migrations() {
    return this.maintenance.migrationsStatus();
  }

  @Post('migrations/deploy')
  deployMigrations(@CurrentUser() user: RequestUser) {
    return this.maintenance.migrationsDeploy(user);
  }
}
