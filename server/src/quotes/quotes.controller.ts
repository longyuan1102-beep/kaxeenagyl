import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { QuotesService } from './quotes.service';
import { PdfService } from './pdf.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../common/decorators/user.decorator';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { AddQuoteItemDto } from './dto/add-quote-item.dto';

@Controller('quotes')
@UseGuards(JwtAuthGuard)
export class QuotesController {
  constructor(
    private readonly quotesService: QuotesService,
    private readonly pdfService: PdfService,
  ) {}

  @Post()
  create(@Body() createQuoteDto: CreateQuoteDto, @User() user: any) {
    return this.quotesService.create(createQuoteDto, user.id);
  }

  @Get()
  findAll(
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
    @Query('onlyMine') onlyMine: string,
    @Query('status') status: string,
    @Query('customerName') customerName: string,
    @User() user: any,
  ) {
    const isMine = onlyMine === 'true';
    const userId = isMine ? user.id : undefined;

    return this.quotesService.findAll(
      page ? parseInt(page) : 1,
      pageSize ? parseInt(pageSize) : 10,
      userId,
      isMine,
      status,
      customerName,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string, @User() user: any) {
    return this.quotesService.findOne(id, user.id, user.role);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateQuoteDto: UpdateQuoteDto, @User() user: any) {
    return this.quotesService.update(id, updateQuoteDto, user.id, user.role);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @User() user: any) {
    return this.quotesService.remove(id, user.id, user.role);
  }

  @Post(':id/items')
  addItems(@Param('id') id: string, @Body() items: AddQuoteItemDto[], @User() user: any) {
    return this.quotesService.addItems(id, items, user.id, user.role);
  }

  @Delete('items/:itemId')
  removeItem(@Param('itemId') itemId: string, @User() user: any) {
    return this.quotesService.removeItem(itemId, user.id, user.role);
  }

  @Patch('items/:itemId')
  updateItem(
    @Param('itemId') itemId: string,
    @Body() body: import('./dto/update-quote-item.dto').UpdateQuoteItemDto,
    @User() user: any,
  ) {
    return this.quotesService.updateItem(itemId, body, user.id, user.role);
  }

  @Patch(':id/mark-exported')
  markAsExported(@Param('id') id: string, @User() user: any) {
    return this.quotesService.markAsExported(id, user.id);
  }

  @Get(':id/export')
  async exportPdf(@Param('id') id: string, @Res() res: Response, @User() user: any) {
    const pdfBuffer = await this.pdfService.generateQuotePdf(id);
    
    // 标记为已导出
    await this.quotesService.markAsExported(id, user.id);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="quote-${id}.pdf"`);
    res.send(pdfBuffer);
  }
}
