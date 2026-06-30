import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';

// Mapa de userId → conjunto de socketIds (suporta multi-tab)
type OnlineMap = Map<string, Set<string>>;

interface SocketUser {
  sub: string;
  email: string;
  role: string;
}

@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: '*', credentials: true },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly online: OnlineMap = new Map();
  // socketId → userId (para cleanup no disconnect)
  private readonly socketUser = new Map<string, string>();

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private extractUser(client: Socket): SocketUser | null {
    try {
      const token =
        (client.handshake.auth as Record<string, string>)?.token ||
        (client.handshake.query as Record<string, string>)?.token;
      if (!token) return null;
      const secret = this.config.get<string>('JWT_SECRET');
      return this.jwt.verify<SocketUser>(token, { secret });
    } catch {
      return null;
    }
  }

  handleConnection(client: Socket) {
    const user = this.extractUser(client);
    if (!user) {
      client.disconnect(true);
      return;
    }

    // Associa socket → userId
    this.socketUser.set(client.id, user.sub);

    // Adiciona ao conjunto online
    if (!this.online.has(user.sub)) this.online.set(user.sub, new Set());
    this.online.get(user.sub)!.add(client.id);

    // Entra na sala pessoal (receber eventos direcionados)
    void client.join(`user:${user.sub}`);

    // Transmite presença online para todos na namespace
    this.server.emit('presence', { userId: user.sub, online: true });

    // Envia ao cliente recém-conectado a lista atual de usuários online
    client.emit('online-list', [...this.online.keys()]);
  }

  handleDisconnect(client: Socket) {
    const userId = this.socketUser.get(client.id);
    if (!userId) return;

    this.socketUser.delete(client.id);
    const sockets = this.online.get(userId);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.online.delete(userId);
        // Só transmite offline quando não tem mais nenhuma aba/janela aberta
        this.server.emit('presence', { userId, online: false });
      }
    }
  }

  // Indicador de digitação: reencaminha para a outra parte da conversa
  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { resellerId: string; isTyping: boolean },
  ) {
    const userId = this.socketUser.get(client.id);
    if (!userId) return;

    // Determina o destinatário: se quem digita é o reseller, avisa o admin (e vice-versa)
    const targetRoom = `user:${payload.resellerId}`;
    client.to(targetRoom).emit('typing', {
      resellerId: payload.resellerId,
      senderId: userId,
      isTyping: payload.isTyping,
    });
  }

  // Notifica que mensagens de uma thread foram lidas
  emitRead(resellerId: string, readByRole: 'admin' | 'reseller') {
    this.server.emit('messages-read', { resellerId, readByRole });
  }

  // Envia nova mensagem em tempo real para ambas as partes da thread
  emitNewMessage(resellerId: string, message: unknown) {
    // Emite para a sala do revendedor e para todos os admins conectados
    this.server.to(`user:${resellerId}`).emit('new-message', { resellerId, message });
    // Emite para admin: emite globalmente filtrado pelo namespace
    // (admins recebem de qualquer resellerId, então emitimos para todos)
    this.server.emit('new-message', { resellerId, message });
  }

  // Verifica se um userId está online
  isOnline(userId: string): boolean {
    return (this.online.get(userId)?.size ?? 0) > 0;
  }
}
