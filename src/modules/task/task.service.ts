import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateTaskDto,
  ReviewTaskDto,
  SubmitTaskDto,
  TaskFilterDto,
  UpdateTaskDto,
  UpdateTaskStatusDto,
} from './dto/task.dto';
import { Prisma, RoleEnum, TaskStatus, User } from '@prisma/client';

@Injectable()
export class TaskService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTaskDto) {
    const track = await this.prisma.track.findUnique({
      where: { id: dto.trackId },
    });
    if (!track) {
      throw new NotFoundException(`Track with ID ${dto.trackId} not found`);
    }

    if (dto.assigneeId) {
      const student = await this.prisma.user.findUnique({
        where: { id: dto.assigneeId },
      });
      if (!student) {
        throw new NotFoundException(
          `Assignee with ID ${dto.assigneeId} not found`,
        );
      }
      if (student.role !== RoleEnum.STUDENT) {
        throw new BadRequestException('Tasks can only be assigned to students');
      }
      // Section 8 & 18: Backend must validate that assigned Student belongs to Task Track
      if (student.trackId !== track.id) {
        throw new BadRequestException(
          `Student is not a member of track "${track.name}". Mismatched track assignment rejected.`,
        );
      }
    }

    return this.prisma.task.create({
      data: {
        title: dto.title.trim(),
        description: dto.description.trim(),
        trackId: dto.trackId,
        assigneeId: dto.assigneeId || null,
        status: TaskStatus.TODO,
      },
      include: {
        track: true,
        assignee: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async findAll(user: User, filters?: TaskFilterDto) {
    // Rule 4: Student should only see Tasks assigned to them by default
    if (user.role === RoleEnum.STUDENT) {
      return this.prisma.task.findMany({
        where: {
          assigneeId: user.id,
          ...(filters?.status ? { status: filters.status } : {}),
        },
        include: {
          track: {
            select: { id: true, name: true, sprintId: true },
          },
          assignee: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // Admin: Can view all tasks and filter them
    const where: Prisma.TaskWhereInput = {};
    if (filters?.sprintId) {
      where.track = { sprintId: filters.sprintId };
    }
    if (filters?.trackId) {
      where.trackId = filters.trackId;
    }
    if (filters?.assigneeId) {
      where.assigneeId = filters.assigneeId;
    }
    if (filters?.status) {
      where.status = filters.status;
    }

    return this.prisma.task.findMany({
      where,
      include: {
        track: {
          include: {
            sprint: { select: { id: true, name: true } },
          },
        },
        assignee: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, user: User) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        track: {
          include: {
            sprint: true,
          },
        },
        assignee: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    // Authorization check for Student
    if (user.role === RoleEnum.STUDENT) {
      const isAssigned = task.assigneeId === user.id;
      const isTrackMember = task.trackId === user.trackId;
      if (!isAssigned && !isTrackMember) {
        throw new ForbiddenException(
          'You are not authorized to view this task',
        );
      }
    }

    return task;
  }

  async update(id: string, dto: UpdateTaskDto) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: { track: true },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    const targetTrackId = dto.trackId || task.trackId;
    const targetAssigneeId =
      dto.assigneeId !== undefined ? dto.assigneeId : task.assigneeId;

    if (targetAssigneeId) {
      const student = await this.prisma.user.findUnique({
        where: { id: targetAssigneeId },
      });
      if (!student) {
        throw new NotFoundException(
          `Assignee with ID ${targetAssigneeId} not found`,
        );
      }
      if (student.role !== RoleEnum.STUDENT) {
        throw new BadRequestException('Tasks can only be assigned to students');
      }
      if (student.trackId !== targetTrackId) {
        throw new BadRequestException(
          'Assigned student must belong to the task track',
        );
      }
    }

    return this.prisma.task.update({
      where: { id },
      data: {
        ...(dto.title ? { title: dto.title.trim() } : {}),
        ...(dto.description ? { description: dto.description.trim() } : {}),
        ...(dto.trackId ? { trackId: dto.trackId } : {}),
        ...(dto.assigneeId !== undefined ? { assigneeId: dto.assigneeId } : {}),
      },
      include: {
        track: true,
        assignee: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async updateStatus(id: string, user: User, dto: UpdateTaskStatusDto) {
    const task = await this.prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    // Check permission: Admin or assigned student
    if (user.role !== RoleEnum.ADMIN && task.assigneeId !== user.id) {
      throw new ForbiddenException(
        'Only the assigned student or an admin can update task status',
      );
    }

    // Rule 5: Strict transition TODO -> IN_PROGRESS
    if (task.status !== TaskStatus.TODO) {
      throw new BadRequestException(
        `Invalid status transition: Task status is "${task.status}", but only TODO -> IN_PROGRESS is permitted on this endpoint.`,
      );
    }

    if (dto.status !== TaskStatus.IN_PROGRESS) {
      throw new BadRequestException(
        `Invalid status transition: Only transition to IN_PROGRESS is allowed here.`,
      );
    }

    return this.prisma.task.update({
      where: { id },
      data: { status: TaskStatus.IN_PROGRESS },
      include: {
        track: true,
        assignee: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async submit(id: string, user: User, dto: SubmitTaskDto) {
    const task = await this.prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    // Rule 5: Only the assigned Student can submit
    if (task.assigneeId !== user.id) {
      throw new ForbiddenException(
        'Only the assigned student can submit this task',
      );
    }

    // Rule 5: Required current status: IN_PROGRESS
    if (task.status !== TaskStatus.IN_PROGRESS) {
      throw new BadRequestException(
        `Task must be in IN_PROGRESS status to submit (current status: ${task.status})`,
      );
    }

    return this.prisma.task.update({
      where: { id },
      data: {
        status: TaskStatus.SUBMITTED,
        submissionNotes: dto.submissionNotes?.trim() || task.submissionNotes,
        submissionUrl: dto.submissionUrl?.trim() || task.submissionUrl,
      },
      include: {
        track: true,
        assignee: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async review(id: string, dto: ReviewTaskDto) {
    const task = await this.prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    // Rule 5: Required current status: SUBMITTED
    if (task.status !== TaskStatus.SUBMITTED) {
      throw new BadRequestException(
        `Only SUBMITTED tasks can be reviewed (current status: ${task.status})`,
      );
    }

    if (dto.score !== undefined && (dto.score < 0 || dto.score > 100)) {
      throw new BadRequestException('Score must be between 0 and 100');
    }

    // Strict transitions:
    // If approved: SUBMITTED -> APPROVED
    // If request changes: SUBMITTED -> IN_PROGRESS
    const nextStatus = dto.approved
      ? TaskStatus.APPROVED
      : TaskStatus.IN_PROGRESS;

    return this.prisma.task.update({
      where: { id },
      data: {
        status: nextStatus,
        score: dto.score !== undefined ? dto.score : task.score,
        feedback: dto.feedback?.trim() || task.feedback,
      },
      include: {
        track: true,
        assignee: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }
}
