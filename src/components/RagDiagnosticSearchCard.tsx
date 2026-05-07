import React, { useState } from 'react';
import { Search, Loader2, FileText, Database } from 'lucide-react';
import { RagSearchResponse, RagSearchResult, RagEndpointError } from '../types';
import RawJsonPanel from './RawJsonPanel';
import EndpointErrorInline from './EndpointErrorInline';

interface RagDiagnosticSearchCardProps {
  projectId: string;
  availableCollections: string[];
  searchResults: RagSearchResponse | null;
  searchError: RagEndpointError | null;
  searchLoading: boolean;
  onSearch: (query: string, limit: number, collection?: string) => void;
}

const RagDiagnosticSearchCard: React.FC<RagDiagnosticSearchCardProps> = ({
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

  const truncateText = (text: string, maxLen: number = 200) => {
    if (text.length <= maxLen) return text;
    return text.substring(0, maxLen) + '...';
  };

  return (
    <div className="bg-bg-card rounded-xl border border-border-primary p-5 shadow-card">
      <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2 mb-1">
        <Search className="w-4 h-4 text-accent-primary" />
        Diagnostic Search
      </h3>
      <p className="text-[10px] text-text-tertiary mb-4">
        Uses /rag/test-search endpoint — explicit user-triggered only
      </p>

      {/* Search form */}
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search query..."
            className="flex-1 px-3 py-2 bg-bg-secondary border border-border-primary rounded-lg text-xs text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent-primary/50 focus:ring-1 focus:ring-accent-primary/50 transition-all duration-200"
          />
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="px-3 py-2 bg-bg-secondary border border-border-primary rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-primary/50 transition-all duration-200"
          >
            {[2, 4, 8, 12, 20].map(n => (
              <option key={n} value={n}>{n} results</option>
            ))}
          </select>
          <select
            value={collection || ''}
            onChange={(e) => setCollection(e.target.value || undefined)}
            className="px-3 py-2 bg-bg-secondary border border-border-primary rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-primary/50 transition-all duration-200"
          >
            <option value="">All collections</option>
            {availableCollections.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={searchLoading || !query.trim()}
            className="px-4 py-2 rounded-lg text-xs font-medium bg-gradient-to-r from-accent-primary to-accent-tertiary hover:from-accent-primary-hover hover:to-accent-tertiary text-white shadow-lg shadow-accent-primary/20 transition-all duration-200 disabled:opacity-50 disabled:shadow-none flex items-center gap-1.5"
          >
            {searchLoading ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-3 h-3" />
                Search
              </>
            )}
          </button>
        </div>
      </form>

      {/* Results */}
      {searchResults && searchResults.results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-text-tertiary">
              {searchResults.results.length} result{searchResults.results.length !== 1 ? 's' : ''} for "{searchResults.query}"
              {searchResults.collection && (
                <span className="ml-1">in <span className="font-mono">{searchResults.collection}</span></span>
              )}
            </span>
          </div>

          {searchResults.results.map((result: RagSearchResult, idx: number) => (
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

              {result.text && (
                <p className="text-xs text-text-primary mt-1 leading-relaxed">
                  {truncateText(result.text)}
                </p>
              )}

              {/* Source/document/file */}
              {(result.source || result.document || result.file) && (
                <div className="flex items-center gap-3 mt-2">
                  {result.source && (
                    <div className="flex items-center gap-1">
                      <FileText className="w-3 h-3 text-text-tertiary" />
                      <span className="text-[10px] font-mono text-text-tertiary truncate max-w-[150px]" title={result.source}>
                        {result.source}
                      </span>
                    </div>
                  )}
                  {result.file && (
                    <div className="flex items-center gap-1">
                      <FileText className="w-3 h-3 text-text-tertiary" />
                      <span className="text-[10px] font-mono text-text-tertiary truncate max-w-[150px]" title={result.file}>
                        {result.file}
                      </span>
                    </div>
                  )}
                  {result.document && (
                    <div className="flex items-center gap-1">
                      <Database className="w-3 h-3 text-text-tertiary" />
                      <span className="text-[10px] font-mono text-text-tertiary truncate max-w-[150px]" title={result.document}>
                        {result.document}
                      </span>
                    </div>
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

              <RawJsonPanel data={result.raw} label="Raw result" />
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
