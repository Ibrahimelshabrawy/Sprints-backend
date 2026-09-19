import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenService } from '../../common/services/token.service';
import { hashPassword, comparePassword } from '../../common/utils/hash';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { RoleEnum } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new BadRequestException('Email is already registered');
    }

    const hashedPassword = await hashPassword(dto.password);

    // Rule 2: Public registration MUST ALWAYS create a STUDENT
    const user = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email: dto.email.toLowerCase().trim(),
        password: hashedPassword,
        role: RoleEnum.STUDENT,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        trackId: true,
        createdAt: true,
      },
    });

    const token = await this.tokenService.generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return { token, user };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
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
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await comparePassword(dto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const token = await this.tokenService.generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    const safeUser = { ...user };
    delete (safeUser as { password?: string }).password;
    return { token, user: safeUser };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        track: {
          include: {
            sprint: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const safeUser = { ...user };
    delete (safeUser as { password?: string }).password;
    return safeUser;
  }
}
