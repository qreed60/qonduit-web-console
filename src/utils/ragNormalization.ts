/**
 * Shared RAG normalization utilities.
 *
 * Provides a single source of truth for:
 * - Resolving "exists" across multiple possible backend signals
 * - Normalizing any raw project entry to a common shape
 * - Deriving user-friendly display labels from raw project names
 */

// ── Known project → display label mapping ────────────────────────────────────

export const COLLECTION_LABEL_MAP: Record<string, string> = {
  default: 'Default',
  'android-qonduit': 'Android Qonduit',
  chatgpt: 'ChatGPT',
  checkbook: 'Checkbook',
  work: 'Work',
};

/**
 * Derive a user-friendly display label from a raw project name.
 * Falls back to the raw name (title-cased) when no mapping exists.
 */
export function friendlyLabel(projectId: string): string {
  if (projectId in COLLECTION_LABEL_MAP) {
    return COLLECTION_LABEL_MAP[projectId];
  }
  // Title-case fallback: "my-project" → "My Project"
  return projectId
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// ── Unified exists resolution ────────────────────────────────────────────────

/**
 * Resolve "exists" from multiple possible backend signals.
 *
 * Priority order:
 * 1. exists_in_qdrant (registry-specific)
 * 2. exists (summary/detail)
 * 3. points_count > 0
 * 4. qdrant_collection truthy
 * 5. false (default)
 */
export function resolveExists(raw: {
  exists_in_qdrant?: unknown;
  exists?: unknown;
  points_count?: number;
  vectors_count?: number;
  qdrant_collection?: string;
}): boolean {
  // 1. Explicit exists_in_qdrant
  if (raw.exists_in_qdrant === true) return true;
  if (raw.exists_in_qdrant === false) return false;

  // 2. Explicit exists
  if (raw.exists === true) return true;
  if (raw.exists === false) return false;

  // 3. Non-zero counts
  if ((raw.points_count ?? 0) > 0) return true;
  if ((raw.vectors_count ?? 0) > 0) return true;

  // 4. Collection name present
  if (raw.qdrant_collection && typeof raw.qdrant_collection === 'string' && raw.qdrant_collection.length > 0) {
    return true;
  }

  // 5. Default
  return false;
}

// ── Normalized project shape ─────────────────────────────────────────────────

export interface NormalizedRagProject {
  project_id: string;
  qdrant_collection: string;
  exists: boolean;
  points_count: number;
  vectors_count: number;
  status?: string;
  error?: string | null;
  exists_in_qdrant?: boolean;
  discovered?: boolean;
  display_name?: string;
}

/**
 * Normalize any raw project entry to the shared shape.
 *
 * Accepts objects from:
 * - GET /v1/rag/projects (RagProjectSummary shape)
 * - Registry projects (RagRegistryProject shape)
 * - Any other object with project_id
 */
export function normalizeRagProject(raw: unknown): NormalizedRagProject {
  if (!raw || typeof raw !== 'object') {
    return {
      project_id: 'unknown',
      qdrant_collection: '',
      exists: false,
      points_count: 0,
      vectors_count: 0,
    };
  }

  const o = raw as Record<string, unknown>;

  const projectId = typeof o.project_id === 'string' ? o.project_id : 'unknown';
  const qdrantCollection = typeof o.qdrant_collection === 'string' ? o.qdrant_collection : '';
  const pointsCount = typeof o.points_count === 'number' ? o.points_count : 0;
  const vectorsCount = typeof o.vectors_count === 'number' ? o.vectors_count : 0;

  return {
    project_id: projectId,
    qdrant_collection: qdrantCollection,
    exists: resolveExists({
      exists_in_qdrant: o.exists_in_qdrant,
      exists: o.exists,
      points_count: pointsCount,
      vectors_count: vectorsCount,
      qdrant_collection: qdrantCollection,
    }),
    points_count: pointsCount,
    vectors_count: vectorsCount,
    status: typeof o.status === 'string' ? o.status : undefined,
    error: typeof o.error === 'string' ? o.error : null,
    exists_in_qdrant: o.exists_in_qdrant === true,
    discovered: o.discovered === true,
    display_name: typeof o.display_name === 'string' ? o.display_name : undefined,
  };
}
