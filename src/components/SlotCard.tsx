import React from 'react';
import { AlertCircle, CheckCircle2, Edit3, Play, RotateCcw, Square } from 'lucide-react';
import { RouterSlot } from '../types';
import { formatGpuDevices, safeDisplayValue } from '../utils/routerDisplay';
import FieldRow from './FieldRow';
import MobileActionGroup, { ActionButton } from './MobileActionGroup';
import CollapsibleDetail from './CollapsibleDetail';

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
  onCopy?: (value: string, label: string) => void;
}

function isSlotRunning(slot: RouterSlot): boolean {
  return slot.running === true || slot.status === 'running';
}

function isSlotReady(slot: RouterSlot): boolean {
  return slot.ready === true || isSlotRunning(slot);
}

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
  onCopy,
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

  const handleCopyEndpoint = async () => {
    if (onCopy && openaiBase) {
      await onCopy(openaiBase, `${name} endpoint`);
    }
  };

  const handleCopyContainer = async () => {
    if (onCopy && containerName) {
      await onCopy(containerName, 'container name');
    }
  };

  // Primary actions always visible
  const primaryActions: ActionButton[] = [
    {
      label: 'Launch',
      icon: <Play className="w-3.5 h-3.5" />,
      onClick: () => onLaunch(slot),
      variant: 'success',
      loading: loading && actionLoading?.endsWith(':launch'),
    },
    {
      label: 'Stop',
      icon: <Square className="w-3.5 h-3.5" />,
      onClick: () => onStop(slot),
      variant: 'error',
      loading: loading && actionLoading?.endsWith(':stop'),
    },
  ];

  // Secondary actions
  const secondaryActions: ActionButton[] = [
    {
      label: 'Restart',
      icon: <RotateCcw className="w-3.5 h-3.5" />,
      onClick: () => onRestart(slot),
      variant: 'warning',
      loading: loading && actionLoading?.endsWith(':restart'),
    },
    {
      label: 'Edit',
      icon: <Edit3 className="w-3.5 h-3.5" />,
      onClick: () => onEdit(slot),
      variant: 'secondary',
      loading: loading,
    },
    {
      label: 'Preflight',
      icon: null,
      onClick: () => onPreflight(slot),
      variant: 'primary',
      loading: loading && actionLoading?.endsWith(':preflight'),
    },
    {
      label: 'Logs',
      icon: null,
      onClick: () => onLogs(slot),
      variant: 'secondary',
      loading: loading && actionLoading?.endsWith(':logs'),
    },
  ];

  return (
    <div className="bg-bg-secondary/40 rounded-xl border border-border-subtle p-4 space-y-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {ready ? (
              <CheckCircle2 className="w-4 h-4 text-status-success flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-status-warning flex-shrink-0" />
            )}
            <h4 className="text-sm font-semibold text-text-primary truncate">{name}</h4>
          </div>
          <p className="text-[10px] text-text-tertiary font-mono mt-0.5">slot: {slotId}</p>
        </div>
        <span
          className={`self-start text-[10px] px-2 py-0.5 rounded-full border flex-shrink-0 ${
            running
              ? 'text-status-success border-status-success/20 bg-status-success/10'
              : 'text-status-warning border-status-warning/20 bg-status-warning/10'
          }`}
        >
          {safeDisplayValue(slot.status ?? (running ? 'running' : 'stopped'))}
        </span>
      </div>

      {/* Info Fields */}
       <div className="divide-y divide-border-subtle/50">
         <FieldRow label="Model" value={model} monospace truncate copyable={!!onCopy} onCopy={undefined} />
         <FieldRow
           label="Endpoint"
           value={openaiBase}
           monospace
           truncate
           copyable={!!onCopy}
           onCopy={handleCopyEndpoint}
         />
         <FieldRow label="GPU Devices" value={gpuDevices} monospace />
         {typeof slot.parallel_slots === 'number' && slot.parallel_slots > 1 ? (
           <FieldRow label="Parallel" value={`${slot.parallel_slots} slot${slot.parallel_slots > 1 ? 's' : ''}`} />
         ) : null}
         {/* Effective context per slot when parallel > 1 */}
         {typeof slot.context_size === 'number' && typeof slot.parallel_slots === 'number' && slot.parallel_slots > 1 ? (
           <FieldRow label="Effective ctx" value={`${Math.floor(slot.context_size / slot.parallel_slots).toLocaleString()} per slot`} />
         ) : typeof slot.context_size === 'number' ? (
           <FieldRow label="Context" value={contextSize} />
         ) : null}
         {(slot.cache_type_k || slot.cache_type_v) && (
           <FieldRow label="KV Cache" value={`K=${slot.cache_type_k || 'f16'} · V=${slot.cache_type_v || 'f16'}`} />
         )}
         <FieldRow label="Host Port" value={hostPort} />
         <FieldRow
           label="Container"
           value={containerName}
           monospace
           truncate
           copyable={!!onCopy}
           onCopy={handleCopyContainer}
         />
       </div>

      {/* Error */}
      {slot.last_error && (
        <div className="text-xs text-status-error bg-status-error/5 border border-status-error/20 rounded-lg p-2">
          {safeDisplayValue(slot.last_error)}
        </div>
      )}

      {/* Actions */}
      <MobileActionGroup actions={primaryActions} variant="grid-2" />
      <MobileActionGroup actions={secondaryActions} variant="grid-2" />

      {/* Preflight Result (collapsible) */}
      {(preflightResult || preflightError) && (
        <CollapsibleDetail
          title="Preflight Result"
          badge={preflightError ? 'error' : 'ok'}
        >
          <div
            className={`rounded-lg border p-3 text-xs ${
              preflightError
                ? 'bg-status-error/5 border-status-error/20 text-status-error'
                : 'bg-status-success/5 border-status-success/20 text-text-secondary'
            }`}
          >
            <pre className="whitespace-pre-wrap break-words font-mono text-[11px]">
              {preflightError || preflightResult}
            </pre>
          </div>
        </CollapsibleDetail>
      )}

      {/* Logs (collapsible) */}
      {logsOpen && (
        <CollapsibleDetail title="Logs" badge={`${logs.length} lines`}>
          {logsError ? (
            <p className="text-status-error text-xs">{safeDisplayValue(logsError)}</p>
          ) : logs.length > 0 ? (
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] text-text-secondary rounded-lg bg-bg-terminal/50 p-2">
              {logs.join('\n')}
            </pre>
          ) : (
            <p className="text-text-tertiary text-xs">No logs returned for this slot.</p>
          )}
        </CollapsibleDetail>
      )}
    </div>
  );
};

export default SlotCard;
