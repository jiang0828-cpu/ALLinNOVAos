// src/components/IssueSkeleton.jsx
// Issue 列表骨架屏

export function IssueSkeleton({ count = 6 }) {
  return (
    <div className="issuesSkeletonGrid">
      {Array.from({ length: count }).map((_, idx) => (
        <div className="issueSkeletonCard" key={idx}>
          <div className="skeletonLine skeletonShimmer" style={{ width: '40%', height: 22 }} />
          <div className="skeletonLine skeletonShimmer" style={{ width: '70%', height: 18, marginTop: 12 }} />
          <div className="skeletonRow" style={{ marginTop: 18 }}>
            <div className="skeletonLine skeletonShimmer" style={{ width: 60, height: 24, borderRadius: 12 }} />
            <div className="skeletonLine skeletonShimmer" style={{ width: 60, height: 24, borderRadius: 12 }} />
          </div>
          <div className="skeletonRow" style={{ marginTop: 16 }}>
            <div className="skeletonLine skeletonShimmer" style={{ width: '30%', height: 14 }} />
            <div className="skeletonLine skeletonShimmer" style={{ width: '30%', height: 14 }} />
            <div className="skeletonLine skeletonShimmer" style={{ width: '30%', height: 14 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
