import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Roles('admin', 'dev')
  list() {
    return this.prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
  }
}
