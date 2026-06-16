import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type RequestUser = {
  sub: string;
  email: string;
  role: 'admin' | 'reseller' | 'dev' | 'recovery';
};

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): RequestUser => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
