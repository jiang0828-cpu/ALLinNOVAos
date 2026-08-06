import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(() => {
    controller = new HealthController();
  });

  it('check 应返回 status=ok 与有效 ISO timestamp', () => {
    const before = Date.now();
    const result = controller.check();
    const after = Date.now();

    expect(result.status).toBe('ok');

    // timestamp 应为合法 ISO 字符串，且在调用前后时间窗口内
    const parsed = Date.parse(result.timestamp);
    expect(Number.isNaN(parsed)).toBe(false);
    expect(parsed).toBeGreaterThanOrEqual(before);
    expect(parsed).toBeLessThanOrEqual(after);
    // ISO 字符串往返应保持一致
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });
});
