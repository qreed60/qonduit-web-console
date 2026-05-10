import React, { useState } from 'react';
import { Eye, Code, RefreshCw, Trash2, Loader2 } from 'lucide-react';
import { RagDocumentSummary } from '../types';
import ConfirmDialog from './ConfirmDialog';

interface RagDocumentActionsProps {
  document: RagDocumentSummary;
  onSourceView: (doc: RagDocumentSummary) => void;
  onChunksView: (documentId: string) => void;
  onReingest: (documentId: string) => Promise<void>;
  onDelete: (documentId: string) => Promise<void>;
}

const RagDocumentActions: React.FC<RagDocumentActionsProps> = ({
  document,
  onSourceView,
  onChunksView,
  onReingest,
  onDelete,
}) => {
  const [reingesting, setReingesting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleReingest = async () => {
    setReingesting(true);
    try {
      await onReingest(document.document_id);
    } finally {
      setReingesting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setDeleteDialogOpen(false);
    await onDelete(document.document_id);
  };

  return (
    <>
      {/* Actions row */}
      <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border-subtle">
        {/* View Source */}
        <button
          onClick={() => onSourceView(document)}
          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] sm:text-xs text-text-tertiary hover:text-accent-primary hover:bg-accent-primary/10 transition-colors min-h-[32px]"
          title="View source"
        >
          <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          <span className="hidden sm:inline">Source</span>
        </button>

        {/* View Chunks */}
        <button
          onClick={() => onChunksView(document.document_id)}
          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] sm:text-xs text-text-tertiary hover:text-accent-secondary hover:bg-accent-secondary/10 transition-colors min-h-[32px]"
          title="View chunks"
        >
          <Code className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          <span className="hidden sm:inline">Chunks</span>
        </button>

        {/* Reingest */}
        <button
          onClick={handleReingest}
          disabled={reingesting}
          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] sm:text-xs text-text-tertiary hover:text-status-warning hover:bg-status-warning/10 transition-colors min-h-[32px] disabled:opacity-50"
          title="Reingest document"
        >
          {reingesting ? (
            <Loader2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          )}
          <span className="hidden sm:inline">Reingest</span>
        </button>

        {/* Delete */}
        <button
          onClick={() => setDeleteDialogOpen(true)}
          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] sm:text-xs text-text-tertiary hover:text-status-error hover:bg-status-error/10 transition-colors min-h-[32px]"
          title="Delete document"
        >
          <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          <span className="hidden sm:inline">Delete</span>
        </button>
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Document"
        message={`Are you sure you want to delete "${document.document_name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </>
  );
};

export default RagDocumentActions;
