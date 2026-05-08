import React from 'react';
import { FileText, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { RagDocumentSummary, RagEndpointError } from '../types';
import EndpointErrorInline from './EndpointErrorInline';

interface RagDocumentsCardProps {
  documents: RagDocumentSummary[];
  documentsError: RagEndpointError | null;
  projectId: string;
  selectedDocumentId: string | null;
  onSelectDocument: (documentId: string) => void;
  loading: boolean;
  onRefresh: () => void;
  refreshing: boolean;
}

const RagDocumentsCard: React.FC<RagDocumentsCardProps> = ({
  documents,
  documentsError,
  projectId,
  selectedDocumentId,
  onSelectDocument,
  loading,
  onRefresh,
  refreshing,
}) => {
  const formatNumber = (n: number): string => n.toLocaleString();

  const truncatePath = (path: string, maxLen: number = 40): string => {
    if (path.length <= maxLen) return path;
    return '...' + path.slice(-maxLen + 3);
  };

  return (
      <div className="bg-bg-card rounded-xl border border-border-primary p-4 sm:p-5 shadow-card">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <FileText className="w-4 h-4 text-accent-primary" />
            Documents
          </h3>
          <button
            onClick={onRefresh}
            disabled={refreshing || loading}
            className="p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-all duration-200 disabled:opacity-50 min-h-[36px] min-w-[36px] flex items-center justify-center"
            title="Refresh documents"
          >
            {refreshing || loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </button>
        </div>
  
        <p className="text-[10px] sm:text-xs text-text-tertiary mb-3">
          Project: <span className="font-mono text-text-secondary">{projectId}</span> · {documents.length} document{documents.length !== 1 ? 's' : ''}
        </p>
  
        {documentsError ? (
          <div className="flex items-center gap-2 text-xs text-status-error">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Unable to fetch documents</span>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-text-tertiary" />
          </div>
        ) : documents.length === 0 ? (
          <div className="flex items-center gap-2 text-xs text-text-tertiary py-8">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>No documents found.</span>
          </div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {documents.map((doc) => (
              <div
                key={doc.document_id}
                className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                  selectedDocumentId === doc.document_id
                    ? 'border-accent-primary/40 bg-accent-primary/5'
                    : 'border-border-subtle bg-bg-secondary hover:border-border-primary'
                }`}
                onClick={() => onSelectDocument(doc.document_id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-text-primary truncate">{doc.document_name}</p>
                    {doc.file_path && (
                      <p className="text-[10px] sm:text-xs font-mono text-text-tertiary truncate mt-0.5" title={doc.file_path}>
                        {truncatePath(doc.file_path)}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] sm:text-xs font-mono text-text-tertiary flex-shrink-0">
                    {formatNumber(doc.chunk_count)} chunks
                  </span>
                </div>
  
                {/* Metadata chips — horizontal scroll on mobile */}
                <div className="flex flex-wrap gap-1 mt-2 overflow-x-auto -mx-1 px-1">
                  {doc.file_type && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] bg-bg-tertiary text-text-tertiary font-mono flex-shrink-0">
                      {doc.file_type}
                    </span>
                  )}
                  {doc.source && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] bg-bg-tertiary text-text-tertiary font-mono flex-shrink-0">
                      {doc.source}
                    </span>
                  )}
                  {(doc.metadata?.conversation_title as string | undefined) && (
                                    <span
                                      className="px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] bg-accent-primary/10 text-accent-primary font-mono truncate max-w-[120px] flex-shrink-0"
                                      title={String(doc.metadata?.conversation_title)}
                                    >
                                      {String(doc.metadata?.conversation_title)}
                                    </span>
                                  )}
                </div>
              </div>
            ))}
          </div>
        )}
  
        <EndpointErrorInline error={documentsError} />
      </div>
    );
};

export default RagDocumentsCard;
