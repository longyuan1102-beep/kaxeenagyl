import { Injectable, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class SuppliersService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(createSupplierDto: CreateSupplierDto, userId: string) {
    const existingSupplier = await this.prisma.supplier.findUnique({
      where: { name: createSupplierDto.name },
    });

    if (existingSupplier) {
      throw new ConflictException('供应商名称已存在');
    }

    const supplier = await this.prisma.supplier.create({
      data: createSupplierDto,
    });

    await this.auditService.log({
      userId,
      action: 'CREATE',
      entity: 'Supplier',
      entityId: supplier.id,
      summary: `创建供应商: ${supplier.name}`,
    });

    return supplier;
  }

  async findAll(page = 1, pageSize = 10, search?: string, name?: string, category?: string, phone?: string) {
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { contact: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    if (name) {
      where.name = { contains: name };
    }

    if (phone) {
      where.phone = { contains: phone };
    }

    if (category) {
      // 类别固定枚举值，使用精确匹配
      where.category = category;
    }

    const [items, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: {
        products: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!supplier) {
      throw new NotFoundException('供应商不存在');
    }

    return supplier;
  }

  async update(id: string, updateSupplierDto: UpdateSupplierDto, userId: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });

    if (!supplier) {
      throw new NotFoundException('供应商不存在');
    }

    if (updateSupplierDto.name && updateSupplierDto.name !== supplier.name) {
      const existing = await this.prisma.supplier.findUnique({
        where: { name: updateSupplierDto.name },
      });

      if (existing) {
        throw new ConflictException('供应商名称已存在');
      }
    }

    const updated = await this.prisma.supplier.update({
      where: { id },
      data: updateSupplierDto,
    });

    await this.auditService.log({
      userId,
      action: 'UPDATE',
      entity: 'Supplier',
      entityId: supplier.id,
      summary: `更新供应商: ${supplier.name}`,
    });

    return updated;
  }

  async remove(id: string, userId: string, userRole: string) {
    if (userRole === 'ASSISTANT') {
      throw new ForbiddenException('无权限操着');
    }
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });

    if (!supplier) {
      throw new NotFoundException('供应商不存在');
    }

    await this.prisma.supplier.delete({ where: { id } });

    await this.auditService.log({
      userId,
      action: 'DELETE',
      entity: 'Supplier',
      entityId: supplier.id,
      summary: `删除供应商: ${supplier.name}`,
    });

    return { message: '供应商删除成功' };
  }
}
