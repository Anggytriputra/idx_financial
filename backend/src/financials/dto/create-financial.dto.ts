import {
  IsInt,
  IsOptional,
  Min,
  Max,
  IsNumber,
  IsString,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFinancialDto {
  @IsUUID()
  companyId: string;

  @IsInt()
  @Min(1990)
  @Max(2100)
  year: number;

  @IsInt()
  @Min(1)
  @Max(4)
  @IsOptional()
  quarter?: number = 4;

  // Balance Sheet
  @IsOptional() @IsNumber() @Type(() => Number) totalAssets?: number;
  @IsOptional() @IsNumber() @Type(() => Number) currentAssets?: number;
  @IsOptional() @IsNumber() @Type(() => Number) nonCurrentAssets?: number;
  @IsOptional() @IsNumber() @Type(() => Number) totalLiabilities?: number;
  @IsOptional() @IsNumber() @Type(() => Number) currentLiabilities?: number;
  @IsOptional() @IsNumber() @Type(() => Number) longTermLiabilities?: number;
  @IsOptional() @IsNumber() @Type(() => Number) totalEquity?: number;
  @IsOptional() @IsNumber() @Type(() => Number) workingCapital?: number;

  // Income Statement
  @IsOptional() @IsNumber() @Type(() => Number) revenue?: number;
  @IsOptional() @IsNumber() @Type(() => Number) costOfGoodsSold?: number;
  @IsOptional() @IsNumber() @Type(() => Number) grossProfit?: number;
  @IsOptional() @IsNumber() @Type(() => Number) operatingExpenses?: number;
  @IsOptional() @IsNumber() @Type(() => Number) operatingProfit?: number;
  @IsOptional() @IsNumber() @Type(() => Number) ebitda?: number;
  @IsOptional() @IsNumber() @Type(() => Number) netProfit?: number;

  // Cash Flow
  @IsOptional() @IsNumber() @Type(() => Number) operatingCashFlow?: number;
  @IsOptional() @IsNumber() @Type(() => Number) investingCashFlow?: number;
  @IsOptional() @IsNumber() @Type(() => Number) financingCashFlow?: number;

  // Per Share
  @IsOptional() @IsNumber() @Type(() => Number) sharesOutstanding?: number;
  @IsOptional() @IsNumber() @Type(() => Number) eps?: number;
  @IsOptional() @IsNumber() @Type(() => Number) bvps?: number;

  // Market Data
  @IsOptional() @IsNumber() @Type(() => Number) marketPrice?: number;
  @IsOptional() @IsNumber() @Type(() => Number) fairValue?: number;
  @IsOptional() @IsNumber() @Type(() => Number) marketCap?: number;

  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsUUID() sourcePdfId?: string;
}
