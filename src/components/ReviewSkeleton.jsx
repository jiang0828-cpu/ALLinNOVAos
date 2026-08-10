// src/components/ReviewSkeleton.jsx
// 复盘列表骨架屏

export function ReviewSkeleton({ count = 4 }) {
  return (
    <div className="reviewsGrid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="reviewCard skeletonCard">
          <div className="skeleton skeleton-line" style={{ width: '30%', height: '24px' }} />
          <div className="skeleton skeleton-line" style={{ width: '80%', height: '20px', marginTop: '12px' }} />
          <div className="skeleton skeleton-line" style={{ width: '60%', height: '14px', marginTop: '12px' }} />
          <div className="skeleton skeleton-line" style={{ width: '50%', height: '14px', marginTop: '8px' }} />
          <div className="skeleton skeleton-line" style={{ width: '90%', height: '14px', marginTop: '16px' }} />
        </div>
      ))}
    </div>
  );
}
