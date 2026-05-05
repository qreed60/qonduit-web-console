import React, { useState, useEffect } from 'react';
import { fetchGatewayModels, fetchDirectModels, fetchRouterModels } from '../services/api';
import { apiPath } from '../config/endpoints';
import Toast from '../components/Toast';
import {
  RefreshCw,
  Copy,
  CheckCircle2,
  Globe,
  Zap,
  Server,
  Router,
  Cpu,
  HardDrive,
  MemoryStick,
} from 'lucide-react';

interface ModelCardData {
  id: string;
  name: string;
  provider: 'Gateway' | 'Direct' | 'Router';
  sourceUrl: string;
  created?: number;
  ownedBy?: string;
  path?: string;
  parameterSize?: string;
  fileSize?: string;
}

interface ProviderError {
  provider: string;
  url: string;
  error: string;
}

interface VramData {
  total: string;
  used: string;
  free: string;
}

const ModelsPage: React.FC = () => {
  const [models, setModels] = useState<ModelCardData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providerErrors, setProviderErrors] = useState<ProviderError[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [vramData, setVramData] = useState<VramData | null>(null);
  const [vramError, setVramError] = useState<string | null>(null);

  useEffect(() => {
    loadModels();
    loadVram();
  }, []);

  const loadModels = async () => {
      setLoading(true);
      setError(null);
      setModels([]);
      setProviderErrors([]);
  
      const timeout = 10000; // 10 seconds per provider
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
  
      try {
        const results = await Promise.allSettled([
          fetchGatewayModels().then(models => ({ provider: 'Gateway' as const, models, url: apiPath('gateway', '/v1/models') })),
          fetchDirectModels().then(models => ({ provider: 'Direct' as const, models, url: apiPath('llama', '/v1/models') })),
          fetchRouterModels().then(result => ({ provider: 'Router' as const, models: result.models, url: apiPath('router', '/api/v1/qonduit-router/models'), suggestedCtx: result.suggestedCtx })),
        ]);
  
        const allModels: ModelCardData[] = [];
        const errors: ProviderError[] = [];
  
        for (const result of results) {
          if (result.status === 'fulfilled') {
            const data = result.value;
            data.models.forEach((m) => {
              allModels.push({
                id: `${data.provider}:${m.id}`,
                name: m.name,
                provider: data.provider,
                created: m.created,
                ownedBy: m.ownedBy,
                path: m.path,
                sourceUrl: m.sourceUrl,
                parameterSize: m.parameterSize,
                fileSize: m.fileSize,
              });
            });
          } else {
            const rejection = result as PromiseRejectedResult;
            const msg = rejection.reason instanceof Error ? rejection.reason.message : 'Unknown error';
            errors.push({ provider: 'Unknown', url: 'unknown', error: msg });
          }
        }
  
        setModels(allModels);
        setProviderErrors(errors);
  
        if (errors.length > 0 && allModels.length === 0) {
          setError(`No models found. Provider errors:\n${errors.map(e => `${e.provider}: ${e.error}`).join('\n')}`);
        } else if (allModels.length === 0) {
          setError('No models found from any endpoint (Gateway, Direct, or Router)');
        }
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    };
  
    const loadVram = async () => {
      try {
        // Try to get VRAM from Router API status endpoint
        const response = await fetch(`${apiPath('router', '/api/v1/qonduit-router/status')}`);
        if (response.ok) {
          const data = await response.json();
          if (data.vram) {
            setVramData({
              total: data.vram.total || 'unknown',
              used: data.vram.used || 'unknown',
              free: data.vram.free || 'unknown',
            });
            return;
          }
        }
      } catch {
        // VRAM endpoint may not exist — that's OK
      }
      // Try alternative VRAM endpoint
      try {
        const response = await fetch(`${apiPath('router', '/api/v1/qonduit-router/vram')}`);
        if (response.ok) {
          const data = await response.json();
          setVramData({
            total: data.total || 'unknown',
            used: data.used || 'unknown',
            free: data.free || 'unknown',
          });
          return;
        }
      } catch {
        // No VRAM endpoint available
      }
      setVramError('VRAM data unavailable — check Router API for GPU status');
    };

  const handleCopyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch { /* ignore */ }
  };

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'Gateway':
        return 'bg-accent-primary/10 text-accent-primary';
      case 'Direct':
        return 'bg-accent-secondary/10 text-accent-secondary';
      case 'Router':
        return 'bg-accent-tertiary/10 text-accent-tertiary';
      default:
        return 'bg-bg-tertiary text-text-tertiary';
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'Gateway':
        return <Globe className="w-3.5 h-3.5" />;
      case 'Direct':
        return <Zap className="w-3.5 h-3.5" />;
      case 'Router':
        return <Router className="w-3.5 h-3.5" />;
      default:
        return <Server className="w-3.5 h-3.5" />;
    }
  };

  return (
      <div className="p-6 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-accent-primary to-accent-tertiary bg-clip-text text-transparent">
              Available Models
            </h2>
            <p className="text-sm text-text-secondary mt-0.5">
              Models from Gateway, Direct, and Router endpoints
            </p>
          </div>
          <button
            onClick={loadModels}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border border-border-primary text-text-secondary hover:bg-bg-tertiary hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
  
        {/* VRAM Summary */}
        <div className="mb-4">
          {vramData ? (
            <div className="flex items-center gap-4 p-3 bg-bg-secondary/50 border border-border-subtle rounded-lg">
              <MemoryStick className="w-4 h-4 text-accent-primary flex-shrink-0" />
              <div className="flex items-center gap-4 text-xs">
                <span className="text-text-secondary">Total: <span className="font-mono text-text-primary">{vramData.total}</span></span>
                <span className="text-text-secondary">Used: <span className="font-mono text-status-warning">{vramData.used}</span></span>
                <span className="text-text-secondary">Free: <span className="font-mono text-status-success">{vramData.free}</span></span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-bg-secondary/50 border border-border-subtle rounded-lg">
              <MemoryStick className="w-4 h-4 text-text-tertiary flex-shrink-0" />
              <span className="text-xs text-text-tertiary">{vramError || 'VRAM data unavailable'}</span>
            </div>
          )}
        </div>
  
        {/* Models Grid */}
         <div className="flex-1 overflow-y-auto">
         {loading ? (
           <div className="flex flex-col items-center justify-center h-64 space-y-4">
             <div className="w-12 h-12 rounded-full border-4 border-accent-primary/20 border-t-accent-primary animate-spin" />
             <p className="text-text-secondary text-sm">Loading models...</p>
           </div>
         ) : (
           <>
             {providerErrors.length > 0 && (
               <div className="mb-4 p-3 bg-status-error/5 border border-status-error/20 rounded-lg">
                 <p className="text-xs text-status-error font-medium mb-1">Provider Errors</p>
                 {providerErrors.map((e, i) => (
                   <p key={i} className="text-[10px] text-text-secondary font-mono">{e.provider}: {e.error}</p>
                 ))}
               </div>
             )}
             {error && (
               <div className="mb-4 p-3 bg-status-error/5 border border-status-error/20 rounded-lg">
                 <p className="text-xs text-status-error font-medium mb-1">Error</p>
                 <p className="text-xs text-text-secondary whitespace-pre-wrap">{error}</p>
               </div>
             )}
             {models.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-64 text-center">
                 <div className="w-14 h-14 bg-bg-tertiary rounded-full flex items-center justify-center mb-4">
                   <Server className="w-7 h-7 text-text-tertiary" />
                 </div>
                 <p className="text-text-secondary">No models available</p>
                 <button
                   onClick={loadModels}
                   className="mt-4 text-accent-primary hover:text-accent-primary-hover font-medium text-sm"
                 >
                   Try refreshing
                 </button>
               </div>
             ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {models.map((model) => {
              const cleanId = model.id.replace(/^gateway:|^direct:|^router:/, '');
              return (
                <div
                  key={model.id}
                  className="bg-bg-card border border-border-primary rounded-xl p-4 hover:border-accent-primary/30 transition-all duration-200 group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${getProviderColor(model.provider)}`}>
                        {getProviderIcon(model.provider)}
                        {model.provider}
                      </div>
                      {model.created && (
                        <span className="text-[10px] text-text-tertiary">
                          {new Date(model.created * 1000).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-bg-secondary/50 rounded-lg p-2.5 border border-border-subtle mb-3">
                                      <p className="text-xs font-mono text-text-primary truncate" title={cleanId}>
                                        {cleanId}
                                      </p>
                                      {model.path && (
                                        <p className="text-[10px] font-mono text-text-tertiary truncate mt-1" title={model.path}>
                                          {model.path}
                                        </p>
                                      )}
                                    </div>
                  
                                    {/* Metadata row */}
                                    <div className="flex items-center gap-2 mb-3 text-[10px] text-text-tertiary">
                                      {model.parameterSize && model.parameterSize !== 'unknown' && (
                                        <span className="flex items-center gap-1">
                                          <Cpu className="w-3 h-3" />
                                          {model.parameterSize}
                                        </span>
                                      )}
                                      {model.fileSize && model.fileSize !== 'unknown' && (
                                        <span className="flex items-center gap-1">
                                          <HardDrive className="w-3 h-3" />
                                          {model.fileSize}
                                        </span>
                                      )}
                                      {(!model.parameterSize || model.parameterSize === 'unknown') && (!model.fileSize || model.fileSize === 'unknown') && (
                                        <span className="text-text-tertiary/50">Metadata not available</span>
                                      )}
                                    </div>
                  
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3 text-xs text-text-tertiary">
                                        <span>{model.provider === 'Router' ? 'GGUF' : model.ownedBy || model.id}</span>
                                        <span>·</span>
                                        <span>{model.provider === 'Router' ? 'Launchable' : model.provider}</span>
                                      </div>
                    <button
                      onClick={() => handleCopyId(model.id)}
                      className="p-1 rounded hover:bg-bg-tertiary text-text-tertiary hover:text-text-primary transition-all duration-200 opacity-0 group-hover:opacity-100"
                      title="Copy ID"
                    >
                      {copiedId === model.id ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-status-success" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
           </div>
             )}
           </>
         )}
       </div>
 
       {toastMessage && (
        <Toast
          message={toastMessage}
          type="info"
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
};

export default ModelsPage;
