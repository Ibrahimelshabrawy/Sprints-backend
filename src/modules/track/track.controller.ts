import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { TrackService } from './track.service';
import {
  CreateTrackDto,
  UpdateTrackDto,
  AssignStudentDto,
} from './dto/track.dto';
import { Auth } from '../../common/decorators/auth.decorator';
import { RoleEnum } from '../../common/enum/user.enum';

@Controller('tracks')
export class TrackController {
  constructor(private readonly trackService: TrackService) {}

  @Post()
  @Auth(RoleEnum.ADMIN)
  async create(@Body() body: CreateTrackDto) {
    return this.trackService.create(body);
  }

  @Get()
  @Auth()
  async findAll(@Query('sprintId') sprintId?: string) {
    return this.trackService.findAll(sprintId);
  }

  @Get(':id')
  @Auth()
  async findOne(@Param('id') id: string) {
    return this.trackService.findOne(id);
  }

  @Put(':id')
  @Auth(RoleEnum.ADMIN)
  async update(@Param('id') id: string, @Body() body: UpdateTrackDto) {
    return this.trackService.update(id, body);
  }

  @Delete(':id')
  @Auth(RoleEnum.ADMIN)
  async remove(@Param('id') id: string) {
    return this.trackService.remove(id);
  }

  @Patch(':id/assign-student')
  @Auth(RoleEnum.ADMIN)
  async assignStudent(@Param('id') id: string, @Body() body: AssignStudentDto) {
    return this.trackService.assignStudent(id, body);
  }
}
