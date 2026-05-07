import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  getGatewayHealth,
  getGatewayModels,
  getRagIngestionDebug,
  getAllRagIngestionStatus,
  getRagIngestionStatus,
  listRagCollections,
  searchRagCollection,
  runEmbeddingSmokeTest,
  runRagChatTest,
  KNOWN_RAG_PROJECTS,
} from '../services/ragApi';
import { ENDPOINTS, getMode } from '../config/endpoints';
import {
  RagGatewayHealthResponse,
  GatewayModelsResponse,
  RagIngestionDebug,
  RagIngestionProjectStatus,
  RagCollectionListResponse,
  RagSearchResponse,
  RagEmbeddingSmokeTestResponse,
  RagChatTestResponse,
  RagEndpointError,
} from '../types';
import { RefreshCw, Loader2, Database } from 'lucide-react';
import RagHealthCard from '../components/RagHealthCard';
import RagIngestionQueueCard from '../components/RagIngestionQueueCard';
import RagProjectCard from '../components/RagProjectCard';
import RagProjectDetailPanel from '../components/RagProjectDetailPanel';
import RagCollectionsCard from '../components/RagCollectionsCard';
import RagDiagnosticSearchCard from '../components/RagDiagnosticSearchCard';
import RagEmbeddingSmokeTestCard from '../components/RagEmbeddingSmokeTestCard';

const RagPage: React.FC = () => {
  // ── State ──────────────────────────────────────────────────────────────────

  // Health
  const [health, setHealth] = useState<RagGatewayHealthResponse | null>(null);
   const [healthError, setHealthError] = useState<RagEndpointError | null>(null);
   const [healthLastChecked, setHealthLastChecked] = useState<number | null>(Date.now());
   const [models, setModels] = useState<GatewayModelsResponse['models'] | null>(null);
  const [modelsError, setModelsError] = useState<RagEndpointError | null>(null);

  // Ingestion
  const [ingestionDebug, setIngestionDebug] = useState<RagIngestionDebug | null>(null);
  const [ingestionDebugError, setIngestionDebugError] = useState<RagEndpointError | null>(null);
  const [projectStatuses, setProjectStatuses] = useState<RagIngestionProjectStatus[]>([]);
  const [projectStatusesError, setProjectStatusesError] = useState<RagEndpointError | null>(null);

  // Collections
  const [collections, setCollections] = useState<RagCollectionListResponse | null>(null);
  const [collectionsError, setCollectionsError] = useState<RagEndpointError | null>(null);

  // Search
  const [searchResults, setSearchResults] = useState<RagSearchResponse | null>(null);
  const [searchError, setSearchError] = useState<RagEndpointError | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // Embedding smoke test
  const [embeddingResult, setEmbeddingResult] = useState<RagEmbeddingSmokeTestResponse | null>(null);
  const [embeddingError, setEmbeddingError] = useState<string | null>(null);
  const [embeddingLoading, setEmbeddingLoading] = useState(false);

  // Chat test
  const [chatResult, setChatResult] = useState<RagChatTestResponse | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatModel, setChatModel] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [chatRagCollection, setChatRagCollection] = useState('');

  // Selection
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Refresh
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  // Refs
  const inFlightRef = useRef(false);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
        const result = await getGatewayHealth();
        setHealth(result);
        setHealthError(null);
        setHealthLastChecked(Date.now());
      } catch (err) {
        setHealthError(err instanceof Error ? {
          url: `${gatewayUrl}/health`,
          message: err.message,
          timestamp: Date.now(),
        } : null);
      }
    }, [gatewayUrl]);

  const fetchModels = useCallback(async () => {
    try {
      const result = await getGatewayModels();
      setModels(result.models);
      setModelsError(null);
      if (result.models.length > 0 && !chatModel) {
        setChatModel(result.models[0].id);
      }
    } catch (err) {
      setModelsError(err instanceof Error ? {
        url: `${gatewayUrl}/v1/models`,
        message: err.message,
        timestamp: Date.now(),
      } : null);
    }
  }, [gatewayUrl, chatModel]);

  const fetchIngestionDebug = useCallback(async () => {
    try {
      const result = await getRagIngestionDebug();
      setIngestionDebug(result);
      setIngestionDebugError(null);
    } catch (err) {
      setIngestionDebugError(err instanceof Error ? {
        url: `${gatewayUrl}/v1/ingestion/debug`,
        message: err.message,
        timestamp: Date.now(),
      } : null);
    }
  }, [gatewayUrl]);

  const fetchAllProjectStatuses = useCallback(async () => {
    try {
      const results = await getAllRagIngestionStatus();
      setProjectStatuses(results);
      setProjectStatusesError(null);
    } catch (err) {
      setProjectStatusesError(err instanceof Error ? {
        url: `${gatewayUrl}/v1/ingestion/status`,
        message: err.message,
        timestamp: Date.now(),
      } : null);
    }
  }, [gatewayUrl]);

  const fetchSelectedProjectStatus = useCallback(async (projectId: string) => {
    try {
      const result = await getRagIngestionStatus(projectId);
      setProjectStatuses(prev => {
        const idx = prev.findIndex(p => p.project_id === projectId);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = result;
          return next;
        }
        return [...prev, result];
      });
      setProjectStatusesError(null);
    } catch (err) {
      setProjectStatusesError(err instanceof Error ? {
        url: `${gatewayUrl}/v1/ingestion/status/${projectId}`,
        message: err.message,
        timestamp: Date.now(),
      } : null);
    }
  }, [gatewayUrl]);

  const fetchCollections = useCallback(async (projectId: string) => {
    try {
      const result = await listRagCollections(projectId);
      setCollections(result);
      setCollectionsError(null);
    } catch (err) {
      setCollectionsError(err instanceof Error ? {
        url: `${gatewayUrl}/rag/collections`,
        message: err.message,
        timestamp: Date.now(),
      } : null);
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
        fetchModels(),
        fetchIngestionDebug(),
        fetchAllProjectStatuses(),
      ]);

      if (selectedProjectId) {
        await Promise.allSettled([
          fetchSelectedProjectStatus(selectedProjectId),
          fetchCollections(selectedProjectId),
        ]);
      }

      setLastUpdated(Date.now());
    } finally {
      setRefreshing(false);
      inFlightRef.current = false;
    }
  }, [fetchHealth, fetchModels, fetchIngestionDebug, fetchAllProjectStatuses, fetchSelectedProjectStatus, fetchCollections, selectedProjectId]);

  // ── Initial load ───────────────────────────────────────────────────────────

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // ── Polling logic ──────────────────────────────────────────────────────────

  const shouldPoll = useCallback((): boolean => {
    if (!ingestionDebug) return false;
    if (ingestionDebug.active_job) return true;
    if ((ingestionDebug.queue_length ?? 0) > 0) return true;
    if (selectedProjectId) {
      const projStatus = projectStatuses.find(p => p.project_id === selectedProjectId);
      if (projStatus && (projStatus.state === 'queued' || projStatus.state === 'running')) {
        return true;
      }
    }
    return false;
  }, [ingestionDebug, projectStatuses, selectedProjectId]);

  useEffect(() => {
    // Clear existing timer
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    if (shouldPoll()) {
      pollTimerRef.current = setTimeout(() => {
        fetchAllData();
      }, 4000); // 4-second poll interval
    }
    // Stop polling when shouldPoll returns false (timer will be cleared on next effect)
  }, [shouldPoll, fetchAllData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
      }
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, []);

  // ── Event handlers ─────────────────────────────────────────────────────────

  const handleSelectProject = useCallback((projectId: string) => {
    setSelectedProjectId(prev => prev === projectId ? null : projectId);
    // Reset collections when switching
    setCollections(null);
    setSearchResults(null);
  }, []);

  const handleSearch = useCallback(async (query: string, limit: number, collection?: string) => {
    if (!selectedProjectId) return;
    setSearchLoading(true);
    setSearchError(null);
    try {
      const result = await searchRagCollection(selectedProjectId, collection, query, limit);
      setSearchResults(result);
    } catch (err) {
      setSearchError(err instanceof Error ? {
        url: `${gatewayUrl}/rag/test-search`,
        message: err.message,
        timestamp: Date.now(),
      } : null);
    } finally {
      setSearchLoading(false);
    }
  }, [selectedProjectId, gatewayUrl]);

  const handleEmbeddingTest = useCallback(async () => {
    setEmbeddingLoading(true);
    setEmbeddingError(null);
    setEmbeddingResult(null);
    try {
      const result = await runEmbeddingSmokeTest();
      setEmbeddingResult(result);
      if (!result.ok) {
        setEmbeddingError(result.error || 'Embedding test failed');
      }
    } catch (err) {
      setEmbeddingError(err instanceof Error ? err.message : 'Embedding test failed');
    } finally {
      setEmbeddingLoading(false);
    }
  }, []);

  const handleChatTest = useCallback(async () => {
    if (!chatModel || !chatMessage.trim()) return;
    setChatLoading(true);
    setChatError(null);
    setChatResult(null);
    try {
      const result = await runRagChatTest(chatModel, chatMessage.trim(), chatRagCollection || undefined, selectedProjectId || undefined);
      setChatResult(result);
      if (!result.ok) {
        setChatError(result.error || 'Chat test failed');
      }
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'Chat test failed');
    } finally {
      setChatLoading(false);
    }
  }, [chatModel, chatMessage, chatRagCollection, selectedProjectId]);

  // ── Derived state ──────────────────────────────────────────────────────────

  const selectedProjectStatus = selectedProjectId
    ? projectStatuses.find(p => p.project_id === selectedProjectId) || null
    : null;

  const availableCollections = collections?.collections || [];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-accent-primary" />
            <h1 className="text-xl font-bold bg-gradient-to-r from-accent-primary to-accent-tertiary bg-clip-text text-transparent">
              RAG Diagnostics
            </h1>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            Memory Gateway RAG system visibility and diagnostics
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
          {/* Top row: Health + Queue */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RagHealthCard
              health={health}
              healthError={healthError}
              healthLastChecked={healthLastChecked}
              models={models}
              modelsError={modelsError}
              gatewayUrl={gatewayUrl}
              onRefresh={fetchAllData}
              refreshing={refreshing}
            />
            <RagIngestionQueueCard
              debug={ingestionDebug}
              debugError={ingestionDebugError}
              onRefresh={fetchAllData}
              refreshing={refreshing}
            />
          </div>

          {/* Known Projects */}
          <div>
            <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
              <Database className="w-4 h-4 text-accent-primary" />
              Known Projects
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              {KNOWN_RAG_PROJECTS.map(project => {
                const status = projectStatuses.find(p => p.project_id === project.project_id);
                return (
                  <RagProjectCard
                    key={project.project_id}
                    status={status || {
                      project_id: project.project_id,
                      state: 'unknown',
                      raw: {},
                    }}
                    isSelected={selectedProjectId === project.project_id}
                    onSelect={handleSelectProject}
                    onRefresh={fetchSelectedProjectStatus}
                    refreshing={refreshing}
                  />
                );
              })}
            </div>
          </div>

          {/* Detail area: Project detail + Collections + Search */}
          {selectedProjectId && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Project detail */}
              <div className="lg:col-span-1">
                <RagProjectDetailPanel
                  status={selectedProjectStatus}
                  collections={collections}
                  collectionsError={collectionsError}
                  statusError={projectStatusesError}
                />
              </div>

              {/* Right: Collections + Search */}
              <div className="lg:col-span-2 space-y-6">
                <RagCollectionsCard
                  collections={collections}
                  collectionsError={collectionsError}
                  projectId={selectedProjectId}
                />
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
                Select a project above to view details, collections, and run diagnostic searches.
              </p>
            </div>
          )}

          {/* Optional smoke tests */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RagEmbeddingSmokeTestCard
              result={embeddingResult}
              error={embeddingError}
              loading={embeddingLoading}
              onTest={handleEmbeddingTest}
            />

            {/* RAG Chat Test */}
            <div className="bg-bg-card rounded-xl border border-border-primary p-5 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                  <Database className="w-4 h-4 text-accent-primary" />
                  RAG Chat Test
                </h3>
                <button
                  onClick={handleChatTest}
                  disabled={chatLoading || !chatModel || !chatMessage.trim()}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-accent-primary to-accent-tertiary hover:from-accent-primary-hover hover:to-accent-tertiary text-white shadow-lg shadow-accent-primary/20 transition-all duration-200 disabled:opacity-50 disabled:shadow-none flex items-center gap-1.5"
                >
                  {chatLoading ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    'Test Chat'
                  )}
                </button>
              </div>

              <p className="text-[10px] text-text-tertiary mb-3">
                Sends an explicit user-triggered chat request to POST /v1/chat/completions.
                <br />
                <span className="text-status-warning">Note: The current backend does not return stable source citations in chat responses.</span>
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-text-tertiary block mb-1">Model</label>
                  <select
                    value={chatModel}
                    onChange={(e) => setChatModel(e.target.value)}
                    disabled={chatLoading || !models}
                    className="w-full px-3 py-2 bg-bg-secondary border border-border-primary rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-primary/50 transition-all duration-200 disabled:opacity-50"
                  >
                    {models ? (
                      models.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))
                    ) : (
                      <option value="">Loading models...</option>
                    )}
                  </select>
                </div>

                {selectedProjectId && (
                  <div>
                    <label className="text-[10px] text-text-tertiary block mb-1">RAG Collection (optional)</label>
                    <input
                      type="text"
                      value={chatRagCollection}
                      onChange={(e) => setChatRagCollection(e.target.value)}
                      placeholder="Leave empty for default project collection"
                      className="w-full px-3 py-2 bg-bg-secondary border border-border-primary rounded-lg text-xs text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent-primary/50 transition-all duration-200"
                    />
                  </div>
                )}

                <div>
                  <label className="text-[10px] text-text-tertiary block mb-1">Message</label>
                  <textarea
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Type a message to test RAG chat..."
                    rows={3}
                    className="w-full px-3 py-2 bg-bg-secondary border border-border-primary rounded-lg text-xs text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent-primary/50 resize-none transition-all duration-200"
                  />
                </div>

                {chatResult?.ok && chatResult.content && (
                  <div className="p-3 bg-bg-secondary border border-border-subtle rounded-lg">
                    <p className="text-[10px] text-text-tertiary mb-1">Response:</p>
                    <p className="text-xs text-text-primary whitespace-pre-wrap">{chatResult.content}</p>
                  </div>
                )}

                {(chatError || chatResult?.error) && (
                  <p className="text-xs text-status-error">{chatError || chatResult?.error}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RagPage;
