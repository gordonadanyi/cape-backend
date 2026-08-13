import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(NotificationGateway.name);

  handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(
          `WebSocket connection rejected: no token (${client.id})`,
        );

        client.disconnect();
        return;
      }

      const secret = process.env.JWT_SECRET;

      if (!secret) {
        this.logger.error('JWT_SECRET is not configured.');

        client.disconnect();
        return;
      }

      const payload = jwt.verify(token, secret) as {
        sub?: string;
        userId?: string;
        id?: string;
      };

      const userId = payload.sub || payload.userId || payload.id;

      if (!userId) {
        this.logger.warn(
          `WebSocket connection rejected: no userId (${client.id})`,
        );

        client.disconnect();
        return;
      }

      client.data.userId = userId;

      const room = this.getUserRoom(userId);

      client.join(room);

      this.logger.log(
        `User ${userId} connected to notifications (${client.id})`,
      );
    } catch (error) {
      this.logger.warn(`WebSocket authentication failed (${client.id})`);

      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data?.userId;

    if (userId) {
      this.logger.log(
        `User ${userId} disconnected from notifications (${client.id})`,
      );
    }
  }

  /**
   * Send a notification to one specific user.
   */
  sendToUser(userId: string, notification: Record<string, any>) {
    const room = this.getUserRoom(userId);

    this.server.to(room).emit('notification', notification);

    this.logger.log(`Notification sent to user ${userId}`);
  }

  /**
   * Send a notification to multiple users.
   */
  sendToUsers(userIds: string[], notification: Record<string, any>) {
    for (const userId of userIds) {
      this.sendToUser(userId, notification);
    }
  }

  /**
   * Optional connection test.
   */
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket, @MessageBody() body?: unknown) {
    return {
      event: 'pong',
      data: body ?? 'pong',
    };
  }

  private getUserRoom(userId: string) {
    return `user:${userId}`;
  }
}
