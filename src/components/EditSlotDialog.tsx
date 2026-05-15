import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { GpuInfo, NormalizedModel, RouterSlot } from '../types';
import SlotConfigForm, { buildSlotPreflightRequest, createSlotDraftFromSlot, TENSOR_SPLIT_MODE_LABELS, SlotFormDraft } from './SlotConfigForm';

interface EditSlotDialogProps {
  open: boolean;
  slot: RouterSlot | null;
  models: NormalizedModel[];
  gpus: GpuInfo[];
  modelError?: string | null;
  gpuError?: string | null;
  preflightLoading?: boolean;
  preflightResult?: string | null;
  preflightError?: string | null;
  onPreflight: (slotId: string, draft: ReturnType<typeof buildSlotPreflightRequest>) => void;
  onClose: () => void;
}

function validateDraft(draft: SlotFormDraft): string | null {
  if (!draft.slot_id.trim()) return 'Slot ID is required.';
  if (draft.host_port !== '' && (!Number.isInteger(draft.host_port) || draft.host_port <= 0)) return 'Host port must be a positive integer.';
  if (draft.use_custom_context && (draft.custom_context_size === '' || !Number.isInteger(draft.custom_context_size) || draft.custom_context_size <= 0)) return 'Custom context size must be a positive integer.';
  if (!draft.use_custom_context && draft.context_size === '') return 'Context size is required.';
  return null;
}

const EditSlotDialog: React.FC<EditSlotDialogProps> = ({
  open,
  slot,
  models,
  gpus,
  modelError,
  gpuError,
  preflightLoading = false,
  preflightResult,
  preflightError,
  onPreflight,
  onClose,
}) => {
  const initialDraft = useMemo(() => slot ? createSlotDraftFromSlot(slot) : null, [slot]);
  const [draft, setDraft] = useState<SlotFormDraft | null>(initialDraft);

  useEffect(() => {
    setDraft(initialDraft);
  }, [initialDraft]);

  if (!open || !slot || !draft) return null;

  const validationError = validateDraft(draft);

  const isExplicitSplit = ['even', 'weighted', 'custom'].includes(draft.tensor_split_mode);

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full sm:max-w-5xl sm:max-h-[90vh] max-h-[95vh] h-full sm:h-auto overflow-hidden rounded-t-xl sm:rounded-xl border border-border-primary bg-bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border-subtle px-5 py-4 flex-shrink-0">
          <div>
            <h3 className="text-base font-semibold text-text-primary">Edit Slot</h3>
            <p className="text-xs text-text-secondary mt-1">Structured draft editor for {draft.slot_id}. Preflight uses the unsaved values below.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto max-h-[calc(95vh-145px)] sm:max-h-[calc(90vh-145px)] px-5 py-4">
          <SlotConfigForm
            mode="edit"
            draft={draft}
            onChange={setDraft}
            models={models}
            gpus={gpus}
            modelError={modelError}
            gpuError={gpuError}
          />

          {(preflightResult || preflightError) && (
            <div className={`mt-4 rounded-lg border p-3 text-xs ${
              preflightError 
                ? 'bg-status-error/5 border-status-error/20 text-status-error' 
                : 'bg-status-success/5 border-status-success/20 text-text-secondary'
            }`}>
              <p className="font-semibold mb-2">Draft preflight result</p>
              
              {/* Request summary — what frontend sent */}
              <div className="space-y-1 mb-2">
                <p><span className="text-text-tertiary">Mode:</span> {TENSOR_SPLIT_MODE_LABELS[draft.tensor_split_mode]}</p>
                {isExplicitSplit && (
                  <p><span className="text-text-tertiary">Requested tensor_split:</span> <span className="font-mono">{draft.tensor_split}</span></p>
                )}
                {!isExplicitSplit && (
                  <p><span className="text-text-tertiary">Requested tensor_split:</span> <span className="italic text-text-tertiary">(not sent — llama.cpp default)</span></p>
                )}
                <p><span className="text-text-tertiary">Effective GPUs:</span> {draft.gpu_devices}</p>
              </div>
              
              {/* Backend response */}
              <pre className="whitespace-pre-wrap break-words font-mono text-[11px] bg-bg-secondary/40 p-2 rounded">{preflightError || preflightResult}</pre>
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-border-subtle px-5 py-4 bg-bg-card flex-shrink-0">
          <p className={`text-xs ${validationError ? 'text-status-error' : 'text-text-tertiary'}`}>
            {validationError || 'Save support depends on router backend update endpoints; use Preflight Draft before applying changes.'}
          </p>
          <div className="flex gap-2 justify-end">
            <button onClick={onClose} className="px-4 py-2.5 rounded-lg text-sm font-medium border border-border-primary text-text-secondary hover:bg-bg-tertiary transition-colors min-h-[44px]">
              Close
            </button>
            <button
              disabled={Boolean(validationError) || preflightLoading}
              onClick={() => onPreflight(draft.slot_id, buildSlotPreflightRequest(draft))}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-accent-primary/30 text-accent-primary bg-accent-primary/10 hover:bg-accent-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]"
            >
              {preflightLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Preflight Draft
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditSlotDialog;
