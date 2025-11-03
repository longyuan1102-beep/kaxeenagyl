import { IsString, IsNotEmpty, IsNumber, IsOptional, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class AddQuoteItemDto {
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  quantity?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  rowDelta?: number;

  // 固定金额加减（允许为负，单位与产品价格一致）
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  rowAmount?: number;
}
