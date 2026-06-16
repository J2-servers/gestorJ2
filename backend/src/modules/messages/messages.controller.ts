import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto';

@UseGuards(AuthGuard('jwt'))
@Controller('credit-requests/:requestId/messages')
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Param('requestId') requestId: string) {
    return this.messages.list(user, requestId);
  }

  @Post()
  create(
    @CurrentUser() user: RequestUser,
    @Param('requestId') requestId: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.messages.create(user, requestId, dto.content);
  }
}
