import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { BootstrapAdminDto, LoginDto, RegisterDto } from './dto';
import { AllowRecovery } from '../../common/decorators/allow-recovery.decorator';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';

const COOKIE_NAME = 'refresh_token';
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'strict' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/api/auth',
  maxAge: 30 * 24 * 60 * 60 * 1000,
};
const CLEAR_COOKIE_OPTS = {
  path: COOKIE_OPTS.path,
  sameSite: COOKIE_OPTS.sameSite,
  secure: COOKIE_OPTS.secure,
};

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Get('bootstrap/status')
  bootstrapStatus() {
    return this.auth.bootstrapStatus();
  }

  @Post('bootstrap')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async bootstrap(@Body() dto: BootstrapAdminDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.bootstrapAdmins(dto);
    res.cookie(COOKIE_NAME, result.refreshToken, COOKIE_OPTS);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.register(dto);
    res.cookie(COOKIE_NAME, result.refreshToken, COOKIE_OPTS);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.login(dto);
    res.cookie(COOKIE_NAME, result.refreshToken, COOKIE_OPTS);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw = req.cookies?.[COOKIE_NAME];
    if (!raw) {
      res.clearCookie(COOKIE_NAME, CLEAR_COOKIE_OPTS);
      return { accessToken: null };
    }
    const result = await this.auth.refreshAccess(raw);
    res.cookie(COOKIE_NAME, result.refreshToken, COOKIE_OPTS);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @AllowRecovery()
  async logout(
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const raw = req.cookies?.[COOKIE_NAME];
    await this.auth.logout(user.sub, raw);
    res.clearCookie(COOKIE_NAME, CLEAR_COOKIE_OPTS);
    return { success: true };
  }
}
