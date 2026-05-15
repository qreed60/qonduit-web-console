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

  const totalFree = usable.reduce((sum, gpu) => sum + gpu.memory_free_mib, 0);
  if (totalFree === 0) return Array(usable.length).fill('1').join(',');

  // Round to integers, ensuring minimum of 1
  const rawWeights = usable.map(
    (gpu) => Math.max(1, Math.round((gpu.memory_free_mib / totalFree) * usable.length)),
  );

  // Adjust to ensure sum matches number of GPUs (for llama.cpp compatibility)
  const weightSum = rawWeights.reduce((s, v) => s + v, 0);
  const adjusted = rawWeights.map(
    (w) => Math.max(1, Math.round((w / weightSum) * usable.length)),
  );

  // Final adjustment: ensure exact count
   let diff = usable.length - adjusted.reduce((s, v) => s + v, 0);
   if (diff > 0) {
     adjusted[0] += diff;
   } else if (diff < 0) {
     let i = 0;
     while (diff < 0) {
       adjusted[i] = Math.max(1, adjusted[i] - 1);
       i = (i + 1) % adjusted.length;
       diff++;
     }
   }

  return adjusted.join(',');
}
