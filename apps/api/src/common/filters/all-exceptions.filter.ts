import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiResponse } from '../interfaces/api-response.interface';

interface PrismaMappedError {
  status: HttpStatus;
  message: string;
}

/** Prisma 已知请求错误的鸭子类型（避免依赖 @prisma/client 运行时类） */
interface PrismaKnownRequestErrorLike {
  code: string;
  message: string;
}

/**
 * Prisma 已知错误码映射表
 * - P2002: 唯一约束冲突
 * - P2025: 记录不存在
 */
const PRISMA_ERROR_MAP: Readonly<Record<string, PrismaMappedError>> = {
  P2002: {
    status: HttpStatus.CONFLICT,
    message: '唯一约束冲突，资源已存在',
  },
  P2025: {
    status: HttpStatus.NOT_FOUND,
    message: '资源不存在',
  },
};

/**
 * 判断异常是否为 Prisma 已知请求错误（鸭子类型）
 *
 * 不使用 `instanceof Prisma.PrismaClientKnownRequestError`，
 * 避免在 PrismaClient 未生成时 `Prisma.PrismaClientKnownRequestError`
 * 为 undefined 导致 `instanceof` 抛 TypeError。
 * 真实的 PrismaClientKnownRequestError 实例同时拥有 `code` 与 `clientVersion` 字段。
 */
function isPrismaKnownRequestError(
  exception: unknown
): exception is PrismaKnownRequestErrorLike {
  if (typeof exception !== 'object' || exception === null) return false;
  const obj = exception as Record<string, unknown>;
  return typeof obj.code === 'string' && typeof obj.clientVersion === 'string';
}

/**
 * 全局异常过滤器
 *
 * 统一处理三类异常，并返回 `{ code, message, data: null }` 结构：
 * 1. HttpException - 透传 HTTP 状态码与 message
 * 2. Prisma 已知请求错误 - 映射为 4xx 业务错误
 * 3. 其他未知错误 - 返回 500 + 通用提示
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = this.resolveHttpStatus(exception);
    const body = this.buildErrorBody(exception, status);

    this.logError(exception, request.method, request.url, status);

    response.status(status).json(body);
  }

  private buildErrorBody(
    exception: unknown,
    status: HttpStatus
  ): ApiResponse<null> {
    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      const message = this.extractMessage(res, exception.message);
      return { code: status, message, data: null };
    }

    if (isPrismaKnownRequestError(exception)) {
      const mapped = PRISMA_ERROR_MAP[exception.code];
      const message = mapped?.message ?? `数据库错误: ${exception.code}`;
      return { code: status, message, data: null };
    }

    return {
      code: status,
      message: '服务器内部错误',
      data: null,
    };
  }

  private resolveHttpStatus(exception: unknown): HttpStatus {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }
    if (isPrismaKnownRequestError(exception)) {
      return (
        PRISMA_ERROR_MAP[exception.code]?.status ??
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  /**
   * 从 HttpException.getResponse() 提取 message
   * res 可能是 string、{ message: string | string[] } 或对象
   */
  private extractMessage(res: string | object, fallback: string): string {
    if (typeof res === 'string') return res;
    if (typeof res === 'object' && res !== null && 'message' in res) {
      const msg = res.message;
      if (typeof msg === 'string') return msg;
      if (Array.isArray(msg)) return msg.join(', ');
    }
    return fallback;
  }

  private logError(
    exception: unknown,
    method: string,
    url: string,
    status: number
  ): void {
    const message =
      exception instanceof Error ? exception.message : String(exception);
    const stack = exception instanceof Error ? exception.stack : undefined;
    this.logger.error(`[${status}] ${method} ${url} - ${message}`, stack);
  }
}
