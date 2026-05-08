import React, { useState } from 'react';
import { Search, Loader2, FileText, Database } from 'lucide-react';
import { RagSearchResponseNew, RagEndpointError } from '../types';
import RawJsonPanel from './RawJsonPanel';
import EndpointErrorInline from './EndpointErrorInline';

interface RagDiagnosticSearchCardProps {
  projectId: string;
  availableCollections: string[];
  searchResults: RagSearchResponseNew | null;
  searchError: RagEndpointError | null;
  searchLoading: boolean;
  onSearch: (query: string, limit: number, collection?: string | null) => void;
}

const RagDiagnosticSearchCard: React.FC<RagDiagnosticSearchCardProps> = ({
  projectId,
  availableCollections,
  searchResults,
  searchError,
  searchLoading,
  onSearch,
}) => {
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(4);
  const [collection, setCollection] = useState<string | undefined>(undefined);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    onSearch(query.trim(), limit, collection || undefined);
  };

  const truncateText = (text: string, maxLen: number = 300) => {
    if (text.length <= maxLen) return text;
    return text.substring(0, maxLen) + '...';
  };

  return (
      <div className="bg-bg-card rounded-xl border border-border-primary p-4 sm:p-5 shadow-card">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2 mb-1">
          <Search className="w-4 h-4 text-accent-primary" />
          Search
        </h3>
        <p className="text-[10px] sm:text-xs text-text-tertiary mb-3">
          Project: <span className="font-mono">{projectId}</span> · Uses POST /v1/rag/projects/{projectId}/search — explicit user-triggered only
        </p>
  
        {/* Search form — stacked on mobile */}
        <form onSubmit={handleSubmit} className="mb-4 space-y-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search query..."
            className="w-full px-3 py-2.5 bg-bg-secondary border border-border-primary rounded-lg text-xs text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent-primary/50 focus:ring-1 focus:ring-accent-primary/50 transition-all duration-200 min-h-[44px]"
          />
          <div className="flex gap-2">
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="flex-1 px-3 py-2.5 bg-bg-secondary border border-border-primary rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-primary/50 transition-all duration-200 min-h-[44px]"
            >
              {[2, 4, 8, 12, 20].map(n => (
                <option key={n} value={n}>{n} results</option>
              ))}
            </select>
            <select
              value={collection || ''}
              onChange={(e) => setCollection(e.target.value || undefined)}
              className="flex-1 px-3 py-2.5 bg-bg-secondary border border-border-primary rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-primary/50 transition-all duration-200 min-h-[44px]"
            >
              <option value="">All collections</option>
              {availableCollections.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={searchLoading || !query.trim()}
            className="w-full px-4 py-3 rounded-lg text-xs font-medium bg-gradient-to-r from-accent-primary to-accent-tertiary hover:from-accent-primary-hover hover:to-accent-tertiary text-white shadow-lg shadow-accent-primary/20 transition-all duration-200 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-1.5 min-h-[44px]"
          >
            {searchLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Search
              </>
            )}
          </button>
        </form>

      {/* Results */}
      {searchResults && searchResults.results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-text-tertiary">
              {searchResults.results.length} result{searchResults.results.length !== 1 ? 's' : ''} for "{searchResults.query}"
              {searchResults.limit > 0 && (
                <span className="ml-1">· limit: {searchResults.limit}</span>
              )}
            </span>
          </div>

          {searchResults.results.map((result, idx) => (
            <div
              key={result.id || idx}
              className="p-3 bg-bg-secondary border border-border-subtle rounded-lg"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-text-tertiary">#{idx + 1}</span>
                  <span className="text-[10px] font-mono text-text-secondary truncate max-w-[150px]" title={result.id}>
                    {result.id}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-accent-primary">
                  score: {result.score.toFixed(4)}
                </span>
              </div>

              {/* Text preview */}
              {result.text && (
                <p className="text-xs text-text-primary mt-1 leading-relaxed">
                  {truncateText(result.text)}
                </p>
              )}

              {/* Document info */}
              {(result.document_name || result.file_path || result.chunk_index !== undefined) && (
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  {result.document_name && (
                    <div className="flex items-center gap-1">
                      <FileText className="w-3 h-3 text-text-tertiary" />
                      <span className="text-[10px] font-mono text-text-tertiary truncate max-w-[150px]" title={result.document_name}>
                        {result.document_name}
                      </span>
                    </div>
                  )}
                  {result.file_path && (
                    <div className="flex items-center gap-1">
                      <Database className="w-3 h-3 text-text-tertiary" />
                      <span className="text-[10px] font-mono text-text-tertiary truncate max-w-[150px]" title={result.file_path}>
                        {result.file_path}
                      </span>
                    </div>
                  )}
                  {result.chunk_index !== undefined && (
                    <span className="text-[10px] font-mono text-text-tertiary">
                      chunk: {result.chunk_index}
                    </span>
                  )}
                </div>
              )}

              {/* Payload preview */}
              {result.payload && Object.keys(result.payload).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {Object.entries(result.payload).slice(0, 4).map(([key, value]) => (
                    <span
                      key={key}
                      className="px-1.5 py-0.5 rounded text-[9px] bg-bg-tertiary text-text-tertiary font-mono"
                      title={`${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`}
                    >
                      {key}={typeof value === 'string' ? value : JSON.stringify(value).substring(0, 30)}
                    </span>
                  ))}
                </div>
              )}

              <RawJsonPanel data={result as unknown as Record<string, unknown>} label="Raw result" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {searchResults && searchResults.results.length === 0 && !searchLoading && (
        <div className="text-center py-6 text-text-tertiary">
          <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-xs">No results found</p>
        </div>
      )}

      <EndpointErrorInline error={searchError} compact />
    </div>
  );
};

export default RagDiagnosticSearchCard;
