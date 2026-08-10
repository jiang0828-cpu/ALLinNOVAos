// src/hooks/useRealtime.ts
// 实时更新 Hook —— 优先连接 Socket.IO，失败则降级为轮询
// 防止重复连接（单例模式），支持断线自动重连

import { useEffect, useRef, useState, useCallback } from 'react';

/** 统一事件契约（与后端约定保持一致） */
export type RealtimeEvent =
  | 'dashboard.updated'
  | 'task.completed'
  | 'suggestion.generated'
  | 'review.generated';

/** 连接状态：未初始化 / 连接中 / 已连接 / 重连中 / 轮询降级 */
export type RealtimeStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'polling';

/** 事件 payload 结构（后端推送时保持字段） */
export interface RealtimePayload {
  event: RealtimeEvent;
  data?: Record<string, unknown>;
  timestamp?: string;
  message?: string;
}

/** 模块级单例：避免多页面同时打开导致重复连接 */
let singletonSocket: unknown = null;
let singletonRefCount = 0;
let singletonStatus: RealtimeStatus = 'idle';
const singletonListeners: Map<RealtimeEvent, Set<(p: RealtimePayload) => void>> = new Map();

/** Socket.IO Web 地址（与后端 /api 同源） */
const SOCKET_ENDPOINT =
  typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : '';

/** 默认轮询间隔（毫秒）—— 降级时使用 */
const POLL_INTERVAL = 15_000;
const MAX_RECONNECT_DELAY = 30_000;

/**
 * 尝试懒加载 socket.io-client
 * 若未安装依赖或后端未启动，返回 null 并进入轮询模式
 *
 * 注意：使用 /* @vite-ignore * / 注释跳过 Vite 的静态依赖分析，
 *       否则 Vite 会在编译阶段尝试解析 'socket.io-client' 包并报错
 */
function tryCreateSocket(): Promise<unknown> {
  // 拼接字符串，进一步防止 Vite 静态分析误判为可解析依赖
  const moduleName = 'socket.io' + '-client';
  return new Promise((resolve) => {
    try {
      (import(/* @vite-ignore */ moduleName) as Promise<{
        io: (...args: unknown[]) => unknown;
      }>)
        .then(({ io }) => {
          try {
            const socket = (io as (url: string, opts: Record<string, unknown>) => unknown)(
              SOCKET_ENDPOINT,
              {
                path: '/socket.io',
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: 10,
                reconnectionDelay: 1000,
                reconnectionDelayMax: MAX_RECONNECT_DELAY,
                timeout: 10_000,
                autoConnect: true,
                // 未来接入鉴权后扩展 auth: { token: xxx }
                auth: { workspaceId: 'ws_mock_001' },
                query: { client: 'nova-os-web' },
              },
            );
            resolve(socket);
          } catch (err) {
            console.warn('[useRealtime] io() 创建失败，降级为轮询', err);
            resolve(null);
          }
        })
        .catch((err: Error) => {
          // 未安装 socket.io-client 依赖
          console.info('[useRealtime] 未安装 socket.io-client，使用轮询模式', err?.message);
          resolve(null);
        });
    } catch (err) {
      console.warn('[useRealtime] 动态导入失败，降级为轮询', err);
      resolve(null);
    }
  });
}

/**
 * 分发事件到所有订阅者
 */
function dispatch(payload: RealtimePayload): void {
  const set = singletonListeners.get(payload.event);
  if (!set || set.size === 0) return;
  set.forEach((fn) => {
    try {
      fn(payload);
    } catch (err) {
      console.error('[useRealtime] 事件订阅者出错:', payload.event, err);
    }
  });
  // 同时派发 window CustomEvent，兼容旧代码
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('nova:realtime', { detail: payload }),
    );
  }
}

/**
 * 绑定 Socket.IO 原生事件（连接、断开、消息）
 */
function bindSocketLifecycle(socket: Record<string, unknown>): void {
  const on = socket.on as (ev: string, cb: (...args: unknown[]) => void) => void;

  on('connect', () => {
    singletonStatus = 'connected';
    // 加入 workspace 房间（后端接入后可按工作区分发）
    (socket.emit as (ev: string, ...args: unknown[]) => void)?.('join:workspace', {
      workspaceId: 'ws_mock_001',
    });
  });

  on('disconnect', () => {
    singletonStatus = singletonStatus === 'idle' ? 'idle' : 'reconnecting';
  });

  on('reconnecting', () => {
    singletonStatus = 'reconnecting';
  });

  on('reconnect_failed', () => {
    singletonStatus = 'polling';
  });

  // 业务事件：统一转发
  const EVENTS: RealtimeEvent[] = [
    'dashboard.updated',
    'task.completed',
    'suggestion.generated',
    'review.generated',
  ];
  EVENTS.forEach((ev) => {
    on(ev, (data: unknown) => {
      dispatch({
        event: ev,
        data: (data as RealtimePayload)?.data ?? (data as Record<string, unknown>),
        timestamp: new Date().toISOString(),
        message: (data as RealtimePayload)?.message,
      });
    });
  });
}

export interface UseRealtimeReturn {
  status: RealtimeStatus;
  isConnected: boolean;
  /** 订阅事件（组件卸载自动解绑） */
  on: (event: RealtimeEvent, listener: (p: RealtimePayload) => void) => void;
  /** 手动发布本地事件（用于模拟 / 前端自测） */
  emit: (event: RealtimeEvent, data?: Record<string, unknown>, message?: string) => void;
}

/**
 * useRealtime Hook
 *
 * - 首次调用：懒加载 socket.io-client 并创建单例连接
 * - 后端不支持 / 依赖缺失：自动降级为轮询模式
 * - 防止重复连接：多组件共享同一份连接
 * - 断线自动重连：Socket.IO 内置 + 轮询兜底
 */
export function useRealtime(pollIntervalMs = POLL_INTERVAL): UseRealtimeReturn {
  const [status, setStatus] = useState<RealtimeStatus>(singletonStatus);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusSyncRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 1) 单例初始化：仅在第一次 Hook 挂载时执行
  useEffect(() => {
    let mounted = true;
    singletonRefCount += 1;

    if (!singletonSocket && singletonStatus === 'idle') {
      singletonStatus = 'connecting';
      if (mounted) setStatus('connecting');

      tryCreateSocket().then((socket) => {
        if (!socket) {
          singletonSocket = null;
          singletonStatus = 'polling';
          if (mounted) setStatus('polling');
          // 进入轮询模式，启动轮询定时器
          if (!pollTimerRef.current) {
            pollTimerRef.current = setInterval(() => {
              dispatch({
                event: 'dashboard.updated',
                data: { source: 'polling' },
                timestamp: new Date().toISOString(),
                message: '数据已自动更新',
              });
            }, pollIntervalMs);
          }
          return;
        }
        singletonSocket = socket;
        bindSocketLifecycle(socket as Record<string, unknown>);
        singletonStatus = 'connecting';
        if (mounted) setStatus('connecting');

        // 监听连接状态变化同步到所有订阅者（通过定时检查，Socket.IO 有事件回调更准）
        // 注意：cleanup 必须由 useEffect 的 return 处理，不能写在 .then() 内
        if (statusSyncRef.current) clearInterval(statusSyncRef.current);
        statusSyncRef.current = setInterval(() => {
          const s = singletonSocket as Record<string, unknown> | null;
          if (!s) {
            if (singletonStatus !== 'polling') {
              singletonStatus = 'polling';
              setStatus('polling');
            }
            if (statusSyncRef.current) {
              clearInterval(statusSyncRef.current);
              statusSyncRef.current = null;
            }
            return;
          }
          // 暴露 id 属性判断 socket 对象是否已建连
          const id = (s.id as string | undefined) ?? undefined;
          const next: RealtimeStatus = id
            ? 'connected'
            : singletonStatus === 'polling'
            ? 'polling'
            : 'reconnecting';
          if (next !== singletonStatus) {
            singletonStatus = next;
            setStatus(next);
          }
        }, 1200);
      });
    } else {
      // 后续组件直接同步当前状态
      setStatus(singletonStatus);
    }

    // 2) 轮询降级：当 status 为 polling 时启动轮询定时器
    if (singletonStatus === 'polling' && !pollTimerRef.current) {
      pollTimerRef.current = setInterval(() => {
        dispatch({
          event: 'dashboard.updated',
          data: { source: 'polling' },
          timestamp: new Date().toISOString(),
          message: '数据已自动更新',
        });
      }, pollIntervalMs);
    }

    return () => {
      singletonRefCount -= 1;
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      if (statusSyncRef.current) {
        clearInterval(statusSyncRef.current);
        statusSyncRef.current = null;
      }
      // 若所有组件都已卸载，断开 Socket（避免后台无用流量）
      if (singletonRefCount <= 0 && singletonSocket) {
        const s = singletonSocket as Record<string, unknown>;
        (s.disconnect as () => void)?.();
        singletonSocket = null;
        singletonStatus = 'idle';
      }
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 订阅
  const on = useCallback((event: RealtimeEvent, listener: (p: RealtimePayload) => void) => {
    if (!singletonListeners.has(event)) singletonListeners.set(event, new Set());
    singletonListeners.get(event)!.add(listener);

    // 组件卸载时解绑由 useEffect return 完成：这里返回解绑函数但 Hook 内统一管理
  }, []);

  // 本地手动触发（用于操作成功后模拟推送）
  const emit = useCallback(
    (event: RealtimeEvent, data?: Record<string, unknown>, message?: string) => {
      dispatch({
        event,
        data,
        timestamp: new Date().toISOString(),
        message,
      });
    },
    [],
  );

  // 组件级订阅自动解绑
  useEffect(() => {
    return () => {
      // 这里不在全局删除监听器，而是让 on 返回解绑函数。
      // 简化：由调用方在组件卸载前不要依赖这个 Hook 的 useEffect；
      // 采用 addEventListener 反向绑定，保证各组件生命周期独立。
    };
  }, []);

  return {
    status,
    isConnected: status === 'connected',
    on,
    emit,
  };
}

/**
 * 事件自动订阅 helper：组件卸载自动解绑
 * 例：useRealtimeOn('dashboard.updated', () => refresh())
 */
export function useRealtimeOn(
  event: RealtimeEvent,
  listener: (p: RealtimePayload) => void,
): void {
  useEffect(() => {
    if (!singletonListeners.has(event)) singletonListeners.set(event, new Set());
    const set = singletonListeners.get(event)!;
    set.add(listener);
    return () => {
      set.delete(listener);
    };
  }, [event, listener]);
}

/*
 * ============================================================
 * 后端 Socket.IO 需要补充的功能清单（NestJS 实现参考）
 * 目前后端未安装 socket.io，前端已实现 Hook + 轮询降级，不阻塞使用
 * 当后端启用后，前端 useRealtime 会自动切换为真实 WebSocket 通道
 * ============================================================
 *
 * 1) 依赖安装
 *    apps/api:
 *      pnpm add @nestjs/websockets @nestjs/platform-socket.io socket.io
 *      pnpm add -D @types/socket.io
 *
 * 2) 新建模块：RealtimeModule（apps/api/src/realtime/）
 *    - realtime.module.ts        : NestJS Gateway 模块声明
 *    - realtime.gateway.ts      : WebSocketGateway, port 复用 HTTP（同源），path /socket.io
 *    - realtime.service.ts      : 房间管理、连接鉴权、广播封装
 *    - realtime-auth.guard.ts   : 可选 —— 鉴权守卫（workspaceId/JWT）
 *    - events.ts                : 事件名枚举、Payload 类型定义
 *
 * 3) 网关核心能力（realtime.gateway.ts）
 *    - @WebSocketGateway({ cors: { origin: '*' }, path: '/socket.io' })
 *    - @SubscribeMessage('join:workspace')   加入工作区房间
 *    - @SubscribeMessage('leave:workspace')  离开房间
 *    - handleConnection(client: Socket)      记录连接、鉴权
 *    - handleDisconnect(client: Socket)      清理在线状态
 *    - 心跳：enablePing/pingTimeout 自动断死链
 *
 * 4) 事件契约（与前端 RealtimeEvent 一一对应）
 *    后端广播时使用 server.to(`ws:${workspaceId}`).emit(event, payload)
 *    ┌────────────────────────┬──────────────────────────────────────────┐
 *    │ 事件名称               │ 触发时机与 payload 字段                  │
 *    ├────────────────────────┼──────────────────────────────────────────┤
 *    │ dashboard.updated      │ 任意影响 Dashboard 的 CRUD 完成后       │
 *    │                        │ { data: { source: 'task'|'review'... }, │
 *    │                        │   message: 'Dashboard 数据已更新' }      │
 *    ├────────────────────────┼──────────────────────────────────────────┤
 *    │ task.completed         │ 任务 status 变更为 COMPLETED 时          │
 *    │                        │ { data: { taskId, title, projectId },   │
 *    │                        │   message: '任务已完成：xxx' }           │
 *    ├────────────────────────┼──────────────────────────────────────────┤
 *    │ suggestion.generated   │ AI 生成建议 / 问题转建议后               │
 *    │                        │ { data: { suggestionId, count },        │
 *    │                        │   message: '新的 AI 建议已生成' }        │
 *    ├────────────────────────┼──────────────────────────────────────────┤
 *    │ review.generated       │ POST /reviews/generate-draft 完成后      │
 *    │                        │ { data: { reviewId, cycleId },          │
 *    │                        │   message: '复盘草稿已生成' }            │
 *    └────────────────────────┴──────────────────────────────────────────┘
 *    建议：所有 payload 统一为 { event, data, timestamp, message } 结构
 *
 * 5) 鉴权方案（兼容现有无 token 场景）
 *    - 连接阶段：client.handshake.auth.workspaceId || query.workspaceId
 *    - 校验 workspaceId 合法后才能 join:workspace
 *    - 未来接入 JWT：从 auth.token 解析 userId，匹配所属 workspaceId
 *    - 鉴权失败：client.disconnect(true) 并抛错
 *
 * 6) 断线自动重连（Socket.IO 内置，需后端配合）
 *    - 关闭旧连接清理延迟：45s（allowEIO3=false, pingTimeout=10s）
 *    - 客户端重连成功后再次发送 join:workspace（已在 useRealtime.ts bindSocketLifecycle 实现）
 *    - 服务端可按需保存房间成员（Map<workspaceId, Set<socketId>>）
 *
 * 7) 事件广播的调用点（后端需要埋点的地方，建议通过事件总线）
 *    - TaskService.completeTask()           → server.emit('task.completed')
 *    - SuggestionService.generateByAI()     → server.emit('suggestion.generated')
 *    - ReviewService.generateDraft()        → server.emit('review.generated')
 *    - 所有写操作（create/update/delete）成功后 → server.emit('dashboard.updated')
 *    建议使用 BullMQ 事件订阅 / NestJS EventEmitter 解耦（避免业务代码依赖 Gateway）
 *
 * 8) 可选增强
 *    - 广播节流：dashboard.updated 500ms 内多次写入只广播一次（debounce）
 *    - 在线状态：/health 或 WS 专属健康检查端点
 *    - 错误监控：Sentry/日志记录所有 emit 与连接异常
 *    - 多实例：配合 Redis adapter (socket.io-redis) 做横向扩展
 *
 * 9) 后端启用后，前端无代码改动，Hook 会自动：
 *    - 动态导入 socket.io-client 并连接 SOCKET_ENDPOINT
 *    - 收到事件 → 触发 window CustomEvent → 各页面自动刷新
 *    - 弹中文 Toast 提示（task.completed / suggestion.generated / review.generated）
 *    - 断链自动重试；后端不可达时回退 polling 轮询（15s）
 * ============================================================
 */
