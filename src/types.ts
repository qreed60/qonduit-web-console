export type EndpointMode = 'local' | 'public';

/**
 * The chat providers the app can route requests through.
 * Each has a distinct responsibility:
 *   Gateway  — OpenAI-compatible chat & model listing
 *   Direct   — Raw llama.cpp inference
 *
 * Router is a control-plane service (not a chat provider) —
 * it manages model lifecycle via the Flask API.
 */
export type ProviderType = 'Gateway' | 'Direct';

export interface EndpointOverrides {
  gateway?: string;
  router?: string;
  llama?: string;
}

export interface Settings {
  apiKey: string;
  defaultModel: string;
  defaultProvider: ProviderType;
  endpointMode: EndpointMode;
}

/**
 * Normalized model shape used throughout the UI.
 * Works for Gateway, Direct, and Router models regardless of response format.
 */
export interface NormalizedModel {
  id: string;
  name: string;
  provider: 'Gateway' | 'Direct' | 'Router';
  sourceUrl: string;
  created?: number;
  ownedBy?: string;
  path?: string;
  parameterSize?: string; // e.g., "35B", "20B", "unknown"
  fileSize?: string;       // e.g., "26.6 GB", "unknown"
}

export interface Model {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

export interface ModelsResponse {
  object: string;
  data: Model[];
}

export interface ApiError {
  message: string;
  type: string;
  code?: number;
}

export type Page = 'dashboard' | 'chat' | 'models' | 'router' | 'diagnostics' | 'settings';

/**
 * Chat message used for the /v1/chat/completions API.
 */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Shared provider state for tracking loading, errors, and health
 * across all four providers.
 */
export interface ProviderState {
  gateway: {
    models: Model[];
    loading: boolean;
    error: string | null;
    health: boolean | null;
  };
  router: {
    models: Array<{ name: string; path: string }>;
    status: { running: boolean; exists: boolean } | null;
    loading: boolean;
    error: string | null;
    health: boolean | null;
  };
  direct: {
    models: Model[];
    loading: boolean;
    error: string | null;
    health: boolean | null;
  };
}

/**
 * Default provider state — all providers start unloaded.
 */
export const DEFAULT_PROVIDER_STATE: ProviderState = {
  gateway: { models: [], loading: false, error: null, health: null },
  router:  { models: [], status: null, loading: false, error: null, health: null },
  direct:  { models: [], loading: false, error: null, health: null },
};

/**
 * A model that can be selected in the UI, regardless of provider.
 * Router models carry a `path`; Gateway/Direct models do not.
 */
export interface SelectableModel {
  name: string;
  path?: string;
}

// ── Router API enriched types ────────────────────────────────────────────────

/**
 * Enriched router model from GET /api/v1/qonduit-router/models response.models[].
 * Matches the actual backend response shape.
 */
export interface RouterModel {
  id: string;
  name: string;
  path?: string;
  file_size_bytes?: number;
  file_size_human?: string;
  parameter_size?: string;
  modified_at?: string;
  suggested_context?: number;
  launchable?: boolean;
  is_running?: boolean;
}

/**
 * Enriched router status from GET /api/v1/qonduit-router/status.
 * All fields except running/exists may be null/missing before first launch.
 */
export interface RouterStatus {
  ok: boolean;
  running: boolean;
  exists: boolean;
  running_model?: string | null;
  context_size?: number | null;
  last_launch?: string | null;
  ready?: boolean;
  container_name?: string;
  container_id?: string;
  image?: string;
}

/**
 * Per-GPU info from GET /api/v1/qonduit-router/gpu response.gpus[].
 */
export interface GpuInfo {
  index: number;
  name: string;
  memory_total_mib: number;
  memory_used_mib: number;
  memory_free_mib: number;
}

/**
 * Full GPU/VRAM status from GET /api/v1/qonduit-router/gpu.
 */
export interface GpuStatus {
  ok: boolean;
  gpus: GpuInfo[];
  memory_total_mib: number;
  memory_used_mib: number;
  memory_free_mib: number;
  memory_total_human: string;
  memory_used_human: string;
  memory_free_human: string;
}
