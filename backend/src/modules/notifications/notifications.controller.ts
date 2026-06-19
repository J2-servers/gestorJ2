import {
  Body,
  Controller,
  Get,
  Headers,
  MessageEvent,
  Param,
  Patch,
  Post,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsObject, IsString } from 'class-validator';
import { Observable } from 'rxjs';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { NotificationEventsService } from './notification-events.service';
import { NotificationsService } from './notifications.service';

class PushSubscriptionDto {
  @IsString()
  endpoint!: string;

  @IsObject()
  keys!: Record<string, unknown>;
}

@UseGuards(AuthGuard('jwt'))
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly events: NotificationEventsService,
  ) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.notifications.listForUser(user.sub);
  }

  @Get('vapid-public-key')
  getVapidKey() {
    return { publicKey: this.notifications.getVapidPublicKey() };
  }

  /**
   * SSE stream — keeps connection alive, pushes new notifications in real-time.
   * Auth: JWT extracted from cookie OR query param ?auth=<token> (needed since
   * EventSource API cannot set Authorization headers).
   */
  @Sse('stream')
  stream(@CurrentUser() user: RequestUser): Observable<MessageEvent> {
    return new Observable((subscriber) => {
      // Heartbeat every 25 s to keep the connection alive through proxies
      const heartbeat = setInterval(() => {
        subscriber.next({ data: JSON.stringify({ type: 'heartbeat' }) } as MessageEvent);
      }, 25000);

      const unsub = this.events.subscribe(user.sub, (notification) => {
        subscriber.next({ data: JSON.stringify(notification) } as MessageEvent);
      });

      return () => {
        clearInterval(heartbeat);
        unsub();
      };
    });
  }

  @Patch('read-all')
  markAllRead(@CurrentUser() user: RequestUser) {
    return this.notifications.markAllRead(user.sub);
  }

  @Patch(':id/read')
  markRead(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.notifications.markRead(user.sub, id);
  }

  @Post('push-subscriptions')
  savePushSubscription(
    @CurrentUser() user: RequestUser,
    @Body() body: PushSubscriptionDto,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.notifications.savePushSubscription(user.sub, { ...body, userAgent });
  }
}
