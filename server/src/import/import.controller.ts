import {
  Controller,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Get,
  Param,
  Header,
  Delete,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportService } from './import.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../common/decorators/user.decorator';
import * as ExcelJS from 'exceljs';
import { StreamableFile } from '@nestjs/common';

@Controller('import')
@UseGuards(JwtAuthGuard)
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Post('products')
  @UseInterceptors(FileInterceptor('file'))
  async importProducts(
    @UploadedFile() file: Express.Multer.File,
    @Body('supplierId') supplierId: string,
    @Body('mode') mode: 'skip' | 'update',
    @Body('mapping') mappingRaw: string,
    @User() user: any,
  ) {
    const { headers, dataRows } = await this.importService.parseExcel(
      file.buffer,
      file.originalname,
    );

    // 使用前端提供的映射；若无则自动映射
    let fieldMapping: Record<string, string> | null = null;
    try {
      fieldMapping = mappingRaw ? JSON.parse(mappingRaw) : null;
    } catch {}
    if (!fieldMapping) {
      fieldMapping = await this.importService.autoMapFields(headers);
    }

    // 将数据映射到内部格式
    const mappedData = dataRows.map((row) => {
      const mapped: any = {};
      headers.forEach((header, index) => {
        const field = fieldMapping![header];
        if (field) {
          mapped[field] = row[index];
        }
      });

      if (supplierId) {
        mapped.supplierId = supplierId;
      }

      return mapped;
    });

    // 验证并导入
    const results = await this.importService.validateAndImport(
      mappedData,
      supplierId,
      user.id,
      file.originalname,
      mode,
    );

    return results;
  }

  // 异步导入：返回 jobId，并后台处理
  @Post('products/async')
  @UseInterceptors(FileInterceptor('file'))
  async importProductsAsync(
    @UploadedFile() file: Express.Multer.File,
    @Body('supplierId') supplierId: string,
    @Body('mode') mode: 'skip' | 'update',
    @Body('mapping') mappingRaw: string,
    @User() user: any,
  ) {
    let mapping: Record<string, string> | undefined;
    try { mapping = mappingRaw ? JSON.parse(mappingRaw) : undefined; } catch {}
    const jobId = await this.importService.enqueueAsyncImport(
      file.buffer,
      file.originalname,
      supplierId,
      user?.id,
      mode || 'skip',
      mapping,
    );
    return { jobId };
  }

  // 预检解析：返回表头、自动映射建议与前 50 行样例
  @Post('products/preview')
  @UseInterceptors(FileInterceptor('file'))
  async previewProducts(
    @UploadedFile() file: Express.Multer.File,
  ) {
    const { headers, dataRows } = await this.importService.parseExcel(
      file.buffer,
      file.originalname,
    );
    const mapping = await this.importService.autoMapFields(headers);
    const sample = dataRows.slice(0, 50);
    return {
      fileName: file.originalname,
      totalRows: dataRows.length,
      headers,
      mapping,
      sample,
    };
  }

  // 模板下载：CSV 格式
  @Get('template/products')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="products_template.csv"')
  getProductsTemplate() {
    // 模板字段与“新增产品”表单保持一致
    // 标注必填/可选，方便用户理解
    const headers = [
      '供应商（可选，若为空请在页面选择）',
      '名称（必填）',
      '规格（必填）',
      '单价（必填）',
      '提前预定天数（可选）',
      '数量（必填）',
      '产品介绍（可选）',
    ];
    // 示例行：可选字段留空，数量给出示例 1
    const exampleRow = ['','示例产品','型号A','123.45','', '1', '示例介绍'];
    const csv = [headers.join(','), exampleRow.join(',')].join('\n');
    // 加入 BOM，确保在 Excel 下编码识别为 UTF-8
    return '\uFEFF' + csv;
  }

  // 模板下载：XLSX（带样式与优化布局）
  @Get('template/products.xlsx')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @Header('Content-Disposition', 'attachment; filename="products_template.xlsx"')
  async getProductsTemplateXlsx(): Promise<StreamableFile> {
    const wb = new ExcelJS.Workbook();
    wb.created = new Date();
    wb.modified = new Date();

    const ws = wb.addWorksheet('产品导入模板', {
      views: [{ state: 'frozen', ySplit: 2 }],
      properties: { defaultRowHeight: 22 },
      pageSetup: { paperSize: 9, orientation: 'portrait' },
    });

    // 列宽优化
    ws.columns = [
      { header: '供应商（可选，若为空请在页面选择）', key: 'supplier', width: 30 },
      { header: '名称（必填）', key: 'name', width: 24 },
      { header: '规格（必填）', key: 'spec', width: 22 },
      { header: '单价（必填）', key: 'price', width: 16 },
      { header: '提前预定天数（可选）', key: 'leadDays', width: 20 },
      { header: '数量（必填）', key: 'quantity', width: 14 },
      { header: '产品介绍（可选）', key: 'description', width: 36 },
    ];

    // 标题行（合并单元格，居中加粗，主题色）
    ws.mergeCells(1, 1, 1, ws.columns.length);
    const titleCell = ws.getCell(1, 1);
    titleCell.value = '产品导入模板';
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    titleCell.font = { name: 'Microsoft YaHei', bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF8A00' } };
    ws.getRow(1).height = 28;

    // 表头样式
    const headerRow = ws.getRow(2);
    headerRow.values = ws.columns.map((c) => (typeof c.header === 'string' ? c.header : ''));
    headerRow.font = { bold: true, color: { argb: 'FF333333' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 24;
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDF3E7' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      };
    });

    // 示例行
    const exampleRow = ws.addRow(['', '示例产品', '型号A', 123.45, '', 1, '示例介绍']);
    exampleRow.height = 22;
    exampleRow.eachCell((cell, colNumber) => {
      cell.alignment = colNumber === 7 ? { vertical: 'top', wrapText: true } : { vertical: 'middle' };
      cell.border = {
        top: { style: 'hair' },
        left: { style: 'hair' },
        bottom: { style: 'hair' },
        right: { style: 'hair' },
      };
    });

    // 自动筛选
    ws.autoFilter = { from: 'A2', to: 'G2' };

    // 说明页
    const info = wb.addWorksheet('使用说明');
    info.columns = [{ width: 100 }];
    info.addRow(['填写说明：']);
    info.addRow(['- 标注“必填”的列必须填写；“可选”列可留空']);
    info.addRow(['- 单价为数字，数量为不小于 1 的整数']);
    info.addRow(['- 供应商列可以填写现有供应商名称；若留空，请在导入页面选择']);
    info.addRow(['- 建议使用此模板直接填写，避免格式问题']);
    info.getRow(1).font = { bold: true };

    const binary = await wb.xlsx.writeBuffer();
    const buf = Buffer.isBuffer(binary) ? binary : Buffer.from(binary);
    return new StreamableFile(buf);
  }

  @Get('jobs')
  async getImportJobs() {
    const jobs = await this.importService.listJobs();
    return { items: jobs };
  }

  @Get('jobs/:id')
  async getImportJob(@Param('id') id: string) {
    const job = await this.importService.getJob(id);
    const progress = this.importService.getProgress(id);
    return job ? { job, progress } : { message: '未找到导入任务' };
  }

  @Post('jobs/:id/cancel')
  async cancelImportJob(@Param('id') id: string) {
    const ok = this.importService.cancelJob(id);
    return { ok };
  }

  @Get('jobs/:id/report')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async downloadReport(@Param('id') id: string) {
    const job = await this.importService.getJob(id);
    if (!job?.reportUrl) return '暂无报告';
    const fsPath = require('path').join(process.cwd(), 'server', 'uploads', job.reportUrl);
    const fs = require('fs');
    return fs.readFileSync(fsPath, 'utf8');
  }

  @Delete('jobs/:id')
  async deleteJob(@Param('id') id: string) {
    const ok = await this.importService.deleteJob(id);
    return { ok };
  }
}
