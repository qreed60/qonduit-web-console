import { Settings, ProviderType, ChatMessage, NormalizedModel, GpuStatus, RouterStatus, RouterSlotsResponse, RouterEndpointsResponse, RouterPreflightRequest, RouterPreflightResponse, HfSearchResponse, HfSearchResult, HfRepoFilesResponse, HfRepoFile, HfDownloadDryRunResponse, HfDownloadStartResponse, HfDownloadJob, HfDownloadJobsResponse, LocalModelDeleteResponse, ModelTrashEntry, ModelTrashResponse, ModelRestoreResponse, ModelTrashPermanentDeleteResponse, ChatAttachmentPayload } from '../types';
import { getMode, apiPath } from '../config/endpoints';

// Re-export NormalizedModel for convenience
export type { NormalizedModel, GpuStatus, RouterStatus, RouterSlotsResponse, RouterEndpointsResponse, RouterPreflightRequest, RouterPreflightResponse, HfSearchResponse, HfSearchResult, HfRepoFilesResponse, HfRepoFile, HfDownloadDryRunResponse, HfDownloadStartResponse, HfDownloadJob, HfDownloadJobsResponse, LocalModelDeleteResponse, ModelTrashEntry, ModelTrashResponse, ModelRestoreResponse, ModelTrashPermanentDeleteResponse };

// ── Model metadata helpers ──────────────────────────────────────────────────

/**
 * Format bytes to human-readable string (GB, MB, KB).
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Convert MiB to human-readable string (GiB or MiB).
 */
export function formatMiBToHuman(mib: number): string {
  if (mib >= 1024) {
    return `${(mib / 1024).toFixed(1)} GiB`;
  }
  return `${mib} MiB`;
}

/**
 * Extract parameter size from a model name/filename.
 * Matches patterns like "35B", "20B", "0.5B", "1.5B".
 */
export function extractParameterSize(name: string): string {
  const match = name.match(/(\d+(?:\.\d+)?)B/);
  return match ? `${match[1]}B` : 'unknown';
}

/**
 * Extract file size from a model name/filename if present.
 * Matches patterns like "26.6GB", "15.2gb".
 * Returns 'unknown' if no file size pattern found.
 */
export function extractFileSize(name: string): string {
  const sizeMatch = name.match(/(\d+(?:\.\d+)?)\s*(GB|TB)/i);
  if (sizeMatch) {
    return `${sizeMatch[1]} ${sizeMatch[2].toUpperCase()}`;
  }
  return 'unknown';
}

const DEFAULT_SETTINGS: Settings = {
  apiKey: 'local',
  defaultModel: 'Qwen3-Coder-Next-IQ4_NL.gguf',
  defaultProvider: 'Direct',
  endpointMode: 'local',
};

/**
 * Migrate old localStorage settings that contain the deprecated URL fields.
 * If the stored settings have gatewayBaseUrl/directBaseUrl/routerBaseUrl,
 * strip them out and save the cleaned version with the new endpointMode.
 */
function migrateSettings(): Settings {
  const raw = localStorage.getItem('qonduit-settings');
  if (!raw) return DEFAULT_SETTINGS;

  try {
    const parsed: Record<string, unknown> = JSON.parse(raw);
    const hasOldFields =
      'gatewayBaseUrl' in parsed ||
      'directBaseUrl' in parsed ||
      'routerBaseUrl' in parsed;

    if (hasOldFields) {
      const { gatewayBaseUrl, directBaseUrl, routerBaseUrl, ...clean } = parsed;
      const migrated: Settings = { ...DEFAULT_SETTINGS, ...clean, endpointMode: getMode() };
      localStorage.setItem('qonduit-settings', JSON.stringify(migrated));
      return migrated;
    }
  } catch {
    // If JSON is malformed, fall through to defaults
  }

  const saved: Partial<Settings> = JSON.parse(raw);
  return { ...DEFAULT_SETTINGS, ...saved, endpointMode: getMode() };
}

/**
 * Migrate invalid provider values from old settings.
 * Router and WebUI are no longer valid chat providers.
 */
function migrateProvider(settings: Settings): Settings {
  const provider = settings.defaultProvider as string;
  if (provider === 'Router' || provider === 'WebUI') {
    const migrated: Settings = { ...settings, defaultProvider: 'Direct' };
    localStorage.setItem('qonduit-settings', JSON.stringify(migrated));
    return migrated;
  }
  return settings;
}

export function getSettings(): Settings {
  return migrateProvider(migrateSettings());
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem('qonduit-settings', JSON.stringify(settings));
}

// ── Internal helpers ────────────────────────────────────────────────────────

/**
 * Parse a JSON response safely. Throws descriptive errors for non-JSON responses.
 */
async function parseJsonSafe<T>(response: Response, context: string): Promise<T> {
  if (!response.ok) {
    const url = response.url;
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('text/html')) {
      const body = await response.text().catch(() => '[unable to read body]');
      const preview = body.length > 200 ? body.substring(0, 200) + '...' : body;
      throw new Error(
        `${context} returned HTML instead of JSON (HTTP ${response.status}). ` +
        `This usually means the endpoint URL is wrong or a proxy is intercepting. ` +
        `URL: ${url}\nResponse preview: ${preview}`
      );
    }

    throw new Error(`${context} failed (HTTP ${response.status}): ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const body = await response.text().catch(() => '[unable to read body]');
    const preview = body.length > 200 ? body.substring(0, 200) + '...' : body;
    throw new Error(
      `${context} returned ${contentType} instead of application/json. ` +
      `URL: ${response.url}\nResponse preview: ${preview}`
    );
  }

  return response.json() as Promise<T>;
}

/**
 * Extract file size from an API response object, checking multiple field names.
 * Returns formatted string or undefined if not found.
 */
function extractSizeFromObject(o: Record<string, unknown>): string | undefined {
  // Direct size fields
  const sizeBytes = o.size ?? o.file_size_bytes ?? o.fileSize ?? o.filesize;
  if (typeof sizeBytes === 'number' && sizeBytes > 0) {
    return formatBytes(sizeBytes);
  }
  // Nested metadata
  const meta = o.metadata as Record<string, unknown> | undefined;
  if (meta) {
    const metaSize = meta.size ?? meta.file_size_bytes ?? meta.fileSize;
    if (typeof metaSize === 'number' && metaSize > 0) {
      return formatBytes(metaSize);
    }
  }
  return undefined;
}

/**
 * Parse any /v1/models response into a list of NormalizedModel objects.
 * Handles:
 *   - { data: [{ id: "x" }] }              — OpenAI standard
 *   - { models: [{ name: "x", model: "x" }] } — alternative shape
 *   - { models: ["x", "y"] }               — string array
 *
 * Also checks for size/file_size_bytes/metadata.size fields in API responses.
 */
function parseModelsResponse(raw: unknown, provider: 'Gateway' | 'Direct'): NormalizedModel[] {
  if (!raw || typeof raw !== 'object') return [];
  const obj = raw as Record<string, unknown>;
  const results: NormalizedModel[] = [];

  // Shape 1: { data: [{ id: "x", ... }] } — OpenAI standard
   if (Array.isArray(obj.data)) {
     for (const item of obj.data) {
       if (item && typeof item === 'object') {
         const o = item as Record<string, unknown>;
         const id = String(o.id || o.name || 'unknown');
         const name = String(o.name || o.model || o.id || 'unknown');
         // Check API response for size fields first, fall back to filename parsing
         const apiFileSize = extractSizeFromObject(o);
         results.push({
           id,
           name,
           provider,
           sourceUrl: '',
           created: typeof o.created === 'number' ? o.created : undefined,
           ownedBy: typeof o.owned_by === 'string' ? o.owned_by : undefined,
           parameterSize: extractParameterSize(name),
           fileSize: apiFileSize ?? extractFileSize(name),
         });
       }
     }
   }
 
   // Shape 2: { models: [{ name: "x", model: "x" }] } — alternative object array
   if (Array.isArray(obj.models)) {
     for (const item of obj.models) {
       if (item && typeof item === 'object') {
         const o = item as Record<string, unknown>;
         const id = String(o.id || o.name || 'unknown');
         if (!results.some(m => m.id === id)) {
           const name = String(o.name || o.model || o.id || 'unknown');
           const apiFileSize = extractSizeFromObject(o);
           results.push({
             id,
             name,
             provider,
             sourceUrl: '',
             created: typeof o.created === 'number' ? o.created : undefined,
             ownedBy: typeof o.owned_by === 'string' ? o.owned_by : undefined,
             parameterSize: extractParameterSize(name),
             fileSize: apiFileSize ?? extractFileSize(name),
           });
         }
       }
     }
   }
 
   // Shape 3: { models: ["x", "y"] } — string array
   if (Array.isArray(obj.models) && obj.models.length > 0 && typeof obj.models[0] === 'string') {
     for (const name of obj.models as string[]) {
       const id = name;
       if (!results.some(m => m.id === id)) {
         results.push({
           id,
           name,
           provider,
           sourceUrl: '',
           parameterSize: extractParameterSize(name),
           fileSize: extractFileSize(name),
         });
       }
     }
   }
 
   return results;
 }

/**
 * Normalize parameter_size display casing.
 * Backend may return uppercase, lowercase, or mixed — normalize to title case.
 */
function normalizeParameterSize(raw: string): string {
  if (!raw || raw === 'unknown') return 'unknown';
  // If it already matches pattern like "35B", "20B", "0.5B" — return as-is
  if (/^\d+(\.\d+)?B$/i.test(raw)) {
    const match = raw.match(/^(\d+(?:\.\d+)?)b$/i);
    if (match) return `${match[1]}B`;
  }
  return raw;
}

/**
 * Parse router models response.
 * Handles:
 *   - { ok: true, models: [{...}], suggested_context: 65536 }  — enriched object[] (primary)
 *   - { ok: true, models: ["a.gguf", "b.gguf"], suggested_context: 32768 }  — legacy string[]
 *   - { models: [{ name: "a.gguf", path: "/path" }] }  — alternative object array
 *   - { models: ["a.gguf"] }  — legacy string array
 *
 * Primary source: response.models[] as object[].
 * Fallback: response.model_names[] for legacy/simple compatibility.
 */
function parseRouterModelsResponse(raw: unknown, sourceUrl: string): { models: NormalizedModel[]; suggestedCtx: number } {
  if (!raw || typeof raw !== 'object') return { models: [], suggestedCtx: 8192 };
  const obj = raw as Record<string, unknown>;
  const results: NormalizedModel[] = [];
  let suggestedCtx = 8192;

  // Extract context size — handle both field names
  const ctx = obj.suggested_context ?? obj.suggested_ctx ?? 8192;
  if (typeof ctx === 'number') suggestedCtx = ctx;

  // Primary: response.models[] as object[]
  if (Array.isArray(obj.models) && obj.models.length > 0 && typeof obj.models[0] === 'object') {
    for (const item of obj.models) {
      if (!item || typeof item !== 'object') continue;
      const o = item as Record<string, unknown>;
      const name = String(o.name || o.id || 'unknown');
      const id = String(o.id || o.name || name);

      // file_size_human is primary; fall back to formatting file_size_bytes
      let fileSize: string | undefined;
      if (typeof o.file_size_human === 'string' && o.file_size_human && o.file_size_human !== 'unknown') {
        fileSize = o.file_size_human;
      } else if (typeof o.file_size_bytes === 'number' && o.file_size_bytes > 0) {
        fileSize = formatBytes(o.file_size_bytes);
      }

      // parameter_size — normalize casing
      let paramSize: string | undefined;
      if (typeof o.parameter_size === 'string' && o.parameter_size) {
        paramSize = normalizeParameterSize(o.parameter_size);
      }

      results.push({
        id,
        name,
        provider: 'Router',
        sourceUrl,
        path: typeof o.path === 'string' ? o.path : undefined,
        parameterSize: paramSize ?? extractParameterSize(name),
        fileSize: fileSize ?? extractFileSize(name),
      });
    }
  }

  // Fallback: response.models[] as string[]
  if (results.length === 0 && Array.isArray(obj.models) && obj.models.length > 0 && typeof obj.models[0] === 'string') {
    for (const name of obj.models as string[]) {
      const id = name;
      if (!results.some(m => m.id === id)) {
        results.push({
          id,
          name,
          provider: 'Router',
          sourceUrl,
          path: name,
          parameterSize: extractParameterSize(name),
          fileSize: extractFileSize(name),
        });
      }
    }
  }

  // Fallback: response.model_names[] for legacy/simple compatibility
  if (results.length === 0 && Array.isArray(obj.model_names)) {
    for (const name of obj.model_names as string[]) {
      const id = name;
      if (!results.some(m => m.id === id)) {
        results.push({
          id,
          name,
          provider: 'Router',
          sourceUrl,
          path: name,
          parameterSize: extractParameterSize(name),
          fileSize: extractFileSize(name),
        });
      }
    }
  }

  return { models: results, suggestedCtx };
}

/**
 * Fetch models from the Memory Gateway (OpenAI-compatible /v1/models).
 * Handles multiple response shapes: { data: [...] }, { models: [...] }, { models: ["..."] }.
 */
export async function fetchGatewayModels(): Promise<NormalizedModel[]> {
  const url = apiPath('gateway', '/v1/models');
  const raw = await parseJsonSafe<unknown>(
    await fetch(url),
    'Gateway /v1/models'
  );
  const models = parseModelsResponse(raw, 'Gateway');
  return models.map(m => ({ ...m, sourceUrl: url }));
}

/**
 * Fetch models from the direct llama.cpp endpoint (OpenAI-compatible /v1/models).
 * Handles multiple response shapes: { data: [...] }, { models: [...] }, { models: ["..."] }.
 */
export async function fetchDirectModels(): Promise<NormalizedModel[]> {
  const url = apiPath('llama', '/v1/models');
  const raw = await parseJsonSafe<unknown>(
    await fetch(url),
    'Direct /v1/models'
  );
  const models = parseModelsResponse(raw, 'Direct');
  return models.map(m => ({ ...m, sourceUrl: url }));
}

/**
 * Fetch the list of GGUF models from the Flask router API.
 * Handles: { ok: true, models: ["a.gguf"], suggested_context: 32768 }
 *          { models: [{ name: "a.gguf", path: "/path" }] }
 */
export async function fetchRouterModels(): Promise<{ models: NormalizedModel[]; suggestedCtx: number }> {
  const url = apiPath('router', '/api/v1/qonduit-router/models');
  const raw = await parseJsonSafe<unknown>(
    await fetch(url),
    'Router /api/v1/qonduit-router/models'
  );
  return parseRouterModelsResponse(raw, url);
}

/**
 * Fetch multi-slot router slots from GET /api/v1/qonduit-router/slots.
 * Accepts either the canonical { slots: [...] } response or a bare array for
 * forward/backward compatibility, but always returns { slots } to callers.
 */
export async function fetchRouterSlots(): Promise<RouterSlotsResponse> {
  const url = apiPath('router', '/api/v1/qonduit-router/slots');
  const raw = await parseJsonSafe<unknown>(
    await fetch(url),
    'Router /api/v1/qonduit-router/slots'
  );

  if (Array.isArray(raw)) {
    return { ok: true, slots: raw as RouterSlotsResponse['slots'] };
  }

  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    return {
      ...obj,
      ok: typeof obj.ok === 'boolean' ? obj.ok : undefined,
      slots: Array.isArray(obj.slots) ? obj.slots as RouterSlotsResponse['slots'] : [],
    };
  }

  return { ok: false, slots: [] };
}

/**
 * Fetch OpenAI-compatible endpoints for router slots from
 * GET /api/v1/qonduit-router/endpoints.
 */
export async function fetchRouterEndpoints(): Promise<RouterEndpointsResponse> {
  const url = apiPath('router', '/api/v1/qonduit-router/endpoints');
  const raw = await parseJsonSafe<unknown>(
    await fetch(url),
    'Router /api/v1/qonduit-router/endpoints'
  );

  if (Array.isArray(raw)) {
    return { ok: true, endpoints: raw as RouterEndpointsResponse['endpoints'] };
  }

  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    return {
      ...obj,
      ok: typeof obj.ok === 'boolean' ? obj.ok : undefined,
      endpoints: Array.isArray(obj.endpoints) ? obj.endpoints as RouterEndpointsResponse['endpoints'] : [],
    };
  }

  return { ok: false, endpoints: [] };
}

/**
 * Run a slot preflight check via POST /api/v1/qonduit-router/slots/{slot_id}/preflight.
 * The body is always JSON so callers can preflight unsaved draft slot values.
 */
export async function preflightRouterSlot(
  slotId: string,
  request: RouterPreflightRequest = {},
): Promise<RouterPreflightResponse> {
  const url = apiPath('router', `/api/v1/qonduit-router/slots/${encodeURIComponent(slotId)}/preflight`);
  return parseJsonSafe<RouterPreflightResponse>(
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...request, slot_id: request.slot_id ?? slotId }),
    }),
    `Router /api/v1/qonduit-router/slots/${slotId}/preflight`
  );
}

// ── Unified provider model fetcher ──────────────────────────────────────────

/**
 * Fetch models from the correct endpoint based on the provider type.
 * Returns NormalizedModel[] for chat providers (Gateway/Direct).
 *
 * | Provider | Endpoint                              | Response shape       |
 * |----------|---------------------------------------|----------------------|
 * | Gateway  | gatewayBase + /v1/models              | NormalizedModel[]    |
 * | Direct   | llamaBase + /v1/models                | NormalizedModel[]    |
 */
export async function fetchProviderModels(provider: ProviderType): Promise<NormalizedModel[]> {
  switch (provider) {
    case 'Gateway':
      return fetchGatewayModels();
    case 'Direct':
      return fetchDirectModels();
    default:
      return [];
  }
}

// ── Chat completions ────────────────────────────────────────────────────────

/**
 * RAG selection parameters for Gateway chat requests.
 */
export interface RagChatSelection {
  projectId: string;
  collection?: string;
}

/**
 * Send a chat request to the Gateway's /v1/chat/completions endpoint.
 *
 * @param model      — Model ID to use for completion
 * @param messages   — Array of chat messages
 * @param ctxSize    — Context size (optional, defaults to 8192)
 * @param ragSelection — RAG project/collection selection (optional, Gateway mode only)
 * @param attachments — Chat attachments to include (optional)
 */
export async function fetchChatCompletions(
  model: string,
  messages: ChatMessage[],
  ctxSize: number = 8192,
  ragSelection?: RagChatSelection,
  attachments?: ChatAttachmentPayload[],
): Promise<{ choices: Array<{ message: ChatMessage; finish_reason: string | null }> }> {
  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: 0.7,
    max_tokens: 4096,
    stream: false,
    // Pass context size if the backend supports it
    ...(ctxSize !== 8192 && { context_size: ctxSize }),
  };

  // Attach RAG selection if provided (Gateway mode)
    if (ragSelection) {
      body.project_id = ragSelection.projectId;
      if (ragSelection.collection) {
        body.rag_collection = ragSelection.collection;
      }
      // Dev-only diagnostic: one log per message send (not per render)
      if (import.meta.env.DEV) {
        console.log(
          `[RAG Send] enabled=true project=${ragSelection.projectId} collection=${ragSelection.collection || '(none)'} attached=true`
        );
      }
    }

  // Attach files if provided
  if (attachments && attachments.length > 0) {
    body.attachments = attachments;
  }

    const response = await fetch(apiPath('gateway', '/v1/chat/completions'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HTTP ${response.status}: ${body}`);
  }
  return response.json();
}

// ── Streaming chat completions ──────────────────────────────────────────────

/**
 * Stream chat completions via SSE.
 * Yields: { type: 'delta', content: string } | { type: 'done' } | { type: 'error', error: string }
 */
export async function* streamChatCompletions(
  model: string,
  messages: ChatMessage[],
  ctxSize: number = 8192,
  ragSelection?: RagChatSelection,
  attachments?: ChatAttachmentPayload[],
  signal?: AbortSignal,
): AsyncGenerator<{ type: 'delta'; content: string } | { type: 'done' } | { type: 'error'; error: string }> {
  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: 0.7,
    max_tokens: 4096,
    stream: true,
    ...(ctxSize !== 8192 && { context_size: ctxSize }),
  };

  if (ragSelection) {
    body.project_id = ragSelection.projectId;
    if (ragSelection.collection) {
      body.rag_collection = ragSelection.collection;
    }
  }

  if (attachments && attachments.length > 0) {
    body.attachments = attachments;
  }

  const response = await fetch(apiPath('gateway', '/v1/chat/completions'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const bodyText = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status}: ${bodyText}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/event-stream')) {
    // Backend doesn't support streaming for this request (e.g., attachments not supported)
    // Fall through to non-streaming parse — caller will handle the mismatch
    await response.json();
    yield { type: 'done' };
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body reader');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // keep incomplete line in buffer

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (!trimmed.startsWith('data:')) continue;

        const jsonStr = trimmed.slice(5).trim();
        if (!jsonStr) continue;

        try {
          const parsed = JSON.parse(jsonStr);
          const choice = parsed.choices?.[0];
          if (!choice) continue;

          // Try delta first (incremental), then message (full)
          const content = choice.delta?.content || choice.message?.content;
          if (content) {
            yield { type: 'delta', content };
          }
        } catch {
          // Skip malformed JSON lines
          continue;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ── Health check result type ────────────────────────────────────────────────

export interface HealthCheckResult {
  ok: boolean;
  status?: number;
  error?: string;
}

// ── Health checks ───────────────────────────────────────────────────────────

/**
 * Test whether an endpoint is reachable by hitting its /health path.
 * Uses GET (not HEAD) to avoid 405 Method Not Allowed errors.
 */
export async function testEndpoint(key: 'gateway' | 'llama' | 'router'): Promise<boolean> {
  try {
    const response = await fetch(apiPath(key, '/health'), { method: 'GET' });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Test the router health endpoint (GET /api/v1/qonduit-router/health on the Flask router API).
 */
export async function testRouterHealth(): Promise<boolean> {
  try {
    const response = await fetch(apiPath('router', '/api/v1/qonduit-router/health'), { method: 'GET' });
    return response.ok;
  } catch {
    return false;
  }
}

// ── Detailed health checks with error reporting ─────────────────────────────

/**
 * Test an endpoint and return detailed error information.
 * Detects 405 errors and suggests the correct HTTP method.
 */
export async function testEndpointWithError(key: 'gateway' | 'llama' | 'router'): Promise<HealthCheckResult> {
  const url = apiPath(key, '/health');
  try {
    const response = await fetch(url, { method: 'GET' });
    if (response.ok) {
      return { ok: true, status: response.status };
    }
    if (response.status === 405) {
      const allow = response.headers.get('allow');
      return {
        ok: false,
        status: response.status,
        error: `HTTP 405 Method Not Allowed. Endpoint only allows: ${allow || 'unknown'}. Try GET instead of HEAD.`,
      };
    }
    return { ok: false, status: response.status, error: `HTTP ${response.status}: ${response.statusText}` };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Connection failed';
    return { ok: false, error: `${message} (URL: ${url})` };
  }
}

/**
 * Test the router health endpoint with detailed error reporting.
 * Detects CORS errors and suggests a server-side fix.
 */
export async function testRouterHealthWithError(): Promise<HealthCheckResult> {
  const url = apiPath('router', '/api/v1/qonduit-router/health');
  try {
    const response = await fetch(url, { method: 'GET' });
    if (response.ok) {
      return { ok: true, status: response.status };
    }
    if (response.status === 405) {
      const allow = response.headers.get('allow');
      return {
        ok: false,
        status: response.status,
        error: `HTTP 405 Method Not Allowed. Endpoint only allows: ${allow || 'unknown'}.`,
      };
    }
    return { ok: false, status: response.status, error: `HTTP ${response.status}: ${response.statusText}` };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Connection failed';
    // Detect CORS errors — curl works but browser blocks
    if (message.includes('Failed to fetch') || message.includes('NetworkError') || message.includes('CORS')) {
      return {
        ok: false,
        error: `Router API reachable by curl but likely blocked by CORS. Add CORS headers to router API at ${url}.`,
      };
    }
    return { ok: false, error: `${message} (URL: ${url})` };
  }
}

// ── Router control ──────────────────────────────────────────────────────────

/**
 * Launch a model via POST /api/v1/qonduit-router/launch.
 */
export async function launchModel(modelName: string, ctxSize: number): Promise<{ ok: boolean; message: string }> {
  const url = apiPath('router', '/api/v1/qonduit-router/launch');
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: modelName, context_size: ctxSize }),
  });
  if (!response.ok) {
    throw new Error(`Router /api/v1/qonduit-router/launch failed (HTTP ${response.status}): ${response.statusText}`);
  }
  return response.json();
}

/**
 * Stop the running model via POST /api/v1/qonduit-router/stop.
 */
export async function stopModel(): Promise<{ ok: boolean; message: string }> {
  const url = apiPath('router', '/api/v1/qonduit-router/stop');
  const response = await fetch(url, { method: 'POST' });
  if (!response.ok) {
    throw new Error(`Router /api/v1/qonduit-router/stop failed (HTTP ${response.status}): ${response.statusText}`);
  }
  return response.json();
}

/**
 * Restart (relaunch) the currently running model with the given context size.
 * Frontend-safe implementation: stops then launches with same model and context.
 */
export async function restartModel(modelName: string, ctxSize: number): Promise<{ ok: boolean; message: string }> {
  const stopResult = await stopModel();
  if (!stopResult.ok) {
    throw new Error(`Failed to stop model before restart: ${stopResult.message}`);
  }
  return launchModel(modelName, ctxSize);
}

/**
 * Get the enriched router status from GET /api/v1/qonduit-router/status.
 * Returns all fields including running_model, context_size, last_launch, ready, etc.
 * Note: running_model, context_size, last_launch may be null/missing before first launch.
 */
export async function getRouterStatus(): Promise<RouterStatus> {
  const url = apiPath('router', '/api/v1/qonduit-router/status');
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Router /api/v1/qonduit-router/status failed (HTTP ${response.status}): ${response.statusText}`);
  }
  const data = await response.json() as Record<string, unknown>;
     const lastLaunchRaw = data.last_launch;
     const lastLaunch: string | null = typeof lastLaunchRaw === 'string' ? lastLaunchRaw : null;
     const runningModelRaw = data.running_model;
     const runningModel: string | null = typeof runningModelRaw === 'string' ? runningModelRaw : null;
     const contextSizeRaw = data.context_size;
     const contextSize: number | null = typeof contextSizeRaw === 'number' ? contextSizeRaw : null;
     return {
       ok: data.ok === true,
       running: data.running === true,
       exists: data.exists === true,
       running_model: runningModel,
       context_size: contextSize,
       last_launch: lastLaunch,
       ready: data.ready === true,
       container_name: typeof data.container_name === 'string' ? data.container_name : undefined,
       container_id: typeof data.container_id === 'string' ? data.container_id : undefined,
       image: typeof data.image === 'string' ? data.image : undefined,
     };
}

/**
 * Fetch GPU/VRAM status from GET /api/v1/qonduit-router/gpu.
 * Returns all detected GPUs and memory totals.
 * If ok:false, the caller should show an unavailable message.
 */
export async function fetchRouterGpu(): Promise<GpuStatus> {
  const url = apiPath('router', '/api/v1/qonduit-router/gpu');
  const raw = await parseJsonSafe<GpuStatus>(
    await fetch(url),
    'Router /api/v1/qonduit-router/gpu'
  );
  return raw;
}

/**
 * Restart (relaunch) the model via POST /api/v1/qonduit-router/restart.
 * Sends selected model and context_size to the backend.
 */
export async function restartRouterModel(modelName: string, ctxSize: number): Promise<{ ok: boolean; message: string }> {
  const url = apiPath('router', '/api/v1/qonduit-router/restart');
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: modelName, context_size: ctxSize }),
  });
  if (!response.ok) {
    throw new Error(`Router /api/v1/qonduit-router/restart failed (HTTP ${response.status}): ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get the suggested context size for a model.
 */
export async function suggestContext(modelName: string): Promise<{ suggested_ctx: number }> {
  const response = await fetch(`${apiPath('router', '/api/v1/qonduit-router/context/suggest')}?model=${encodeURIComponent(modelName)}`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

/**
 * Probe the llama.cpp /health endpoint directly.
 */
export async function llamaReady(): Promise<boolean> {
  try {
    const response = await fetch(apiPath('llama', '/health'));
    return response.ok;
  } catch {
    return false;
  }
}

// ── Hugging Face Model Management ─────────────────────────────────────

/**
 * Search Hugging Face for models with GGUF files.
 */
export async function searchHfModels(
  query: string,
  limit: number = 20,
  sort: 'downloads' | 'likes' | 'lastModified' = 'downloads'
): Promise<HfSearchResponse> {
  const url = apiPath('router', `/api/v1/qonduit-router/hf/search?q=${encodeURIComponent(query)}&limit=${limit}&sort=${sort}`);
  const raw = await parseJsonSafe<HfSearchResponse>(
    await fetch(url),
    'HF search'
  );
  if (!raw.ok) {
    const msg = raw.error || 'Search failed';
    if (raw.rate_limited && raw.retry_after_seconds) {
      throw new Error(`Rate limited. Try again in ${raw.retry_after_seconds}s. ${msg}`);
    }
    throw new Error(`HF search failed: ${msg}`);
  }
  return raw;
}

/**
 * List GGUF files in a Hugging Face repository.
 */
export async function listHfRepoFiles(repoId: string): Promise<HfRepoFilesResponse> {
  const url = apiPath('router', `/api/v1/qonduit-router/hf/repo-files?repo_id=${encodeURIComponent(repoId)}`);
  const raw = await parseJsonSafe<HfRepoFilesResponse>(
    await fetch(url),
    'HF repo files'
  );
  if (!raw.ok) {
    throw new Error(`HF repo files failed: ${raw.error || 'Unknown error'}`);
  }
  return raw;
}

/**
 * Dry-run a Hugging Face download to validate before committing.
 */
export async function dryRunHfDownload(
  repoId: string,
  filename: string,
  targetName?: string
): Promise<HfDownloadDryRunResponse> {
  const url = apiPath('router', '/api/v1/qonduit-router/hf/download');
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      repo_id: repoId,
      filename,
      target_name: targetName,
      dry_run: true,
    }),
  });
  const data = await parseJsonSafe<HfDownloadDryRunResponse>(
    response,
    'HF dry-run download'
  );
  if (!data.ok) {
     throw new Error(`Dry-run failed: downloadable=${data.downloadable}, exists=${data.exists}`);
   }
   return data;
 }
 
 /**
  * Start a Hugging Face model download.
  */
 export async function startHfDownload(
   repoId: string,
   filename: string,
   targetName?: string,
   overwrite?: boolean
 ): Promise<HfDownloadStartResponse> {
   const url = apiPath('router', '/api/v1/qonduit-router/hf/download');
   const response = await fetch(url, {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       repo_id: repoId,
       filename,
       target_name: targetName,
       dry_run: false,
       overwrite: overwrite || false,
     }),
   });
   const data = await parseJsonSafe<HfDownloadStartResponse>(
     response,
     'HF download start'
   );
   if (!data.ok) {
     throw new Error(`Download failed: job not created`);
   }
  return data;
}

/**
 * List all Hugging Face download jobs.
 */
export async function listHfDownloads(): Promise<HfDownloadJobsResponse> {
  const url = apiPath('router', '/api/v1/qonduit-router/hf/downloads');
  const raw = await parseJsonSafe<HfDownloadJobsResponse>(
    await fetch(url),
    'HF downloads'
  );
  if (!raw.ok) {
    throw new Error(`HF downloads failed: ${raw.error || 'Unknown error'}`);
  }
  return raw;
}

/**
 * Get status of a single download job.
 */
export async function getHfDownload(jobId: string): Promise<HfDownloadJob> {
  const url = apiPath('router', `/api/v1/qonduit-router/hf/downloads/${encodeURIComponent(jobId)}`);
  const raw = await parseJsonSafe<HfDownloadJob>(
    await fetch(url),
    'HF download job'
  );
  return raw;
}

/**
 * Cancel a download job.
 */
export async function cancelHfDownload(jobId: string): Promise<{ ok: boolean; job_id: string; status: string }> {
  const url = apiPath('router', `/api/v1/qonduit-router/hf/downloads/${encodeURIComponent(jobId)}/cancel`);
  const response = await fetch(url, { method: 'POST' });
  if (!response.ok) {
    throw new Error(`Cancel failed (HTTP ${response.status})`);
  }
  return response.json();
}

/**
 * Move a local model to trash.
 */
export async function deleteLocalModel(modelName: string): Promise<LocalModelDeleteResponse> {
  const url = apiPath('router', '/api/v1/qonduit-router/models/delete');
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: modelName, confirm: true }),
  });
  const data = await parseJsonSafe<LocalModelDeleteResponse>(
     response,
     'Model delete'
   );
   if (!data.ok) {
     throw new Error(`Delete failed: model not moved to trash`);
   }
   return data;
 }
 
 /**
  * List trashed models.
  */
 export async function listModelTrash(): Promise<ModelTrashResponse> {
   const url = apiPath('router', '/api/v1/qonduit-router/models/trash');
   const raw = await parseJsonSafe<ModelTrashResponse>(
     await fetch(url),
     'Model trash'
   );
   if (!raw.ok) {
     throw new Error(`Trash list failed`);
   }
  return raw;
}

/**
 * Restore a model from trash.
 */
export async function restoreModelFromTrash(trashName: string): Promise<ModelRestoreResponse> {
  const url = apiPath('router', '/api/v1/qonduit-router/models/restore');
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trash_name: trashName }),
  });
  const data = await parseJsonSafe<ModelRestoreResponse>(
    response,
    'Model restore'
  );
  if (!data.ok) {
    throw new Error(`Restore failed: ${data.error || 'Unknown error'}`);
  }
  return data;
}

/**
 * Permanently delete a model from trash.
 */
export async function permanentlyDeleteTrashEntry(
  trashName: string
): Promise<ModelTrashPermanentDeleteResponse> {
  const url = apiPath('router', '/api/v1/qonduit-router/models/trash/delete');
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trash_name: trashName, confirm: true }),
  });
  const data = await parseJsonSafe<ModelTrashPermanentDeleteResponse>(
    response,
    'Model trash permanent delete'
  );
  if (!data.ok) {
    throw new Error('Permanent delete failed');
  }
  return data;
}

