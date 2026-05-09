import React, { useState, useEffect, useCallback } from 'react';
import { Settings2 } from 'lucide-react';
import { GatewaySettings, PromptTemplate, RagProjectSummary } from '../types';
import {
  getGatewaySettings,
  updateGatewaySettings,
  resetGatewaySettings,
  listPromptTemplates,
  activatePromptTemplate,
} from '../services/gatewayApi';
import { getRagProjects, getRagProjectDetail } from '../services/ragApi';
import Toast from './Toast';
import ConfirmDialog from './ConfirmDialog';

interface GatewayDefaultsCardProps {
  onSettingsChange?: (settings: GatewaySettings) => void;
}

interface RagProjectOption {
  id: string;
  label: string;
}

interface RagCollectionOption {
  name: string;
  label: string;
}

const GatewayDefaultsCard: React.FC<GatewayDefaultsCardProps> = ({ onSettingsChange }) => {
  const [settings, setSettings] = useState<GatewaySettings | null>(null);
  const [draft, setDraft] = useState<GatewaySettings | null>(null);
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // RAG data
  const [ragProjects, setRagProjects] = useState<RagProjectOption[]>([]);
  const [ragProjectError, setRagProjectError] = useState<string | null>(null);
  const [ragCollections, setRagCollections] = useState<RagCollectionOption[]>([]);
  const [ragCollectionError, setRagCollectionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [settingsData, templatesData] = await Promise.all([
        getGatewaySettings(),
        listPromptTemplates(),
      ]);
      setSettings(settingsData);
      setDraft({ ...settingsData });
      setTemplates(templatesData.templates || []);
      onSettingsChange?.(settingsData);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load settings';
      setError(msg);
      setToastMessage(msg);
    } finally {
      setLoading(false);
    }
  }, [onSettingsChange]);

  const loadRagProjects = useCallback(async () => {
    try {
      const res = await getRagProjects();
      const options = res.projects.map((p: RagProjectSummary) => ({
        id: p.project_id,
        label: p.project_id,
      }));
      setRagProjects(options);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load RAG projects';
      setRagProjectError(msg);
      // Fallback to text input — user can type manually
    }
  }, []);

  const loadRagCollections = useCallback(async (projectId: string) => {
    try {
      const res = await getRagProjectDetail(projectId);
      if (res.logical_collections && res.logical_collections.length > 0) {
        setRagCollections(res.logical_collections.map((name) => ({ name, label: name })));
      } else {
        setRagCollections([]);
      }
      setRagCollectionError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load RAG collections';
      setRagCollectionError(msg);
      setRagCollections([]);
    }
  }, []);

  const handleRagProjectChange = (projectId: string) => {
    setDraft((prev) => (prev ? { ...prev, default_rag_project: projectId } : prev));
    // Load collections for this project
    if (projectId) {
      loadRagCollections(projectId);
    } else {
      setRagCollections([]);
      setDraft((prev) => (prev ? { ...prev, default_rag_collection: '' } : prev));
    }
  };

  useEffect(() => { load(); loadRagProjects(); }, [load, loadRagProjects]);

  // Load collections when draft RAG project changes
  useEffect(() => {
    if (draft?.default_rag_project) {
      loadRagCollections(draft.default_rag_project);
    }
  }, [draft?.default_rag_project, loadRagCollections]);

  const isDirty = draft && settings && JSON.stringify(draft) !== JSON.stringify(settings);

  const handleFieldChange = (field: keyof GatewaySettings, value: string | number | boolean) => {
    setDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  // ── Active Template: activate immediately, no Save required ──
  const handleActiveTemplateChange = async (templateId: string) => {
    if (!templateId) return;
    setActivating(true);
    try {
      await activatePromptTemplate(templateId);
      // Refresh settings and templates to reflect the new active template
      await load();
      setToastMessage('Template activated');
     } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to activate template';
      setToastMessage(msg);
    } finally {
      setActivating(false);
    }
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const updated = await updateGatewaySettings(draft);
      setSettings(updated);
      setDraft({ ...updated });
      onSettingsChange?.(updated);
      setToastMessage('Gateway settings saved');
     } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save settings';
      setToastMessage(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDraft(settings ? { ...settings } : null);
  };

  const handleReset = async () => {
    try {
      const updated = await resetGatewaySettings();
      setSettings(updated);
      setDraft({ ...updated });
      onSettingsChange?.(updated);
      setToastMessage('Gateway settings reset to defaults');
      } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to reset settings';
      setToastMessage(msg);
    }
    setShowResetConfirm(false);
  };

  const activeTemplate = templates.find(
     (t) => t.id === settings?.active_prompt_template_id || t.name === settings?.active_prompt_template_id
   );

  const currentRagProject = draft?.default_rag_project || settings?.default_rag_project || '';

  if (loading) {
    return (
      <div className="bg-bg-card rounded-2xl border border-border-primary p-4 sm:p-6 shadow-card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-bg-secondary flex items-center justify-center">
            <Settings2 className="w-5 h-5 text-text-tertiary" />
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-text-primary">Gateway Defaults</h3>
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
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-lg bg-bg-secondary flex items-center justify-center">
                <Settings2 className="w-5 h-5 text-accent-primary" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-text-primary">Gateway Defaults</h3>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              These are fallback values used when a chat request does not explicitly provide a setting.
              Chat page selections always override these defaults.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-status-error/10 border border-status-error/20 text-sm text-status-error">
            {error}
          </div>
        )}

        <div className="space-y-4 sm:space-y-5">
          {/* Active Template */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Active Prompt Template
            </label>
            <p className="text-xs text-text-tertiary mb-2">
              Controls the default system/instruction behavior applied by the gateway. Changes apply immediately.
            </p>
            {activeTemplate && (
              <div className="mb-2 px-3 py-1.5 rounded-lg bg-accent-primary/5 border border-accent-primary/15 text-xs text-accent-primary inline-flex items-center gap-1.5">
                <span className="font-medium">Currently active:</span> {activeTemplate.name}
              </div>
            )}
            <select
               value={settings?.active_prompt_template_id || ''}
               onChange={(e) => handleActiveTemplateChange(e.target.value)}
               disabled={activating}
               className="w-full px-4 py-3 bg-bg-secondary border border-border-primary rounded-xl text-text-primary focus:outline-none focus:border-accent-primary/50 focus:ring-1 focus:ring-accent-primary/50 transition-all duration-200 min-h-[48px] disabled:opacity-60"
             >
               {templates.map((t) => (
                 <option key={t.id} value={t.id} disabled={t.is_active}>
                   {t.name}{t.is_active ? ' (active)' : ''}
                 </option>
               ))}
             </select>
          </div>

          {/* Default Model */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Default Model
            </label>
            <p className="text-xs text-text-tertiary mb-2">
              Optional fallback model name. Leave blank to use the chat-selected model or gateway default.
            </p>
            <input
              type="text"
              value={draft?.default_model || ''}
              onChange={(e) => handleFieldChange('default_model', e.target.value)}
              className="w-full px-4 py-3 bg-bg-secondary border border-border-primary rounded-xl text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent-primary/50 focus:ring-1 focus:ring-accent-primary/50 transition-all duration-200 min-h-[48px]"
              placeholder="Leave blank for selected chat model"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Max Tokens */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Max Tokens
              </label>
              <p className="text-xs text-text-tertiary mb-2">
                Fallback output token budget when the request does not specify max_tokens.
              </p>
              <input
                type="number"
                min="1"
                value={draft?.max_tokens ?? 2048}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  handleFieldChange('max_tokens', v > 0 ? v : 1);
                }}
                className="w-full px-4 py-3 bg-bg-secondary border border-border-primary rounded-xl text-text-primary focus:outline-none focus:border-accent-primary/50 focus:ring-1 focus:ring-accent-primary/50 transition-all duration-200 min-h-[48px]"
              />
            </div>

            {/* Temperature */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Temperature ({(draft?.temperature ?? 0.7).toFixed(1)})
              </label>
              <p className="text-xs text-text-tertiary mb-2">
                Higher is more creative; lower is more deterministic.
              </p>
              <input
                type="number"
                step="0.1"
                min="0"
                max="2"
                value={draft?.temperature ?? 0.7}
                onChange={(e) => handleFieldChange('temperature', parseFloat(e.target.value) ?? 0.7)}
                className="w-full px-4 py-3 bg-bg-secondary border border-border-primary rounded-xl text-text-primary focus:outline-none focus:border-accent-primary/50 focus:ring-1 focus:ring-accent-primary/50 transition-all duration-200 min-h-[48px]"
              />
            </div>
          </div>

          {/* Stream Default & RAG Enabled */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Stream Default
              </label>
              <p className="text-xs text-text-tertiary mb-2">
                Fallback streaming behavior when a request does not specify stream.
              </p>
              <div className="flex gap-2">
                {([true, false] as const).map((val) => (
                  <button
                    key={String(val)}
                    type="button"
                    onClick={() => handleFieldChange('stream_default', val)}
                    className={`flex-1 min-h-[48px] px-4 py-3 rounded-xl text-sm font-medium border transition-all duration-200 ${
                      draft?.stream_default === val
                        ? 'bg-accent-primary/10 text-accent-primary border-accent-primary/30'
                        : 'bg-bg-secondary border-border-primary text-text-secondary hover:bg-bg-tertiary'
                    }`}
                  >
                    {val ? 'On' : 'Off'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                RAG Enabled
              </label>
              <p className="text-xs text-text-tertiary mb-2">
                Default RAG state for gateway requests that do not explicitly set rag_enabled.
              </p>
              <div className="flex gap-2">
                {([true, false] as const).map((val) => (
                  <button
                    key={String(val)}
                    type="button"
                    onClick={() => handleFieldChange('rag_enabled_default', val)}
                    className={`flex-1 min-h-[48px] px-4 py-3 rounded-xl text-sm font-medium border transition-all duration-200 ${
                      draft?.rag_enabled_default === val
                        ? 'bg-accent-primary/10 text-accent-primary border-accent-primary/30'
                        : 'bg-bg-secondary border-border-primary text-text-secondary hover:bg-bg-tertiary'
                    }`}
                  >
                    {val ? 'On' : 'Off'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* RAG Project */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              RAG Project
            </label>
            <p className="text-xs text-text-tertiary mb-2">
              Which RAG project to use when a request does not specify one.
            </p>
            {ragProjectError && (
              <p className="text-xs text-status-warning mb-2">Could not load projects — typing a name is still supported.</p>
            )}
            {ragProjects.length > 0 ? (
              <select
                value={draft?.default_rag_project || ''}
                onChange={(e) => handleRagProjectChange(e.target.value)}
                className="w-full px-4 py-3 bg-bg-secondary border border-border-primary rounded-xl text-text-primary focus:outline-none focus:border-accent-primary/50 focus:ring-1 focus:ring-accent-primary/50 transition-all duration-200 min-h-[48px]"
              >
                <option value="">Select a project…</option>
                {ragProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={draft?.default_rag_project || ''}
                onChange={(e) => {
                  handleFieldChange('default_rag_project', e.target.value);
                  // Clear collections when project changes manually
                  if (e.target.value !== currentRagProject) {
                    setRagCollections([]);
                    handleFieldChange('default_rag_collection', '');
                  }
                }}
                className="w-full px-4 py-3 bg-bg-secondary border border-border-primary rounded-xl text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent-primary/50 focus:ring-1 focus:ring-accent-primary/50 transition-all duration-200 min-h-[48px]"
                placeholder="default"
              />
            )}
          </div>

          {/* RAG Collection */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              RAG Collection
            </label>
            <p className="text-xs text-text-tertiary mb-2">
              Which collection within the selected project to search. Leave blank to search all collections.
            </p>
            {ragCollectionError && ragCollections.length === 0 && (
              <p className="text-xs text-status-warning mb-2">Could not load collections — typing a name is still supported.</p>
            )}
            {ragCollections.length > 0 ? (
              <select
                value={draft?.default_rag_collection || ''}
                onChange={(e) => handleFieldChange('default_rag_collection', e.target.value)}
                className="w-full px-4 py-3 bg-bg-secondary border border-border-primary rounded-xl text-text-primary focus:outline-none focus:border-accent-primary/50 focus:ring-1 focus:ring-accent-primary/50 transition-all duration-200 min-h-[48px]"
              >
                <option value="">All collections / no default collection</option>
                {ragCollections.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={draft?.default_rag_collection || ''}
                onChange={(e) => handleFieldChange('default_rag_collection', e.target.value)}
                className="w-full px-4 py-3 bg-bg-secondary border border-border-primary rounded-xl text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent-primary/50 focus:ring-1 focus:ring-accent-primary/50 transition-all duration-200 min-h-[48px]"
                placeholder="Collection name"
              />
            )}
          </div>

          {/* RAG Search Limit */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              RAG Search Limit
            </label>
            <p className="text-xs text-text-tertiary mb-2">
              Number of chunks to retrieve for RAG when a request does not specify a limit.
            </p>
            <input
              type="number"
              min="1"
              value={draft?.rag_search_limit ?? 4}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                handleFieldChange('rag_search_limit', v > 0 ? v : 1);
              }}
              className="w-full px-4 py-3 bg-bg-secondary border border-border-primary rounded-xl text-text-primary focus:outline-none focus:border-accent-primary/50 focus:ring-1 focus:ring-accent-primary/50 transition-all duration-200 min-h-[48px]"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-4 border-t border-border-primary">
          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || saving}
            className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all duration-200 min-h-[48px] ${
              isDirty && !saving
                ? 'bg-gradient-to-r from-accent-primary to-accent-tertiary hover:from-accent-primary-hover hover:to-accent-tertiary text-white shadow-lg shadow-accent-primary/20'
                : 'bg-bg-tertiary text-text-secondary cursor-not-allowed'
            }`}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={!isDirty}
            className={`flex-1 px-6 py-3 rounded-xl font-medium border transition-all duration-200 min-h-[48px] ${
              isDirty
                ? 'border-border-primary text-text-primary hover:bg-bg-tertiary'
                : 'border-border-primary text-text-secondary cursor-not-allowed opacity-50'
            }`}
          >
            Cancel
          </button>
        </div>
      </div>

      {toastMessage && (
         <Toast
           message={toastMessage}
           type={toastMessage.startsWith('Failed') ? 'error' : 'success'}
           onClose={() => setToastMessage(null)}
         />
       )}
      <ConfirmDialog
        open={showResetConfirm}
        title="Reset Gateway Settings"
        message="This will reset all gateway settings to their default values. This action cannot be undone."
        confirmLabel="Reset"
        cancelLabel="Cancel"
        confirmVariant="warning"
        onConfirm={handleReset}
        onCancel={() => setShowResetConfirm(false)}
      />
    </>
  );
};

export default GatewayDefaultsCard;
