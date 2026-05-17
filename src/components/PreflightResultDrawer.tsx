import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { RouterPreflightResponse } from '../types';
import CollapsibleDetail from './CollapsibleDetail';

/**
 * Normalize launch_args_preview to a string[] regardless of backend format.
 * Handles both string (older backends) and string[] (newer backends) inputs.
 */
function normalizeLaunchArgsPreview(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }
  if (typeof value === "string") {
    return value.trim() ? value.trim().split(/\s+/) : [];
  }
  return [];
}

interface PreflightResultDrawerProps {
  result: RouterPreflightResponse | null;
  error: string | null | undefined;
  requestedTensorSplit: string;
  tensorSplitMode: 'auto' | 'even' | 'weighted' | 'custom';
  effectiveGpuDevices?: string;
  parallelSlots?: number;
  cacheTypeK?: string;
  cacheTypeV?: string;
  batchSize?: number;
  ubatchSize?: number;
}

const TENSOR_SPLIT_MODE_LABELS: Record<PreflightResultDrawerProps['tensorSplitMode'], string> = {
  auto: 'Auto / llama.cpp default',
  even: 'Even split across selected GPUs',
  weighted: 'Weighted by free VRAM',
  custom: 'Custom tensor split',
};

const PreflightResultDrawer: React.FC<PreflightResultDrawerProps> = ({
  result,
  error,
  requestedTensorSplit,
  tensorSplitMode,
  effectiveGpuDevices,
  parallelSlots,
  cacheTypeK,
  cacheTypeV,
  batchSize,
  ubatchSize,
}) => {
  if (!result && !error) return null;

  return (
    <div className={`mt-4 rounded-lg border p-3 text-xs ${
      error
        ? 'bg-status-error/5 border-status-error/20 text-status-error'
        : 'bg-status-success/5 border-status-success/20 text-text-secondary'
    }`}>
      <p className="font-semibold mb-2">Draft preflight result</p>

      {/* Summary row */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <span className="text-text-tertiary">Mode:</span>
        <span className="text-text-primary font-medium">{TENSOR_SPLIT_MODE_LABELS[tensorSplitMode]}</span>
        {result?.tensor_split_valid !== undefined && (
          <>
            {result.tensor_split_valid === true
              ? <CheckCircle2 className="w-4 h-4 text-status-success" />
              : <XCircle className="w-4 h-4 text-status-error" />
            }
            <span className="text-text-tertiary">
              Split {result.tensor_split_valid ? 'valid' : 'invalid'}
            </span>
          </>
        )}
        {result?.tensor_split_entry_count !== undefined && (
          <span className="text-text-tertiary">
            Entries: {result.tensor_split_entry_count}
          </span>
        )}
      </div>

      {/* Tensor Split Details */}
      <CollapsibleDetail title="Tensor Split Details" defaultOpen={true}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
          <div>
            <span className="text-text-tertiary">Requested (frontend):</span>
            <span className="ml-2 font-mono text-text-primary">
              {requestedTensorSplit || '(not sent — llama.cpp default)'}
            </span>
          </div>
          {result?.requested_tensor_split !== undefined && (
            <div>
              <span className="text-text-tertiary">Echoed (backend):</span>
              <span className="ml-2 font-mono text-text-primary">
                {result.requested_tensor_split ?? '(none)'}
              </span>
            </div>
          )}
          {result?.tensor_split !== undefined && (
            <div className="sm:col-span-2">
              <span className="text-text-tertiary">Computed tensor_split:</span>
              <span className="ml-2 font-mono text-text-primary">
                {result.tensor_split ?? '(none)'}
              </span>
            </div>
          )}
        </div>
      </CollapsibleDetail>

      {/* GPU Details */}
      <CollapsibleDetail title="GPU Details" defaultOpen={false}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
          {effectiveGpuDevices && (
            <div>
              <span className="text-text-tertiary">Requested GPUs:</span>
              <span className="ml-2 font-mono text-text-primary">{effectiveGpuDevices}</span>
            </div>
          )}
          {result?.effective_gpu_count !== undefined && (
            <div>
              <span className="text-text-tertiary">Effective GPU count:</span>
              <span className="ml-2 font-mono text-text-primary">{result.effective_gpu_count}</span>
            </div>
          )}
          {result?.effective_gpu_devices !== undefined && (
            <div className="sm:col-span-2">
              <span className="text-text-tertiary">Effective GPU devices:</span>
              <span className="ml-2 font-mono text-text-primary">
                {Array.isArray(result.effective_gpu_devices)
                  ? result.effective_gpu_devices.join(',')
                  : result.effective_gpu_devices ?? '(none)'}
              </span>
            </div>
          )}
        </div>
      </CollapsibleDetail>

      {/* Parallel Configuration */}
      <CollapsibleDetail title="Parallel Configuration" defaultOpen={false}>
        {result?.effective_context_per_parallel_slot != null && result.effective_context_per_parallel_slot > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            {parallelSlots !== undefined && (
              <div>
                <span className="text-text-tertiary">Parallel slots:</span>
                <span className="ml-2 font-mono text-text-primary">{parallelSlots}</span>
              </div>
            )}
            <div>
              <span className="text-text-tertiary">Effective context/slot:</span>
              <span className="ml-2 font-mono text-text-primary">{result.effective_context_per_parallel_slot.toLocaleString()} tokens</span>
            </div>
            <div className="sm:col-span-2 text-[10px] text-text-tertiary italic">
              Context is shared across parallel slots
            </div>
          </div>
        ) : parallelSlots !== undefined && parallelSlots > 1 ? (
          <div className="text-[11px] text-text-tertiary">
            Parallel: {parallelSlots} slots (backend will compute effective context)
          </div>
        ) : null}
      </CollapsibleDetail>

      {/* Batch Configuration */}
       {(batchSize || ubatchSize || result?.batch_size || result?.ubatch_size) && (
         <CollapsibleDetail title="Batch Configuration" defaultOpen={false}>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
             <div>
               <span className="text-text-tertiary">Batch size:</span>
               <span className="ml-2 font-mono text-text-primary">
                 {batchSize ?? result?.batch_size ?? '\u2014'}
               </span>
             </div>
             <div>
               <span className="text-text-tertiary">Micro-batch size:</span>
               <span className="ml-2 font-mono text-text-primary">
                 {ubatchSize ?? result?.ubatch_size ?? '\u2014'}
               </span>
             </div>
           </div>
         </CollapsibleDetail>
       )}
 
       {/* KV Cache Estimate */}
      {(result?.kv_cache_estimate || cacheTypeK || cacheTypeV) && (
        <CollapsibleDetail title="KV Cache Estimate" defaultOpen={false}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            {(cacheTypeK || cacheTypeV) && (
              <>
                <div>
                  <span className="text-text-tertiary">Requested K:</span>
                  <span className="ml-2 font-mono text-text-primary">{cacheTypeK || '\u2014'}</span>
                </div>
                <div>
                  <span className="text-text-tertiary">Requested V:</span>
                  <span className="ml-2 font-mono text-text-primary">{cacheTypeV || '\u2014'}</span>
                </div>
              </>
            )}
            {result?.kv_cache_estimate && (
              <>
                <div>
                  <span className="text-text-tertiary">Cache type K:</span>
                  <span className="ml-2 font-mono text-text-primary">{result.kv_cache_estimate.cache_type_k}</span>
                </div>
                <div>
                  <span className="text-text-tertiary">Cache type V:</span>
                  <span className="ml-2 font-mono text-text-primary">{result.kv_cache_estimate.cache_type_v}</span>
                </div>
                <div>
                  <span className="text-text-tertiary">Estimated cache:</span>
                  <span className="ml-2 font-mono text-text-primary">{result.kv_cache_estimate.estimated_kv_cache_mib} MiB</span>
                </div>
                <div>
                  <span className="text-text-tertiary">Baseline (f16):</span>
                  <span className="ml-2 font-mono text-text-primary">{result.kv_cache_estimate.estimated_kv_cache_f16_mib} MiB</span>
                </div>
                <div>
                  <span className="text-text-tertiary">Savings:</span>
                  <span className="ml-2 font-mono text-text-primary">{result.kv_cache_estimate.estimated_savings_vs_f16_mib} MiB ({result.kv_cache_estimate.estimated_savings_vs_f16_percent}%)</span>
                </div>
                <div>
                  <span className="text-text-tertiary">Confidence:</span>
                  <span className="ml-2 font-mono text-text-primary">{result.kv_cache_estimate.estimate_confidence || 'unknown'}</span>
                </div>
              </>
            )}
          </div>
        </CollapsibleDetail>
      )}

      {/* Launch Args Preview */}
       {result?.launch_args_preview && (
         <CollapsibleDetail title="Launch Args Preview" defaultOpen={false}>
           <pre className="whitespace-pre-wrap break-words font-mono text-[10px] bg-bg-secondary/40 p-2 rounded text-text-primary">
             {normalizeLaunchArgsPreview(result.launch_args_preview).length > 0 ? (
               normalizeLaunchArgsPreview(result.launch_args_preview).map((token, i) => {
                 const isParallel = token.includes('--parallel') || token.includes('-np');
                 const isCacheK = token.includes('--cache-type-k');
                 const isCacheV = token.includes('--cache-type-v');
                 const isBatch = token.includes('--batch-size');
                 const isUbatch = token.includes('--ubatch-size');
                 const isHighlight = isParallel || isCacheK || isCacheV || isBatch || isUbatch;
                 return (
                   <div key={i} className={isHighlight ? 'text-accent-primary font-semibold' : ''}>
                     {token}
                   </div>
                 );
               })
             ) : (
               <span className="text-text-tertiary">(none)</span>
             )}
           </pre>
         </CollapsibleDetail>
       )}

      {/* Backend Suggestions */}
      {result?.suggested_tensor_splits && (
        <CollapsibleDetail title="Backend Suggestions" defaultOpen={false}>
          <div className="space-y-2 text-[11px]">
            {result.suggested_tensor_splits.even && (
              <div>
                <span className="text-text-tertiary">Even:</span>
                <span className="ml-2 font-mono text-text-primary">{result.suggested_tensor_splits.even}</span>
              </div>
            )}
            {result.suggested_tensor_splits.free_vram_weighted_raw && (
              <div>
                <span className="text-text-tertiary">Weighted (raw):</span>
                <span className="ml-2 font-mono text-text-primary">{result.suggested_tensor_splits.free_vram_weighted_raw}</span>
              </div>
            )}
            {result.suggested_tensor_splits.free_vram_weighted_normalized && (
              <div>
                <span className="text-text-tertiary">Weighted (normalized):</span>
                <span className="ml-2 font-mono text-text-primary">{result.suggested_tensor_splits.free_vram_weighted_normalized}</span>
              </div>
            )}
          </div>
        </CollapsibleDetail>
      )}

      {/* Warnings / Errors */}
      {result?.warnings && result.warnings.length > 0 && (
        <div className="mt-2 space-y-1">
          {result.warnings.map((w, i) => (
            <p key={i} className="text-status-warning">⚠ {w}</p>
          ))}
        </div>
      )}
      {result?.errors && result.errors.length > 0 && (
        <div className="mt-2 space-y-1">
          {result.errors.map((e, i) => (
            <p key={i} className="text-status-error">✕ {e}</p>
          ))}
        </div>
      )}

      {/* Error fallback */}
      {error && !result && (
        <pre className="whitespace-pre-wrap break-words font-mono text-[11px] bg-bg-secondary/40 p-2 rounded mt-2">
          {error}
        </pre>
      )}
    </div>
  );
};

export default PreflightResultDrawer;
