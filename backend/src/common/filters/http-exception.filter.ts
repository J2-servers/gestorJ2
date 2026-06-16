import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { PrismaService } from '../../modules/prisma/prisma.service';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(private readonly prisma: PrismaService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    let message: string;
    let details: unknown = undefined;

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (exceptionResponse && typeof exceptionResponse === 'object') {
      const r = exceptionResponse as Record<string, unknown>;
      message = (r.message as string) || 'Erro interno';
      if (Array.isArray(r.message)) {
        message = 'Dados inválidos';
        details = r.message;
      }
    } else {
      message = 'Erro interno do servidor';
    }

    if (status >= 500) {
      const stack = exception instanceof Error ? exception.stack : String(exception);
      this.logger.error(`${request.method} ${request.url} → ${status}`, stack);
      // Persiste o erro para leitura na página de Manutenção (fire-and-forget).
      void this.persist(status, request, message, stack);
    }

    response.status(status).json({
      success: false,
      error: {
        code: status,
        message,
        ...(details ? { details } : {}),
      },
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private async persist(status: number, request: Request, message: string, stack?: string) {
    try {
      const userId = (request as any).user?.sub ?? null;
      await this.prisma.errorLog.create({
        data: {
          level: 'error',
          statusCode: status,
          method: request.method,
          path: request.url,
          message: message.slice(0, 1000),
          stack: stack?.slice(0, 8000),
          userId,
        },
      });
    } catch {
      // Nunca deixar a gravação de log derrubar a resposta.
    }
  }
}
