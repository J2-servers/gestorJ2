import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

export class RegisterDto extends LoginDto {
  @IsString()
  name!: string;
}

export class BootstrapAdminDto extends LoginDto {
  @IsString()
  name!: string;

  @IsEmail()
  recoveryEmail!: string;

  @IsString()
  @MinLength(6)
  recoveryPassword!: string;
}
