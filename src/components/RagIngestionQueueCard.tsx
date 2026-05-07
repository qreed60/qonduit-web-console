import React from 'react';
import { RefreshCw, Loader2, ListTodo, Activity, CheckCircle2, AlertCircle } from 'lucide-react';
import { RagIngestionDebug, RagEndpointError } from '../types';
import EndpointErrorInline from './EndpointErrorInline';

interface RagIngestionQueueCardProps {
  debug: RagIngestionDebug | null;
  debugError: RagEndpointError | null;
  onRefresh: () => void;
  refreshing: boolean;
}

/** Convert unknown values to display-safe strings */
function asDisplayString(value: unknown, fallback = 'unknown'): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return fallback;
}

const RagIngestionQueueCard: React.FC<RagIngestionQueueCardProps> = ({
  debug,
  debugError,
  onRefresh,
  refreshing,
}) => {
  const hasActiveJob = !!debug?.active_job;
  const hasQueue = (debug?.queue_length ?? 0) > 0;
  const isActive = hasActiveJob || hasQueue;

  const formatTimeAgo = (ts: string | undefined) => {
    if (!ts) return null;
    try {
      const date = new Date(ts);
      const diff = Date.now() - date.getTime();
      const secs = Math.floor(diff / 1000);
      if (secs < 10) return 'just now';
      if (secs < 60) return `${secs}s ago`;
      const mins = Math.floor(secs / 60);
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      return `${hours}h ago`;
    } catch {
      return ts;
    }
  };

  return (
    <div className="bg-bg-card rounded-xl border border-border-primary p-5 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
           <ListTodo className="w-4 h-4 text-accent-primary" />
           Ingestion Queue
         </h3>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-all duration-200 disabled:opacity-50"
          title="Refresh queue"
        >
          {refreshing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Worker state */}
      <div className="mb-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-secondary">Worker State</span>
          <span className={`text-xs font-medium ${isActive ? 'text-status-warning' : 'text-text-tertiary'}`}>
            {debug?.worker_state || 'unknown'}
          </span>
        </div>
      </div>

      {/* Queue length */}
      <div className="mb-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-secondary">Queue Length</span>
          <span className="text-xs font-mono text-text-primary">{debug?.queue_length ?? 0}</span>
        </div>
        {debug?.queue_project_ids && debug.queue_project_ids.length > 0 && (
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            {debug.queue_project_ids.map(pid => (
              <span key={pid} className="px-1.5 py-0.5 rounded text-[10px] bg-bg-tertiary text-text-tertiary font-mono">
                {pid}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Active job */}
      {debug?.active_job && (
        <div className="mb-3 p-3 bg-status-warning/5 border border-status-warning/15 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-3.5 h-3.5 text-status-warning" />
            <span className="text-xs font-medium text-status-warning">Active Job</span>
          </div>
          <div className="space-y-1">
            {debug.active_job.project_id && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-text-tertiary">Project</span>
                <span className="text-[10px] font-mono text-text-primary">{debug.active_job.project_id}</span>
              </div>
            )}
            {debug.active_job.branch && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-text-tertiary">Branch</span>
                <span className="text-[10px] font-mono text-text-primary">{debug.active_job.branch}</span>
              </div>
            )}
            {debug.active_job.current_file && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-text-tertiary">File</span>
                <span className="text-[10px] font-mono text-text-primary truncate max-w-[200px]" title={debug.active_job.current_file}>
                  {debug.active_job.current_file}
                </span>
              </div>
            )}
            <div className="flex items-center gap-3 mt-2">
              <span className="text-[10px] text-text-tertiary">
                Chunks: <span className="text-text-primary font-mono">{debug.active_job.chunks_embedded ?? 0}</span> embedded / <span className="text-text-primary font-mono">{debug.active_job.chunks_written ?? 0}</span> written
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Chunk totals */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <span className="text-[10px] text-text-tertiary">Total Chunks Embedded</span>
          <p className="text-sm font-mono text-text-primary">{debug?.chunks_embedded ?? 0}</p>
        </div>
        <div>
          <span className="text-[10px] text-text-tertiary">Total Chunks Written</span>
          <p className="text-sm font-mono text-text-primary">{debug?.chunks_written ?? 0}</p>
        </div>
      </div>

      {/* Recent completed */}
      {debug?.recent_completed && debug.recent_completed.length > 0 && (
         <div className="mb-3">
           <span className="text-[10px] text-text-tertiary uppercase tracking-wider">Recent Completed</span>
           <div className="mt-1 space-y-1">
             {debug.recent_completed.slice(0, 3).map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-[10px] text-text-secondary">
                  <CheckCircle2 className="w-3 h-3 text-status-success flex-shrink-0" />
                  <span className="truncate">
                    {asDisplayString(item.project_id ?? item.project ?? item.file)}
                  </span>
                  <span className="text-text-tertiary ml-auto flex-shrink-0">
                    {formatTimeAgo(asDisplayString(item.completed_at))}
                  </span>
                </div>
              ))}
           </div>
         </div>
       )}

      {/* Recent failed */}
      {debug?.recent_failed && debug.recent_failed.length > 0 && (
              <div className="mb-3">
                <span className="text-[10px] text-text-tertiary uppercase tracking-wider">Recent Failed</span>
                <div className="mt-1 space-y-1">
                  {debug.recent_failed.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-[10px] text-status-error">
                        <AlertCircle className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">
                          {asDisplayString(item.project_id ?? item.project ?? item.file)}
                        </span>
                        <span className="text-text-tertiary ml-auto flex-shrink-0">
                          {formatTimeAgo(asDisplayString(item.failed_at))}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

      {/* Last error */}
      {debug?.last_error && (
        <div className="mb-2 p-2 bg-status-error/5 border border-status-error/15 rounded">
          <span className="text-[10px] text-status-error font-medium">Last Error:</span>
          <p className="text-[10px] text-status-error/80 font-mono mt-0.5 break-all">{debug.last_error}</p>
        </div>
      )}

      {/* Updated */}
      <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
        <span className="text-[10px] text-text-tertiary">
          Updated: {formatTimeAgo(debug?.updated_at)}
        </span>
      </div>

      <EndpointErrorInline error={debugError} />
    </div>
  );
};

export default RagIngestionQueueCard;
