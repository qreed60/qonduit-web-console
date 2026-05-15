import React, { useEffect, useMemo } from 'react';
import { GpuInfo, NormalizedModel, RouterPreflightRequest, RouterSlot } from '../types';
import { formatGpuLabel, isExcludedDisplayGpu, safeDisplayValue } from '../utils/routerDisplay';
import { generateEvenSplit, generateWeightedSplit, TensorSplitModeRecord } from '../utils/tensorSplit';
import CollapsibleDetail from './CollapsibleDetail';

/**
 * Infer the tensor split mode from a saved tensor_split value and GPU data.
 * - Auto: no tensor_split
 * - Even: matches the generated even split for the given GPU count
 * - Weighted: matches the generated weighted split for the given GPUs
 * - Custom: anything else
 */
export function inferTensorSplitMode(
  savedTensorSplit: string,
  gpuIndices: Set<string>,
  gpus: GpuInfo[],
): 'auto' | 'even' | 'weighted' | 'custom' {
  if (!savedTensorSplit || !savedTensorSplit.trim()) return 'auto';

  const evenSplit = generateEvenSplit(gpuIndices);
  if (savedTensorSplit.trim() === evenSplit) return 'even';

  const weightedSplit = generateWeightedSplit(gpus, gpuIndices);
  if (weightedSplit && savedTensorSplit.trim() === weightedSplit) return 'weighted';

  return 'custom';
}

export const CONTEXT_PRESETS = [8192, 16384, 32768, 65536, 131072, 262144];

export interface SlotFormDraft {
  slot_id: string;
  model: string;
  context_size: number | '';
  custom_context_size: number | '';
  use_custom_context: boolean;
  gpu_devices: string;
  embeddings: boolean;
  tensor_split_mode: 'auto' | 'even' | 'weighted' | 'custom';
  tensor_split: string;
  host_port: number | '';
  container_name: string;
  allow_container_edit: boolean;
  extra_args_text: string;
  use_custom_model: boolean;
}

export const TENSOR_SPLIT_MODE_LABELS: Record<SlotFormDraft['tensor_split_mode'], string> = {
  auto: 'Auto / llama.cpp default',
  even: 'Even split across selected GPUs',
  weighted: 'Weighted by free VRAM',
  custom: 'Custom tensor split',
};

interface SlotConfigFormProps {
  mode: 'add' | 'edit';
  draft: SlotFormDraft;
  onChange: (draft: SlotFormDraft) => void;
  models: NormalizedModel[];
  gpus: GpuInfo[];
  modelError?: string | null;
  gpuError?: string | null;
  effectiveGpuDevices?: string;
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value;
  }
  return '';
}

function firstNumber(...values: unknown[]): number | '' {
  for (const value of values) {
    if (typeof value === 'number' && Number.isInteger(value)) return value;
    if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
  }
  return '';
}

function stringifyExtraArgs(value: unknown): string {
  if (Array.isArray(value)) return value.map((item) => safeDisplayValue(item)).join('\n');
  if (typeof value === 'string') return value;
  return '';
}

function formatUsableGpuIndices(gpus: GpuInfo[]): string {
  return gpus.map((g) => String(g.index)).join(',');
}

function stringifyGpuDevices(value: unknown): string {
  if (value === undefined || value === null || value === '') return 'all';
  if (value === 'all') return 'all';
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item === 'number' || typeof item === 'string') return String(item);
      if (item && typeof item === 'object' && 'index' in item) return String((item as GpuInfo).index);
      return '';
    }).filter(Boolean).join(',');
  }
  return String(value);
}

function normalizePresetContext(value: number | ''): { value: number | ''; custom: number | ''; useCustom: boolean } {
  if (typeof value === 'number' && CONTEXT_PRESETS.includes(value)) {
    return { value, custom: '', useCustom: false };
  }
  if (typeof value === 'number' && value > 0) {
    return { value: '', custom: value, useCustom: true };
  }
  return { value: 65536, custom: '', useCustom: false };
}

export function createDefaultSlotDraft(): SlotFormDraft {
  return {
    slot_id: '',
    model: '',
    context_size: 65536,
    custom_context_size: '',
    use_custom_context: false,
    gpu_devices: 'all',
    embeddings: false,
    tensor_split_mode: 'auto',
    tensor_split: '',
    host_port: '',
    container_name: '',
    allow_container_edit: false,
    extra_args_text: '',
    use_custom_model: false,
  };
}

export function createSlotDraftFromSlot(
  slot: RouterSlot,
  gpus: GpuInfo[] = [],
  savedRecord?: TensorSplitModeRecord,
): SlotFormDraft {
  const context = normalizePresetContext(firstNumber(slot.context_size, slot.n_ctx));
  const tensorSplit = firstString(slot.tensor_split);

  // Determine GPU indices for mode inference
  const gpuDeviceStr = stringifyGpuDevices(slot.gpu_devices ?? slot.effective_gpu_devices);
  const gpuIndices = new Set(
    gpuDeviceStr === 'all'
      ? gpus.filter((g) => !isExcludedDisplayGpu(g)).map((g) => String(g.index))
      : gpuDeviceStr.split(',').map((v) => v.trim()).filter(Boolean)
  );

  // Infer mode from saved tensor_split value
  let tensorSplitMode = inferTensorSplitMode(tensorSplit, gpuIndices, gpus);

  // If a saved record exists AND its tensor_split matches the saved slot's tensor_split,
  // use the saved mode. This preserves Weighted mode across reopen even if free VRAM changes.
  if (savedRecord && savedRecord.tensor_split === tensorSplit && savedRecord.mode !== 'auto') {
    tensorSplitMode = savedRecord.mode;
  }

  return {
    slot_id: safeDisplayValue(slot.slot_id, ''),
    model: firstString(slot.model, slot.model_path),
    context_size: context.value,
    custom_context_size: context.custom,
    use_custom_context: context.useCustom,
    gpu_devices: gpuDeviceStr,
    embeddings: slot.embeddings === true,
    tensor_split_mode: tensorSplitMode,
    tensor_split: tensorSplit,
    host_port: firstNumber(slot.host_port, slot.port),
    container_name: firstString(slot.container_name),
    allow_container_edit: false,
    extra_args_text: stringifyExtraArgs(slot.extra_args),
    use_custom_model: false,
  };
}

export function buildSlotPreflightRequest(draft: SlotFormDraft): RouterPreflightRequest {
  const contextSize = draft.use_custom_context ? draft.custom_context_size : draft.context_size;
  const extraArgs = draft.extra_args_text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    slot_id: draft.slot_id.trim(),
    model: draft.model.trim(),
    context_size: typeof contextSize === 'number' ? contextSize : undefined,
    gpu_devices: draft.gpu_devices.trim() || 'all',
    embeddings: draft.embeddings,
    tensor_split: ['even', 'weighted', 'custom'].includes(draft.tensor_split_mode) && draft.tensor_split.trim()
      ? draft.tensor_split.trim()
      : undefined,
    host_port: typeof draft.host_port === 'number' ? draft.host_port : undefined,
    container_name: draft.container_name.trim() || undefined,
    extra_args: extraArgs,
  };
}

const fieldClass = 'w-full bg-bg-secondary/60 border border-border-primary rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-primary disabled:opacity-60 disabled:cursor-not-allowed';
const labelClass = 'block text-xs font-medium text-text-secondary mb-1.5';

const SlotConfigForm: React.FC<SlotConfigFormProps> = ({ mode, draft, onChange, models, gpus, modelError, gpuError, effectiveGpuDevices }) => {

  const modelNames = useMemo(() => {
    const names = models.map((model) => model.name).filter(Boolean);
    if (draft.model && !names.includes(draft.model)) return [draft.model, ...names];
    return names;
  }, [models, draft.model]);

  useEffect(() => {
    const names = models.map((model) => model.name);
    if (draft.model && !names.includes(draft.model)) {
      onChange({ ...draft, use_custom_model: true });
    }
    // Only react to model loading changing around the current draft model.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [models]);

  const usableGpus = gpus.filter((gpu) => !isExcludedDisplayGpu(gpu));
  const selectedGpuSet = new Set(
    draft.gpu_devices === 'all'
      ? usableGpus.map((gpu) => String(gpu.index))
      : draft.gpu_devices.split(',').map((value) => value.trim()).filter(Boolean)
  );
  const allUsableSelected = draft.gpu_devices === 'all';
  const hostPortInvalid = draft.host_port !== '' && (!Number.isInteger(draft.host_port) || draft.host_port <= 0);
  const customContextInvalid = draft.use_custom_context && (draft.custom_context_size === '' || !Number.isInteger(draft.custom_context_size) || draft.custom_context_size <= 0);

  const tensorSplitValues = draft.tensor_split.trim().split(',').filter(Boolean);
  const tensorSplitCountMismatch =
    ['even', 'weighted', 'custom'].includes(draft.tensor_split_mode) &&
    tensorSplitValues.length > 0 &&
    tensorSplitValues.length !== selectedGpuSet.size;

  const update = (patch: Partial<SlotFormDraft>) => onChange({ ...draft, ...patch });

  const setIndividualGpu = (gpuIndex: number, checked: boolean) => {
    const next = new Set(selectedGpuSet);
    if (checked) next.add(String(gpuIndex));
    else next.delete(String(gpuIndex));
    update({ gpu_devices: Array.from(next).sort((a, b) => Number(a) - Number(b)).join(',') });
  };

  const handleTensorSplitModeChange = (newMode: 'auto' | 'even' | 'weighted' | 'custom') => {
    if (newMode === 'auto') {
      update({ tensor_split_mode: 'auto', tensor_split: '' });
    } else if (newMode === 'even') {
      update({ tensor_split_mode: 'even', tensor_split: generateEvenSplit(selectedGpuSet) });
    } else if (newMode === 'weighted') {
      update({ tensor_split_mode: 'weighted', tensor_split: generateWeightedSplit(gpus, selectedGpuSet) });
    } else {
      // 'custom' — keep current tensor_split value (user edits manually)
      update({ tensor_split_mode: 'custom' });
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Slot ID</label>
          <input
            className={fieldClass}
            value={draft.slot_id}
            onChange={(event) => update({ slot_id: event.target.value })}
            disabled={mode === 'edit'}
            placeholder="openhands"
          />
          {mode === 'edit' && <p className="text-[10px] text-text-tertiary mt-1">Slot ID is immutable in edit mode.</p>}
        </div>

        <div>
          <label className={labelClass}>Host port</label>
          <input
            className={`${fieldClass} ${hostPortInvalid ? 'border-status-error' : ''}`}
            type="number"
            step={1}
            min={1}
            value={draft.host_port}
            onChange={(event) => update({ host_port: event.target.value === '' ? '' : Number(event.target.value) })}
            placeholder="8081"
          />
          {hostPortInvalid && <p className="text-[10px] text-status-error mt-1">Host port must be a positive integer.</p>}
        </div>
      </div>

      <div>
        <label className={labelClass}>Model</label>
        {draft.use_custom_model ? (
          <input
            className={fieldClass}
            value={draft.model}
            onChange={(event) => update({ model: event.target.value })}
            placeholder="Custom model path or name"
          />
        ) : (
          <select className={fieldClass} value={draft.model} onChange={(event) => update({ model: event.target.value })}>
            <option value="">Select a router model…</option>
            {modelNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        )}
        {modelError && <p className="text-[10px] text-status-warning mt-1">{modelError}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Context size</label>
          <select
            className={fieldClass}
            value={draft.use_custom_context ? 'custom' : draft.context_size}
            onChange={(event) => {
              if (event.target.value === 'custom') update({ use_custom_context: true, context_size: '' });
              else update({ use_custom_context: false, context_size: Number(event.target.value), custom_context_size: '' });
            }}
          >
            {CONTEXT_PRESETS.map((ctx) => (
              <option key={ctx} value={ctx}>{ctx.toLocaleString()} tokens</option>
            ))}
            <option value="custom">Custom…</option>
          </select>
        </div>

        <label className="flex items-center gap-3 rounded-lg border border-border-subtle bg-bg-secondary/40 px-3 py-3 text-sm text-text-primary">
          <input
            type="checkbox"
            checked={draft.embeddings}
            onChange={(event) => update({ embeddings: event.target.checked })}
            className="h-4 w-4 accent-accent-primary"
          />
          Enable embeddings
        </label>
      </div>

      <div>
        <label className={labelClass}>GPU devices</label>
        <div className="space-y-2 rounded-lg border border-border-subtle bg-bg-secondary/30 p-3">
          <label className="flex items-center gap-3 text-sm text-text-primary">
            <input
              type="checkbox"
              checked={allUsableSelected}
              onChange={(event) => update({ gpu_devices: event.target.checked ? 'all' : usableGpus.map((gpu) => String(gpu.index)).join(',') })}
              className="h-4 w-4 accent-accent-primary"
            />
            All usable inference GPUs
          </label>

          <div className="grid grid-cols-1 gap-2 pt-2 border-t border-border-subtle">
            {gpus.map((gpu) => {
              const excluded = isExcludedDisplayGpu(gpu);
              const gpuId = String(gpu.index);
              return (
                <label key={gpu.index} className={`flex items-start gap-3 rounded-lg border px-3 py-2 text-xs ${excluded ? 'border-status-warning/20 bg-status-warning/5 text-text-tertiary' : 'border-border-subtle bg-bg-card text-text-primary'}`}>
                  <input
                    type="checkbox"
                    checked={!excluded && selectedGpuSet.has(gpuId)}
                    disabled={excluded || allUsableSelected}
                    onChange={(event) => setIndividualGpu(gpu.index, event.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-accent-primary disabled:opacity-50"
                  />
                  <span className="min-w-0">
                    <span className="block font-mono truncate">{formatGpuLabel(gpu)}</span>
                    {excluded && <span className="text-[10px] text-status-warning">Disabled: display / not used for inference</span>}
                  </span>
                </label>
              );
            })}
          </div>
          {gpus.length === 0 && <p className="text-xs text-text-tertiary">{gpuError || 'GPU status has not loaded yet.'}</p>}
         </div>
       </div>
 
       {/* Effective GPU info display */}
       {(effectiveGpuDevices || usableGpus.length > 0) && (
         <div className="flex flex-wrap gap-3 text-xs text-text-tertiary">
           <span>
             Requested GPUs: <span className="text-text-primary font-mono">{draft.gpu_devices}</span>
           </span>
           <span>
             Effective GPUs: <span className="text-text-primary font-mono">{effectiveGpuDevices ?? formatUsableGpuIndices(usableGpus)}</span>
           </span>
         </div>
       )}
 
       <CollapsibleDetail title="Advanced" defaultOpen={false}>
         <div className="space-y-4">
          <label className="flex items-center gap-3 text-sm text-text-primary">
            <input
              type="checkbox"
              checked={draft.use_custom_model}
              onChange={(event) => update({ use_custom_model: event.target.checked })}
              className="h-4 w-4 accent-accent-primary"
            />
            Use custom model value
          </label>

          {draft.use_custom_context && (
            <div>
              <label className={labelClass}>Custom context size</label>
              <input
                className={`${fieldClass} ${customContextInvalid ? 'border-status-error' : ''}`}
                type="number"
                min={1}
                step={1}
                value={draft.custom_context_size}
                onChange={(event) => update({ custom_context_size: event.target.value === '' ? '' : Number(event.target.value) })}
                placeholder="Custom token count"
              />
              {customContextInvalid && <p className="text-[10px] text-status-error mt-1">Custom context must be a positive integer.</p>}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Tensor split</label>
              <select
                className={fieldClass}
                value={draft.tensor_split_mode}
                onChange={(event) => handleTensorSplitModeChange(event.target.value as 'auto' | 'even' | 'weighted' | 'custom')}
              >
                <option value="auto">Auto / llama.cpp default</option>
                <option value="even">Even split across selected GPUs</option>
                <option value="weighted">Weighted by free VRAM</option>
                <option value="custom">Custom tensor split</option>
              </select>
              {draft.tensor_split_mode === 'auto' && (
                <p className="text-[10px] text-text-tertiary mt-1">
                  Lets llama.cpp choose distribution. This may not be even.
                </p>
              )}
              {draft.tensor_split_mode === 'even' && (
                <p className="text-[10px] text-text-tertiary mt-1">
                  Distributes tensors evenly across {selectedGpuSet.size} selected GPU(s).
                </p>
              )}
              {draft.tensor_split_mode === 'weighted' && (
                <p className="text-[10px] text-text-tertiary mt-1">
                  Distributes tensors proportional to free VRAM on selected GPUs.
                </p>
              )}
            </div>
            {['even', 'weighted', 'custom'].includes(draft.tensor_split_mode) && (
              <div>
                <label className={labelClass}>Custom tensor split</label>
                <input
                  className={`${fieldClass} ${tensorSplitCountMismatch ? 'border-status-warning' : ''}`}
                  value={draft.tensor_split}
                  onChange={(event) => update({ tensor_split: event.target.value })}
                  placeholder="e.g. 1,1,1,1"
                />
                {tensorSplitCountMismatch && (
                  <p className="text-[10px] text-status-warning mt-1">
                    ⚠ Split has {tensorSplitValues.length} value(s) but {selectedGpuSet.size} GPU(s) selected.
                  </p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="flex items-center gap-3 text-sm text-text-primary mb-2">
              <input
                type="checkbox"
                checked={draft.allow_container_edit}
                onChange={(event) => update({ allow_container_edit: event.target.checked })}
                className="h-4 w-4 accent-accent-primary"
              />
              Allow container name editing
            </label>
            <input
              className={fieldClass}
              value={draft.container_name}
              onChange={(event) => update({ container_name: event.target.value })}
              disabled={!draft.allow_container_edit}
              placeholder="llama_server_openhands"
            />
          </div>

          <div>
            <label className={labelClass}>Extra args</label>
            <textarea
              className={`${fieldClass} min-h-24 font-mono`}
              value={draft.extra_args_text}
              onChange={(event) => update({ extra_args_text: event.target.value })}
              placeholder={'--arg-one\n--arg-two value'}
            />
            <p className="text-[10px] text-text-tertiary mt-1">Each non-empty line is sent as one extra_args entry.</p>
           </div>
         </div>
       </CollapsibleDetail>
    </div>
  );
};

export default SlotConfigForm;
