import { HeartPulse, ListChecks, Save, Tags, WalletCards } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  getLifeDashboard,
  saveLifeDashboardEntry,
  type LifeDashboardData,
  type LifeDashboardInput,
} from '../services/lifeDashboardService';

type LifeTab = 'home' | 'entry' | 'list';

const emptyDashboard: LifeDashboardData = {
  summary: {
    healthScore: 0,
    wealthScore: 0,
    netWorthFlow: 0,
    totalIncome: 0,
    totalExpense: 0,
    exerciseMinutes: 0,
    latest: null,
    entryCount: 0,
  },
  entries: [],
  chart: [],
  tags: [],
  updatedAt: new Date().toISOString(),
};

const tabs: Array<{ key: LifeTab; label: string }> = [
  { key: 'home', label: '首页' },
  { key: 'entry', label: '录入' },
  { key: 'list', label: '列表' },
];

const insulinRegions = ['LU', 'LD', 'RU', 'RD'];
const insulinSites = insulinRegions.flatMap((region) =>
  Array.from({ length: 7 }, (_, index) => `${region}${index + 1}`),
);
const exerciseTypes = ['跑步', '游泳', '骑行', '篮球', '其他'];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatValue(value: number | null | undefined, suffix = '') {
  if (value === null || value === undefined) return '--';
  return `${value}${suffix}`;
}

export function LifeDashboard() {
  const [tab, setTab] = useState<LifeTab>('home');
  const [dashboard, setDashboard] = useState<LifeDashboardData>(emptyDashboard);
  const [form, setForm] = useState<LifeDashboardInput>({ entryDate: today() });
  const [status, setStatus] = useState('同步中');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let active = true;
    getLifeDashboard()
      .then((data) => {
        if (!active) return;
        setDashboard(data);
        setForm((current) => ({
          ...current,
          ...Object.fromEntries(
            Object.entries(data.summary.latest || {}).filter(([, value]) => value !== null && value !== ''),
          ),
          entryDate: today(),
        }));
        setStatus(data.entries.length ? 'API 已更新' : '等待录入');
      })
      .catch(() => {
        if (active) setStatus('待同步');
      });
    return () => {
      active = false;
    };
  }, []);

  const updateForm = (key: keyof LifeDashboardInput, value: string) => {
    setForm((current) => ({
      ...current,
      [key]: ['diet', 'entryDate', 'insulinSite', 'exerciseType'].includes(key)
        ? value
        : value === ''
          ? null
          : Number(value),
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setStatus('保存中');
    const data = await saveLifeDashboardEntry(form);
    setDashboard(data);
    setStatus('API 已更新');
    setTab('home');
    setIsSaving(false);
  };

  const latest = dashboard.summary.latest;

  return (
    <div
      className="lifeDashboard"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <div className="lifeTopline">
        <span>生活仪表盘</span>
        <strong>{status}</strong>
      </div>

      <div className="lifeTabs" role="tablist" aria-label="生活仪表盘视图">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`lifeTab ${tab === item.key ? 'isActive' : ''}`}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'home' && (
        <div className="lifeView">
          <div className="lifeMetricGrid">
            <div className="lifeMetric">
              <HeartPulse size={15} />
              <span>健康</span>
              <strong>{dashboard.summary.healthScore}</strong>
            </div>
            <div className="lifeMetric">
              <WalletCards size={15} />
              <span>财富</span>
              <strong>{dashboard.summary.wealthScore}</strong>
            </div>
          </div>
          <div className="lifeFacts">
            <span>体重 {formatValue(latest?.weight, 'kg')}</span>
            <span>血糖 {formatValue(latest?.bloodGlucose, 'mmol/L')}</span>
            <span>胰岛素 {latest?.insulinSite || '--'} {formatValue(latest?.insulinDose ?? latest?.insulin, 'U')}</span>
            <span>运动 {latest?.exerciseType || '--'} {formatValue(latest?.exerciseMinutes, 'min')}</span>
            <span>睡眠 {formatValue(latest?.sleepHours, 'h')}</span>
            <span>净流 {dashboard.summary.netWorthFlow}</span>
          </div>
          <div className="lifeTags">
            <Tags size={14} />
            {(dashboard.tags.length ? dashboard.tags : ['待生成标签']).map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        </div>
      )}

      {tab === 'entry' && (
        <div className="lifeForm">
          <label>
            <span>日期</span>
            <input type="date" value={form.entryDate || today()} onChange={(event) => updateForm('entryDate', event.target.value)} />
          </label>
          <label>
            <span>体重</span>
            <input type="number" inputMode="decimal" value={form.weight ?? ''} onChange={(event) => updateForm('weight', event.target.value)} />
          </label>
          <label>
            <span>血糖</span>
            <input type="number" inputMode="decimal" value={form.bloodGlucose ?? ''} onChange={(event) => updateForm('bloodGlucose', event.target.value)} />
          </label>
          <label>
            <span>方位</span>
            <select value={form.insulinSite || ''} onChange={(event) => updateForm('insulinSite', event.target.value)}>
              <option value="">选择位点</option>
              {insulinSites.map((site) => (
                <option key={site} value={site}>
                  {site}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>剂量</span>
            <input type="number" inputMode="decimal" value={form.insulinDose ?? ''} onChange={(event) => updateForm('insulinDose', event.target.value)} />
          </label>
          <label>
            <span>运动类型</span>
            <select value={form.exerciseType || ''} onChange={(event) => updateForm('exerciseType', event.target.value)}>
              <option value="">选择类型</option>
              {exerciseTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>运动时间</span>
            <input type="number" inputMode="numeric" value={form.exerciseMinutes ?? ''} onChange={(event) => updateForm('exerciseMinutes', event.target.value)} />
          </label>
          <label>
            <span>睡眠</span>
            <input type="number" inputMode="decimal" value={form.sleepHours ?? ''} onChange={(event) => updateForm('sleepHours', event.target.value)} />
          </label>
          <label>
            <span>收入</span>
            <input type="number" inputMode="decimal" value={form.income ?? ''} onChange={(event) => updateForm('income', event.target.value)} />
          </label>
          <label>
            <span>支出</span>
            <input type="number" inputMode="decimal" value={form.expense ?? ''} onChange={(event) => updateForm('expense', event.target.value)} />
          </label>
          <label className="lifeWideField">
            <span>饮食</span>
            <input value={form.diet || ''} onChange={(event) => updateForm('diet', event.target.value)} placeholder="清淡 / 控糖 / 高蛋白" />
          </label>
          <button type="button" className="lifeSaveButton" onClick={handleSave} disabled={isSaving}>
            <Save size={14} />
            {isSaving ? '保存中' : '保存'}
          </button>
        </div>
      )}

      {tab === 'list' && (
        <div className="lifeList">
          {dashboard.entries.length === 0 ? (
            <p>暂无生活记录</p>
          ) : (
            dashboard.entries.slice(0, 6).map((entry) => (
              <div key={entry.id} className="lifeListRow">
                <ListChecks size={14} />
                <div>
                  <strong>{entry.entryDate}</strong>
                  <span>
                    {entry.insulinSite || '未定位'} {formatValue(entry.insulinDose ?? entry.insulin, 'U')} · {entry.exerciseType || '运动'}{' '}
                    {formatValue(entry.exerciseMinutes, 'min')} · 收支{' '}
                    {Number(entry.income || 0) - Number(entry.expense || 0)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
