import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { User } from '../common/decorators/user.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto, @User() user: any) {
    return this.usersService.create(createUserDto, user.id);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @User() user: any) {
    return this.usersService.update(id, updateUserDto, user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @User() user: any) {
    return this.usersService.remove(id, user.id);
  }

  @Post(':id/reset-password')
  resetPassword(@Param('id') id: string, @Body() resetPasswordDto: ResetPasswordDto, @User() user: any) {
    return this.usersService.resetPassword(id, resetPasswordDto.newPassword, user.id);
  }
}
