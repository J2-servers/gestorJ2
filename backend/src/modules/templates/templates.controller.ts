import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto, UpdateTemplateDto } from './dto';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('message-templates')
export class TemplatesController {
  constructor(private readonly templates: TemplatesService) {}

  @Get()
  @Roles('admin', 'dev')
  list(@CurrentUser() user: RequestUser) {
    return this.templates.list(user.sub);
  }

  @Post()
  @Roles('admin', 'dev')
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateTemplateDto) {
    return this.templates.create(user.sub, dto);
  }

  @Patch(':id')
  @Roles('admin', 'dev')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    return this.templates.update(user, id, dto);
  }

  @Delete(':id')
  @Roles('admin', 'dev')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.templates.remove(user, id);
  }
}
