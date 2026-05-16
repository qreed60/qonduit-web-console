import { RagProjectDetail, RagCollectionsResponse, RagCollectionInfo } from '../types';
import { friendlyLabel } from './ragNormalization';

export interface RagCollectionOption {
  name: string;
  label: string;
  displayLabel: string;
  source: 'logical' | 'detail' | 'both';
  point_count?: number;
  document_count?: number;
  chunk_count?: number;
  counts_are_estimated?: boolean;
  raw?: Record<string, unknown>;
}

/**
 * Build a merged, deduplicated list of RAG collection options.
 *
 * Priority:
 * 1. projectDetail.logical_collections (from GET /v1/rag/projects/{project_id})
 * 2. collectionsResponse.collections (from GET /v1/rag/projects/{project_id}/collections)
 *
 * Rules:
 * - Start with logical_collections names
 * - Add collection names from collections response that aren't already present
 * - Deduplicate by name
 * - Preserve order: logical_collections first, then extras from collections
 * - Accept names with underscores, hyphens, and normal text
 * - Do NOT filter out zero-count collections
 * - Do NOT filter out collections missing marker/detail rows
 * - If logical_collections is empty but collections has rows, show collections rows
 */
export function buildRagCollectionOptions(
  projectDetail: RagProjectDetail | null,
  collectionsResponse: RagCollectionsResponse | null
): RagCollectionOption[] {
  const logicalNames: string[] =
    projectDetail?.logical_collections && projectDetail.logical_collections.length > 0
      ? [...projectDetail.logical_collections]
      : [];

  const detailMap = new Map<string, RagCollectionInfo>();
  if (collectionsResponse?.collections) {
    for (const col of collectionsResponse.collections) {
      if (col.name) {
        detailMap.set(col.name, col);
      }
    }
  }

  // Build merged list
  const seen = new Set<string>();
  const result: RagCollectionOption[] = [];

  // Phase 1: logical_collections (primary source)
  for (const name of logicalNames) {
    if (seen.has(name)) continue;
    seen.add(name);

    const detail = detailMap.get(name);
      if (detail) {
        result.push({
          name,
          label: name,
          displayLabel: friendlyLabel(name),
          source: 'both',
          point_count: detail.point_count,
          counts_are_estimated: detail.counts_are_estimated,
          raw: detail as unknown as Record<string, unknown>,
         });
       } else {
         result.push({
           name,
           label: name,
           displayLabel: friendlyLabel(name),
           source: 'logical',
           raw: { projectDetail },
         });
       }
  }

  // Phase 2: extra names from collections response
  for (const [name, detail] of detailMap) {
    if (seen.has(name)) continue;
    seen.add(name);

    result.push({
        name,
        label: name,
        displayLabel: friendlyLabel(name),
        source: 'detail',
        point_count: detail.point_count,
        counts_are_estimated: detail.counts_are_estimated,
        raw: detail as unknown as Record<string, unknown>,
       });
  }

  return result;
}
