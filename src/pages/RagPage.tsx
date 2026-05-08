import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  getRagHealth,
  getRagProjects,
  getRagProjectDetail,
  getRagProjectStats,
  getRagCollections,
  getRagDocuments,
  getRagDocumentChunks,
  searchRagProject,
} from '../services/ragApi';
import { ENDPOINTS, getMode } from '../config/endpoints';
import {
  RagHealthResponse,
  RagProjectSummary,
  RagProjectDetail,
  RagProjectStats,
  RagCollectionsResponse,
  RagDocumentSummary,
  RagChunk,
  RagSearchResponseNew,
  RagEndpointError,
} from '../types';
import { RefreshCw, Loader2, Database } from 'lucide-react';
import RagHealthCard from '../components/RagHealthCard';
import RagProjectCard from '../components/RagProjectCard';
import RagProjectDetailPanel from '../components/RagProjectDetailPanel';
import RagCollectionsCard from '../components/RagCollectionsCard';
import RagDocumentsCard from '../components/RagDocumentsCard';
import RagChunkViewer from '../components/RagChunkViewer';
import RagDiagnosticSearchCard from '../components/RagDiagnosticSearchCard';

const RagPage: React.FC = () => {
  // ── State ──────────────────────────────────────────────────────────────────

  // Health
  const [health, setHealth] = useState<RagHealthResponse | null>(null);
  const [healthError, setHealthError] = useState<RagEndpointError | null>(null);
  const [healthLastChecked, setHealthLastChecked] = useState<number | null>(Date.now());

  // Projects
  const [projects, setProjects] = useState<RagProjectSummary[]>([]);
  const [projectsError, setProjectsError] = useState<RagEndpointError | null>(null);

  // Project detail
  const [projectDetail, setProjectDetail] = useState<RagProjectDetail | null>(null);
  const [projectDetailError, setProjectDetailError] = useState<RagEndpointError | null>(null);
  const [projectStats, setProjectStats] = useState<RagProjectStats | null>(null);
  const [projectStatsError, setProjectStatsError] = useState<RagEndpointError | null>(null);

  // Collections
  const [collections, setCollections] = useState<RagCollectionsResponse | null>(null);
  const [collectionsError, setCollectionsError] = useState<RagEndpointError | null>(null);

  // Documents
  const [documents, setDocuments] = useState<RagDocumentSummary[]>([]);
  const [documentsError, setDocumentsError] = useState<RagEndpointError | null>(null);

  // Chunks
  const [chunks, setChunks] = useState<RagChunk[]>([]);
  const [chunksError, setChunksError] = useState<RagEndpointError | null>(null);
  const [chunksLoading, setChunksLoading] = useState(false);

  // Search
  const [searchResults, setSearchResults] = useState<RagSearchResponseNew | null>(null);
  const [searchError, setSearchError] = useState<RagEndpointError | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // Selection
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);

  // Refresh
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  // Refs
  const inFlightRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const gatewayUrl = ENDPOINTS.gateway[getMode()];

  // ── Helpers ────────────────────────────────────────────────────────────────

  const formatTimeAgo = (ts: number | null) => {
    if (!ts) return null;
    const diff = Date.now() - ts;
    const secs = Math.floor(diff / 1000);
    if (secs < 10) return 'just now';
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    return `${mins}m ago`;
  };

  // ── Fetch functions ────────────────────────────────────────────────────────

  const fetchHealth = useCallback(async () => {
    try {
      const result = await getRagHealth();
      setHealth(result);
      setHealthError(null);
      setHealthLastChecked(Date.now());
    } catch (err) {
      setHealthError(err instanceof Error ? {
        url: `${gatewayUrl}/v1/rag/health`,
        message: err.message,
        timestamp: Date.now(),
      } : null);
    }
  }, [gatewayUrl]);

  const fetchProjects = useCallback(async () => {
    try {
      const result = await getRagProjects();
      setProjects(result.projects);
      setProjectsError(null);
    } catch (err) {
      setProjectsError(err instanceof Error ? {
        url: `${gatewayUrl}/v1/rag/projects`,
        message: err.message,
        timestamp: Date.now(),
      } : null);
    }
  }, [gatewayUrl]);

  const fetchProjectDetail = useCallback(async (projectId: string) => {
    try {
      const result = await getRagProjectDetail(projectId);
      setProjectDetail(result);
      setProjectDetailError(null);
    } catch (err) {
      setProjectDetailError(err instanceof Error ? {
        url: `${gatewayUrl}/v1/rag/projects/${projectId}`,
        message: err.message,
        timestamp: Date.now(),
      } : null);
    }
  }, [gatewayUrl]);

  const fetchProjectStats = useCallback(async (projectId: string) => {
    try {
      const result = await getRagProjectStats(projectId);
      setProjectStats(result);
      setProjectStatsError(null);
    } catch (err) {
      setProjectStatsError(err instanceof Error ? {
        url: `${gatewayUrl}/v1/rag/projects/${projectId}/stats`,
        message: err.message,
        timestamp: Date.now(),
      } : null);
    }
  }, [gatewayUrl]);

  const fetchCollections = useCallback(async (projectId: string) => {
    try {
      const result = await getRagCollections(projectId);
      setCollections(result);
      setCollectionsError(null);
    } catch (err) {
      setCollectionsError(err instanceof Error ? {
        url: `${gatewayUrl}/v1/rag/projects/${projectId}/collections`,
        message: err.message,
        timestamp: Date.now(),
      } : null);
    }
  }, [gatewayUrl]);

  const fetchDocuments = useCallback(async (projectId: string) => {
    try {
      const result = await getRagDocuments(projectId);
      setDocuments(result.documents);
      setDocumentsError(null);
    } catch (err) {
      setDocumentsError(err instanceof Error ? {
        url: `${gatewayUrl}/v1/rag/projects/${projectId}/documents`,
        message: err.message,
        timestamp: Date.now(),
      } : null);
    }
  }, [gatewayUrl]);

  const fetchChunks = useCallback(async (projectId: string, documentId: string) => {
    setChunksLoading(true);
    try {
      const result = await getRagDocumentChunks(projectId, documentId);
      setChunks(result.chunks);
      setChunksError(null);
    } catch (err) {
      setChunksError(err instanceof Error ? {
        url: `${gatewayUrl}/v1/rag/projects/${projectId}/documents/${documentId}/chunks`,
        message: err.message,
        timestamp: Date.now(),
      } : null);
    } finally {
      setChunksLoading(false);
    }
  }, [gatewayUrl]);

  const fetchAllData = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setRefreshing(true);

    // Abort any in-flight requests
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    try {
      await Promise.allSettled([
        fetchHealth(),
        fetchProjects(),
      ]);

      if (selectedProjectId) {
        await Promise.allSettled([
          fetchProjectDetail(selectedProjectId),
          fetchProjectStats(selectedProjectId),
          fetchCollections(selectedProjectId),
          fetchDocuments(selectedProjectId),
        ]);
      }

      setLastUpdated(Date.now());
    } finally {
      setRefreshing(false);
      inFlightRef.current = false;
    }
  }, [fetchHealth, fetchProjects, fetchProjectDetail, fetchProjectStats, fetchCollections, fetchDocuments, selectedProjectId]);

  // ── Initial load ───────────────────────────────────────────────────────────

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, []);

  // ── Event handlers ─────────────────────────────────────────────────────────

  const handleSelectProject = useCallback((projectId: string) => {
    setSelectedProjectId(prev => prev === projectId ? null : projectId);
    // Reset detail state when switching
    setProjectDetail(null);
    setProjectStats(null);
    setCollections(null);
    setDocuments([]);
    setSearchResults(null);
    setChunks([]);
    setSelectedDocumentId(null);
  }, []);

  const handleSelectDocument = useCallback((documentId: string) => {
    setSelectedDocumentId(prev => prev === documentId ? null : documentId);
    if (selectedProjectId && documentId) {
      fetchChunks(selectedProjectId, documentId);
    }
  }, [selectedProjectId, fetchChunks]);

  const handleSearch = useCallback(async (query: string, limit: number, collection?: string | null) => {
    if (!selectedProjectId) return;
    setSearchLoading(true);
    setSearchError(null);
    try {
      const result = await searchRagProject(selectedProjectId, query, collection, limit);
      setSearchResults(result);
    } catch (err) {
      setSearchError(err instanceof Error ? {
        url: `${gatewayUrl}/v1/rag/projects/${selectedProjectId}/search`,
        message: err.message,
        timestamp: Date.now(),
      } : null);
    } finally {
      setSearchLoading(false);
    }
  }, [selectedProjectId, gatewayUrl]);

  // ── Derived state ──────────────────────────────────────────────────────────

  const availableCollections = collections?.collections.map(c => c.name) || [];

  const selectedDocument = documents.find(d => d.document_id === selectedDocumentId) || null;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-accent-primary" />
            <h1 className="text-xl font-bold bg-gradient-to-r from-accent-primary to-accent-tertiary bg-clip-text text-transparent">
              RAG Browser
            </h1>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            Memory Gateway Phase 1 RAG Read API — browse projects, documents, chunks, and search
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && !refreshing && (
            <span className="text-[10px] text-text-tertiary">
              Updated {formatTimeAgo(lastUpdated)}
            </span>
          )}
          <button
            onClick={fetchAllData}
            disabled={refreshing}
            className="p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-all duration-200 disabled:opacity-50"
            title="Refresh all RAG data"
          >
            {refreshing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Top row: Health */}
          <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
            <RagHealthCard
              health={health}
              healthError={healthError}
              healthLastChecked={healthLastChecked}
              gatewayUrl={gatewayUrl}
              onRefresh={fetchAllData}
              refreshing={refreshing}
            />
          </div>

          {/* Projects Overview */}
          <div>
            <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
              <Database className="w-4 h-4 text-accent-primary" />
              Projects
            </h2>
            {projectsError ? (
              <div className="flex items-center gap-2 text-xs text-status-error">
                <span>Unable to fetch projects: {projectsError.message}</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                {projects.map(project => (
                  <RagProjectCard
                    key={project.project_id}
                    project={project}
                    isSelected={selectedProjectId === project.project_id}
                    onSelect={handleSelectProject}
                    onRefresh={fetchAllData}
                    refreshing={refreshing}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Detail area: Project detail + Collections + Documents + Search */}
          {selectedProjectId && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Project detail */}
              <div className="lg:col-span-1 space-y-6">
                <RagProjectDetailPanel
                  detail={projectDetail}
                  stats={projectStats}
                  detailError={projectDetailError}
                  statsError={projectStatsError}
                />
                <RagCollectionsCard
                  collections={collections}
                  collectionsError={collectionsError}
                  projectId={selectedProjectId}
                />
              </div>

              {/* Right: Documents + Search */}
              <div className="lg:col-span-2 space-y-6">
                <RagDocumentsCard
                  documents={documents}
                  documentsError={documentsError}
                  projectId={selectedProjectId}
                  selectedDocumentId={selectedDocumentId}
                  onSelectDocument={handleSelectDocument}
                  loading={false}
                  onRefresh={() => fetchDocuments(selectedProjectId)}
                  refreshing={refreshing}
                />

                {/* Chunk Viewer */}
                {selectedDocumentId && selectedDocument && (
                  <RagChunkViewer
                    chunks={chunks}
                    chunksError={chunksError}
                    chunksLoading={chunksLoading}
                    documentName={selectedDocument.document_name}
                  />
                )}

                <RagDiagnosticSearchCard
                  projectId={selectedProjectId}
                  availableCollections={availableCollections}
                  searchResults={searchResults}
                  searchError={searchError}
                  searchLoading={searchLoading}
                  onSearch={handleSearch}
                />
              </div>
            </div>
          )}

          {/* No project selected message */}
          {!selectedProjectId && (
            <div className="bg-bg-card rounded-xl border border-border-primary p-8 text-center">
              <Database className="w-10 h-10 mx-auto text-text-tertiary/30 mb-3" />
              <p className="text-sm text-text-secondary">
                Select a project above to view details, documents, chunks, and search.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RagPage;
