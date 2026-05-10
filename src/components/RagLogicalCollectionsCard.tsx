import React from 'react';
import { Layers, Plus, AlertCircle, Edit2, Trash2 } from 'lucide-react';
import { RagLogicalCollection } from '../types';

interface RagLogicalCollectionsCardProps {
  projectId: string;
  collections: RagLogicalCollection[];
  loading: boolean;
  error: Error | null;
  onRefresh: () => void;
  onCreate: () => void;
  onEdit: (collection: RagLogicalCollection) => void;
  onDelete: (collection: RagLogicalCollection) => void;
}

const formatNumber = (n: number | null | undefined): string => {
  if (n === null || n === undefined) return '—';
  return n.toLocaleString();
};

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

const RagLogicalCollectionsCard: React.FC<RagLogicalCollectionsCardProps> = ({
  projectId,
  collections,
  loading,
  error,
  onRefresh,
  onCreate,
  onEdit,
  onDelete,
}) => {
  const isDefault = (name: string): boolean => name === 'default';

  return (
    <div className="bg-bg-card rounded-xl border border-border-primary p-5 shadow-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <Layers className="w-4 h-4 text-accent-primary" />
          Logical Collections
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-all duration-200 disabled:opacity-50 min-h-[40px] min-w-[40px] flex items-center justify-center"
            title="Refresh"
          >
            <Layers className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onCreate}
            className="px-3 py-2 rounded-lg text-xs font-medium bg-gradient-to-r from-accent-primary to-accent-tertiary hover:from-accent-primary-hover hover:to-accent-tertiary text-white shadow-lg shadow-accent-primary/20 transition-all duration-200 flex items-center gap-1.5 min-h-[40px]"
          >
            <Plus className="w-3 h-3" />
            Create
          </button>
        </div>
      </div>

      <p className="text-[10px] text-text-tertiary mb-3">
        Project: <span className="font-mono text-text-secondary">{projectId}</span>
        <span className="ml-2 text-[10px] text-text-tertiary/60">Logical collections are metadata namespaces inside the project.</span>
      </p>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center gap-2 text-xs text-text-tertiary py-4">
          <Layers className="w-4 h-4 animate-spin" />
          <span>Loading collections...</span>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="flex items-center gap-2 text-xs text-status-error py-4">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{error.message}</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && collections.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Layers className="w-8 h-8 text-text-tertiary/30 mb-2" />
          <p className="text-sm text-text-secondary">No logical collections registered</p>
          <p className="text-[10px] text-text-tertiary mt-1">Create a collection to organize your documents</p>
        </div>
      )}

      {/* Collections list */}
      {!loading && !error && collections.length > 0 && (
        <div className="space-y-2">
          {collections.map((col) => (
            <div
              key={col.name}
              className={`group flex items-center justify-between p-3 rounded-lg border transition-all duration-200 ${
                isDefault(col.name)
                  ? 'bg-accent-primary/5 border-accent-primary/20'
                  : 'bg-bg-secondary border-border-subtle hover:border-border-primary'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Layers className={`w-4 h-4 flex-shrink-0 ${isDefault(col.name) ? 'text-accent-primary' : 'text-accent-primary/60'}`} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-text-primary truncate">
                      {col.display_name || col.name}
                    </span>
                    {isDefault(col.name) && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-accent-primary/10 text-accent-primary flex-shrink-0">
                        Default
                      </span>
                    )}
                    {col.counts_are_estimated && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-status-warning/10 text-status-warning flex-shrink-0">
                        Estimated
                      </span>
                    )}
                  </div>
                  {col.description && (
                    <p className="text-[10px] text-text-tertiary truncate mt-0.5">{col.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-text-tertiary">
                      Docs: <span className="text-text-secondary">{formatNumber(col.document_count)}</span>
                    </span>
                    <span className="text-[10px] text-text-tertiary">
                      Chunks: <span className="text-text-secondary">{formatNumber(col.chunk_count)}</span>
                    </span>
                    {col.updated_at && (
                      <span className="text-[10px] text-text-tertiary">
                        Updated: <span className="text-text-secondary">{formatTimeAgo(col.updated_at)}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
                {!isDefault(col.name) && onEdit && (
                  <button
                    onClick={() => onEdit(col)}
                    className="p-1.5 rounded text-text-tertiary hover:text-accent-primary hover:bg-bg-tertiary transition-all duration-200 min-h-[28px] min-w-[28px] flex items-center justify-center"
                    title="Edit collection"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
                {!isDefault(col.name) && onDelete && (
                  <button
                    onClick={() => onDelete(col)}
                    className="p-1.5 rounded text-text-tertiary hover:text-status-error hover:bg-bg-tertiary transition-all duration-200 min-h-[28px] min-w-[28px] flex items-center justify-center"
                    title="Delete collection"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RagLogicalCollectionsCard;
