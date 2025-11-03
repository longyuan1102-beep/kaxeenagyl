import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(createProductDto: CreateProductDto, userId: string) {
    // 检查供应商是否存在
    const supplier = await this.prisma.supplier.findUnique({
      where: { id: createProductDto.supplierId },
    });

    if (!supplier) {
      throw new NotFoundException('供应商不存在');
    }

    // 检查同一供应商下名称+规格是否唯一
    const existingProduct = await this.prisma.product.findUnique({
      where: {
        supplierId_name_spec: {
          supplierId: createProductDto.supplierId,
          name: createProductDto.name,
          spec: createProductDto.spec,
        },
      },
    });

    if (existingProduct) {
      throw new ConflictException('该供应商下已存在相同名称和规格的产品');
    }

    const product = await this.prisma.product.create({
      data: {
        supplierId: createProductDto.supplierId,
        name: createProductDto.name,
        spec: createProductDto.spec,
        price: createProductDto.price,
        // 仅在提供时写入 leadDays，否则使用数据库默认值
        ...(typeof createProductDto.leadDays === 'number'
          ? { leadDays: createProductDto.leadDays }
          : {}),
        // 数量为必填，直接写入
        quantity: createProductDto.quantity,
        ...(typeof createProductDto.description === 'string'
          ? { description: createProductDto.description }
          : {}),
        ...(typeof createProductDto.note === 'string'
          ? { note: createProductDto.note }
          : {}),
        ...(typeof createProductDto.barcode === 'string'
          ? { barcode: createProductDto.barcode }
          : {}),
      },
      include: {
        supplier: true,
        images: true,
      },
    });

    await this.auditService.log({
      userId,
      action: 'CREATE',
      entity: 'Product',
      entityId: product.id,
      summary: `创建产品: ${product.name}`,
    });

    return product;
  }

  async findAll(page = 1, pageSize = 10, search?: string, supplierId?: string) {
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (supplierId) {
      where.supplierId = supplierId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { spec: { contains: search } },
        { barcode: { contains: search } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          supplier: true,
          images: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.product.count({ where }),
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
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        supplier: true,
        images: true,
        priceHistory: {
          take: 10,
          orderBy: { changedAt: 'desc' },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('产品不存在');
    }

    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto, userId: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });

    if (!product) {
      throw new NotFoundException('产品不存在');
    }

    const updateData: any = {};

    // 如果更新价格，记录价格历史
    if (updateProductDto.price && Number(updateProductDto.price) !== Number(product.price)) {
      updateData.priceHistory = {
        create: {
          oldPrice: product.price,
          newPrice: updateProductDto.price,
          changedBy: userId,
        },
      };
    }

    Object.assign(updateData, updateProductDto);

    const updated = await this.prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        supplier: true,
        images: true,
      },
    });

    await this.auditService.log({
      userId,
      action: 'UPDATE',
      entity: 'Product',
      entityId: product.id,
      summary: `更新产品: ${product.name}`,
    });

    return updated;
  }

  async remove(id: string, userId: string, userRole: string) {
    if (userRole === 'ASSISTANT') {
      throw new ForbiddenException('无权限操着');
    }
    const product = await this.prisma.product.findUnique({ where: { id } });

    if (!product) {
      throw new NotFoundException('产品不存在');
    }

    await this.prisma.product.delete({ where: { id } });

    await this.auditService.log({
      userId,
      action: 'DELETE',
      entity: 'Product',
      entityId: product.id,
      summary: `删除产品: ${product.name}`,
    });

    return { message: '产品删除成功' };
  }

  async addImage(productId: string, imageUrl: string, userId: string, sort = 0) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });

    if (!product) {
      throw new NotFoundException('产品不存在');
    }

    const image = await this.prisma.productImage.create({
      data: {
        productId,
        imageUrl,
        sort,
      },
    });

    await this.auditService.log({
      userId,
      action: 'ADD_IMAGE',
      entity: 'Product',
      entityId: productId,
      summary: `添加产品图片: ${product.name}`,
    });

    return image;
  }

  async removeImage(imageId: string, userId: string) {
    const image = await this.prisma.productImage.findUnique({ where: { id: imageId } });

    if (!image) {
      throw new NotFoundException('图片不存在');
    }

    await this.prisma.productImage.delete({ where: { id: imageId } });

    await this.auditService.log({
      userId,
      action: 'REMOVE_IMAGE',
      entity: 'ProductImage',
      entityId: imageId,
      summary: '删除产品图片',
    });

    return { message: '图片删除成功' };
  }
}
