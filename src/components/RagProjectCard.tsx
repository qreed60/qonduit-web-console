import React from 'react';
import { RefreshCw, Loader2, Database } from 'lucide-react';
import { RagIngestionProjectStatus } from '../types';
import EndpointErrorInline from './EndpointErrorInline';

interface RagProjectCardProps {
  status: RagIngestionProjectStatus;
  isSelected: boolean;
  onSelect: (projectId: string) => void;
  onRefresh: (projectId: string) => void;
  refreshing: boolean;
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

const RagProjectCard: React.FC<RagProjectCardProps> = ({
  status,
  isSelected,
  onSelect,
  onRefresh,
  refreshing,
}) => {
  const stateColor = STATE_COLORS[status.state] || STATE_COLORS.unknown;
  const stateBg = STATE_BG[status.state] || STATE_BG.unknown;

  return (
    <div
      className={`bg-bg-card rounded-xl border p-4 cursor-pointer transition-all duration-200 hover:border-border-primary/60 ${
        isSelected
          ? 'border-accent-primary/40 bg-accent-primary/5 shadow-card-hover'
          : 'border-border-primary'
      }`}
      onClick={() => onSelect(status.project_id)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Database className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-accent-primary' : 'text-text-tertiary'}`} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-primary truncate">{status.project_id}</p>
            <p className="text-[10px] font-mono text-text-tertiary truncate" title={status.project_id}>
              qonduit_rag__{status.project_id}
            </p>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRefresh(status.project_id);
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

      {/* State badge */}
      <div className="flex items-center gap-2 mb-3">
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${stateBg} ${stateColor}`}>
          {status.state}
        </span>
        {status.queued_position !== undefined && (
          <span className="text-[10px] text-text-tertiary">
            position #{status.queued_position}
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="text-[10px] text-text-tertiary">Chunks</span>
          <p className="text-xs font-mono text-text-primary">
            {status.chunks_embedded ?? 0} / {status.chunks_written ?? 0}
          </p>
        </div>
        <div>
          <span className="text-[10px] text-text-tertiary">Files</span>
          <p className="text-xs font-mono text-text-primary">
            {status.files_scanned ?? 0} scanned
            {status.skipped_files ? ` / ${status.skipped_files} skipped` : ''}
          </p>
        </div>
      </div>

      {/* Current file */}
      {status.current_file && (
        <div className="mt-2">
          <span className="text-[10px] text-text-tertiary">Current file:</span>
          <p className="text-[10px] font-mono text-text-secondary truncate" title={status.current_file}>
            {status.current_file}
          </p>
        </div>
      )}

      {/* Last error */}
      {status.last_error && (
        <div className="mt-2">
          <span className="text-[10px] text-status-error">Error:</span>
          <p className="text-[10px] text-status-error/80 font-mono truncate" title={status.last_error}>
            {status.last_error}
          </p>
        </div>
      )}

      <EndpointErrorInline error={status.error || null} compact />
    </div>
  );
};

export default RagProjectCard;
