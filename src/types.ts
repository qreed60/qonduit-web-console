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

export type Page = 'dashboard' | 'chat' | 'models' | 'router' | 'diagnostics' | 'rag' | 'settings';

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
  memory_total_human?: string;
  memory_used_human?: string;
  memory_free_human?: string;
  /** Legacy field aliases occasionally returned by older router builds. */
  total_memory_human?: string;
  used_memory_human?: string;
  free_memory_human?: string;
}

/**
 * Full GPU/VRAM status from GET /api/v1/qonduit-router/gpu.
 */
export interface GpuStatus {
  ok: boolean;
  gpus: GpuInfo[];
  excluded_gpus?: GpuInfo[];
  usable_gpus?: GpuInfo[];
  inference_gpus?: GpuInfo[];
  memory_total_mib: number;
  memory_used_mib: number;
  memory_free_mib: number;
  memory_total_human: string;
  memory_used_human: string;
  memory_free_human: string;
  /** Legacy field aliases occasionally returned by older router builds. */
  total_memory_human?: string;
  used_memory_human?: string;
  free_memory_human?: string;
}

export type RouterSlotStatus = 'running' | 'stopped' | 'starting' | 'stopping' | 'error' | 'unknown';

/**
 * Multi-slot router slot from GET /api/v1/qonduit-router/slots.
 */
export interface RouterSlot {
  slot_id: string;
  name?: string;
  status?: RouterSlotStatus | string;
  running?: boolean;
  ready?: boolean;
  model?: string;
  model_path?: string;
  container_name?: string;
  openai_base?: string;
  host?: string;
  host_port?: number | string;
  port?: number | string;
  context_size?: number;
  n_ctx?: number;
  parallel_slots?: number;
  cache_type_k?: string;
  cache_type_v?: string;
  gpu_devices?: string | number[] | GpuInfo[];
  effective_gpu_devices?: string | number[] | GpuInfo[];
  tensor_split?: string | number[];
  embeddings?: boolean;
  extra_args?: string | string[];
  batch_size?: number;
  ubatch_size?: number;
  last_error?: string | null;
  [key: string]: unknown;
}

/**
 * OpenAI-compatible endpoint exposed by a router slot.
 */
export interface RouterEndpoint {
  slot_id: string;
  name?: string;
  openai_base: string;
  status?: RouterSlotStatus | string;
  running?: boolean;
  ready?: boolean;
  model?: string;
  container_name?: string;
  [key: string]: unknown;
}

export interface RouterSlotsResponse {
  ok?: boolean;
  slots: RouterSlot[];
  [key: string]: unknown;
}

export interface RouterEndpointsResponse {
  ok?: boolean;
  endpoints: RouterEndpoint[];
  [key: string]: unknown;
}

export interface RouterPreflightRequest {
  slot_id?: string;
  model?: string;
  model_path?: string;
  context_size?: number;
  n_ctx?: number;
  parallel_slots?: number;
  cache_type_k?: string;
  cache_type_v?: string;
  gpu_devices?: string | number[] | GpuInfo[];
  tensor_split?: string | number[];
  embeddings?: boolean;
  host_port?: number | string;
  container_name?: string;
  extra_args?: string | string[];
  batch_size?: number;
  ubatch_size?: number;
  [key: string]: unknown;
}

export interface RouterSlotUpdateRequest {
  model?: string;
  context_size?: number;
  parallel_slots?: number;
  cache_type_k?: string;
  cache_type_v?: string;
  gpu_devices?: string | number[] | GpuInfo[];
  tensor_split?: string | number[] | null;
  embeddings?: boolean;
  host_port?: number | string;
  container_name?: string;
  extra_args?: string | string[];
  batch_size?: number;
  ubatch_size?: number;
}

export interface RouterPreflightCheck {
  name: string;
  ok: boolean;
  message?: string;
  details?: unknown;
  [key: string]: unknown;
}

export interface RouterPreflightResponse {
  ok: boolean;
  slot_id?: string;
  message?: string;
  checks?: RouterPreflightCheck[];
  warnings?: string[];
  errors?: string[];
  request?: RouterPreflightRequest;
  // Tensor split fields from backend
  requested_tensor_split?: string | null;
  tensor_split?: string | null;
  tensor_split_valid?: boolean | null;
  tensor_split_entry_count?: number | null;
  effective_gpu_count?: number | null;
  effective_gpu_devices?: string | number[] | null;
  launch_args_preview?: string | null;
  suggested_tensor_splits?: {
     even?: string | null;
     free_vram_weighted_raw?: string | null;
     free_vram_weighted_normalized?: string | null;
   } | null;
   effective_context_per_parallel_slot?: number | null;
   kv_cache_estimate?: KVCacheEstimate | null;
   batch_size?: number;
   ubatch_size?: number;
   [key: string]: unknown;
 }
 
 export interface KVCacheEstimate {
   ok: boolean;
   estimate_confidence?: string;
   context_size: number;
   parallel_slots: number;
   effective_context_per_parallel_slot: number;
   cache_type_k: string;
   cache_type_v: string;
   baseline_cache_type_k: string;
   baseline_cache_type_v: string;
   estimated_kv_cache_mib: number;
   estimated_kv_cache_f16_mib: number;
   estimated_savings_vs_f16_mib: number;
   estimated_savings_vs_f16_percent: number;
 }
 
 export interface RouterSlotOptions {
    ok: boolean;
    source: 'api' | 'fallback';
    parallel: {
      field: string;
      default: number;
      min: number;
      max: number;
      preferred_flag: string;
      detected_flag: string;
      fallback_flags: string[];
      context_semantics?: string;
    };
    cache_types: {
      allowed: string[];
      default_k: string;
      default_v: string;
      cache_type_k_flag: string;
      cache_type_v_flag: string;
    };
    batch?: {
      batch_size_default: number;
      ubatch_size_default: number;
      batch_size_options: number[];
      ubatch_size_options: number[];
      batch_size_flag: string;
      ubatch_size_flag: string;
    };
  }

export interface RouterSlotActionResponse {
  ok: boolean;
  slot_id?: string;
  action?: 'launch' | 'stop' | 'restart' | string;
  message?: string;
  [key: string]: unknown;
}

export interface RouterSlotLogsResponse {
  ok?: boolean;
  slot_id?: string;
  logs: string[];
  [key: string]: unknown;
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
    active_prompt_template_id?: string;
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
    active_prompt_template_id?: string;
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
  
  // ── RAG Document Upload Types ────────────────────────────────────────────────
  
  export interface RagDocumentUploadResponse {
    ok: boolean;
    document_id: string;
    document_name: string;
    file_type?: string;
    chunks_created?: number;
    message?: string;
    error?: string | null;
  }
  
  export interface RagTextDocumentCreateRequest {
    document_name: string;
    content: string;
    collection?: string;
    metadata?: Record<string, unknown>;
  }
  
  export interface RagTextDocumentCreateResponse {
    ok: boolean;
    document_id: string;
    document_name: string;
    chunks_created?: number;
    message?: string;
    error?: string | null;
  }
  
  export interface RagDocumentDeleteResponse {
    ok: boolean;
    document_id: string;
    message?: string;
    error?: string | null;
  }
  
  export interface RagDocumentReingestResponse {
    ok: boolean;
    document_id: string;
    message?: string;
    chunks_created?: number;
    error?: string | null;
  }
  
  export interface RagDocumentSourceMetadata {
    [key: string]: unknown;
  }
  
  export interface RagDocumentSourceResponse {
    ok: boolean;
    document_id: string;
    document_name: string;
    source?: string;
    source_type?: string;
    file_type?: string;
    parser?: string;
    collection?: string;
    warnings?: string[];
    metadata?: RagDocumentSourceMetadata;
    text_preview?: string;
    text_full?: string;
    error?: string | null;
  }
  
  // ── Chat Attachment Types ────────────────────────────────────────────────────
  
  export type ChatAttachmentMode = 'chat_context_only' | 'save_to_rag' | 'save_to_rag_only';
  
  export interface ChatAttachment {
    id: string;
    file: File;
    name: string;
    size: number;
    type: string;
    mode: ChatAttachmentMode;
    projectId?: string;
    collection?: string;
    contentBase64?: string;
  }
  
  export interface ChatAttachmentPayload {
    name: string;
    mime_type: string;
    content_base64: string;
    collection?: string;
    mode: ChatAttachmentMode;
    project_id?: string;
    metadata?: Record<string, unknown>;
  }
  
  export interface ChatAttachmentDiagnostics {
     processed?: boolean;
     tokens_approximate?: number;
     error?: string | null;
     [key: string]: unknown;
   }
 
   // ── RAG Project Registry Types ───────────────────────────────────────────────
 
   /** Individual project in the Registry API response */
   export interface RagRegistryProject {
     project_id: string;
     display_name: string;
     description: string | null;
     qdrant_collection: string;
     default_collection: string;
     created_at: string | null;
     updated_at: string | null;
     collections_count: number;
     exists_in_qdrant: boolean;
     points_count: number;
     discovered: boolean;
     error: string | null;
   }
 
   /** POST /v1/rag/projects request body */
   export interface RagCreateProjectRequest {
     project_id?: string;
     display_name: string;
     description?: string;
     default_collection?: string;
     ensure_qdrant?: boolean;
   }
 
   /** POST /v1/rag/projects response (same shape as RagRegistryProject + message) */
   export interface RagCreateProjectResponse {
     ok: boolean;
     project_id: string;
     display_name: string;
     description: string | null;
     qdrant_collection: string;
     default_collection: string;
     created_at: string | null;
     updated_at: string | null;
     collections_count: number;
     exists_in_qdrant: boolean;
     points_count: number;
     discovered: boolean;
     error: string | null;
     message?: string;
   }
 
   /** PATCH /v1/rag/projects/{project_id} request body */
   export interface RagUpdateProjectRequest {
     display_name?: string;
     description?: string;
     default_collection?: string;
   }
 
   // ── RAG Logical Collection Registry Types ────────────────────────────────────
 
   /** Logical collection object */
   export interface RagLogicalCollection {
     name: string;
     display_name: string | null;
     description: string | null;
     created_at: string | null;
     updated_at: string | null;
     metadata: Record<string, unknown>;
     document_count: number | null;
     chunk_count: number | null;
     counts_are_estimated: boolean;
   }
 
   /** POST /v1/rag/projects/{project_id}/collections request body */
   export interface RagCreateCollectionRequest {
     name: string;
     display_name?: string;
     description?: string;
     metadata?: Record<string, unknown>;
   }
 
   /** PATCH /v1/rag/projects/{project_id}/collections/{name} request body */
    export interface RagUpdateCollectionRequest {
      display_name?: string;
      description?: string;
      metadata?: Record<string, unknown>;
    }
 
    // ── Tool Registry Types ──────────────────────────────────────────────
 
    export type ToolCategory =
      | 'rag'
      | 'filesystem'
      | 'execution'
      | 'homeassistant'
      | 'web'
      | 'system'
      | 'utility';
 
    export type ToolStatus = 'available' | 'unavailable' | 'error' | 'unknown';
 
    export type ConfirmationMode = 'always' | 'risky-only' | 'never';
 
    export interface ToolEntry {
      name: string;
      displayName: string;
      description: string;
      enabled: boolean;
      requiresConfirmation: boolean;
      category: ToolCategory;
      backendAvailable: boolean;
      backendProvider: 'Gateway' | 'Router' | 'External';
      lastError: string | null;
    }
 
    export interface ToolSettings {
      global: Record<string, boolean>;
      perModel?: Record<string, Record<string, boolean>>;
      confirmationMode: ConfirmationMode;
    }
 
    export const TOOL_REGISTRY: Record<string, ToolEntry> = {
      rag_search: {
        name: 'rag_search',
        displayName: 'RAG Knowledge Search',
        description: 'Search indexed knowledge bases for relevant information',
        enabled: true,
        requiresConfirmation: false,
        category: 'rag',
        backendAvailable: false,
        backendProvider: 'Gateway',
        lastError: null,
      },
      file_read: {
        name: 'file_read',
        displayName: 'File Read',
        description: 'Read the contents of a file by path',
        enabled: true,
        requiresConfirmation: false,
        category: 'filesystem',
        backendAvailable: false,
        backendProvider: 'Gateway',
        lastError: null,
      },
      shell_exec: {
        name: 'shell_exec',
        displayName: 'Shell Command',
        description: 'Execute a shell command on the server',
        enabled: false,
        requiresConfirmation: true,
        category: 'execution',
        backendAvailable: false,
        backendProvider: 'Gateway',
        lastError: null,
      },
      model_info: {
        name: 'model_info',
        displayName: 'Model Info',
        description: 'Query information about available models',
        enabled: true,
        requiresConfirmation: false,
        category: 'system',
        backendAvailable: false,
        backendProvider: 'Gateway',
        lastError: null,
      },
      collection_list: {
        name: 'collection_list',
        displayName: 'Collection List',
        description: 'List available RAG collections',
        enabled: true,
        requiresConfirmation: false,
        category: 'rag',
        backendAvailable: false,
        backendProvider: 'Gateway',
        lastError: null,
      },
    };
 
    export const DEFAULT_TOOL_SETTINGS: ToolSettings = {
      global: Object.fromEntries(
        Object.values(TOOL_REGISTRY).map(t => [t.name, t.enabled])
      ),
      confirmationMode: 'risky-only',
    };
