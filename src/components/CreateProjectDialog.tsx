import React, { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { RagCreateProjectRequest, RagRegistryProject } from '../types';
import { createRegistryProject } from '../services/ragProjectsApi';
import Toast from './Toast';

interface CreateProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (project: RagRegistryProject) => void;
}

interface FormErrors {
  display_name?: string;
}

const CreateProjectDialog: React.FC<CreateProjectDialogProps> = ({ open, onClose, onSuccess }) => {
  const [displayName, setDisplayName] = useState('');
  const [projectId, setProjectId] = useState('');
  const [description, setDescription] = useState('');
  const [defaultCollection, setDefaultCollection] = useState('default');
  const [ensureQdrant, setEnsureQdrant] = useState(true);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    if (open) {
      setDisplayName('');
      setProjectId('');
      setDescription('');
      setDefaultCollection('default');
      setEnsureQdrant(true);
      setErrors({});
    }
  }, [open]);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!displayName.trim()) newErrors.display_name = 'Display name is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const req: RagCreateProjectRequest = {
        display_name: displayName.trim(),
        ...(projectId.trim() && { project_id: projectId.trim() }),
        ...(description.trim() && { description: description.trim() }),
        default_collection: defaultCollection.trim() || 'default',
        ensure_qdrant: ensureQdrant,
      };

      const result = await createRegistryProject(req);

      if (!result.ok && result.error) {
        // Check for idempotent/existing project response
        if (result.message?.toLowerCase().includes('already exists') || result.message?.toLowerCase().includes('exists')) {
          setToastMessage(`Project "${result.project_id}" already exists`, 'success');
          setTimeout(() => setToastMessage(null), 3000);
          onClose();
          return;
        }
        throw new Error(result.error);
      }

      setToastMessage(`Project "${result.display_name}" created successfully`, 'success');
      setTimeout(() => setToastMessage(null), 3000);
      onSuccess(result as RagRegistryProject);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create project';
      setToastMessage(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  if (!open) return null;

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
              <Plus className="w-4 h-4 text-accent-primary" />
              Create Project
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
                placeholder="e.g., My Knowledge Base"
              />
              {errors.display_name && <p className="text-xs text-status-error mt-1">{errors.display_name}</p>}
            </div>

            {/* Project ID */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Project ID <span className="text-text-tertiary">(optional)</span>
              </label>
              <input
                type="text"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                className="w-full px-4 py-3 bg-bg-secondary border border-border-primary rounded-xl text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent-primary/50 focus:ring-1 focus:ring-accent-primary/50 transition-all duration-200 min-h-[48px] font-mono"
                placeholder="Leave empty for auto-generated ID"
              />
              <p className="text-[10px] text-text-tertiary mt-1">Alphanumeric, hyphens, and underscores. Leave empty for auto-generation.</p>
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
                placeholder="Brief description of this project"
              />
            </div>

            {/* Default Collection */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Default Collection
              </label>
              <input
                type="text"
                value={defaultCollection}
                onChange={(e) => setDefaultCollection(e.target.value)}
                className="w-full px-4 py-3 bg-bg-secondary border border-border-primary rounded-xl text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent-primary/50 focus:ring-1 focus:ring-accent-primary/50 transition-all duration-200 min-h-[48px] font-mono"
                placeholder="default"
              />
            </div>

            {/* Ensure Qdrant */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="ensureQdrant"
                checked={ensureQdrant}
                onChange={(e) => setEnsureQdrant(e.target.checked)}
                className="w-4 h-4 rounded border-border-primary text-accent-primary focus:ring-accent-primary/50 bg-bg-secondary"
              />
              <label htmlFor="ensureQdrant" className="text-sm text-text-secondary">
                Ensure Qdrant collection exists
              </label>
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
                {saving ? 'Creating...' : 'Create'}
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

export default CreateProjectDialog;
