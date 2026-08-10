// src/components/TaskSkeleton.jsx
// 任务列表骨架屏组件

function TaskSkeletonItem() {
  return (
    <div className="taskItem skeleton">
      <div className="taskItemHeader">
        <div className="skeleton priority" style={{ width: 32, height: 26 }} />
        <div className="skeleton" style={{ flex: 1, height: 16 }} />
        <div className="skeleton" style={{ width: 60, height: 22 }} />
      </div>
      <div className="taskItemMeta">
        <div className="skeleton" style={{ width: 80, height: 12 }} />
        <div className="skeleton" style={{ width: 60, height: 12 }} />
        <div className="skeleton" style={{ width: 100, height: 12 }} />
      </div>
    </div>
  );
}

export function TaskListSkeleton({ count = 6 }) {
  return (
    <div className="taskList">
      {Array.from({ length: count }, (_, i) => (
        <TaskSkeletonItem key={i} />
      ))}
    </div>
  );
}

export function TaskDetailSkeleton() {
  return (
    <div className="taskDetailPanel skeleton">
      <div className="skeleton" style={{ width: 120, height: 14, marginBottom: 12 }} />
      <div className="skeleton" style={{ width: '80%', height: 20, marginBottom: 16 }} />
      <div className="skeleton" style={{ width: '60%', height: 14 }} />
    </div>
  );
}
