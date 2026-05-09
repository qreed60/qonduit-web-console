import React, { useState, useEffect } from 'react';
import { EndpointOverrides, ProviderType, Settings as AppSettings } from '../types';
import { getSettings, saveSettings, fetchProviderModels, NormalizedModel } from '../services/api';
import { ENDPOINTS, getMode, setMode, setEndpointOverride, clearEndpointOverrides, hasEndpointOverride, validateEndpoint } from '../config/endpoints';
import { Settings, Settings2 } from 'lucide-react';
import Toast from '../components/Toast';
import MobileCollapsibleCard from '../components/MobileCollapsibleCard';
import GatewaySettingsSection from '../components/GatewaySettingsSection';

const SettingsPage: React.FC = () => {
  const [formData, setFormData] = useState<AppSettings>(getSettings());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [overrides, setOverrides] = useState<EndpointOverrides>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [availableModels, setAvailableModels] = useState<NormalizedModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [gatewaySummary, setGatewaySummary] = useState<string>('');

  useEffect(() => {
    setFormData(getSettings());
    // Load runtime overrides
    try {
      const raw = localStorage.getItem('qonduit-endpoint-overrides');
      if (raw) setOverrides(JSON.parse(raw));
    } catch { /* ignore */ }
    // Load models for the default provider
    loadModels(getSettings().defaultProvider);
  }, []);

  // Reload models when provider changes
  useEffect(() => {
    loadModels(formData.defaultProvider);
  }, [formData.defaultProvider]);

  const loadModels = async (provider: ProviderType) => {
    setModelsLoading(true);
    try {
      const models = await fetchProviderModels(provider);
      setAvailableModels(models);
    } catch {
      // Models may not be available
      setAvailableModels([]);
    } finally {
      setModelsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
     const { name, value } = e.target;
     setFormData((prev: AppSettings) => ({
      ...prev,
      [name]: value,
    }));
    setIsDirty(true);
  };

  const handleModeChange = (mode: 'local' | 'public') => {
    setMode(mode);
    setIsDirty(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettings(formData);
    setIsDirty(false);
    setToastMessage('Settings saved successfully!');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleReset = () => {
    const defaults = getSettings();
    setFormData(defaults);
    setIsDirty(false);
  };

  const handleOverrideChange = (key: string, value: string) => {
    setOverrides((prev) => ({ ...prev, [key]: value }));
    // Validate in real-time
    const result = validateEndpoint(value);
    setValidationErrors((prev) => {
      const next = { ...prev };
      if (value && !result.valid) next[key] = result.error || '';
      else delete next[key];
      return next;
    });
  };

  const handleApplyOverrides = () => {
    for (const [key, value] of Object.entries(overrides)) {
      if (value) {
        const result = validateEndpoint(value);
        if (!result.valid) {
          setToastMessage(`Invalid ${key} endpoint: ${result.error}`);
          setTimeout(() => setToastMessage(null), 4000);
          return;
        }
        setEndpointOverride(key as 'gateway' | 'router' | 'llama', value);
      }
    }
    setToastMessage('Endpoint overrides applied — page will refresh');
    setTimeout(() => {
      setToastMessage(null);
      window.location.reload();
    }, 2000);
  };

  const handleClearOverrides = () => {
    clearEndpointOverrides();
    setOverrides({});
    setValidationErrors({});
    setToastMessage('Endpoint overrides cleared — page will refresh');
    setTimeout(() => {
      setToastMessage(null);
      window.location.reload();
    }, 2000);
  };

  const currentMode = getMode();

  const settingsSummary = `Endpoint Mode: ${currentMode === 'public' ? 'Public' : 'Local'} · Provider: ${formData.defaultProvider}`;

  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6 h-full flex flex-col">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-accent-primary to-accent-tertiary bg-clip-text text-transparent">
          Settings
        </h2>
        <p className="text-sm text-text-secondary mt-2">
          Configure endpoint mode, defaults, and gateway parameters
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl space-y-4 sm:space-y-6">
          {/* Card 1: Original Settings */}
          <MobileCollapsibleCard
            title="Settings"
            icon={<Settings className="w-5 h-5 text-accent-primary" />}
            summaryText={settingsSummary}
            defaultExpanded={true}
            defaultExpandedMobile={true}
            localStorageKey="settings-card-expanded"
          >
            <form onSubmit={handleSave}>
              <div className="space-y-4 sm:space-y-5">
                {/* Endpoint Mode */}
                <div>
                  <h3 className="text-base font-semibold text-text-primary mb-3">Endpoint Mode</h3>
                  <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                    <button
                      type="button"
                      onClick={() => handleModeChange('local')}
                      className={`flex-1 px-6 py-4 rounded-xl border-2 text-left transition-all duration-200 min-h-[80px] ${
                        currentMode === 'local'
                          ? 'border-accent-primary bg-accent-primary/5'
                          : 'border-border-primary bg-bg-secondary/30 hover:border-border-primary/60'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          currentMode === 'local' ? 'border-accent-primary' : 'border-border-primary'
                        }`}>
                          {currentMode === 'local' && (
                            <div className="w-2 h-2 rounded-full bg-accent-primary" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-text-primary">Local</p>
                          <p className="text-xs text-text-secondary truncate">{ENDPOINTS.router.local}</p>
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleModeChange('public')}
                      className={`flex-1 px-6 py-4 rounded-xl border-2 text-left transition-all duration-200 min-h-[80px] ${
                        currentMode === 'public'
                          ? 'border-accent-primary bg-accent-primary/5'
                          : 'border-border-primary bg-bg-secondary/30 hover:border-border-primary/60'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          currentMode === 'public' ? 'border-accent-primary' : 'border-border-primary'
                        }`}>
                          {currentMode === 'public' && (
                            <div className="w-2 h-2 rounded-full bg-accent-primary" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-text-primary">Public</p>
                          <p className="text-xs text-text-secondary truncate">{ENDPOINTS.router.public}</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Default Configuration */}
                <div>
                  <h3 className="text-base font-semibold text-text-primary mb-3">Default Configuration</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2">
                        Default Provider
                      </label>
                      <select
                        name="defaultProvider"
                        value={formData.defaultProvider}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-bg-secondary border border-border-primary rounded-xl text-text-primary focus:outline-none focus:border-accent-primary/50 focus:ring-1 focus:ring-accent-primary/50 transition-all duration-200 min-h-[48px]"
                      >
                        <option value="Direct">Direct</option>
                        <option value="Gateway">Gateway</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2">
                        Default Model
                      </label>
                      <div className="relative">
                        <input
                          list="settings-model-options"
                          name="defaultModel"
                          value={formData.defaultModel}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-bg-secondary border border-border-primary rounded-xl text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent-primary/50 focus:ring-1 focus:ring-accent-primary/50 transition-all duration-200 min-h-[48px]"
                          placeholder="Select or type a model name..."
                        />
                        <datalist id="settings-model-options">
                          {modelsLoading ? (
                            <option value="" disabled>Loading models...</option>
                          ) : (
                            availableModels.map((m) => (
                              <option key={m.id} value={m.name}>
                                {m.name}
                                {m.parameterSize && m.parameterSize !== 'unknown' ? ` (${m.parameterSize})` : ''}
                              </option>
                            ))
                          )}
                        </datalist>
                        {availableModels.length > 0 && (
                          <p className="text-[10px] sm:text-xs text-text-tertiary mt-1.5">
                            {availableModels.length} model{availableModels.length !== 1 ? 's' : ''} available for {formData.defaultProvider} · Type to filter or select from suggestions
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2">
                        API Key
                      </label>
                      <input
                        type="password"
                        name="apiKey"
                        value={formData.apiKey}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-bg-secondary border border-border-primary rounded-xl text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent-primary/50 focus:ring-1 focus:ring-accent-primary/50 transition-all duration-200 min-h-[48px]"
                        placeholder="local"
                      />
                    </div>
                  </div>
                </div>

                {/* Runtime Endpoint Overrides */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-semibold text-text-primary">Runtime Endpoint Overrides</h3>
                    <button
                      type="button"
                      onClick={handleClearOverrides}
                      className="px-4 py-2 rounded-lg text-xs font-medium border border-border-primary text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-all duration-200 flex-shrink-0"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="space-y-3">
                    {(Object.keys(ENDPOINTS) as Array<keyof typeof ENDPOINTS>).map((key) => {
                      const currentValue = overrides[key] || ENDPOINTS[key][currentMode];
                      const hasOverride = hasEndpointOverride(key);
                      const error = validationErrors[key];
                      return (
                        <div key={key} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                          <span className="text-sm font-medium text-text-secondary capitalize flex-shrink-0">{key}</span>
                          <input
                            type="text"
                            value={currentValue}
                            onChange={(e) => handleOverrideChange(key, e.target.value)}
                            placeholder={`http://...`}
                            className={`flex-1 px-4 py-2.5 bg-bg-secondary border rounded-xl text-text-primary text-sm font-mono focus:outline-none focus:ring-1 transition-all duration-200 min-h-[44px] ${
                              error
                                ? 'border-status-error/50 focus:border-status-error/50 focus:ring-status-error/50'
                                : hasOverride
                                ? 'border-accent-primary/50 focus:border-accent-primary/50 focus:ring-accent-primary/50'
                                : 'border-border-primary focus:border-accent-primary/50 focus:ring-accent-primary/50'
                            }`}
                          />
                          {hasOverride && (
                            <span className="text-xs text-accent-primary font-medium flex-shrink-0">Override</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {Object.keys(validationErrors).length > 0 && (
                    <div className="mt-3 space-y-1">
                      {Object.entries(validationErrors).map(([key, error]) => (
                        <p key={key} className="text-xs text-status-error">{key}: {error}</p>
                      ))}
                    </div>
                  )}
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={handleApplyOverrides}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-medium bg-gradient-to-r from-accent-primary to-accent-tertiary hover:from-accent-primary-hover hover:to-accent-tertiary text-white shadow-lg shadow-accent-primary/20 transition-all duration-200 min-h-[44px]"
                    >
                      Apply &amp; Reload
                    </button>
                  </div>
                </div>

                {/* Active Endpoints */}
                <div>
                  <h3 className="text-base font-semibold text-text-primary mb-3">Active Endpoints</h3>
                  <div className="space-y-2">
                    {Object.entries(ENDPOINTS).map(([key, urls]) => (
                      <div key={key} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-bg-secondary/30 rounded-xl border border-border-subtle gap-1 sm:gap-0">
                        <span className="text-sm font-medium text-text-primary capitalize">{key}</span>
                        <span className="text-xs font-mono text-text-secondary break-all">{urls[currentMode]}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4 border-t border-border-primary">
                  <button
                    type="submit"
                    disabled={!isDirty}
                    className={`flex-1 px-8 py-3 rounded-xl font-medium transition-all duration-200 min-h-[48px] ${
                      isDirty
                        ? 'bg-gradient-to-r from-accent-primary to-accent-tertiary hover:from-accent-primary-hover hover:to-accent-tertiary text-white shadow-lg shadow-accent-primary/20 hover:shadow-accent-primary/30'
                        : 'bg-bg-tertiary text-text-secondary cursor-not-allowed'
                    }`}
                  >
                    Save Settings
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex-1 px-8 py-3 bg-bg-secondary border border-border-primary rounded-xl text-text-primary hover:bg-bg-tertiary transition-colors min-h-[48px]"
                  >
                    Reset to Defaults
                  </button>
                </div>
              </div>
            </form>
          </MobileCollapsibleCard>

          {/* Card 2: Gateway Settings */}
          <MobileCollapsibleCard
            title="Gateway Settings"
            icon={<Settings2 className="w-5 h-5 text-accent-primary" />}
            summaryText={gatewaySummary || 'Loading gateway configuration…'}
            defaultExpanded={false}
            defaultExpandedMobile={false}
            localStorageKey="gateway-settings-card-expanded"
          >
            <GatewaySettingsSection onSummaryChange={setGatewaySummary} />
          </MobileCollapsibleCard>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="success"
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
};

export default SettingsPage;
