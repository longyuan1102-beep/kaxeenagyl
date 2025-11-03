import { Controller, Get, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('stats')
@UseGuards(JwtAuthGuard)
export class StatsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getStats() {
    const [suppliers, products, quotes] = await Promise.all([
      this.prisma.supplier.count(),
      this.prisma.product.count(),
      this.prisma.quote.count(),
    ]);

    // 总价值改为：所有产品的价格求和
    const productPrices = await this.prisma.product.findMany({
      select: { price: true },
    });
    // 累加价格并在服务端统一四舍五入到两位，避免浮点误差
    const sum = productPrices.reduce((acc, p) => acc + Number(p.price), 0);
    const totalValue = Number(sum.toFixed(2));

    return { suppliers, products, quotes, totalValue };
  }
}