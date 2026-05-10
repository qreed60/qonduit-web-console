import React from 'react';
import { Layers, Edit2, Database } from 'lucide-react';
import { RagLogicalCollection } from '../types';
import RawJsonPanel from './RawJsonPanel';

interface CollectionDetailPanelProps {
  collection: RagLogicalCollection | null;
  loading: boolean;
  onEdit: () => void;
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

const CollectionDetailPanel: React.FC<CollectionDetailPanelProps> = ({
  collection,
  loading,
  onEdit,
}) => {
  if (loading) {
    return (
      <div className="bg-bg-card rounded-xl border border-border-primary p-5 shadow-card animate-pulse">
        <div className="h-5 bg-bg-tertiary rounded w-1/3 mb-4" />
        <div className="space-y-3">
          <div className="h-4 bg-bg-tertiary rounded w-2/3" />
          <div className="h-4 bg-bg-tertiary rounded w-1/2" />
          <div className="h-4 bg-bg-tertiary rounded w-3/4" />
        </div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="bg-bg-card rounded-xl border border-border-primary p-5 shadow-card">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2 mb-4">
          <Layers className="w-4 h-4 text-accent-primary" />
          Collection Detail
        </h3>
        <p className="text-xs text-text-tertiary">Select a collection to view details.</p>
      </div>
    );
  }

  const isDefault = collection.name === 'default';

  return (
    <div className="bg-bg-card rounded-xl border border-border-primary p-5 shadow-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <Layers className="w-4 h-4 text-accent-primary" />
          Collection Detail
        </h3>
        {!isDefault && (
          <button
            onClick={onEdit}
            className="p-2 rounded-lg text-text-tertiary hover:text-accent-primary hover:bg-bg-tertiary transition-all duration-200 min-h-[40px] min-w-[40px] flex items-center justify-center"
            title="Edit collection"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Name */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-secondary">Name</span>
          <span className="text-xs font-mono text-text-primary">{collection.name}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-secondary">Display Name</span>
          <span className="text-xs text-text-primary">{collection.display_name || '—'}</span>
        </div>
        {isDefault && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-secondary">Type</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent-primary/10 text-accent-primary">Default Collection</span>
          </div>
        )}
      </div>

      {/* Description */}
      {collection.description && (
        <div className="mb-4 p-3 bg-bg-secondary rounded-lg border border-border-subtle">
          <span className="text-[10px] text-text-tertiary uppercase tracking-wider">Description</span>
          <p className="text-xs text-text-secondary mt-1">{collection.description}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-bg-secondary rounded-lg border border-border-subtle">
        <div>
          <span className="text-[10px] sm:text-xs text-text-tertiary">Documents</span>
          <p className="text-sm font-mono text-text-primary">{formatNumber(collection.document_count)}</p>
        </div>
        <div>
          <span className="text-[10px] sm:text-xs text-text-tertiary">Chunks</span>
          <p className="text-sm font-mono text-text-primary">{formatNumber(collection.chunk_count)}</p>
        </div>
        {collection.counts_are_estimated && (
          <div className="col-span-2">
            <span className="text-[10px] text-status-warning">⚠ Counts are estimated and may not be accurate</span>
          </div>
        )}
      </div>

      {/* Timestamps */}
      {(collection.created_at || collection.updated_at) && (
        <div className="mb-4 p-3 bg-bg-secondary rounded-lg border border-border-subtle space-y-1">
          {collection.created_at && (
            <div className="flex justify-between">
              <span className="text-[10px] text-text-tertiary">Created</span>
              <span className="text-[10px] text-text-secondary">{new Date(collection.created_at).toLocaleString()}</span>
            </div>
          )}
          {collection.updated_at && collection.updated_at !== collection.created_at && (
            <div className="flex justify-between">
              <span className="text-[10px] text-text-tertiary">Updated</span>
              <span className="text-[10px] text-text-secondary">{new Date(collection.updated_at).toLocaleString()}</span>
            </div>
          )}
        </div>
      )}

      {/* Metadata */}
      {Object.keys(collection.metadata).length > 0 && (
        <div className="mb-4">
          <span className="text-[10px] text-text-tertiary uppercase tracking-wider">Metadata</span>
          <RawJsonPanel data={collection.metadata} label="Collection Metadata" collapsible />
        </div>
      )}
    </div>
  );
};

export default CollectionDetailPanel;
