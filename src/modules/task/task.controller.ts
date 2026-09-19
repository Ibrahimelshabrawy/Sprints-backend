import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { TaskService } from './task.service';
import {
  CreateTaskDto,
  ReviewTaskDto,
  SubmitTaskDto,
  TaskFilterDto,
  UpdateTaskDto,
  UpdateTaskStatusDto,
} from './dto/task.dto';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { RoleEnum } from '../../common/enum/user.enum';
import type { User } from '@prisma/client';

@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  @Auth(RoleEnum.ADMIN)
  async create(@Body() body: CreateTaskDto) {
    return this.taskService.create(body);
  }

  @Get()
  @Auth()
  async findAll(@CurrentUser() user: User, @Query() filters: TaskFilterDto) {
    return this.taskService.findAll(user, filters);
  }

  @Get(':id')
  @Auth()
  async findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.taskService.findOne(id, user);
  }

  @Put(':id')
  @Auth(RoleEnum.ADMIN)
  async update(@Param('id') id: string, @Body() body: UpdateTaskDto) {
    return this.taskService.update(id, body);
  }

  @Patch(':id/status')
  @Auth()
  async updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() body: UpdateTaskStatusDto,
  ) {
    return this.taskService.updateStatus(id, user, body);
  }

  @Patch(':id/submit')
  @Auth(RoleEnum.STUDENT)
  async submit(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() body: SubmitTaskDto,
  ) {
    return this.taskService.submit(id, user, body);
  }

  @Patch(':id/review')
  @Auth(RoleEnum.ADMIN)
  async review(@Param('id') id: string, @Body() body: ReviewTaskDto) {
    return this.taskService.review(id, body);
  }
}
