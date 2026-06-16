import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateResellerServerDto {
  @IsString()
  resellerId!: string;

  @IsString()
  serverId!: string;

  @IsString()
  login!: string;

  @IsNumber()
  @Min(0)
  valuePerCredit!: number;
}

export class UpdateResellerServerDto {
  @IsOptional()
  @IsString()
  login?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  valuePerCredit?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
