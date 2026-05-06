import React from 'react';
import { Trash2, RotateCcw, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

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
  restoreLoading: string | null;
  onRestore: (trashName: string) => void;
}

const TrashPanel: React.FC<TrashPanelProps> = ({
  trashFiles, trashLoading, restoreLoading, onRestore,
}) => {
  const [expanded, setExpanded] = React.useState(false);

  if (trashFiles.length === 0 && !trashLoading) return null;

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
          {trashLoading ? (
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
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-mono text-text-primary truncate" title={entry.original_name}>
                      {entry.original_name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-text-tertiary">
                      <span>{entry.size_human}</span>
                      <span>·</span>
                      <span>Trashed: {new Date(entry.trashed_at).toLocaleString()}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => onRestore(entry.trash_name)}
                    disabled={restoreLoading === entry.trash_name}
                    className="ml-3 flex items-center gap-1.5 px-3 py-1.5 bg-accent-primary/10 text-accent-primary border border-accent-primary/30 rounded-lg text-xs font-medium hover:bg-accent-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    {restoreLoading === entry.trash_name ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <RotateCcw className="w-3 h-3" />
                    )}
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TrashPanel;
