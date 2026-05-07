import { apiPath } from '../config/endpoints';
import {
  RagGatewayHealthResponse,
  GatewayModelsResponse,
  RagIngestionDebug,
  RagIngestionProjectStatus,
  RagCollectionListResponse,
  RagSearchRequest,
  RagSearchResponse,
  RagSearchResult,
  RagEmbeddingSmokeTestResponse,
  RagChatTestResponse,
  KnownRagProject,
  RagIngestionJob,
  RagIngestionState,
} from '../types';

// ── RagEndpointError class ──────────────────────────────────────────────────

export class RagEndpointError {
  url: string;
  status?: number;
  statusText?: string;
  bodyPreview?: string;
  message: string;
  timestamp: number;

  constructor(params: {
    url: string;
    status?: number;
    statusText?: string;
    bodyPreview?: string;
    message: string;
    timestamp?: number;
  }) {
    this.url = params.url;
    this.status = params.status;
    this.statusText = params.statusText;
    this.bodyPreview = params.bodyPreview;
    this.message = params.message;
    this.timestamp = params.timestamp || Date.now();
  }
}

// ── Known RAG projects ──────────────────────────────────────────────────────

export const KNOWN_RAG_PROJECTS: KnownRagProject[] = [
  { project_id: 'default', collectionName: 'qonduit_rag__default' },
  { project_id: 'android-qonduit', collectionName: 'qonduit_rag__android-qonduit' },
  { project_id: 'chatgpt', collectionName: 'qonduit_rag__chatgpt' },
  { project_id: 'checkbook', collectionName: 'qonduit_rag__checkbook' },
  { project_id: 'work', collectionName: 'qonduit_rag__work' },
];

export function formatProjectCollectionName(projectId: string): string {
  return `qonduit_rag__${projectId}`;
}

// ── Safe fetch helper ───────────────────────────────────────────────────────

/**
 * Fetch JSON with defensive error handling.
 * - Detects non-JSON responses (HTML, plain text)
 * - Preserves HTTP status
 * - Includes URL and short body preview in errors
 */
async function safeFetchJsonWithPreview(
  url: string,
  options?: RequestInit,
  context?: string
): Promise<{ data: unknown; response: Response }> {
  let response: Response;
  let bodyPreview = '';

  try {
    response = await fetch(url, options);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Connection failed';
    throw new RagEndpointError({
      url,
      message: `${message} (URL: ${url})`,
      timestamp: Date.now(),
    });
  }

  // Try to read body for preview (always, even on error)
  try {
    const text = await response.text();
    bodyPreview = text.length > 300 ? text.substring(0, 300) + '...' : text;
  } catch {
    bodyPreview = '[unable to read body]';
  }

  // Check content type
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new RagEndpointError({
      url,
      status: response.status,
      statusText: response.statusText,
      bodyPreview,
      message: `${context || url} returned ${contentType} instead of application/json.`,
      timestamp: Date.now(),
    });
  }

  // Parse JSON
  try {
    const data = JSON.parse(bodyPreview);
    return { data, response };
  } catch {
    throw new RagEndpointError({
      url,
      status: response.status,
      statusText: response.statusText,
      bodyPreview,
      message: `JSON parse failed for ${context || url}.`,
      timestamp: Date.now(),
    });
  }
}

// ── Gateway Health ──────────────────────────────────────────────────────────

export async function getGatewayHealth(): Promise<RagGatewayHealthResponse> {
  const url = apiPath('gateway', '/health');
  const { data } = await safeFetchJsonWithPreview(url, undefined, 'Gateway /health');
  return normalizeGatewayHealth(data);
}

// ── Gateway Models ──────────────────────────────────────────────────────────

export async function getGatewayModels(): Promise<GatewayModelsResponse> {
  const url = apiPath('gateway', '/v1/models');
  const { data } = await safeFetchJsonWithPreview(url, undefined, 'Gateway /v1/models');
  return normalizeGatewayModels(data);
}

// ── Ingestion Debug ─────────────────────────────────────────────────────────

export async function getRagIngestionDebug(): Promise<RagIngestionDebug> {
  const url = apiPath('gateway', '/v1/ingestion/debug');
  const { data } = await safeFetchJsonWithPreview(url, undefined, 'Gateway /v1/ingestion/debug');
  return normalizeRagDebug(data);
}

// ── Ingestion Status (all projects) ─────────────────────────────────────────

export async function getAllRagIngestionStatus(): Promise<RagIngestionProjectStatus[]> {
  const url = apiPath('gateway', '/v1/ingestion/status');
  const { data } = await safeFetchJsonWithPreview(url, undefined, 'Gateway /v1/ingestion/status');
  return normalizeAllProjectStatuses(data);
}

// ── Ingestion Status (single project) ───────────────────────────────────────

export async function getRagIngestionStatus(projectId: string): Promise<RagIngestionProjectStatus> {
  const url = apiPath('gateway', `/v1/ingestion/status/${projectId}`);
  const { data } = await safeFetchJsonWithPreview(url, undefined, `Gateway /v1/ingestion/status/${projectId}`);
  return normalizeRagProjectStatus(data, projectId);
}

// ── RAG Collections ─────────────────────────────────────────────────────────

export async function listRagCollections(
  projectId: string,
  userId?: string
): Promise<RagCollectionListResponse> {
  const url = apiPath('gateway', '/rag/collections');
  const headers: Record<string, string> = {
    'X-Project-ID': projectId,
  };
  if (userId) {
    headers['X-Qonduit-User'] = userId;
  }
  const { data } = await safeFetchJsonWithPreview(
    url,
    { method: 'GET', headers },
    'Gateway /rag/collections'
  );
  return normalizeRagCollections(data, projectId);
}

// ── Diagnostic Search ───────────────────────────────────────────────────────

export async function searchRagCollection(
  projectId: string,
  collection: string | undefined,
  query: string,
  limit: number
): Promise<RagSearchResponse> {
  const url = apiPath('gateway', '/rag/test-search');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Project-ID': projectId,
  };
  const body: RagSearchRequest = { query, limit };
  if (collection) {
    body.collection = collection;
  }
  const { data } = await safeFetchJsonWithPreview(
    url,
    { method: 'POST', headers, body: JSON.stringify(body) },
    'Gateway /rag/test-search'
  );
  return normalizeRagSearch(data);
}

// ── Embedding Smoke Test ────────────────────────────────────────────────────

export async function runEmbeddingSmokeTest(): Promise<RagEmbeddingSmokeTestResponse> {
  const url = apiPath('gateway', '/v1/embeddings');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const body = {
    input: 'qonduit embedding smoke test',
  };
  const { data, response } = await safeFetchJsonWithPreview(
    url,
    { method: 'POST', headers, body: JSON.stringify(body) },
    'Gateway /v1/embeddings'
  );

  if (!response.ok) {
    return { ok: false, error: `HTTP ${response.status}: ${response.statusText}` };
  }

  return normalizeEmbeddingSmokeTest(data);
}

// ── RAG Chat Test ───────────────────────────────────────────────────────────

export async function runRagChatTest(
  model: string,
  message: string,
  ragCollection?: string,
  projectId?: string
): Promise<RagChatTestResponse> {
  const url = apiPath('gateway', '/v1/chat/completions');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const body: Record<string, unknown> = {
    model,
    messages: [{ role: 'user', content: message }],
    temperature: 0.7,
    max_tokens: 1024,
    stream: false,
  };
  if (ragCollection) body.rag_collection = ragCollection;
  if (projectId) body.project_id = projectId;

  const { data, response } = await safeFetchJsonWithPreview(
    url,
    { method: 'POST', headers, body: JSON.stringify(body) },
    'Gateway /v1/chat/completions'
  );

  if (!response.ok) {
    return { ok: false, error: `HTTP ${response.status}: ${response.statusText}` };
  }

  return normalizeRagChatTest(data);
}

// ── Normalization Helpers ───────────────────────────────────────────────────

function normalizeGatewayHealth(raw: unknown): RagGatewayHealthResponse {
  if (!raw || typeof raw !== 'object') return { status: 'unknown' };
  const obj = raw as Record<string, unknown>;
  return {
    status: typeof obj.status === 'string' ? obj.status : 'unknown',
    version: typeof obj.version === 'string' ? obj.version : undefined,
    qdrant_connected: obj.qdrant_connected === true,
    embedding_model_available: obj.embedding_model_available === true,
    ...obj,
  };
}

function normalizeGatewayModels(raw: unknown): GatewayModelsResponse {
  if (!raw || typeof raw !== 'object') return { models: [] };
  const obj = raw as Record<string, unknown>;
  const models: GatewayModelsResponse['models'] = [];

  // Shape 1: { data: [{ id: "x" }] }
  if (Array.isArray(obj.data)) {
    for (const item of obj.data) {
      if (item && typeof item === 'object') {
        const o = item as Record<string, unknown>;
        const id = String(o.id || 'unknown');
        const name = String(o.name || o.id || 'unknown');
        models.push({ id, name, alias: typeof o.alias === 'string' ? o.alias : undefined });
      }
    }
  }

  // Shape 2: { models: [...] }
  if (Array.isArray(obj.models)) {
    for (const item of obj.models) {
      if (item && typeof item === 'object') {
        const o = item as Record<string, unknown>;
        const id = String(o.id || o.name || 'unknown');
        if (!models.some(m => m.id === id)) {
          const name = String(o.name || o.model || o.id || 'unknown');
          models.push({ id, name, alias: typeof o.alias === 'string' ? o.alias : undefined });
        }
      }
    }
  }

  return { models };
}

function normalizeRagDebug(raw: unknown): RagIngestionDebug {
  if (!raw || typeof raw !== 'object') return { raw: {} };
  const obj = raw as Record<string, unknown>;
  return {
    worker_state: typeof obj.worker_state === 'string' ? obj.worker_state : undefined,
    queue_length: typeof obj.queue_length === 'number' ? obj.queue_length : 0,
    queue_project_ids: Array.isArray(obj.queue_project_ids) ? obj.queue_project_ids as string[] : [],
    active_job: obj.active_job ? normalizeRagJob(obj.active_job) : null,
    chunks_embedded: typeof obj.chunks_embedded === 'number' ? obj.chunks_embedded : 0,
    chunks_written: typeof obj.chunks_written === 'number' ? obj.chunks_written : 0,
    recent_completed: Array.isArray(obj.recent_completed) ? obj.recent_completed : [],
    recent_failed: Array.isArray(obj.recent_failed) ? obj.recent_failed : [],
    last_error: typeof obj.last_error === 'string' ? obj.last_error : null,
    updated_at: typeof obj.updated_at === 'string' ? obj.updated_at : undefined,
    raw: obj,
  };
}

function normalizeRagJob(raw: unknown): RagIngestionJob {
  if (!raw || typeof raw !== 'object') return { raw: {} };
  const obj = raw as Record<string, unknown>;
  return {
    project_id: typeof obj.project_id === 'string' ? obj.project_id : undefined,
    branch: typeof obj.branch === 'string' ? obj.branch : undefined,
    current_file: typeof obj.current_file === 'string' ? obj.current_file : undefined,
    chunks_embedded: typeof obj.chunks_embedded === 'number' ? obj.chunks_embedded : 0,
    chunks_written: typeof obj.chunks_written === 'number' ? obj.chunks_written : 0,
    started_at: typeof obj.started_at === 'string' ? obj.started_at : undefined,
    raw: obj,
  };
}

function normalizeRagProjectStatus(raw: unknown, projectId: string): RagIngestionProjectStatus {
  if (!raw || typeof raw !== 'object') {
    return { project_id: projectId, state: 'unknown', raw: {} };
  }
  const obj = raw as Record<string, unknown>;

  // Normalize state
  let state: RagIngestionState = 'unknown';
  const rawState = typeof obj.state === 'string' ? obj.state.toLowerCase() : '';
  if (['idle', 'queued', 'running', 'success', 'failed'].includes(rawState)) {
    state = rawState as RagIngestionState;
  }

  return {
    project_id: projectId,
    state,
    queued_position: typeof obj.queued_position === 'number' ? obj.queued_position : undefined,
    current_file: typeof obj.current_file === 'string' ? obj.current_file : undefined,
    chunks_embedded: typeof obj.chunks_embedded === 'number' ? obj.chunks_embedded : 0,
    chunks_written: typeof obj.chunks_written === 'number' ? obj.chunks_written : 0,
    files_scanned: typeof obj.files_scanned === 'number' ? obj.files_scanned : 0,
    skipped_files: typeof obj.skipped_files === 'number' ? obj.skipped_files : 0,
    last_started_at: typeof obj.last_started_at === 'string' ? obj.last_started_at : null,
    last_finished_at: typeof obj.last_finished_at === 'string' ? obj.last_finished_at : null,
    last_error: typeof obj.last_error === 'string' ? obj.last_error : null,
    raw: obj,
  };
}

function normalizeAllProjectStatuses(raw: unknown): RagIngestionProjectStatus[] {
  if (!raw || typeof raw !== 'object') return [];
  const obj = raw as Record<string, unknown>;

  // Handle { status: { projectId: {...}, ... } } shape
  if (obj.status && typeof obj.status === 'object') {
    const statusObj = obj.status as Record<string, unknown>;
    return Object.entries(statusObj).map(([projectId, projectData]) =>
      normalizeRagProjectStatus(projectData, projectId)
    );
  }

  // Handle array shape
  if (Array.isArray(obj)) {
    return obj.map((item) => {
      if (item && typeof item === 'object') {
        const o = item as Record<string, unknown>;
        const projectId = String(o.project_id || o.project || 'unknown');
        return normalizeRagProjectStatus(o, projectId);
      }
      return { project_id: 'unknown', state: 'unknown', raw: {} };
    });
  }

  return [];
}

function normalizeRagCollections(raw: unknown, projectId: string): RagCollectionListResponse {
  if (!raw || typeof raw !== 'object') return { collections: [], project_id: projectId };
  const obj = raw as Record<string, unknown>;

  let collections: string[] = [];
  if (Array.isArray(obj.collections)) {
    collections = obj.collections.map(String);
  } else if (Array.isArray(obj.namespaces)) {
    collections = obj.namespaces.map(String);
  } else if (typeof obj.collections === 'string') {
    collections = [obj.collections];
  }

  return { collections, project_id: projectId };
}

function normalizeRagSearch(raw: unknown): RagSearchResponse {
  if (!raw || typeof raw !== 'object') return { results: [], query: '', limit: 0 };
  const obj = raw as Record<string, unknown>;

  const results: RagSearchResult[] = [];
  if (Array.isArray(obj.results)) {
    for (const item of obj.results) {
      if (item && typeof item === 'object') {
        const o = item as Record<string, unknown>;
        results.push({
          id: String(o.id || 'unknown'),
          score: typeof o.score === 'number' ? o.score : typeof o.similarity === 'number' ? o.similarity : 0,
          text: typeof o.text === 'string' ? o.text : typeof o.content === 'string' ? o.content : undefined,
          payload: o.payload && typeof o.payload === 'object' ? o.payload as Record<string, unknown> : undefined,
          source: typeof o.source === 'string' ? o.source : undefined,
          document: typeof o.document === 'string' ? o.document : undefined,
          file: typeof o.file === 'string' ? o.file : undefined,
          raw: o,
        });
      }
    }
  }

  return {
    results,
    query: typeof obj.query === 'string' ? obj.query : '',
    limit: typeof obj.limit === 'number' ? obj.limit : 0,
    collection: typeof obj.collection === 'string' ? obj.collection : undefined,
  };
}

function normalizeEmbeddingSmokeTest(raw: unknown): RagEmbeddingSmokeTestResponse {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'Unexpected response shape.' };
  const obj = raw as Record<string, unknown>;

  // Handle { data: [{ embedding: [...], ... }] }
  if (Array.isArray(obj.data) && obj.data.length > 0) {
    const first = obj.data[0] as Record<string, unknown>;
    const embedding = first.embedding;
    let vectorLength: number | undefined;
    if (Array.isArray(embedding)) {
      vectorLength = embedding.length;
    }
    return {
      ok: true,
      model: typeof first.model === 'string' ? first.model : undefined,
      vector_length: vectorLength,
    };
  }

  // Handle direct { embedding: [...] }
  if (Array.isArray(obj.embedding)) {
    return {
      ok: true,
      model: typeof obj.model === 'string' ? obj.model : undefined,
      vector_length: obj.embedding.length,
    };
  }

  return { ok: false, error: 'Unexpected embedding response shape.' };
}

function normalizeRagChatTest(raw: unknown): RagChatTestResponse {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'Unexpected response shape.' };
  const obj = raw as Record<string, unknown>;

  // Handle { choices: [{ message: { content: "..." } }] }
  if (Array.isArray(obj.choices) && obj.choices.length > 0) {
    const first = obj.choices[0] as Record<string, unknown>;
    const message = first.message as Record<string, unknown> | undefined;
    const content = typeof message?.content === 'string' ? message.content : undefined;
    return {
      ok: true,
      content,
      model: typeof obj.model === 'string' ? obj.model : undefined,
      raw: obj,
    };
  }

  return { ok: false, error: 'No choices in chat response.' };
}
