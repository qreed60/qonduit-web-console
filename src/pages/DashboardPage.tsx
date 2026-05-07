import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSettings, fetchRouterModels, fetchProviderModels, fetchRouterGpu, launchModel as apiLaunchModel, stopModel as apiStopModel, restartRouterModel as apiRestartRouterModel, testEndpointWithError, testRouterHealthWithError, getRouterStatus, NormalizedModel, GpuStatus, RouterStatus } from '../services/api';
import { Settings } from '../types';
import { ENDPOINTS } from '../config/endpoints';
import StatusBar from '../components/StatusBar';
import Toast from '../components/Toast';
import EndpointCard from '../components/EndpointCard';
import ModelControlCard from '../components/ModelControlCard';
import LogsPanel from '../components/LogsPanel';
import SystemOverview from '../components/SystemOverview';
import ComingSoon from '../components/ComingSoon';
import {
  Settings2,
  Wrench,
  BarChart3,
  Shield,
  Database,
  Loader2,
  ArrowRight,
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
      <div className="flex-1 overflow-y-auto p-6">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-accent-primary to-accent-tertiary bg-clip-text text-transparent">
              Qonduit Control Center
            </h1>
            {contentRefreshing && (
              <span className="flex items-center gap-1 text-[10px] text-text-tertiary">
                <Loader2 className="w-3 h-3 animate-spin" />
                Refreshing…
              </span>
            )}
          </div>
          <p className="text-text-secondary mt-1">
            Monitor and manage your AI infrastructure
          </p>
          {lastUpdated && !contentRefreshing && (
            <p className="text-[10px] text-text-tertiary mt-0.5">
              Updated {formatTimeAgo(lastUpdated)}
            </p>
          )}
        </div>

        {/* System Overview */}
                 <div className="mb-6">
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
                 </div>

        {/* Endpoint Cards */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Endpoints</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        </div>

        {/* Router Model Control — always visible, always enabled */}
                 <div className="mb-6">
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
                 </div>

        {/* Live Logs */}
         <div className="mb-6">
           <LogsPanel routerStatus={routerStatus} />
         </div>
 
         {/* RAG Status Card */}
         <div className="mb-6">
           <div className="bg-bg-card rounded-xl border border-border-primary p-5 shadow-card">
             <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-2">
                 <Database className="w-4 h-4 text-accent-primary" />
                 <h3 className="text-sm font-semibold text-text-primary">RAG Diagnostics</h3>
               </div>
               <button
                 onClick={() => navigate('/rag')}
                 className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-accent-primary to-accent-tertiary hover:from-accent-primary-hover hover:to-accent-tertiary text-white shadow-lg shadow-accent-primary/20 transition-all duration-200 flex items-center gap-1.5"
               >
                 Open RAG
                 <ArrowRight className="w-3 h-3" />
               </button>
             </div>
 
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
               {/* Gateway status */}
               <div>
                 <span className="text-[10px] text-text-tertiary uppercase tracking-wider">Gateway</span>
                 <div className="flex items-center gap-1.5 mt-1">
                   {endpointHealth.gateway === true ? (
                     <>
                       <div className="w-2 h-2 rounded-full bg-status-success" />
                       <span className="text-xs text-status-success">Online</span>
                     </>
                   ) : endpointHealth.gateway === false ? (
                     <>
                       <div className="w-2 h-2 rounded-full bg-status-error" />
                       <span className="text-xs text-status-error">Offline</span>
                     </>
                   ) : (
                     <span className="text-xs text-text-tertiary">Checking...</span>
                   )}
                 </div>
               </div>
 
               {/* Active ingestion */}
               <div>
                 <span className="text-[10px] text-text-tertiary uppercase tracking-wider">Ingestion</span>
                 <p className="text-xs text-text-secondary mt-1">
                   {routerStatus?.running ? 'Router active' : 'Idle'}
                 </p>
               </div>
 
               {/* Known collections */}
               <div>
                 <span className="text-[10px] text-text-tertiary uppercase tracking-wider">Projects</span>
                 <p className="text-xs text-text-secondary mt-1">
                   5 known projects
                 </p>
               </div>
             </div>
           </div>
         </div>
 
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
