import { Body, Controller, Get, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { RechargeCodeStatus } from '@prisma/client';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
  ApproveRechargeCodePaymentDto,
  CreateRechargeCodeOrderDto,
  ImportRechargeCodesDto,
  SellRechargeCodeDto,
  UpsertPlanModalityDto,
  UpsertRechargeCodeProductDto,
  VoidRechargeCodeDto,
} from './dto';
import { RechargeCodesService } from './recharge-codes.service';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('recharge-codes')
export class RechargeCodesController {
  constructor(private readonly service: RechargeCodesService) {}

  @Get('products')
  @Roles('admin', 'dev', 'reseller')
  listProducts(@CurrentUser() user: RequestUser) {
    return this.service.listProducts(user);
  }

  @Get('catalog')
  @Roles('admin', 'dev', 'reseller')
  catalog(@CurrentUser() user: RequestUser) {
    return this.service.catalog(user);
  }

  @Get('payment-options')
  @Roles('admin', 'dev', 'reseller')
  paymentOptions(@CurrentUser() user: RequestUser) {
    return this.service.paymentOptions(user);
  }

  @Get('modalities')
  @Roles('admin', 'dev', 'reseller')
  listModalities(@CurrentUser() user: RequestUser) {
    return this.service.listModalities(user);
  }

  @Post('modalities')
  @Roles('admin', 'dev')
  createModality(@CurrentUser() user: RequestUser, @Body() dto: UpsertPlanModalityDto) {
    return this.service.createModality(user, dto);
  }

  @Patch('modalities/:id')
  @Roles('admin', 'dev')
  updateModality(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpsertPlanModalityDto) {
    return this.service.updateModality(user, id, dto);
  }

  @Post('products')
  @Roles('admin', 'dev')
  createProduct(@CurrentUser() user: RequestUser, @Body() dto: UpsertRechargeCodeProductDto) {
    return this.service.createProduct(user, dto);
  }

  @Patch('products/:id')
  @Roles('admin', 'dev')
  updateProduct(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpsertRechargeCodeProductDto) {
    return this.service.updateProduct(user, id, dto);
  }

  @Get('products/:id/batches')
  @Roles('admin', 'dev')
  listBatches(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.listBatches(user, id);
  }

  @Get('products/:id/codes')
  @Roles('admin', 'dev')
  listCodes(@CurrentUser() user: RequestUser, @Param('id') id: string, @Query('status') status?: RechargeCodeStatus) {
    return this.service.listCodes(user, id, status);
  }

  @Get('sales')
  @Roles('admin', 'dev')
  listSales(@CurrentUser() user: RequestUser, @Query('productId') productId?: string) {
    return this.service.listSales(user, productId);
  }

  @Patch('codes/:id/void')
  @Roles('admin', 'dev')
  voidCode(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: VoidRechargeCodeDto) {
    return this.service.voidCode(user, id, dto);
  }

  @Post('products/:id/import')
  @Roles('admin', 'dev')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  importXlsx(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: ImportRechargeCodesDto,
  ) {
    return this.service.importXlsx(user, id, file, dto);
  }

  @Post('products/:id/import/preview')
  @Roles('admin', 'dev')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  previewXlsx(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: ImportRechargeCodesDto,
  ) {
    return this.service.previewXlsx(user, id, file, dto);
  }

  @Post('products/:id/sell')
  @Roles('admin', 'dev', 'reseller')
  sellNextCode(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: SellRechargeCodeDto) {
    return this.service.sellNextCode(user, id, dto);
  }

  @Post('products/:id/local-sale')
  @Roles('admin', 'dev', 'reseller')
  sellLocal(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: SellRechargeCodeDto) {
    return this.service.sellCodes(user, id, dto);
  }

  @Post('orders')
  @Roles('reseller')
  createOrder(@CurrentUser() user: RequestUser, @Body() dto: CreateRechargeCodeOrderDto) {
    return this.service.createOrder(user, dto);
  }

  @Get('orders')
  @Roles('admin', 'dev', 'reseller')
  listOrders(@CurrentUser() user: RequestUser) {
    return this.service.listOrders(user);
  }

  @Patch('orders/:id/approve-payment')
  @Roles('admin', 'dev')
  approvePayment(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: ApproveRechargeCodePaymentDto) {
    return this.service.approvePayment(user, id, dto);
  }

  @Patch('orders/:id/reject-payment')
  @Roles('admin', 'dev')
  rejectPayment(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.rejectPayment(user, id);
  }

  @Get('my-purchases')
  @Roles('admin', 'dev', 'reseller')
  listMyPurchases(@CurrentUser() user: RequestUser) {
    return this.service.listMyPurchases(user);
  }
}
