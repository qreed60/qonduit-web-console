import React, { useState, useEffect } from 'react';
import { X, Copy, Trash2 } from 'lucide-react';
import { PromptTemplate, PromptTemplateCreateRequest } from '../types';
import { createPromptTemplate, updatePromptTemplate, deletePromptTemplate } from '../services/gatewayApi';
import Toast from './Toast';
import ConfirmDialog from './ConfirmDialog';

export type EditorMode = 'create' | 'edit' | 'duplicate';

interface PromptEditorModalProps {
  open: boolean;
  mode: EditorMode;
  template: PromptTemplate | null;
  onClose: () => void;
  onSave: () => void;
}

interface FormErrors {
  name?: string;
  system_prompt?: string;
  instruction_prompt?: string;
}

const PromptEditorModal: React.FC<PromptEditorModalProps> = ({ open, mode, template, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [instructionPrompt, setInstructionPrompt] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && template) {
        setName(template.name);
        setDescription(template.description || '');
        setSystemPrompt(template.system_prompt);
        setInstructionPrompt(template.instruction_prompt);
      } else if (mode === 'duplicate' && template) {
        setName(`${template.name} (copy)`);
        setDescription(template.description || '');
        setSystemPrompt(template.system_prompt);
        setInstructionPrompt(template.instruction_prompt);
      } else {
        setName('');
        setDescription('');
        setSystemPrompt('');
        setInstructionPrompt('');
      }
      setErrors({});
    }
  }, [open, mode, template]);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (!systemPrompt.trim()) newErrors.system_prompt = 'System prompt is required';
    if (!instructionPrompt.trim()) newErrors.instruction_prompt = 'Instruction prompt is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const req: PromptTemplateCreateRequest = {
        name: name.trim(),
        description: description.trim() || undefined,
        system_prompt: systemPrompt,
        instruction_prompt: instructionPrompt,
      };

      if (mode === 'create') {
        await createPromptTemplate(req);
        setToastMessage('Template created');
      } else if (mode === 'edit' && template) {
        await updatePromptTemplate(template.id, req);
        setToastMessage('Template updated');
      } else if (mode === 'duplicate' && template) {
        await createPromptTemplate(req);
        setToastMessage('Template duplicated');
      }

      setTimeout(() => setToastMessage(null), 3000);
      onSave();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save template';
      setToastMessage(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!template) return;
    try {
      await deletePromptTemplate(template.id);
      setToastMessage('Template deleted');
      setTimeout(() => setToastMessage(null), 3000);
      onSave();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete template';
      setToastMessage(msg);
    }
    setShowDeleteConfirm(false);
  };

  const handleClose = () => {
    onClose();
  };

  if (!open) return null;

  const isCustom = mode !== 'create';
  const canDelete = isCustom && mode === 'edit';

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={handleClose}
        />

        {/* Modal / Bottom Sheet */}
        <div className="relative bg-bg-card border border-border-primary rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[90vh] sm:max-h-[85vh] flex flex-col animate-slide-up sm:animate-slide-in-down z-10">
          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border-subtle flex-shrink-0">
            <h3 className="text-base font-semibold text-text-primary">
              {mode === 'create' ? 'New Prompt Template' : mode === 'edit' ? 'Edit Prompt Template' : 'Duplicate Prompt Template'}
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
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Name <span className="text-status-error">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); if (errors.name) setErrors((p) => ({ ...p, name: undefined })); }}
                className={`w-full px-4 py-3 bg-bg-secondary border rounded-xl text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-1 transition-all duration-200 min-h-[48px] ${
                  errors.name ? 'border-status-error/50 focus:border-status-error/50 focus:ring-status-error/50' : 'border-border-primary focus:border-accent-primary/50 focus:ring-accent-primary/50'
                }`}
                placeholder="e.g., My Custom Template"
              />
              {errors.name && <p className="text-xs text-status-error mt-1">{errors.name}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 bg-bg-secondary border border-border-primary rounded-xl text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent-primary/50 focus:ring-1 focus:ring-accent-primary/50 transition-all duration-200 min-h-[48px]"
                placeholder="Brief description of this template"
              />
            </div>

            {/* System Prompt */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                System Prompt <span className="text-status-error">*</span>
              </label>
              <textarea
                value={systemPrompt}
                onChange={(e) => { setSystemPrompt(e.target.value); if (errors.system_prompt) setErrors((p) => ({ ...p, system_prompt: undefined })); }}
                className={`w-full px-4 py-3 bg-bg-secondary border rounded-xl text-text-primary font-mono text-sm focus:outline-none focus:ring-1 transition-all duration-200 min-h-[120px] sm:min-h-[160px] resize-y ${
                  errors.system_prompt ? 'border-status-error/50 focus:border-status-error/50 focus:ring-status-error/50' : 'border-border-primary focus:border-accent-primary/50 focus:ring-accent-primary/50'
                }`}
                placeholder="Enter the system prompt..."
              />
              {errors.system_prompt && <p className="text-xs text-status-error mt-1">{errors.system_prompt}</p>}
            </div>

            {/* Instruction Prompt */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Instruction Prompt <span className="text-status-error">*</span>
              </label>
              <textarea
                value={instructionPrompt}
                onChange={(e) => { setInstructionPrompt(e.target.value); if (errors.instruction_prompt) setErrors((p) => ({ ...p, instruction_prompt: undefined })); }}
                className={`w-full px-4 py-3 bg-bg-secondary border rounded-xl text-text-primary font-mono text-sm focus:outline-none focus:ring-1 transition-all duration-200 min-h-[120px] sm:min-h-[160px] resize-y ${
                  errors.instruction_prompt ? 'border-status-error/50 focus:border-status-error/50 focus:ring-status-error/50' : 'border-border-primary focus:border-accent-primary/50 focus:ring-accent-primary/50'
                }`}
                placeholder="Enter the instruction prompt..."
              />
              {errors.instruction_prompt && <p className="text-xs text-status-error mt-1">{errors.instruction_prompt}</p>}
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3 px-4 sm:px-6 py-4 border-t border-border-subtle flex-shrink-0">
            {/* Left actions (delete/duplicate) */}
            <div className="flex gap-2 sm:mr-auto">
              {canDelete && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium border border-status-error/30 text-status-error hover:bg-status-error/10 transition-all duration-200 min-h-[44px]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              )}
              {mode === 'edit' && template && (
                <button
                  type="button"
                  onClick={() => {
                    setName(`${template.name} (copy)`);
                    setDescription(template.description || '');
                    setSystemPrompt(template.system_prompt);
                    setInstructionPrompt(template.instruction_prompt);
                  }}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium border border-border-primary text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-all duration-200 min-h-[44px]"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Duplicate
                </button>
              )}
            </div>

            {/* Right actions (cancel/save) */}
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

      <Toast message={toastMessage || ''} type={toastMessage ? 'error' : 'success'} onClose={() => setToastMessage(null)} />
      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete Prompt Template"
        message={`Are you sure you want to delete "${template?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
};

export default PromptEditorModal;
