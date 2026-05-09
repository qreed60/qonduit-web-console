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
import { RefreshCw, Loader2, Database, Layers, FileText } from 'lucide-react';
import RagHealthCard from '../components/RagHealthCard';
import RagProjectCard from '../components/RagProjectCard';
import RagProjectDetailPanel from '../components/RagProjectDetailPanel';
import RagCollectionsCard from '../components/RagCollectionsCard';
import RagDocumentsCard from '../components/RagDocumentsCard';
import RagChunkViewer from '../components/RagChunkViewer';
import RagDiagnosticSearchCard from '../components/RagDiagnosticSearchCard';
import MobileCollapsibleCard from '../components/MobileCollapsibleCard';

const RagPage: React.FC = () => {
  // ── State ──────────────────────────────────────────────────────────────────

  // Health
  const [health, setHealth] = useState<RagHealthResponse | null>(null);
  const [healthError, setHealthError] = useState<RagEndpointError | null>(null);
  const [healthLastChecked, setHealthLastChecked] = useState<number | null>(Date.now());

  // Projects
  const [projects, setProjects] = useState<RagProjectSummary[]>([]);
  const [projectsError, setProjectsError] = useState<RagEndpointError | null>(null);
  const [projectsFetched, setProjectsFetched] = useState(false);

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
       console.error('[RAG] health error', err);
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
         setProjectsFetched(true);
         setProjectsError(null);
       } catch (err) {
         console.error('[RAG] projects error', err);
         setProjectsError(err instanceof Error ? {
           url: `${gatewayUrl}/v1/rag/projects`,
           message: err.message,
           timestamp: Date.now(),
         } : null);
         setProjectsFetched(true);
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

  // ── Initial load: fetch health and projects independently ──────────────────
  
      useEffect(() => {
        fetchHealth();
        fetchProjects();
      }, [fetchHealth, fetchProjects, gatewayUrl]);
  
    // ── Auto-select first existing project ─────────────────────────────────────
  
      useEffect(() => {
        if (!selectedProjectId && projects.length > 0 && projectsFetched) {
          const firstExisting = projects.find(p => p.exists);
          const firstProject = projects[0];
          const target = firstExisting || firstProject;
          if (target) {
            setSelectedProjectId(target.project_id);
          } else {
            console.warn('[RAG] auto-select failed: no valid project found');
          }
        }
      }, [projects, projectsFetched, selectedProjectId]);
  
    // ── Fetch detail when project is selected ──────────────────────────────────
  
    useEffect(() => {
      if (selectedProjectId) {
        fetchProjectDetail(selectedProjectId);
        fetchProjectStats(selectedProjectId);
        fetchCollections(selectedProjectId);
        fetchDocuments(selectedProjectId);
      }
    }, [selectedProjectId, fetchProjectDetail, fetchProjectStats, fetchCollections, fetchDocuments]);

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
 
   // Total points across all projects
     const totalPoints = projects.reduce((sum, p) => sum + (p.points_count || 0), 0);
   
     // Project detail metrics
     const detailPoints = projectStats?.points_count?.toString() || '0';
     const detailVectors = projectStats?.vectors_count?.toString() || '0';
     const detailIndexed = projectStats?.indexed_vectors_count?.toString() || '0';

  const selectedDocument = documents.find(d => d.document_id === selectedDocumentId) || null;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
      <div className="flex flex-col h-full bg-bg-primary">
        {/* Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-border-subtle flex items-center justify-between flex-shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-accent-primary flex-shrink-0" />
              <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-accent-primary to-accent-tertiary bg-clip-text text-transparent truncate">
                RAG Browser
              </h1>
            </div>
            <p className="text-xs text-text-secondary mt-0.5 hidden sm:block">
              Memory Gateway Phase 1 RAG Read API — browse projects, documents, chunks, and search
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 ml-3">
            {lastUpdated && !refreshing && (
              <span className="text-[10px] sm:text-xs text-text-tertiary hidden sm:inline">
                Updated {formatTimeAgo(lastUpdated)}
              </span>
            )}
            <button
              onClick={fetchAllData}
              disabled={refreshing}
              className="p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-all duration-200 disabled:opacity-50 min-h-[40px] min-w-[40px] flex items-center justify-center"
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
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
          <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
            {/* Debug info — hidden in production */}
             <div className="hidden bg-yellow-900/20 border border-yellow-700/30 rounded-xl p-3">
               <p className="text-[10px] text-yellow-400 font-mono">
                 projects.length: {projects.length} | projectsError: {projectsError?.message || 'none'} | projectsFetched: {projectsFetched ? 'yes' : 'no'} | selectedProjectId: {selectedProjectId || 'none'} | gatewayUrl: {gatewayUrl}
               </p>
             </div>
  
            {/* Top row: Health */}
            <div className="grid grid-cols-1 gap-4 sm:gap-6">
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
                  <MobileCollapsibleCard
                    title="Projects"
                    icon={<Database className="w-5 h-5 text-accent-primary" />}
                    statusBadge={
                      projects.length > 0 ? { status: 'online', label: `${projects.length} project${projects.length > 1 ? 's' : ''}` } :
                      { status: 'unknown', label: 'None' }
                    }
                    summaryText={
                      selectedProjectId ? `Selected: ${selectedProjectId}` :
                      projects.length > 0 ? 'Tap a project to select' :
                      'No projects'
                    }
                    metrics={projects.length > 0 ? [
                      { label: 'Total Points', value: totalPoints.toLocaleString() },
                    ] : undefined}
                    defaultExpanded={true}
                    defaultExpandedMobile={false}
                    localStorageKey="rag-projects"
                  >
                    {projectsError ? (
                      <div className="flex items-center gap-2 text-xs text-status-error">
                        <span>Unable to fetch projects: {projectsError.message}</span>
                        <span className="text-[10px] font-mono opacity-70">({gatewayUrl}/v1/rag/projects)</span>
                      </div>
                    ) : projectsFetched && projects.length === 0 ? (
                      <div className="text-center py-6">
                        <Database className="w-8 h-8 mx-auto text-text-tertiary/30 mb-2" />
                        <p className="text-sm text-text-secondary">No projects returned by the backend.</p>
                        <p className="text-xs text-text-tertiary mt-1">
                          Expected endpoint: <code className="font-mono">{gatewayUrl}/v1/rag/projects</code>
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
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
                  </MobileCollapsibleCard>
  
            {/* Detail area: Project detail + Collections + Documents + Search */}
             {selectedProjectId && (
                           <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                             {/* Left: Project detail + Collections */}
                             <div className="lg:col-span-1 space-y-4 sm:space-y-6">
                               <MobileCollapsibleCard
                                 title="Project Detail"
                                 icon={<Database className="w-5 h-5 text-accent-primary" />}
                                 statusBadge={projectDetail ? { status: 'online', label: 'Found' } : { status: 'offline', label: 'Not Found' }}
                                 summaryText={
                                   projectDetail ? `${projectDetail.project_id} — ${detailPoints} points, ${detailVectors} vectors` :
                                   'No detail data'
                                 }
                                 metrics={projectDetail ? [
                                   { label: 'Points', value: detailPoints },
                                   { label: 'Vectors', value: detailVectors },
                                   { label: 'Indexed', value: detailIndexed },
                                 ] : undefined}
                                 defaultExpanded={false}
                                 defaultExpandedMobile={false}
                                 localStorageKey="rag-detail"
                               >
                                 <RagProjectDetailPanel
                                   detail={projectDetail}
                                   stats={projectStats}
                                   detailError={projectDetailError}
                                   statsError={projectStatsError}
                                 />
                               </MobileCollapsibleCard>
                               <MobileCollapsibleCard
                                 title="Collections"
                                 icon={<Layers className="w-5 h-5 text-accent-secondary" />}
                                 statusBadge={
                                   collections?.collections && collections.collections.length > 0
                                     ? { status: 'online', label: `${collections.collections.length} collection${collections.collections.length > 1 ? 's' : ''}` }
                                     : { status: 'unknown', label: 'None' }
                                 }
                                 summaryText={
                                   collections?.collections && collections.collections.length > 0
                                     ? `${collections.collections.length} collections`
                                     : 'No collections'
                                 }
                                 defaultExpanded={false}
                                 defaultExpandedMobile={false}
                                 localStorageKey="rag-collections"
                               >
                                 <RagCollectionsCard
                                    collections={collections}
                                    collectionsError={collectionsError}
                                    projectId={selectedProjectId}
                                    projectDetail={projectDetail}
                                  />
                               </MobileCollapsibleCard>
                             </div>
 
                 {/* Right: Documents + Search */}
                                 <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                                   <MobileCollapsibleCard
                                     title="Documents"
                                     icon={<FileText className="w-5 h-5 text-accent-tertiary" />}
                                     statusBadge={
                                       documents.length > 0 ? { status: 'online', label: `${documents.length} doc${documents.length > 1 ? 's' : ''}` } :
                                       { status: 'unknown', label: 'None' }
                                     }
                                     summaryText={
                                       documents.length > 0 ? `${documents.length} documents` : 'No documents'
                                     }
                                     defaultExpanded={false}
                                     defaultExpandedMobile={false}
                                     localStorageKey="rag-documents"
                                   >
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
                                   </MobileCollapsibleCard>
  
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
              <div className="bg-bg-card rounded-xl border border-border-primary p-6 sm:p-8 text-center">
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
