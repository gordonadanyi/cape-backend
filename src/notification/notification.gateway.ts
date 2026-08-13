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

    /**
     * The frontend should send the authenticated
     * user's ID when connecting.
     */
    const userId = socket.handshake.auth?.userId;

    if (!userId) {
      console.log('Notification socket connected without userId');

      return;
    }

    const room = `user:${userId}`;

    socket.join(room);

    console.log(`Socket ${socket.id} joined ${room}`);
  }

  handleDisconnect(socket: Socket) {
    console.log(`Notification socket disconnected: ${socket.id}`);
  }

  /**
   * Send a notification to one specific user.
   */
  sendToUser(userId: string, notification: any) {
    const room = `user:${userId}`;

    this.server.to(room).emit('notification', notification);

    console.log(`Notification emitted to ${room}`);
  }
}
