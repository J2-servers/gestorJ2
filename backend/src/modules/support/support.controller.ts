import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UpsertSupportLinkDto, UpsertSupportServerUpdateDto, UpsertSupportTopicDto } from './dto';
import { SupportService } from './support.service';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('support')
export class SupportController {
  constructor(private readonly service: SupportService) {}

  @Get()
  @Roles('admin', 'dev', 'reseller')
  overview(@CurrentUser() user: RequestUser) {
    return this.service.overview(user);
  }

  @Post('topics')
  @Roles('admin', 'dev')
  createTopic(@CurrentUser() user: RequestUser, @Body() dto: UpsertSupportTopicDto) {
    return this.service.createTopic(user, dto);
  }

  @Patch('topics/:id')
  @Roles('admin', 'dev')
  updateTopic(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpsertSupportTopicDto) {
    return this.service.updateTopic(user, id, dto);
  }

  @Post('links')
  @Roles('admin', 'dev')
  createLink(@CurrentUser() user: RequestUser, @Body() dto: UpsertSupportLinkDto) {
    return this.service.createLink(user, dto);
  }

  @Patch('links/:id')
  @Roles('admin', 'dev')
  updateLink(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpsertSupportLinkDto) {
    return this.service.updateLink(user, id, dto);
  }

  @Post('server-updates')
  @Roles('admin', 'dev')
  createServerUpdate(@CurrentUser() user: RequestUser, @Body() dto: UpsertSupportServerUpdateDto) {
    return this.service.createUpdate(user, dto);
  }

  @Patch('server-updates/:id')
  @Roles('admin', 'dev')
  updateServerUpdate(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpsertSupportServerUpdateDto) {
    return this.service.updateServerUpdate(user, id, dto);
  }
}
