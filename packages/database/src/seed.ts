// Seed script for initial data
// Run with: pnpm --filter @nova-os/database db:seed

import { PrismaClient, CycleType, CycleStatus, WorkspaceType, WorkspaceRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

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
  console.log('User created:', user.email);

  // --- 2. Create default workspace ---
  const workspace = await prisma.workspace.upsert({
    where: { id: 'ws_default' },
    update: {
      name: 'My Workspace',
      type: WorkspaceType.PERSONAL,
    },
    create: {
      id: 'ws_default',
      name: 'My Workspace',
      type: WorkspaceType.PERSONAL,
    },
  });
  console.log('Workspace created:', workspace.name);

  // --- 3. Link user to workspace as OWNER ---
  await prisma.workspaceMember.upsert({
    where: {
      userId_workspaceId: {
        userId: user.id,
        workspaceId: workspace.id,
      },
    },
    update: {
      role: WorkspaceRole.OWNER,
    },
    create: {
      userId: user.id,
      workspaceId: workspace.id,
      role: WorkspaceRole.OWNER,
    },
  });
  console.log('Workspace member linked (OWNER)');

  // --- 4. Create default domains ---
  const domainNames = [
    'health',
    'wealth',
    'work',
    'content',
    'learning',
    'agi',
    'media',
  ];

  for (const name of domainNames) {
    await prisma.domain.upsert({
      where: { workspaceId_name: { workspaceId: workspace.id, name } },
      update: {},
      create: {
        workspaceId: workspace.id,
        name,
      },
    });
  }
  console.log(`Created ${domainNames.length} domains`);

  // --- 5. Create PdcaCycles for current year ---
  const now = new Date();
  const year = now.getFullYear();

  // Helper to create date range
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31);

  const qStart = Math.floor(now.getMonth() / 3);
  const startOfQuarter = new Date(year, qStart * 3, 1);
  const endOfQuarter = new Date(year, qStart * 3 + 3, 0);

  const startOfMonth = new Date(year, now.getMonth(), 1);
  const endOfMonth = new Date(year, now.getMonth() + 1, 0);

  const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - dayOfWeek + 1);
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  // 5a. Yearly cycle
  const yearlyCycle = await prisma.pdcaCycle.upsert({
    where: { id: `cycle_yearly_${year}` },
    update: {},
    create: {
      id: `cycle_yearly_${year}`,
      workspaceId: workspace.id,
      cycleType: CycleType.YEARLY,
      status: CycleStatus.ACTIVE,
      name: `${year} Yearly Plan`,
      startDate: startOfYear,
      endDate: endOfYear,
    },
  });
  console.log('Yearly cycle created:', yearlyCycle.name);

  // 5b. Quarterly cycle
  const quarterlyCycle = await prisma.pdcaCycle.upsert({
    where: { id: `cycle_quarterly_${year}_q${qStart + 1}` },
    update: {},
    create: {
      id: `cycle_quarterly_${year}_q${qStart + 1}`,
      workspaceId: workspace.id,
      parentCycleId: yearlyCycle.id,
      cycleType: CycleType.QUARTERLY,
      status: CycleStatus.ACTIVE,
      name: `${year} Q${qStart + 1} Quarterly Plan`,
      startDate: startOfQuarter,
      endDate: endOfQuarter,
    },
  });
  console.log('Quarterly cycle created:', quarterlyCycle.name);

  // 5c. Monthly cycle
  const monthlyCycle = await prisma.pdcaCycle.upsert({
    where: { id: `cycle_monthly_${year}_${String(now.getMonth() + 1).padStart(2, '0')}` },
    update: {},
    create: {
      id: `cycle_monthly_${year}_${String(now.getMonth() + 1).padStart(2, '0')}`,
      workspaceId: workspace.id,
      parentCycleId: quarterlyCycle.id,
      cycleType: CycleType.MONTHLY,
      status: CycleStatus.ACTIVE,
      name: `${year}-${String(now.getMonth() + 1).padStart(2, '0')} Monthly Plan`,
      startDate: startOfMonth,
      endDate: endOfMonth,
    },
  });
  console.log('Monthly cycle created:', monthlyCycle.name);

  // 5d. Weekly cycle
  const weekNum = Math.ceil((now.getDate() + new Date(year, now.getMonth(), 1).getDay()) / 7);
  const weeklyCycle = await prisma.pdcaCycle.upsert({
    where: { id: `cycle_weekly_${year}_w${weekNum}` },
    update: {},
    create: {
      id: `cycle_weekly_${year}_w${weekNum}`,
      workspaceId: workspace.id,
      parentCycleId: monthlyCycle.id,
      cycleType: CycleType.WEEKLY,
      status: CycleStatus.ACTIVE,
      name: `${year} W${weekNum} Weekly Plan`,
      startDate: startOfWeek,
      endDate: endOfWeek,
    },
  });
  console.log('Weekly cycle created:', weeklyCycle.name);

  // 5e. Daily cycle
  const dayStr = `${year}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const dailyCycle = await prisma.pdcaCycle.upsert({
    where: { id: `cycle_daily_${dayStr}` },
    update: {},
    create: {
      id: `cycle_daily_${dayStr}`,
      workspaceId: workspace.id,
      parentCycleId: weeklyCycle.id,
      cycleType: CycleType.DAILY,
      status: CycleStatus.ACTIVE,
      name: `${dayStr} Daily Plan`,
      startDate: startOfDay,
      endDate: endOfDay,
    },
  });
  console.log('Daily cycle created:', dailyCycle.name);

  console.log('\n✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
