import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AllowRecovery } from '../../common/decorators/allow-recovery.decorator';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ChangeOwnPasswordDto, ResetAdminCredentialsDto } from './dto';
import { RecoveryService } from './recovery.service';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('recovery')
@AllowRecovery()
@Controller('recovery')
export class RecoveryController {
  constructor(private readonly recovery: RecoveryService) {}

  @Get('operational-admin')
  getOperationalAdmin() {
    return this.recovery.getOperationalAdmin();
  }

  @Patch('operational-admin/credentials')
  resetOperationalCredentials(
    @CurrentUser() user: RequestUser,
    @Body() dto: ResetAdminCredentialsDto,
  ) {
    return this.recovery.resetOperationalCredentials(user.sub, dto);
  }

  @Patch('me/password')
  changeOwnPassword(@CurrentUser() user: RequestUser, @Body() dto: ChangeOwnPasswordDto) {
    return this.recovery.changeOwnPassword(user.sub, dto);
  }
}
