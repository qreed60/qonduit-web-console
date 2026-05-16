import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Save, X } from 'lucide-react';
import { GpuInfo, NormalizedModel, RouterPreflightResponse, RouterSlot, RouterSlotOptions } from '../types';
import SlotConfigForm, { buildSlotPreflightRequest, createSlotDraftFromSlot, SlotFormDraft } from './SlotConfigForm';
import { getSavedTensorSplitRecord } from '../utils/tensorSplit';
import PreflightResultDrawer from './PreflightResultDrawer';

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
  effectiveGpuDevices?: string;
  slotOptions?: RouterSlotOptions | null;
  onPreflight: (slotId: string, draft: ReturnType<typeof buildSlotPreflightRequest>) => void;
  onSave?: (draft: SlotFormDraft) => void;
  onSaveLoading?: boolean;
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
  effectiveGpuDevices,
  slotOptions,
  onPreflight,
  onSave,
  onSaveLoading = false,
  onClose,
}) => {
  // Keep latest gpus in a ref so createSlotDraftFromSlot always has current GPU data
   // but GPU polling changes don't trigger a draft reset.
   const latestGpusRef = useRef<GpuInfo[]>(gpus);
   useEffect(() => {
     latestGpusRef.current = gpus;
   }, [gpus]);
 
   // Track which slot_id was last initialized — prevents re-init on same slot
   const lastInitializedSlotIdRef = useRef<string | null>(null);
 
   const [draft, setDraft] = useState<SlotFormDraft | null>(null);
 
   // Reset draft only when dialog opens for a new slot (open + slot_id changes).
   // GPU polling, preflight results, and user edits do NOT trigger a reset.
   useEffect(() => {
     if (!open || !slot) {
       lastInitializedSlotIdRef.current = null;
       setDraft(null);
       return;
     }
 
     if (lastInitializedSlotIdRef.current !== slot.slot_id) {
       // Check localStorage for saved tensor split mode record
       const savedRecord = getSavedTensorSplitRecord(slot.slot_id);
       setDraft(
         createSlotDraftFromSlot(
           slot,
           latestGpusRef.current,
           savedRecord ?? undefined,
         ),
       );
       lastInitializedSlotIdRef.current = slot.slot_id;
     }
   }, [open, slot?.slot_id]);
 
   if (!open || !slot || !draft) return null;

  const validationError = validateDraft(draft);

  const isExplicitSplit = ['even', 'weighted', 'custom'].includes(draft.tensor_split_mode);

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full sm:max-w-5xl sm:max-h-[90vh] max-h-[95vh] h-[95vh] sm:h-auto overflow-hidden rounded-t-xl sm:rounded-xl border border-border-primary bg-bg-card shadow-2xl">
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
        <div className="overflow-y-auto max-h-[calc(95vh-145px)] sm:max-h-[calc(90vh-145px)] px-4 sm:px-5 py-3 sm:py-4">
          <SlotConfigForm
               mode="edit"
               draft={draft}
               onChange={setDraft}
               models={models}
               gpus={gpus}
               modelError={modelError}
               gpuError={gpuError}
               effectiveGpuDevices={effectiveGpuDevices}
               slotOptions={slotOptions}
             />
 
           {preflightResult && (
                 <PreflightResultDrawer
                   result={JSON.parse(preflightResult) as RouterPreflightResponse}
                   error={preflightError}
                   requestedTensorSplit={isExplicitSplit ? draft.tensor_split : ''}
                   tensorSplitMode={draft.tensor_split_mode}
                   effectiveGpuDevices={effectiveGpuDevices}
                   parallelSlots={draft.parallel_slots}
                   cacheTypeK={draft.cache_type_k}
                   cacheTypeV={draft.cache_type_v}
                   batchSize={draft.batch_size}
                   ubatchSize={draft.ubatch_size}
                 />
               )}
        </div>

        {/* Sticky Footer */}
         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-border-subtle px-4 sm:px-5 py-4 bg-bg-card flex-shrink-0">
           <p className={`text-xs ${validationError ? 'text-status-error' : 'text-text-tertiary'}`}>
             {validationError || 'Preflight validates the draft; Save Changes persists the slot config.'}
           </p>
           <div className="flex gap-2 justify-end">
             <button onClick={onClose} className="px-4 py-2.5 rounded-lg text-sm font-medium border border-border-primary text-text-secondary hover:bg-bg-tertiary transition-colors min-h-[44px]">
               Close
             </button>
             <button
               disabled={Boolean(validationError) || preflightLoading || !onSave}
               onClick={() => onPreflight(draft.slot_id, buildSlotPreflightRequest(draft))}
               className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-accent-primary/30 text-accent-primary bg-accent-primary/10 hover:bg-accent-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]"
             >
               {preflightLoading && <Loader2 className="w-4 h-4 animate-spin" />}
               Preflight Draft
             </button>
             {onSave && (
               <button
                 disabled={Boolean(validationError) || onSaveLoading}
                 onClick={() => onSave(draft)}
                 className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-accent-primary text-bg-card hover:bg-accent-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]"
               >
                 {onSaveLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                 {!onSaveLoading && <Save className="w-4 h-4" />}
                 Save Changes
               </button>
             )}
           </div>
         </div>
      </div>
    </div>
  );
};

export default EditSlotDialog;
