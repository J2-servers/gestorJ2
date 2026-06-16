import { Body, Controller, Delete, ForbiddenException, Get, NotFoundException, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertServerDto } from './dto';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('servers')
export class ServersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.server.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
  }

  @Get(':id/price-history')
  async priceHistory(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    const server = await this.prisma.server.findUnique({ where: { id } });
    if (!server) throw new NotFoundException('Servidor nao encontrado');
    if (user.role === 'admin' && server.ownerId && server.ownerId !== user.sub) {
      throw new ForbiddenException('Servidor fora do escopo deste admin');
    }
    return this.prisma.serverPriceHistory.findMany({
      where: { serverId: id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  @Post()
  @Roles('admin', 'dev')
  create(@CurrentUser() user: RequestUser, @Body() dto: UpsertServerDto) {
    return this.prisma.$transaction(async (tx) => {
      const server = await tx.server.create({
        data: {
          name: dto.name,
          panelLink: dto.panelLink,
          costPerCredit: dto.costPerCredit ?? 0,
          valuePerCredit: dto.valuePerCredit,
          ownerId: user.role === 'admin' ? user.sub : null,
        },
      });
      await tx.serverPriceHistory.create({
        data: {
          serverId: server.id,
          oldPrice: null,
          newPrice: dto.valuePerCredit,
          changedById: user.sub,
        },
      });
      return server;
    });
  }

  @Patch(':id')
  @Roles('admin', 'dev')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpsertServerDto) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.server.findUnique({ where: { id } });
      if (!current) throw new NotFoundException('Servidor nao encontrado');
      if (user.role === 'admin' && current.ownerId && current.ownerId !== user.sub) {
        throw new ForbiddenException('Servidor fora do escopo deste admin');
      }
      const server = await tx.server.update({
        where: { id },
        data: {
          name: dto.name,
          panelLink: dto.panelLink,
          costPerCredit: dto.costPerCredit ?? 0,
          valuePerCredit: dto.valuePerCredit,
        },
      });
      if (current && Number(current.valuePerCredit) !== Number(dto.valuePerCredit)) {
        await tx.serverPriceHistory.create({
          data: {
            serverId: id,
            oldPrice: current.valuePerCredit,
            newPrice: dto.valuePerCredit,
            changedById: user.sub,
          },
        });
      }
      return server;
    });
  }

  @Delete(':id')
  @Roles('admin', 'dev')
  async remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    const current = await this.prisma.server.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Servidor nao encontrado');
    if (user.role === 'admin' && current.ownerId && current.ownerId !== user.sub) {
      throw new ForbiddenException('Servidor fora do escopo deste admin');
    }
    return this.prisma.server.update({ where: { id }, data: { active: false } });
  }
}
