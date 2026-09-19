import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateTrackDto,
  UpdateTrackDto,
  AssignStudentDto,
} from './dto/track.dto';
import { ChatType, RoleEnum } from '@prisma/client';

@Injectable()
export class TrackService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTrackDto) {
    const sprint = await this.prisma.sprint.findUnique({
      where: { id: dto.sprintId },
    });

    if (!sprint) {
      throw new NotFoundException(`Sprint with ID ${dto.sprintId} not found`);
    }

    const track = await this.prisma.track.create({
      data: {
        name: dto.name.trim(),
        description: dto.description.trim(),
        sprintId: dto.sprintId,
      },
    });

    // Rule 7: Creating a Track automatically creates its TRACK chat
    await this.prisma.chat.create({
      data: {
        type: ChatType.TRACK,
        sprintId: track.sprintId,
        trackId: track.id,
      },
    });

    return track;
  }

  async findAll(sprintId?: string) {
    return this.prisma.track.findMany({
      where: sprintId ? { sprintId } : undefined,
      include: {
        sprint: {
          select: { id: true, name: true },
        },
        users: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { users: true, tasks: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const track = await this.prisma.track.findUnique({
      where: { id },
      include: {
        sprint: true,
        users: {
          select: { id: true, name: true, email: true, role: true },
        },
        tasks: {
          include: {
            assignee: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        chats: true,
      },
    });

    if (!track) {
      throw new NotFoundException(`Track with ID ${id} not found`);
    }

    return track;
  }

  async update(id: string, dto: UpdateTrackDto) {
    await this.findOne(id);

    return this.prisma.track.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.description ? { description: dto.description.trim() } : {}),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.track.delete({
      where: { id },
    });
  }

  async assignStudent(trackId: string, dto: AssignStudentDto) {
    const track = await this.prisma.track.findUnique({
      where: { id: trackId },
    });
    if (!track) {
      throw new NotFoundException(`Track with ID ${trackId} not found`);
    }

    const student = await this.prisma.user.findUnique({
      where: { id: dto.studentId },
    });

    if (!student) {
      throw new NotFoundException(`Student with ID ${dto.studentId} not found`);
    }

    if (student.role !== RoleEnum.STUDENT) {
      throw new BadRequestException(
        'Only users with role STUDENT can be assigned to a Track',
      );
    }

    // Rule 5: Moves the Student from their previous Track to the new Track
    const updatedUser = await this.prisma.user.update({
      where: { id: dto.studentId },
      data: { trackId: track.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        trackId: true,
      },
    });

    return {
      message: `Student successfully assigned to track ${track.name}`,
      user: updatedUser,
      track,
    };
  }
}
