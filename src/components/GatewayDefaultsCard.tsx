import React, { useState, useEffect, useCallback } from 'react';
import { Settings2 } from 'lucide-react';
import { GatewaySettings, PromptTemplate } from '../types';
import {
  getGatewaySettings,
  updateGatewaySettings,
  resetGatewaySettings,
  listPromptTemplates,
} from '../services/gatewayApi';
import Toast from './Toast';
import ConfirmDialog from './ConfirmDialog';

interface GatewayDefaultsCardProps {
  onSettingsChange?: (settings: GatewaySettings) => void;
}

const GatewayDefaultsCard: React.FC<GatewayDefaultsCardProps> = ({ onSettingsChange }) => {
  const [settings, setSettings] = useState<GatewaySettings | null>(null);
  const [draft, setDraft] = useState<GatewaySettings | null>(null);
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => { load(); }, [load]);

  const isDirty = draft && settings && JSON.stringify(draft) !== JSON.stringify(settings);

  const handleFieldChange = (field: keyof GatewaySettings, value: string | number | boolean) => {
    setDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
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
      setTimeout(() => setToastMessage(null), 3000);
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
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to reset settings';
      setToastMessage(msg);
    }
    setShowResetConfirm(false);
  };

  const activeTemplate = templates.find((t) => t.id === settings?.active_prompt_template || t.name === settings?.active_prompt_template);
 
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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-bg-secondary flex items-center justify-center">
              <Settings2 className="w-5 h-5 text-accent-primary" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-text-primary">Gateway Defaults</h3>
          </div>
          {activeTemplate && (
            <span className="px-3 py-1 rounded-lg text-xs font-medium bg-accent-primary/10 text-accent-primary border border-accent-primary/20">
              ★ {activeTemplate.name}
            </span>
          )}
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="px-4 py-2 rounded-lg text-xs font-medium border border-border-primary text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-all duration-200 flex-shrink-0"
          >
            Reset
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-status-error/10 border border-status-error/20 text-sm text-status-error">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Active Template */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Active Template
            </label>
            <select
              value={settings?.active_prompt_template || ''}
              onChange={(e) => handleFieldChange('active_prompt_template', e.target.value)}
              className="w-full px-4 py-3 bg-bg-secondary border border-border-primary rounded-xl text-text-primary focus:outline-none focus:border-accent-primary/50 focus:ring-1 focus:ring-accent-primary/50 transition-all duration-200 min-h-[48px]"
            >
              <option value="">— None —</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Default Model */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Default Model
              </label>
              <input
                type="text"
                value={settings?.default_model || ''}
                onChange={(e) => handleFieldChange('default_model', e.target.value)}
                className="w-full px-4 py-3 bg-bg-secondary border border-border-primary rounded-xl text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent-primary/50 focus:ring-1 focus:ring-accent-primary/50 transition-all duration-200 min-h-[48px]"
                placeholder="e.g., qwen3-coder-next"
              />
            </div>

            {/* Max Tokens */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Max Tokens
              </label>
              <input
                type="number"
                value={settings?.max_tokens ?? 4096}
                onChange={(e) => handleFieldChange('max_tokens', parseInt(e.target.value, 10) || 0)}
                className="w-full px-4 py-3 bg-bg-secondary border border-border-primary rounded-xl text-text-primary focus:outline-none focus:border-accent-primary/50 focus:ring-1 focus:ring-accent-primary/50 transition-all duration-200 min-h-[48px]"
              />
            </div>
          </div>

          {/* Temperature */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Temperature ({settings?.temperature?.toFixed(1) ?? '0.7'})
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="2"
              value={settings?.temperature ?? 0.7}
              onChange={(e) => handleFieldChange('temperature', parseFloat(e.target.value) ?? 0.7)}
              className="w-full px-4 py-3 bg-bg-secondary border border-border-primary rounded-xl text-text-primary focus:outline-none focus:border-accent-primary/50 focus:ring-1 focus:ring-accent-primary/50 transition-all duration-200 min-h-[48px]"
            />
          </div>

          {/* Stream & RAG Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Stream Default
              </label>
              <div className="flex gap-2">
                {([true, false] as const).map((val) => (
                  <button
                    key={String(val)}
                    type="button"
                    onClick={() => handleFieldChange('stream_default', val)}
                    className={`flex-1 min-h-[48px] px-4 py-3 rounded-xl text-sm font-medium border transition-all duration-200 ${
                      settings?.stream_default === val
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
              <div className="flex gap-2">
                {([true, false] as const).map((val) => (
                  <button
                    key={String(val)}
                    type="button"
                    onClick={() => handleFieldChange('rag_enabled_default', val)}
                    className={`flex-1 min-h-[48px] px-4 py-3 rounded-xl text-sm font-medium border transition-all duration-200 ${
                      settings?.rag_enabled_default === val
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

          {/* RAG Project & Collection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                RAG Project
              </label>
              <input
                type="text"
                value={settings?.default_rag_project || ''}
                onChange={(e) => handleFieldChange('default_rag_project', e.target.value)}
                className="w-full px-4 py-3 bg-bg-secondary border border-border-primary rounded-xl text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent-primary/50 focus:ring-1 focus:ring-accent-primary/50 transition-all duration-200 min-h-[48px]"
                placeholder="Project name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                RAG Collection
              </label>
              <input
                type="text"
                value={settings?.default_rag_collection || ''}
                onChange={(e) => handleFieldChange('default_rag_collection', e.target.value)}
                className="w-full px-4 py-3 bg-bg-secondary border border-border-primary rounded-xl text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent-primary/50 focus:ring-1 focus:ring-accent-primary/50 transition-all duration-200 min-h-[48px]"
                placeholder="Collection name"
              />
            </div>
          </div>

          {/* RAG Search Limit */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              RAG Search Limit
            </label>
            <input
              type="number"
              value={settings?.rag_search_limit ?? 10}
              onChange={(e) => handleFieldChange('rag_search_limit', parseInt(e.target.value, 10) || 0)}
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

      <Toast message={toastMessage || ''} type={toastMessage ? 'error' : 'success'} onClose={() => setToastMessage(null)} />
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
