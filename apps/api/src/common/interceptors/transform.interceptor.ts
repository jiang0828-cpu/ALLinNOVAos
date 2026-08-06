import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import {
  ApiResponse,
  SUCCESS_CODE,
  SUCCESS_MESSAGE,
} from '../interfaces/api-response.interface';

/**
 * 判断对象是否已经是 ApiResponse 形态（避免双重包装）
 */
function isApiResponse(obj: unknown): obj is ApiResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'code' in obj &&
    'message' in obj &&
    'data' in obj
  );
}

/**
 * 全局响应转换拦截器
 *
 * 把 controller 返回值统一包装为 `{ code, message, data }` 结构；
 * 若返回值已经是 ApiResponse 形态则原样透传，避免双重包装。
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data: T) => {
        if (isApiResponse(data)) {
          // 已是 ApiResponse 形态，原样透传；双重断言绕开泛型协变限制
          return data as unknown as ApiResponse<T>;
        }
        return {
          code: SUCCESS_CODE,
          message: SUCCESS_MESSAGE,
          data,
        };
      })
    );
  }
}
