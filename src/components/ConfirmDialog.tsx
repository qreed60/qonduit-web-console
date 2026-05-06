import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'danger' | 'warning' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
  confirmDisabled?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'danger',
  onConfirm,
  onCancel,
  confirmDisabled = false,
}) => {
  if (!open) return null;

  const variantStyles = {
    danger: 'bg-status-error/10 text-status-error border-status-error/30 hover:bg-status-error/20',
    warning: 'bg-status-warning/10 text-status-warning border-status-warning/30 hover:bg-status-warning/20',
    primary: 'bg-accent-primary/10 text-accent-primary border-accent-primary/30 hover:bg-accent-primary/20',
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onCancel}
      />
      {/* Dialog */}
      <div className="relative bg-bg-card border border-border-primary rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 animate-slide-in-down z-10">
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1 rounded hover:bg-bg-tertiary text-text-tertiary hover:text-text-primary transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-status-error/10 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-status-error" />
          </div>
          <h3 className="text-base font-semibold text-text-primary">{title}</h3>
        </div>

        {/* Message */}
        <p className="text-sm text-text-secondary mb-6 leading-relaxed">{message}</p>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-border-primary text-text-secondary hover:bg-bg-tertiary transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={confirmDisabled}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${variantStyles[confirmVariant]} ${confirmDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
