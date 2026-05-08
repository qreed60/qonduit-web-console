import React from 'react';
import { RefreshCw, Loader2, Database } from 'lucide-react';
import { RagProjectSummary } from '../types';
import EndpointErrorInline from './EndpointErrorInline';

interface RagProjectCardProps {
  project: RagProjectSummary;
  isSelected: boolean;
  onSelect: (projectId: string) => void;
  onRefresh: (projectId: string) => void;
  refreshing: boolean;
}

const RagProjectCard: React.FC<RagProjectCardProps> = ({
  project,
  isSelected,
  onSelect,
  onRefresh,
  refreshing,
}) => {
  const formatNumber = (n: number): string => {
    return n.toLocaleString();
  };

  return (
    <div
      className={`bg-bg-card rounded-xl border p-4 cursor-pointer transition-all duration-200 hover:border-border-primary/60 ${
        isSelected
          ? 'border-accent-primary/40 bg-accent-primary/5 shadow-card-hover'
          : 'border-border-primary'
      }`}
      onClick={() => onSelect(project.project_id)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Database className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-accent-primary' : 'text-text-tertiary'}`} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-primary truncate">{project.project_id}</p>
            <p className="text-[10px] font-mono text-text-tertiary truncate" title={project.qdrant_collection}>
              {project.qdrant_collection}
            </p>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRefresh(project.project_id);
          }}
          disabled={refreshing}
          className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-all duration-200 disabled:opacity-50 flex-shrink-0"
          title="Refresh status"
        >
          {refreshing ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3" />
          )}
        </button>
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-2 mb-3">
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
          project.exists
            ? 'bg-status-success/10 text-status-success'
            : 'bg-text-tertiary/10 text-text-tertiary'
        }`}>
          {project.exists ? 'Exists' : 'Not Found'}
        </span>
        {project.status && (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
            project.status === 'green'
              ? 'bg-status-success/10 text-status-success'
              : 'bg-status-warning/10 text-status-warning'
          }`}>
            {project.status}
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="text-[10px] text-text-tertiary">Points</span>
          <p className="text-xs font-mono text-text-primary">{formatNumber(project.points_count)}</p>
        </div>
        <div>
          <span className="text-[10px] text-text-tertiary">Vectors</span>
          <p className="text-xs font-mono text-text-primary">{formatNumber(project.vectors_count)}</p>
        </div>
      </div>

      {/* Error */}
      {project.error && (
        <div className="mt-2">
          <span className="text-[10px] text-status-error">Error:</span>
          <p className="text-[10px] text-status-error/80 font-mono truncate" title={project.error}>
            {project.error}
          </p>
        </div>
      )}

      <EndpointErrorInline error={null} compact />
    </div>
  );
};

export default RagProjectCard;
