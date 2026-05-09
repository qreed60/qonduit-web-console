import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Star, Edit, Trash2, Copy, Power } from 'lucide-react';
import { PromptTemplate } from '../types';
import {
  listPromptTemplates,
  activatePromptTemplate,
  duplicatePromptTemplate,
  deletePromptTemplate,
} from '../services/gatewayApi';
import Toast from './Toast';
import ConfirmDialog from './ConfirmDialog';
import PromptEditorModal, { EditorMode } from './PromptEditorModal';

interface PromptTemplatesCardProps {
  activeTemplateId?: string;
}

const PromptTemplatesCard: React.FC<PromptTemplatesCardProps> = ({ activeTemplateId }) => {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>('create');
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState<PromptTemplate | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listPromptTemplates();
      const sorted = (res.templates || []).sort((a, b) => {
        if (a.is_builtin !== b.is_builtin) return a.is_builtin ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      setTemplates(sorted);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load templates';
      setError(msg);
      setToastMessage(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  const handleActivate = async (template: PromptTemplate) => {
    try {
      await activatePromptTemplate(template.id);
      setToastMessage(`Activated "${template.name}"`);
        await loadTemplates();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to activate template';
      setToastMessage(msg);
    }
  };

  const handleDuplicate = async (template: PromptTemplate) => {
    try {
      await duplicatePromptTemplate(template.id);
      setToastMessage(`Duplicated "${template.name}"`);
         await loadTemplates();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to duplicate template';
      setToastMessage(msg);
    }
  };

  const handleDelete = async () => {
    if (!deletingTemplate) return;
    try {
      await deletePromptTemplate(deletingTemplate.id);
      setToastMessage(`Deleted "${deletingTemplate.name}"`);
         await loadTemplates();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete template';
      setToastMessage(msg);
    }
    setShowDeleteConfirm(false);
    setDeletingTemplate(null);
  };

  const openCreateEditor = () => {
    setEditorMode('create');
    setEditingTemplate(null);
    setShowEditor(true);
  };

  const openEditEditor = (template: PromptTemplate) => {
    setEditorMode('edit');
    setEditingTemplate(template);
    setShowEditor(true);
  };

  const openDuplicateEditor = (template: PromptTemplate) => {
    setEditorMode('duplicate');
    setEditingTemplate(template);
    setShowEditor(true);
  };

  if (loading) {
    return (
      <div className="bg-bg-card rounded-2xl border border-border-primary p-4 sm:p-6 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-bg-secondary flex items-center justify-center">
              <FileText className="w-5 h-5 text-text-tertiary" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-text-primary">Prompt Templates</h3>
          </div>
          <button
            type="button"
            onClick={openCreateEditor}
            className="px-4 py-2 rounded-lg text-xs font-medium bg-accent-primary/10 text-accent-primary border border-accent-primary/20 hover:bg-accent-primary/20 transition-all duration-200 flex-shrink-0"
          >
            + New
          </button>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-accent-primary/30 border-t-accent-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-bg-card rounded-2xl border border-border-primary p-4 sm:p-6 shadow-card">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-bg-secondary flex items-center justify-center">
              <FileText className="w-5 h-5 text-accent-primary" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-text-primary">Prompt Templates</h3>
          </div>
          <button
            type="button"
            onClick={openCreateEditor}
            className="px-4 py-2 rounded-lg text-xs font-medium bg-accent-primary/10 text-accent-primary border border-accent-primary/20 hover:bg-accent-primary/20 transition-all duration-200 flex-shrink-0"
          >
            + New
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-status-error/10 border border-status-error/20 text-sm text-status-error">
            {error}
          </div>
        )}

        {/* Template List */}
        {templates.length === 0 ? (
          <div className="text-center py-8 text-text-tertiary">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No prompt templates found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {templates.map((template) => {
              const isActive = template.id === activeTemplateId || template.name === activeTemplateId;
              return (
                <div
                  key={template.id}
                  className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 sm:p-4 rounded-xl border transition-all duration-200 ${
                    isActive
                      ? 'bg-accent-primary/5 border-accent-primary/20'
                      : 'bg-bg-secondary/30 border-border-subtle hover:border-border-primary/60'
                  }`}
                >
                  {/* Template Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {isActive && <Star className="w-4 h-4 text-accent-primary flex-shrink-0" fill="currentColor" />}
                      <span className="text-sm font-semibold text-text-primary truncate">
                        {template.name}
                      </span>
                      {template.is_builtin && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-bg-tertiary text-text-tertiary border border-border-subtle flex-shrink-0">
                          Built-in
                        </span>
                      )}
                    </div>
                    {template.description && (
                      <p className="text-xs text-text-secondary mt-0.5 truncate">{template.description}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 w-full sm:w-auto flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleActivate(template)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-bg-tertiary text-text-secondary border border-border-primary hover:bg-bg-tertiary hover:text-text-primary transition-all duration-200 min-h-[36px]"
                    >
                      <Power className="w-3.5 h-3.5" />
                      {isActive ? 'Active' : 'Activate'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicate(template)}
                      className="flex items-center justify-center p-2 rounded-lg text-text-secondary border border-border-primary hover:bg-bg-tertiary hover:text-text-primary transition-all duration-200 min-h-[36px]"
                      title="Duplicate"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {template.is_builtin ? (
                      <button
                        type="button"
                        onClick={() => openDuplicateEditor(template)}
                        className="flex items-center justify-center p-2 rounded-lg text-text-secondary border border-border-primary hover:bg-bg-tertiary hover:text-text-primary transition-all duration-200 min-h-[36px]"
                        title="Edit as new"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => openEditEditor(template)}
                          className="flex items-center justify-center p-2 rounded-lg text-text-secondary border border-border-primary hover:bg-bg-tertiary hover:text-text-primary transition-all duration-200 min-h-[36px]"
                          title="Edit"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeletingTemplate(template);
                            setShowDeleteConfirm(true);
                          }}
                          className="flex items-center justify-center p-2 rounded-lg text-status-error border border-status-error/30 hover:bg-status-error/10 transition-all duration-200 min-h-[36px]"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {toastMessage && (
          <Toast
            message={toastMessage}
            type={toastMessage.startsWith('Failed') ? 'error' : 'success'}
            onClose={() => setToastMessage(null)}
          />
        )}

      <PromptEditorModal
        open={showEditor}
        mode={editorMode}
        template={editingTemplate}
        onClose={() => setShowEditor(false)}
        onSave={async () => {
          await loadTemplates();
          setShowEditor(false);
        }}
      />

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete Prompt Template"
        message={`Are you sure you want to delete "${deletingTemplate?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => { setShowDeleteConfirm(false); setDeletingTemplate(null); }}
      />
    </>
  );
};

export default PromptTemplatesCard;
