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
  implements
    OnGatewayConnection,
    OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(socket: Socket) {
    console.log(
      `Notification socket connected: ${socket.id}`,
    );

    try {
      /*
       * Get the JWT sent by the frontend.
       */
      const token =
        socket.handshake.auth?.token;

      if (!token) {
        console.log(
          `Socket ${socket.id} connected without token`,
        );

        socket.disconnect();

        return;
      }

      /*
       * Verify the JWT using the SAME
       * JWT_SECRET used by AuthModule.
       */
      const payload =
        await this.jwtService.verifyAsync(token);

      /*
       * Your AuthService creates JWTs like this:
       *
       * {
       *   email: user.email,
       *   sub: user._id.toString()
       * }
       *
       * Therefore payload.sub is the user ID.
       */
      const userId = payload.sub;

      if (!userId) {
        console.log(
          `No user ID found in JWT for socket ${socket.id}`,
        );

        socket.disconnect();

        return;
      }

      /*
       * Store the authenticated user ID
       * on the socket.
       */
      socket.data.userId = String(userId);

      /*
       * Join the private notification room.
       */
      const room = `user:${userId}`;

      await socket.join(room);

      console.log(
        `Socket ${socket.id} authenticated`,
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
      .emit(
        'notification',
        notification,
      );

    console.log(
      `Notification emitted to ${room}`,
    );
  }
}