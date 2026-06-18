import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreditRequestsService } from './credit-requests.service';
import { CreateCreditRequestDto, DecisionDto, UpdateCreditRequestDto } from './dto';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('credit-requests')
export class CreditRequestsController {
  constructor(private readonly requests: CreditRequestsService) {}

  @Get()
  list(
    @CurrentUser() user: RequestUser,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.requests.list(user, cursor, limit ? Number(limit) : 50);
  }

  @Get(':id')
  getOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.requests.getOne(user, id);
  }

  @Post()
  @Roles('reseller')
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateCreditRequestDto) {
    return this.requests.create(user.sub, dto);
  }

  @Patch(':id')
  @Roles('reseller')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateCreditRequestDto) {
    return this.requests.updatePending(user, id, dto);
  }

  @Patch(':id/cancel')
  @Roles('reseller')
  cancel(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.requests.cancel(user, id);
  }

  @Patch(':id/analyzing')
  @Roles('admin', 'dev')
  analyzing(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.requests.markAnalyzing(user, id);
  }

  @Patch(':id/approve')
  @Roles('admin', 'dev')
  approve(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: DecisionDto) {
    return this.requests.approve(user, id, dto.notes);
  }

  @Patch(':id/reject')
  @Roles('admin', 'dev')
  reject(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: DecisionDto) {
    return this.requests.reject(user, id, dto.reason || 'Rejeitado pelo administrador', dto.rejectionImageUrl);
  }
}
