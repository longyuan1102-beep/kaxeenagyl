import { Controller, Post, Body, Get, UseGuards, Res, Req } from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { User } from '../common/decorators/user.decorator';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(loginDto);
    
    // 设置 HttpOnly Cookie
    res.cookie('access_token', result.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 天
    });

    return result;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@User() user: any, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(user.id);
    
    res.clearCookie('access_token');
    
    return { message: '登出成功' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@User() user: any) {
    return user;
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(@User() user: any, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user.id, dto.currentPassword, dto.newPassword);
  }
}
