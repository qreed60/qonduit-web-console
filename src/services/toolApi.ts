import { ToolEntry, ToolSettings, ToolCategory, TOOL_REGISTRY, DEFAULT_TOOL_SETTINGS } from '../types';

const STORAGE_KEY = 'qonduit-tool-settings';

// ── localStorage persistence ────────────────────────────────────────────────

export function loadToolSettings(): ToolSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ToolSettings;
      // Merge with defaults to handle missing keys
      return {
        global: { ...DEFAULT_TOOL_SETTINGS.global, ...parsed.global },
        perModel: parsed.perModel ?? {},
        confirmationMode: parsed.confirmationMode ?? 'risky-only',
      };
    }
  } catch {
    // Ignore parse errors
  }
  return { ...DEFAULT_TOOL_SETTINGS };
}

export function saveToolSettings(settings: ToolSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

// ── Tool registry helpers ───────────────────────────────────────────────────

export function getAllTools(): ToolEntry[] {
  return Object.values(TOOL_REGISTRY);
}

export function getToolByName(name: string): ToolEntry | undefined {
  return TOOL_REGISTRY[name];
}

export function getToolsByCategory(category: ToolCategory): ToolEntry[] {
  return Object.values(TOOL_REGISTRY).filter(t => t.category === category);
}

export function getEnabledTools(settings: ToolSettings): ToolEntry[] {
  return Object.values(TOOL_REGISTRY).filter(
    t => settings.global[t.name] !== false
  );
}

export function getToolStatus(tool: ToolEntry): 'available' | 'unavailable' | 'error' | 'unknown' {
  if (tool.backendAvailable) return 'available';
  if (tool.lastError) return 'error';
  return 'unknown';
}

// ── Placeholder API functions ───────────────────────────────────────────────
// These will be wired to real backend endpoints in Phase 4.

export async function fetchAvailableTools(): Promise<ToolEntry[]> {
  // TODO: Replace with GET /v1/tools when backend supports it
  console.warn('[toolApi] fetchAvailableTools is not yet connected to backend');
  return getAllTools();
}

export async function executeTool(
  toolName: string,
  _parameters: Record<string, unknown>
): Promise<Record<string, unknown>> {
  // TODO: Replace with POST /v1/tools/execute when backend supports it
  console.warn('[toolApi] executeTool is not yet connected to backend');
  throw new Error(`Tool "${toolName}" execution requires backend support`);
}

export async function fetchToolStatus(): Promise<Record<string, string | null>> {
  // TODO: Replace with GET /v1/tools/status when backend supports it
  console.warn('[toolApi] fetchToolStatus is not yet connected to backend');
  return Object.fromEntries(
    Object.values(TOOL_REGISTRY).map(t => [t.name, t.lastError])
  );
}

export async function updateToolSettings(
  settings: ToolSettings
): Promise<ToolSettings> {
  saveToolSettings(settings);
  return settings;
}
