import React from 'react';
import { Loader2, X, Check, RotateCcw, FileDown, AlertCircle, AlertTriangle } from 'lucide-react';
import { HfDownloadJob } from '../types';

interface DownloadJobsPanelProps {
  downloadJobs: HfDownloadJob[];
  jobsLoading: boolean;
  jobsError: string | null;
  jobsLastUpdated: number | null;
  onRefresh: () => void;
  onCancel: (jobId: string) => void;
}

const statusStyles: Record<HfDownloadJob['status'], { bg: string; text: string; label: string; icon?: React.ReactNode }> = {
  queued: { bg: 'bg-accent-primary/10', text: 'text-accent-primary', label: 'Queued' },
  downloading: { bg: 'bg-accent-secondary/10', text: 'text-accent-secondary', label: 'Downloading' },
  complete: { bg: 'bg-status-success/10', text: 'text-status-success', label: 'Complete' },
  failed: { bg: 'bg-status-error/10', text: 'text-status-error', label: 'Failed' },
  cancelled: { bg: 'bg-bg-tertiary/50', text: 'text-text-tertiary', label: 'Cancelled' },
  interrupted: { bg: 'bg-status-warning/10', text: 'text-status-warning', label: 'Interrupted' },
};

const DownloadJobsPanel: React.FC<DownloadJobsPanelProps> = ({
  downloadJobs, jobsLoading, jobsError, jobsLastUpdated, onRefresh, onCancel,
}) => {
  const hasActiveJobs = downloadJobs.some(
    j => j.status === 'queued' || j.status === 'downloading'
  );

  const completedCount = downloadJobs.filter(
    j => j.status === 'complete' || j.status === 'failed' || j.status === 'cancelled' || j.status === 'interrupted'
  ).length;

  // Format bytes to GiB
  const toGiB = (bytes: number): string => {
    if (bytes <= 0) return '0.0';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1);
  };

  return (
    <div className="bg-bg-card rounded-xl border border-border-primary">
      <div className="px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileDown className="w-4 h-4 text-accent-secondary" />
          <h3 className="text-sm font-semibold text-text-primary">Download Jobs</h3>
          {hasActiveJobs && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent-secondary/10 text-accent-secondary font-medium animate-pulse">
              Active
            </span>
          )}
          {completedCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-bg-tertiary/50 text-text-tertiary font-medium">
              {completedCount}
            </span>
          )}
        </div>
        {jobsLastUpdated && (
          <span className="text-[10px] text-text-tertiary">
            Updated {Math.floor((Date.now() - jobsLastUpdated) / 1000)}s ago
          </span>
        )}
      </div>
      <div className="px-5 pb-5 space-y-3 border-t border-border-subtle pt-4">
        {/* Error */}
        {jobsError && (
          <div className="p-2 bg-status-warning/5 border border-status-warning/20 rounded-lg">
            <p className="text-[10px] text-status-warning flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {jobsError}
            </p>
          </div>
        )}

        {/* Jobs list */}
        {downloadJobs.length > 0 && (
          <div className="space-y-2">
            {downloadJobs.map((job) => {
              const style = statusStyles[job.status];
              const isActive = job.status === 'queued' || job.status === 'downloading';

              return (
                <div
                  key={job.job_id}
                  className={`p-3 rounded-lg border ${isActive ? 'border-border-primary bg-bg-secondary/30' : 'border-border-subtle bg-bg-secondary/10'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${style.bg} ${style.text}`}>
                        {style.label}
                      </span>
                      <p className="text-xs font-mono text-text-primary truncate" title={job.filename}>
                        {job.filename}
                      </p>
                    </div>
                    {isActive && (
                      <button
                        onClick={() => onCancel(job.job_id)}
                        className="ml-2 p-1 rounded hover:bg-status-error/10 text-text-tertiary hover:text-status-error transition-colors flex-shrink-0"
                        title="Cancel download"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {(job.status === 'failed' || job.status === 'interrupted') && (
                      <button
                        onClick={onRefresh}
                        className="ml-2 p-1 rounded hover:bg-bg-tertiary text-text-tertiary hover:text-text-primary transition-colors flex-shrink-0"
                        title="Refresh"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Progress bar */}
                  {(job.status === 'queued' || job.status === 'downloading') && (
                    <div className="space-y-1">
                      <div className="w-full bg-bg-tertiary rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-accent-secondary h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(job.progress * 100, 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-text-tertiary">
                        <span>
                          {toGiB(job.bytes_downloaded)} GiB / {job.total_bytes > 0 ? `${toGiB(job.total_bytes)} GiB` : '...'}
                          {job.total_bytes > 0 && job.bytes_downloaded < job.total_bytes && (
                            <span> ({toGiB(job.total_bytes - job.bytes_downloaded)} GiB remaining)</span>
                          )}
                        </span>
                        <span>{(job.progress * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  )}

                  {/* Queued status */}
                  {job.status === 'queued' && !isActive && (
                    <p className="text-[10px] text-text-tertiary mt-1">Waiting in queue…</p>
                  )}

                  {/* Error message for failed jobs */}
                  {job.status === 'failed' && job.error && (
                    <p className="text-[10px] text-status-error mt-1">{job.error}</p>
                  )}

                  {/* Interrupted status */}
                  {job.status === 'interrupted' && (
                    <div className="flex items-center gap-1 text-[10px] text-status-warning mt-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Download interrupted (router may have restarted)</span>
                      {job.error && <span className="text-text-tertiary">— {job.error}</span>}
                    </div>
                  )}

                  {/* Cancelled status */}
                  {job.status === 'cancelled' && (
                    <p className="text-[10px] text-text-tertiary mt-1">Download cancelled</p>
                  )}

                  {/* Complete status */}
                  {job.status === 'complete' && (
                    <div className="flex items-center gap-1 text-[10px] text-status-success mt-1">
                      <Check className="w-3 h-3" />
                      Download complete
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {downloadJobs.length === 0 && (
          <div className="text-center py-6">
            <FileDown className="w-8 h-8 text-text-tertiary/40 mx-auto mb-2" />
            <p className="text-xs text-text-tertiary">No active download jobs</p>
          </div>
        )}

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={jobsLoading}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border border-border-subtle text-text-tertiary hover:bg-bg-tertiary hover:text-text-primary transition-colors disabled:opacity-50"
        >
          {jobsLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
          Refresh Jobs
        </button>
      </div>
    </div>
  );
};

export default DownloadJobsPanel;
