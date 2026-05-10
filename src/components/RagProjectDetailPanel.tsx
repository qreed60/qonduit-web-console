import React from 'react';
import { Database } from 'lucide-react';
import { RagProjectDetail, RagProjectStats, RagEndpointError, RagRegistryProject } from '../types';
import RawJsonPanel from './RawJsonPanel';
import EndpointErrorInline from './EndpointErrorInline';

interface RagProjectDetailPanelProps {
  detail: RagProjectDetail | null;
  stats: RagProjectStats | null;
  detailError: RagEndpointError | null;
  statsError: RagEndpointError | null;
  registryProject?: RagRegistryProject | null;
}

const RagProjectDetailPanel: React.FC<RagProjectDetailPanelProps> = ({
  detail,
  stats,
  detailError,
  statsError,
  registryProject,
}) => {
  // Use registry project data if available, otherwise fall back to legacy detail
  const project = registryProject || null;
  const displayName = project?.display_name || detail?.project_id || '';
  const description = project?.description || null;

  if (!detail && !project) {
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

      {/* Registry info (if available) */}
      {project && (
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-secondary">Display Name</span>
            <span className="text-sm font-semibold text-text-primary">{displayName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-secondary">Project ID</span>
            <span className="text-xs font-mono text-text-primary">{project.project_id}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-secondary">Qdrant Collection</span>
            <span className="text-xs font-mono text-text-primary">{project.qdrant_collection}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-secondary">Default Collection</span>
            <span className="text-xs font-mono text-text-primary">{project.default_collection}</span>
          </div>
          {description && (
            <div className="mt-2 p-3 bg-bg-secondary rounded-lg border border-border-subtle">
              <span className="text-[10px] text-text-tertiary uppercase tracking-wider">Description</span>
              <p className="text-xs text-text-secondary mt-1">{description}</p>
            </div>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
              project.exists_in_qdrant
                ? 'bg-status-success/10 text-status-success'
                : 'bg-text-tertiary/10 text-text-tertiary'
            }`}>
              {project.exists_in_qdrant ? 'Exists in Qdrant' : 'Not Found'}
            </span>
            {project.discovered && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-status-warning/10 text-status-warning">
                Discovered
              </span>
            )}
          </div>
          {project.created_at && (
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-text-tertiary">Created</span>
              <span className="text-[10px] text-text-secondary">{new Date(project.created_at).toLocaleString()}</span>
            </div>
          )}
        </div>
      )}

      {/* Legacy detail info (if no registry project) */}
      {!project && detail && (
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
      )}

      {/* Stats from /stats endpoint */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 p-3 bg-bg-secondary rounded-lg border border-border-subtle">
          <div>
            <span className="text-[10px] sm:text-xs text-text-tertiary">Points</span>
            <p className="text-sm font-mono text-text-primary">{formatNumber(stats.points_count)}</p>
          </div>
          <div>
            <span className="text-[10px] sm:text-xs text-text-tertiary">Vectors</span>
            <p className="text-sm font-mono text-text-primary">{formatNumber(stats.vectors_count)}</p>
          </div>
          <div>
            <span className="text-[10px] sm:text-xs text-text-tertiary">Indexed</span>
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
      {detail?.logical_collections && detail.logical_collections.length > 0 && (
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
      {detail?.error && (
        <div className="mb-4 p-3 bg-status-error/5 border border-status-error/15 rounded-lg">
          <span className="text-[10px] text-status-error font-medium">Error:</span>
          <p className="text-[10px] text-status-error/80 font-mono mt-0.5 break-all">{detail.error}</p>
        </div>
      )}
      {project?.error && (
        <div className="mb-4 p-3 bg-status-error/5 border border-status-error/15 rounded-lg">
          <span className="text-[10px] text-status-error font-medium">Registry Error:</span>
          <p className="text-[10px] text-status-error/80 font-mono mt-0.5 break-all">{project.error}</p>
        </div>
      )}

      {/* Raw JSON panels */}
      {project && <RawJsonPanel data={project as unknown as Record<string, unknown>} label="Registry Project JSON" />}
      {detail && <RawJsonPanel data={detail as unknown as Record<string, unknown>} label="Raw detail JSON" />}
      {stats && <RawJsonPanel data={stats as unknown as Record<string, unknown>} label="Raw stats JSON" />}

      <EndpointErrorInline error={detailError} />
      <EndpointErrorInline error={statsError} />
    </div>
  );
};

export default RagProjectDetailPanel;
