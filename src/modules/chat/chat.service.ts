import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SendMessageDto } from './dto/chat.dto';
import { ChatType, RoleEnum, User } from '@prisma/client';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    user: User & { track?: { id: string; sprintId: string } | null },
  ) {
    if (user.role === RoleEnum.ADMIN) {
      return this.prisma.chat.findMany({
        include: {
          sprint: { select: { id: true, name: true } },
          track: { select: { id: true, name: true } },
          _count: { select: { messages: true } },
        },
        orderBy: [{ sprintId: 'asc' }, { type: 'asc' }],
      });
    }

    // Student: Their Sprint General Chat + their Track Chat
    if (!user.trackId || !user.track?.sprintId) {
      return [];
    }

    return this.prisma.chat.findMany({
      where: {
        OR: [
          {
            sprintId: user.track.sprintId,
            type: ChatType.GENERAL,
          },
          {
            trackId: user.trackId,
            type: ChatType.TRACK,
          },
        ],
      },
      include: {
        sprint: { select: { id: true, name: true } },
        track: { select: { id: true, name: true } },
        _count: { select: { messages: true } },
      },
      orderBy: { type: 'asc' },
    });
  }

  async verifyChatAccess(
    chatId: string,
    user: User & { track?: { sprintId: string } | null },
  ) {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        sprint: true,
        track: true,
      },
    });

    if (!chat) {
      throw new NotFoundException(`Chat with ID ${chatId} not found`);
    }

    if (user.role === RoleEnum.ADMIN) {
      return chat;
    }

    // Student authorization (Section 14)
    if (chat.type === ChatType.GENERAL) {
      if (!user.trackId || user.track?.sprintId !== chat.sprintId) {
        throw new ForbiddenException(
          'You do not have access to this Sprint General Chat',
        );
      }
    } else if (chat.type === ChatType.TRACK) {
      if (!user.trackId || user.trackId !== chat.trackId) {
        throw new ForbiddenException(
          'You do not have access to this Track Chat',
        );
      }
    }

    return chat;
  }

  async getMessages(
    chatId: string,
    user: User & { track?: { sprintId: string } | null },
  ) {
    await this.verifyChatAccess(chatId, user);

    return this.prisma.message.findMany({
      where: { chatId },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async sendMessage(
    chatId: string,
    user: User & { track?: { sprintId: string } | null },
    dto: SendMessageDto,
  ) {
    await this.verifyChatAccess(chatId, user);

    // Section 13: The sender must be determined from the authenticated user
    return this.prisma.message.create({
      data: {
        content: dto.content.trim(),
        chatId,
        senderId: user.id,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }
}
