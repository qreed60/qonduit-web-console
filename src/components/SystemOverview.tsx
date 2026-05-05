import React, { useState, useEffect } from 'react';
import StatusBadge from './StatusBadge';
import { GpuStatus } from '../types';
import {
  Globe,
  Zap,
  Router,
  Server,
  RefreshCw,
  Cpu,
  MemoryStick,
  AlertCircle,
} from 'lucide-react';

interface SystemOverviewProps {
  endpointHealth: {
    gateway: boolean | null;
    llama: boolean | null;
    router: boolean | null;
  };
  healthLoading: boolean;
  routerStatus: { running: boolean; exists: boolean; running_model?: string | null; context_size?: number | null } | null;
  /** The chat provider's selected model (from Settings or ChatPage) */
  chatModel: string;
  /** The router's currently running model name from /status (may be null) */
  routerRunningModel?: string;
  gpuStatus?: GpuStatus | null;
  gpuError?: string | null;
  endpointErrors?: Record<string, string | null>;
  onRefresh: () => void;
}

const SystemOverview: React.FC<SystemOverviewProps> = ({
  endpointHealth,
  healthLoading,
  routerStatus,
  chatModel,
  routerRunningModel,
  gpuStatus,
  gpuError,
  endpointErrors,
  onRefresh,
}) => {
  const isRunning = routerStatus?.running;

  // Track whether we've ever had a successful health check
  const [hasEverLoaded, setHasEverLoaded] = useState(false);

  useEffect(() => {
    if (routerStatus !== null || endpointHealth.router !== null) {
      setHasEverLoaded(true);
    }
  }, [routerStatus, endpointHealth.router]);

  // Determine if router is offline (health check failed after previously loading)
  const routerOffline = hasEverLoaded && endpointHealth.router === false;

  const lastChecked = Date.now();

  // Determine the router running model display text
  const routerRunningDisplay = routerRunningModel
    ? routerRunningModel
    : isRunning
    ? 'unknown until next launch/status update'
    : undefined;

  const healthCards = [
    {
      key: 'gateway' as const,
      label: 'Gateway',
      icon: Globe,
      status: endpointHealth.gateway,
      loadingLabel: 'Checking Gateway...',
      onlineLabel: 'Gateway Online',
      offlineLabel: 'Gateway Offline',
      unknownLabel: 'Gateway Unknown',
    },
    {
      key: 'llama' as const,
      label: 'Direct',
      icon: Zap,
      status: endpointHealth.llama,
      loadingLabel: 'Checking Direct...',
      onlineLabel: 'Direct Online',
      offlineLabel: 'Direct Offline',
      unknownLabel: 'Direct Unknown',
    },
    {
      key: 'router' as const,
      label: 'Router',
      icon: Router,
      status: endpointHealth.router,
      loadingLabel: 'Checking Router...',
      onlineLabel: 'Router Online',
      offlineLabel: 'Router Offline',
      unknownLabel: routerOffline ? 'Router Offline' : 'Router Unknown',
    },
    {
      key: 'model' as const,
      label: 'Model',
      icon: Server,
      status: chatModel ? true : isRunning ? true : !routerStatus ? null : false,
      loadingLabel: 'Checking Model...',
      onlineLabel: chatModel || (isRunning ? 'Model Running' : 'No Model'),
      offlineLabel: 'No Model',
      unknownLabel: 'Model Unknown',
    },
  ];

  const getStatus = (status: boolean | null): 'online' | 'offline' | 'loading' | 'unknown' => {
    if (status === true) return 'online';
    if (status === false) return 'offline';
    return 'unknown';
  };

  return (
    <div className="bg-bg-card rounded-xl border border-border-primary p-5 shadow-card">
      {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-semibold text-text-primary">System Health</h2>
                {chatModel && (
                  <StatusBadge status="online" label={chatModel} />
                )}
                {routerOffline && (
                  <span className="flex items-center gap-1 text-[10px] text-status-warning bg-status-warning/10 px-2 py-0.5 rounded-full">
                    <AlertCircle className="w-3 h-3" />
                    Router Offline
                  </span>
                )}
              </div>
        <button
          onClick={onRefresh}
          disabled={healthLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border-primary text-text-secondary hover:bg-bg-tertiary hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${healthLoading ? 'animate-spin' : ''}`} />
          {healthLoading ? 'Checking...' : 'Refresh'}
        </button>
      </div>

      {/* Health Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {healthCards.map(({ label, icon: Icon, status, loadingLabel, onlineLabel, offlineLabel, unknownLabel }) => (
          <div
            key={label}
            className={`flex items-center gap-3 px-3 py-2.5 bg-bg-secondary rounded-lg border border-border-subtle ${
              routerOffline && label === 'Router' ? 'border-status-warning/30' : ''
            }`}
          >
            <Icon className="w-4 h-4 text-text-tertiary flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">{label}</p>
              <StatusBadge
                status={getStatus(status)}
                label={
                  status === null && healthLoading ? loadingLabel :
                  status === true ? onlineLabel :
                  status === false ? offlineLabel :
                  unknownLabel
                }
                size="sm"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Error Details */}
       {endpointErrors && Object.values(endpointErrors).some((e) => e) && (
         <div className="bg-status-error/5 border border-status-error/15 rounded-lg p-3">
           <h4 className="text-[10px] font-medium text-status-error mb-1.5 uppercase tracking-wider">Health Check Errors</h4>
           <div className="space-y-1">
             {Object.entries(endpointErrors)
               .filter(([, error]) => error)
               .map(([key, error]) => (
                 <p key={key} className="text-[10px] text-status-error/80 font-mono break-all leading-relaxed">
                   <span className="font-medium text-status-error/90">{key}:</span> {error}
                 </p>
               ))}
           </div>
         </div>
       )}
 
       {/* Model Info Bar */}
                {(chatModel || routerRunningDisplay) && (
                  <div className="flex items-center justify-between px-3 py-2 bg-bg-secondary/50 rounded-lg border border-border-subtle">
                    <div className="flex items-center gap-3">
                      <Server className="w-3.5 h-3.5 text-text-tertiary" />
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-text-secondary">Chat:</span>
                        <span className="text-xs font-mono text-text-primary truncate max-w-[150px]" title={chatModel || ''}>
                          {chatModel || '—'}
                        </span>
                      </div>
                      {routerRunningDisplay && (
                        <>
                          <span className="text-text-tertiary">·</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-text-secondary">Router:</span>
                            <span className="text-xs font-mono text-text-primary truncate max-w-[150px]" title={routerRunningDisplay}>
                              {routerRunningDisplay}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                    <span className="text-[10px] text-text-tertiary">
                      Last checked: {new Date(lastChecked).toLocaleTimeString()}
                    </span>
                  </div>
                )}
  
        {/* VRAM Summary */}
                {gpuStatus && (
                  <div className="mt-3 flex items-center gap-3 px-3 py-2 bg-bg-secondary/50 rounded-lg border border-border-subtle">
                    <MemoryStick className="w-3.5 h-3.5 text-accent-primary flex-shrink-0" />
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-text-secondary">Detected GPU Memory:</span>
                      <span className="text-text-secondary">Total: <span className="font-mono text-text-primary">{gpuStatus.memory_total_human}</span></span>
                      <span className="text-text-secondary">Used: <span className="font-mono text-status-warning">{gpuStatus.memory_used_human}</span></span>
                      <span className="text-text-secondary">Free: <span className="font-mono text-status-success">{gpuStatus.memory_free_human}</span></span>
                    </div>
                  </div>
                )}
                {gpuError && !gpuStatus && (
                  <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-status-error/5 rounded-lg border border-status-error/15">
                    <Cpu className="w-3.5 h-3.5 text-status-error flex-shrink-0" />
                    <span className="text-xs text-status-error">VRAM unavailable: {gpuError}</span>
                  </div>
                )}
              </div>
            );
          };
  
          export default SystemOverview;
