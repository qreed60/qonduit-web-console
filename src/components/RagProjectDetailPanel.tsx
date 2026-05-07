import React from 'react';
import { Database, FileText, Calendar } from 'lucide-react';
import { RagIngestionProjectStatus, RagCollectionListResponse, RagEndpointError } from '../types';
import RawJsonPanel from './RawJsonPanel';
import EndpointErrorInline from './EndpointErrorInline';

interface RagProjectDetailPanelProps {
  status: RagIngestionProjectStatus | null;
  collections: RagCollectionListResponse | null;
  collectionsError: RagEndpointError | null;
  statusError: RagEndpointError | null;
}

const STATE_COLORS: Record<string, string> = {
  idle: 'text-text-tertiary',
  queued: 'text-status-warning',
  running: 'text-status-warning',
  success: 'text-status-success',
  failed: 'text-status-error',
  unknown: 'text-text-tertiary',
};

const STATE_BG: Record<string, string> = {
  idle: 'bg-text-tertiary/10',
  queued: 'bg-status-warning/10',
  running: 'bg-status-warning/10',
  success: 'bg-status-success/10',
  failed: 'bg-status-error/10',
  unknown: 'bg-text-tertiary/10',
};

const RagProjectDetailPanel: React.FC<RagProjectDetailPanelProps> = ({
  status,
  collections,
  collectionsError,
  statusError,
}) => {
  if (!status) {
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

  const stateColor = STATE_COLORS[status.state] || STATE_COLORS.unknown;
  const stateBg = STATE_BG[status.state] || STATE_BG.unknown;

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

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
          <span className="text-xs font-mono text-text-primary">{status.project_id}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-secondary">Qdrant Collection</span>
          <span className="text-xs font-mono text-text-primary">qonduit_rag__{status.project_id}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-secondary">State</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${stateBg} ${stateColor}`}>
            {status.state}
          </span>
        </div>
      </div>

      {/* Ingestion stats */}
      <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-bg-secondary rounded-lg border border-border-subtle">
        <div>
          <span className="text-[10px] text-text-tertiary">Chunks Embedded</span>
          <p className="text-sm font-mono text-text-primary">{status.chunks_embedded ?? 0}</p>
        </div>
        <div>
          <span className="text-[10px] text-text-tertiary">Chunks Written</span>
          <p className="text-sm font-mono text-text-primary">{status.chunks_written ?? 0}</p>
        </div>
        <div>
          <span className="text-[10px] text-text-tertiary">Files Scanned</span>
          <p className="text-sm font-mono text-text-primary">{status.files_scanned ?? 0}</p>
        </div>
        <div>
          <span className="text-[10px] text-text-tertiary">Skipped Files</span>
          <p className="text-sm font-mono text-text-primary">{status.skipped_files ?? 0}</p>
        </div>
      </div>

      {/* Current file */}
      {status.current_file && (
        <div className="mb-4 p-3 bg-bg-secondary rounded-lg border border-border-subtle">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-3 h-3 text-text-tertiary" />
            <span className="text-[10px] text-text-tertiary">Current File</span>
          </div>
          <p className="text-xs font-mono text-text-primary truncate" title={status.current_file}>
            {status.current_file}
          </p>
        </div>
      )}

      {/* Timestamps */}
      <div className="space-y-1 mb-4">
        <div className="flex items-center gap-2 text-[10px] text-text-tertiary">
          <Calendar className="w-3 h-3" />
          <span>Last Started:</span>
          <span className="text-text-secondary font-mono">{formatDate(status.last_started_at)}</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-text-tertiary">
          <Calendar className="w-3 h-3" />
          <span>Last Finished:</span>
          <span className="text-text-secondary font-mono">{formatDate(status.last_finished_at)}</span>
        </div>
      </div>

      {/* Last error */}
      {status.last_error && (
        <div className="mb-4 p-3 bg-status-error/5 border border-status-error/15 rounded-lg">
          <span className="text-[10px] text-status-error font-medium">Last Error:</span>
          <p className="text-[10px] text-status-error/80 font-mono mt-0.5 break-all">{status.last_error}</p>
        </div>
      )}

      {/* Logical collections */}
      <div className="mb-2">
        <span className="text-[10px] text-text-tertiary uppercase tracking-wider">Logical Collections</span>
        {collectionsError ? (
          <p className="text-xs text-status-error mt-1">Unable to fetch collections</p>
        ) : !collections || collections.collections.length === 0 ? (
          <p className="text-xs text-text-tertiary mt-1">No marker collections found</p>
        ) : (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {collections.collections.map(name => (
              <span
                key={name}
                className="px-2 py-1 rounded text-[10px] bg-bg-secondary text-text-secondary font-mono border border-border-subtle"
              >
                {name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Raw JSON panels */}
      <RawJsonPanel data={status.raw} label="Raw status JSON" />
      {collections && <RawJsonPanel data={collections as unknown as Record<string, unknown>} label="Raw collections JSON" />}

      <EndpointErrorInline error={statusError} />
      <EndpointErrorInline error={collectionsError} />
    </div>
  );
};

export default RagProjectDetailPanel;
