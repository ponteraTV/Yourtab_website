import { IsEmail, IsString, Matches, MinLength } from 'class-validator';
export class RegisterDto { @IsEmail() email!: string; @IsString() @MinLength(12) @Matches(/[A-Z]/,{message:'password must contain an uppercase letter'}) @Matches(/[a-z]/,{message:'password must contain a lowercase letter'}) @Matches(/[0-9]/,{message:'password must contain a number'}) password!: string; }
export class LoginDto { @IsEmail() email!: string; @IsString() password!: string; }
export class TokenDto { @IsString() @MinLength(20) token!: string; }
export class ResetPasswordDto extends TokenDto { @IsString() @MinLength(12) @Matches(/[A-Z]/) @Matches(/[a-z]/) @Matches(/[0-9]/) password!: string; }
export class EmailDto { @IsEmail() email!: string; }
