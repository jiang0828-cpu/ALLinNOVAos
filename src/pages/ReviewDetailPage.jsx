// src/pages/ReviewDetailPage.jsx
// 复盘详情页面 —— /reviews/[id]

import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  Save,
  CheckCircle2,
  TrendingUp,
  Target,
  Activity,
  AlertTriangle,
  Lightbulb,
  Award,
  BookOpen,
  Focus,
  ClipboardList,
} from 'lucide-react';
import { getReviewById, updateReview, completeReview } from '../services/reviewService';
import { createLocalBackup } from '../services/localBackupStore';
import {
  REVIEW_STATUS_LABELS,
  REVIEW_STATUS_CLASS,
  REVIEW_TYPE_LABELS,
} from '../types/reviews';

// 通知 Dashboard 刷新
function notifyDashboardRefresh() {
  window.dispatchEvent(new CustomEvent('nova:refresh-dashboard'));
  window.dispatchEvent(new CustomEvent('nova:refresh-reviews'));
}

// 将 ReviewContentItem[] 转换为可编辑的纯文本（每行一条 description）
function contentItemsToText(items) {
  if (!items || !Array.isArray(items)) return '';
  return items
    .map((item) => {
      if (typeof item === 'string') return item;
      return item.description || '';
    })
    .filter(Boolean)
    .join('\n');
}

// 将纯文本转换回 ReviewContentItem[]
function textToContentItems(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({ description: line }));
}

// 将 nextCycleFocus 转为文本
function focusItemsToText(items) {
  if (!items || !Array.isArray(items)) return '';
  return items
    .map((item) => {
      if (typeof item === 'string') return item;
      return item.description || '';
    })
    .filter(Boolean)
    .join('\n');
}

// 将文本转回 nextCycleFocus (string[])
function textToFocusItems(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function formatNumber(value, suffix = '') {
  if (value === null || value === undefined) return '--';
  const num = Number(value);
  if (Number.isNaN(num)) return '--';
  return `${num.toFixed(num < 10 ? 1 : 0)}${suffix}`;
}

function formatRate(value) {
  return formatNumber(value, '%');
}

export function ReviewDetailPage({ reviewId, onBack }) {
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [toast, setToast] = useState(null);

  // 可编辑字段
  const [rootCausesText, setRootCausesText] = useState('');
  const [lessonsText, setLessonsText] = useState('');
  const [nextFocusText, setNextFocusText] = useState('');
  const [titleText, setTitleText] = useState('');
  const [reviewTypeValue, setReviewTypeValue] = useState('WEEKLY');
  const [periodText, setPeriodText] = useState('');
  const [summaryText, setSummaryText] = useState('');
  const [scoreBeforeText, setScoreBeforeText] = useState('');
  const [scoreAfterText, setScoreAfterText] = useState('');
  const [scoreText, setScoreText] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  const loadReview = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsRefreshing(true);

    try {
      const data = await getReviewById(reviewId);
      setReview(data);
      const detail = data.reviewDetail;
      setTitleText(data.title || '');
      setReviewTypeValue(detail?.reviewType || 'WEEKLY');
      setPeriodText(detail?.period || '');
      setSummaryText(detail?.summary || '');
      setScoreBeforeText(detail?.scoreBefore ?? '');
      setScoreAfterText(detail?.scoreAfter ?? '');
      setScoreText(detail?.score ?? '');
      setRootCausesText(contentItemsToText(detail?.rootCauses));
      setLessonsText(contentItemsToText(detail?.lessonsLearned));
      setNextFocusText(focusItemsToText(detail?.nextCycleFocus));
      setHasChanges(false);
    } catch (err) {
      setError(err);
      console.error('[ReviewDetailPage] Failed to load review:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [reviewId]);

  useEffect(() => {
    loadReview();
  }, [loadReview]);

  const showToast = (type, message) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 2800);
  };

  const toOptionalNumber = (value) => {
    if (value === '' || value === null || value === undefined) return undefined;
    const numberValue = Number(value);
    return Number.isNaN(numberValue) ? undefined : numberValue;
  };

  // 保存草稿
  const handleSave = async () => {
    if (!review) return;
    setSaving(true);
    try {
      const updated = await updateReview(review.id, {
        title: titleText.trim() || review.title,
        reviewType: reviewTypeValue,
        cycleType: reviewTypeValue,
        period: periodText.trim(),
        summary: summaryText.trim(),
        scoreBefore: toOptionalNumber(scoreBeforeText),
        scoreAfter: toOptionalNumber(scoreAfterText),
        score: toOptionalNumber(scoreText),
        rootCauses: textToContentItems(rootCausesText),
        lessonsLearned: textToContentItems(lessonsText),
        nextCycleFocus: textToFocusItems(nextFocusText),
      });
      setReview(updated);
      const detail = updated.reviewDetail;
      setTitleText(updated.title || '');
      setReviewTypeValue(detail?.reviewType || 'WEEKLY');
      setPeriodText(detail?.period || '');
      setSummaryText(detail?.summary || '');
      setScoreBeforeText(detail?.scoreBefore ?? '');
      setScoreAfterText(detail?.scoreAfter ?? '');
      setScoreText(detail?.score ?? '');
      setRootCausesText(contentItemsToText(detail?.rootCauses));
      setLessonsText(contentItemsToText(detail?.lessonsLearned));
      setNextFocusText(focusItemsToText(detail?.nextCycleFocus));
      setHasChanges(false);
      createLocalBackup();
      showToast('success', isDraft ? '复盘草稿已保存' : '复盘修改已保存');
      notifyDashboardRefresh();
    } catch (err) {
      console.error('[ReviewDetailPage] save failed:', err);
      showToast('error', `保存失败：${err.message || '未知错误'}`);
    } finally {
      setSaving(false);
    }
  };

  // 确认复盘
  const handleComplete = async () => {
    if (!review) return;
    setCompleting(true);
    try {
      // 先保存当前编辑内容
      await updateReview(review.id, {
        title: titleText.trim() || review.title,
        reviewType: reviewTypeValue,
        cycleType: reviewTypeValue,
        period: periodText.trim(),
        summary: summaryText.trim(),
        scoreBefore: toOptionalNumber(scoreBeforeText),
        scoreAfter: toOptionalNumber(scoreAfterText),
        score: toOptionalNumber(scoreText),
        rootCauses: textToContentItems(rootCausesText),
        lessonsLearned: textToContentItems(lessonsText),
        nextCycleFocus: textToFocusItems(nextFocusText),
      });
      // 再标记为完成
      const completed = await completeReview(review.id, 'user');
      setReview(completed);
      setHasChanges(false);
      createLocalBackup();
      showToast('success', '复盘已确认完成');
      notifyDashboardRefresh();
    } catch (err) {
      console.error('[ReviewDetailPage] complete failed:', err);
      const msg = err.message || '未知错误';
      if (msg.includes('Cannot update') || msg.includes('completed')) {
        showToast('error', '该复盘已完成，无法重复确认');
      } else {
        showToast('error', `确认失败：${msg}`);
      }
    } finally {
      setCompleting(false);
    }
  };

  const handleFieldChange = (setter) => (e) => {
    setter(e.target.value);
    setHasChanges(true);
  };

  if (loading) {
    return (
      <div className="reviewDetailPage">
        <div className="detailPageHeader">
          <button className="backButton" onClick={onBack}>
            <ArrowLeft size={18} />
            返回
          </button>
        </div>
        <div className="detailSkeleton">
          <div className="skeleton skeleton-line" style={{ width: '40%', height: '28px' }} />
          <div className="skeleton skeleton-line" style={{ width: '60%', height: '16px', marginTop: '16px' }} />
          <div className="skeleton skeleton-line" style={{ width: '100%', height: '80px', marginTop: '24px' }} />
          <div className="skeleton skeleton-line" style={{ width: '100%', height: '80px', marginTop: '16px' }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="reviewDetailPage">
        <div className="detailPageHeader">
          <button className="backButton" onClick={onBack}>
            <ArrowLeft size={18} />
            返回
          </button>
        </div>
        <div className="errorState">
          <AlertCircle size={48} />
          <h3>复盘加载失败</h3>
          <p className="errorMessage">{error.message || '无法获取复盘数据'}</p>
          <div className="errorActions">
            <button className="primaryButton" onClick={loadReview}>
              <RefreshCw size={16} />
              重试
            </button>
            <button className="secondaryButton" onClick={onBack}>
              返回列表
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!review) return null;

  const detail = review.reviewDetail || {};
  const status = detail.status || 'DRAFT';
  const statusClass = REVIEW_STATUS_CLASS[status] || 'draft';
  const isDraft = status === 'DRAFT';
  const isCompleted = status === 'COMPLETED' || status === 'PUBLISHED';
  const canEditReview = isDraft || isCompleted;

  const agg = detail.aggregatedData || {};
  const taskCompletion = agg.taskCompletion;
  const projectProgress = agg.projectProgress || [];
  const metricChanges = agg.metricChanges || [];
  const unresolvedIssues = agg.unresolvedIssues || [];
  const acceptedSuggestions = agg.acceptedSuggestions || [];
  const achievements = detail.achievements || [];
  const challenges = detail.challenges || [];

  return (
    <div className="reviewDetailPage">
      {/* 页头 */}
      <div className="detailPageHeader">
        <button className="backButton" onClick={onBack}>
          <ArrowLeft size={18} />
          返回
        </button>
        <div className="detailHeaderTitle">
          <h1>{review.title}</h1>
          <span className={`reviewStatusTag status-${statusClass}`}>
            {REVIEW_STATUS_LABELS[status] || '草稿'}
          </span>
        </div>
        <button
          className="refreshBtn"
          onClick={loadReview}
          disabled={isRefreshing}
        >
          <RefreshCw size={16} className={isRefreshing ? 'spinning' : ''} />
        </button>
      </div>

      {/* 元信息 */}
      <div className="reviewMetaBar">
        <span className="reviewMetaTag">
          {REVIEW_TYPE_LABELS[detail.reviewType] || '复盘'}
        </span>
        <span className="reviewMetaTag">
          周期 · {detail.period || '--'}
        </span>
        {detail.completionRate !== null && detail.completionRate !== undefined && (
          <span className="reviewMetaTag">
            完成率 {formatRate(detail.completionRate)}
          </span>
        )}
      </div>

      {/* 完成情况 */}
      <section className="reviewSection">
        <div className="sectionTitle">
          <Activity size={16} />
          <h2>完成情况</h2>
        </div>
        <div className="sectionBody">
          <div className="reviewStatsRow">
            <div className="reviewStatCard">
              <span className="statLabel">任务完成率</span>
              <span className={`statValue ${taskCompletion && taskCompletion.completionRate < 50 ? 'low' : ''}`}>
                {taskCompletion ? formatRate(taskCompletion.completionRate) : '--'}
              </span>
              {taskCompletion && (
                <span className="statSub">
                  {taskCompletion.doneTasks} / {taskCompletion.totalTasks} 个任务
                </span>
              )}
            </div>
            <div className="reviewStatCard">
              <span className="statLabel">健康评分</span>
              <span className="statValue">
                {formatNumber(agg.healthScore)}
              </span>
              <span className="statSub">
                复盘评分 {formatNumber(detail.score)}
              </span>
            </div>
            <div className="reviewStatCard">
              <span className="statLabel">评分变化</span>
              <span className="statValue">
                {formatNumber(detail.scoreBefore)} → {formatNumber(detail.scoreAfter)}
              </span>
              <span className="statSub">
                {detail.scoreAfter !== null && detail.scoreBefore !== null && detail.scoreAfter > detail.scoreBefore
                  ? '↑ 提升'
                  : detail.scoreAfter !== null && detail.scoreBefore !== null && detail.scoreAfter < detail.scoreBefore
                  ? '↓ 下降'
                  : '持平'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 项目变化 */}
      {projectProgress.length > 0 && (
        <section className="reviewSection">
          <div className="sectionTitle">
            <TrendingUp size={16} />
            <h2>项目变化</h2>
          </div>
          <div className="sectionBody">
            <div className="projectProgressList">
              {projectProgress.map((proj, idx) => (
                <div key={proj.projectId || idx} className="projectProgressItem">
                  <div className="projectProgressInfo">
                    <span className="projectProgressName">{proj.title}</span>
                    {proj.healthStatus && (
                      <span className={`projectHealthTag ${(proj.healthStatus || 'on_track').toLowerCase()}`}>
                        {proj.healthStatus === 'ON_TRACK' ? '正常' : proj.healthStatus === 'AT_RISK' ? '风险' : proj.healthStatus === 'OFF_TRACK' ? '偏离' : proj.healthStatus}
                      </span>
                    )}
                  </div>
                  <div className="projectProgressBar">
                    <div className="progressBarTrack">
                      <div
                        className="progressBarFill"
                        style={{ width: `${Math.min(proj.progress || 0, 100)}%` }}
                      />
                    </div>
                    <span className="projectProgressValue">{proj.progress || 0}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 评分变化（指标） */}
      {metricChanges.length > 0 && (
        <section className="reviewSection">
          <div className="sectionTitle">
            <Target size={16} />
            <h2>评分变化</h2>
          </div>
          <div className="sectionBody">
            <div className="metricChangeList">
              {metricChanges.map((metric, idx) => (
                <div key={idx} className="metricChangeItem">
                  <span className="metricChangeName">{metric.metricName || `指标 ${idx + 1}`}</span>
                  <span className="metricChangeValues">
                    {formatNumber(metric.before)} → {formatNumber(metric.after)}
                  </span>
                  {metric.change !== null && metric.change !== undefined && (
                    <span className={`metricChangeDelta ${metric.change >= 0 ? 'positive' : 'negative'}`}>
                      {metric.change >= 0 ? '+' : ''}{formatNumber(metric.change)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 问题 & 建议（双栏） */}
      <div className="reviewDualColumn">
        {unresolvedIssues.length > 0 && (
          <section className="reviewSection">
            <div className="sectionTitle">
              <AlertTriangle size={16} />
              <h2>问题</h2>
            </div>
            <div className="sectionBody">
              <ul className="reviewItemList">
                {unresolvedIssues.map((issue, idx) => (
                  <li key={issue.issueId || idx} className="reviewIssueItem">
                    <AlertTriangle size={14} className="itemIcon" />
                    <span className="itemText">{issue.title || '未命名问题'}</span>
                    {issue.level && (
                      <span className={`issueLevelBadge ${(issue.level || '').toLowerCase()}`}>
                        {issue.level === 'HIGH' ? '高' : issue.level === 'MEDIUM' ? '中' : '低'}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {acceptedSuggestions.length > 0 && (
          <section className="reviewSection">
            <div className="sectionTitle">
              <Lightbulb size={16} />
              <h2>建议</h2>
            </div>
            <div className="sectionBody">
              <ul className="reviewItemList">
                {acceptedSuggestions.map((sugg, idx) => (
                  <li key={sugg.suggestionId || idx} className="reviewSuggestionItem">
                    <Lightbulb size={14} className="itemIcon" />
                    <span className="itemText">{sugg.title || '未命名建议'}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </div>

      {/* 总结 */}
      <section className="reviewSection">
        <div className="sectionTitle">
          <ClipboardList size={16} />
          <h2>总结</h2>
        </div>
        <div className="sectionBody">
          {detail.summary && (
            <p className="reviewSummary">{detail.summary}</p>
          )}

          {achievements.length > 0 && (
            <div className="reviewContentBlock">
              <div className="contentBlockLabel">
                <Award size={14} />
                <span>成就</span>
              </div>
              <ul className="contentBlockList">
                {achievements.map((item, idx) => (
                  <li key={idx} className="contentBlockItem">
                    <CheckCircle2 size={13} className="itemIcon achievement" />
                    <span>{item.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {challenges.length > 0 && (
            <div className="reviewContentBlock">
              <div className="contentBlockLabel">
                <AlertTriangle size={14} />
                <span>挑战</span>
              </div>
              <ul className="contentBlockList">
                {challenges.map((item, idx) => (
                  <li key={idx} className="contentBlockItem">
                    <AlertTriangle size={13} className="itemIcon challenge" />
                    <span>{item.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* 可编辑区域 */}
      {canEditReview && (
        <section className="reviewSection editableSection">
          <div className="sectionTitle">
            <BookOpen size={16} />
            <h2>编辑复盘</h2>
            {hasChanges && <span className="unsavedBadge">未保存</span>}
          </div>
          <div className="sectionBody">
            <div className="reviewEditGrid">
              <div className="editFieldGroup">
                <label className="editFieldLabel">复盘标题</label>
                <input
                  className="editInput"
                  value={titleText}
                  onChange={handleFieldChange(setTitleText)}
                />
              </div>

              <div className="editFieldGroup">
                <label className="editFieldLabel">复盘类型</label>
                <select
                  className="editInput"
                  value={reviewTypeValue}
                  onChange={handleFieldChange(setReviewTypeValue)}
                >
                  <option value="WEEKLY">周复盘</option>
                  <option value="MONTHLY">月复盘</option>
                  <option value="QUARTERLY">季度复盘</option>
                  <option value="YEARLY">年复盘</option>
                  <option value="PROJECT">项目复盘</option>
                  <option value="CUSTOM">自定义复盘</option>
                </select>
              </div>

              <div className="editFieldGroup">
                <label className="editFieldLabel">周期</label>
                <input
                  className="editInput"
                  value={periodText}
                  onChange={handleFieldChange(setPeriodText)}
                  placeholder="例如：2026 W33"
                />
              </div>
            </div>

            <div className="reviewEditGrid scoreEditGrid">
              <div className="editFieldGroup">
                <label className="editFieldLabel">评分前</label>
                <input
                  className="editInput"
                  type="number"
                  value={scoreBeforeText}
                  onChange={handleFieldChange(setScoreBeforeText)}
                />
              </div>
              <div className="editFieldGroup">
                <label className="editFieldLabel">评分后</label>
                <input
                  className="editInput"
                  type="number"
                  value={scoreAfterText}
                  onChange={handleFieldChange(setScoreAfterText)}
                />
              </div>
              <div className="editFieldGroup">
                <label className="editFieldLabel">复盘评分</label>
                <input
                  className="editInput"
                  type="number"
                  value={scoreText}
                  onChange={handleFieldChange(setScoreText)}
                />
              </div>
            </div>

            <div className="editFieldGroup">
              <label className="editFieldLabel">总结</label>
              <textarea
                className="editTextarea"
                rows={3}
                value={summaryText}
                onChange={handleFieldChange(setSummaryText)}
                placeholder="补充本周期复盘总结"
              />
            </div>

            <div className="editFieldGroup">
              <label className="editFieldLabel">
                <AlertCircle size={14} />
                <span>根因分析</span>
              </label>
              <p className="editFieldHint">每行一条，分析导致当前结果的根本原因</p>
              <textarea
                className="editTextarea"
                rows={4}
                value={rootCausesText}
                onChange={handleFieldChange(setRootCausesText)}
                placeholder={'例如：任务规划过于乐观，未预留缓冲时间\n例如：关键依赖未及时就绪'}
              />
            </div>

            <div className="editFieldGroup">
              <label className="editFieldLabel">
                <BookOpen size={14} />
                <span>经验教训</span>
              </label>
              <p className="editFieldHint">每行一条，记录本周期的经验与教训</p>
              <textarea
                className="editTextarea"
                rows={4}
                value={lessonsText}
                onChange={handleFieldChange(setLessonsText)}
                placeholder={'例如：AI 学习投入时间充足，需保持\n例如：健康领域投入不足，需调整'}
              />
            </div>

            <div className="editFieldGroup">
              <label className="editFieldLabel">
                <Focus size={14} />
                <span>下周期重点</span>
              </label>
              <p className="editFieldHint">每行一条，明确下周期的行动重点</p>
              <textarea
                className="editTextarea"
                rows={4}
                value={nextFocusText}
                onChange={handleFieldChange(setNextFocusText)}
                placeholder={'例如：提升任务完成率至 80%\n例如：增加健康领域运动时间'}
              />
            </div>
          </div>
        </section>
      )}

      {/* 已完成时展示只读内容 */}
      {!canEditReview && isCompleted && (detail.rootCauses || detail.lessonsLearned || detail.nextCycleFocus) && (
        <section className="reviewSection">
          <div className="sectionTitle">
            <BookOpen size={16} />
            <h2>复盘记录</h2>
          </div>
          <div className="sectionBody">
            {detail.rootCauses && detail.rootCauses.length > 0 && (
              <div className="reviewContentBlock">
                <div className="contentBlockLabel">
                  <AlertCircle size={14} />
                  <span>根因分析</span>
                </div>
                <ul className="contentBlockList">
                  {detail.rootCauses.map((item, idx) => (
                    <li key={idx} className="contentBlockItem">
                      <span className="itemBullet">·</span>
                      <span>{item.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {detail.lessonsLearned && detail.lessonsLearned.length > 0 && (
              <div className="reviewContentBlock">
                <div className="contentBlockLabel">
                  <BookOpen size={14} />
                  <span>经验教训</span>
                </div>
                <ul className="contentBlockList">
                  {detail.lessonsLearned.map((item, idx) => (
                    <li key={idx} className="contentBlockItem">
                      <span className="itemBullet">·</span>
                      <span>{item.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {detail.nextCycleFocus && detail.nextCycleFocus.length > 0 && (
              <div className="reviewContentBlock">
                <div className="contentBlockLabel">
                  <Focus size={14} />
                  <span>下周期重点</span>
                </div>
                <ul className="contentBlockList">
                  {detail.nextCycleFocus.map((item, idx) => (
                    <li key={idx} className="contentBlockItem">
                      <span className="itemBullet">·</span>
                      <span>{typeof item === 'string' ? item : item.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 操作栏 */}
      {canEditReview && (
        <div className="reviewActionBar">
          <button
            className="primaryButton saveBtn"
            onClick={handleSave}
            disabled={saving || completing || !hasChanges}
          >
            {saving ? (
              <RefreshCw size={16} className="spinning" />
            ) : (
              <Save size={16} />
            )}
            {saving ? '保存中…' : isDraft ? '保存草稿' : '保存修改'}
          </button>
          {isDraft && (
            <button
              className="primaryButton completeBtn"
              onClick={handleComplete}
              disabled={saving || completing}
            >
              {completing ? (
                <RefreshCw size={16} className="spinning" />
              ) : (
                <CheckCircle2 size={16} />
              )}
              {completing ? '确认中…' : '确认复盘'}
            </button>
          )}
        </div>
      )}

      {toast && (
        <div className={`suggestionToast toast-${toast.type}`}>{toast.message}</div>
      )}
    </div>
  );
}
