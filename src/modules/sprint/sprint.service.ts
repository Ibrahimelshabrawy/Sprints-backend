import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSprintDto, UpdateSprintDto } from './dto/sprint.dto';
import { ChatType, Prisma, RoleEnum, User } from '@prisma/client';

@Injectable()
export class SprintService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSprintDto) {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (end < start) {
      throw new BadRequestException('endDate cannot be before startDate');
    }

    const sprint = await this.prisma.sprint.create({
      data: {
        name: dto.name.trim(),
        description: dto.description.trim(),
        startDate: start,
        endDate: end,
      },
    });

    // Rule 7: Creating a Sprint automatically creates its GENERAL chat
    await this.prisma.chat.create({
      data: {
        type: ChatType.GENERAL,
        sprintId: sprint.id,
        trackId: null,
      },
    });

    return sprint;
  }

  async findAll(user: User & { track?: { sprintId: string } | null }) {
    if (user.role === RoleEnum.ADMIN) {
      return this.prisma.sprint.findMany({
        include: {
          tracks: {
            include: {
              _count: {
                select: { users: true, tasks: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // Student: If they belong to a track, show their sprint first or all visible sprints
    if (user.track?.sprintId) {
      return this.prisma.sprint.findMany({
        where: { id: user.track.sprintId },
        include: {
          tracks: {
            include: {
              _count: {
                select: { users: true, tasks: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return this.prisma.sprint.findMany({
      include: {
        tracks: {
          include: {
            _count: {
              select: { users: true, tasks: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const sprint = await this.prisma.sprint.findUnique({
      where: { id },
      include: {
        tracks: {
          include: {
            users: {
              select: { id: true, name: true, email: true, role: true },
            },
            tasks: true,
          },
        },
        chats: true,
      },
    });

    if (!sprint) {
      throw new NotFoundException(`Sprint with ID ${id} not found`);
    }

    return sprint;
  }

  async update(id: string, dto: UpdateSprintDto) {
    await this.findOne(id);

    const data: Prisma.SprintUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.description !== undefined)
      data.description = dto.description.trim();
    if (dto.startDate !== undefined) data.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) data.endDate = new Date(dto.endDate);

    if (data.startDate && data.endDate && data.endDate < data.startDate) {
      throw new BadRequestException('endDate cannot be before startDate');
    }

    return this.prisma.sprint.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.sprint.delete({
      where: { id },
    });
  }
}
