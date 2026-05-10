import React, { useState, useEffect, useRef } from 'react';
import {
  fetchGatewayModels, fetchDirectModels, fetchRouterModels, fetchRouterGpu,
  searchHfModels, listHfRepoFiles, dryRunHfDownload, startHfDownload,
  listHfDownloads, cancelHfDownload, deleteLocalModel, listModelTrash, restoreModelFromTrash,
  permanentlyDeleteTrashEntry,
} from '../services/api';
import { apiPath } from '../config/endpoints';
import { HfSearchResult, HfRepoFile, HfDownloadJob } from '../types';
import Toast from '../components/Toast';
import GpuSummary from '../components/GpuSummary';
import ConfirmDialog from '../components/ConfirmDialog';
import HfSearchPanel from '../components/HfSearchPanel';
import DownloadJobsPanel from '../components/DownloadJobsPanel';
import TrashPanel from '../components/TrashPanel';
import ToolRegistry from '../components/ToolRegistry';
import MobileCollapsibleCard, { CardAction } from '../components/MobileCollapsibleCard';
import {
  RefreshCw, Copy, CheckCircle2, Globe, Zap, Server, Router,
  Cpu, HardDrive, MemoryStick, Loader2, Trash2, FileDown,
  Wrench,
} from 'lucide-react';

// ── Local types ───────────────────────────────────────────────────────

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

interface VramData {
  total: string;
  used: string;
  free: string;
}

// ── Model Card (extracted for reuse inside collapsible cards) ──────────

interface ModelCardProps {
  model: ModelCardData;
  onCopyId: (id: string) => void;
  onMoveToTrash?: (model: ModelCardData) => void;
  copiedId: string | null;
  getProviderColor: (provider: string) => string;
  getProviderIcon: (provider: string) => React.ReactNode;
}

const ModelCard: React.FC<ModelCardProps> = ({
  model, onCopyId, onMoveToTrash, copiedId, getProviderColor, getProviderIcon,
}) => {
  const cleanId = model.id.replace(/^gateway:|^direct:|^router:/, '');
  const isRouter = model.provider === 'Router';

  return (
    <div
      className="bg-bg-secondary/30 border border-border-subtle rounded-xl p-4 hover:border-accent-primary/30 transition-all duration-200 group relative"
    >
      {/* Move to Trash button (Router models only) */}
      {isRouter && onMoveToTrash && (
        <button
          onClick={() => onMoveToTrash(model)}
          className="absolute top-3 right-3 p-2 rounded-lg hover:bg-status-error/10 text-text-tertiary hover:text-status-error transition-all duration-200 min-h-[36px] min-w-[36px] flex items-center justify-center"
          title="Move to Trash"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}

      <div className="flex items-start justify-between mb-3 pr-8">
        <div className="flex items-center gap-2">
          <div className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${getProviderColor(model.provider)}`}>
            {getProviderIcon(model.provider)}
            {model.provider}
          </div>
          {model.created && (
            <span className="text-[10px] sm:text-xs text-text-tertiary">
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
          <p className="text-[10px] sm:text-xs font-mono text-text-tertiary truncate mt-1" title={model.path}>
            {model.path}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 mb-3 text-[10px] sm:text-xs text-text-tertiary flex-wrap">
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
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-text-tertiary">
          <span className="truncate">{model.provider === 'Router' ? 'GGUF' : model.ownedBy || model.id}</span>
          <span className="hidden sm:inline">·</span>
          <span>{model.provider === 'Router' ? 'Launchable' : model.provider}</span>
        </div>
        <button
          onClick={() => onCopyId(model.id)}
          className="p-2 rounded hover:bg-bg-tertiary text-text-tertiary hover:text-text-primary transition-all duration-200 opacity-0 group-hover:opacity-100 sm:opacity-100 min-h-[36px] min-w-[36px] flex items-center justify-center"
          title="Copy ID"
        >
          {copiedId === model.id ? (
            <CheckCircle2 className="w-4 h-4 text-status-success" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
};

// ── Component ─────────────────────────────────────────────────────────

const ModelsPage: React.FC = () => {
  // ── State: loading phases ──
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const inFlightRef = useRef(false);

  // ── State: content data ──
  const [models, setModels] = useState<ModelCardData[]>([]);

  // ── State: timestamps ──
     const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  // ── State: VRAM ──
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'error' | 'success' | 'info'>('info');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [vramData, setVramData] = useState<VramData | null>(null);
   const [vramError, setVramError] = useState<string | null>(null);

  // ── State: trash dialog ──
  const [trashDialogOpen, setTrashDialogOpen] = useState(false);
  const [trashDialogModel, setTrashDialogModel] = useState<ModelCardData | null>(null);
  const [trashDialogLoading, setTrashDialogLoading] = useState(false);

  // ── State: trash list ──
   const [trashFiles, setTrashFiles] = useState<Array<{
      trash_name: string;
      original_name: string;
      path: string;
      size_bytes: number;
      size_human: string;
      trashed_at: string;
    }>>([]);
    const [trashLoading, setTrashLoading] = useState(false);
    const [trashError, setTrashError] = useState<string | null>(null);
    const [restoreLoading, setRestoreLoading] = useState<string | null>(null);
 
   // ── State: permanent delete dialog ──
   const [permanentDeleteConfirmOpen, setPermanentDeleteConfirmOpen] = useState(false);
   const [permanentDeleteEntry, setPermanentDeleteEntry] = useState<{
     trash_name: string;
     original_name: string;
     path: string;
     size_bytes: number;
     size_human: string;
     trashed_at: string;
   } | null>(null);
   const [permanentDeleteLoading, setPermanentDeleteLoading] = useState<string | null>(null);

  // ── State: HF search ──
  const [hfQuery, setHfQuery] = useState('');
  const [hfSort, setHfSort] = useState<'downloads' | 'likes' | 'lastModified'>('downloads');
  const [hfLimit, setHfLimit] = useState<number>(20);
  const [hfSearchResults, setHfSearchResults] = useState<HfSearchResult[]>([]);
  const [hfSearchLoading, setHfSearchLoading] = useState(false);
  const [hfSearchError, setHfSearchError] = useState<string | null>(null);
  const [hfLastSearchTime, setHfLastSearchTime] = useState<number | null>(null);

  // ── State: repo files ──
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [repoFiles, setRepoFiles] = useState<HfRepoFile[]>([]);
  const [repoFilesLoading, setRepoFilesLoading] = useState(false);
  const [repoFilesError, setRepoFilesError] = useState<string | null>(null);

  // ── State: download confirmation ──
  const [downloadConfirmOpen, setDownloadConfirmOpen] = useState(false);
  const [downloadConfirmData, setDownloadConfirmData] = useState<{
    repo_id: string;
    filename: string;
    quant: string;
    size_human: string;
    size_gib: number;
    size_gb: number;
    parameter_size: string;
    parameter_size_active: string;
    target_name: string;
    target_path: string;
    exists: boolean;
    downloadable: boolean;
  } | null>(null);
  const [downloadConfirmLoading, setDownloadConfirmLoading] = useState(false);

  // ── State: download jobs ──
  const [downloadJobs, setDownloadJobs] = useState<HfDownloadJob[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [jobsLastUpdated, setJobsLastUpdated] = useState<number | null>(null);
  const jobsInFlightRef = useRef(false);

  // ── Load local models ──
  const loadModels = async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    if (initialLoading) {
      setInitialLoading(true);
    } else {
      setRefreshing(true);
    }

    const timeout = 10000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const results = await Promise.allSettled([
        fetchGatewayModels().then(models => ({ provider: 'Gateway' as const, models, url: apiPath('gateway', '/v1/models') })),
        fetchDirectModels().then(models => ({ provider: 'Direct' as const, models, url: apiPath('llama', '/v1/models') })),
        fetchRouterModels().then(result => ({ provider: 'Router' as const, models: result.models, url: apiPath('router', '/api/v1/qonduit-router/models'), suggestedCtx: result.suggestedCtx })),
      ]);

      const allModels: ModelCardData[] = [];
 
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
         }
       }

      setModels(allModels);
         setLastUpdated(Date.now());
    } finally {
      clearTimeout(timeoutId);
      setInitialLoading(false);
      setRefreshing(false);
      inFlightRef.current = false;
    }
  };

  // ── Load VRAM ──
  const loadVram = async () => {
     try {
       const gpu = await fetchRouterGpu();
       if (gpu.ok) {
         setVramData({
           total: gpu.memory_total_human,
           used: gpu.memory_used_human,
           free: gpu.memory_free_human,
         });
         setVramError(null);
       } else {
         setVramError('VRAM unavailable — GPU endpoint returned ok:false');
       }
     } catch (err) {
       setVramError(err instanceof Error ? err.message : 'Failed to fetch GPU status');
     }
   };

  // ── Load trash ──
   const loadTrash = async () => {
     setTrashLoading(true);
     setTrashError(null);
     try {
       const resp = await listModelTrash();
       setTrashFiles(resp.files || []);
     } catch (err) {
       const msg = err instanceof Error ? err.message : 'Failed to load trash';
       setTrashError(msg);
     } finally {
       setTrashLoading(false);
     }
   };

  // ── Load download jobs ──
    const loadDownloadJobs = async () => {
      if (jobsInFlightRef.current) return;
      jobsInFlightRef.current = true;
      setJobsLoading(true);
  
      try {
        const resp = await listHfDownloads();
        const newJobs = resp.jobs || [];
        const hadCompleted = downloadJobs.some(j => j.status === 'complete') ||
          newJobs.some(j => j.status === 'complete');
  
        setDownloadJobs(newJobs);
        setJobsLastUpdated(Date.now());
        setJobsError(null);
  
        // Refresh local models if a download just completed
        if (!hadCompleted && newJobs.some(j => j.status === 'complete')) {
          loadModels();
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to refresh download jobs: unknown error';
        setJobsError(msg);
        // Preserve last known jobs on error — do not clear downloadJobs
      } finally {
        setJobsLoading(false);
         jobsInFlightRef.current = false;
       }
     };
   
     // ── Clear completed jobs ──
     const handleClearCompleted = () => {
       setDownloadJobs(prev => prev.filter(j => j.status === 'queued' || j.status === 'downloading'));
       setToastMessage('Completed jobs cleared');
       setToastType('info');
     };
   
     // ── Initial load ──
     useEffect(() => {
     loadModels();
     loadVram();
     loadTrash();
   }, []);

  // ── Download jobs polling ──
  useEffect(() => {
    loadDownloadJobs();
    const hasActive = downloadJobs.some(j => j.status === 'queued' || j.status === 'downloading');
    if (!hasActive) return;
    const interval = setInterval(loadDownloadJobs, 3000);
    return () => clearInterval(interval);
  }, [downloadJobs.map(j => j.job_id).join(',')]);

  // ── Copy ID ──
  const handleCopyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch { /* ignore */ }
  };

  // ── Move to Trash ──
  const handleMoveToTrash = (model: ModelCardData) => {
    setTrashDialogModel(model);
    setTrashDialogOpen(true);
  };

  const confirmMoveToTrash = async () => {
    if (!trashDialogModel) return;
    setTrashDialogLoading(true);
    try {
      await deleteLocalModel(trashDialogModel.name);
      setModels(prev => prev.filter(m => m.id !== trashDialogModel.id));
      setToastMessage(`"${trashDialogModel.name}" moved to trash`);
      setToastType('success');
      setTrashDialogOpen(false);
      setTrashDialogModel(null);
      loadTrash();
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : 'Failed to move to trash');
      setToastType('error');
    } finally {
      setTrashDialogLoading(false);
    }
  };

  // ── Restore from trash ──
   const handleRestore = async (trashName: string) => {
     setRestoreLoading(trashName);
     try {
       const resp = await restoreModelFromTrash(trashName);
       if (resp.ok && resp.restored) {
         setToastMessage(`"${resp.original_name}" restored`);
         setToastType('success');
         loadTrash();
         loadModels();
       } else {
         setToastMessage(resp.error || 'Restore failed');
         setToastType('error');
       }
     } catch (err) {
       setToastMessage(err instanceof Error ? err.message : 'Restore failed');
       setToastType('error');
     } finally {
       setRestoreLoading(null);
     }
   };
 
   // ── Permanent delete from trash ──
   const handlePermanentDelete = (entry: {
     trash_name: string;
     original_name: string;
     path: string;
     size_bytes: number;
     size_human: string;
     trashed_at: string;
   }) => {
     setPermanentDeleteEntry(entry);
     setPermanentDeleteConfirmOpen(true);
   };
 
   const confirmPermanentDelete = async (trashName: string) => {
     setPermanentDeleteLoading(trashName);
     try {
       await permanentlyDeleteTrashEntry(trashName);
       setToastMessage(`"${permanentDeleteEntry?.original_name}" permanently deleted`);
       setToastType('success');
       setPermanentDeleteConfirmOpen(false);
       setPermanentDeleteEntry(null);
       setTrashFiles(prev => prev.filter(e => e.trash_name !== trashName));
     } catch (err) {
       setToastMessage(err instanceof Error ? err.message : 'Permanent delete failed');
       setToastType('error');
     } finally {
       setPermanentDeleteLoading(null);
     }
   };

  // ── HF Search ──
   const handleHfSearch = async () => {
     if (!hfQuery.trim()) return;
     setHfSearchLoading(true);
     setHfSearchError(null);
     try {
       const resp = await searchHfModels(hfQuery.trim(), hfLimit, hfSort);
       setHfSearchResults(resp.results || []);
       setHfLastSearchTime(Date.now());
     } catch (err) {
       const msg = err instanceof Error ? err.message : 'HF search failed: unknown error';
       setHfSearchError(msg);
       // Preserve previous results on error — do not clear hfSearchResults
     } finally {
       setHfSearchLoading(false);
     }
   };
 
   // ── Select repo ──
   const handleSelectRepo = async (repoId: string) => {
     setSelectedRepo(repoId);
     setRepoFilesLoading(true);
     setRepoFilesError(null);
     try {
       const resp = await listHfRepoFiles(repoId);
       setRepoFiles(resp.files || []);
     } catch (err) {
       const msg = err instanceof Error ? err.message : 'Failed to verify repo files: unknown error';
       setRepoFilesError(msg);
       // Preserve previous repo files on error — do not clear repoFiles
     } finally {
       setRepoFilesLoading(false);
     }
   };

  // ── Download confirmation (dry-run) ──
  const handleDownloadConfirm = async (file: HfRepoFile) => {
    const targetName = file.filename;
    setDownloadConfirmLoading(true);
    setDownloadConfirmData(null);
    try {
      const resp = await dryRunHfDownload(selectedRepo!, file.filename, targetName);
      setDownloadConfirmData({
        repo_id: resp.repo_id,
        filename: resp.filename,
        quant: file.quant,
        size_human: resp.size_human,
        size_gib: file.size_gib,
        size_gb: file.size_gb,
        parameter_size: file.parameter_size,
        parameter_size_active: file.parameter_size_active,
        target_name: resp.target_name,
        target_path: resp.target_path,
        exists: resp.exists,
        downloadable: resp.downloadable,
      });
      setDownloadConfirmOpen(true);
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : 'Dry-run failed');
      setToastType('error');
    } finally {
      setDownloadConfirmLoading(false);
    }
  };

  // ── Start download ──
  const handleStartDownload = async () => {
    if (!downloadConfirmData) return;
    setDownloadConfirmLoading(true);
    try {
      await startHfDownload(
        downloadConfirmData.repo_id,
        downloadConfirmData.filename,
        downloadConfirmData.target_name,
        downloadConfirmData.exists
      );
      setToastMessage(`Download started: ${downloadConfirmData.filename}`);
      setToastType('success');
      setDownloadConfirmOpen(false);
      setDownloadConfirmData(null);
      loadDownloadJobs();
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : 'Download failed');
      setToastType('error');
    } finally {
      setDownloadConfirmLoading(false);
    }
  };

  // ── Cancel download ──
  const handleCancelDownload = async (jobId: string) => {
    try {
      await cancelHfDownload(jobId);
      setToastMessage('Download cancelled');
      setToastType('info');
      loadDownloadJobs();
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : 'Cancel failed');
      setToastType('error');
    }
  };

  // ── Format time ago ──
  const formatTimeAgo = (ts: number) => {
    const diff = Date.now() - ts;
    const secs = Math.floor(diff / 1000);
    if (secs < 10) return 'just now';
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    return `${mins}m ago`;
  };

  // ── Provider badge colors ──
  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'Gateway': return 'bg-accent-primary/10 text-accent-primary';
      case 'Direct': return 'bg-accent-secondary/10 text-accent-secondary';
      case 'Router': return 'bg-accent-tertiary/10 text-accent-tertiary';
      default: return 'bg-bg-tertiary text-text-tertiary';
    }
  };

  const getProviderIcon = (provider: string) => {
     switch (provider) {
       case 'Gateway': return <Globe className="w-3.5 h-3.5" />;
       case 'Direct': return <Zap className="w-3.5 h-3.5" />;
       case 'Router': return <Router className="w-3.5 h-3.5" />;
       default: return <Server className="w-3.5 h-3.5" />;
     }
   };
 
   // ── Derived model arrays ──
   const gatewayModels = models.filter(m => m.provider === 'Gateway');
   const directModels = models.filter(m => m.provider === 'Direct');
   const routerModels = models.filter(m => m.provider === 'Router');
 
   // ── Download job counts ──
   const activeJobs = downloadJobs.filter(j => j.status === 'queued' || j.status === 'downloading').length;
   const completedJobs = downloadJobs.filter(
     j => j.status === 'complete' || j.status === 'failed' || j.status === 'cancelled' || j.status === 'interrupted'
   ).length;
 
   // ── Render model grid helper ──
   const renderModelGrid = (filteredModels: ModelCardData[]) => (
     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
       {filteredModels.map((model) => (
         <ModelCard
           key={model.id}
           model={model}
           onCopyId={handleCopyId}
           onMoveToTrash={model.provider === 'Router' ? handleMoveToTrash : undefined}
           copiedId={copiedId}
           getProviderColor={getProviderColor}
           getProviderIcon={getProviderIcon}
         />
       ))}
     </div>
   );
 
   // ── Download Jobs Clear Action ──
   const clearCompletedAction: CardAction | undefined = completedJobs > 0
     ? {
         label: `Clear Completed (${completedJobs})`,
         onClick: handleClearCompleted,
         variant: 'secondary',
       }
     : undefined;
 
   return (
      <div className="px-4 py-4 sm:px-6 sm:py-6 h-full flex flex-col">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 sm:mb-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-accent-primary to-accent-tertiary bg-clip-text text-transparent">
                Available Models
              </h2>
              {refreshing && (
                <span className="flex items-center gap-1 text-[10px] sm:text-xs text-text-tertiary">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Refreshing…
                </span>
              )}
            </div>
            <p className="text-sm text-text-secondary mt-0.5">
              Models from Gateway, Direct, and Router endpoints
            </p>
            {lastUpdated && !refreshing && (
              <p className="text-[10px] sm:text-xs text-text-tertiary mt-0.5">
                Updated {formatTimeAgo(lastUpdated)}
              </p>
            )}
          </div>
          <button
            onClick={loadModels}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 border border-border-primary text-text-secondary hover:bg-bg-tertiary hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] flex-shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
  
        {/* VRAM Summary */}
         <div className="mb-3 sm:mb-4">
           {vramData ? (
             <GpuSummary total={vramData.total} used={vramData.used} free={vramData.free} />
           ) : (
             <div className="flex items-center gap-2 p-3 bg-bg-secondary/50 border border-border-subtle rounded-lg">
               <MemoryStick className="w-4 h-4 text-text-tertiary flex-shrink-0" />
               <span className="text-xs text-text-tertiary">{vramError || 'VRAM data unavailable'}</span>
             </div>
           )}
         </div>
  
        {/* Main Content */}
         <div className="flex-1 overflow-y-auto space-y-4">
           {/* ── Gateway Models Card ── */}
           <MobileCollapsibleCard
             title="Gateway Models"
             icon={<Globe className="w-5 h-5 text-accent-primary" />}
             statusBadge={gatewayModels.length > 0 ? { status: 'online', label: `${gatewayModels.length} model${gatewayModels.length > 1 ? 's' : ''}` } : { status: 'unknown', label: 'None' }}
             summaryText={gatewayModels.length > 0 ? 'Active gateway model' : 'No gateway models'}
             defaultExpanded={true}
             defaultExpandedMobile={false}
             localStorageKey="qonduit-gateway-models"
           >
             {initialLoading ? (
               <div className="flex items-center justify-center py-8">
                 <Loader2 className="w-6 h-6 text-text-tertiary animate-spin" />
               </div>
             ) : gatewayModels.length === 0 ? (
               <div className="text-center py-8">
                 <div className="w-14 h-14 bg-bg-tertiary rounded-full flex items-center justify-center mb-4 mx-auto">
                   <Globe className="w-7 h-7 text-text-tertiary" />
                 </div>
                 <p className="text-text-secondary">No gateway models</p>
                 <p className="text-xs text-text-tertiary mt-1">Check your gateway endpoint configuration</p>
               </div>
             ) : (
               renderModelGrid(gatewayModels)
             )}
           </MobileCollapsibleCard>
 
           {/* ── Direct Models Card ── */}
           <MobileCollapsibleCard
             title="Direct Models"
             icon={<Zap className="w-5 h-5 text-accent-secondary" />}
             statusBadge={directModels.length > 0 ? { status: 'online', label: `${directModels.length} model${directModels.length > 1 ? 's' : ''}` } : { status: 'unknown', label: 'None' }}
             summaryText={directModels.length > 0 ? 'Active direct model' : 'No direct models'}
             defaultExpanded={true}
             defaultExpandedMobile={false}
             localStorageKey="qonduit-direct-models"
           >
             {initialLoading ? (
               <div className="flex items-center justify-center py-8">
                 <Loader2 className="w-6 h-6 text-text-tertiary animate-spin" />
               </div>
             ) : directModels.length === 0 ? (
               <div className="text-center py-8">
                 <div className="w-14 h-14 bg-bg-tertiary rounded-full flex items-center justify-center mb-4 mx-auto">
                   <Zap className="w-7 h-7 text-text-tertiary" />
                 </div>
                 <p className="text-text-secondary">No direct models</p>
                 <p className="text-xs text-text-tertiary mt-1">Check your llama endpoint configuration</p>
               </div>
             ) : (
               renderModelGrid(directModels)
             )}
           </MobileCollapsibleCard>
 
           {/* ── Router Models Card ── */}
           <MobileCollapsibleCard
             title="Router Models"
             icon={<Router className="w-5 h-5 text-accent-tertiary" />}
             statusBadge={routerModels.length > 0 ? { status: 'online', label: `${routerModels.length} model${routerModels.length > 1 ? 's' : ''}` } : { status: 'unknown', label: 'None' }}
             summaryText={routerModels.length > 0 ? 'Launchable via router' : 'No router models'}
             defaultExpanded={true}
             defaultExpandedMobile={false}
             localStorageKey="qonduit-router-models"
           >
             {initialLoading ? (
               <div className="flex items-center justify-center py-8">
                 <Loader2 className="w-6 h-6 text-text-tertiary animate-spin" />
               </div>
             ) : routerModels.length === 0 ? (
               <div className="text-center py-8">
                 <div className="w-14 h-14 bg-bg-tertiary rounded-full flex items-center justify-center mb-4 mx-auto">
                   <Router className="w-7 h-7 text-text-tertiary" />
                 </div>
                 <p className="text-text-secondary">No router models</p>
                 <p className="text-xs text-text-tertiary mt-1">Add GGUF files to the Router&apos;s model directory</p>
               </div>
             ) : (
               renderModelGrid(routerModels)
             )}
           </MobileCollapsibleCard>
 
         {/* ── Hugging Face Search Panel ── */}
        <HfSearchPanel
          hfQuery={hfQuery}
          setHfQuery={setHfQuery}
          hfSort={hfSort}
          setHfSort={setHfSort}
          hfLimit={hfLimit}
          setHfLimit={setHfLimit}
          hfSearchResults={hfSearchResults}
          hfSearchLoading={hfSearchLoading}
          hfSearchError={hfSearchError}
          hfLastSearchTime={hfLastSearchTime}
          selectedRepo={selectedRepo}
          repoFiles={repoFiles}
          repoFilesLoading={repoFilesLoading}
          repoFilesError={repoFilesError}
          downloadConfirmOpen={downloadConfirmOpen}
          downloadConfirmData={downloadConfirmData}
          downloadConfirmLoading={downloadConfirmLoading}
          onSearch={handleHfSearch}
          onSelectRepo={handleSelectRepo}
          onDownloadConfirm={handleDownloadConfirm}
          onStartDownload={handleStartDownload}
          onCancelDownload={() => { setDownloadConfirmOpen(false); setDownloadConfirmData(null); }}
        />

        {/* ── Download Jobs Card ── */}
           <MobileCollapsibleCard
             title="Download Jobs"
             icon={<FileDown className="w-5 h-5 text-accent-secondary" />}
             statusBadge={
               activeJobs > 0 ? { status: 'loading', label: `${activeJobs} active` } :
               completedJobs > 0 ? { status: 'online', label: `${completedJobs} complete` } :
               { status: 'unknown' as const, label: 'None' }
             }
             summaryText={
               activeJobs > 0 ? `${activeJobs} downloading` :
               completedJobs > 0 ? 'All jobs finished' :
               'No active downloads'
             }
             action={clearCompletedAction}
             defaultExpanded={true}
             defaultExpandedMobile={false}
             localStorageKey="qonduit-download-jobs"
           >
             <DownloadJobsPanel
               downloadJobs={downloadJobs}
               jobsLoading={jobsLoading}
               jobsError={jobsError}
               jobsLastUpdated={jobsLastUpdated}
               onRefresh={loadDownloadJobs}
               onCancel={handleCancelDownload}
             />
           </MobileCollapsibleCard>
 
         {/* ── Trash / Restore Card ── */}
            <MobileCollapsibleCard
              title="Trash / Restore"
              icon={<Trash2 className="w-5 h-5 text-text-tertiary" />}
              statusBadge={
                trashFiles.length > 0 ? { status: 'online', label: `${trashFiles.length} item${trashFiles.length > 1 ? 's' : ''}` } :
                { status: 'unknown' as const, label: 'Empty' }
              }
              summaryText={trashFiles.length > 0 ? `${trashFiles.length} items in trash` : 'Trash is empty'}
              defaultExpanded={true}
              defaultExpandedMobile={false}
              localStorageKey="qonduit-trash"
            >
              <TrashPanel
                 trashFiles={trashFiles}
                 trashLoading={trashLoading}
                 trashError={trashError}
                 onRetry={loadTrash}
                 restoreLoading={restoreLoading}
                 onRestore={handleRestore}
                 onDeletePermanent={handlePermanentDelete}
                 permanentDeleteLoading={permanentDeleteLoading}
                 onPermanentDeleteConfirm={confirmPermanentDelete}
                 onPermanentDeleteCancel={() => { setPermanentDeleteConfirmOpen(false); setPermanentDeleteEntry(null); }}
                 permanentDeleteConfirmOpen={permanentDeleteConfirmOpen}
                 permanentDeleteEntry={permanentDeleteEntry}
               />
             </MobileCollapsibleCard>
 
             {/* ── Model Tools / Capabilities Card ── */}
             <MobileCollapsibleCard
               title="Model Tools / Capabilities"
               icon={<Wrench className="w-5 h-5 text-text-tertiary" />}
               statusBadge={{ status: 'unknown', label: 'Backend not connected' }}
               summaryText="Tool support depends on backend capability"
               defaultExpanded={false}
               defaultExpandedMobile={false}
               localStorageKey="qonduit-model-tools"
             >
               <ToolRegistry compact />
             </MobileCollapsibleCard>
         </div>

      {/* ── Toast ── */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* ── Trash Confirmation Dialog ── */}
       <ConfirmDialog
         open={trashDialogOpen}
         title="Move to Trash"
         message={`Are you sure you want to move "${trashDialogModel?.name}" to trash?${trashDialogModel?.fileSize && trashDialogModel.fileSize !== 'unknown' ? ` (${trashDialogModel.fileSize})` : ''} This model will be removed from the local models list but can be restored later.`}
         confirmLabel="Move to Trash"
         cancelLabel="Cancel"
         confirmVariant="danger"
         onConfirm={confirmMoveToTrash}
         onCancel={() => { setTrashDialogOpen(false); setTrashDialogModel(null); }}
         confirmDisabled={trashDialogLoading}
       />
    </div>
  );
};

export default ModelsPage;
