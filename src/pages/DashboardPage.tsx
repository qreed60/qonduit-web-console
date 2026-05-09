import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSettings, fetchRouterModels, fetchProviderModels, fetchRouterGpu, launchModel as apiLaunchModel, stopModel as apiStopModel, restartRouterModel as apiRestartRouterModel, testEndpointWithError, testRouterHealthWithError, getRouterStatus, NormalizedModel, GpuStatus, RouterStatus } from '../services/api';
import { getRagHealth, getRagProjects } from '../services/ragApi';
import { RagHealthResponse, RagProjectSummary } from '../types';
import { Settings } from '../types';
import { ENDPOINTS } from '../config/endpoints';
import StatusBar from '../components/StatusBar';
import Toast from '../components/Toast';
import EndpointCard from '../components/EndpointCard';
import ModelControlCard from '../components/ModelControlCard';
import LogsPanel from '../components/LogsPanel';
import SystemOverview from '../components/SystemOverview';
import ComingSoon from '../components/ComingSoon';
import MobileCollapsibleCard from '../components/MobileCollapsibleCard';
import {
  Settings2,
  Wrench,
  BarChart3,
  Shield,
  Database,
  Loader2,
  ArrowRight,
  Server,
  Globe,
  Cpu,
  Terminal,
} from 'lucide-react';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [settings] = useState<Settings>(getSettings());

  // ── State: separate loading phases ──
  const [contentRefreshing, setContentRefreshing] = useState(false);
  const inFlightRef = useRef(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  // ── State: health/connectivity ──
  const [endpointHealth, setEndpointHealth] = useState<{
    gateway: boolean | null;
    llama: boolean | null;
    router: boolean | null;
  }>({ gateway: null, llama: null, router: null });
  const [endpointErrors, setEndpointErrors] = useState<Record<string, string | null>>({
    gateway: null,
    llama: null,
    router: null,
  });
  const [healthLoading, setHealthLoading] = useState(false);

  // ── State: content data (preserved across refreshes) ──
   const [routerStatus, setRouterStatus] = useState<RouterStatus | null>(null);
   const [routerModels, setRouterModels] = useState<NormalizedModel[]>([]);
   const [selectedRouterModel, setSelectedRouterModel] = useState('');
   const [ctxSize, setCtxSize] = useState(4096);
   const [suggestedCtx, setSuggestedCtx] = useState<number | null>(null);
   const [gpuStatus, setGpuStatus] = useState<GpuStatus | null>(null);
   const [gpuError, setGpuError] = useState<string | null>(null);
   const [chatModels, setChatModels] = useState<NormalizedModel[]>([]);
   const [selectedChatModel, setSelectedChatModel] = useState('');
 
   // ── State: RAG data ──
   const [ragHealth, setRagHealth] = useState<RagHealthResponse | null>(null);
   const [ragProjects, setRagProjects] = useState<RagProjectSummary[]>([]);
   const ragTotalPoints = ragProjects
     .filter(p => p.exists)
     .reduce((sum, p) => sum + p.points_count, 0);

  // ── State: action feedback ──
  const [actionLoading, setActionLoading] = useState(false);
  const [actionStatus, setActionStatus] = useState<'idle' | 'launching' | 'stopping' | 'restarting' | 'success' | 'error'>('idle');
  const [actionMessage, setActionMessage] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ── Data fetch (stale-while-revalidate) ──
  const fetchDashboardData = async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    setContentRefreshing(true);

    try {
      // ── Health: fetch router status — update immediately ──
      try {
        const status = await getRouterStatus();
        setRouterStatus(status);
      } catch {
        // Router might not be available — set null immediately
        setRouterStatus(null);
      }

      // ── Content: fetch GPU/VRAM — preserve old data on failure ──
      try {
        const gpu = await fetchRouterGpu();
        setGpuStatus(gpu);
        setGpuError(null);
      } catch (err) {
        // Keep old GPU data, just log error
        setGpuError(err instanceof Error ? err.message : 'Failed to fetch GPU status');
      }

      // ── Content: fetch router models — preserve old data on failure ──
      try {
        const data = await fetchRouterModels();
        setRouterModels(data.models || []);
        if (data.suggestedCtx) {
          setSuggestedCtx(data.suggestedCtx);
          if (!selectedRouterModel) {
            setCtxSize(data.suggestedCtx);
          }
        }
      } catch {
        // Keep old router models
      }

      // ── Content: fetch chat models — preserve old data on failure ──
       try {
         const providerModels = await fetchProviderModels(settings.defaultProvider);
         setChatModels(providerModels);
         if (providerModels.length > 0) {
           const defaultModel = providerModels.find(m => m.id === settings.defaultModel);
           setSelectedChatModel(defaultModel?.id || providerModels[0].id);
         }
       } catch {
         // Keep old chat models
       }
 
       // ── RAG: fetch health — preserve old data on failure ──
       try {
         const ragHealthData = await getRagHealth();
         setRagHealth(ragHealthData);
       } catch {
         // Keep old RAG health data
       }
 
       // ── RAG: fetch projects — preserve old data on failure ──
       try {
         const ragProjectsData = await getRagProjects();
         setRagProjects(ragProjectsData.projects);
       } catch {
         // Keep old RAG projects data
       }
 
       // ── Health: test endpoint health ──
       await testAllEndpoints();

      setLastUpdated(Date.now());
    } finally {
      setContentRefreshing(false);
      inFlightRef.current = false;
    }
  };

  // Initial fetch on mount
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Reload chat models when settings defaultProvider changes
  useEffect(() => {
    const loadChatModels = async () => {
      try {
        const providerModels = await fetchProviderModels(settings.defaultProvider);
        setChatModels(providerModels);
        if (providerModels.length > 0) {
          const defaultModel = providerModels.find(m => m.id === settings.defaultModel);
          setSelectedChatModel(defaultModel?.id || providerModels[0].id);
        }
      } catch {
        // Chat models might not be available
      }
    };
    loadChatModels();
  }, [settings.defaultProvider, settings.defaultModel]);

  const testAllEndpoints = async () => {
    setHealthLoading(true);
    try {
      const [gatewayResult, llamaResult, routerResult] = await Promise.all([
        testEndpointWithError('gateway').catch(() => ({ ok: false, error: 'Connection failed' })),
        testEndpointWithError('llama').catch(() => ({ ok: false, error: 'Connection failed' })),
        testRouterHealthWithError().catch(() => ({ ok: false, error: 'Connection failed' })),
      ]);

      setEndpointHealth({
        gateway: gatewayResult.ok,
        llama: llamaResult.ok,
        router: routerResult.ok,
      });

      setEndpointErrors({
        gateway: gatewayResult.error || null,
        llama: llamaResult.error || null,
        router: routerResult.error || null,
      });
    } finally {
      setHealthLoading(false);
    }
  };

  const handleLaunch = async () => {
      if (!selectedRouterModel) return;

      setActionLoading(true);
      setActionStatus('launching');
      setActionMessage('');

      try {
        const result = await apiLaunchModel(selectedRouterModel, ctxSize);
      if (result.ok) {
        setActionStatus('success');
        setActionMessage(result.message || 'Model launched successfully');
        setToastMessage('Model launched successfully');
        setRouterStatus((prev) => (prev ? { ...prev, running: true } : null));
      } else {
        setActionStatus('error');
        setActionMessage(result.message || 'Failed to launch model');
      }
    } catch (err) {
      setActionStatus('error');
      setActionMessage(err instanceof Error ? err.message : 'Failed to launch model');
    } finally {
      setActionLoading(false);
      setTimeout(() => {
        setActionMessage('');
        setActionStatus('idle');
      }, 5000);
    }
  };

  const handleStop = async () => {
      setActionLoading(true);
      setActionStatus('stopping');
      setActionMessage('');

      try {
        const result = await apiStopModel();
        if (result.ok) {
          setActionStatus('success');
          setActionMessage(result.message || 'Model stopped successfully');
          setToastMessage('Model stopped successfully');
          setRouterStatus((prev) => (prev ? { ...prev, running: false } : null));
        } else {
          setActionStatus('error');
          setActionMessage(result.message || 'Failed to stop model');
        }
      } catch (err) {
        setActionStatus('error');
        setActionMessage(err instanceof Error ? err.message : 'Failed to stop model');
      } finally {
        setActionLoading(false);
        setTimeout(() => {
          setActionMessage('');
          setActionStatus('idle');
        }, 5000);
      }
    };

    const handleRestart = async () => {
       if (!selectedRouterModel) return;

       setActionLoading(true);
       setActionStatus('restarting');
       setActionMessage('');

       try {
         const result = await apiRestartRouterModel(selectedRouterModel, ctxSize);
         if (result.ok) {
           setActionStatus('success');
           setActionMessage(result.message || 'Model restarted successfully');
           setToastMessage('Model restarted successfully');
           setRouterStatus((prev) => (prev ? { ...prev, running: true } : null));
         } else {
           setActionStatus('error');
           setActionMessage(result.message || 'Failed to restart model');
         }
       } catch (err) {
         const msg = err instanceof Error ? err.message : 'Failed to restart model';
         // Handle backend "model_required" error
         if (msg.includes('model_required') || msg.includes('model')) {
           setActionMessage('No model selected for restart. Please select a model first.');
         } else {
           setActionMessage(msg);
         }
         setActionStatus('error');
       } finally {
         setActionLoading(false);
         setTimeout(() => {
           setActionMessage('');
           setActionStatus('idle');
         }, 5000);
       }
     };

    // Auto-select first model if none selected and models available
      useEffect(() => {
        if (!selectedRouterModel && routerModels.length > 0) {
          setSelectedRouterModel(routerModels[0].name);
        }
      }, [routerModels, selectedRouterModel]);

    // Auto-select first chat model if none selected
      useEffect(() => {
        if (!selectedChatModel && chatModels.length > 0) {
          setSelectedChatModel(chatModels[0].id);
        }
      }, [chatModels, selectedChatModel]);

  const mode = settings.endpointMode;

  // ── Mobile Collapsible Card Summary Data ──
 
   // System Health summary
   const healthStatuses = [endpointHealth.gateway, endpointHealth.llama, endpointHealth.router];
    const healthAllOnline = healthStatuses.every(s => s === true);
    const healthOverallStatus: 'online' | 'offline' | 'loading' | 'unknown' =
     healthStatuses.some(s => s === null) ? 'loading' : healthAllOnline ? 'online' : 'offline';
   const healthSummary = `Gateway · Direct · Router · ${routerStatus?.running_model ? 'Model' : 'Stopped'}`;
  
    // Endpoints summary
   const onlineCount = healthStatuses.filter(s => s === true).length;
   const totalEndpoints = healthStatuses.length;
   const endpointStatus: 'online' | 'offline' | 'loading' | 'unknown' =
     healthStatuses.some(s => s === null) ? 'loading' : onlineCount === totalEndpoints ? 'online' : onlineCount > 0 ? 'offline' : 'unknown';
   const endpointSummaryText = 'Gateway, Direct, Router';
   const endpointSummaryLabel = `${onlineCount}/${totalEndpoints} Online`;
 
   // Router Model Control summary
   const modelControlStatus: 'online' | 'offline' | 'loading' | 'unknown' =
     routerStatus?.running ? 'online' : routerStatus ? 'offline' : 'unknown';
   const modelControlSummary = routerStatus?.running_model
     ? `${routerStatus.running_model} · ctx: ${ctxSize.toLocaleString()}`
     : 'No model selected';
 
   // Terminal summary
   const terminalSummary = 'Polling · Click to expand';
 
   // RAG Browser summary
   const ragQdrantStatus = ragHealth?.qdrant.ok ? 'Connected' : ragHealth?.qdrant.ok === false ? 'Disconnected' : 'Checking';
   const ragEmbedStatus = ragHealth?.embedding.ok ? 'Available' : ragHealth?.embedding.ok === false ? 'Unavailable' : 'Checking';
   const ragSummary = `Qdrant: ${ragQdrantStatus} · Embeddings: ${ragEmbedStatus} · ${ragProjects.length} projects`;
 
   const comingSoonItems = [
      {
        icon: <Settings2 className="w-4 h-4" />,
        title: 'Gateway Settings',
        description: 'Configure memory gateway parameters and behavior',
        category: 'infra' as const,
      },
      {
        icon: <Wrench className="w-4 h-4" />,
        title: 'Tool Toggles',
        description: 'Enable tools and function calling for models',
        category: 'tools' as const,
      },
      {
        icon: <BarChart3 className="w-4 h-4" />,
        title: 'Usage Analytics',
        description: 'Track model usage, costs, and performance metrics',
        category: 'tools' as const,
      },
      {
        icon: <Shield className="w-4 h-4" />,
        title: 'Access Control',
        description: 'Manage user permissions and API key rotation',
        category: 'infra' as const,
      },
    ];

  const formatTimeAgo = (ts: number) => {
    const diff = Date.now() - ts;
    const secs = Math.floor(diff / 1000);
    if (secs < 10) return 'just now';
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    return `${mins}m ago`;
  };

  return (
     <div className="flex flex-col h-full bg-bg-primary">
       {/* Status Bar */}
       <StatusBar settings={settings} />
 
       {/* Dashboard Content */}
       <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
         {/* Page Header */}
         <div className="mb-4 sm:mb-6">
           <div className="flex items-center gap-2">
             <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-accent-primary to-accent-tertiary bg-clip-text text-transparent">
               Qonduit Control Center
             </h1>
             {contentRefreshing && (
               <span className="flex items-center gap-1 text-[10px] sm:text-xs text-text-tertiary">
                 <Loader2 className="w-3 h-3 animate-spin" />
                 Refreshing…
               </span>
             )}
           </div>
           <p className="text-sm sm:text-base text-text-secondary mt-1">
             Monitor and manage your AI infrastructure
           </p>
           {lastUpdated && !contentRefreshing && (
             <p className="text-[10px] sm:text-xs text-text-tertiary mt-0.5">
               Updated {formatTimeAgo(lastUpdated)}
             </p>
           )}
         </div>
 
         {/* System Overview */}
                    <MobileCollapsibleCard
                      title="System Health"
                      icon={<Server className="w-5 h-5 text-accent-primary" />}
                      statusBadge={{ status: healthOverallStatus, label: healthOverallStatus === 'online' ? 'Healthy' : healthOverallStatus === 'offline' ? 'Issue' : 'Loading' }}
                      summaryText={healthSummary}
                      defaultExpanded={true}
                      defaultExpandedMobile={false}
                      localStorageKey="qonduit-dashboard-health-expanded"
                    >
                      <SystemOverview
                        endpointHealth={endpointHealth}
                        healthLoading={healthLoading}
                        routerStatus={routerStatus}
                        chatModel={selectedChatModel}
                        routerRunningModel={routerStatus?.running_model || undefined}
                        gpuStatus={gpuStatus}
                        gpuError={gpuError}
                        endpointErrors={endpointErrors}
                        onRefresh={testAllEndpoints}
                      />
                    </MobileCollapsibleCard>
 
         {/* Endpoint Cards */}
            <MobileCollapsibleCard
              title="Endpoints"
              icon={<Globe className="w-5 h-5 text-accent-primary" />}
              statusBadge={{ status: endpointStatus, label: endpointSummaryLabel }}
              summaryText={endpointSummaryText}
              defaultExpanded={true}
              defaultExpandedMobile={false}
              localStorageKey="qonduit-dashboard-endpoints-expanded"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            <EndpointCard
              name="Memory Gateway"
              icon="🌐"
              description="Chat completions & memory"
              url={ENDPOINTS.gateway[mode]}
              status={endpointHealth.gateway === true ? 'online' : endpointHealth.gateway === false ? 'offline' : healthLoading ? 'loading' : 'unknown'}
              error={endpointErrors.gateway}
              onTest={() => {
                setHealthLoading(true);
                testEndpointWithError('gateway')
                  .then((result) => {
                    setEndpointHealth((prev) => ({ ...prev, gateway: result.ok }));
                    setEndpointErrors((prev) => ({ ...prev, gateway: result.error || null }));
                  })
                  .finally(() => setHealthLoading(false));
              }}
              testLoading={healthLoading}
            />
            <EndpointCard
              name="Direct (llama.cpp)"
              icon="⚡"
              description="Direct inference server"
              url={ENDPOINTS.llama[mode]}
              status={endpointHealth.llama === true ? 'online' : endpointHealth.llama === false ? 'offline' : healthLoading ? 'loading' : 'unknown'}
              error={endpointErrors.llama}
              externalUrl={ENDPOINTS.llama[mode]}
              onTest={() => {
                setHealthLoading(true);
                testEndpointWithError('llama')
                  .then((result) => {
                    setEndpointHealth((prev) => ({ ...prev, llama: result.ok }));
                    setEndpointErrors((prev) => ({ ...prev, llama: result.error || null }));
                  })
                  .finally(() => setHealthLoading(false));
              }}
              testLoading={healthLoading}
            />
            <EndpointCard
              name="Router API"
              icon="🔀"
              description="Model router & container manager"
              url={ENDPOINTS.router[mode]}
              status={endpointHealth.router === true ? 'online' : endpointHealth.router === false ? 'offline' : healthLoading ? 'loading' : 'unknown'}
              error={endpointErrors.router}
              onTest={() => {
                setHealthLoading(true);
                testRouterHealthWithError()
                  .then((result) => {
                    setEndpointHealth((prev) => ({ ...prev, router: result.ok }));
                    setEndpointErrors((prev) => ({ ...prev, router: result.error || null }));
                  })
                  .finally(() => setHealthLoading(false));
              }}
              testLoading={healthLoading}
            />
           </div>
          </MobileCollapsibleCard>
 
        {/* Router Model Control — always visible, always enabled */}
                  <MobileCollapsibleCard
                    title="Router Model Control"
                    icon={<Cpu className="w-5 h-5 text-accent-primary" />}
                    statusBadge={{ status: modelControlStatus, label: routerStatus?.running ? 'Running' : 'Stopped' }}
                    summaryText={modelControlSummary}
                    defaultExpanded={true}
                    defaultExpandedMobile={false}
                    localStorageKey="qonduit-dashboard-model-control-expanded"
                  >
                    <ModelControlCard
                     routerStatus={routerStatus}
                     models={routerModels}
                     selectedModel={selectedRouterModel}
                     ctxSize={ctxSize}
                     suggestedCtx={suggestedCtx}
                     onSelectModel={setSelectedRouterModel}
                     onCtxChange={setCtxSize}
                     onLaunch={handleLaunch}
                     onStop={handleStop}
                     onRestart={handleRestart}
                     loading={actionLoading}
                     actionStatus={actionStatus}
                     actionMessage={actionMessage}
                   />
                  </MobileCollapsibleCard>
 
        {/* Live Logs */}
          <MobileCollapsibleCard
            title="Terminal"
            icon={<Terminal className="w-5 h-5 text-accent-primary" />}
            statusBadge={{ status: 'unknown', label: terminalSummary }}
            summaryText="Click to expand logs"
            defaultExpanded={true}
            defaultExpandedMobile={false}
            localStorageKey="qonduit-dashboard-terminal-expanded"
          >
            <LogsPanel routerStatus={routerStatus} />
          </MobileCollapsibleCard>
 
        {/* RAG Browser Card */}
                         <MobileCollapsibleCard
                           title="RAG Browser"
                           icon={<Database className="w-5 h-5 text-accent-primary" />}
                           summaryText={ragSummary}
                           defaultExpanded={true}
                           defaultExpandedMobile={false}
                           localStorageKey="qonduit-dashboard-rag-expanded"
                         >
                           <div className="flex items-center justify-between mb-3 sm:mb-4">
                              <h3 className="text-sm font-semibold text-text-primary">RAG Browser</h3>
                              <button
                                onClick={() => navigate('/rag')}
                                className="px-3 py-2 rounded-lg text-xs font-medium bg-gradient-to-r from-accent-primary to-accent-tertiary hover:from-accent-primary-hover hover:to-accent-tertiary text-white shadow-lg shadow-accent-primary/20 transition-all duration-200 flex items-center gap-1.5 min-h-[44px]"
                              >
                                Open RAG Browser
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>
   
                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                              {/* Qdrant status */}
                              <div>
                                <span className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wider">Qdrant</span>
                                <div className="flex items-center gap-1.5 mt-1">
                                  {ragHealth?.qdrant.ok ? (
                                    <>
                                      <div className="w-2 h-2 rounded-full bg-status-success" />
                                      <span className="text-xs text-status-success">Connected</span>
                                    </>
                                  ) : ragHealth?.qdrant.ok === false ? (
                                    <>
                                      <div className="w-2 h-2 rounded-full bg-status-error" />
                                      <span className="text-xs text-status-error">Disconnected</span>
                                    </>
                                  ) : (
                                    <span className="text-xs text-text-tertiary">Checking...</span>
                                  )}
                                </div>
                              </div>
   
                              {/* Embeddings status */}
                              <div>
                                <span className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wider">Embeddings</span>
                                <div className="flex items-center gap-1.5 mt-1">
                                  {ragHealth?.embedding.ok ? (
                                    <>
                                      <div className="w-2 h-2 rounded-full bg-status-success" />
                                      <span className="text-xs text-status-success">Available</span>
                                    </>
                                  ) : ragHealth?.embedding.ok === false ? (
                                    <>
                                      <div className="w-2 h-2 rounded-full bg-status-error" />
                                      <span className="text-xs text-status-error">Unavailable</span>
                                    </>
                                  ) : (
                                    <span className="text-xs text-text-tertiary">Checking...</span>
                                  )}
                                </div>
                              </div>
   
                              {/* Projects count */}
                              <div>
                                <span className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wider">Projects</span>
                                <p className="text-xs sm:text-sm text-text-secondary mt-1">
                                  {ragProjects.length} total
                                </p>
                              </div>
   
                              {/* Total points */}
                              <div>
                                <span className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wider">Total Points</span>
                                <p className="text-xs sm:text-sm text-text-secondary mt-1">
                                  {ragTotalPoints.toLocaleString()}
                                </p>
                              </div>
                            </div>
                         </MobileCollapsibleCard>
  
          {/* Coming Soon */}
         <div>
           <ComingSoon items={comingSoonItems} />
         </div>
      </div>

      {/* Toast */}
      {toastMessage && (
        <Toast message={toastMessage} type="success" onClose={() => setToastMessage(null)} />
      )}
    </div>
  );
};

export default DashboardPage;
