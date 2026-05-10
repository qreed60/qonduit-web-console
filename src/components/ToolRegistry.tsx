import React from 'react';
import {
  Database,
  FileText,
  Terminal,
  Cpu,
  Globe,
  Home,
  Zap,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  ToolCategory,
  ToolSettings,
  TOOL_REGISTRY,
} from '../types';
import { loadToolSettings, saveToolSettings } from '../services/toolApi';

const categoryConfig: Record<ToolCategory, { label: string; icon: React.ReactNode; color: string }> = {
  rag: { label: 'RAG', icon: <Database className="w-3.5 h-3.5" />, color: 'text-accent-primary' },
  filesystem: { label: 'Filesystem', icon: <FileText className="w-3.5 h-3.5" />, color: 'text-accent-secondary' },
  execution: { label: 'Execution', icon: <Terminal className="w-3.5 h-3.5" />, color: 'text-status-warning' },
  homeassistant: { label: 'Home Assistant', icon: <Home className="w-3.5 h-3.5" />, color: 'text-accent-tertiary' },
  web: { label: 'Web', icon: <Globe className="w-3.5 h-3.5" />, color: 'text-accent-primary' },
  system: { label: 'System', icon: <Cpu className="w-3.5 h-3.5" />, color: 'text-text-secondary' },
  utility: { label: 'Utility', icon: <Zap className="w-3.5 h-3.5" />, color: 'text-text-tertiary' },
};

interface ToolRegistryProps {
  compact?: boolean;
  showToggle?: boolean;
  onSettingsChange?: (settings: ToolSettings) => void;
}

const ToolRegistry: React.FC<ToolRegistryProps> = ({
  compact = false,
  showToggle = true,
  onSettingsChange,
}) => {
  const [settings, setSettings] = React.useState<ToolSettings>(loadToolSettings);

  const handleToggle = (toolName: string) => {
    const newSettings = {
      ...settings,
      global: { ...settings.global, [toolName]: !settings.global[toolName] },
    };
    setSettings(newSettings);
    saveToolSettings(newSettings);
    onSettingsChange?.(newSettings);
  };

  const handleConfirmationMode = (mode: ToolSettings['confirmationMode']) => {
    const newSettings = { ...settings, confirmationMode: mode };
    setSettings(newSettings);
    saveToolSettings(newSettings);
    onSettingsChange?.(newSettings);
  };

  const tools = Object.values(TOOL_REGISTRY);

  const groupedTools = Object.keys(categoryConfig).map((cat) => ({
    category: cat as ToolCategory,
    tools: tools.filter(t => t.category === cat as ToolCategory),
  })).filter(g => g.tools.length > 0);

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-text-primary">Available Tools</h3>
          <span className="text-[10px] sm:text-xs text-text-tertiary">
            Backend not connected
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {tools.map(tool => {
            const isEnabled = settings.global[tool.name] !== false;
            const cfg = categoryConfig[tool.category];
            return (
              <div
                key={tool.name}
                className={`p-2.5 rounded-lg border transition-all duration-200 ${
                  isEnabled
                    ? 'bg-accent-primary/5 border-accent-primary/20'
                    : 'bg-bg-secondary/30 border-border-subtle opacity-60'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={cfg.color}>{cfg.icon}</span>
                  <span className="text-xs font-medium text-text-primary truncate">
                    {tool.displayName}
                  </span>
                </div>
                {showToggle && (
                  <button
                    onClick={() => handleToggle(tool.name)}
                    className="w-full mt-1.5 flex items-center justify-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-all duration-200 min-h-[28px]"
                    style={{
                      background: isEnabled ? 'rgba(139, 92, 246, 0.15)' : 'rgba(100, 116, 139, 0.1)',
                      color: isEnabled ? '#a78bfa' : '#64748b',
                    }}
                  >
                    {isEnabled ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {isEnabled ? 'Enabled' : 'Disabled'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">Tool Registry</h3>
        <span className="text-[10px] sm:text-xs text-text-tertiary">
          Backend not connected
        </span>
      </div>

      {groupedTools.map(({ category, tools: groupTools }) => {
        const cfg = categoryConfig[category];
        return (
          <div key={category}>
            <div className="flex items-center gap-2 mb-2">
              <span className={cfg.color}>{cfg.icon}</span>
              <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                {cfg.label}
              </span>
            </div>
            <div className="space-y-2">
              {groupTools.map(tool => {
                const isEnabled = settings.global[tool.name] !== false;
                return (
                  <div
                    key={tool.name}
                    className={`p-3 rounded-lg border transition-all duration-200 ${
                      isEnabled
                        ? 'bg-accent-primary/5 border-accent-primary/20'
                        : 'bg-bg-secondary/30 border-border-subtle opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary">{tool.displayName}</p>
                        <p className="text-xs text-text-tertiary mt-0.5">{tool.description}</p>
                      </div>
                      {showToggle && (
                        <button
                          onClick={() => handleToggle(tool.name)}
                          className="ml-3 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 flex-shrink-0 min-h-[32px] min-w-[80px] text-center"
                          style={{
                            background: isEnabled ? 'rgba(139, 92, 246, 0.15)' : 'rgba(100, 116, 139, 0.1)',
                            color: isEnabled ? '#a78bfa' : '#64748b',
                          }}
                        >
                          {isEnabled ? 'Enabled' : 'Disabled'}
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      {tool.requiresConfirmation && (
                        <span className="text-[10px] text-status-warning flex items-center gap-1">
                          <Terminal className="w-3 h-3" />
                          Requires confirmation
                        </span>
                      )}
                      <span className="text-[10px] text-text-tertiary">
                        Provider: {tool.backendProvider}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Confirmation mode selector */}
      <div className="pt-2 border-t border-border-subtle">
        <p className="text-xs font-medium text-text-secondary mb-2">Confirmation Mode</p>
        <div className="flex flex-wrap gap-2">
          {(['risky-only', 'always', 'never'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => handleConfirmationMode(mode)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 min-h-[32px] ${
                settings.confirmationMode === mode
                  ? 'bg-accent-primary/15 text-accent-primary border border-accent-primary/30'
                  : 'bg-bg-secondary text-text-tertiary border border-border-subtle hover:text-text-secondary'
              }`}
            >
              {mode === 'risky-only' ? 'Risky Only' : mode === 'always' ? 'Always' : 'Never'}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-2">
        <p className="text-[10px] sm:text-xs text-text-tertiary">
          ℹ Tool support depends on backend capability. Configure in Settings → Gateway Settings.
        </p>
      </div>
    </div>
  );
};

export default ToolRegistry;
