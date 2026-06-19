import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { ChatService } from './chat.service';

class SendChatDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content!: string;

  // resellerId so e usado por admin/dev; revendedor envia sempre para si mesmo.
  @IsOptional()
  @IsString()
  resellerId?: string;
}

@UseGuards(AuthGuard('jwt'))
@Controller('chat')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get('threads')
  threads(@CurrentUser() user: RequestUser) {
    return this.chat.threads(user);
  }

  @Get('messages')
  messages(@CurrentUser() user: RequestUser, @Query('resellerId') resellerId?: string) {
    return this.chat.messages(user, resellerId ?? user.sub);
  }

  @Post('messages')
  send(@CurrentUser() user: RequestUser, @Body() dto: SendChatDto) {
    return this.chat.send(user, dto.resellerId ?? user.sub, dto.content);
  }

  @Post('archive')
  archive(@CurrentUser() user: RequestUser, @Body() dto: { resellerId?: string }) {
    return this.chat.archive(user, dto?.resellerId ?? user.sub);
  }

  @Get('archives')
  archives(@CurrentUser() user: RequestUser, @Query('resellerId') resellerId?: string) {
    return this.chat.listArchives(user, resellerId ?? user.sub);
  }

  @Get('archives/:id')
  archiveContent(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.chat.getArchive(user, id);
  }
}
