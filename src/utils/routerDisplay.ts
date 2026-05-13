import { GpuInfo } from '../types';

const DISPLAY_GPU_INDEX = 1;
const DISPLAY_GPU_NAME_PATTERN = /quadro\s*k620/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function formatMib(value: unknown): string | null {
  const mib = asFiniteNumber(value);
  if (mib === null) return null;
  return mib >= 1024 ? `${(mib / 1024).toFixed(1)} GiB` : `${mib} MiB`;
}

export function isExcludedDisplayGpu(gpu: Partial<GpuInfo> | null | undefined): boolean {
  if (!gpu) return false;
  return gpu.index === DISPLAY_GPU_INDEX || DISPLAY_GPU_NAME_PATTERN.test(gpu.name ?? '');
}

export function safeDisplayValue(value: unknown, fallback = '—'): string {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return fallback;
    return value.map((item) => safeDisplayValue(item, fallback)).join(', ');
  }
  if (isRecord(value)) {
    const index = value.index;
    const name = value.name;
    if ((typeof index === 'number' || typeof index === 'string') && typeof name === 'string') {
      return formatGpuLabel(value as Partial<GpuInfo>);
    }
    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

export function getGpuMemorySummary(gpu: Partial<GpuInfo> | null | undefined): string {
  if (!gpu) return 'Memory unknown';

  const total = gpu.memory_total_human
    ?? gpu.total_memory_human
    ?? formatMib(gpu.memory_total_mib)
    ?? 'Memory unknown';
  const used = gpu.memory_used_human
    ?? gpu.used_memory_human
    ?? formatMib(gpu.memory_used_mib);
  const free = gpu.memory_free_human
    ?? gpu.free_memory_human
    ?? formatMib(gpu.memory_free_mib);

  const details = [
    used ? `used ${used}` : null,
    free ? `free ${free}` : null,
  ].filter(Boolean);

  return details.length > 0 ? `${total} (${details.join(' / ')})` : total;
}

export function formatGpuLabel(gpu: Partial<GpuInfo> | null | undefined): string {
  if (!gpu) return 'GPU unknown';
  const index = gpu.index ?? '?';
  const name = gpu.name || 'Unknown GPU';

  if (isExcludedDisplayGpu(gpu)) {
    return `GPU ${index} — ${name} — Excluded / Display / Not used for inference`;
  }

  const total = gpu.memory_total_human
    ?? gpu.total_memory_human
    ?? formatMib(gpu.memory_total_mib)
    ?? 'Memory unknown';
  return `GPU ${index} — ${name} — ${total}`;
}

export function formatGpuDevices(value: unknown): string {
  if (value === 'all') return 'All usable inference GPUs';
  if (value === null || value === undefined || value === '') return '—';

  if (typeof value === 'string') {
    return value.split(',').map((part) => part.trim()).filter(Boolean).map((part) => `GPU ${part}`).join(', ') || value;
  }

  if (typeof value === 'number') return `GPU ${value}`;

  if (Array.isArray(value)) {
    if (value.length === 0) return '—';
    return value.map((item) => {
      if (typeof item === 'number' || typeof item === 'string') return `GPU ${item}`;
      if (isRecord(item)) return formatGpuLabel(item as Partial<GpuInfo>);
      return safeDisplayValue(item);
    }).join(', ');
  }

  if (isRecord(value)) return formatGpuLabel(value as Partial<GpuInfo>);

  return safeDisplayValue(value);
}

export function getGpuStatusSummaryFields(status: {
  memory_total_human?: string;
  memory_used_human?: string;
  memory_free_human?: string;
  total_memory_human?: string;
  used_memory_human?: string;
  free_memory_human?: string;
  memory_total_mib?: number;
  memory_used_mib?: number;
  memory_free_mib?: number;
} | null | undefined): { total: string; used: string; free: string } {
  return {
    total: status?.memory_total_human ?? status?.total_memory_human ?? formatMib(status?.memory_total_mib) ?? 'Unknown',
    used: status?.memory_used_human ?? status?.used_memory_human ?? formatMib(status?.memory_used_mib) ?? 'Unknown',
    free: status?.memory_free_human ?? status?.free_memory_human ?? formatMib(status?.memory_free_mib) ?? 'Unknown',
  };
}
