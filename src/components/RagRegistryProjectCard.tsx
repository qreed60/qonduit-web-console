import React, { useState } from 'react';
import { RefreshCw, Loader2, Database, Edit2, Trash2, Magnet } from 'lucide-react';
import { RagRegistryProject } from '../types';

interface RagRegistryProjectCardProps {
  project: RagRegistryProject;
  isSelected: boolean;
  onSelect: (projectId: string) => void;
  onEdit?: (project: RagRegistryProject) => void;
  onAdopt?: (project: RagRegistryProject) => void;
  onDelete?: (project: RagRegistryProject) => void;
  onRefresh?: (projectId: string) => void;
  refreshing?: boolean;
}

const formatTimeAgo = (ts: string | null | undefined): string => {
  if (!ts) return '';
  try {
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return '';
  }
};

const RagRegistryProjectCard: React.FC<RagRegistryProjectCardProps> = ({
  project,
  isSelected,
  onSelect,
  onEdit,
  onAdopt,
  onDelete,
  onRefresh,
  refreshing = false,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const isDefaultProject = project.project_id === 'default';
  const canEdit = !isDefaultProject;
  const canDelete = !isDefaultProject && !project.discovered;
  const canAdopt = project.discovered;

  const formatNumber = (n: number): string => n.toLocaleString();

  return (
    <div
      className={`bg-bg-card rounded-xl border p-3 sm:p-4 transition-all duration-200 hover:border-border-primary/60 ${
        isSelected
          ? 'border-accent-primary/40 bg-accent-primary/5 shadow-card-hover'
          : 'border-border-primary'
      }`}
      onClick={() => onSelect(project.project_id)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Database className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-accent-primary' : 'text-text-tertiary'}`} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-primary truncate">{project.display_name || project.project_id}</p>
            <p className="text-[10px] font-mono text-text-tertiary truncate hidden sm:block" title={project.project_id}>
              {project.project_id}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          {onRefresh && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRefresh(project.project_id);
              }}
              disabled={refreshing}
              className="p-1.5 rounded text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-all duration-200 disabled:opacity-50 flex-shrink-0 min-h-[28px] min-w-[28px] flex items-center justify-center"
              title="Refresh status"
            >
              {refreshing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
            </button>
          )}
          {canEdit && onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(project);
              }}
              className="p-1.5 rounded text-text-tertiary hover:text-accent-primary hover:bg-bg-tertiary transition-all duration-200 flex-shrink-0 min-h-[28px] min-w-[28px] flex items-center justify-center"
              title="Edit project"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
          {canAdopt && onAdopt && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAdopt(project);
              }}
              className="p-1.5 rounded text-status-warning hover:text-status-warning/80 hover:bg-bg-tertiary transition-all duration-200 flex-shrink-0 min-h-[28px] min-w-[28px] flex items-center justify-center"
              title="Register project"
            >
              <Magnet className="w-3.5 h-3.5" />
            </button>
          )}
          {canDelete && onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(project);
              }}
              className="p-1.5 rounded text-text-tertiary hover:text-status-error hover:bg-bg-tertiary transition-all duration-200 flex-shrink-0 min-h-[28px] min-w-[28px] flex items-center justify-center"
              title="Delete project"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Description */}
      {project.description && (
        <p className="text-[10px] text-text-secondary mb-2 line-clamp-2">{project.description}</p>
      )}

      {/* Status badges */}
      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
          project.exists_in_qdrant
            ? 'bg-status-success/10 text-status-success'
            : 'bg-text-tertiary/10 text-text-tertiary'
        }`}>
          {project.exists_in_qdrant ? 'Exists' : 'Not Found'}
        </span>
        {project.discovered && (
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-status-warning/10 text-status-warning cursor-help"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            Discovered
          </span>
        )}
        {project.error && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-status-error/10 text-status-error truncate max-w-[120px]" title={project.error}>
            Error
          </span>
        )}
      </div>

      {/* Tooltip for discovered */}
      {showTooltip && project.discovered && (
        <div className="absolute z-10 bg-bg-card border border-border-primary rounded-lg p-2 shadow-lg text-[10px] text-text-secondary max-w-[200px]">
          <p>This collection exists in Qdrant but is not fully registered in the gateway registry yet.</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="text-[10px] sm:text-xs text-text-tertiary">Points</span>
          <p className="text-xs font-mono text-text-primary">{formatNumber(project.points_count)}</p>
        </div>
        <div>
          <span className="text-[10px] sm:text-xs text-text-tertiary">Collections</span>
          <p className="text-xs font-mono text-text-primary">{project.collections_count}</p>
        </div>
      </div>

      {/* Qdrant collection name */}
      <div className="mt-2">
        <span className="text-[10px] text-text-tertiary">Qdrant:</span>
        <p className="text-[10px] font-mono text-text-tertiary truncate" title={project.qdrant_collection}>
          {project.qdrant_collection}
        </p>
      </div>

      {/* Timestamps */}
      {(project.created_at || project.updated_at) && (
        <div className="mt-2 pt-2 border-t border-border-subtle space-y-0.5">
          {project.created_at && (
            <div className="flex justify-between">
              <span className="text-[10px] text-text-tertiary">Created</span>
              <span className="text-[10px] text-text-tertiary">{formatTimeAgo(project.created_at)}</span>
            </div>
          )}
          {project.updated_at && project.updated_at !== project.created_at && (
            <div className="flex justify-between">
              <span className="text-[10px] text-text-tertiary">Updated</span>
              <span className="text-[10px] text-text-tertiary">{formatTimeAgo(project.updated_at)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RagRegistryProjectCard;
