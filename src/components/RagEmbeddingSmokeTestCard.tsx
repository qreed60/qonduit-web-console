import React from 'react';
import { Zap, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { RagEmbeddingSmokeTestResponse } from '../types';

interface RagEmbeddingSmokeTestCardProps {
  result: RagEmbeddingSmokeTestResponse | null;
  error: string | null;
  loading: boolean;
  onTest: () => void;
}

const RagEmbeddingSmokeTestCard: React.FC<RagEmbeddingSmokeTestCardProps> = ({
  result,
  error,
  loading,
  onTest,
}) => {
  return (
    <div className="bg-bg-card rounded-xl border border-border-primary p-5 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <Zap className="w-4 h-4 text-accent-primary" />
          Embedding Smoke Test
        </h3>
        <button
          onClick={onTest}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-accent-primary to-accent-tertiary hover:from-accent-primary-hover hover:to-accent-tertiary text-white shadow-lg shadow-accent-primary/20 transition-all duration-200 disabled:opacity-50 disabled:shadow-none flex items-center gap-1.5"
        >
          {loading ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <Zap className="w-3 h-3" />
              Test Embeddings
            </>
          )}
        </button>
      </div>

      <p className="text-[10px] text-text-tertiary mb-3">
        Sends a tiny embedding request to POST /v1/embeddings. Does not display the full vector.
      </p>

      {result?.ok && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-status-success" />
            <span className="text-xs text-status-success">Embedding generated successfully</span>
          </div>
          {result.model && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-text-tertiary">Model</span>
              <span className="text-[10px] font-mono text-text-primary">{result.model}</span>
            </div>
          )}
          {result.vector_length !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-text-tertiary">Vector dimension</span>
              <span className="text-[10px] font-mono text-text-primary">{result.vector_length}</span>
            </div>
          )}
        </div>
      )}

      {(error || result?.error) && (
        <div className="flex items-center gap-2">
          <XCircle className="w-4 h-4 text-status-error" />
          <span className="text-xs text-status-error">{error || result?.error}</span>
        </div>
      )}

      {!result && !error && !loading && (
        <p className="text-xs text-text-tertiary">Click "Test Embeddings" to verify the embedding endpoint is working.</p>
      )}
    </div>
  );
};

export default RagEmbeddingSmokeTestCard;
