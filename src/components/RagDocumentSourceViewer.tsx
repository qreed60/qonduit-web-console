import React, { useState, useEffect, useCallback } from 'react';
import DetailDrawer from './DetailDrawer';
import { getRagDocumentSource } from '../services/ragApi';
import { RagDocumentSummary, RagDocumentSourceResponse } from '../types';
import { Loader2, Copy, AlertTriangle } from 'lucide-react';

interface RagDocumentSourceViewerProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  document: RagDocumentSummary;
  toastMessage: (msg: string, type: 'success' | 'error') => void;
}

const RagDocumentSourceViewer: React.FC<RagDocumentSourceViewerProps> = ({
  open,
  onClose,
  projectId,
  document,
  toastMessage,
}) => {
  const [sourceData, setSourceData] = useState<RagDocumentSourceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSource = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRagDocumentSource(projectId, document.document_id);
      setSourceData(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch source';
      setError(msg);
      toastMessage(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [projectId, document.document_id, toastMessage]);

  useEffect(() => {
    if (open) {
      fetchSource();
    }
  }, [open, fetchSource]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toastMessage('Copied to clipboard', 'success');
    } catch {
      toastMessage('Failed to copy', 'error');
    }
  };

  const textContent = sourceData?.text_full || sourceData?.text_preview || '';
  const hasWarnings = sourceData?.warnings && sourceData.warnings.length > 0;

  return (
    <DetailDrawer
      open={open}
      onClose={onClose}
      title={`Source: ${document.document_name}`}
      size="lg"
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-text-tertiary" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 text-sm text-status-error py-4">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      ) : sourceData ? (
        <div className="space-y-4">
          {/* Document info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-text-tertiary uppercase tracking-wide mb-1">Document Name</p>
              <p className="text-xs text-text-primary font-medium">{sourceData.document_name}</p>
            </div>
            <div>
              <p className="text-[10px] text-text-tertiary uppercase tracking-wide mb-1">Document ID</p>
              <p className="text-xs text-text-primary font-mono break-all">{sourceData.document_id}</p>
            </div>
            {sourceData.collection && (
              <div>
                <p className="text-[10px] text-text-tertiary uppercase tracking-wide mb-1">Collection</p>
                <p className="text-xs text-text-primary">{sourceData.collection}</p>
              </div>
            )}
            {sourceData.source_type && (
              <div>
                <p className="text-[10px] text-text-tertiary uppercase tracking-wide mb-1">Source Type</p>
                <p className="text-xs text-text-primary font-mono">{sourceData.source_type}</p>
              </div>
            )}
            {sourceData.file_type && (
              <div>
                <p className="text-[10px] text-text-tertiary uppercase tracking-wide mb-1">File Type</p>
                <p className="text-xs text-text-primary font-mono">{sourceData.file_type}</p>
              </div>
            )}
            {sourceData.parser && (
              <div>
                <p className="text-[10px] text-text-tertiary uppercase tracking-wide mb-1">Parser</p>
                <p className="text-xs text-text-primary font-mono">{sourceData.parser}</p>
              </div>
            )}
          </div>

          {/* Warnings */}
           {hasWarnings && sourceData.warnings && (
             <div className="bg-status-warning/10 border border-status-warning/30 rounded-lg p-3">
               <div className="flex items-center gap-2 mb-2">
                 <AlertTriangle className="w-4 h-4 text-status-warning flex-shrink-0" />
                 <p className="text-xs font-medium text-status-warning">Warnings</p>
               </div>
               <ul className="space-y-1">
                 {sourceData.warnings.map((w: string, i: number) => (
                   <li key={i} className="text-xs text-text-secondary font-mono">{w}</li>
                 ))}
               </ul>
             </div>
           )}

          {/* Metadata */}
          {sourceData.metadata && Object.keys(sourceData.metadata).length > 0 && (
            <div>
              <p className="text-[10px] text-text-tertiary uppercase tracking-wide mb-2">Metadata</p>
              <div className="bg-bg-secondary rounded-lg border border-border-subtle p-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(sourceData.metadata).map(([key, value]) => (
                    <div key={key}>
                      <p className="text-[10px] text-text-tertiary font-mono">{key}</p>
                      <p className="text-xs text-text-primary break-all">{String(value)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Text content */}
          {textContent && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-text-tertiary uppercase tracking-wide">
                  {sourceData.text_full ? 'Full Text' : 'Text Preview'}
                </p>
                <button
                  onClick={() => handleCopy(textContent)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  Copy
                </button>
              </div>
              <div className="bg-bg-secondary rounded-lg border border-border-subtle p-3 max-h-[400px] overflow-y-auto">
                <pre className="text-xs text-text-primary whitespace-pre-wrap break-words font-mono">
                  {textContent}
                </pre>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </DetailDrawer>
  );
};

export default RagDocumentSourceViewer;
