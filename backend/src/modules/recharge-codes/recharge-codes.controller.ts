import { Body, Controller, Get, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { RechargeCodeStatus } from '@prisma/client';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ImportRechargeCodesDto, SellRechargeCodeDto, UpsertRechargeCodeProductDto, VoidRechargeCodeDto } from './dto';
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
}
