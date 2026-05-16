import { ToolEntry, ToolSettings, ToolCategory, TOOL_REGISTRY, DEFAULT_TOOL_SETTINGS } from '../types';
import { apiPath } from '../config/endpoints';

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

// ── Tool availability detection ──────────────────────────────────────────────

export interface ToolAvailabilityResult {
  backendOk: boolean;
  toolsEndpointOk: boolean;
  toolsEnabled: boolean;
  toolsCount: number;
  error?: string;
  endpoint?: string;
  httpStatus?: number;
}

export async function fetchToolAvailability(): Promise<ToolAvailabilityResult> {
  const baseUrl = apiPath('gateway', '');
  const endpoints = [
    `${baseUrl}/v1/tools`,
    `${baseUrl}/v1/tools/status`,
    `${baseUrl}/v1/gateway/settings/tools`,
  ];

  for (const url of endpoints) {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        let bodyPreview = '';
        try {
          bodyPreview = (await response.text()).substring(0, 200);
        } catch { /* ignore */ }

        return {
           backendOk: true,
           toolsEndpointOk: false,
           toolsEnabled: false,
           toolsCount: 0,
           error: `HTTP ${response.status}: ${response.statusText}${bodyPreview ? ` — ${bodyPreview}` : ''}`,
           endpoint: url,
           httpStatus: response.status,
         };
      }

      let data: unknown;
      try {
        data = await response.json();
      } catch {
        return {
                  backendOk: true,
                  toolsEndpointOk: false,
                  toolsEnabled: false,
                  toolsCount: 0,
                  error: 'Non-JSON response from tools endpoint',
                  endpoint: url,
                  httpStatus: response.status,
                };
      }

      if (!data || typeof data !== 'object') {
        continue;
      }

      const obj = data as Record<string, unknown>;

      let toolsList: unknown[] = [];
      let toolsEnabled = false;

      if (Array.isArray(obj.tools)) {
        toolsList = obj.tools;
      } else if (Array.isArray(obj.data)) {
        toolsList = obj.data;
      } else if (Array.isArray(obj.models)) {
        toolsList = obj.models;
      }

      if (typeof obj.enabled === 'boolean') {
        toolsEnabled = obj.enabled;
      } else if (typeof obj.ok === 'boolean') {
        toolsEnabled = obj.ok;
      } else if (obj.tools || obj.data || obj.models) {
        toolsEnabled = true;
      }

      return {
        backendOk: true,
        toolsEndpointOk: true,
        toolsEnabled,
        toolsCount: toolsList.length,
        endpoint: url,
        httpStatus: response.status,
      };

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      return {
              backendOk: false,
              toolsEndpointOk: false,
              toolsEnabled: false,
              toolsCount: 0,
              error: message,
              endpoint: url,
            };
    }
  }

  return {
      backendOk: true,
      toolsEndpointOk: false,
      toolsEnabled: false,
      toolsCount: 0,
      error: 'No tools endpoint found in tried paths',
      endpoint: endpoints.join(', '),
    };
}
