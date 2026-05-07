import React from 'react';
import { RefreshCw, Server, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { RagGatewayHealthResponse, GatewayModelsResponse, RagEndpointError } from '../types';
import EndpointErrorInline from './EndpointErrorInline';

interface RagHealthCardProps {
  health: RagGatewayHealthResponse | null;
  healthError: RagEndpointError | null;
  healthLastChecked: number | null;
  models: GatewayModelsResponse['models'] | null;
  modelsError: RagEndpointError | null;
  gatewayUrl: string;
  onRefresh: () => void;
  refreshing: boolean;
}

const RagHealthCard: React.FC<RagHealthCardProps> = ({
  health,
  healthError,
  healthLastChecked,
  models,
  modelsError,
  gatewayUrl,
  onRefresh,
  refreshing,
}) => {
  const isOnline = health?.status === 'ok' || health?.status === 'healthy';
  const hasQdrant = health?.qdrant_connected;
  const hasEmbeddings = health?.embedding_model_available;

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
                {isOnline ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-status-success" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-status-warning" />
                )}
                <span className={`text-xs ${isOnline ? 'text-status-success' : 'text-status-warning'}`}>
                  {health.status || 'unknown'}
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
            ) : hasQdrant === true ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-status-success" />
                <span className="text-xs text-status-success">Connected</span>
              </>
            ) : hasQdrant === false ? (
              <>
                <XCircle className="w-3.5 h-3.5 text-status-error" />
                <span className="text-xs text-status-error">Disconnected</span>
              </>
            ) : (
              <span className="text-xs text-text-tertiary">—</span>
            )}
          </div>
        </div>

        {/* Embeddings */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-secondary">Embeddings</span>
          <div className="flex items-center gap-1.5">
            {healthError ? (
              <span className="text-xs text-text-tertiary">Unknown</span>
            ) : hasEmbeddings === true ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-status-success" />
                <span className="text-xs text-status-success">Available</span>
              </>
            ) : hasEmbeddings === false ? (
              <>
                <XCircle className="w-3.5 h-3.5 text-status-error" />
                <span className="text-xs text-status-error">Unavailable</span>
              </>
            ) : (
              <span className="text-xs text-text-tertiary">—</span>
            )}
          </div>
        </div>

        {/* Models */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-secondary">Models</span>
          <div className="flex items-center gap-1.5">
            {modelsError ? (
              <span className="text-xs text-status-error truncate max-w-[120px]" title={modelsError.message}>
                Error
              </span>
            ) : models ? (
              <span className="text-xs text-text-secondary">
                {models.length} loaded
                {models.length > 0 && (
                  <span className="text-text-tertiary ml-1 truncate max-w-[120px] block">
                    {models.slice(0, 2).map(m => m.name).join(', ')}
                    {models.length > 2 ? ` +${models.length - 2}` : ''}
                  </span>
                )}
              </span>
            ) : (
              <span className="text-xs text-text-tertiary">—</span>
            )}
          </div>
        </div>
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
      <EndpointErrorInline error={modelsError} compact />
    </div>
  );
};

export default RagHealthCard;
