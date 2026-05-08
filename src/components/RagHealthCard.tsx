import React from 'react';
import { RefreshCw, Server, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { RagHealthResponse, RagEndpointError } from '../types';
import EndpointErrorInline from './EndpointErrorInline';

interface RagHealthCardProps {
  health: RagHealthResponse | null;
  healthError: RagEndpointError | null;
  healthLastChecked: number | null;
  gatewayUrl: string;
  onRefresh: () => void;
  refreshing: boolean;
}

const RagHealthCard: React.FC<RagHealthCardProps> = ({
  health,
  healthError,
  healthLastChecked,
  gatewayUrl,
  onRefresh,
  refreshing,
}) => {
  const formatTimeAgo = (ts: number | null) => {
    if (!ts) return null;
    const diff = Date.now() - ts;
    const secs = Math.floor(diff / 1000);
    if (secs < 10) return 'just now';
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    return `${mins}m ago`;
  };

  return (
    <div className="bg-bg-card rounded-xl border border-border-primary p-5 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <Server className="w-4 h-4 text-accent-primary" />
          RAG Service Health
        </h3>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-all duration-200 disabled:opacity-50"
          title="Refresh health"
        >
          {refreshing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Gateway URL */}
      <div className="mb-3">
        <p className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">Gateway</p>
        <p className="text-xs font-mono text-text-secondary truncate" title={gatewayUrl}>
          {gatewayUrl}
        </p>
      </div>

      {/* Status indicators */}
      <div className="space-y-2">
        {/* Gateway status */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-secondary">Gateway</span>
          <div className="flex items-center gap-1.5">
            {healthError ? (
              <>
                <XCircle className="w-3.5 h-3.5 text-status-error" />
                <span className="text-xs text-status-error">Unreachable</span>
              </>
            ) : health ? (
              <>
                {health.ok ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-status-success" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-status-warning" />
                )}
                <span className={`text-xs ${health.ok ? 'text-status-success' : 'text-status-warning'}`}>
                  {health.ok ? 'OK' : 'Error'}
                </span>
              </>
            ) : (
              <span className="text-xs text-text-tertiary">Pending...</span>
            )}
          </div>
        </div>

        {/* Qdrant */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-secondary">Qdrant</span>
          <div className="flex items-center gap-1.5">
            {healthError ? (
              <span className="text-xs text-text-tertiary">Unknown</span>
            ) : health ? (
              <>
                {health.qdrant.ok ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-status-success" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-status-error" />
                )}
                <span className={`text-xs ${health.qdrant.ok ? 'text-status-success' : 'text-status-error'}`}>
                  {health.qdrant.ok ? 'Connected' : 'Disconnected'}
                </span>
              </>
            ) : (
              <span className="text-xs text-text-tertiary">—</span>
            )}
          </div>
        </div>

        {/* Qdrant URL */}
        {health?.qdrant.ok && health.qdrant.url && (
          <div className="ml-5">
            <p className="text-[10px] font-mono text-text-tertiary truncate" title={health.qdrant.url}>
              {health.qdrant.url}
            </p>
          </div>
        )}

        {/* Embeddings */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-secondary">Embeddings</span>
          <div className="flex items-center gap-1.5">
            {healthError ? (
              <span className="text-xs text-text-tertiary">Unknown</span>
            ) : health ? (
              <>
                {health.embedding.ok ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-status-success" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-status-error" />
                )}
                <span className={`text-xs ${health.embedding.ok ? 'text-status-success' : 'text-status-error'}`}>
                  {health.embedding.ok ? 'Available' : 'Unavailable'}
                </span>
              </>
            ) : (
              <span className="text-xs text-text-tertiary">—</span>
            )}
          </div>
        </div>

        {/* Embedding model info */}
        {health?.embedding.ok && (health.embedding.model || health.embedding.dimension > 0) && (
          <div className="ml-5 flex items-center gap-3">
            {health.embedding.model && (
              <p className="text-[10px] font-mono text-text-tertiary truncate" title={health.embedding.model}>
                {health.embedding.model}
              </p>
            )}
            {health.embedding.dimension > 0 && (
              <p className="text-[10px] text-text-tertiary">
                dim: {health.embedding.dimension}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Timestamps */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border-subtle">
        {healthLastChecked && (
          <span className="text-[10px] text-text-tertiary">
            Health checked: {formatTimeAgo(healthLastChecked)}
          </span>
        )}
      </div>

      {/* Errors */}
      <EndpointErrorInline error={healthError} compact />
    </div>
  );
};

export default RagHealthCard;
