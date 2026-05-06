import React from 'react';
import {
  Search, Loader2, ExternalLink, Download,
  Cpu, ChevronDown, ChevronUp, Globe,
} from 'lucide-react';
import { HfSearchResult, HfRepoFile } from '../types';

interface HfSearchPanelProps {
  hfQuery: string;
  setHfQuery: (v: string) => void;
  hfSort: 'downloads' | 'likes' | 'lastModified';
  setHfSort: (v: 'downloads' | 'likes' | 'lastModified') => void;
  hfLimit: number;
  setHfLimit: (v: number) => void;
  hfSearchResults: HfSearchResult[];
  hfSearchLoading: boolean;
  hfSearchError: string | null;
  hfLastSearchTime: number | null;
  selectedRepo: string | null;
  repoFiles: HfRepoFile[];
  repoFilesLoading: boolean;
  repoFilesError: string | null;
  downloadConfirmOpen: boolean;
  downloadConfirmData: {
    repo_id: string;
    filename: string;
    quant: string;
    size_human: string;
    size_gib: number;
    size_gb: number;
    parameter_size: string;
    parameter_size_active: string;
    target_name: string;
    target_path: string;
    exists: boolean;
    downloadable: boolean;
  } | null;
  downloadConfirmLoading: boolean;
  onSearch: () => void;
  onSelectRepo: (repoId: string) => void;
  onDownloadConfirm: (file: HfRepoFile) => void;
  onStartDownload: () => void;
  onCancelDownload: () => void;
}

const QUANT_PRIORITY: Record<string, number> = {
  'Q6_K': 1, 'Q5_K_M': 2, 'Q5_K_S': 3, 'Q5_0': 4,
  'Q4_K_M': 5, 'Q4_K_S': 6, 'Q4_0': 7,
  'Q3_K_M': 8, 'Q3_K_S': 9,
  'Q2_K': 10, 'Q2_0': 11,
  'Q1_K': 12,
};

function sortQuantFiles(files: HfRepoFile[]): HfRepoFile[] {
  return [...files].sort((a, b) => {
    const aP = QUANT_PRIORITY[a.quant] ?? 99;
    const bP = QUANT_PRIORITY[b.quant] ?? 99;
    if (aP !== bP) return aP - bP;
    return a.size_gib - b.size_gib;
  });
}

const HfSearchPanel: React.FC<HfSearchPanelProps> = ({
  hfQuery, setHfQuery, hfSort, setHfSort, hfLimit, setHfLimit,
  hfSearchResults, hfSearchLoading, hfSearchError, hfLastSearchTime,
  selectedRepo, repoFiles, repoFilesLoading, repoFilesError,
  downloadConfirmOpen, downloadConfirmData, downloadConfirmLoading,
  onSearch, onSelectRepo, onDownloadConfirm, onStartDownload, onCancelDownload,
}) => {
  const [expanded, setExpanded] = React.useState(false);

  const sortedFiles = selectedRepo ? sortQuantFiles(repoFiles) : [];

  return (
    <>
      {/* HF Section */}
      <div className="bg-bg-card rounded-xl border border-border-primary overflow-hidden">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between p-5 text-left hover:bg-bg-secondary/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-accent-primary" />
            <h3 className="text-sm font-semibold text-text-primary">Add Model from Hugging Face</h3>
          </div>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-text-tertiary" />
          ) : (
            <ChevronDown className="w-4 h-4 text-text-tertiary" />
          )}
        </button>

        {expanded && (
          <div className="px-5 pb-5 space-y-4 border-t border-border-subtle pt-4">
            {/* Search input */}
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                <input
                  type="text"
                  value={hfQuery}
                  onChange={(e) => setHfQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                  placeholder="Search Hugging Face models (e.g., 'qwen gguf')"
                  className="w-full pl-10 pr-4 py-2.5 bg-bg-secondary border border-border-subtle rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-primary/50 transition-colors"
                />
              </div>
              <select
                value={hfSort}
                onChange={(e) => setHfSort(e.target.value as 'downloads' | 'likes' | 'lastModified')}
                className="px-3 py-2.5 bg-bg-secondary border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-primary/50 transition-colors"
              >
                <option value="downloads">Downloads</option>
                <option value="likes">Likes</option>
                <option value="lastModified">Last Modified</option>
              </select>
              <select
                value={hfLimit}
                onChange={(e) => setHfLimit(Number(e.target.value))}
                className="px-3 py-2.5 bg-bg-secondary border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-primary/50 transition-colors"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <button
                onClick={onSearch}
                disabled={hfSearchLoading || !hfQuery.trim()}
                className="px-4 py-2.5 bg-accent-primary/10 text-accent-primary border border-accent-primary/30 rounded-lg text-sm font-medium hover:bg-accent-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {hfSearchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </button>
            </div>

            {/* HF search link */}
            {hfLastSearchTime && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-tertiary">
                  {hfSearchResults.length} result{hfSearchResults.length !== 1 ? 's' : ''} · Last search {Math.floor((Date.now() - hfLastSearchTime) / 1000)}s ago
                </span>
                <a
                  href={`https://huggingface.co/models?search=${encodeURIComponent(hfQuery)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-accent-primary hover:text-accent-primary-hover transition-colors"
                >
                  Search on Hugging Face <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {/* Search error */}
            {hfSearchError && (
              <div className="p-3 bg-status-error/5 border border-status-error/20 rounded-lg">
                <p className="text-xs text-status-error">{hfSearchError}</p>
              </div>
            )}

            {/* Search results */}
            {hfSearchResults.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-text-secondary">Search Results</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                  {hfSearchResults.map((result) => {
                    const isSelected = selectedRepo === result.repo_id;
                    return (
                      <button
                        key={result.repo_id}
                        onClick={() => onSelectRepo(result.repo_id)}
                        className={`text-left p-3 rounded-lg border-2 transition-all duration-200 ${
                          isSelected
                            ? 'border-accent-primary bg-accent-primary/5'
                            : 'border-border-subtle bg-bg-secondary/30 hover:border-border-primary'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <p className="text-xs font-mono text-text-primary truncate flex-1" title={result.repo_id}>
                            {result.repo_id}
                          </p>
                          {result.gated && (
                            <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-status-warning/10 text-status-warning font-medium">Gated</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-text-tertiary">
                          <span>{result.downloads.toLocaleString()} downloads</span>
                          <span>{result.likes} likes</span>
                          <span>{result.gguf_count} GGUF</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-text-tertiary">
                          {result.parameter_size && result.parameter_size !== 'unknown' && (
                            <span className="flex items-center gap-0.5">
                              <Cpu className="w-2.5 h-2.5" />
                              {result.parameter_size}
                            </span>
                          )}
                          {result.parameter_size_active && result.parameter_size_active !== 'unknown' && (
                            <span className="text-text-tertiary/60">
                              active: {result.parameter_size_active}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Repo files */}
            {selectedRepo && (
              <div className="space-y-2 pt-2 border-t border-border-subtle">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-medium text-text-secondary">
                    Available Quant Files ({repoFiles.length} GGUF)
                  </h4>
                  <span className="text-[10px] text-text-tertiary">{selectedRepo}</span>
                </div>

                {repoFilesLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 text-text-tertiary animate-spin" />
                  </div>
                ) : repoFilesError ? (
                  <div className="p-3 bg-status-error/5 border border-status-error/20 rounded-lg">
                    <p className="text-xs text-status-error">{repoFilesError}</p>
                  </div>
                ) : sortedFiles.length > 0 ? (
                  <div className="space-y-1.5 max-h-72 overflow-y-auto">
                    {sortedFiles.map((file) => (
                      <div
                        key={file.filename}
                        className="flex items-center justify-between p-3 bg-bg-secondary/30 border border-border-subtle rounded-lg hover:border-border-primary transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-tertiary/10 text-accent-tertiary font-medium">
                              {file.quant}
                            </span>
                            <p className="text-xs font-mono text-text-primary truncate" title={file.filename}>
                              {file.filename}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-[10px] text-text-tertiary">
                            <span className="font-mono text-accent-primary font-semibold">{file.size_gib.toFixed(1)} GiB</span>
                            <span>({file.size_gb.toFixed(1)} GB)</span>
                            {file.parameter_size && file.parameter_size !== 'unknown' && (
                              <span className="flex items-center gap-0.5">
                                <Cpu className="w-2.5 h-2.5" />
                                {file.parameter_size}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => onDownloadConfirm(file)}
                          disabled={downloadConfirmLoading}
                          className="ml-3 flex items-center gap-1.5 px-3 py-1.5 bg-accent-primary/10 text-accent-primary border border-accent-primary/30 rounded-lg text-xs font-medium hover:bg-accent-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                        >
                          <Download className="w-3 h-3" />
                          Download
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-text-tertiary text-center py-4">No GGUF files found</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Download Confirmation Dialog */}
      {downloadConfirmOpen && downloadConfirmData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onCancelDownload} />
          <div className="relative bg-bg-card border border-border-primary rounded-xl shadow-2xl p-6 w-full max-w-lg mx-4 animate-slide-in-down z-10">
            <h3 className="text-base font-semibold text-text-primary mb-4">Confirm Download</h3>

            <div className="space-y-3 text-sm">
              <div className="bg-bg-secondary/50 rounded-lg p-3 border border-border-subtle">
                <p className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">Repository</p>
                <p className="text-xs font-mono text-text-primary break-all">{downloadConfirmData.repo_id}</p>
              </div>

              <div className="bg-bg-secondary/50 rounded-lg p-3 border border-border-subtle">
                <p className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">File</p>
                <p className="text-xs font-mono text-text-primary break-all">{downloadConfirmData.filename}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-bg-secondary/50 rounded-lg p-3 border border-border-subtle">
                  <p className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">Size</p>
                  <p className="text-lg font-mono text-accent-primary font-bold">{downloadConfirmData.size_gib.toFixed(1)} GiB</p>
                  <p className="text-[10px] text-text-tertiary">{downloadConfirmData.size_human}</p>
                </div>
                <div className="bg-bg-secondary/50 rounded-lg p-3 border border-border-subtle">
                  <p className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">Quant</p>
                  <p className="text-sm font-medium text-text-primary">{downloadConfirmData.quant}</p>
                  {downloadConfirmData.parameter_size && downloadConfirmData.parameter_size !== 'unknown' && (
                    <p className="text-[10px] text-text-tertiary mt-0.5">
                      {downloadConfirmData.parameter_size}
                      {downloadConfirmData.parameter_size_active && downloadConfirmData.parameter_size_active !== 'unknown' && (
                        <span className="text-text-tertiary/60"> (active: {downloadConfirmData.parameter_size_active})</span>
                      )}
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-bg-secondary/50 rounded-lg p-3 border border-border-subtle">
                <p className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">Target</p>
                <p className="text-xs font-mono text-text-primary break-all">{downloadConfirmData.target_path}/{downloadConfirmData.target_name}</p>
              </div>

              {downloadConfirmData.exists && (
                <div className="p-3 bg-status-warning/10 border border-status-warning/20 rounded-lg">
                  <p className="text-xs text-status-warning font-medium">⚠ Overwrite Warning</p>
                  <p className="text-[10px] text-text-secondary mt-0.5">A file with this target name already exists. It will be overwritten.</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={onCancelDownload}
                disabled={downloadConfirmLoading}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-border-primary text-text-secondary hover:bg-bg-tertiary transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onStartDownload}
                disabled={downloadConfirmLoading}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-accent-primary/10 text-accent-primary border border-accent-primary/30 hover:bg-accent-primary/20 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {downloadConfirmLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {downloadConfirmLoading ? 'Starting...' : 'Confirm Download'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HfSearchPanel;
