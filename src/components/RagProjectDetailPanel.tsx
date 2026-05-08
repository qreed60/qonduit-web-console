import React from 'react';
import { Database } from 'lucide-react';
import { RagProjectDetail, RagProjectStats, RagEndpointError } from '../types';
import RawJsonPanel from './RawJsonPanel';
import EndpointErrorInline from './EndpointErrorInline';

interface RagProjectDetailPanelProps {
  detail: RagProjectDetail | null;
  stats: RagProjectStats | null;
  detailError: RagEndpointError | null;
  statsError: RagEndpointError | null;
}

const RagProjectDetailPanel: React.FC<RagProjectDetailPanelProps> = ({
  detail,
  stats,
  detailError,
  statsError,
}) => {
  if (!detail) {
    return (
      <div className="bg-bg-card rounded-xl border border-border-primary p-5 shadow-card">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2 mb-4">
          <Database className="w-4 h-4 text-accent-primary" />
          Project Detail
        </h3>
        <p className="text-xs text-text-tertiary">Select a project from the cards above to view details.</p>
      </div>
    );
  }

  const formatNumber = (n: number): string => n.toLocaleString();

  return (
    <div className="bg-bg-card rounded-xl border border-border-primary p-5 shadow-card">
      <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2 mb-4">
        <Database className="w-4 h-4 text-accent-primary" />
        Project Detail
      </h3>

      {/* Project info */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-secondary">Project ID</span>
          <span className="text-xs font-mono text-text-primary">{detail.project_id}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-secondary">Qdrant Collection</span>
          <span className="text-xs font-mono text-text-primary">{detail.qdrant_collection}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-secondary">Status</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
            detail.exists
              ? 'bg-status-success/10 text-status-success'
              : 'bg-text-tertiary/10 text-text-tertiary'
          }`}>
            {detail.exists ? 'Exists' : 'Not Found'}
          </span>
        </div>
      </div>

      {/* Stats from /stats endpoint */}
      {stats && (
        <div className="grid grid-cols-3 gap-3 mb-4 p-3 bg-bg-secondary rounded-lg border border-border-subtle">
          <div>
            <span className="text-[10px] text-text-tertiary">Points</span>
            <p className="text-sm font-mono text-text-primary">{formatNumber(stats.points_count)}</p>
          </div>
          <div>
            <span className="text-[10px] text-text-tertiary">Vectors</span>
            <p className="text-sm font-mono text-text-primary">{formatNumber(stats.vectors_count)}</p>
          </div>
          <div>
            <span className="text-[10px] text-text-tertiary">Indexed</span>
            <p className="text-sm font-mono text-text-primary">{formatNumber(stats.indexed_vectors_count)}</p>
          </div>
        </div>
      )}

      {/* Status from /stats endpoint */}
      {stats && (
        <div className="mb-4">
          <span className="text-[10px] text-text-tertiary uppercase tracking-wider">Health Status</span>
          <div className="mt-1">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
              stats.status === 'green'
                ? 'bg-status-success/10 text-status-success'
                : stats.status === 'yellow'
                ? 'bg-status-warning/10 text-status-warning'
                : 'bg-status-error/10 text-status-error'
            }`}>
              {stats.status}
            </span>
          </div>
        </div>
      )}

      {/* Logical collections */}
      {detail.logical_collections && detail.logical_collections.length > 0 && (
        <div className="mb-4">
          <span className="text-[10px] text-text-tertiary uppercase tracking-wider">Logical Collections</span>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {detail.logical_collections.map(name => (
              <span
                key={name}
                className="px-2 py-1 rounded text-[10px] bg-bg-secondary text-text-secondary font-mono border border-border-subtle"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {detail.error && (
        <div className="mb-4 p-3 bg-status-error/5 border border-status-error/15 rounded-lg">
          <span className="text-[10px] text-status-error font-medium">Error:</span>
          <p className="text-[10px] text-status-error/80 font-mono mt-0.5 break-all">{detail.error}</p>
        </div>
      )}

      {/* Raw JSON panels */}
      <RawJsonPanel data={detail as unknown as Record<string, unknown>} label="Raw detail JSON" />
      {stats && <RawJsonPanel data={stats as unknown as Record<string, unknown>} label="Raw stats JSON" />}

      <EndpointErrorInline error={detailError} />
      <EndpointErrorInline error={statsError} />
    </div>
  );
};

export default RagProjectDetailPanel;
