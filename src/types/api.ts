/**
 * Generic API response shape matching backend TransformInterceptor
 */
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}
