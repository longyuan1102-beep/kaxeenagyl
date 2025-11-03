import { IsNumber, IsOptional } from 'class-validator';

export class UpdateQuoteItemDto {
  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsNumber()
  rowDelta?: number;

  @IsOptional()
  @IsNumber()
  rowAmount?: number;
}