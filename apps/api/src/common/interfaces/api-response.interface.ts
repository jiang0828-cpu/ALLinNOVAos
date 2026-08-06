/**
 * 统一 API 响应结构
 *
 * 全局约定：
 * - code: 0 表示成功；非 0 表示业务/HTTP 错误码
 * - message: 人类可读的提示信息
 * - data: 业务数据负载
 */
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

/** 成功响应的 code 常量 */
export const SUCCESS_CODE = 0;

/** 成功响应的 message 常量 */
export const SUCCESS_MESSAGE = 'success';
