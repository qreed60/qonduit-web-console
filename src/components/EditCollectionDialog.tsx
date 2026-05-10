import React, { useState, useEffect } from 'react';
import { X, Edit2 } from 'lucide-react';
import { RagLogicalCollection, RagUpdateCollectionRequest } from '../types';
import { updateLogicalCollection } from '../services/ragProjectsApi';
import Toast from './Toast';

interface EditCollectionDialogProps {
  open: boolean;
  projectId: string;
  collection: RagLogicalCollection | null;
  onClose: () => void;
  onSuccess: (collection: RagLogicalCollection) => void;
}

interface FormErrors {
  display_name?: string;
}

const EditCollectionDialog: React.FC<EditCollectionDialogProps> = ({ open, projectId, collection, onClose, onSuccess }) => {
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [metadataJson, setMetadataJson] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    if (open && collection) {
      setDisplayName(collection.display_name || '');
      setDescription(collection.description || '');
      setMetadataJson(JSON.stringify(collection.metadata || {}, null, 2));
      setErrors({});
    }
  }, [open, collection]);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!displayName.trim()) newErrors.display_name = 'Display name is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate() || !collection) return;
    setSaving(true);
    try {
      let metadata: Record<string, unknown> | undefined;
      if (metadataJson.trim()) {
        try {
          metadata = JSON.parse(metadataJson);
        } catch {
          setToastMessage('Invalid JSON for metadata', 'error');
          return;
        }
      }

      const req: RagUpdateCollectionRequest = {
        display_name: displayName.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(metadata && { metadata }),
      };

      const result = await updateLogicalCollection(projectId, collection.name, req);
      setToastMessage(`Collection "${result.display_name || result.name}" updated successfully`, 'success');
      setTimeout(() => setToastMessage(null), 3000);
      onSuccess(result);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update collection';
      setToastMessage(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  if (!open || !collection) return null;

  const isDefault = collection.name === 'default';

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={handleClose}
        />

        {/* Modal / Bottom Sheet */}
        <div className="relative bg-bg-card border border-border-primary rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] sm:max-h-[85vh] flex flex-col animate-slide-up sm:animate-slide-in-down z-10">
          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border-subtle flex-shrink-0">
            <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-accent-primary" />
              Edit Collection
            </h3>
            <button
              onClick={handleClose}
              className="p-1 rounded hover:bg-bg-tertiary text-text-tertiary hover:text-text-primary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
            {/* Collection Name (read-only) */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Collection Name
              </label>
              <input
                type="text"
                value={collection.name}
                disabled
                className="w-full px-4 py-3 bg-bg-secondary/50 border border-border-subtle rounded-xl text-text-tertiary font-mono min-h-[48px]"
              />
              <p className="text-[10px] text-text-tertiary mt-1">Collection name cannot be changed.</p>
            </div>

            {/* Display Name */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Display Name <span className="text-status-error">*</span>
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => { setDisplayName(e.target.value); if (errors.display_name) setErrors((p) => ({ ...p, display_name: undefined })); }}
                className={`w-full px-4 py-3 bg-bg-secondary border rounded-xl text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-1 transition-all duration-200 min-h-[48px] ${
                  errors.display_name ? 'border-status-error/50 focus:border-status-error/50 focus:ring-status-error/50' : 'border-border-primary focus:border-accent-primary/50 focus:ring-accent-primary/50'
                }`}
              />
              {errors.display_name && <p className="text-xs text-status-error mt-1">{errors.display_name}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 bg-bg-secondary border border-border-primary rounded-xl text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent-primary/50 focus:ring-1 focus:ring-accent-primary/50 transition-all duration-200 min-h-[80px] resize-y"
                placeholder="Brief description of this collection"
              />
            </div>

            {/* Metadata */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Metadata
              </label>
              <textarea
                value={metadataJson}
                onChange={(e) => setMetadataJson(e.target.value)}
                className="w-full px-4 py-3 bg-bg-secondary border border-border-primary rounded-xl text-text-primary font-mono text-xs focus:outline-none focus:border-accent-primary/50 focus:ring-1 focus:ring-accent-primary/50 transition-all duration-200 min-h-[100px] resize-y"
              />
              <p className="text-[10px] text-text-tertiary mt-1">JSON object with key-value pairs.</p>
            </div>

            {/* Stats info */}
            <div className="p-3 bg-bg-secondary rounded-lg border border-border-subtle space-y-1">
              <p className="text-[10px] text-text-tertiary">
                Documents: <span className="text-text-secondary">{collection.document_count !== null ? collection.document_count.toLocaleString() : '—'}</span>
              </p>
              <p className="text-[10px] text-text-tertiary">
                Chunks: <span className="text-text-secondary">{collection.chunk_count !== null ? collection.chunk_count.toLocaleString() : '—'}</span>
              </p>
              {collection.updated_at && (
                <p className="text-[10px] text-text-tertiary">
                  Updated: <span className="text-text-secondary">{new Date(collection.updated_at).toLocaleString()}</span>
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3 px-4 sm:px-6 py-4 border-t border-border-subtle flex-shrink-0">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-medium border border-border-primary text-text-primary hover:bg-bg-tertiary transition-all duration-200 min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-medium text-white shadow-lg transition-all duration-200 min-h-[44px] ${
                  saving
                    ? 'bg-gray-400 shadow-none cursor-not-allowed'
                    : 'bg-gradient-to-r from-accent-primary to-accent-tertiary hover:from-accent-primary-hover hover:to-accent-tertiary shadow-accent-primary/20'
                }`}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {toastMessage && (
        <Toast message={toastMessage} type={toastType} onClose={() => setToastMessage(null)} />
      )}
    </>
  );
};

export default EditCollectionDialog;
