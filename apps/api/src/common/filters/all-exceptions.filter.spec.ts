import {
  ArgumentsHost,
  BadRequestException,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

/** 构造 Prisma 已知请求错误的 mock 对象（鸭子类型） */
function makePrismaError(code: string, message: string): unknown {
  return {
    code,
    clientVersion: '6.0.0',
    message,
    name: 'PrismaClientKnownRequestError',
  };
}

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  const mockResponse: {
    status: jest.Mock;
    json: jest.Mock;
  } = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const mockRequest = { method: 'GET', url: '/api/test' };

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    mockResponse.status.mockClear();
    mockResponse.json.mockClear();
  });

  function makeHost(): ArgumentsHost {
    return {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
        getNext: () => undefined,
      }),
    } as unknown as ArgumentsHost;
  }

  it('HttpException 应透传 status 与 message', () => {
    const exception = new NotFoundException('资源不存在');

    filter.catch(exception, makeHost());

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(mockResponse.json).toHaveBeenCalledWith({
      code: HttpStatus.NOT_FOUND,
      message: '资源不存在',
      data: null,
    });
  });

  it('ValidationPipe 抛出的 BadRequestException（message 为数组）应拼接为字符串', () => {
    const exception = new BadRequestException({
      message: ['field1 must be a string', 'field2 is required'],
      error: 'Bad Request',
      statusCode: 400,
    });

    filter.catch(exception, makeHost());

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith({
      code: HttpStatus.BAD_REQUEST,
      message: 'field1 must be a string, field2 is required',
      data: null,
    });
  });

  it('HttpException.getResponse() 为字符串时直接使用', () => {
    const exception = new HttpException(
      'forbidden string',
      HttpStatus.FORBIDDEN
    );

    filter.catch(exception, makeHost());

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    expect(mockResponse.json).toHaveBeenCalledWith({
      code: HttpStatus.FORBIDDEN,
      message: 'forbidden string',
      data: null,
    });
  });

  it('Prisma P2002 唯一约束冲突应映射为 409', () => {
    const exception = makePrismaError('P2002', 'Unique constraint failed');

    filter.catch(exception, makeHost());

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(mockResponse.json).toHaveBeenCalledWith({
      code: HttpStatus.CONFLICT,
      message: '唯一约束冲突，资源已存在',
      data: null,
    });
  });

  it('Prisma P2025 记录不存在应映射为 404', () => {
    const exception = makePrismaError('P2025', 'Record not found');

    filter.catch(exception, makeHost());

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(mockResponse.json).toHaveBeenCalledWith({
      code: HttpStatus.NOT_FOUND,
      message: '资源不存在',
      data: null,
    });
  });

  it('Prisma 其他已知错误码应返回 500 + 通用数据库错误提示', () => {
    const exception = makePrismaError('P1001', 'Some db error');

    filter.catch(exception, makeHost());

    expect(mockResponse.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR
    );
    expect(mockResponse.json).toHaveBeenCalledWith({
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      message: '数据库错误: P1001',
      data: null,
    });
  });

  it('未知 Error 应返回 500 + 通用提示', () => {
    const exception = new Error('unexpected boom');

    filter.catch(exception, makeHost());

    expect(mockResponse.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR
    );
    expect(mockResponse.json).toHaveBeenCalledWith({
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      message: '服务器内部错误',
      data: null,
    });
  });

  it('非 Error 对象（字符串异常）应返回 500', () => {
    const exception: unknown = 'string error';

    filter.catch(exception, makeHost());

    expect(mockResponse.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR
    );
    expect(mockResponse.json).toHaveBeenCalledWith({
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      message: '服务器内部错误',
      data: null,
    });
  });

  it('只有 code 没有 clientVersion 的对象不应被识别为 Prisma 错误', () => {
    const exception: unknown = { code: 'P2002', message: 'random' };

    filter.catch(exception, makeHost());

    // 应被归为未知错误，返回 500
    expect(mockResponse.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR
    );
    expect(mockResponse.json).toHaveBeenCalledWith({
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      message: '服务器内部错误',
      data: null,
    });
  });
});
