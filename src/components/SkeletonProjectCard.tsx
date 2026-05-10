import React from 'react';

const SkeletonProjectCard: React.FC = () => {
  return (
    <div className="bg-bg-card rounded-xl border border-border-primary p-3 sm:p-4 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-4 h-4 bg-bg-tertiary rounded" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-bg-tertiary rounded w-3/4" />
          <div className="h-3 bg-bg-tertiary rounded w-1/2" />
        </div>
      </div>

      {/* Badges skeleton */}
      <div className="flex items-center gap-2 mb-3">
        <div className="h-5 bg-bg-tertiary rounded-full w-16" />
        <div className="h-5 bg-bg-tertiary rounded-full w-12" />
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <div className="h-3 bg-bg-tertiary rounded w-12" />
          <div className="h-4 bg-bg-tertiary rounded w-16" />
        </div>
        <div className="space-y-1">
          <div className="h-3 bg-bg-tertiary rounded w-12" />
          <div className="h-4 bg-bg-tertiary rounded w-16" />
        </div>
      </div>
    </div>
  );
};

export default SkeletonProjectCard;
