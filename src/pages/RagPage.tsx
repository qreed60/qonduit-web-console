import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  getRagHealth,
  getRagProjectDetail,
  getRagProjectStats,
  getRagDocuments,
  getRagDocumentChunks,
  searchRagProject,
  deleteRagDocument,
  reingestRagDocument,
} from '../services/ragApi';
import {
  fetchRegistryProjects,
  deleteRegistryProject,
  fetchLogicalCollections,
} from '../services/ragProjectsApi';
import { ENDPOINTS, getMode } from '../config/endpoints';
import {
  RagHealthResponse,
  RagProjectDetail,
  RagProjectStats,
  RagDocumentSummary,
  RagChunk,
  RagSearchResponseNew,
  RagEndpointError,
  RagRegistryProject,
  RagLogicalCollection,
} from '../types';
import { RefreshCw, Loader2, Database, Layers, FileText, Plus } from 'lucide-react';
import RagHealthCard from '../components/RagHealthCard';
import RagRegistryProjectCard from '../components/RagRegistryProjectCard';
import RagProjectDetailPanel from '../components/RagProjectDetailPanel';
import RagLogicalCollectionsCard from '../components/RagLogicalCollectionsCard';
import RagDocumentsCard from '../components/RagDocumentsCard';
import RagChunkViewer from '../components/RagChunkViewer';
import RagDiagnosticSearchCard from '../components/RagDiagnosticSearchCard';
import RagUploadDocumentCard from '../components/RagUploadDocumentCard';
import RagTextNoteCard from '../components/RagTextNoteCard';
import RagDocumentSourceViewer from '../components/RagDocumentSourceViewer';
import MobileCollapsibleCard from '../components/MobileCollapsibleCard';
import Toast from '../components/Toast';
import CreateProjectDialog from '../components/CreateProjectDialog';
import EditProjectDialog from '../components/EditProjectDialog';
import CreateCollectionDialog from '../components/CreateCollectionDialog';
import EditCollectionDialog from '../components/EditCollectionDialog';
import ConfirmDialog from '../components/ConfirmDialog';
import { buildRagCollectionOptions } from '../utils/ragCollectionOptions';

const RagPage: React.FC = () => {
  // ── State ──────────────────────────────────────────────────────────────────

  // Health
  const [health, setHealth] = useState<RagHealthResponse | null>(null);
  const [healthError, setHealthError] = useState<RagEndpointError | null>(null);
  const [healthLastChecked, setHealthLastChecked] = useState<number | null>(Date.now());

  // Registry projects
   const [registryProjects, setRegistryProjects] = useState<RagRegistryProject[]>([]);
   const [registryProjectsLoading, setRegistryProjectsLoading] = useState(false);
   const [registryProjectsError, setRegistryProjectsError] = useState<RagEndpointError | null>(null);
   const [registryProjectsFetched, setRegistryProjectsFetched] = useState(false);
 
   // Logical collections (registry)
   const [logicalCollections, setLogicalCollections] = useState<RagLogicalCollection[]>([]);
   const [logicalCollectionsLoading, setLogicalCollectionsLoading] = useState(false);
   const [logicalCollectionsError, setLogicalCollectionsError] = useState<RagEndpointError | null>(null);
 
   // Legacy collections (for upload/search dropdown options)
     const [legacyCollections, setLegacyCollections] = useState<
       { name: string; point_count?: number; counts_are_estimated?: boolean }[]
     >([]);

  // Project detail
  const [projectDetail, setProjectDetail] = useState<RagProjectDetail | null>(null);
  const [projectDetailError, setProjectDetailError] = useState<RagEndpointError | null>(null);
  const [projectStats, setProjectStats] = useState<RagProjectStats | null>(null);
  const [projectStatsError, setProjectStatsError] = useState<RagEndpointError | null>(null);


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
   const [searchQuery, setSearchQuery] = useState('');
   const [searchLimit, setSearchLimit] = useState(4);
   const [searchCollection, setSearchCollection] = useState<string | undefined>(undefined);

  // Selection
   const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
   const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
 
   // Source viewer
   const [sourceViewerOpen, setSourceViewerOpen] = useState(false);
   const [sourceViewerDocument, setSourceViewerDocument] = useState<RagDocumentSummary | null>(null);
 
   // Toast
   const [toastMessage, setToastMessage] = useState<string | null>(null);
   const [toastType, setToastType] = useState<'success' | 'error'>('success');
 
   // Refresh
     const [refreshing, setRefreshing] = useState(false);
     const [lastUpdated, setLastUpdated] = useState<number | null>(null);
   
     // ── Dialog state ──────────────────────────────────────────────────────────
   
     // Project dialogs
     const [createProjectOpen, setCreateProjectOpen] = useState(false);
     const [editProjectOpen, setEditProjectOpen] = useState(false);
     const [editProjectTarget, setEditProjectTarget] = useState<RagRegistryProject | null>(null);
     const [deleteProjectTarget, setDeleteProjectTarget] = useState<RagRegistryProject | null>(null);
     const [deleteProjectConfirmOpen, setDeleteProjectConfirmOpen] = useState(false);
   
     // Collection dialogs
     const [createCollectionOpen, setCreateCollectionOpen] = useState(false);
     const [editCollectionOpen, setEditCollectionOpen] = useState(false);
     const [editCollectionTarget, setEditCollectionTarget] = useState<RagLogicalCollection | null>(null);
     const [deleteCollectionTarget, setDeleteCollectionTarget] = useState<RagLogicalCollection | null>(null);
     const [deleteCollectionConfirmOpen, setDeleteCollectionConfirmOpen] = useState(false);

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
   
     const fetchRegistryProjectsData = useCallback(async () => {
       setRegistryProjectsLoading(true);
       try {
         const result = await fetchRegistryProjects();
         setRegistryProjects(result);
         setRegistryProjectsError(null);
         setRegistryProjectsFetched(true);
       } catch (err) {
         console.error('[RAG] registry projects error', err);
         setRegistryProjectsError(err instanceof Error ? {
           url: `${gatewayUrl}/v1/rag/projects`,
           message: err.message,
           timestamp: Date.now(),
         } : null);
         setRegistryProjectsFetched(true);
       } finally {
         setRegistryProjectsLoading(false);
       }
     }, [gatewayUrl]);
   
     const fetchLogicalCollectionsData = useCallback(async (projectId: string) => {
       setLogicalCollectionsLoading(true);
       try {
         const result = await fetchLogicalCollections(projectId);
         setLogicalCollections(result);
         setLogicalCollectionsError(null);
       } catch (err) {
         console.error('[RAG] logical collections error', err);
         setLogicalCollectionsError(err instanceof Error ? {
           url: `${gatewayUrl}/v1/rag/projects/${projectId}/collections`,
           message: err.message,
           timestamp: Date.now(),
         } : null);
       } finally {
         setLogicalCollectionsLoading(false);
       }
     }, [gatewayUrl]);
   
     const fetchLegacyCollectionsData = useCallback(async (projectId: string) => {
         try {
           const { getRagCollections } = await import('../services/ragApi');
           const result = await getRagCollections(projectId);
           setLegacyCollections(result.collections);
         } catch (err) {
           console.error('[RAG] legacy collections error', err);
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
            fetchRegistryProjectsData(),
          ]);
    
          if (selectedProjectId) {
            await Promise.allSettled([
              fetchProjectDetail(selectedProjectId),
              fetchProjectStats(selectedProjectId),
              fetchLogicalCollectionsData(selectedProjectId),
              fetchLegacyCollectionsData(selectedProjectId),
              fetchDocuments(selectedProjectId),
            ]);
          }
    
          setLastUpdated(Date.now());
        } finally {
          setRefreshing(false);
          inFlightRef.current = false;
        }
      }, [fetchHealth, fetchRegistryProjectsData, fetchLogicalCollectionsData,
          fetchLegacyCollectionsData, fetchProjectDetail, fetchProjectStats,
          fetchDocuments, selectedProjectId]);

  // ── Initial load: fetch health and projects independently ──────────────────
  
      useEffect(() => {
              fetchHealth();
              fetchRegistryProjectsData();
            }, [fetchHealth, fetchRegistryProjectsData]);
  
    // ── Auto-select first existing project ─────────────────────────────────────
  
      useEffect(() => {
              if (!selectedProjectId && registryProjects.length > 0 && registryProjectsFetched) {
                const firstExisting = registryProjects.find(p => p.exists_in_qdrant);
                const firstProject = registryProjects[0];
                const target = firstExisting || firstProject;
                if (target) {
                  setSelectedProjectId(target.project_id);
                }
              }
            }, [registryProjects, registryProjectsFetched, selectedProjectId]);
  
    // ── Fetch detail when project is selected ──────────────────────────────────
  
    useEffect(() => {
          if (selectedProjectId) {
            fetchProjectDetail(selectedProjectId);
            fetchProjectStats(selectedProjectId);
            fetchLogicalCollectionsData(selectedProjectId);
            fetchLegacyCollectionsData(selectedProjectId);
            fetchDocuments(selectedProjectId);
          }
        }, [selectedProjectId, fetchProjectDetail, fetchProjectStats,
            fetchLogicalCollectionsData, fetchLegacyCollectionsData, fetchDocuments]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, []);

  // ── Toast helper ────────────────────────────────────────────────────────────
 
   const showToast = useCallback((msg: string, type: 'success' | 'error') => {
        setToastMessage(msg);
        setToastType(type);
      }, []);
   
      // ── Project action handlers ────────────────────────────────────────────────
   
      const handleCreateProject = useCallback(async (project: RagRegistryProject) => {
        await fetchRegistryProjectsData();
        if (!selectedProjectId) {
          setSelectedProjectId(project.project_id);
        }
      }, [selectedProjectId, fetchRegistryProjectsData]);
   
      const handleEditProject = useCallback((project: RagRegistryProject) => {
        setEditProjectTarget(project);
        setEditProjectOpen(true);
      }, []);
   
      const handleUpdateProject = useCallback(async (project: RagRegistryProject) => {
        await fetchRegistryProjectsData();
        if (selectedProjectId === project.project_id) {
          fetchProjectDetail(selectedProjectId);
          fetchProjectStats(selectedProjectId);
        }
      }, [selectedProjectId, fetchRegistryProjectsData, fetchProjectDetail, fetchProjectStats]);
   
      const handleDeleteProjectClick = useCallback((project: RagRegistryProject) => {
        setDeleteProjectTarget(project);
        setDeleteProjectConfirmOpen(true);
      }, []);
   
      const handleDeleteProjectConfirm = useCallback(async () => {
        if (!deleteProjectTarget) return;
        try {
          await deleteRegistryProject(deleteProjectTarget.project_id);
          showToast(`Project "${deleteProjectTarget.display_name}" deleted`, 'success');
          if (selectedProjectId === deleteProjectTarget.project_id) {
            setSelectedProjectId(null);
          }
          await fetchRegistryProjectsData();
        } catch (err) {
          showToast(err instanceof Error ? err.message : 'Delete failed', 'error');
        } finally {
          setDeleteProjectConfirmOpen(false);
          setDeleteProjectTarget(null);
        }
      }, [deleteProjectTarget, selectedProjectId, fetchRegistryProjectsData, showToast]);
   
      const handleRefreshProject = useCallback(async (_projectId: string) => {
              await fetchRegistryProjectsData();
            }, [fetchRegistryProjectsData]);
   
      // ── Collection action handlers ─────────────────────────────────────────────
   
      const handleCreateCollection = useCallback(() => {
        if (selectedProjectId) {
          setCreateCollectionOpen(true);
        }
      }, [selectedProjectId]);
   
      const handleCollectionCreated = useCallback(async (_collection: RagLogicalCollection) => {
              if (selectedProjectId) {
                await fetchLogicalCollectionsData(selectedProjectId);
              }
            }, [selectedProjectId, fetchLogicalCollectionsData]);
   
      const handleEditCollection = useCallback((collection: RagLogicalCollection) => {
        setEditCollectionTarget(collection);
        setEditCollectionOpen(true);
      }, []);
   
      const handleCollectionUpdated = useCallback(async (_collection: RagLogicalCollection) => {
              if (selectedProjectId) {
                await fetchLogicalCollectionsData(selectedProjectId);
              }
            }, [selectedProjectId, fetchLogicalCollectionsData]);
   
      const handleDeleteCollectionClick = useCallback((collection: RagLogicalCollection) => {
        setDeleteCollectionTarget(collection);
        setDeleteCollectionConfirmOpen(true);
      }, []);
   
      const handleDeleteCollectionConfirm = useCallback(async () => {
        if (!deleteCollectionTarget || !selectedProjectId) return;
        try {
          const { deleteLogicalCollection } = await import('../services/ragProjectsApi');
          await deleteLogicalCollection(selectedProjectId, deleteCollectionTarget.name);
          showToast(`Collection "${deleteCollectionTarget.display_name || deleteCollectionTarget.name}" deleted`, 'success');
          await fetchLogicalCollectionsData(selectedProjectId);
        } catch (err) {
          showToast(err instanceof Error ? err.message : 'Delete failed', 'error');
        } finally {
          setDeleteCollectionConfirmOpen(false);
          setDeleteCollectionTarget(null);
        }
      }, [deleteCollectionTarget, selectedProjectId, fetchLogicalCollectionsData, showToast]);
   
      // ── Document action handlers ────────────────────────────────────────────────
 
   const handleViewSource = useCallback((doc: RagDocumentSummary) => {
        setSourceViewerDocument(doc);
        setSourceViewerOpen(true);
      }, []);
   
      const handleReingest = useCallback(async (documentId: string) => {
      if (!selectedProjectId) return;
      try {
        await reingestRagDocument(selectedProjectId, documentId);
        showToast('Document reingested successfully', 'success');
        await fetchAllData();
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Reingest failed', 'error');
      }
    }, [selectedProjectId, fetchAllData, showToast]);
 
   const handleDelete = useCallback(async (documentId: string) => {
       if (!selectedProjectId) return;
       try {
         await deleteRagDocument(selectedProjectId, documentId);
         showToast('Document deleted', 'success');
         if (selectedDocumentId === documentId) {
           setSelectedDocumentId(null);
           setChunks([]);
         }
         await fetchAllData();
       } catch (err) {
         showToast(err instanceof Error ? err.message : 'Delete failed', 'error');
       }
     }, [selectedProjectId, selectedDocumentId, fetchAllData, showToast]);
 
   // ── Upload handlers ─────────────────────────────────────────────────────────
 
   const handleUploadComplete = useCallback(() => {
     fetchAllData();
   }, [fetchAllData]);
 
   const handleTextNoteSaved = useCallback(() => {
     fetchAllData();
   }, [fetchAllData]);
 
   // ── Event handlers ─────────────────────────────────────────────────────────
 
   const handleSelectProject = useCallback((projectId: string) => {
       setSelectedProjectId(prev => prev === projectId ? null : projectId);
       setProjectDetail(null);
       setProjectStats(null);
       setLogicalCollections([]);
       setLegacyCollections([]);
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
  
    const handleChunksView = useCallback((documentId: string) => {
      if (selectedProjectId) {
        handleSelectDocument(documentId);
      }
    }, [selectedProjectId, handleSelectDocument]);
  
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
  
    // Full merged collection options (logical + detail), used by upload/text-note/search
        const allCollectionOptions = useMemo(
          () => buildRagCollectionOptions(projectDetail, legacyCollections.length > 0 ? {
            collections: legacyCollections.map(c => ({ name: c.name, point_count: c.point_count, counts_are_estimated: c.counts_are_estimated })),
            project_id: selectedProjectId || '',
          } : null),
          [projectDetail, legacyCollections, selectedProjectId]
        );
    
        // Extract names for dropdowns passed to child components
        const availableCollections = allCollectionOptions.map(opt => opt.name);
    
      // Registry stats
      const totalProjects = registryProjects.length;
      const qdrantBackedCount = registryProjects.filter(p => p.exists_in_qdrant).length;
      const discoveredCount = registryProjects.filter(p => p.discovered).length;
      const totalPoints = registryProjects.reduce((sum, p) => sum + p.points_count, 0);
   
     // Project detail metrics
     const detailPoints = projectStats?.points_count?.toString() || '0';
     const detailVectors = projectStats?.vectors_count?.toString() || '0';
     const detailIndexed = projectStats?.indexed_vectors_count?.toString() || '0';

  const selectedDocument = documents.find(d => d.document_id === selectedDocumentId) || null;
  
    // Selected registry project
    const selectedRegistryProject = registryProjects.find(p => p.project_id === selectedProjectId) || null;

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
                           registryProjectsFetched && registryProjects.length > 0
                             ? { status: 'online' as const, label: `${registryProjects.length} project${registryProjects.length > 1 ? 's' : ''}` }
                             : { status: 'unknown' as const, label: 'None' }
                         }
                         summaryText={
                           selectedProjectId
                             ? `Selected: ${selectedRegistryProject?.display_name || selectedProjectId}`
                             : registryProjectsFetched && registryProjects.length > 0
                               ? 'Tap a project to select'
                               : 'No projects'
                         }
                         metrics={registryProjects.length > 0 ? [
                           { label: 'Qdrant Backed', value: `${qdrantBackedCount}/${totalProjects}` },
                           { label: 'Discovered', value: `${discoveredCount}` },
                           { label: 'Total Points', value: totalPoints.toLocaleString() },
                         ] : undefined}
                         defaultExpanded={true}
                         defaultExpandedMobile={false}
                         localStorageKey="rag-projects"
                       >
                         {/* New Project button — only visible when expanded */}
                         <button
                           onClick={() => setCreateProjectOpen(true)}
                           className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-lg font-medium text-sm bg-gradient-to-r from-accent-primary to-accent-tertiary text-white shadow-lg shadow-accent-primary/20 mb-3"
                         >
                           <Plus className="w-4 h-4" />
                           New Project
                         </button>
                         {registryProjectsError ? (
                           <div className="flex items-center gap-2 text-xs text-status-error">
                             <span>Unable to fetch projects: {registryProjectsError.message}</span>
                             <span className="text-[10px] font-mono opacity-70">({gatewayUrl}/v1/rag/projects)</span>
                           </div>
                         ) : registryProjectsLoading ? (
                           <div className="flex items-center gap-2 text-xs text-text-tertiary py-4">
                             <Loader2 className="w-4 h-4 animate-spin" />
                             <span>Loading registry projects...</span>
                           </div>
                         ) : registryProjectsFetched && registryProjects.length === 0 ? (
                           <div className="flex flex-col items-center justify-center py-8 text-center">
                             <Database className="w-10 h-10 text-text-tertiary/30 mb-3" />
                             <p className="text-sm text-text-secondary">No registry projects found</p>
                             <p className="text-xs text-text-tertiary mt-1">
                               Create your first project or discover existing Qdrant collections.
                             </p>
                           </div>
                         ) : (
                           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                             {registryProjects.map(project => (
                               <RagRegistryProjectCard
                                 key={project.project_id}
                                 project={project}
                                 isSelected={selectedProjectId === project.project_id}
                                 onSelect={handleSelectProject}
                                 onEdit={handleEditProject}
                                 onDelete={handleDeleteProjectClick}
                                 onRefresh={handleRefreshProject}
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
                                                                statusBadge={selectedRegistryProject
                                                                  ? { status: selectedRegistryProject.exists_in_qdrant ? 'online' as const : 'offline' as const, label: selectedRegistryProject.exists_in_qdrant ? 'Exists' : 'Not Found' }
                                                                  : projectDetail
                                                                    ? { status: 'online' as const, label: 'Found' }
                                                                    : { status: 'offline' as const, label: 'Loading...' }
                                                                }
                                                                summaryText={
                                                                  selectedRegistryProject
                                                                    ? `${selectedRegistryProject.display_name} — ${detailPoints} points`
                                                                    : projectDetail
                                                                      ? `${projectDetail.project_id} — ${detailPoints} points, ${detailVectors} vectors`
                                                                      : 'No detail data'
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
                                                                  registryProject={selectedRegistryProject}
                                                                />
                                                              </MobileCollapsibleCard>
                                                              <MobileCollapsibleCard
                                                                title="Logical Collections"
                                                                icon={<Layers className="w-5 h-5 text-accent-secondary" />}
                                                                statusBadge={
                                                                  logicalCollections.length > 0
                                                                    ? { status: 'online' as const, label: `${logicalCollections.length} collection${logicalCollections.length > 1 ? 's' : ''}` }
                                                                    : { status: 'unknown' as const, label: 'None' }
                                                                }
                                                                summaryText={
                                                                  logicalCollections.length > 0
                                                                    ? `${logicalCollections.length} collections`
                                                                    : 'No collections'
                                                                }
                                                                defaultExpanded={false}
                                                                defaultExpandedMobile={false}
                                                                localStorageKey="rag-collections"
                                                              >
                                                                {logicalCollectionsError ? (
                                                                  <div className="flex items-center gap-2 text-xs text-status-error">
                                                                    <span>Unable to fetch collections: {logicalCollectionsError.message}</span>
                                                                  </div>
                                                                ) : (
                                                                  <RagLogicalCollectionsCard
                                                                    projectId={selectedProjectId}
                                                                    collections={logicalCollections}
                                                                    loading={logicalCollectionsLoading}
                                                                    error={logicalCollectionsError}
                                                                    onRefresh={() => fetchLogicalCollectionsData(selectedProjectId)}
                                                                    onCreate={handleCreateCollection}
                                                                    onEdit={handleEditCollection}
                                                                    onDelete={handleDeleteCollectionClick}
                                                                  />
                                                                )}
                                                              </MobileCollapsibleCard>
                             </div>
 
                 {/* Right: Upload + Documents + Search */}
                                   <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                                     {/* Upload Document Card */}
                                     <RagUploadDocumentCard
                                       projectId={selectedProjectId}
                                       availableCollections={availableCollections}
                                       defaultCollection={availableCollections[0]}
                                       onUploadComplete={handleUploadComplete}
                                       toastMessage={showToast}
                                      />
   
                                      {/* Add Text Note Card */}
                                      <RagTextNoteCard
                                        projectId={selectedProjectId}
                                        availableCollections={availableCollections}
                                        defaultCollection={availableCollections[0]}
                                        onSaveComplete={handleTextNoteSaved}
                                        toastMessage={showToast}
                                     />
  
                                     {/* Documents Card */}
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
                                          onSourceView={handleViewSource}
                                          onChunksView={handleChunksView}
                                          onReingest={handleReingest}
                                          onDelete={handleDelete}
                                        />
                                        <RagDiagnosticSearchCard
                                          projectId={selectedProjectId}
                                          availableCollections={availableCollections}
                                          searchResults={searchResults}
                                          searchError={searchError}
                                          searchLoading={searchLoading}
                                          onSearch={handleSearch}
                                          query={searchQuery}
                                          limit={searchLimit}
                                          collection={searchCollection}
                                          onQueryChange={setSearchQuery}
                                          onLimitChange={setSearchLimit}
                                          onCollectionChange={setSearchCollection}
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
 
         {/* Source Viewer Modal */}
         {sourceViewerDocument && (
           <RagDocumentSourceViewer
             open={sourceViewerOpen}
             onClose={() => setSourceViewerOpen(false)}
             projectId={selectedProjectId!}
             document={sourceViewerDocument}
              toastMessage={showToast}
           />
         )}
 
         {/* Create Project Dialog */}
                 <CreateProjectDialog
                   open={createProjectOpen}
                   onClose={() => setCreateProjectOpen(false)}
                   onSuccess={handleCreateProject}
                 />
         
                 {/* Edit Project Dialog */}
                 <EditProjectDialog
                   open={editProjectOpen}
                   project={editProjectTarget}
                   onClose={() => { setEditProjectOpen(false); setEditProjectTarget(null); }}
                   onSuccess={handleUpdateProject}
                 />
         
                 {/* Delete Project Confirm Dialog */}
                 <ConfirmDialog
                   open={deleteProjectConfirmOpen}
                   title="Delete Project"
                   message={`Are you sure you want to delete project "${deleteProjectTarget?.display_name}"? This will only remove the registry entry and will NOT affect the underlying Qdrant collection.`}
                   confirmLabel="Delete"
                   confirmVariant="danger"
                   onConfirm={handleDeleteProjectConfirm}
                   onCancel={() => { setDeleteProjectConfirmOpen(false); setDeleteProjectTarget(null); }}
                 />
         
                 {/* Create Collection Dialog */}
                 <CreateCollectionDialog
                   open={createCollectionOpen}
                   projectId={selectedProjectId!}
                   onClose={() => setCreateCollectionOpen(false)}
                   onSuccess={handleCollectionCreated}
                 />
         
                 {/* Edit Collection Dialog */}
                 <EditCollectionDialog
                   open={editCollectionOpen}
                   projectId={selectedProjectId!}
                   collection={editCollectionTarget}
                   onClose={() => { setEditCollectionOpen(false); setEditCollectionTarget(null); }}
                   onSuccess={handleCollectionUpdated}
                 />
         
                 {/* Delete Collection Confirm Dialog */}
                 <ConfirmDialog
                   open={deleteCollectionConfirmOpen}
                   title="Delete Collection"
                   message={`Are you sure you want to delete collection "${deleteCollectionTarget?.display_name || deleteCollectionTarget?.name}"? This will only remove the logical collection registry entry.`}
                   confirmLabel="Delete"
                   confirmVariant="danger"
                   onConfirm={handleDeleteCollectionConfirm}
                   onCancel={() => { setDeleteCollectionConfirmOpen(false); setDeleteCollectionTarget(null); }}
                 />
         
                 {/* Toast */}
                 {toastMessage && (
                   <Toast message={toastMessage} type={toastType} onClose={() => setToastMessage(null)} />
                 )}
       </div>
     );
};

export default RagPage;
