import { apiPath } from '../config/endpoints';
import {
  RagRegistryProject,
  RagCreateProjectRequest,
  RagCreateProjectResponse,
  RagUpdateProjectRequest,
  RagLogicalCollection,
  RagCreateCollectionRequest,
  RagUpdateCollectionRequest,
} from '../types';
import { safeFetchJsonWithPreview, makeRagEndpointError } from './fetchHelpers';
import { normalizeRagProject, friendlyLabel } from '../utils/ragNormalization';

// ── Project CRUD ─────────────────────────────────────────────────────────────

/** GET /v1/rag/projects — fetch all projects from the registry */
export async function fetchRegistryProjects(): Promise<RagRegistryProject[]> {
  const url = apiPath('gateway', '/v1/rag/projects');
  const { data } = await safeFetchJsonWithPreview(url, undefined, 'Registry /v1/rag/projects');
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.projects)) return [];
  return obj.projects.map(normalizeRegistryProject);
}

/** POST /v1/rag/projects — create a new project */
export async function createRegistryProject(body: RagCreateProjectRequest): Promise<RagCreateProjectResponse> {
  const url = apiPath('gateway', '/v1/rag/projects');
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const contentType = response.headers.get('content-type') || '';
    let message = `HTTP ${response.status}: ${response.statusText}`;

    if (contentType.includes('application/json')) {
      try {
        const errorData = JSON.parse(await response.text()) as Record<string, unknown>;
        const msg = errorData.message || errorData.error || message;
        if (typeof msg === 'string') message = msg;
      } catch {
        // Keep default message
      }
    } else {
      const text = await response.text().catch(() => '');
      throw makeRagEndpointError({
        url, status: response.status, statusText: response.statusText,
        bodyPreview: text, message: `Registry API returned ${contentType}`,
        timestamp: Date.now(),
      });
    }

    throw makeRagEndpointError({
      url, status: response.status, statusText: response.statusText,
      message, timestamp: Date.now(),
    });
  }

  const text = await response.text();
  return JSON.parse(text) as RagCreateProjectResponse;
}

/** PATCH /v1/rag/projects/{project_id} — update project metadata */
export async function updateRegistryProject(
  projectId: string,
  body: RagUpdateProjectRequest
): Promise<RagRegistryProject> {
  const url = apiPath('gateway', `/v1/rag/projects/${encodeURIComponent(projectId)}`);
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw makeRagEndpointError({
      url, status: response.status, statusText: response.statusText,
      bodyPreview: text, message: `Failed to update project`,
      timestamp: Date.now(),
    });
  }

  return response.json() as Promise<RagRegistryProject>;
}

/** DELETE /v1/rag/projects/{project_id} — delete project from registry */
export async function deleteRegistryProject(projectId: string): Promise<{ ok: boolean; message?: string }> {
  const url = apiPath('gateway', `/v1/rag/projects/${encodeURIComponent(projectId)}`);
  const response = await fetch(url, { method: 'DELETE' });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw makeRagEndpointError({
      url, status: response.status, statusText: response.statusText,
      bodyPreview: text, message: `Failed to delete project`,
      timestamp: Date.now(),
    });
  }

  return response.json() as Promise<{ ok: boolean; message?: string }>;
}

// ── Logical Collection CRUD ──────────────────────────────────────────────────

/** GET /v1/rag/projects/{project_id}/collections */
export async function fetchLogicalCollections(projectId: string): Promise<RagLogicalCollection[]> {
  const url = apiPath('gateway', `/v1/rag/projects/${encodeURIComponent(projectId)}/collections`);
  const { data } = await safeFetchJsonWithPreview(url, undefined, 'Registry collections');
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.collections)) return [];
  return obj.collections.map(normalizeLogicalCollection);
}

/** GET /v1/rag/projects/{project_id}/collections/{name} */
export async function fetchLogicalCollection(
  projectId: string,
  collectionName: string
): Promise<RagLogicalCollection> {
  const url = apiPath('gateway', `/v1/rag/projects/${encodeURIComponent(projectId)}/collections/${encodeURIComponent(collectionName)}`);
  const { data } = await safeFetchJsonWithPreview(url, undefined, `Registry collection ${collectionName}`);
  return normalizeLogicalCollection(data);
}

/** POST /v1/rag/projects/{project_id}/collections */
export async function createLogicalCollection(
  projectId: string,
  body: RagCreateCollectionRequest
): Promise<RagLogicalCollection> {
  const url = apiPath('gateway', `/v1/rag/projects/${encodeURIComponent(projectId)}/collections`);
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw makeRagEndpointError({
      url, status: response.status, statusText: response.statusText,
      bodyPreview: text, message: `Failed to create collection`,
      timestamp: Date.now(),
    });
  }

  return response.json() as Promise<RagLogicalCollection>;
}

/** PATCH /v1/rag/projects/{project_id}/collections/{name} */
export async function updateLogicalCollection(
  projectId: string,
  collectionName: string,
  body: RagUpdateCollectionRequest
): Promise<RagLogicalCollection> {
  const url = apiPath('gateway', `/v1/rag/projects/${encodeURIComponent(projectId)}/collections/${encodeURIComponent(collectionName)}`);
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw makeRagEndpointError({
      url, status: response.status, statusText: response.statusText,
      bodyPreview: text, message: `Failed to update collection`,
      timestamp: Date.now(),
    });
  }

  return response.json() as Promise<RagLogicalCollection>;
}

/** DELETE /v1/rag/projects/{project_id}/collections/{name} */
export async function deleteLogicalCollection(
  projectId: string,
  collectionName: string
): Promise<{ ok: boolean; message?: string }> {
  const url = apiPath('gateway', `/v1/rag/projects/${encodeURIComponent(projectId)}/collections/${encodeURIComponent(collectionName)}`);
  const response = await fetch(url, { method: 'DELETE' });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw makeRagEndpointError({
      url, status: response.status, statusText: response.statusText,
      bodyPreview: text, message: `Failed to delete collection`,
      timestamp: Date.now(),
    });
  }

  return response.json() as Promise<{ ok: boolean; message?: string }>;
}

// ── Normalization helpers ────────────────────────────────────────────────────

function normalizeRegistryProject(raw: unknown): RagRegistryProject {
  if (!raw || typeof raw !== 'object') {
    return {
      project_id: 'unknown',
      display_name: 'Unknown',
      description: null,
      qdrant_collection: '',
      default_collection: 'default',
      created_at: null,
      updated_at: null,
      collections_count: 0,
      exists_in_qdrant: false,
      points_count: 0,
      discovered: false,
      error: null,
    };
  }
  const o = raw as Record<string, unknown>;

  // Use shared normalizer for exists resolution
  const normalized = normalizeRagProject(raw);

  const displayName =
    typeof o.display_name === 'string' && o.display_name
      ? o.display_name
      : friendlyLabel(typeof o.project_id === 'string' ? o.project_id : 'unknown');

  return {
     project_id: normalized.project_id,
     display_name: displayName,
     description: typeof o.description === 'string' ? o.description : null,
     qdrant_collection: normalized.qdrant_collection,
     default_collection: typeof o.default_collection === 'string' ? o.default_collection : 'default',
     created_at: typeof o.created_at === 'string' ? o.created_at : null,
     updated_at: typeof o.updated_at === 'string' ? o.updated_at : null,
     collections_count: typeof o.collections_count === 'number' ? o.collections_count : 0,
     exists_in_qdrant: normalized.exists_in_qdrant ?? false,
     points_count: normalized.points_count,
     discovered: normalized.discovered ?? false,
     error: normalized.error ?? null,
   };
}

function normalizeLogicalCollection(raw: unknown): RagLogicalCollection {
  if (!raw || typeof raw !== 'object') {
    return {
      name: '',
      display_name: null,
      description: null,
      created_at: null,
      updated_at: null,
      metadata: {},
      document_count: null,
      chunk_count: null,
      counts_are_estimated: false,
    };
  }
  const o = raw as Record<string, unknown>;
  return {
    name: typeof o.name === 'string' ? o.name : '',
    display_name: typeof o.display_name === 'string' && o.display_name ? o.display_name : null,
    description: typeof o.description === 'string' ? o.description : null,
    created_at: typeof o.created_at === 'string' ? o.created_at : null,
    updated_at: typeof o.updated_at === 'string' ? o.updated_at : null,
    metadata: o.metadata && typeof o.metadata === 'object' ? (o.metadata as Record<string, unknown>) : {},
    document_count: typeof o.document_count === 'number' ? o.document_count : null,
    chunk_count: typeof o.chunk_count === 'number' ? o.chunk_count : null,
    counts_are_estimated: o.counts_are_estimated === true,
  };
}
