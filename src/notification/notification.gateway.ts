import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

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

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(socket: Socket) {
    console.log(
      `Notification socket connected: ${socket.id}`,
    );

    try {
      /*
       * Get JWT sent by the frontend.
       */
      const token = socket.handshake.auth?.token;

      if (!token) {
        console.log(
          `Socket ${socket.id} connected without token`,
        );

        socket.disconnect();

        return;
      }

      /*
       * Verify the JWT.
       */
      const payload = await this.jwtService.verifyAsync(token);

      /*
       * Your JWT may use one of these common names
       * for the user ID.
       *
       * We support all three for safety.
       */
      const userId =
        payload.sub ??
        payload.userId ??
        payload.id;

      if (!userId) {
        console.log(
          `No user ID found in JWT for socket ${socket.id}`,
        );

        socket.disconnect();

        return;
      }

      /*
       * Store the authenticated user ID on the socket.
       */
      socket.data.userId = String(userId);

      /*
       * Put this socket into the user's private room.
       */
      const room = `user:${userId}`;

      await socket.join(room);

      console.log(
        `Socket ${socket.id} authenticated for user ${userId}`,
      );

      console.log(
        `Socket ${socket.id} joined ${room}`,
      );
    } catch (error) {
      console.error(
        `Notification socket authentication failed for ${socket.id}`,
        error,
      );

      socket.disconnect();
    }
  }

  handleDisconnect(socket: Socket) {
    console.log(
      `Notification socket disconnected: ${socket.id}`,
    );
  }

  /*
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