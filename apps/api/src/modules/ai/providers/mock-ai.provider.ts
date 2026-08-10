import { Injectable, Logger } from '@nestjs/common';
import {
  AiProvider,
  AiPromptContext,
  AiGenerateOptions,
} from './ai-provider.interface';

/**
 * MockAiProvider
 *
 * Deterministic canned responses for testing.
 * Never sends real HTTP requests.
 * Responses cover all three artifact types.
 */
@Injectable()
export class MockAiProvider extends AiProvider {
  readonly name = 'mock';

  private readonly logger = new Logger(MockAiProvider.name);

  async generateRaw(
    context: AiPromptContext,
    _options?: AiGenerateOptions
  ): Promise<string> {
    void _options;
    this.logger.debug(
      `MockAiProvider generating for workspace=${context.workspaceId} artifactType=${context.artifactType}`
    );

    switch (context.artifactType) {
      case 'suggestion':
        return JSON.stringify({
          artifactType: 'suggestion',
          suggestions: [
            {
              title: '集中处理 P0 过期任务',
              description:
                '发现 3 个 P0 任务已过期，建议立即分配资源处理以避免阻塞项目进度。',
              confidence: 0.92,
              impactScore: 85,
              urgencyScore: 95,
              reason: 'P0 任务超时未完成，且为关键路径依赖项',
              evidence: { overdueCount: 3, totalOverdueDays: 5 },
            },
            {
              title: '提升健康相关指标',
              description:
                '当前健康评分为 62，低于 80 的目标值。建议关注执行环节的瓶颈。',
              confidence: 0.75,
              impactScore: 60,
              urgencyScore: 70,
              reason: 'health_score 低于阈值，可能影响整体交付质量',
              evidence: { currentScore: 62, targetScore: 80 },
            },
          ],
          reasoning: '基于工作区数据分析，识别出 2 个主要改进方向',
        });

      case 'review':
        return JSON.stringify({
          artifactType: 'review',
          review: {
            summary:
              '本周期内完成了 85% 的关键任务，健康评分保持在良好区间，但在时间管理和优先级排序方面仍有改进空间。',
            achievements: [
              '完成了核心产品模块的设计与开发',
              '团队协作效率提升 20%',
              '客户满意度达到 90 分',
            ],
            challenges: [
              '资源分配不均衡导致部分任务延期',
              '需求变更频繁影响排期',
              '质量保障环节人力不足',
            ],
            rootCauses: [
              '缺乏统一的优先级评估框架',
              '跨部门沟通机制不够顺畅',
              '测试环节自动化覆盖率低',
            ],
            lessonsLearned: [
              '需要建立更清晰的优先级矩阵',
              '引入每日站会同步机制',
              '提升自动化测试比例',
            ],
            nextCycleFocus: [
              '实施优先级评估框架',
              '完善每日同步机制',
              '推动 CI/CD 流水线建设',
            ],
            healthScore: 72,
            taskCompletionRate: 85,
          },
          reasoning: '综合本周期任务完成率和质量指标，形成复盘结论',
        });

      case 'task':
        return JSON.stringify({
          artifactType: 'task',
          tasks: [
            {
              title: '修复 P0 任务 #321 的阻塞问题',
              description: '与技术负责人讨论解决方案，预计需要 2 小时完成',
              priority: 'P0',
              estimatedMinutes: 120,
              reason: '该任务已阻塞 3 天，影响 2 个下游任务',
            },
            {
              title: '制定本周期健康指标提升计划',
              description: '分析 health_score 下降原因并制定改进措施',
              priority: 'P1',
              estimatedMinutes: 60,
              reason: '当前健康评分低于目标，需要系统性改进',
            },
            {
              title: '优化跨部门沟通流程',
              priority: 'P2',
              estimatedMinutes: 45,
              reason: '沟通不畅是主要挑战之一',
            },
          ],
          reasoning: '基于优先级和影响度分析，建议创建 3 个新任务',
        });

      default:
        return JSON.stringify({
          artifactType: context.artifactType,
          suggestions: [],
          tasks: [],
          reasoning: 'Unknown artifact type, returning empty',
        });
    }
  }
}
