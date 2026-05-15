import { GpuInfo } from '../types';
import { isExcludedDisplayGpu } from './routerDisplay';

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
