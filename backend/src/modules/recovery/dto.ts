import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class ResetAdminCredentialsDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}

export class ChangeOwnPasswordDto {
  @IsString()
  @MinLength(8)
  password!: string;
}
