import { Injectable, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(createUserDto: CreateUserDto, operatorId: string) {
    // 检查邮箱是否已存在
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('邮箱已被使用');
    }

    // 加密密码
    const passwordHash = await bcrypt.hash(createUserDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: createUserDto.email,
        passwordHash,
        role: createUserDto.role,
        status: createUserDto.status,
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    await this.auditService.log({
      userId: operatorId,
      action: 'CREATE',
      entity: 'User',
      entityId: user.id,
      summary: `创建用户: ${user.email}`,
    });

    return user;
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto, operatorId: string) {
    if (updateUserDto.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });

      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('邮箱已被使用');
      }
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    await this.auditService.log({
      userId: operatorId,
      action: 'UPDATE',
      entity: 'User',
      entityId: user.id,
      summary: `更新用户: ${user.email}`,
    });

    return user;
  }

  async remove(id: string, operatorId: string) {
    const user = await this.prisma.user.delete({ where: { id } });

    await this.auditService.log({
      userId: operatorId,
      action: 'DELETE',
      entity: 'User',
      entityId: user.id,
      summary: `删除用户: ${user.email}`,
    });

    return { message: '用户删除成功' };
  }

  async resetPassword(id: string, newPassword: string, operatorId: string) {
    const passwordHash = await bcrypt.hash(newPassword, 10);

    const user = await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    await this.auditService.log({
      userId: operatorId,
      action: 'RESET_PASSWORD',
      entity: 'User',
      entityId: user.id,
      summary: `重置用户密码: ${user.email}`,
    });

    return { message: '密码重置成功' };
  }
}
