import { apiClient } from './apiClient';

const STORAGE_KEY = 'nova:life-dashboard:v1';
const DEFAULT_WORKSPACE_ID = 'ws_default';

export interface LifeDashboardEntry {
  id: string;
  workspaceId: string;
  entryDate: string;
  weight: number | null;
  bloodGlucose: number | null;
  insulinSite: string;
  insulinDose: number | null;
  insulin: number | null;
  exerciseType: string;
  exerciseMinutes: number | null;
  diet: string;
  sleepHours: number | null;
  income: number | null;
  expense: number | null;
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface LifeDashboardData {
  summary: {
    healthScore: number;
    wealthScore: number;
    netWorthFlow: number;
    totalIncome: number;
    totalExpense: number;
    exerciseMinutes: number;
    latest: LifeDashboardEntry | null;
    entryCount: number;
  };
  entries: LifeDashboardEntry[];
  chart: Array<{
    date: string;
    weight: number | null;
    bloodGlucose: number | null;
    sleepHours: number | null;
    balance: number;
  }>;
  tags: string[];
  updatedAt: string;
}

export type LifeDashboardInput = Partial<
  Pick<
    LifeDashboardEntry,
    | 'entryDate'
    | 'weight'
    | 'bloodGlucose'
    | 'insulinSite'
    | 'insulinDose'
    | 'exerciseType'
    | 'exerciseMinutes'
    | 'diet'
    | 'sleepHours'
    | 'income'
    | 'expense'
  >
>;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function numberOrNull(value: unknown): number | null {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function generateTags(entry: LifeDashboardEntry) {
  const tags: string[] = [];
  if (entry.bloodGlucose !== null) {
    tags.push(entry.bloodGlucose > 7.8 ? '血糖关注' : '血糖稳定');
  }
  if (entry.exerciseMinutes !== null) {
    tags.push(entry.exerciseMinutes >= 30 ? '运动达标' : '补充运动');
  }
  if (entry.exerciseType) {
    tags.push(entry.exerciseType === '其他' ? '运动记录' : entry.exerciseType);
  }
  if (entry.insulinSite && entry.insulinDose !== null) {
    tags.push(`${entry.insulinSite} 注射`);
  }
  if (entry.sleepHours !== null) {
    if (entry.sleepHours >= 7) tags.push('睡眠充足');
    if (entry.sleepHours < 6) tags.push('睡眠不足');
  }
  if (entry.income !== null || entry.expense !== null) {
    tags.push(Number(entry.income || 0) - Number(entry.expense || 0) >= 0 ? '收支为正' : '支出预警');
  }
  if (/清淡|蔬菜|低糖|高蛋白|控糖/.test(entry.diet || '')) tags.push('饮食稳');
  return [...new Set(tags)].slice(0, 6);
}

function buildDashboard(entries: LifeDashboardEntry[]): LifeDashboardData {
  const ordered = entries
    .slice()
    .sort((a, b) => b.entryDate.localeCompare(a.entryDate))
    .slice(0, 30);
  const latest = ordered[0] || null;
  const totals = ordered.reduce(
    (sum, entry) => ({
      income: sum.income + Number(entry.income || 0),
      expense: sum.expense + Number(entry.expense || 0),
      exercise: sum.exercise + Number(entry.exerciseMinutes || 0),
    }),
    { income: 0, expense: 0, exercise: 0 },
  );
  const healthScore = latest
    ? Math.round(
        [
          latest.bloodGlucose === null ? 70 : latest.bloodGlucose <= 7.8 ? 92 : 58,
          latest.exerciseMinutes === null ? 70 : latest.exerciseMinutes >= 30 ? 90 : 62,
          latest.sleepHours === null ? 70 : latest.sleepHours >= 7 ? 90 : latest.sleepHours >= 6 ? 76 : 55,
        ].reduce((sum, value) => sum + value, 0) / 3,
      )
    : 0;
  const wealthScore = latest
    ? Math.max(0, Math.min(100, 70 + (Number(latest.income || 0) - Number(latest.expense || 0) >= 0 ? 18 : -22)))
    : 0;

  return {
    summary: {
      healthScore,
      wealthScore,
      netWorthFlow: Math.round((totals.income - totals.expense) * 100) / 100,
      totalIncome: Math.round(totals.income * 100) / 100,
      totalExpense: Math.round(totals.expense * 100) / 100,
      exerciseMinutes: totals.exercise,
      latest,
      entryCount: ordered.length,
    },
    entries: ordered,
    chart: ordered
      .slice(0, 7)
      .reverse()
      .map((entry) => ({
        date: entry.entryDate,
        weight: entry.weight,
        bloodGlucose: entry.bloodGlucose,
        sleepHours: entry.sleepHours,
        balance: Number(entry.income || 0) - Number(entry.expense || 0),
      })),
    tags: [...new Set(ordered.slice(0, 7).flatMap((entry) => entry.tags || []))].slice(0, 8),
    updatedAt: new Date().toISOString(),
  };
}

function readLocalDashboard() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const entries = raw ? (JSON.parse(raw) as LifeDashboardEntry[]) : [];
    return buildDashboard(Array.isArray(entries) ? entries : []);
  } catch {
    return buildDashboard([]);
  }
}

function writeLocalEntry(input: LifeDashboardInput) {
  const current = readLocalDashboard().entries;
  const entry: LifeDashboardEntry = {
    id: `local_${Date.now()}`,
    workspaceId: DEFAULT_WORKSPACE_ID,
    entryDate: input.entryDate || today(),
    weight: numberOrNull(input.weight),
    bloodGlucose: numberOrNull(input.bloodGlucose),
    insulinSite: String(input.insulinSite || '').trim(),
    insulinDose: numberOrNull(input.insulinDose),
    insulin: numberOrNull(input.insulinDose),
    exerciseType: String(input.exerciseType || '').trim(),
    exerciseMinutes: numberOrNull(input.exerciseMinutes),
    diet: String(input.diet || '').trim(),
    sleepHours: numberOrNull(input.sleepHours),
    income: numberOrNull(input.income),
    expense: numberOrNull(input.expense),
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  entry.tags = generateTags(entry);
  const next = [entry, ...current.filter((item) => item.entryDate !== entry.entryDate)].slice(0, 30);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return buildDashboard(next);
}

export async function getLifeDashboard(): Promise<LifeDashboardData> {
  try {
    return await apiClient.get<LifeDashboardData>('/life-dashboard');
  } catch (error) {
    console.warn('[life-dashboard] API unavailable:', error);
    return readLocalDashboard();
  }
}

export async function saveLifeDashboardEntry(input: LifeDashboardInput): Promise<LifeDashboardData> {
  try {
    const data = await apiClient.post<LifeDashboardData>('/life-dashboard/entries', input);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data.entries));
    } catch {
      // Local backup is best effort.
    }
    return data;
  } catch (error) {
    console.warn('[life-dashboard] Save fell back to local backup:', error);
    return writeLocalEntry(input);
  }
}
