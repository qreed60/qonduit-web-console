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
