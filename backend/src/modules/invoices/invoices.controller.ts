import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { InvoicesService } from './invoices.service';

class GenerateInvoiceDto {
  resellerId!: string;
}

class MarkPaidDto {
  proofUrl?: string;
}

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.invoices.list(user);
  }

  @Get(':id')
  getOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.invoices.getOne(user, id);
  }

  @Post()
  @Roles('admin', 'dev')
  generate(@CurrentUser() user: RequestUser, @Body() dto: GenerateInvoiceDto) {
    return this.invoices.generate(user.sub, dto.resellerId);
  }

  @Patch(':id/pay')
  @Roles('admin', 'dev')
  markPaid(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: MarkPaidDto) {
    return this.invoices.markPaid(user.sub, id, dto.proofUrl);
  }

  @Post(':id/resend')
  @Roles('admin', 'dev')
  resend(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.invoices.resend(user.sub, id);
  }
}
