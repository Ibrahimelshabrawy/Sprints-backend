import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/chat.dto';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { User } from '@prisma/client';

type AuthenticatedChatUser = User & {
  track?: { id: string; sprintId: string } | null;
};

@Controller('chats')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get()
  @Auth()
  async findAll(@CurrentUser() user: AuthenticatedChatUser) {
    return this.chatService.findAll(user);
  }

  @Get(':id/messages')
  @Auth()
  async getMessages(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedChatUser,
  ) {
    return this.chatService.getMessages(id, user);
  }

  @Post(':id/messages')
  @Auth()
  async sendMessage(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedChatUser,
    @Body() body: SendMessageDto,
  ) {
    return this.chatService.sendMessage(id, user, body);
  }
}
