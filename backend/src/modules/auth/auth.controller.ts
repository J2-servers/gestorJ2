import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { BootstrapAdminDto, LoginDto, RegisterDto } from './dto';
import { AllowRecovery } from '../../common/decorators/allow-recovery.decorator';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';

const REFRESH_COOKIE_NAME = 'refresh_token';
const ACCESS_COOKIE_NAME = 'access_token';
const REFRESH_COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/api/auth',
  maxAge: 30 * 24 * 60 * 60 * 1000,
};
const ACCESS_COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/api',
  maxAge: 24 * 60 * 60 * 1000,
};
const CLEAR_COOKIE_OPTS = {
  path: REFRESH_COOKIE_OPTS.path,
  sameSite: REFRESH_COOKIE_OPTS.sameSite,
  secure: REFRESH_COOKIE_OPTS.secure,
};
const CLEAR_ACCESS_COOKIE_OPTS = {
  path: ACCESS_COOKIE_OPTS.path,
  sameSite: ACCESS_COOKIE_OPTS.sameSite,
  secure: ACCESS_COOKIE_OPTS.secure,
};

function setAuthCookies(res: Response, result: { accessToken?: string | null; refreshToken?: string | null }) {
  if (result.accessToken) res.cookie(ACCESS_COOKIE_NAME, result.accessToken, ACCESS_COOKIE_OPTS);
  if (result.refreshToken) res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, REFRESH_COOKIE_OPTS);
}

function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE_NAME, CLEAR_ACCESS_COOKIE_OPTS);
  res.clearCookie(REFRESH_COOKIE_NAME, CLEAR_COOKIE_OPTS);
}

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
    setAuthCookies(res, result);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.register(dto);
    setAuthCookies(res, result);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.login(dto);
    setAuthCookies(res, result);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!raw) {
      clearAuthCookies(res);
      return { accessToken: null };
    }
    const result = await this.auth.refreshAccess(raw);
    setAuthCookies(res, result);
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
    const raw = req.cookies?.[REFRESH_COOKIE_NAME];
    await this.auth.logout(user.sub, raw);
    clearAuthCookies(res);
    return { success: true };
  }
}
