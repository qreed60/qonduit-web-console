import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { RagEndpointError } from '../types';

interface EndpointErrorInlineProps {
  error: RagEndpointError | null;
  onRefresh?: () => void;
  compact?: boolean;
}

const EndpointErrorInline: React.FC<EndpointErrorInlineProps> = ({
  error,
  onRefresh,
  compact = false,
}) => {
  if (!error) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-2 mt-2 text-[10px] text-status-error">
        <AlertCircle className="w-3 h-3 flex-shrink-0" />
        <span className="truncate">{error.message}</span>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="flex items-center gap-1 text-status-error hover:text-status-error/80 ml-1"
          >
            <RefreshCw className="w-2.5 h-2.5" />
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="mt-3 p-3 bg-status-error/5 border border-status-error/15 rounded-lg">
      <div className="flex items-center gap-2 mb-1">
        <AlertCircle className="w-3.5 h-3.5 text-status-error flex-shrink-0" />
        <span className="text-xs font-medium text-status-error">Endpoint Error</span>
      </div>
      <p className="text-[10px] text-status-error/80 font-mono break-all leading-relaxed">
        {error.message}
      </p>
      {error.url && (
        <p className="text-[10px] text-text-tertiary font-mono mt-1 truncate" title={error.url}>
          URL: {error.url}
        </p>
      )}
      {error.status && (
        <p className="text-[10px] text-text-tertiary mt-0.5">
          Status: {error.status} {error.statusText || ''}
        </p>
      )}
      {error.bodyPreview && (
        <p className="text-[10px] text-text-tertiary font-mono mt-1 break-all">
          Response: {error.bodyPreview}
        </p>
      )}
      {onRefresh && (
        <button
          onClick={onRefresh}
          className="mt-2 px-3 py-1 rounded text-xs font-medium bg-status-error/10 text-status-error hover:bg-status-error/20 transition-colors flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" />
          Retry
        </button>
      )}
    </div>
  );
};

export default EndpointErrorInline;
