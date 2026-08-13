import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: '*',
  },
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  handleConnection(socket: Socket) {
    console.log(`Notification socket connected: ${socket.id}`);

    const token = socket.handshake.auth?.token;

    if (!token) {
      console.log('Notification socket connected without token');
      socket.disconnect();
      return;
    }

    /**
     * TEMPORARY:
     * For now we can use the token as the authentication
     * source, but we need to decode/verify it to obtain
     * the actual user ID.
     *
     * We will connect this to your existing AuthService/JWT
     * shortly.
     */
    console.log('Notification socket authenticated');

    socket.data.token = token;
  }

  handleDisconnect(socket: Socket) {
    console.log(
      `Notification socket disconnected: ${socket.id}`,
    );
  }

  /**
   * Send a notification to one specific user.
   */
  sendToUser(
    userId: string,
    notification: any,
  ) {
    const room = `user:${userId}`;

    this.server
      .to(room)
      .emit('notification', notification);

    console.log(
      `Notification emitted to ${room}`,
    );
  }
}
