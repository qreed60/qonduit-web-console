import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSettings, fetchProviderModels, fetchRouterEndpoints, fetchRouterGpu, fetchRouterSlots, testEndpointWithError, testRouterHealthWithError, GpuStatus } from '../services/api';
import { getRagHealth } from '../services/ragApi';
import { fetchRegistryProjects } from '../services/ragProjectsApi';
import { RagHealthResponse, RagRegistryProject, RouterEndpoint, RouterSlot } from '../types';
import { Settings } from '../types';
import { ENDPOINTS } from '../config/endpoints';
import { getGpuStatusSummaryFields } from '../utils/routerDisplay';
import StatusBar from '../components/StatusBar';
import Toast from '../components/Toast';
import EndpointCard from '../components/EndpointCard';
import SystemOverview from '../components/SystemOverview';
import MobileCollapsibleCard from '../components/MobileCollapsibleCard';
import {
  Settings2,
  Database,
  Loader2,
  ArrowRight,
  Server,
  Globe,
  Cpu,
  MessageSquare,
  Router,
  Activity,
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
   const [routerSlots, setRouterSlots] = useState<RouterSlot[]>([]);
   const [routerEndpoints, setRouterEndpoints] = useState<RouterEndpoint[]>([]);
   const [routerSlotsError, setRouterSlotsError] = useState<string | null>(null);
   const [routerEndpointsError, setRouterEndpointsError] = useState<string | null>(null);
   const [gpuStatus, setGpuStatus] = useState<GpuStatus | null>(null);
   const [gpuError, setGpuError] = useState<string | null>(null);
   const [selectedChatModel, setSelectedChatModel] = useState('');
 
   // ── State: RAG data ──
      const [ragHealth, setRagHealth] = useState<RagHealthResponse | null>(null);
   
      // ── State: RAG registry data ──
      const [registryProjects, setRegistryProjects] = useState<RagRegistryProject[]>([]);
      const registryQdrantBacked = registryProjects.filter(p => p.exists_in_qdrant).length;
      const registryDiscovered = registryProjects.filter(p => p.discovered).length;

  // ── State: action feedback ──
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ── Data fetch (stale-while-revalidate) ──
  const fetchDashboardData = async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    setContentRefreshing(true);

    try {
      // ── Content: fetch slot-based router summary — preserve old data on failure ──
      try {
        const slotData = await fetchRouterSlots();
        setRouterSlots(slotData.slots || []);
        setRouterSlotsError(null);
      } catch (err) {
        setRouterSlotsError(err instanceof Error ? err.message : 'Failed to fetch router slots');
      }

      try {
        const endpointData = await fetchRouterEndpoints();
        setRouterEndpoints(endpointData.endpoints || []);
        setRouterEndpointsError(null);
      } catch (err) {
        setRouterEndpointsError(err instanceof Error ? err.message : 'Failed to fetch router endpoints');
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

      // ── Content: fetch chat models — preserve old data on failure ──
       try {
         const providerModels = await fetchProviderModels(settings.defaultProvider);
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
 
       // ── RAG: fetch registry projects — preserve old data on failure ──
              try {
                const regProjectsData = await fetchRegistryProjects();
                setRegistryProjects(regProjectsData);
              } catch {
                // Keep old registry projects data
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


  const mode = settings.endpointMode;

  // ── Mobile Collapsible Card Summary Data ──
 
   // System Health summary
   const healthStatuses = [endpointHealth.gateway, endpointHealth.llama, endpointHealth.router];
    const healthAllOnline = healthStatuses.every(s => s === true);
    const healthOverallStatus: 'online' | 'offline' | 'loading' | 'unknown' =
     healthStatuses.some(s => s === null) ? 'loading' : healthAllOnline ? 'online' : 'offline';
   const primarySlot = routerSlots.find((slot) => slot.slot_id === 'primary');
   const openHandsSlot = routerSlots.find((slot) => slot.slot_id === 'openhands');
   const slotIsRunning = (slot?: RouterSlot) => slot?.running === true || slot?.status === 'running';
   const slotIsReady = (slot?: RouterSlot) => slot?.ready === true || slotIsRunning(slot);
   const runningSlots = routerSlots.filter(slotIsRunning).length;
   const readySlots = routerSlots.filter(slotIsReady).length;
   const activeEndpoints = routerEndpoints.filter((endpoint) => endpoint.ready === true || endpoint.running === true || endpoint.status === 'running').length;
   const gpuSummary = gpuStatus ? getGpuStatusSummaryFields(gpuStatus) : null;
   const routerSummaryStatus: 'online' | 'offline' | 'loading' | 'unknown' =
     routerSlots.length > 0 ? (runningSlots > 0 || readySlots > 0 ? 'online' : 'offline') : routerSlotsError ? 'offline' : contentRefreshing ? 'loading' : 'unknown';
   const primaryStatus = primarySlot ? (slotIsReady(primarySlot) ? 'Ready' : slotIsRunning(primarySlot) ? 'Running' : String(primarySlot.status || 'Stopped')) : 'Missing';
   const openHandsStatus = openHandsSlot ? (slotIsReady(openHandsSlot) ? 'Ready' : slotIsRunning(openHandsSlot) ? 'Running' : String(openHandsSlot.status || 'Stopped')) : null;
   const routerStatusForOverview = primarySlot ? {
     running: slotIsRunning(primarySlot),
     exists: true,
     running_model: typeof primarySlot.model === 'string' ? primarySlot.model : null,
     context_size: typeof primarySlot.context_size === 'number' ? primarySlot.context_size : null,
   } : null;
   const healthSummary = `Gateway · Direct · Router · ${primaryStatus}`;
  
    // Endpoints summary
   const onlineCount = healthStatuses.filter(s => s === true).length;
   const totalEndpoints = healthStatuses.length;
   const endpointStatus: 'online' | 'offline' | 'loading' | 'unknown' =
     healthStatuses.some(s => s === null) ? 'loading' : onlineCount === totalEndpoints ? 'online' : onlineCount > 0 ? 'offline' : 'unknown';
   const endpointSummaryText = 'Gateway, Direct, Router';
   const endpointSummaryLabel = `${onlineCount}/${totalEndpoints} Online`;

 
   // RAG Browser summary
      const ragQdrantStatus = ragHealth?.qdrant.ok ? 'Connected' : ragHealth?.qdrant.ok === false ? 'Disconnected' : 'Checking';
      const ragEmbedStatus = ragHealth?.embedding.ok ? 'Available' : ragHealth?.embedding.ok === false ? 'Unavailable' : 'Checking';
      const ragSummary = `Qdrant: ${ragQdrantStatus} · Embeddings: ${ragEmbedStatus} · ${registryProjects.length} projects`;
 
   const quickActions = [
     { id: 'chat', label: 'Chat', description: 'Send messages to your model', icon: MessageSquare, route: '/chat', color: 'text-accent-primary' },
     { id: 'models', label: 'Models', description: 'Browse and manage models', icon: Cpu, route: '/models', color: 'text-accent-secondary' },
     { id: 'router', label: 'Router', description: 'Manage router slots', icon: Router, route: '/router', color: 'text-accent-tertiary' },
     { id: 'rag', label: 'RAG Browser', description: 'Search knowledge bases', icon: Database, route: '/rag', color: 'text-accent-primary' },
     { id: 'diagnostics', label: 'Diagnostics', description: 'Health and debugging tools', icon: Activity, route: '/diagnostics', color: 'text-status-warning' },
     { id: 'settings', label: 'Settings', description: 'Configure endpoints & gateway', icon: Settings2, route: '/settings', color: 'text-text-secondary' },
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
                        routerStatus={routerStatusForOverview}
                        chatModel={selectedChatModel}
                        routerRunningModel={routerStatusForOverview?.running_model || undefined}
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
 
        <MobileCollapsibleCard
          title="Slot Router Summary"
          icon={<Router className="w-5 h-5 text-accent-tertiary" />}
          statusBadge={{ status: routerSummaryStatus, label: routerSlots.length > 0 ? `${runningSlots}/${routerSlots.length} running` : routerSlotsError ? 'Unavailable' : 'Loading' }}
          summaryText={routerSlots.length > 0 ? `${readySlots} ready · ${activeEndpoints} active endpoints` : routerSlotsError || 'Waiting for slot router data'}
          metrics={[
            { label: 'Total Slots', value: String(routerSlots.length) },
            { label: 'Running', value: String(runningSlots) },
            { label: 'Ready', value: String(readySlots) },
            { label: 'Endpoints', value: String(activeEndpoints) },
          ]}
          action={{ label: 'Open Router', onClick: () => navigate('/router'), variant: 'primary' }}
          defaultExpanded={true}
          defaultExpandedMobile={false}
          localStorageKey="qonduit-dashboard-slot-router-expanded"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="rounded-lg border border-border-subtle bg-bg-secondary/40 p-3">
              <span className="text-[10px] text-text-tertiary uppercase tracking-wider">Primary</span>
              <p className="text-sm font-mono text-text-primary mt-1">{primaryStatus}</p>
            </div>
            {openHandsStatus && (
              <div className="rounded-lg border border-border-subtle bg-bg-secondary/40 p-3">
                <span className="text-[10px] text-text-tertiary uppercase tracking-wider">OpenHands</span>
                <p className="text-sm font-mono text-text-primary mt-1">{openHandsStatus}</p>
              </div>
            )}
            <div className="rounded-lg border border-border-subtle bg-bg-secondary/40 p-3">
              <span className="text-[10px] text-text-tertiary uppercase tracking-wider">Detected GPU Memory</span>
              <p className="text-sm font-mono text-text-primary mt-1">
                {gpuSummary ? `${gpuSummary.used} used / ${gpuSummary.free} free` : gpuError || 'Unavailable'}
              </p>
              {gpuSummary && <p className="text-[10px] text-text-tertiary mt-1">Total: {gpuSummary.total}</p>}
            </div>
          </div>
          {(routerSlotsError || routerEndpointsError || gpuError) && (
            <div className="mt-3 rounded-lg border border-status-warning/20 bg-status-warning/5 p-3 text-xs text-status-warning">
              {[routerSlotsError, routerEndpointsError, gpuError].filter(Boolean).join(' · ')}
            </div>
          )}
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
                            
                                                          {/* Registry projects count */}
                                                          <div>
                                                            <span className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wider">Projects</span>
                                                            <p className="text-xs sm:text-sm text-text-secondary mt-1">
                                                              {registryProjects.length} total
                                                            </p>
                                                          </div>
                            
                                                          {/* Qdrant-backed count */}
                                                          <div>
                                                            <span className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wider">Qdrant-Backed</span>
                                                            <p className="text-xs sm:text-sm text-text-secondary mt-1">
                                                              {registryQdrantBacked} of {registryProjects.length}
                                                            </p>
                                                          </div>
                            
                                                          {/* Discovered/unregistered count */}
                                                          <div>
                                                            <span className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wider">Discovered</span>
                                                            <p className="text-xs sm:text-sm text-status-warning mt-1">
                                                              {registryDiscovered} unregistered
                                                            </p>
                                                          </div>
                            
                                                          {/* Total points */}
                                                          <div>
                                                            <span className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wider">Total Points</span>
                                                            <p className="text-xs sm:text-sm text-text-secondary mt-1">
                                                              {registryProjects.reduce((sum, p) => sum + p.points_count, 0).toLocaleString()}
                                                            </p>
                                                          </div>
                                                        </div>
                         </MobileCollapsibleCard>
 
           {/* Quick Actions */}
          <div className="mb-4 sm:mb-6">
            <h2 className="text-base font-semibold text-text-primary mb-3">Quick Actions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {quickActions.map(action => (
                <button
                  key={action.id}
                  onClick={() => navigate(action.route)}
                  className="bg-bg-card rounded-xl border border-border-primary p-4 hover:border-accent-primary/30 hover:bg-accent-primary/5 transition-all duration-200 group text-left relative"
                >
                  <action.icon className={`w-5 h-5 ${action.color} mb-2 group-hover:scale-110 transition-transform`} />
                  <p className="text-sm font-medium text-text-primary">{action.label}</p>
                  <p className="text-[10px] sm:text-xs text-text-tertiary mt-0.5">{action.description}</p>
                  <ArrowRight className="w-3 h-3 text-text-tertiary absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
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
