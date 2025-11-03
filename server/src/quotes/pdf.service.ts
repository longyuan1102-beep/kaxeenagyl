import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import { PrismaService } from '../prisma/prisma.service';
import { CompanyService } from '../company/company.service';

@Injectable()
export class PdfService {
  constructor(
    private prisma: PrismaService,
    private companyService: CompanyService,
  ) {}

  async generateQuotePdf(quoteId: string): Promise<Buffer> {
    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        creator: {
          select: {
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
        },
      },
    });

    if (!quote) {
      throw new Error('报价单不存在');
    }

    const company = await this.companyService.getProfile();

    // 计算合计
    const subtotal = quote.items.reduce((sum, item) => {
      return sum + Number(item.displayPrice) * Number(item.quantity);
    }, 0);

    const tax = subtotal * Number(quote.taxRate);
    const total = subtotal + tax;
    const html = this.generateQuoteHtml(quote, company, subtotal, tax, total);

    // 使用 Puppeteer 生成 PDF
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm',
        },
      });

      return pdfBuffer;
    } finally {
      await browser.close();
    }
  }

  private generateQuoteHtml(quote: any, company: any, subtotal: number, tax: number, total: number): string {
    const toAbsolute = (url?: string) => {
      if (!url) return '';
      return /^(https?:)?\/\//.test(url) ? url : `http://localhost:3001${url}`;
    };
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: "Microsoft YaHei", "SimHei", Arial, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #333;
    }
    .header {
      display: flex;
      align-items: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #ff8a00;
    }
    .logo {
      width: 80px;
      height: 80px;
      margin-right: 20px;
      border-radius: 50%;
      object-fit: contain;
    }
    .company-info {
      flex: 1;
    }
    .company-info h2 {
      color: #ff8a00;
      font-size: 24px;
      margin-bottom: 10px;
    }
    .company-info p {
      margin: 5px 0;
    }
    .quote-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
    }
    .quote-title {
      font-size: 28px;
      font-weight: bold;
      color: #ff8a00;
    }
    .quote-info {
      text-align: right;
    }
    .quote-info p {
      margin: 5px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th, td {
      padding: 8px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background-color: #ff8a00;
      color: white;
      font-weight: bold;
    }
    tr:hover {
      background-color: #f5f5f5;
    }
    tbody tr:nth-child(odd) { background-color: #fafafa; }
    .cell-small { font-size: 12px; }
    .text-right { text-align: right; }
    .product-thumb { width: 56px; height: 40px; object-fit: cover; border: 1px solid #eee; border-radius: 4px; }
    .desc { color: #555; }
    .summary {
      display: flex;
      justify-content: flex-end;
      margin-top: 30px;
    }
    .summary-table {
      width: 400px;
    }
    .summary-table td:last-child {
      text-align: right;
      font-weight: bold;
    }
    .total-row td {
      background-color: #ffe0b2;
      font-size: 16px;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      text-align: center;
      color: #999;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    ${company.logoUrl ? `<img src="${toAbsolute(company.logoUrl)}" alt="Logo" class="logo">` : '<div class="logo"></div>'}
    <div class="company-info">
      <h2>${company.nameCn}</h2>
      <p>${company.nameEn}</p>
      <p>开户行：${company.bankName}</p>
      <p>账号：${company.bankAccount}</p>
      <p>电话：${company.phone}</p>
    </div>
  </div>

  <div class="quote-header">
    <div class="quote-title">报价单</div>
    <div class="quote-info">
      <p>编号：${quote.code}</p>
      <p>客户：${quote.customerName}</p>
      ${quote.customerPhone ? `<p>电话：${quote.customerPhone}</p>` : ''}
      ${quote.customerAddress ? `<p>地址：${quote.customerAddress}</p>` : ''}
      <p>日期：${new Date(quote.createdAt).toLocaleDateString('zh-CN')}</p>
      ${quote.note ? `<p>备注：${quote.note}</p>` : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>序号</th>
        <th>图片</th>
        <th>产品名称</th>
        <th>规格</th>
        <th>产品介绍</th>
        <th>数量</th>
        <th>单价</th>
        <th>小计</th>
        <th>预定天数</th>
      </tr>
    </thead>
    <tbody>
      ${quote.items.map((item, index) => `
        <tr>
          <td class="cell-small">${index + 1}</td>
          <td>
            ${item.product.images && item.product.images.length ? `<img class=\"product-thumb\" src=\"${toAbsolute((item.product.images as any[]).sort((a: any,b: any)=> (a.sort||0)-(b.sort||0))[0].imageUrl)}\" alt=\"${item.product.name}\">` : ''}
          </td>
          <td>${item.product.name}</td>
          <td class="cell-small">${item.product.spec}</td>
          <td class="cell-small desc">${item.product.description || item.product.note || ''}</td>
          <td class="cell-small">${item.quantity}</td>
          <td class="cell-small text-right">¥${Number(item.displayPrice).toFixed(2)}</td>
          <td class="cell-small text-right">¥${(Number(item.displayPrice) * Number(item.quantity)).toFixed(2)}</td>
          <td class="cell-small">${item.product.leadDays} 天</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="summary">
    <table class="summary-table">
      <tr>
        <td>小计</td>
        <td>¥${subtotal.toFixed(2)}</td>
      </tr>
      ${Number(quote.taxRate) > 0 ? `
      <tr>
        <td>税费 (${(Number(quote.taxRate) * 100).toFixed(2)}%)</td>
        <td>¥${tax.toFixed(2)}</td>
      </tr>
      ` : ''}
      <tr class="total-row">
        <td>总计</td>
        <td>¥${total.toFixed(2)}</td>
      </tr>
    </table>
  </div>

  <div class="footer">
    <p>本报价单由系统自动生成</p>
  </div>
</body>
</html>
    `;
  }
}
