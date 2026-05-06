import React from 'react';
import { Trash2, RotateCcw, Loader2, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

interface TrashEntry {
  trash_name: string;
  original_name: string;
  path: string;
  size_bytes: number;
  size_human: string;
  trashed_at: string;
}

interface TrashPanelProps {
  trashFiles: TrashEntry[];
  trashLoading: boolean;
  trashError: string | null;
  onRetry?: () => void;
  restoreLoading: string | null;
  onRestore: (trashName: string) => void;
  onDeletePermanent: (entry: TrashEntry) => void;
  permanentDeleteLoading: string | null;
  onPermanentDeleteConfirm: (trashName: string) => void;
  onPermanentDeleteCancel: () => void;
  permanentDeleteConfirmOpen: boolean;
  permanentDeleteEntry: TrashEntry | null;
}

const TrashPanel: React.FC<TrashPanelProps> = ({
  trashFiles, trashLoading, trashError, onRetry, restoreLoading, onRestore,
  onDeletePermanent, permanentDeleteLoading, onPermanentDeleteConfirm, onPermanentDeleteCancel,
  permanentDeleteConfirmOpen, permanentDeleteEntry,
}) => {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div className="bg-bg-card rounded-xl border border-border-primary overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-text-tertiary" />
          <h3 className="text-sm font-semibold text-text-primary">Trash / Restore</h3>
          {trashFiles.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-bg-tertiary/50 text-text-tertiary font-medium">
              {trashFiles.length}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-text-tertiary" />
        ) : (
          <ChevronDown className="w-4 h-4 text-text-tertiary" />
        )}
      </button>

      {expanded && (
         <div className="px-5 pb-5 space-y-2 border-t border-border-subtle pt-4">
           {trashError ? (
             <div className="text-center py-4">
               <p className="text-xs text-status-error mb-2">⚠ Failed to load trash: {trashError}</p>
               {onRetry && (
                 <button
                   onClick={onRetry}
                   className="text-xs text-accent-primary hover:text-accent-primary-hover font-medium"
                 >
                   Retry
                 </button>
               )}
             </div>
           ) : trashLoading ? (
             <div className="flex items-center justify-center py-4">
               <Loader2 className="w-5 h-5 text-text-tertiary animate-spin" />
             </div>
           ) : trashFiles.length === 0 ? (
             <p className="text-xs text-text-tertiary text-center py-4">Trash is empty</p>
           ) : (
            <div className="space-y-1.5">
              {trashFiles.map((entry) => (
                <div
                  key={entry.trash_name}
                  className="flex items-center justify-between p-3 bg-bg-secondary/30 border border-border-subtle rounded-lg"
                >
                  <div className="min-w-0 flex-1 mr-3">
                    <p className="text-xs font-mono text-text-primary truncate" title={entry.original_name}>
                      {entry.original_name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-text-tertiary">
                      <span>{entry.size_human}</span>
                      <span>·</span>
                      <span>Trashed: {new Date(entry.trashed_at).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => onRestore(entry.trash_name)}
                      disabled={restoreLoading === entry.trash_name}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-primary/10 text-accent-primary border border-accent-primary/30 rounded-lg text-xs font-medium hover:bg-accent-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {restoreLoading === entry.trash_name ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <RotateCcw className="w-3 h-3" />
                      )}
                      Restore
                    </button>
                    <button
                       onClick={() => onDeletePermanent(entry)}
                       disabled={permanentDeleteLoading !== null}
                       className="flex items-center gap-1.5 px-3 py-1.5 bg-status-error/10 text-status-error border border-status-error/30 rounded-lg text-xs font-medium hover:bg-status-error/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                       title="Delete Permanently"
                     >
                       <Trash2 className="w-3 h-3" />
                       Delete Permanently
                     </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Permanent Delete Confirmation Dialog ── */}
      {permanentDeleteConfirmOpen && permanentDeleteEntry && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
            onClick={onPermanentDeleteCancel}
          />
          <div className="relative bg-bg-card border border-status-error/50 rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 animate-slide-in-down z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-status-error/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-status-error" />
              </div>
              <h3 className="text-base font-semibold text-text-primary">Delete Permanently</h3>
            </div>

            <div className="space-y-3 mb-6">
              <p className="text-sm text-text-secondary leading-relaxed">
                This will <span className="text-status-error font-semibold">permanently delete</span> &ldquo;{permanentDeleteEntry.original_name}&rdquo; ({permanentDeleteEntry.size_human}).
              </p>
              <div className="p-3 bg-status-error/10 border border-status-error/20 rounded-lg">
                <p className="text-xs text-status-error font-medium">⚠ This action cannot be undone.</p>
                <p className="text-[10px] text-text-secondary mt-0.5">
                  The file will be removed from trash and cannot be restored.
                </p>
              </div>
              <div className="bg-bg-secondary/50 rounded-lg p-2.5 border border-border-subtle">
                <p className="text-[10px] text-text-tertiary uppercase tracking-wider mb-0.5">Trash Path</p>
                <p className="text-[10px] font-mono text-text-primary break-all" title={permanentDeleteEntry.path}>
                  {permanentDeleteEntry.path}
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={onPermanentDeleteCancel}
                disabled={permanentDeleteLoading !== null}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-border-primary text-text-secondary hover:bg-bg-tertiary transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => onPermanentDeleteConfirm(permanentDeleteEntry.trash_name)}
                disabled={permanentDeleteLoading !== null}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-status-error/10 text-status-error border border-status-error/30 hover:bg-status-error/20 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {permanentDeleteLoading === permanentDeleteEntry.trash_name ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                {permanentDeleteLoading === permanentDeleteEntry.trash_name ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrashPanel;
