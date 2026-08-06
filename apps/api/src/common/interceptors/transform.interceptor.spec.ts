import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor';
import { ApiResponse } from '../interfaces/api-response.interface';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<unknown>;
  let mockContext: ExecutionContext;
  const mockHandler: jest.Mocked<CallHandler<unknown>> = {
    handle: jest.fn(),
  };

  beforeEach(() => {
    interceptor = new TransformInterceptor<unknown>();
    mockContext = {} as ExecutionContext;
    mockHandler.handle.mockReset();
  });

  it('应把普通对象包装为 ApiResponse', (done) => {
    const input = { status: 'ok' };
    mockHandler.handle.mockReturnValueOnce(of(input));

    interceptor
      .intercept(mockContext, mockHandler)
      .subscribe((result: ApiResponse<unknown>) => {
        expect(result).toEqual({
          code: 0,
          message: 'success',
          data: { status: 'ok' },
        });
        done();
      });
  });

  it('已是 ApiResponse 时应原样透传（避免双重包装）', (done) => {
    const input: ApiResponse<string> = {
      code: 1001,
      message: 'custom',
      data: 'payload',
    };
    mockHandler.handle.mockReturnValueOnce(of(input));

    interceptor
      .intercept(mockContext, mockHandler)
      .subscribe((result: ApiResponse<string>) => {
        expect(result).toEqual(input);
        done();
      });
  });

  it('原始值（字符串）应被包装', (done) => {
    mockHandler.handle.mockReturnValueOnce(of('hello'));

    interceptor
      .intercept(mockContext, mockHandler)
      .subscribe((result: ApiResponse<string>) => {
        expect(result).toEqual({
          code: 0,
          message: 'success',
          data: 'hello',
        });
        done();
      });
  });

  it('null 返回值应被包装', (done) => {
    mockHandler.handle.mockReturnValueOnce(of(null));

    interceptor
      .intercept(mockContext, mockHandler)
      .subscribe((result: ApiResponse<null>) => {
        expect(result).toEqual({
          code: 0,
          message: 'success',
          data: null,
        });
        done();
      });
  });
});
