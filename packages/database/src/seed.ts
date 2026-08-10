// Seed script for PDCAr demonstration data
// Run with: pnpm --filter @nova-os/database db:seed

import {
  PrismaClient,
  WorkItemType,
  WorkItemStatus,
  PdcaStage,
  SourceType,
  Priority,
  TaskStatus,
  WorkItemRelationType,
  HealthStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding PDCAr demonstration data...\n');

  // --- 1. Create default user ---
  const user = await prisma.user.upsert({
    where: { email: 'test@novaos.com' },
    update: {},
    create: {
      email: 'test@novaos.com',
      name: 'Test User',
      timezone: 'Asia/Shanghai',
    },
  });
  console.log(`✅ User: ${user.email}`);

  // --- 2. Create default workspace ---
  const workspace = await prisma.workspace.upsert({
    where: { id: 'ws_default' },
    update: { name: 'My Workspace' },
    create: {
      id: 'ws_default',
      name: 'My Workspace',
      type: 'PERSONAL',
    },
  });
  console.log(`✅ Workspace: ${workspace.name}`);

  // --- 3. Link user to workspace ---
  await prisma.workspaceMember.upsert({
    where: {
      userId_workspaceId: { userId: user.id, workspaceId: workspace.id },
    },
    update: { role: 'OWNER' },
    create: {
      userId: user.id,
      workspaceId: workspace.id,
      role: 'OWNER',
    },
  });
  console.log('✅ Workspace member linked (OWNER)');

  // --- 4. Create domains ---
  const domainNames = ['health', 'wealth', 'work', 'content', 'learning', 'agi', 'media'];
  const domains: Record<string, { id: string; name: string }> = {};

  for (const name of domainNames) {
    const domain = await prisma.domain.upsert({
      where: { workspaceId_name: { workspaceId: workspace.id, name } },
      update: {},
      create: { workspaceId: workspace.id, name },
    });
    domains[name] = { id: domain.id, name: domain.name };
  }
  console.log(`✅ Created ${Object.keys(domains).length} domains`);

  // --- 5. Create PDCAr cycles ---
  const now = new Date();
  const year = now.getFullYear();

  // Yearly
  const yearlyCycle = await prisma.pdcaCycle.upsert({
    where: { id: `cycle_yearly_${year}` },
    update: {},
    create: {
      id: `cycle_yearly_${year}`,
      workspaceId: workspace.id,
      cycleType: 'YEARLY',
      status: 'ACTIVE',
      name: `${year} Yearly Plan`,
      startDate: new Date(year, 0, 1),
      endDate: new Date(year, 11, 31),
    },
  });

  // Quarterly
  const qStart = Math.floor(now.getMonth() / 3);
  const quarterlyCycle = await prisma.pdcaCycle.upsert({
    where: { id: `cycle_quarterly_${year}_q${qStart + 1}` },
    update: {},
    create: {
      id: `cycle_quarterly_${year}_q${qStart + 1}`,
      workspaceId: workspace.id,
      parentCycleId: yearlyCycle.id,
      cycleType: 'QUARTERLY',
      status: 'ACTIVE',
      name: `${year} Q${qStart + 1} Quarterly Plan`,
      startDate: new Date(year, qStart * 3, 1),
      endDate: new Date(year, qStart * 3 + 3, 0),
    },
  });

  // Monthly
  const monthlyCycle = await prisma.pdcaCycle.upsert({
    where: { id: `cycle_monthly_${year}_${String(now.getMonth() + 1).padStart(2, '0')}` },
    update: {},
    create: {
      id: `cycle_monthly_${year}_${String(now.getMonth() + 1).padStart(2, '0')}`,
      workspaceId: workspace.id,
      parentCycleId: quarterlyCycle.id,
      cycleType: 'MONTHLY',
      status: 'ACTIVE',
      name: `${year}-${String(now.getMonth() + 1).padStart(2, '0')} Monthly Plan`,
      startDate: new Date(year, now.getMonth(), 1),
      endDate: new Date(year, now.getMonth() + 1, 0),
    },
  });

  console.log(`✅ Cycles: Yearly → Quarterly → Monthly`);

  // --- 6. Create PDCAr Plan Stage Demo Data ---
  console.log('\n📋 Creating PDCAr Plan Stage demonstration data...\n');

  // === GOAL: AI 技术突破 (AGI domain) ===
  const goal = await prisma.workItem.create({
    data: {
      workspaceId: workspace.id,
      domainId: domains['agi'].id,
      cycleId: quarterlyCycle.id,
      itemType: 'GOAL',
      pdcaStage: 'PLAN',
      title: 'AI 技术突破',
      description: '在 AGI 领域实现技术突破，开发具有实用价值的 AI 应用',
      status: 'ACTIVE',
      priority: 'P0',
      ownerId: user.id,
      createdBy: 'system',
      sourceType: 'MANUAL',
      plannedStartAt: new Date(year, qStart * 3, 1),
      plannedEndAt: new Date(year, qStart * 3 + 3, 0),
      metadata: {
        vision: '成为行业领先的 AI 应用开发者',
        keyResults: ['发布 2 个 AI 产品', '获得 1000+ 用户', '技术博客 10 万字'],
      },
      goalDetail: {
        create: {
          targetValue: 1000,
          currentValue: 0,
          unit: 'users',
          progress: 0,
          weight: 1.0,
          targetDate: new Date(year, qStart * 3 + 3, 0),
        },
      },
    },
    include: { goalDetail: true },
  });
  console.log(`🎯 Goal: ${goal.title} (${goal.id.slice(0, 8)}...)`);

  // === PROJECT: 大模型应用开发 ===
  const project1 = await prisma.workItem.create({
    data: {
      workspaceId: workspace.id,
      domainId: domains['agi'].id,
      cycleId: monthlyCycle.id,
      itemType: 'PROJECT',
      pdcaStage: 'PLAN',
      title: '大模型应用开发',
      description: '基于开源大模型开发 3 个实用 AI 应用：智能客服、代码助手、内容创作',
      status: 'ACTIVE',
      priority: 'P1',
      ownerId: user.id,
      createdBy: 'system',
      sourceType: 'MANUAL',
      parentId: goal.id,
      plannedStartAt: new Date(year, now.getMonth(), 1),
      plannedEndAt: new Date(year, now.getMonth() + 1, 0),
      metadata: {
        apps: ['智能客服', '代码助手', '内容创作'],
        techStack: ['LangChain', 'Transformers', 'FastAPI'],
      },
      projectDetail: {
        create: {
          progress: 0,
          healthStatus: 'ON_TRACK',
          budget: 50000,
          actualCost: 0,
        },
      },
    },
    include: { projectDetail: true },
  });
  console.log(`📦 Project: ${project1.title} (${project1.id.slice(0, 8)}...)`);

  // === PROJECT: AI 技术学习 ===
  const project2 = await prisma.workItem.create({
    data: {
      workspaceId: workspace.id,
      domainId: domains['learning'].id,
      cycleId: monthlyCycle.id,
      itemType: 'PROJECT',
      pdcaStage: 'PLAN',
      title: 'AI 技术学习',
      description: '系统学习大模型相关技术，包括：Transformer 架构、Prompt Engineering、RAG 等',
      status: 'ACTIVE',
      priority: 'P2',
      ownerId: user.id,
      createdBy: 'system',
      sourceType: 'MANUAL',
      parentId: goal.id,
      plannedStartAt: new Date(year, now.getMonth(), 1),
      plannedEndAt: new Date(year, now.getMonth() + 1, 0),
      metadata: {
        topics: ['Transformer', 'Prompt Engineering', 'RAG', 'Fine-tuning', 'Agent'],
        hoursPerWeek: 10,
      },
      projectDetail: {
        create: {
          progress: 20,
          healthStatus: 'ON_TRACK',
          budget: 5000,
          actualCost: 1000,
        },
      },
    },
    include: { projectDetail: true },
  });
  console.log(`📦 Project: ${project2.title} (${project2.id.slice(0, 8)}...)`);

  // === TASKS for Project 1 ===
  const project1Tasks = [
    {
      title: '调研开源大模型',
      description: '对比 Llama、Mistral、Qwen 等主流开源模型，选择适合的基础模型',
      priority: 'P1' as const,
      dueAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      estimatedMinutes: 120,
    },
    {
      title: '搭建开发环境',
      description: '配置 GPU 服务器、安装依赖、搭建开发框架',
      priority: 'P0' as const,
      dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      estimatedMinutes: 240,
    },
    {
      title: '开发智能客服原型',
      description: '实现基于 RAG 的智能客服系统，支持多轮对话',
      priority: 'P1' as const,
      dueAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      estimatedMinutes: 480,
    },
    {
      title: '开发代码助手',
      description: '实现代码补全、代码审查、Bug 检测等功能',
      priority: 'P2' as const,
      dueAt: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      estimatedMinutes: 480,
    },
    {
      title: '开发内容创作助手',
      description: '实现文章生成、摘要、翻译等功能',
      priority: 'P2' as const,
      dueAt: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
      estimatedMinutes: 360,
    },
  ];

  const taskIds: string[] = [];
  for (let i = 0; i < project1Tasks.length; i++) {
    const task = project1Tasks[i];
    const created = await prisma.workItem.create({
      data: {
        workspaceId: workspace.id,
        domainId: domains['work'].id,
        cycleId: monthlyCycle.id,
        itemType: 'TASK',
        pdcaStage: 'DO',
        title: task.title,
        description: task.description,
        status: i === 0 ? 'IN_PROGRESS' : 'TODO',
        priority: task.priority,
        ownerId: user.id,
        createdBy: 'system',
        sourceType: 'MANUAL',
        parentId: project1.id,
        plannedStartAt: new Date(Date.now() + i * 2 * 24 * 60 * 60 * 1000),
        plannedEndAt: task.dueAt,
        taskDetail: {
          create: {
            dueAt: task.dueAt,
            scheduledStartAt: new Date(Date.now() + i * 2 * 24 * 60 * 60 * 1000),
            scheduledEndAt: task.dueAt,
            estimatedMinutes: task.estimatedMinutes,
            actualMinutes: i === 0 ? 30 : null,
            completionNote: null,
          },
        },
      },
      include: { taskDetail: true },
    });
    taskIds.push(created.id);
    console.log(`✅ Task: ${task.title} (${created.id.slice(0, 8)}...)`);
  }

  // === TASKS for Project 2 ===
  const learningTasks = [
    {
      title: '学习 Transformer 架构',
      description: '深入理解 Self-Attention、Multi-Head Attention、位置编码等核心概念',
      priority: 'P1' as const,
      dueAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      estimatedMinutes: 180,
    },
    {
      title: '学习 Prompt Engineering',
      description: '掌握零样本、少样本、CoT 等提示工程技术',
      priority: 'P2' as const,
      dueAt: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
      estimatedMinutes: 120,
    },
    {
      title: '学习 RAG 技术',
      description: '实现检索增强生成系统，包括向量数据库、相似度检索等',
      priority: 'P1' as const,
      dueAt: new Date(Date.now() + 19 * 24 * 60 * 60 * 1000),
      estimatedMinutes: 240,
    },
  ];

  for (const task of learningTasks) {
    const created = await prisma.workItem.create({
      data: {
        workspaceId: workspace.id,
        domainId: domains['learning'].id,
        cycleId: monthlyCycle.id,
        itemType: 'TASK',
        pdcaStage: 'DO',
        title: task.title,
        description: task.description,
        status: 'TODO',
        priority: task.priority,
        ownerId: user.id,
        createdBy: 'system',
        sourceType: 'MANUAL',
        parentId: project2.id,
        plannedStartAt: new Date(),
        plannedEndAt: task.dueAt,
        taskDetail: {
          create: {
            dueAt: task.dueAt,
            scheduledStartAt: new Date(),
            scheduledEndAt: task.dueAt,
            estimatedMinutes: task.estimatedMinutes,
            actualMinutes: null,
            completionNote: null,
          },
        },
      },
    });
    console.log(`✅ Task: ${task.title} (${created.id.slice(0, 8)}...)`);
  }

  // --- 7. Create explicit WorkItem Relations ---
  console.log('\n🔗 Creating explicit relations...');

  // Project contains Tasks (explicit CONTAINS relations)
  for (const taskId of taskIds) {
    await prisma.workItemRelation.upsert({
      where: {
        sourceItemId_targetItemId_relationType: {
          sourceItemId: project1.id,
          targetItemId: taskId,
          relationType: 'CONTAINS',
        },
      },
      update: {},
      create: {
        sourceItemId: project1.id,
        targetItemId: taskId,
        relationType: 'CONTAINS',
      },
    });
  }
  console.log(`✅ Created ${taskIds.length} CONTAINS relations (Project → Tasks)`);

  // Project 1 supports Project 2 (技术支持关系)
  await prisma.workItemRelation.upsert({
    where: {
      sourceItemId_targetItemId_relationType: {
        sourceItemId: project1.id,
        targetItemId: project2.id,
        relationType: 'SUPPORTS',
      },
    },
    update: {},
    create: {
      sourceItemId: project1.id,
      targetItemId: project2.id,
      relationType: 'SUPPORTS',
    },
  });
  console.log('✅ Created SUPPORTS relation (大模型应用 → AI技术学习)');

  // Task 2 depends on Task 1 (环境搭建依赖调研)
  if (taskIds.length >= 2) {
    await prisma.workItemRelation.upsert({
      where: {
        sourceItemId_targetItemId_relationType: {
          sourceItemId: taskIds[1],
          targetItemId: taskIds[0],
          relationType: 'DEPENDS_ON',
        },
      },
      update: {},
      create: {
        sourceItemId: taskIds[1],
        targetItemId: taskIds[0],
        relationType: 'DEPENDS_ON',
      },
    });
    console.log('✅ Created DEPENDS_ON relation (搭建环境 → 调研模型)');
  }

  // Task 3 blocks Task 4 (客服原型阻塞代码助手)
  if (taskIds.length >= 4) {
    await prisma.workItemRelation.upsert({
      where: {
        sourceItemId_targetItemId_relationType: {
          sourceItemId: taskIds[2],
          targetItemId: taskIds[3],
          relationType: 'BLOCKS',
        },
      },
      update: {},
      create: {
        sourceItemId: taskIds[2],
        targetItemId: taskIds[3],
        relationType: 'BLOCKS',
      },
    });
    console.log('✅ Created BLOCKS relation (客服原型 → 代码助手)');
  }

  // --- 8. Verify data ---
  const stats = {
    users: await prisma.user.count(),
    workspaces: await prisma.workspace.count(),
    domains: await prisma.domain.count(),
    cycles: await prisma.pdcaCycle.count(),
    workItems: await prisma.workItem.count(),
    relations: await prisma.workItemRelation.count(),
  };

  console.log('\n📊 Seed Data Summary:');
  console.log('────────────────────────────');
  console.log(`  Users:       ${stats.users}`);
  console.log(`  Workspaces:  ${stats.workspaces}`);
  console.log(`  Domains:     ${stats.domains}`);
  console.log(`  Cycles:      ${stats.cycles}`);
  console.log(`  WorkItems:   ${stats.workItems}`);
  console.log(`  Relations:   ${stats.relations}`);
  console.log('────────────────────────────');

  // WorkItem breakdown by type
  const goals = await prisma.workItem.count({ where: { itemType: 'GOAL' } });
  const projects = await prisma.workItem.count({ where: { itemType: 'PROJECT' } });
  const tasks = await prisma.workItem.count({ where: { itemType: 'TASK' } });
  console.log(`  └─ Goals: ${goals}, Projects: ${projects}, Tasks: ${tasks}`);

  console.log('\n✅ PDCAr demonstration data seeded successfully!');
  console.log('   Use GET /api/health to verify the API is running.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
