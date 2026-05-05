import React, { useState, useEffect, useRef } from 'react';
import { getSettings, getRouterStatus, fetchRouterModels, fetchRouterGpu, launchModel as apiLaunchModel, stopModel as apiStopModel, restartRouterModel as apiRestartRouterModel, NormalizedModel } from '../services/api';
import { ENDPOINTS } from '../config/endpoints';
import { GpuInfo } from '../types';
import Toast from '../components/Toast';
import {
  Cpu,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Play,
  Square,
  RotateCcw,
  HardDrive,
  MemoryStick,
} from 'lucide-react';

/**
 * Context size presets supporting up to 262k context models.
 */
const PRESET_CTX = [4096, 8192, 16384, 32768, 65536, 131072, 262144];

const RouterPage: React.FC = () => {
  const settings = getSettings();
  const mode = settings.endpointMode;

  // ── State: separate loading phases ──
   const [refreshing, setRefreshing] = useState(false);
   const inFlightRef = useRef(false);
   const hasEverLoadedRef = useRef(false);
 
   // ── State: content data (preserved across refreshes) ──
   const [routerStatus, setRouterStatus] = useState<{ running: boolean; exists: boolean } | null>(null);
   const [routerModels, setRouterModels] = useState<NormalizedModel[]>([]);
   const [suggestedCtx, setSuggestedCtx] = useState<number | null>(null);
   const [selectedModel, setSelectedModel] = useState('');
   const [ctxSize, setCtxSize] = useState(4096);
   const [vramData, setVramData] = useState<{ total: string; used: string; free: string } | null>(null);
   const [gpuRows, setGpuRows] = useState<Array<{ index: number; name: string; total: string; used: string; free: string; isDisplay?: boolean }>>([]);
 
   // ── State: errors & timestamps ──
   const [contentError, setContentError] = useState<string | null>(null);
   const [vramError, setVramError] = useState<string | null>(null);
   const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  // ── State: action feedback ──
  const [actionLoading, setActionLoading] = useState(false);
  const [actionStatus, setActionStatus] = useState<'idle' | 'launching' | 'stopping' | 'restarting' | 'success' | 'error'>('idle');
  const [actionMessage, setActionMessage] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Track the context size used when the model was launched,
  // so we can detect when context has changed and needs restart.
  const [runningCtxSize, setRunningCtxSize] = useState<number | null>(null);

  // ── Data fetch (stale-while-revalidate) ──
   const fetchData = async () => {
     if (inFlightRef.current) return;
     inFlightRef.current = true;
 
     // Use ref (not state) to avoid stale closure capturing initialLoading
     if (hasEverLoadedRef.current) {
       setRefreshing(true);
       setContentError(null);
     }
 
     try {
       // ── Health: fetch router status — update immediately ──
       try {
         const status = await getRouterStatus();
         setRouterStatus({ running: status.running, exists: status.exists });
       } catch {
         // Health failure — immediately show null (unknown/offline)
         setRouterStatus(null);
       }
 
       // ── Content: fetch models — preserve old data on failure ──
       try {
         const data = await fetchRouterModels();
         setRouterModels(data.models || []);
         if (data.suggestedCtx) setSuggestedCtx(data.suggestedCtx);
         setContentError(null);
       } catch {
         setContentError('Model list refresh failed — showing last known data');
       }
 
       // ── Content: fetch GPU/VRAM — preserve old data on failure ──
       try {
         const gpu = await fetchRouterGpu();
         if (gpu.ok) {
           setVramData({
             total: gpu.memory_total_human,
             used: gpu.memory_used_human,
             free: gpu.memory_free_human,
           });
           setVramError(null);
           const rows = gpu.gpus.map((g: GpuInfo) => ({
             index: g.index,
             name: g.name,
             total: `${(g.memory_total_mib / 1024).toFixed(1)} GiB`,
             used: `${(g.memory_used_mib / 1024).toFixed(1)} GiB`,
             free: `${(g.memory_free_mib / 1024).toFixed(1)} GiB`,
             isDisplay: /quadro|display|integrated|igd/i.test(g.name),
           }));
           setGpuRows(rows);
         } else {
           setVramError('VRAM unavailable — GPU endpoint returned ok:false');
         }
       } catch (err) {
         setVramError(err instanceof Error ? err.message : 'Failed to fetch GPU status');
       }
 
       setLastUpdated(Date.now());
     } finally {
       setRefreshing(false);
       inFlightRef.current = false;
       hasEverLoadedRef.current = true;
     }
   };

  useEffect(() => {
    fetchData();
    // Refresh every 10 seconds
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Track running context size when model starts/stops
  useEffect(() => {
    if (routerStatus?.running && selectedModel) {
      setRunningCtxSize(ctxSize);
    } else if (!routerStatus?.running) {
      setRunningCtxSize(null);
    }
  }, [routerStatus?.running, selectedModel, ctxSize]);

  // Auto-select first model if none selected
  useEffect(() => {
    if (!selectedModel && routerModels.length > 0) {
      setSelectedModel(routerModels[0].name);
    }
  }, [routerModels, selectedModel]);

  const isStale = (routerModels.length > 0 || vramData) && routerStatus === null;

  const handleLaunch = async () => {
    if (!selectedModel) return;
    setActionLoading(true);
    setActionStatus('launching');
    setActionMessage('');
    try {
      const result = await apiLaunchModel(selectedModel, ctxSize);
      if (result.ok) {
        setActionStatus('success');
        setActionMessage(result.message || 'Model launched successfully');
        setToastMessage('Model launched successfully');
        setRouterStatus(prev => prev ? { ...prev, running: true } : null);
      } else {
        setActionStatus('error');
        setActionMessage(result.message || 'Failed to launch model');
      }
    } catch (err) {
      setActionStatus('error');
      setActionMessage(err instanceof Error ? err.message : 'Failed to launch model');
    } finally {
      setActionLoading(false);
      setTimeout(() => { setActionMessage(''); setActionStatus('idle'); }, 5000);
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
        setRouterStatus(prev => prev ? { ...prev, running: false } : null);
      } else {
        setActionStatus('error');
        setActionMessage(result.message || 'Failed to stop model');
      }
    } catch (err) {
      setActionStatus('error');
      setActionMessage(err instanceof Error ? err.message : 'Failed to stop model');
    } finally {
      setActionLoading(false);
      setTimeout(() => { setActionMessage(''); setActionStatus('idle'); }, 5000);
    }
  };

  const handleRestart = async () => {
     if (!selectedModel) return;
     setActionLoading(true);
     setActionStatus('restarting');
     setActionMessage('');
     try {
       const result = await apiRestartRouterModel(selectedModel, ctxSize);
       if (result.ok) {
         setActionStatus('success');
         setActionMessage(result.message || 'Model restarted successfully');
         setToastMessage('Model restarted successfully');
         setRouterStatus(prev => prev ? { ...prev, running: true } : null);
       } else {
         setActionStatus('error');
         setActionMessage(result.message || 'Failed to restart model');
       }
     } catch (err) {
       const msg = err instanceof Error ? err.message : 'Failed to restart model';
       if (msg.includes('model_required') || msg.includes('model')) {
         setActionMessage('No model selected for restart. Please select a model first.');
       } else {
         setActionMessage(msg);
       }
       setActionStatus('error');
     } finally {
       setActionLoading(false);
       setTimeout(() => { setActionMessage(''); setActionStatus('idle'); }, 5000);
     }
   };

  const isRunning = routerStatus?.running;
  const canLaunch = !isRunning && !actionLoading && routerModels.length > 0 && !!selectedModel;
  const canStop = isRunning && !actionLoading;
  const canRestart = isRunning && !actionLoading && !!selectedModel;

  // Context size has changed from what was used at launch
  const ctxChanged = isRunning && runningCtxSize !== null && ctxSize !== runningCtxSize;

  const handlePresetClick = (ctx: number) => {
    setCtxSize(ctx);
  };

  const formatTimeAgo = (ts: number) => {
    const diff = Date.now() - ts;
    const secs = Math.floor(diff / 1000);
    if (secs < 10) return 'just now';
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    return `${mins}m ago`;
  };

  return (
      <div className={`p-6 h-full flex flex-col ${isStale ? 'opacity-80' : ''}`}>
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold bg-gradient-to-r from-accent-primary to-accent-tertiary bg-clip-text text-transparent">
              Router
            </h2>
            {refreshing && (
              <span className="flex items-center gap-1 text-[10px] text-text-tertiary">
                <Loader2 className="w-3 h-3 animate-spin" />
                Refreshing…
              </span>
            )}
            {isStale && (
              <span className="flex items-center gap-1 text-[10px] text-status-warning bg-status-warning/10 px-2 py-0.5 rounded-full">
                <AlertCircle className="w-3 h-3" />
                Data stale
              </span>
            )}
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Launch and manage local GGUF models via the Qonduit Router
          </p>
          {lastUpdated && !refreshing && (
            <p className="text-[10px] text-text-tertiary mt-0.5">
              Updated {formatTimeAgo(lastUpdated)}
            </p>
          )}
        </div>
  
        {/* Main Content */}
        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Router Status */}
          <div className="bg-bg-card rounded-xl border border-border-primary p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text-primary">Router Status</h3>
              {refreshing && !routerStatus ? (
                <Loader2 className="w-4 h-4 text-text-tertiary animate-spin" />
              ) : routerStatus ? (
                <div className="flex items-center gap-2">
                  {routerStatus.running ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-status-success" />
                      <span className="text-xs font-medium text-status-success">Running</span>
                    </>
                  ) : routerStatus.exists ? (
                    <>
                      <AlertCircle className="w-4 h-4 text-status-warning" />
                      <span className="text-xs font-medium text-status-warning">Stopped</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-text-tertiary" />
                      <span className="text-xs font-medium text-text-tertiary">Not Found</span>
                    </>
                  )}
                </div>
              ) : (
                <span className="text-xs text-text-tertiary">Unknown</span>
              )}
            </div>
            <div className="bg-bg-secondary/50 rounded-lg p-3 border border-border-subtle">
              <p className="text-xs text-text-secondary mb-1">Router Endpoint</p>
              <p className="text-xs font-mono text-text-primary break-all">{ENDPOINTS.router[mode]}</p>
            </div>
          </div>
  
          {/* VRAM Summary */}
           <div className="bg-bg-card rounded-xl border border-border-primary p-5">
             <div className="flex items-center justify-between mb-3">
               <h3 className="text-sm font-semibold text-text-primary">Detected GPU Memory</h3>
               {vramData ? (
                 <MemoryStick className="w-4 h-4 text-accent-primary" />
               ) : (
                 <MemoryStick className="w-4 h-4 text-text-tertiary" />
               )}
             </div>
             {vramData ? (
               <div className="space-y-3">
                 <div className="grid grid-cols-3 gap-3">
                   <div className="bg-bg-secondary/50 rounded-lg p-2.5 border border-border-subtle text-center">
                     <p className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">Total</p>
                     <p className="text-sm font-mono text-text-primary">{vramData.total}</p>
                   </div>
                   <div className="bg-bg-secondary/50 rounded-lg p-2.5 border border-border-subtle text-center">
                     <p className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">Used</p>
                     <p className="text-sm font-mono text-status-warning">{vramData.used}</p>
                   </div>
                   <div className="bg-bg-secondary/50 rounded-lg p-2.5 border border-border-subtle text-center">
                     <p className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">Free</p>
                     <p className="text-sm font-mono text-status-success">{vramData.free}</p>
                   </div>
                 </div>
                 {/* Per-GPU rows */}
                 {gpuRows.length > 0 && (
                   <div className="bg-bg-secondary/30 border border-border-subtle rounded-lg overflow-hidden">
                     <div className="grid grid-cols-5 gap-2 px-3 py-1.5 bg-bg-tertiary/50 text-[10px] font-medium text-text-tertiary uppercase tracking-wider">
                       <span>GPU</span>
                       <span>Name</span>
                       <span className="text-right">Total</span>
                       <span className="text-right">Used</span>
                       <span className="text-right">Free</span>
                     </div>
                     {gpuRows.map((gpu) => (
                       <div key={gpu.index} className={`grid grid-cols-5 gap-2 px-3 py-2 text-xs border-t border-border-subtle ${gpu.isDisplay ? 'bg-status-warning/5' : ''}`}>
                         <span className="font-mono text-text-tertiary">#{gpu.index}</span>
                         <span className="text-text-primary truncate" title={gpu.name}>
                           {gpu.name}
                           {gpu.isDisplay && (
                             <span className="ml-1 text-[10px] text-status-warning">(display)</span>
                           )}
                         </span>
                         <span className="font-mono text-text-primary text-right">{gpu.total}</span>
                         <span className="font-mono text-status-warning text-right">{gpu.used}</span>
                         <span className="font-mono text-status-success text-right">{gpu.free}</span>
                       </div>
                     ))}
                   </div>
                 )}
               </div>
             ) : (
               <div className="bg-bg-secondary/50 rounded-lg p-3 border border-border-subtle">
                 <p className="text-xs text-text-tertiary">{vramError || 'VRAM data unavailable'}</p>
               </div>
             )}
           </div>
  
          {/* Model Cards */}
          <div className="bg-bg-card rounded-xl border border-border-primary p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text-primary">Launchable Models</h3>
              {routerStatus?.running && (
                <span className="flex items-center gap-1 text-[10px] font-medium text-status-success bg-status-success/10 px-2 py-0.5 rounded-full">
                  <Cpu className="w-3 h-3" />
                  Model Active
                </span>
              )}
            </div>
            {!hasEverLoadedRef.current ? (
               <div className="flex items-center justify-center py-8">
                 <Loader2 className="w-6 h-6 text-text-tertiary animate-spin" />
               </div>
             ) : routerModels.length > 0 ? (
              <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4 ${isStale ? 'opacity-70' : ''}`}>
                {routerModels.map((model) => {
                                  const isSelected = model.name === selectedModel;
                                  const isThisRunning = isRunning && isSelected;
                                  return (
                                    <button
                                      key={model.name}
                                      onClick={() => setSelectedModel(model.name)}
                                      className={`text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                                        isSelected
                                          ? 'border-accent-primary bg-accent-primary/5'
                                          : isThisRunning
                                          ? 'border-status-success bg-status-success/5'
                                          : 'border-border-subtle bg-bg-secondary/30 hover:border-border-primary'
                                      }`}
                                    >
                                      <div className="flex items-start justify-between mb-2">
                                        <p className="text-xs font-mono text-text-primary truncate flex-1" title={model.name}>
                                          {model.name}
                                        </p>
                                        {isThisRunning && (
                                          <CheckCircle2 className="w-3.5 h-3.5 text-status-success flex-shrink-0 ml-2" />
                                        )}
                                      </div>
                                      {model.path && (
                                        <p className="text-[10px] font-mono text-text-tertiary truncate mb-2" title={model.path}>
                                          {model.path}
                                        </p>
                                      )}
                                      <div className="flex items-center gap-2 text-[10px] text-text-tertiary flex-wrap">
                                        {model.parameterSize && model.parameterSize !== 'unknown' ? (
                                          <span className="flex items-center gap-1">
                                            <Cpu className="w-3 h-3" />
                                            {model.parameterSize}
                                          </span>
                                        ) : (
                                          <span className="text-text-tertiary/50">Param: unknown</span>
                                        )}
                                        {model.fileSize && model.fileSize !== 'unknown' ? (
                                          <span className="flex items-center gap-1">
                                            <HardDrive className="w-3 h-3" />
                                            {model.fileSize}
                                          </span>
                                        ) : (
                                          <span className="text-text-tertiary/50">
                                            <HardDrive className="w-3 h-3 inline" />
                                            Size: unknown
                                          </span>
                                        )}
                                        {suggestedCtx && (
                                          <span className="text-accent-primary">ctx: {suggestedCtx}</span>
                                        )}
                                      </div>
                                    </button>
                                  );
                                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-text-tertiary text-sm">No models available</p>
                <p className="text-text-tertiary/60 text-xs mt-1">Add GGUF files to the Router's model directory</p>
              </div>
            )}
  
            {/* Content Error Warning */}
            {contentError && (
              <div className="mt-2 p-2 bg-status-warning/5 border border-status-warning/20 rounded-lg">
                <p className="text-[10px] text-status-warning flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {contentError}
                </p>
              </div>
            )}
  
            {/* VRAM Error Warning */}
            {vramError && !vramData && (
              <div className="mt-2 p-2 bg-status-warning/5 border border-status-warning/20 rounded-lg">
                <p className="text-[10px] text-status-warning flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {vramError}
                </p>
              </div>
            )}
  
            {/* Context Size Selector */}
            {routerModels.length > 0 && (
              <div className="mb-4 pt-4 border-t border-border-subtle">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-text-secondary">Context Size</label>
                  <span className="text-xs font-mono text-accent-primary font-semibold">{ctxSize.toLocaleString()}</span>
                </div>
                <div className="flex gap-1.5 mb-2">
                  {PRESET_CTX.map((ctx) => (
                    <button
                      key={ctx}
                      onClick={() => handlePresetClick(ctx)}
                      disabled={actionLoading}
                      className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                        ctxSize === ctx
                          ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/30'
                          : 'bg-bg-secondary border border-border-subtle text-text-tertiary hover:text-text-primary hover:border-border-primary disabled:opacity-50 disabled:cursor-not-allowed'
                      }`}
                    >
                      {ctx >= 1000 ? `${ctx / 1000}k` : ctx}
                    </button>
                  ))}
                </div>
                {suggestedCtx && ctxSize !== suggestedCtx && (
                  <p className="text-[10px] text-accent-primary">Suggested: {suggestedCtx}</p>
                )}
                {ctxChanged && (
                  <p className="text-[10px] text-status-warning flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3 h-3" />
                    Context changed from {runningCtxSize?.toLocaleString()} — restart to apply
                  </p>
                )}
              </div>
            )}
  
            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleLaunch}
                disabled={!canLaunch}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                  canLaunch
                    ? 'bg-gradient-to-r from-accent-primary to-accent-tertiary hover:from-accent-primary-hover hover:to-accent-tertiary text-white shadow-lg shadow-accent-primary/20'
                    : 'bg-bg-tertiary text-text-secondary border border-border-primary cursor-not-allowed'
                }`}
              >
                {actionLoading && actionStatus === 'launching' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                {actionLoading && actionStatus === 'launching' ? 'Launching...' : 'Start'}
              </button>
              <button
                onClick={handleRestart}
                disabled={!canRestart}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                  canRestart
                    ? ctxChanged
                      ? 'bg-status-warning/10 text-status-warning border border-status-warning/30 hover:bg-status-warning/20 animate-pulse'
                      : 'bg-accent-secondary/10 text-accent-secondary border border-accent-secondary/20 hover:bg-accent-secondary/20'
                    : 'bg-bg-tertiary text-text-secondary border border-border-primary cursor-not-allowed'
                }`}
              >
                {actionLoading && actionStatus === 'restarting' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RotateCcw className="w-4 h-4" />
                )}
                {actionLoading && actionStatus === 'restarting' ? 'Restarting...' : 'Restart'}
              </button>
              <button
                onClick={handleStop}
                disabled={!canStop}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                  canStop
                    ? 'bg-status-error/10 text-status-error border border-status-error/20 hover:bg-status-error/20'
                    : 'bg-bg-tertiary text-text-secondary border border-border-primary cursor-not-allowed'
                }`}
              >
                {actionLoading && actionStatus === 'stopping' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                {actionLoading && actionStatus === 'stopping' ? 'Stopping...' : 'Stop'}
              </button>
            </div>
  
            {/* Action Message */}
            {actionMessage && (
              <div className={`mt-3 flex items-start gap-2 px-3 py-2.5 rounded-lg text-xs ${
                actionStatus === 'success'
                  ? 'bg-status-success/10 text-status-success border border-status-success/20'
                  : actionStatus === 'error'
                  ? 'bg-status-error/10 text-status-error border border-status-error/20'
                  : 'bg-bg-secondary/50 text-text-secondary border border-border-subtle'
              }`}>
                {actionStatus === 'success' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                ) : actionStatus === 'error' ? (
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                ) : null}
                <span>{actionMessage}</span>
              </div>
            )}
  
            {/* Info note */}
            <p className="text-[10px] text-text-tertiary mt-3 text-center">
              Select a model card above, then use the action buttons. Context changes take effect on launch or restart.
            </p>
          </div>
  
          {/* About the Router */}
           <div className="bg-bg-card rounded-xl border border-border-primary p-5">
             <h3 className="text-sm font-semibold text-text-primary mb-3">About the Router</h3>
             <p className="text-xs text-text-secondary leading-relaxed">
               The Qonduit Router is a control-plane service that manages model lifecycle.
               It launches and stops llama.cpp servers that serve GGUF models via the Direct endpoint.
               Router operation is independent of your chat provider setting (Gateway or Direct) —
               you can launch models from the Dashboard at any time.
             </p>
             <p className="text-[10px] text-text-tertiary mt-2">
               Note: GPU memory shown includes all detected GPUs (including display adapters). Not all detected VRAM may be available for inference.
             </p>
           </div>
        </div>
  
        {/* Toast */}
        {toastMessage && (
          <Toast message={toastMessage} type="success" onClose={() => setToastMessage(null)} />
        )}
      </div>
    );
  };
  
  export default RouterPage;
