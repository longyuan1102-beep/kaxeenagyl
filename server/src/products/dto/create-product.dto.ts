import { IsString, IsNotEmpty, IsNumber, IsOptional, IsUUID, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @IsUUID()
  @IsNotEmpty()
  supplierId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  spec: string;

  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  price: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  leadDays?: number;

  @IsInt()
  @Min(1)
  @IsNotEmpty()
  @Type(() => Number)
  quantity: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  note?: string;

  @IsString()
  @IsOptional()
  barcode?: string;
}
