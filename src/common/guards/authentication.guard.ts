import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { User } from '@prisma/client';
import { TokenService } from '../services/token.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(
    private readonly tokenService: TokenService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { user?: User }>();
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Authentication token is required');
    }

    const [scheme, token] = authHeader.split(' ');
    if (!token || scheme.toLowerCase() !== 'bearer') {
      throw new UnauthorizedException('Valid Bearer token is required');
    }

    const payload = await this.tokenService.verifyToken(token);
    const user = await this.prisma.user.findUnique({
      where: { id: payload.id },
      include: {
        track: {
          select: {
            id: true,
            name: true,
            sprintId: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User associated with token not found');
    }

    req.user = user;
    return true;
  }
}
