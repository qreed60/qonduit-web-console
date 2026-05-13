import React from 'react';
import { AlertCircle, CheckCircle2, ClipboardCheck, Edit3, FileText, Loader2, Play, RotateCcw, Square } from 'lucide-react';
import { RouterSlot } from '../types';
import { formatGpuDevices, safeDisplayValue } from '../utils/routerDisplay';

interface SlotCardProps {
  slot: RouterSlot;
  actionLoading?: string | null;
  logsOpen?: boolean;
  logs?: string[];
  logsError?: string | null;
  preflightResult?: string | null;
  preflightError?: string | null;
  onLaunch: (slot: RouterSlot) => void;
  onStop: (slot: RouterSlot) => void;
  onRestart: (slot: RouterSlot) => void;
  onEdit: (slot: RouterSlot) => void;
  onPreflight: (slot: RouterSlot) => void;
  onLogs: (slot: RouterSlot) => void;
}

function isSlotRunning(slot: RouterSlot): boolean {
  return slot.running === true || slot.status === 'running';
}

function isSlotReady(slot: RouterSlot): boolean {
  return slot.ready === true || isSlotRunning(slot);
}

const actionButton = 'inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

const SlotCard: React.FC<SlotCardProps> = ({
  slot,
  actionLoading,
  logsOpen,
  logs = [],
  logsError,
  preflightResult,
  preflightError,
  onLaunch,
  onStop,
  onRestart,
  onEdit,
  onPreflight,
  onLogs,
}) => {
  const slotId = safeDisplayValue(slot.slot_id);
  const name = safeDisplayValue(slot.name || slot.slot_id);
  const model = safeDisplayValue(slot.model || slot.model_path);
  const containerName = safeDisplayValue(slot.container_name);
  const openaiBase = safeDisplayValue(slot.openai_base);
  const gpuDevices = formatGpuDevices(slot.effective_gpu_devices ?? slot.gpu_devices);
  const contextSize = safeDisplayValue(slot.context_size ?? slot.n_ctx);
  const hostPort = safeDisplayValue(slot.host_port ?? slot.port);
  const running = isSlotRunning(slot);
  const ready = isSlotReady(slot);
  const loading = actionLoading?.startsWith(`${slot.slot_id}:`);
  const loadingAction = actionLoading?.split(':')[1];

  return (
    <div className="bg-bg-secondary/40 rounded-xl border border-border-subtle p-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {ready ? <CheckCircle2 className="w-4 h-4 text-status-success flex-shrink-0" /> : <AlertCircle className="w-4 h-4 text-status-warning flex-shrink-0" />}
            <h4 className="text-sm font-semibold text-text-primary truncate">{name}</h4>
          </div>
          <p className="text-[10px] text-text-tertiary font-mono mt-1">slot: {slotId}</p>
        </div>
        <span className={`self-start text-[10px] px-2 py-0.5 rounded-full border ${running ? 'text-status-success border-status-success/20 bg-status-success/10' : 'text-status-warning border-status-warning/20 bg-status-warning/10'}`}>
          {safeDisplayValue(slot.status ?? (running ? 'running' : 'stopped'))}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 text-xs">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-text-tertiary">Model</p>
          <p className="font-mono text-text-primary truncate" title={model}>{model}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-text-tertiary">Container</p>
          <p className="font-mono text-text-primary truncate" title={containerName}>{containerName}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-text-tertiary">OpenAI Base</p>
          <p className="font-mono text-text-primary truncate" title={openaiBase}>{openaiBase}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-text-tertiary">GPU Devices</p>
          <p className="font-mono text-text-primary truncate" title={gpuDevices}>{gpuDevices}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-text-tertiary">Context</p>
          <p className="font-mono text-text-primary">{contextSize}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-text-tertiary">Host Port</p>
          <p className="font-mono text-text-primary">{hostPort}</p>
        </div>
      </div>

      {slot.last_error && (
        <div className="text-xs text-status-error bg-status-error/5 border border-status-error/20 rounded-lg p-2">
          {safeDisplayValue(slot.last_error)}
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <button disabled={loading} onClick={() => onLaunch(slot)} className={`${actionButton} text-status-success border-status-success/20 bg-status-success/5 hover:bg-status-success/10`}>
          {loadingAction === 'launch' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          Launch
        </button>
        <button disabled={loading} onClick={() => onStop(slot)} className={`${actionButton} text-status-error border-status-error/20 bg-status-error/5 hover:bg-status-error/10`}>
          {loadingAction === 'stop' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Square className="w-3.5 h-3.5" />}
          Stop
        </button>
        <button disabled={loading} onClick={() => onRestart(slot)} className={`${actionButton} text-accent-secondary border-accent-secondary/20 bg-accent-secondary/5 hover:bg-accent-secondary/10`}>
          {loadingAction === 'restart' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
          Restart
        </button>
        <button disabled={loading} onClick={() => onEdit(slot)} className={`${actionButton} text-text-secondary border-border-primary bg-bg-tertiary/50 hover:bg-bg-tertiary`}>
          <Edit3 className="w-3.5 h-3.5" />
          Edit
        </button>
        <button disabled={loading} onClick={() => onPreflight(slot)} className={`${actionButton} text-accent-primary border-accent-primary/20 bg-accent-primary/5 hover:bg-accent-primary/10`}>
          {loadingAction === 'preflight' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ClipboardCheck className="w-3.5 h-3.5" />}
          Preflight
        </button>
        <button disabled={loading} onClick={() => onLogs(slot)} className={`${actionButton} text-text-secondary border-border-primary bg-bg-tertiary/50 hover:bg-bg-tertiary`}>
          {loadingAction === 'logs' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
          Logs
        </button>
      </div>

      {(preflightResult || preflightError) && (
        <div className={`rounded-lg border p-3 text-xs ${preflightError ? 'bg-status-error/5 border-status-error/20 text-status-error' : 'bg-status-success/5 border-status-success/20 text-text-secondary'}`}>
          <p className="font-semibold mb-1">Preflight result</p>
          <pre className="whitespace-pre-wrap break-words font-mono text-[11px]">{preflightError || preflightResult}</pre>
        </div>
      )}

      {logsOpen && (
        <div className="rounded-lg border border-border-subtle bg-bg-terminal/80 p-3 text-xs">
          <div className="flex items-center justify-between mb-2">
            <p className="font-semibold text-text-primary">Logs</p>
            <span className="text-[10px] text-text-tertiary">{logs.length} lines</span>
          </div>
          {logsError ? (
            <p className="text-status-error">{safeDisplayValue(logsError)}</p>
          ) : logs.length > 0 ? (
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] text-text-secondary">{logs.join('\n')}</pre>
          ) : (
            <p className="text-text-tertiary">No logs returned for this slot.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default SlotCard;
