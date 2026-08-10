// src/components/Skeleton.tsx
// 骨架屏组件 - 数据加载时显示占位符

import type { CSSProperties } from 'react';

interface SkeletonProps {
  variant?: 'panel' | 'card' | 'line' | 'circle';
  width?: string;
  height?: string;
  className?: string;
}

export function Skeleton({ variant = 'line', width, height, className = '' }: SkeletonProps) {
  const style: CSSProperties = {};
  if (width) style.width = width;
  if (height) style.height = height;

  const variantClass = `skeleton skeleton-${variant}`;

  return (
    <div
      className={`${variantClass} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}

/** 针对特定面板的骨架屏 */
export function PanelSkeleton() {
  return (
    <div className="panel skeletonPanel">
      <div className="panelHeader">
        <Skeleton variant="line" width="40%" height="14px" />
        <Skeleton variant="circle" width="20px" height="20px" />
      </div>
      <div className="skeletonBody">
        <Skeleton variant="line" width="80%" height="12px" />
        <Skeleton variant="line" width="60%" height="12px" />
        <Skeleton variant="line" width="70%" height="12px" />
        <Skeleton variant="line" width="50%" height="12px" />
      </div>
    </div>
  );
}

/** Dashboard 加载状态 - 显示整个 Grid 的骨架屏 */
export function DashboardSkeleton() {
  return (
    <div className="heroGrid">
      <PanelSkeleton />
      <PanelSkeleton />
      <PanelSkeleton />
      <PanelSkeleton />
      <PanelSkeleton />
      <PanelSkeleton />
      <PanelSkeleton />
      <PanelSkeleton />
    </div>
  );
}
