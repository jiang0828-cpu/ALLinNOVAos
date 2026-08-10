// src/components/SuggestionSkeleton.jsx
// Suggestion 列表骨架屏

export function SuggestionSkeleton({ count = 4 }) {
  return (
    <div className="suggestionsSkeletonList">
      {Array.from({ length: count }).map((_, idx) => (
        <div className="suggestionSkeletonCard" key={idx}>
          <div className="skeletonRow">
            <div className="skeletonLine skeletonShimmer" style={{ width: 48, height: 24, borderRadius: 12 }} />
            <div className="skeletonLine skeletonShimmer" style={{ flex: 1, height: 20 }} />
          </div>
          <div className="skeletonLine skeletonShimmer" style={{ width: '90%', height: 14, marginTop: 14 }} />
          <div className="skeletonLine skeletonShimmer" style={{ width: '60%', height: 14, marginTop: 8 }} />
          <div className="skeletonRow" style={{ marginTop: 18 }}>
            <div className="skeletonLine skeletonShimmer" style={{ width: 80, height: 32, borderRadius: 8 }} />
            <div className="skeletonLine skeletonShimmer" style={{ width: 80, height: 32, borderRadius: 8 }} />
            <div className="skeletonLine skeletonShimmer" style={{ width: 110, height: 32, borderRadius: 8 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
