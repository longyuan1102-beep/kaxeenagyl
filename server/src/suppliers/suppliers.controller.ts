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
} from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../common/decorators/user.decorator';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Controller('suppliers')
@UseGuards(JwtAuthGuard)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  create(@Body() createSupplierDto: CreateSupplierDto, @User() user: any) {
    return this.suppliersService.create(createSupplierDto, user.id);
  }

  @Get()
  findAll(
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
    @Query('search') search: string,
    @Query('name') name: string,
    @Query('category') category: string,
    @Query('phone') phone: string,
  ) {
    return this.suppliersService.findAll(
      page ? parseInt(page) : 1,
      pageSize ? parseInt(pageSize) : 10,
      search,
      name,
      category,
      phone,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.suppliersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSupplierDto: UpdateSupplierDto, @User() user: any) {
    return this.suppliersService.update(id, updateSupplierDto, user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @User() user: any) {
    return this.suppliersService.remove(id, user.id, user.role);
  }
}
