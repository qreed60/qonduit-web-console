import { GpuInfo } from '../types';
import { isExcludedDisplayGpu } from './routerDisplay';

const TENSOR_SPLIT_MODE_STORAGE_KEY_PREFIX = 'qonduit.router.tensorSplitMode.';

/**
 * Saved tensor split mode record stored in localStorage.
 * Stores both mode and tensor_split so reopen inference can
 * validate the stored mode against the actual saved backend value.
 */
export interface TensorSplitModeRecord {
  mode: 'auto' | 'even' | 'weighted' | 'custom';
  tensor_split: string;
}

/**
 * Get the saved tensor split mode record for a slot from localStorage.
 * Returns null if no saved record exists or if it's malformed.
 */
export function getSavedTensorSplitRecord(slotId: string): TensorSplitModeRecord | null {
  try {
    const raw = localStorage.getItem(`${TENSOR_SPLIT_MODE_STORAGE_KEY_PREFIX}${slotId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TensorSplitModeRecord;
    if (
      parsed &&
      typeof parsed === 'object' &&
      (parsed.mode === 'auto' || parsed.mode === 'even' || parsed.mode === 'weighted' || parsed.mode === 'custom') &&
      typeof parsed.tensor_split === 'string'
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Save the tensor split mode record for a slot to localStorage.
 * Called only after successful Create Slot or Save Changes.
 */
export function saveTensorSplitRecord(slotId: string, mode: 'auto' | 'even' | 'weighted' | 'custom', tensorSplit: string): void {
  try {
    localStorage.setItem(
      `${TENSOR_SPLIT_MODE_STORAGE_KEY_PREFIX}${slotId}`,
      JSON.stringify({ mode, tensor_split: tensorSplit })
    );
  } catch {
    // localStorage may be full or unavailable — silently ignore
  }
}

/**
 * Generate an even split string for the selected GPUs.
 * Example: GPUs 0,2,3,4,5,6,7 → "1,1,1,1,1,1,1"
 */
export function generateEvenSplit(gpuIndices: Set<string>): string {
  return Array.from(gpuIndices)
    .sort((a, b) => Number(a) - Number(b))
    .map(() => '1')
    .join(',');
}

/**
 * Generate a weighted split string based on free VRAM for selected GPUs.
 * Uses integer proportion of free VRAM across GPUs.
 * Excludes display/excluded GPUs.
 */
export function generateWeightedSplit(
  gpus: GpuInfo[],
  selectedGpuSet: Set<string>,
): string {
  const usable = gpus
    .filter((gpu) => !isExcludedDisplayGpu(gpu) && selectedGpuSet.has(String(gpu.index)))
    .sort((a, b) => b.memory_free_mib - a.memory_free_mib); // highest VRAM first

  if (usable.length === 0) return '';
 
   // NEW: round(memory_free_mib / 102.4), minimum 1
   // The divisor 102.4 produces values that approximate per-layer GPU memory allocation in llama.cpp
   const weights = usable.map(
     (gpu) => Math.max(1, Math.round(gpu.memory_free_mib / 102.4)),
   );
 
   return weights.join(',');
}
