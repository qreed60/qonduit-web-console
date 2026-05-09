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

export type Page = 'dashboard' | 'chat' | 'models' | 'router' | 'diagnostics' | 'rag' | 'gateway-settings' | 'settings';

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

// ── Hugging Face Search ──────────────────────────────────────────────

export interface HfSearchResult {
  repo_id: string;
  model_id: string;
  author: string;
  downloads: number;
  likes: number;
  last_modified: string;
  tags: string[];
  pipeline_tag: string;
  private: boolean;
  gated: boolean;
  gguf_count: number | null;
  gguf_verified: boolean;
  sample_gguf_files: string[];
  url: string;
  parameter_size: string;
  parameter_size_num: number;
  parameter_size_active: string;
  parameter_size_active_num: number;
}

export interface HfSearchResponse {
  ok: boolean;
  query: string;
  count: number;
  limit: number;
  sort: string;
  require_gguf: boolean;
  source: string;
  hf_models_url: string;
  cached: boolean;
  rate_limited: boolean;
  retry_after_seconds?: number;
  results: HfSearchResult[];
  error: string | null;
}

// ── Hugging Face Repo Files ─────────────────────────────────────────

export interface HfRepoFile {
  filename: string;
  path: string;
  size_bytes: number;
  size_human: string;
  size_gib: number;
  size_gb: number;
  is_gguf: boolean;
  quant: string;
  parameter_size: string;
  parameter_size_num: number;
  parameter_size_active: string;
  parameter_size_active_num: number;
  downloadable: boolean;
  url: string;
}

export interface HfRepoFilesResponse {
  ok: boolean;
  repo_id: string;
  url: string;
  gguf_count: number;
  parameter_size: string;
  parameter_size_num: number;
  parameter_size_active: string;
  parameter_size_active_num: number;
  cached: boolean;
  files: HfRepoFile[];
  error: string | null;
}

// ── Hugging Face Downloads ──────────────────────────────────────────

export interface HfDownloadDryRunResponse {
  ok: boolean;
  dry_run: true;
  downloadable: boolean;
  exists: boolean;
  repo_id: string;
  filename: string;
  target_name: string;
  target_path: string;
  size_bytes: number;
  size_human: string;
}

export interface HfDownloadStartResponse {
  ok: boolean;
  job_id: string;
  status: string;
  repo_id: string;
  filename: string;
  target_name: string;
  target_path: string;
  dry_run: false;
}

export interface HfDownloadJob {
  job_id: string;
  status: 'queued' | 'downloading' | 'complete' | 'failed' | 'cancelled' | 'interrupted';
  repo_id: string;
  filename: string;
  target_name: string;
  target_path: string;
  partial_path?: string;
  bytes_downloaded: number;
  total_bytes: number;
  progress: number;
  started_at: string | null;
  completed_at: string | null;
  error: string | null;
  cancel_requested: boolean;
}

export interface HfDownloadJobsResponse {
  ok: boolean;
  total: number;
  active_count: number;
  queued_count: number;
  jobs: HfDownloadJob[];
  error?: string | null;
}

// ── Model Trash ─────────────────────────────────────────────────────

export interface LocalModelDeleteResponse {
  ok: boolean;
  deleted: boolean;
  method: string;
  model: string;
  path: string;
  trash_path: string;
}

export interface ModelTrashEntry {
  trash_name: string;
  original_name: string;
  path: string;
  size_bytes: number;
  size_human: string;
  trashed_at: string;
}

export interface ModelTrashResponse {
  ok: boolean;
  count: number;
  trash_dir: string;
  files: ModelTrashEntry[];
}

export interface ModelRestoreResponse {
  ok: boolean;
  restored: boolean;
  trash_name: string;
  original_name: string;
  path: string;
  error?: string | null;
}

export interface ModelTrashPermanentDeleteResponse {
  ok: boolean;
  deleted: boolean;
  trash_name: string;
  original_name: string;
  path: string;
}

// ── RAG Diagnostics Types ────────────────────────────────────────────────────

/** Generic endpoint error captured by the frontend */
export interface RagEndpointError {
  url: string;
  status?: number;
  statusText?: string;
  bodyPreview?: string;
  message: string;
  timestamp: number;
}

// ── Phase 1 RAG Read API Types ──────────────────────────────────────────────

/** GET /v1/rag/health response */
export interface RagHealthResponse {
  ok: boolean;
  qdrant: {
    ok: boolean;
    url: string;
    error: string | null;
  };
  embedding: {
    ok: boolean;
    base: string;
    model: string;
    dimension: number;
    error: string | null;
  };
}

/** GET /v1/rag/projects response */
export interface RagProjectSummary {
  project_id: string;
  qdrant_collection: string;
  exists: boolean;
  points_count: number;
  vectors_count: number;
  status?: string;
  error?: string | null;
}

export interface RagProjectsListResponse {
  projects: RagProjectSummary[];
}

/** GET /v1/rag/projects/{project_id} response */
export interface RagProjectDetail {
  ok: boolean;
  project_id: string;
  qdrant_collection: string;
  exists: boolean;
  points_count: number;
  vectors_count: number;
  logical_collections?: string[];
  error?: string | null;
}

/** GET /v1/rag/projects/{project_id}/stats response */
export interface RagProjectStats {
  ok: boolean;
  exists: boolean;
  points_count: number;
  vectors_count: number;
  indexed_vectors_count: number;
  status: string;
  error?: string | null;
}

/** GET /v1/rag/projects/{project_id}/collections response */
export interface RagCollectionInfo {
  name: string;
  point_count?: number;
  counts_are_estimated?: boolean;
}

export interface RagCollectionsResponse {
  collections: RagCollectionInfo[];
  project_id: string;
}

/** GET /v1/rag/projects/{project_id}/documents response */
export interface RagDocumentSummary {
  document_id: string;
  document_name: string;
  source?: string;
  file_path?: string;
  file_type?: string;
  chunk_count: number;
  first_chunk_id?: string;
  metadata?: Record<string, unknown>;
}

export interface RagDocumentsResponse {
  documents: RagDocumentSummary[];
  project_id: string;
}

/** GET /v1/rag/projects/{project_id}/documents/{document_id}/chunks response */
export interface RagChunk {
  id: string;
  chunk_index: number;
  text: string;
  payload?: Record<string, unknown>;
}

export interface RagChunksResponse {
  chunks: RagChunk[];
  document_id: string;
  project_id: string;
}

/** POST /v1/rag/projects/{project_id}/search request */
export interface RagSearchRequestNew {
  query: string;
  collection?: string | null;
  limit?: number;
}

/** POST /v1/rag/projects/{project_id}/search response */
export interface RagSearchResultNew {
  id: string;
  score: number;
  text: string;
  text_preview?: string;
  payload?: Record<string, unknown>;
  document_name?: string;
  file_path?: string;
  chunk_index?: number;
}

export interface RagSearchResponseNew {
  results: RagSearchResultNew[];
  project_id: string;
  query: string;
  limit: number;
}

/** Known RAG project for the project cards */
export interface KnownRagProject {
  project_id: string;
  collectionName: string; // qonduit_rag__{project_id}
}

/** Normalized ingestion state */
export type RagIngestionState = 'idle' | 'queued' | 'running' | 'success' | 'failed' | 'unknown';

/** Normalized per-project ingestion status */
export interface RagIngestionProjectStatus {
  project_id: string;
  state: RagIngestionState;
  queued_position?: number;
  current_file?: string;
  chunks_embedded?: number;
  chunks_written?: number;
  files_scanned?: number;
  skipped_files?: number;
  last_started_at?: string | null;
  last_finished_at?: string | null;
  last_error?: string | null;
  raw: Record<string, unknown>;
  error?: RagEndpointError;
}

/** Normalized ingestion debug / queue overview */
export interface RagIngestionDebug {
  worker_state?: string;
  queue_length?: number;
  queue_project_ids?: string[];
  active_job?: RagIngestionJob | null;
  chunks_embedded?: number;
  chunks_written?: number;
  recent_completed?: Array<Record<string, unknown>>;
  recent_failed?: Array<Record<string, unknown>>;
  last_error?: string | null;
  updated_at?: string;
  raw: Record<string, unknown>;
  error?: RagEndpointError;
}

/** Active ingestion job */
export interface RagIngestionJob {
  project_id?: string;
  branch?: string;
  current_file?: string;
  chunks_embedded?: number;
  chunks_written?: number;
  started_at?: string;
  raw: Record<string, unknown>;
}

/** Gateway health response */
export interface RagGatewayHealthResponse {
  status?: string;
  version?: string;
  qdrant_connected?: boolean;
  embedding_model_available?: boolean;
  [key: string]: unknown;
}

/** Gateway models response (normalized) */
export interface GatewayModelsResponse {
  models: Array<{ id: string; name: string; alias?: string }>;
  error?: RagEndpointError;
}

/** RAG collection list response */
export interface RagCollectionListResponse {
  collections: string[];
  project_id: string;
  error?: RagEndpointError;
}

/** Diagnostic search request */
export interface RagSearchRequest {
  query: string;
  limit: number;
  collection?: string;
}

/** Diagnostic search result */
export interface RagSearchResult {
  id: string;
  score: number;
  text?: string;
  payload?: Record<string, unknown>;
  source?: string;
  document?: string;
  file?: string;
  raw: Record<string, unknown>;
}

/** Diagnostic search response */
export interface RagSearchResponse {
  results: RagSearchResult[];
  query: string;
  limit: number;
  collection?: string;
  error?: RagEndpointError;
}

/** Embedding smoke test response */
export interface RagEmbeddingSmokeTestResponse {
  ok: boolean;
  model?: string;
  vector_length?: number;
  error?: string;
}

/** RAG chat test request */
export interface RagChatTestRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  rag_collection?: string;
  project_id?: string;
}

/** RAG chat test response */
export interface RagChatTestResponse {
  ok: boolean;
  content?: string;
  model?: string;
  error?: string;
  raw?: Record<string, unknown>;
}

/** Full RAG page state (internal to the page component) */
export interface RagPageState {
  // Health
  health: RagGatewayHealthResponse | null;
  healthError: RagEndpointError | null;
  healthLastChecked: number | null;
  models: GatewayModelsResponse['models'] | null;
  modelsError: RagEndpointError | null;

  // Ingestion
  ingestionDebug: RagIngestionDebug | null;
  ingestionDebugError: RagEndpointError | null;
  projectStatuses: RagIngestionProjectStatus[];
  projectStatusesError: RagEndpointError | null;

  // Collections
  collections: RagCollectionListResponse | null;
  collectionsError: RagEndpointError | null;

  // Search
  searchResults: RagSearchResponse | null;
  searchError: RagEndpointError | null;
  searchLoading: boolean;

  // Embedding smoke test
  embeddingResult: RagEmbeddingSmokeTestResponse | null;
  embeddingError: string | null;
  embeddingLoading: boolean;

  // Chat test
  chatResult: RagChatTestResponse | null;
  chatError: string | null;
  chatLoading: boolean;

  // Selection
  selectedProjectId: string | null;

  // Refresh
  refreshing: boolean;
  lastUpdated: number | null;
 }
 
 // ── Gateway Settings Types ──────────────────────────────────────────────
 
 export interface PromptTemplate {
   id: string;
   name: string;
   description?: string;
   system_prompt: string;
   instruction_prompt: string;
   is_builtin: boolean;
   is_active: boolean;
   created_at?: string;
   updated_at?: string;
   recommended_settings?: Record<string, unknown>;
 }
 
 export interface GatewaySettings {
   active_prompt_template?: string;
   default_model?: string;
   max_tokens?: number;
   temperature?: number;
   stream_default?: boolean;
   rag_enabled_default?: boolean;
   default_rag_project?: string;
   default_rag_collection?: string;
   rag_search_limit?: number;
 }
 
 export interface GatewaySettingsUpdate {
   active_prompt_template?: string;
   default_model?: string;
   max_tokens?: number;
   temperature?: number;
   stream_default?: boolean;
   rag_enabled_default?: boolean;
   default_rag_project?: string;
   default_rag_collection?: string;
   rag_search_limit?: number;
 }
 
 export interface PromptTemplateCreateRequest {
   name: string;
   description?: string;
   system_prompt: string;
   instruction_prompt: string;
 }
 
 export interface PromptTemplateListResponse {
   templates: PromptTemplate[];
 }
