import { BarChart3, HeartPulse, ListChecks, Save, Tags, WalletCards } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  getLifeDashboard,
  saveLifeDashboardEntry,
  type LifeDashboardData,
  type LifeDashboardInput,
} from '../services/lifeDashboardService';

type LifeTab = 'home' | 'entry' | 'list' | 'chart';

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
  { key: 'chart', label: '图表' },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatValue(value: number | null | undefined, suffix = '') {
  if (value === null || value === undefined) return '--';
  return `${value}${suffix}`;
}

function chartHeight(value: number | null | undefined, max: number) {
  if (value === null || value === undefined || max <= 0) return 4;
  return Math.max(6, Math.min(100, (Math.abs(value) / max) * 100));
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

  const maxChartValue = useMemo(() => {
    const values = dashboard.chart.flatMap((point) => [
      point.bloodGlucose || 0,
      point.sleepHours || 0,
      Math.abs(point.balance || 0),
    ]);
    return Math.max(1, ...values);
  }, [dashboard.chart]);

  const updateForm = (key: keyof LifeDashboardInput, value: string) => {
    setForm((current) => ({
      ...current,
      [key]: key === 'diet' || key === 'entryDate' ? value : value === '' ? null : Number(value),
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
            <span>胰岛素 {formatValue(latest?.insulin, 'U')}</span>
            <span>运动 {formatValue(latest?.exerciseMinutes, 'min')}</span>
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
            <span>胰岛素</span>
            <input type="number" inputMode="decimal" value={form.insulin ?? ''} onChange={(event) => updateForm('insulin', event.target.value)} />
          </label>
          <label>
            <span>运动</span>
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
                    血糖 {formatValue(entry.bloodGlucose)} · 睡眠 {formatValue(entry.sleepHours, 'h')} · 收支{' '}
                    {Number(entry.income || 0) - Number(entry.expense || 0)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'chart' && (
        <div className="lifeChart">
          {dashboard.chart.length === 0 ? (
            <p>录入后生成趋势图</p>
          ) : (
            dashboard.chart.map((point) => (
              <div key={point.date} className="lifeChartColumn">
                <div className="lifeBars">
                  <span style={{ height: `${chartHeight(point.bloodGlucose, maxChartValue)}%` }} title="血糖" />
                  <span style={{ height: `${chartHeight(point.sleepHours, maxChartValue)}%` }} title="睡眠" />
                  <span style={{ height: `${chartHeight(point.balance, maxChartValue)}%` }} title="收支" />
                </div>
                <small>{point.date.slice(5)}</small>
              </div>
            ))
          )}
          <div className="lifeLegend">
            <span>血糖</span>
            <span>睡眠</span>
            <span>收支</span>
          </div>
          <BarChart3 size={14} className="lifeChartIcon" />
        </div>
      )}
    </div>
  );
}
