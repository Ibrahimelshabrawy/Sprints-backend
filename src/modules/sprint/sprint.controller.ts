import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { SprintService } from './sprint.service';
import { CreateSprintDto, UpdateSprintDto } from './dto/sprint.dto';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { RoleEnum } from '../../common/enum/user.enum';
import { User } from '@prisma/client';

@Controller('sprints')
export class SprintController {
  constructor(private readonly sprintService: SprintService) {}

  @Post()
  @Auth(RoleEnum.ADMIN)
  async create(@Body() body: CreateSprintDto) {
    return this.sprintService.create(body);
  }

  @Get()
  @Auth()
  async findAll(
    @CurrentUser() user: User & { track?: { sprintId: string } | null },
  ) {
    return this.sprintService.findAll(user);
  }

  @Get(':id')
  @Auth()
  async findOne(@Param('id') id: string) {
    return this.sprintService.findOne(id);
  }

  @Put(':id')
  @Auth(RoleEnum.ADMIN)
  async update(@Param('id') id: string, @Body() body: UpdateSprintDto) {
    return this.sprintService.update(id, body);
  }

  @Delete(':id')
  @Auth(RoleEnum.ADMIN)
  async remove(@Param('id') id: string) {
    return this.sprintService.remove(id);
  }
}
