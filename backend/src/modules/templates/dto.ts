import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTemplateDto {
  @IsString() @IsNotEmpty() @MaxLength(100)
  name!: string;

  @IsString()
  @IsIn(['queue', 'approval', 'rejection', 'payment_reminder', 'custom'])
  type!: string;

  @IsString() @IsNotEmpty() @MaxLength(4000)
  content!: string;

  @IsOptional() @IsBoolean()
  active?: boolean;
}

export class UpdateTemplateDto {
  @IsOptional() @IsString() @MaxLength(100)
  name?: string;

  @IsOptional() @IsString() @IsIn(['queue', 'approval', 'rejection', 'payment_reminder', 'custom'])
  type?: string;

  @IsOptional() @IsString() @MaxLength(4000)
  content?: string;

  @IsOptional() @IsBoolean()
  active?: boolean;
}
