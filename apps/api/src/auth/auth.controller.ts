import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common'; import { Request, Response } from 'express'; import { AuthService } from './auth.service'; import { EmailDto, LoginDto, RegisterDto, ResetPasswordDto, TokenDto } from './auth.dto'; import { JwtAuthGuard } from './jwt-auth.guard';
const cookieOptions = { httpOnly:true, secure:process.env.NODE_ENV==='production', sameSite:'lax' as const, path:'/', maxAge:15*60*1000 };
@Controller('auth') export class AuthController { constructor(private readonly auth: AuthService) {}
 @Post('register') async register(@Body() dto:RegisterDto) { return {user:await this.auth.register(dto)}; }
 @Post('login') @HttpCode(200) async login(@Body() dto:LoginDto,@Res({passthrough:true}) res:Response) { const result=await this.auth.login(dto); res.cookie('access_token',result.accessToken,cookieOptions); return {user:result.user}; }
 @Post('logout') @HttpCode(204) logout(@Res({passthrough:true}) res:Response) { res.clearCookie('access_token',{httpOnly:true,secure:cookieOptions.secure,sameSite:'lax',path:'/'}); }
 @Post('verify-email') @HttpCode(204) async verify(@Body() dto:TokenDto) { await this.auth.verifyEmail(dto.token); }
 @Post('password-reset/request') @HttpCode(202) async requestReset(@Body() dto:EmailDto) { await this.auth.requestPasswordReset(dto.email); }
 @Post('password-reset/confirm') @HttpCode(204) async reset(@Body() dto:ResetPasswordDto) { await this.auth.resetPassword(dto.token,dto.password); }
 @Get('me') @UseGuards(JwtAuthGuard) async me(@Req() request:Request & {user:{sub:string}}) { return {user:await this.auth.me(request.user.sub)}; }
}
