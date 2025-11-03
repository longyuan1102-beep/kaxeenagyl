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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../common/decorators/user.decorator';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(@Body() createProductDto: CreateProductDto, @User() user: any) {
    return this.productsService.create(createProductDto, user.id);
  }

  @Get()
  findAll(
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
    @Query('search') search: string,
    @Query('supplierId') supplierId: string,
  ) {
    return this.productsService.findAll(
      page ? parseInt(page) : 1,
      pageSize ? parseInt(pageSize) : 10,
      search,
      supplierId,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto, @User() user: any) {
    return this.productsService.update(id, updateProductDto, user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @User() user: any) {
    return this.productsService.remove(id, user.id, user.role);
  }

  @Post(':id/images')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadDir = process.env.UPLOAD_DIR || './uploads';
          fs.mkdirSync(uploadDir, { recursive: true });
          cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
          const ext = path.extname(file.originalname || '') || '';
          const base = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
          cb(null, `${base}${ext}`);
        },
      }),
    }),
  )
  async addImage(
    @Param('id') id: string,
    @Query('sort') sort: string,
    @UploadedFile() file: Express.Multer.File,
    @User() user: any,
  ) {
    const imageUrl = `/uploads/${file.filename}`;
    const sortNum = typeof sort === 'string' ? parseInt(sort) : 0;
    return this.productsService.addImage(id, imageUrl, user.id, Number.isFinite(sortNum) ? sortNum : 0);
  }

  @Delete('images/:imageId')
  removeImage(@Param('imageId') imageId: string, @User() user: any) {
    return this.productsService.removeImage(imageId, user.id);
  }
}
