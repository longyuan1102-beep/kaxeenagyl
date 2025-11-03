import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as XLSX from 'xlsx';
import * as chardet from 'jschardet';
import * as iconv from 'iconv-lite';
import { AuditService } from '../audit/audit.service';
import * as fs from 'fs';
import * as path from 'path';

// 字段同义词映射
const FIELD_MAPPING = {
  name: ['名称', '品名', '商品名', '产品名称'],
  spec: ['规格', '型号', '产品规格'],
  price: ['单价', '价格'],
  leadDays: ['提前预定天数', '预定天数', '提前期', 'lead_days'],
  note: ['备注', '说明'],
  description: ['产品介绍', '介绍', '描述', 'description'],
  quantity: ['数量', 'qty', 'quantity'],
  brand: ['品牌', '牌子'],
  category: ['分类', '类别', '品类'],
  unit: ['单位', '计量单位'],
  origin: ['产地', '来源地'],
};

// 默认产品图片（系统内置占位图）
const DEFAULT_PRODUCT_IMAGE_URL = 'https://placehold.co/400x300?text=Product';

@Injectable()
export class ImportService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  // 简易异步队列与进度追踪（内存级）
  private queue: Array<{ id: string; filePath: string; supplierId?: string; userId?: string; fileName?: string; mode: 'skip' | 'update'; mapping?: Record<string, string> }> = [];
  private processing: Map<string, { status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED'; processed: number; total: number; success: number; failed: number; skipped: number; updated: number; errors: Array<{ row: number; code: string; field?: string; message: string }>; cancel?: boolean; reportPath?: string }> = new Map();

  async parseExcel(file: Buffer, fileName: string) {
    const ext = (path.extname(fileName || '').toLowerCase());
    let workbook: XLSX.WorkBook;
    if (ext === '.csv') {
      // 处理 CSV 编码（支持 UTF-8/UTF-16/GBK/GB18030 等）
      const csvText = this.decodeCsvBuffer(file);
      workbook = XLSX.read(csvText, { type: 'string' });
    } else {
      workbook = XLSX.read(file, { type: 'buffer' });
    }
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

    if (rows.length < 2) {
      throw new Error('Excel 文件至少需要包含表头和一行数据');
    }

    // 兼容带标题的模板（首行可能是“产品导入模板”被合并居中），自动选择真正的表头行
    const countNonEmpty = (arr: any[]) => (arr || []).filter(v => String(v ?? '').trim() !== '').length;
    let headerIndex = 0;
    // 若首行仅 1 个非空单元格或包含“导入模板”字样，则跳过
    if (countNonEmpty(rows[0] as any[]) <= 1 || String((rows[0] || [])[0] || '').includes('导入模板')) {
      headerIndex = 1;
    }
    // 防御：在前 3 行中选择非空单元格数量最多且>=3的作为表头
    const top = Math.min(3, rows.length);
    let bestIdx = headerIndex;
    let bestCnt = countNonEmpty(rows[bestIdx] as any[]);
    for (let i = 0; i < top; i++) {
      const cnt = countNonEmpty(rows[i] as any[]);
      if (cnt > bestCnt && cnt >= 3) { bestIdx = i; bestCnt = cnt; }
    }
    headerIndex = bestIdx;

    const headers = rows[headerIndex] as string[];
    const dataRows = rows.slice(headerIndex + 1) as any[];

    return { headers, dataRows };
  }

  private decodeCsvBuffer(buffer: Buffer): string {
    // BOM 检测
    if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
      return buffer.toString('utf8');
    }
    if ((buffer[0] === 0xff && buffer[1] === 0xfe) || (buffer[0] === 0xfe && buffer[1] === 0xff)) {
      // UTF-16 LE/BE
      try {
        return iconv.decode(buffer, 'utf16-le');
      } catch {
        return iconv.decode(buffer, 'utf16-be');
      }
    }
    // 自动检测编码
    const detected = chardet.detect(buffer);
    const enc = (detected && detected.encoding || 'UTF-8').toUpperCase();
    // 映射到 iconv 的编码名称
    const map: Record<string, string> = {
      'UTF-8': 'utf8',
      'UTF8': 'utf8',
      'ASCII': 'ascii',
      'ISO-8859-1': 'latin1',
      'WINDOWS-1252': 'win1252',
      'GB18030': 'gb18030',
      'GB2312': 'gb2312',
      'GBK': 'gbk',
      'BIG5': 'big5',
    };
    const iconvEnc = map[enc] || 'utf8';
    try {
      return iconv.decode(buffer, iconvEnc);
    } catch {
      // 回退：按 UTF-8 解析
      return buffer.toString('utf8');
    }
  }

  async autoMapFields(headers: string[]) {
    const mapping: Record<string, string> = {};

    headers.forEach((header) => {
      const normalized = header.replace(/[\s\u3000]/g, '').toLowerCase();
      for (const [field, synonyms] of Object.entries(FIELD_MAPPING)) {
        if (synonyms.some((synonym) => normalized.includes(synonym.replace(/[\s\u3000]/g, '').toLowerCase()))) {
          mapping[header] = field;
          break;
        }
      }
    });

    return mapping;
  }

  async validateAndImport(
    data: any[],
    supplierId?: string,
    userId?: string,
    fileName?: string,
    mode: 'skip' | 'update' = 'skip',
  ) {
    const results = {
      total: data.length,
      success: 0,
      failed: 0,
      skipped: 0,
      updated: 0,
      errors: [] as Array<{ row: number; code: string; field?: string; message: string }>,
    };

    // 创建导入任务记录
    const job = await this.prisma.importJob.create({
      data: {
        fileName: fileName || 'import.xlsx',
        uploaderId: userId,
        status: 'PENDING',
        total: data.length,
      },
    });

    try {
      for (const [index, row] of data.entries()) {
        try {
          // 统一将名称与规格转为字符串，避免数字类型导致 Prisma 校验失败
          const nameStr = String(row.name ?? '').trim();
          const specStr = String(row.spec ?? '').trim();

          // 验证必填字段
          if (!nameStr || !specStr || !row.price) {
            results.failed++;
            results.errors.push({ row: index + 2, code: 'REQUIRED', field: 'name/spec/price', message: '缺少必填字段：名称、规格或单价' });
            continue;
          }

          // 解析与校验供应商
          let resolvedSupplierId = supplierId || row.supplierId;
          if (!resolvedSupplierId && row.supplier) {
            const supplier = await this.prisma.supplier.findFirst({
              where: { name: row.supplier },
              select: { id: true },
            });
            if (supplier) {
              resolvedSupplierId = supplier.id;
            }
          }
          // 若提供了 supplierId，进一步校验该供应商是否存在，避免外键错误
          if (resolvedSupplierId) {
            const exists = await this.prisma.supplier.findUnique({ where: { id: resolvedSupplierId } });
            if (!exists) {
              results.failed++;
              results.errors.push({ row: index + 2, code: 'SUPPLIER_NOT_FOUND', field: 'supplierId', message: '供应商不存在或已删除' });
              continue;
            }
          }
          if (!resolvedSupplierId) {
            results.failed++;
            results.errors.push({ row: index + 2, code: 'SUPPLIER_NOT_FOUND', field: 'supplierId/supplier', message: '缺少供应商或供应商不存在' });
            continue;
          }

          // 校验价格与提前期
          const priceNum = typeof row.price === 'string' ? parseFloat((row.price as string).replace(/[,\s]/g, '')) : parseFloat(row.price);
          if (Number.isNaN(priceNum)) {
            results.failed++;
            results.errors.push({ row: index + 2, code: 'INVALID_PRICE', field: 'price', message: '单价格式不正确' });
            continue;
          }
          const leadDaysNum = row.leadDays === undefined || row.leadDays === null || row.leadDays === ''
            ? 0
            : parseInt(String(row.leadDays), 10) || 0;

          // 校验数量（必填：不小于 1 的整数）
          const quantityNum = row.quantity === undefined || row.quantity === null || row.quantity === ''
            ? NaN
            : parseInt(String(row.quantity), 10);
          if (!Number.isInteger(quantityNum) || quantityNum < 1) {
            results.failed++;
            results.errors.push({ row: index + 2, code: 'INVALID_QUANTITY', field: 'quantity', message: '数量必须为不小于 1 的整数' });
            continue;
          }

          // 检查产品是否存在
          const existing = await this.prisma.product.findUnique({
            where: {
              supplierId_name_spec: {
                supplierId: resolvedSupplierId,
                name: nameStr,
                spec: specStr,
              },
            },
          });

          if (existing) {
            if (mode === 'update') {
              // 记录价格历史
              await this.prisma.priceHistory.create({
                data: {
                  productId: existing.id,
                  oldPrice: existing.price,
                  newPrice: priceNum,
                  changedBy: userId || 'system',
                },
              });

              await this.prisma.product.update({
                where: { id: existing.id },
                data: {
                  price: priceNum,
                  leadDays: leadDaysNum,
                  ...(Number.isInteger(quantityNum) && quantityNum >= 1 ? { quantity: quantityNum } : {}),
                  note: row.note,
                  barcode: row.barcode,
                },
              });
              results.updated++;
              continue;
            } else {
              results.skipped++;
              results.errors.push({ row: index + 2, code: 'DUPLICATE', message: '产品已存在，跳过' });
              continue;
            }
          }

          // 创建产品
          const created = await this.prisma.product.create({
            data: {
              supplierId: resolvedSupplierId,
              name: nameStr,
              spec: specStr,
              price: priceNum,
              leadDays: leadDaysNum,
              quantity: quantityNum,
              note: row.note,
              barcode: row.barcode,
            },
          });

          // 自动补充默认封面图片，避免产品无图
          try {
            await this.prisma.productImage.create({
              data: {
                productId: created.id,
                imageUrl: DEFAULT_PRODUCT_IMAGE_URL,
                sort: 0,
              },
            });
          } catch {}

          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            row: index + 2,
            code: 'UNKNOWN',
            message: (error as any)?.message || '未知错误',
          });
        }
      }

      // 更新导入任务状态
      await this.prisma.importJob.update({
        where: { id: job.id },
        data: {
          status: results.success > 0 ? 'SUCCESS' : 'FAILED',
          successCount: results.success,
          failedCount: results.failed,
        },
      });

      await this.auditService.log({
        userId,
        action: 'IMPORT',
        entity: 'Product',
        entityId: job.id,
        summary: `导入产品: 成功 ${results.success}, 失败 ${results.failed}, 跳过 ${results.skipped}, 更新 ${results.updated}`,
      });

      return results;
    } catch (error) {
      await this.prisma.importJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
        },
      });

      throw error;
    }
  }

  // 异步导入：写文件并入队
  async enqueueAsyncImport(file: Buffer, fileName: string, supplierId: string | undefined, userId: string | undefined, mode: 'skip' | 'update', mapping?: Record<string, string>) {
    const uploadDir = path.join(process.cwd(), 'server', 'uploads');
    const storedName = `import-${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(fileName)}`;
    const filePath = path.join(uploadDir, storedName);
    await fs.promises.writeFile(filePath, file);

    const job = await this.prisma.importJob.create({
      data: { fileName, uploaderId: userId, status: 'PENDING', total: 0 }
    });

    this.queue.push({ id: job.id, filePath, supplierId, userId, fileName, mode, mapping });
    this.processing.set(job.id, { status: 'PENDING', processed: 0, total: 0, success: 0, failed: 0, skipped: 0, updated: 0, errors: [] });
    this.processQueue();
    return job.id;
  }

  private async processQueue() {
    if (this.queue.length === 0) return;
    const current = this.queue.shift()!;
    const progress = this.processing.get(current.id);
    if (!progress) return;
    progress.status = 'RUNNING';

    try {
      const fileBuf = await fs.promises.readFile(current.filePath);
      const ext = path.extname(current.filePath).toLowerCase();
      const workbook = ext === '.csv'
        ? XLSX.read(this.decodeCsvBuffer(fileBuf), { type: 'string' })
        : XLSX.read(fileBuf, { type: 'buffer' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
      // 兼容带标题的模板：自动识别真实表头行
      const countNonEmpty = (arr: any[]) => (arr || []).filter(v => String(v ?? '').trim() !== '').length;
      let headerIndex = 0;
      if (countNonEmpty(rows[0] as any[]) <= 1 || String((rows[0] || [])[0] || '').includes('导入模板')) {
        headerIndex = 1;
      }
      const top = Math.min(3, rows.length);
      let bestIdx = headerIndex;
      let bestCnt = countNonEmpty(rows[bestIdx] as any[]);
      for (let i = 0; i < top; i++) {
        const cnt = countNonEmpty(rows[i] as any[]);
        if (cnt > bestCnt && cnt >= 3) { bestIdx = i; bestCnt = cnt; }
      }
      headerIndex = bestIdx;
      const headers = rows[headerIndex] as string[];
      const dataRows = rows.slice(headerIndex + 1) as any[];
      progress.total = dataRows.length;
      await this.prisma.importJob.update({ where: { id: current.id }, data: { total: dataRows.length } });

      // 映射优先使用外部提供，否则自动
      const fieldMapping = current.mapping && Object.keys(current.mapping).length > 0 ? current.mapping : await this.autoMapFields(headers);
      const mappedData = dataRows.map((row) => {
        const mapped: any = {};
        headers.forEach((header, index) => {
          const field = fieldMapping[header];
          if (field) mapped[field] = row[index];
        });
        if (current.supplierId) mapped.supplierId = current.supplierId;
        return mapped;
      });

      // 分块处理，更新中间进度
      const chunkSize = 100;
      for (let i = 0; i < mappedData.length; i += chunkSize) {
        if (progress.cancel) throw new Error('导入已取消');
        const chunk = mappedData.slice(i, i + chunkSize);
        const result = await this.validateAndImport(chunk, current.supplierId, current.userId, current.fileName, current.mode);
        // 累计
        progress.success += result.success;
        progress.failed += result.failed;
        progress.skipped += result.skipped;
        progress.updated += result.updated || 0;
        progress.errors.push(...result.errors);
        progress.processed = Math.min(progress.total, progress.processed + chunk.length);
        // 持久化当前成功/失败数（简化）
        await this.prisma.importJob.update({ where: { id: current.id }, data: { successCount: progress.success, failedCount: progress.failed } });
      }

      // 生成错误报告
      if (progress.errors.length > 0) {
        const reportPath = await this.generateErrorReport(current.id, progress.errors);
        progress.reportPath = reportPath;
        await this.prisma.importJob.update({ where: { id: current.id }, data: { reportUrl: path.basename(reportPath) } });
      }

      await this.prisma.importJob.update({ where: { id: current.id }, data: { status: 'SUCCESS' } });
      progress.status = 'SUCCESS';
    } catch (err) {
      await this.prisma.importJob.update({ where: { id: current.id }, data: { status: 'FAILED' } });
      progress.status = 'FAILED';
    } finally {
      // 继续处理下一个
      if (this.queue.length > 0) setImmediate(() => this.processQueue());
    }
  }

  async generateErrorReport(jobId: string, errors: Array<{ row: number; code: string; field?: string; message: string }>) {
    const header = '行号,错误码,字段,错误信息\n';
    const csv = header + errors.map(e => `${e.row},${e.code || ''},${e.field || ''},${(e.message || '').replace(/\n/g,' ')}`).join('\n');
    const uploadDir = path.join(process.cwd(), 'server', 'uploads');
    const reportName = `import-report-${jobId}.csv`;
    const reportPath = path.join(uploadDir, reportName);
    await fs.promises.writeFile(reportPath, csv, 'utf8');
    return reportPath;
  }

  getProgress(jobId: string) {
    return this.processing.get(jobId);
  }

  cancelJob(jobId: string) {
    const p = this.processing.get(jobId);
    if (p) p.cancel = true;
    return !!p;
  }

  async listJobs() {
    return this.prisma.importJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getJob(id: string) {
    return this.prisma.importJob.findUnique({ where: { id } });
  }

  async deleteJob(id: string) {
    try {
      const job = await this.prisma.importJob.findUnique({ where: { id } });
      if (!job) return false;
      // 如果有错误报告文件，尝试删除
      if (job.reportUrl) {
        const reportPath = path.join(process.cwd(), 'server', 'uploads', job.reportUrl);
        try { await fs.promises.unlink(reportPath); } catch {}
      }
      // 若仍在处理中，先标记取消
      const prog = this.processing.get(id);
      if (prog) prog.cancel = true;
      await this.prisma.importJob.delete({ where: { id } });
      // 清理内存中的进度
      this.processing.delete(id);
      return true;
    } catch {
      return false;
    }
  }
}
