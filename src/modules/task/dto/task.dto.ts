import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { TaskStatus } from '@prisma/client';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: 'Description is required' })
  description: string;

  @IsString()
  @IsNotEmpty({ message: 'trackId is required' })
  trackId: string;

  @IsString()
  @IsOptional()
  assigneeId?: string;
}

export class UpdateTaskDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  trackId?: string;

  @IsString()
  @IsOptional()
  assigneeId?: string;
}

export class UpdateTaskStatusDto {
  @IsString()
  @IsIn([TaskStatus.IN_PROGRESS], {
    message: 'Status update endpoint only permits transition to IN_PROGRESS',
  })
  status: TaskStatus;
}

export class SubmitTaskDto {
  @IsString()
  @IsOptional()
  submissionNotes?: string;

  @IsString()
  @IsOptional()
  submissionUrl?: string;
}

export class ReviewTaskDto {
  @IsBoolean()
  approved: boolean;

  @IsInt()
  @Min(0, { message: 'Score must be at least 0' })
  @Max(100, { message: 'Score cannot exceed 100' })
  @IsOptional()
  score?: number;

  @IsString()
  @IsOptional()
  feedback?: string;
}

export class TaskFilterDto {
  @IsString()
  @IsOptional()
  sprintId?: string;

  @IsString()
  @IsOptional()
  trackId?: string;

  @IsString()
  @IsOptional()
  assigneeId?: string;

  @IsString()
  @IsOptional()
  status?: TaskStatus;
}
