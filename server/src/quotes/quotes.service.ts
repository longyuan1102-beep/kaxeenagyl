import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { AddQuoteItemDto } from './dto/add-quote-item.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class QuotesService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(createQuoteDto: CreateQuoteDto, userId: string) {
    // 生成报价单编号
    const code = await this.generateQuoteCode();

    const quote = await this.prisma.quote.create({
      data: {
        code,
        creatorId: userId,
        customerName: createQuoteDto.customerName,
        customerPhone: createQuoteDto.customerPhone,
        customerAddress: createQuoteDto.customerAddress,
        currency: createQuoteDto.currency || 'CNY',
        taxRate: createQuoteDto.taxRate || 0,
        note: createQuoteDto.note,
      },
    });

    await this.auditService.log({
      userId,
      action: 'CREATE',
      entity: 'Quote',
      entityId: quote.id,
      summary: `创建报价单: ${quote.code}`,
    });

    return quote;
  }

  async findAll(
    page = 1,
    pageSize = 10,
    userId?: string,
    onlyMine?: boolean,
    status?: string,
    customerName?: string,
  ) {
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (onlyMine && userId) {
      where.creatorId = userId;
    }

    if (status) {
      where.status = status;
    }

    if (customerName) {
      where.customerName = { contains: customerName, mode: 'insensitive' };
    }

    const [items, total] = await Promise.all([
      this.prisma.quote.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              email: true,
            },
          },
          items: {
            include: {
              product: {
                include: {
                  supplier: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.quote.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: string, userId?: string, userRole?: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
          },
        },
        items: {
          include: {
            product: {
              include: {
                supplier: true,
                images: true,
              },
            },
          },
          orderBy: { id: 'asc' },
        },
      },
    });

    if (!quote) {
      throw new NotFoundException('报价单不存在');
    }

    // 所有用户均可查看报价单详情（不限制创建者）

    return quote;
  }

  async update(id: string, updateQuoteDto: UpdateQuoteDto, userId: string, userRole: string) {
    const quote = await this.prisma.quote.findUnique({ where: { id } });

    if (!quote) {
      throw new NotFoundException('报价单不存在');
    }

    // 放开辅助用户的编辑限制：允许修改任意报价单（删除整单仍受限）

    const updated = await this.prisma.quote.update({
      where: { id },
      data: updateQuoteDto,
    });

    await this.auditService.log({
      userId,
      action: 'UPDATE',
      entity: 'Quote',
      entityId: quote.id,
      summary: `更新报价单: ${quote.code}`,
    });

    return updated;
  }

  async addItems(id: string, addItemsDto: AddQuoteItemDto[], userId: string, userRole: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { id },
    });

    if (!quote) {
      throw new NotFoundException('报价单不存在');
    }

    // 放开辅助用户的编辑限制：允许在任意报价单中添加项目

    const items = await Promise.all(
      addItemsDto.map(async (dto) => {
        const product = await this.prisma.product.findUnique({
          where: { id: dto.productId },
        });

        if (!product) {
          throw new NotFoundException(`产品不存在: ${dto.productId}`);
        }

        const basePrice = product.price;
        const displayPrice = this.calculateDisplayPrice(
          basePrice,
          dto.rowDelta || 0,
          dto.rowAmount || 0,
        );

        return this.prisma.quoteItem.create({
          data: {
            quoteId: id,
            productId: dto.productId,
            quantity: dto.quantity || 1,
            basePrice,
            rowDelta: dto.rowDelta || 0,
            rowAmount: dto.rowAmount || 0,
            displayPrice,
          } as any,
        });
      }),
    );

    await this.auditService.log({
      userId,
      action: 'ADD_ITEMS',
      entity: 'Quote',
      entityId: quote.id,
      summary: `向报价单 ${quote.code} 添加 ${items.length} 项`,
    });

    return items;
  }

  async removeItem(itemId: string, userId: string, userRole: string) {
    const item = await this.prisma.quoteItem.findUnique({
      where: { id: itemId },
      include: {
        quote: true,
      },
    });

    if (!item) {
      throw new NotFoundException('报价单项不存在');
    }

    // 允许辅助用户删除报价项（无论是否自己创建的报价单）

    await this.prisma.quoteItem.delete({ where: { id: itemId } });

    await this.auditService.log({
      userId,
      action: 'REMOVE_ITEM',
      entity: 'QuoteItem',
      entityId: itemId,
      summary: `从报价单中移除项目`,
    });

    return { message: '项目移除成功' };
  }

  async updateItem(
    itemId: string,
    payload: { quantity?: number; rowDelta?: number; rowAmount?: number },
    userId: string,
    userRole: string,
  ) {
    const item = await this.prisma.quoteItem.findUnique({
      where: { id: itemId },
      include: { quote: true },
    });

    if (!item) {
      throw new NotFoundException('报价单项不存在');
    }

    // 放开辅助用户的编辑限制：允许更新任意报价单中的项目

    const quantity = payload.quantity ?? item.quantity;
    const rowDelta = payload.rowDelta ?? item.rowDelta;
    const rowAmount = payload.rowAmount ?? (item as any).rowAmount ?? 0;
    const displayPrice = this.calculateDisplayPrice(
      item.basePrice,
      rowDelta,
      rowAmount,
    );

    const updated = await this.prisma.quoteItem.update({
      where: { id: itemId },
      data: { quantity, rowDelta, rowAmount, displayPrice } as any,
    });

    await this.auditService.log({
      userId,
      action: 'UPDATE_ITEM',
      entity: 'QuoteItem',
      entityId: itemId,
      summary: `更新报价单项`,
    });

    return updated;
  }

  async remove(id: string, userId: string, userRole: string) {
    const quote = await this.prisma.quote.findUnique({ where: { id } });

    if (!quote) {
      throw new NotFoundException('报价单不存在');
    }

    // Assistant 不允许删除任何报价单
    if (userRole === 'ASSISTANT') {
      throw new ForbiddenException('无权限操着');
    }

    await this.prisma.quote.delete({ where: { id } });

    await this.auditService.log({
      userId,
      action: 'DELETE',
      entity: 'Quote',
      entityId: quote.id,
      summary: `删除报价单: ${quote.code}`,
    });

    return { message: '报价单删除成功' };
  }

  async markAsExported(id: string, userId: string) {
    const quote = await this.prisma.quote.update({
      where: { id },
      data: { status: 'EXPORTED' },
    });

    await this.auditService.log({
      userId,
      action: 'EXPORT',
      entity: 'Quote',
      entityId: quote.id,
      summary: `导出报价单: ${quote.code}`,
    });

    return quote;
  }

  private calculateDisplayPrice(
    basePrice: any,
    rowDelta: any,
    rowAmount: any,
  ): number {
    const result = Math.round(
      (Number(basePrice) * (1 + Number(rowDelta)) + Number(rowAmount)) * 100,
    ) / 100;
    return Number(result.toFixed(2));
  }

  private async generateQuoteCode(): Promise<string> {
    const today = new Date();
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

    const count = await this.prisma.quote.count({
      where: {
        createdAt: {
          gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        },
      },
    });

    const seq = String(count + 1).padStart(4, '0');
    return `QT${dateStr}${seq}`;
  }
}
