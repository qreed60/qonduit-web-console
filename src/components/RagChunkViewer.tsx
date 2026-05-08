import React, { useState } from 'react';
import { ChevronDown, ChevronUp, FileText, Loader2, AlertCircle } from 'lucide-react';
import { RagChunk, RagEndpointError } from '../types';
import RawJsonPanel from './RawJsonPanel';
import EndpointErrorInline from './EndpointErrorInline';

interface RagChunkViewerProps {
  chunks: RagChunk[];
  chunksError: RagEndpointError | null;
  chunksLoading: boolean;
  documentName?: string;
}

const RagChunkViewer: React.FC<RagChunkViewerProps> = ({
  chunks,
  chunksError,
  chunksLoading,
  documentName,
}) => {
  const [expandedChunks, setExpandedChunks] = useState<Set<number>>(new Set());
  const [expandedRaw, setExpandedRaw] = useState<number | null>(null);

  const toggleChunk = (index: number) => {
    setExpandedChunks(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const toggleRaw = (index: number) => {
    setExpandedRaw(prev => prev === index ? null : index);
  };

  const truncateText = (text: string, maxLen: number = 300): string => {
    if (text.length <= maxLen) return text;
    return text.substring(0, maxLen) + '...';
  };

  return (
    <div className="bg-bg-card rounded-xl border border-border-primary p-5 shadow-card">
      <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2 mb-1">
        <FileText className="w-4 h-4 text-accent-primary" />
        Chunk Viewer
      </h3>
      {documentName && (
        <p className="text-[10px] text-text-tertiary mb-4 truncate" title={documentName}>
          Document: {documentName}
        </p>
      )}

      {chunksError ? (
        <div className="flex items-center gap-2 text-xs text-status-error">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Unable to fetch chunks</span>
        </div>
      ) : chunksLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-text-tertiary" />
        </div>
      ) : chunks.length === 0 ? (
        <div className="flex items-center gap-2 text-xs text-text-tertiary py-8">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>No chunks found for this document.</span>
        </div>
      ) : (
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
          {chunks.map((chunk, idx) => {
            const isExpanded = expandedChunks.has(idx);
            return (
              <div
                key={chunk.id || idx}
                className="bg-bg-secondary border border-border-subtle rounded-lg overflow-hidden"
              >
                {/* Chunk header */}
                <div
                  className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-bg-tertiary transition-colors"
                  onClick={() => toggleChunk(idx)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-text-tertiary">
                      Chunk #{idx + 1}
                    </span>
                    <span className="text-[10px] font-mono text-text-tertiary">
                      index: {chunk.chunk_index}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-text-tertiary">
                      {chunk.text.length} chars
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5 text-text-tertiary" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-text-tertiary" />
                    )}
                  </div>
                </div>

                {/* Chunk content */}
                {isExpanded && (
                  <div className="px-3 pb-3 space-y-2">
                    {/* Text preview/full */}
                    <div>
                      <p className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">Text</p>
                      <p className="text-xs text-text-primary whitespace-pre-wrap leading-relaxed">
                        {isExpanded ? chunk.text : truncateText(chunk.text)}
                      </p>
                    </div>

                    {/* Payload metadata */}
                    {chunk.payload && Object.keys(chunk.payload).length > 0 && (
                      <div>
                        <p className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">Metadata</p>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(chunk.payload).map(([key, value]) => (
                            <span
                              key={key}
                              className="px-1.5 py-0.5 rounded text-[9px] bg-bg-tertiary text-text-tertiary font-mono"
                              title={`${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`}
                            >
                              {key}={typeof value === 'string' ? value : JSON.stringify(value).substring(0, 30)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Raw JSON */}
                    <button
                      onClick={() => toggleRaw(idx)}
                      className="text-[10px] text-accent-primary hover:text-accent-primary-hover transition-colors"
                    >
                      {expandedRaw === idx ? 'Hide raw JSON' : 'Show raw JSON'}
                    </button>
                    {expandedRaw === idx && (
                      <RawJsonPanel data={chunk as unknown as Record<string, unknown>} label="" />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <EndpointErrorInline error={chunksError} />
    </div>
  );
};

export default RagChunkViewer;
