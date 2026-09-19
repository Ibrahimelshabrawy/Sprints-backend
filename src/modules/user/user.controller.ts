import { Controller, Get, Param, Query } from '@nestjs/common';
import { UserService } from './user.service';
import { Auth } from '../../common/decorators/auth.decorator';
import { RoleEnum } from '../../common/enum/user.enum';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @Auth(RoleEnum.ADMIN)
  async findAll(
    @Query('role') role?: RoleEnum,
    @Query('trackId') trackId?: string,
  ) {
    return this.userService.findAll(role, trackId);
  }

  @Get(':id')
  @Auth()
  async findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }
}
