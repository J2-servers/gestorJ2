import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpsertServerDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  panelLink?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPerCredit?: number;

  @IsNumber()
  @Min(0)
  valuePerCredit!: number;
}
