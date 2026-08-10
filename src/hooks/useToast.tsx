// src/hooks/useToast.ts
// 统一 Toast Hook + ToastPortal 组件
// 复用 index.css 中的 .suggestionToast / .toast-success / .toast-error 样式
// 支持中文提示，最长展示 2.6 秒，自动排队

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
  duration: number;
}

interface ToastContextValue {
  show: (message: string, type?: ToastType, duration?: number) => number;
  success: (message: string, duration?: number) => number;
  error: (message: string, duration?: number) => number;
  info: (message: string, duration?: number) => number;
  warning: (message: string, duration?: number) => number;
  dismiss: (id: number) => void;
  dismissAll: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let __toastIdSeed = 0;

/** 事件中文默认文案映射 */
export const REALTIME_EVENT_TOAST: Record<string, Partial<Record<ToastType, string>>> = {
  'dashboard.updated': { success: 'Dashboard 数据已更新', info: '收到数据刷新通知' },
  'task.completed': { success: '任务已完成' },
  'suggestion.generated': { success: '新的 AI 建议已生成' },
  'review.generated': { success: '复盘草稿已生成，前往复盘中心查看' },
};

const DEFAULT_DURATION = 2600;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const clearTimer = useCallback((id: number) => {
    const t = timersRef.current.get(id);
    if (t) {
      clearTimeout(t);
      timersRef.current.delete(id);
    }
  }, []);

  const dismiss = useCallback(
    (id: number) => {
      clearTimer(id);
      setToasts((prev) => prev.filter((t) => t.id !== id));
    },
    [clearTimer],
  );

  const dismissAll = useCallback(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current.clear();
    setToasts([]);
  }, []);

  const show = useCallback(
    (message: string, type: ToastType = 'info', duration = DEFAULT_DURATION): number => {
      const id = ++__toastIdSeed;
      const item: ToastItem = { id, type, message, duration };
      setToasts((prev) => [...prev, item]);
      if (duration > 0) {
        const t = setTimeout(() => dismiss(id), duration);
        timersRef.current.set(id, t);
      }
      return id;
    },
    [dismiss],
  );

  const success = useCallback(
    (message: string, duration = DEFAULT_DURATION) => show(message, 'success', duration),
    [show],
  );
  const error = useCallback(
    (message: string, duration = DEFAULT_DURATION) => show(message, 'error', duration),
    [show],
  );
  const info = useCallback(
    (message: string, duration = DEFAULT_DURATION) => show(message, 'info', duration),
    [show],
  );
  const warning = useCallback(
    (message: string, duration = DEFAULT_DURATION) => show(message, 'warning', duration),
    [show],
  );

  useEffect(() => () => dismissAll(), [dismissAll]);

  const value = useMemo<ToastContextValue>(
    () => ({ show, success, error, info, warning, dismiss, dismissAll }),
    [show, success, error, info, warning, dismiss, dismissAll],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastPortal toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

/** Toast 渲染层（挂在全局，堆叠样式固定右上角） */
function ToastPortal({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}) {
  if (toasts.length === 0) return null;

  const icons: Record<ToastType, string> = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠',
  };

  return (
    <div className="toastPortal" aria-live="polite" aria-atomic="true">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`suggestionToast toast-${t.type}`}
          onClick={() => onDismiss(t.id)}
          role={t.type === 'error' ? 'alert' : 'status'}
        >
          <span className="toastIcon">{icons[t.type]}</span>
          <span className="toastMessage">{t.message}</span>
          <button
            className="toastCloseBtn"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss(t.id);
            }}
            aria-label="关闭"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

/** Hook：在任意组件内调用 toast */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // 未挂载 ToastProvider 时，降级为 console 输出 + alert（避免报错）
    return {
      show: (msg, type = 'info') => {
        console.log(`[Toast:${type}]`, msg);
        return 0;
      },
      success: (msg) => {
        console.log('[Toast:success]', msg);
        return 0;
      },
      error: (msg) => {
        console.warn('[Toast:error]', msg);
        return 0;
      },
      info: (msg) => {
        console.info('[Toast:info]', msg);
        return 0;
      },
      warning: (msg) => {
        console.warn('[Toast:warning]', msg);
        return 0;
      },
      dismiss: () => {},
      dismissAll: () => {},
    };
  }
  return ctx;
}
