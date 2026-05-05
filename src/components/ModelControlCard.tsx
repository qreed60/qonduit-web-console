import React, { useState, useEffect } from 'react';
import StatusBadge from './StatusBadge';
import { NormalizedModel } from '../types';
import {
  Play,
  Square,
  RotateCcw,
  Cpu,
  AlertCircle,
  CheckCircle2,
  Info,
} from 'lucide-react';

interface ModelControlCardProps {
  routerStatus: { running: boolean; exists: boolean } | null;
  models: NormalizedModel[];
  selectedModel: string;
  ctxSize: number;
  suggestedCtx: number | null;
  onSelectModel: (name: string) => void;
  onCtxChange: (size: number) => void;
  onLaunch: () => void;
  onStop: () => void;
  onRestart: () => void;
  loading: boolean;
  actionStatus: 'idle' | 'launching' | 'stopping' | 'restarting' | 'success' | 'error';
  actionMessage: string;
}

/**
 * Context size presets supporting up to 262k context models.
 */
const PRESET_CTX = [4096, 8192, 16384, 32768, 65536, 131072, 262144];
const SLIDER_MIN = 512;
const SLIDER_MAX = 262144;
const SLIDER_STEP = 512;

const ModelControlCard: React.FC<ModelControlCardProps> = ({
  routerStatus,
  models,
  selectedModel,
  ctxSize,
  suggestedCtx,
  onSelectModel,
  onCtxChange,
  onLaunch,
  onStop,
  onRestart,
  loading,
  actionStatus,
  actionMessage,
}) => {
  const isRunning = routerStatus?.running;

  // Track the context size that was used when the model was launched,
  // so we can detect when context has changed and needs restart.
  const [runningCtxSize, setRunningCtxSize] = useState<number | null>(null);

  useEffect(() => {
    if (isRunning && selectedModel) {
      // When a model starts running, record the current context size.
      // This will be the "baseline" context for detecting changes.
      setRunningCtxSize(ctxSize);
    } else if (!isRunning) {
      // Reset when model stops.
      setRunningCtxSize(null);
    }
  }, [isRunning, selectedModel, ctxSize]);

  // Context size has changed from what was used at launch
  const ctxChanged = isRunning && runningCtxSize !== null && ctxSize !== runningCtxSize;

  // Launch enabled when router is reachable, model not running, and model selected
  const canLaunch = !isRunning && !loading && models.length > 0 && !!selectedModel;
  const canStop = isRunning && !loading;
  const canRestart = isRunning && !loading && selectedModel;

  const [customCtxInput, setCustomCtxInput] = useState('');

  const handlePresetClick = (ctx: number) => {
    onCtxChange(ctx);
    setCustomCtxInput('');
  };

  const handleCustomCtxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomCtxInput(e.target.value);
  };

  const handleCustomCtxSubmit = () => {
    const val = parseInt(customCtxInput, 10);
    if (!isNaN(val) && val >= SLIDER_MIN && val <= SLIDER_MAX && val % SLIDER_STEP === 0) {
      onCtxChange(val);
      setCustomCtxInput('');
    }
  };

  const handleCustomCtxKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCustomCtxSubmit();
    }
  };

  const isPreset = PRESET_CTX.includes(ctxSize);

  // Determine why launch might be disabled
  const launchDisabledReason = () => {
    if (!routerStatus) return 'Router not available';
    if (isRunning) return 'Model is already running — use Restart';
    if (loading) return 'Action in progress';
    if (models.length === 0) return 'No models available';
    if (!selectedModel) return 'No model selected';
    return '';
  };

  // Determine why restart might be disabled
  const restartDisabledReason = () => {
    if (!routerStatus) return 'Router not available';
    if (!isRunning) return 'No model is currently running';
    if (loading) return 'Action in progress';
    if (!selectedModel) return 'No model selected';
    return '';
  };

  return (
    <div className="bg-bg-card rounded-xl border border-border-primary p-5 shadow-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-semibold text-text-primary">
            Router Model Control
          </h3>
          <p className="text-xs text-text-secondary mt-0.5">
            {isRunning
              ? `Running: ${selectedModel || 'unknown'}`
              : models.length > 0
              ? 'Select and launch a model'
              : 'No models available'}
          </p>
        </div>
        <StatusBadge
          status={isRunning ? 'online' : !routerStatus ? 'unknown' : 'offline'}
          label={isRunning
            ? 'Running'
            : !routerStatus ? 'Checking...' : 'Stopped'}
        />
      </div>

      {/* Model Selection — always enabled when router is reachable */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-text-secondary mb-1.5">
          Select Model
        </label>
        <select
          value={selectedModel}
          onChange={(e) => onSelectModel(e.target.value)}
          disabled={loading}
          className="w-full px-4 py-2.5 bg-bg-secondary border border-border-primary rounded-lg text-text-primary text-sm focus:outline-none focus:border-accent-primary/50 focus:ring-1 focus:ring-accent-primary/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          <option value="">Choose a model...</option>
          {models.map((m) => (
            <option key={m.name} value={m.name}>
              {m.name}
              {m.path ? ` (${m.path.split('/').pop()})` : ''}
            </option>
          ))}
        </select>
        {models.length === 0 && !loading && (
          <p className="text-xs text-text-tertiary mt-1.5 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Router API unavailable — check connection
          </p>
        )}
      </div>

      {/* Context Size */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-medium text-text-secondary">
            Context Size
          </label>
          <span className="text-xs font-mono text-accent-primary font-semibold">{ctxSize.toLocaleString()}</span>
        </div>

        {/* Preset Buttons */}
        <div className="flex gap-1.5 mb-2">
          {PRESET_CTX.map((ctx) => (
            <button
              key={ctx}
              onClick={() => handlePresetClick(ctx)}
              disabled={loading}
              className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                ctxSize === ctx
                  ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/30'
                  : 'bg-bg-secondary border border-border-subtle text-text-tertiary hover:text-text-primary hover:border-border-primary disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              {ctx >= 1000 ? `${ctx / 1000}k` : ctx}
            </button>
          ))}
        </div>

        {/* Custom Input */}
        <div className="flex gap-2 mb-2">
          <input
            type="number"
            min={SLIDER_MIN}
            max={SLIDER_MAX}
            step={SLIDER_STEP}
            value={customCtxInput}
            onChange={handleCustomCtxChange}
            onKeyDown={handleCustomCtxKeyDown}
            placeholder="Custom (multiple of 512)"
            disabled={loading}
            className="flex-1 px-3 py-1.5 bg-bg-secondary border border-border-primary rounded-md text-xs text-text-primary focus:outline-none focus:border-accent-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleCustomCtxSubmit}
            disabled={loading || !customCtxInput}
            className="px-3 py-1.5 bg-bg-secondary border border-border-primary rounded-md text-xs font-medium text-text-secondary hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            Apply
          </button>
        </div>

        {/* Slider */}
        <div className="relative">
          <input
            type="range"
            min={String(SLIDER_MIN)}
            max={String(SLIDER_MAX)}
            step={String(SLIDER_STEP)}
            value={ctxSize}
            onChange={(e) => onCtxChange(Number(e.target.value))}
            disabled={loading}
            className="w-full h-1.5 bg-bg-secondary rounded-lg appearance-none cursor-pointer accent-accent-primary disabled:opacity-50 disabled:cursor-not-allowed"
          />
          {suggestedCtx && !isPreset && (
            <div className="flex items-center gap-1 mt-1">
              <Info className="w-3 h-3 text-accent-primary flex-shrink-0" />
              <span className="text-[10px] text-accent-primary">
                Suggested: {suggestedCtx}
              </span>
            </div>
          )}
          {ctxChanged && (
            <div className="flex items-center gap-1 mt-1">
              <AlertCircle className="w-3 h-3 text-status-warning flex-shrink-0" />
              <span className="text-[10px] text-status-warning">
                Context changed from {runningCtxSize.toLocaleString()} — restart to apply
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mb-4">
        <button
          onClick={onLaunch}
          disabled={!canLaunch}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
            canLaunch
              ? 'bg-gradient-to-r from-accent-primary to-accent-tertiary hover:from-accent-primary-hover hover:to-accent-tertiary text-white shadow-lg shadow-accent-primary/20 hover:shadow-accent-primary/30'
              : 'bg-bg-tertiary text-text-secondary border border-border-primary cursor-not-allowed'
          }`}
          title={launchDisabledReason()}
        >
          {loading && actionStatus === 'launching' ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.825 3 7.938l3-2.647z" />
              </svg>
              <span>Launching...</span>
            </>
          ) : isRunning ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Running</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              <span>Launch Model</span>
            </>
          )}
        </button>
        <button
          onClick={onRestart}
          disabled={!canRestart}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
            canRestart
              ? ctxChanged
                ? 'bg-status-warning/10 text-status-warning border border-status-warning/30 hover:bg-status-warning/20 animate-pulse'
                : 'bg-accent-secondary/10 text-accent-secondary border border-accent-secondary/20 hover:bg-accent-secondary/20'
              : 'bg-bg-tertiary text-text-secondary border border-border-primary cursor-not-allowed'
          }`}
          title={restartDisabledReason()}
        >
          {loading && actionStatus === 'restarting' ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.825 3 7.938l3-2.647z" />
              </svg>
              <span>Restarting...</span>
            </>
          ) : (
            <>
              <RotateCcw className="w-4 h-4" />
              <span>Restart</span>
            </>
          )}
        </button>
        <button
          onClick={onStop}
          disabled={!canStop}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
            canStop
              ? 'bg-status-error/10 text-status-error border border-status-error/20 hover:bg-status-error/20'
              : 'bg-bg-tertiary text-text-secondary border border-border-primary cursor-not-allowed'
          }`}
          title={canStop ? 'Stop the running model' : 'Model is not running'}
        >
          {loading && actionStatus === 'stopping' ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.825 3 7.938l3-2.647z" />
              </svg>
              <span>Stopping...</span>
            </>
          ) : (
            <>
              <Square className="w-4 h-4" />
              <span>Stop</span>
            </>
          )}
        </button>
      </div>

      {/* Action Message */}
      {actionMessage && (
        <div className={`flex items-start gap-2 px-3 py-2.5 rounded-lg text-xs ${
          actionStatus === 'success'
            ? 'bg-status-success/10 text-status-success border border-status-success/20'
            : actionStatus === 'error'
            ? 'bg-status-error/10 text-status-error border border-status-error/20'
            : 'bg-bg-secondary/50 text-text-secondary border border-border-subtle'
        }`}>
          {actionStatus === 'success' ? (
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          ) : actionStatus === 'error' ? (
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          ) : (
            <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          )}
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Running State Display */}
      {isRunning && selectedModel && (
        <div className="mt-4 flex items-center gap-3 px-3 py-2.5 bg-status-success/5 rounded-lg border border-status-success/10">
          <Cpu className="w-4 h-4 text-status-success flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-status-success">Model Running</p>
            <p className="text-[10px] text-text-tertiary truncate">
              {selectedModel} · ctx: {ctxSize.toLocaleString()}
              {ctxChanged && (
                <span className="text-status-warning ml-1">(changed — restart to apply)</span>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelControlCard;
