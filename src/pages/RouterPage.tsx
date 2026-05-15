import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  createRouterSlot,
  fetchRouterEndpoints,
  fetchRouterGpu,
  fetchRouterModels,
  fetchRouterSlotLogs,
  fetchRouterSlots,
  getSettings,
  preflightRouterSlot,
  runRouterSlotAction,
  updateRouterSlot,
} from '../services/api';
import { ENDPOINTS } from '../config/endpoints';
import { GpuInfo, NormalizedModel, RouterEndpoint, RouterPreflightRequest, RouterPreflightResponse, RouterSlot } from '../types';
import { buildSlotPreflightRequest, buildSlotUpdateRequest, SlotFormDraft } from '../components/SlotConfigForm';
import { saveTensorSplitRecord } from '../utils/tensorSplit';
import { formatGpuLabel, getGpuStatusSummaryFields, isExcludedDisplayGpu } from '../utils/routerDisplay';
import Toast from '../components/Toast';
import MobileAccordionSection from '../components/MobileAccordionSection';
import MobileCollapsibleCard from '../components/MobileCollapsibleCard';
import SlotList from '../components/SlotList';
import AddSlotDialog from '../components/AddSlotDialog';
import EditSlotDialog from '../components/EditSlotDialog';
import EndpointsPanel from '../components/EndpointsPanel';
import RouterGpuPanel from '../components/RouterGpuPanel';
import {
  AlertCircle,
  CheckCircle2,
  Cpu,
  Globe,
  Layers3,
  Loader2,
} from 'lucide-react';

const RouterPage: React.FC = () => {
  const settings = getSettings();
  const mode = settings.endpointMode;
  const routerBase = ENDPOINTS.router[mode];

  const inFlightRef = useRef(false);
  const hasEverLoadedRef = useRef(false);

  const [refreshing, setRefreshing] = useState(false);
  const [slots, setSlots] = useState<RouterSlot[]>([]);
  const [endpoints, setEndpoints] = useState<RouterEndpoint[]>([]);
  const [routerModels, setRouterModels] = useState<NormalizedModel[]>([]);
  const [gpus, setGpus] = useState<GpuInfo[]>([]);
  const [vramData, setVramData] = useState<{ total: string; used: string; free: string } | null>(null);
  const [gpuRows, setGpuRows] = useState<Array<{ index: number; label: string; name: string; total: string; used: string; free: string; isDisplay?: boolean }>>([]);

  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [endpointsError, setEndpointsError] = useState<string | null>(null);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [vramError, setVramError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [logsOpenBySlot, setLogsOpenBySlot] = useState<Record<string, boolean>>({});
  const [logsBySlot, setLogsBySlot] = useState<Record<string, string[]>>({});
  const [logsErrorBySlot, setLogsErrorBySlot] = useState<Record<string, string | null>>({});
  const [preflightBySlot, setPreflightBySlot] = useState<Record<string, string | null>>({});
  const [preflightErrorBySlot, setPreflightErrorBySlot] = useState<Record<string, string | null>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<RouterSlot | null>(null);
  const [dialogPreflightLoading, setDialogPreflightLoading] = useState(false);
   const [dialogPreflightResult, setDialogPreflightResult] = useState<string | null>(null);
   const [dialogPreflightError, setDialogPreflightError] = useState<string | null>(null);
 
   // Derive effective GPU devices string for dialog display
    const dialogEffectiveGpus = useMemo(() => {
      if (dialogPreflightResult) {
        try {
          const parsed = JSON.parse(dialogPreflightResult) as RouterPreflightResponse;
          if (parsed.effective_gpu_devices) {
            const devices = parsed.effective_gpu_devices;
            if (typeof devices === 'string') return devices;
            if (Array.isArray(devices)) return devices.join(',');
          }
        } catch {
          // Fall through to fallback
        }
      }
      // Fallback: derive from current GPU data (excludes display GPUs)
      if (gpus.length > 0) {
        return gpus
          .filter((g) => !isExcludedDisplayGpu(g))
          .map((g) => String(g.index))
          .join(',');
      }
      return undefined;
    }, [dialogPreflightResult, gpus]);
 
    const [createLoading, setCreateLoading] = useState(false);
    const [saveLoading, setSaveLoading] = useState(false);

  const fetchData = async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    if (hasEverLoadedRef.current) {
      setRefreshing(true);
    }

    try {
      try {
        const slotData = await fetchRouterSlots();
        setSlots(slotData.slots || []);
        setSlotsError(null);
      } catch (err) {
        setSlotsError(err instanceof Error ? err.message : 'Slot refresh failed — showing last known slots');
      }

      try {
        const endpointData = await fetchRouterEndpoints();
        setEndpoints(endpointData.endpoints || []);
        setEndpointsError(null);
      } catch (err) {
        setEndpointsError(err instanceof Error ? err.message : 'Endpoint refresh failed — showing last known endpoints');
      }

      try {
        const modelData = await fetchRouterModels();
        setRouterModels(modelData.models || []);
        setModelsError(null);
      } catch (err) {
        setModelsError(err instanceof Error ? err.message : 'Model refresh failed — showing last known models');
      }

      try {
        const gpu = await fetchRouterGpu();
        if (gpu.ok) {
          setVramData(getGpuStatusSummaryFields(gpu));
          setGpus(gpu.gpus || []);
          setGpuRows((gpu.gpus || []).map((g: GpuInfo) => {
            const gpuMemory = getGpuStatusSummaryFields(g);
            return {
              index: g.index,
              label: formatGpuLabel(g),
              name: g.name || 'Unknown GPU',
              total: gpuMemory.total,
              used: gpuMemory.used,
              free: gpuMemory.free,
              isDisplay: isExcludedDisplayGpu(g),
            };
          }));
          setVramError(null);
        } else {
          setVramError('GPU endpoint returned ok:false — showing last known GPU data');
        }
      } catch (err) {
        setVramError(err instanceof Error ? err.message : 'GPU refresh failed — showing last known GPU data');
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
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage(message);
    setToastType(type);
  };

  const refreshAfterAction = async () => {
    hasEverLoadedRef.current = true;
    await fetchData();
  };

  const handleSlotAction = async (slot: RouterSlot, action: 'launch' | 'stop' | 'restart') => {
    setActionLoading(`${slot.slot_id}:${action}`);
    try {
      const result = await runRouterSlotAction(slot.slot_id, action);
      showToast(result.message || `${action} requested for ${slot.slot_id}`);
      await refreshAfterAction();
    } catch (err) {
      showToast(err instanceof Error ? err.message : `Failed to ${action} ${slot.slot_id}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePreflight = async (slot: RouterSlot) => {
    setActionLoading(`${slot.slot_id}:preflight`);
    setPreflightErrorBySlot((prev) => ({ ...prev, [slot.slot_id]: null }));
    try {
      const result = await preflightRouterSlot(slot.slot_id, slot);
      setPreflightBySlot((prev) => ({ ...prev, [slot.slot_id]: JSON.stringify(result, null, 2) }));
      showToast(`Preflight complete for ${slot.slot_id}`, result.ok ? 'success' : 'info');
    } catch (err) {
      const message = err instanceof Error ? err.message : `Preflight failed for ${slot.slot_id}`;
      setPreflightErrorBySlot((prev) => ({ ...prev, [slot.slot_id]: message }));
      showToast(message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogs = async (slot: RouterSlot) => {
    const currentlyOpen = logsOpenBySlot[slot.slot_id] === true;
    setLogsOpenBySlot((prev) => ({ ...prev, [slot.slot_id]: !currentlyOpen }));
    if (currentlyOpen) return;

    setActionLoading(`${slot.slot_id}:logs`);
    setLogsErrorBySlot((prev) => ({ ...prev, [slot.slot_id]: null }));
    try {
      const result = await fetchRouterSlotLogs(slot.slot_id);
      setLogsBySlot((prev) => ({ ...prev, [slot.slot_id]: result.logs || [] }));
    } catch (err) {
      setLogsErrorBySlot((prev) => ({ ...prev, [slot.slot_id]: err instanceof Error ? err.message : `Failed to load logs for ${slot.slot_id}` }));
    } finally {
      setActionLoading(null);
    }
  };

  const handleEdit = (slot: RouterSlot) => {
    setDialogPreflightResult(null);
    setDialogPreflightError(null);
    setEditingSlot(slot);
  };

  const handleAddSlot = () => {
    setDialogPreflightResult(null);
    setDialogPreflightError(null);
    setAddDialogOpen(true);
  };

  const handleDialogPreflight = async (slotId: string, draft: RouterPreflightRequest) => {
    setDialogPreflightLoading(true);
    setDialogPreflightResult(null);
    setDialogPreflightError(null);
    try {
      const result = await preflightRouterSlot(slotId, draft);
      setDialogPreflightResult(JSON.stringify(result, null, 2));
      showToast(`Draft preflight complete for ${slotId}`, result.ok ? 'success' : 'info');
    } catch (err) {
      const message = err instanceof Error ? err.message : `Draft preflight failed for ${slotId}`;
      setDialogPreflightError(message);
      showToast(message, 'error');
    } finally {
      setDialogPreflightLoading(false);
    }
  };

  const handleCopy = async (value: string, label: string) => {
     try {
       await navigator.clipboard.writeText(value);
       showToast(`${label} copied`);
     } catch {
       showToast(`Could not copy ${label}`, 'error');
     }
   };
 
   const handleCreateSlot = async (draft: SlotFormDraft) => {
    setCreateLoading(true);
    try {
      const request = buildSlotPreflightRequest(draft);
      const result = await createRouterSlot(request);
      showToast(`Slot "${draft.slot_id}" created`, result.ok ? 'success' : 'info');
      // Persist tensor split mode record only after successful create
      saveTensorSplitRecord(
        draft.slot_id,
        draft.tensor_split_mode,
        (typeof request.tensor_split === 'string' ? request.tensor_split : '') ?? '',
      );
      setAddDialogOpen(false);
      await refreshAfterAction();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create slot', 'error');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleSaveSlot = async (draft: SlotFormDraft) => {
    if (!editingSlot) return;
    setSaveLoading(true);
    try {
      const request = buildSlotUpdateRequest(draft);
      const result = await updateRouterSlot(editingSlot.slot_id, request);
      // Persist tensor split mode record only after successful save
      saveTensorSplitRecord(
        editingSlot.slot_id,
        draft.tensor_split_mode,
        (typeof request.tensor_split === 'string' ? request.tensor_split : '') ?? '',
      );
      showToast(`Slot "${draft.slot_id}" updated`, result.ok ? 'success' : 'info');
      setEditingSlot(null);
      await refreshAfterAction();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update slot', 'error');
    } finally {
      setSaveLoading(false);
    }
  };


  const runningSlots = slots.filter((slot) => slot.running === true || slot.status === 'running').length;
  const readySlots = slots.filter((slot) => slot.ready === true || slot.running === true || slot.status === 'running').length;
  const activeEndpoints = endpoints.filter((endpoint) => endpoint.ready === true || endpoint.running === true || endpoint.status === 'running').length;
  const slotStatus = slots.length > 0 ? (runningSlots > 0 ? 'online' : 'offline') : (slotsError ? 'offline' : 'unknown');
  const endpointStatus = endpoints.length > 0 ? (activeEndpoints > 0 ? 'online' : 'offline') : (endpointsError ? 'offline' : 'unknown');
  const gpuStatus = vramData ? 'online' : (vramError ? 'offline' : 'unknown');

  const isStale = Boolean((slotsError || endpointsError || vramError) && hasEverLoadedRef.current);

  const formatTimeAgo = (ts: number) => {
    const diff = Date.now() - ts;
    const secs = Math.floor(diff / 1000);
    if (secs < 10) return 'just now';
    if (secs < 60) return `${secs}s ago`;
    return `${Math.floor(secs / 60)}m ago`;
  };

  return (
    <div className={`px-4 py-4 sm:px-6 sm:py-6 h-full flex flex-col ${isStale ? 'opacity-90' : ''}`}>
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center gap-2">
          <h2 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-accent-primary to-accent-tertiary bg-clip-text text-transparent">
            Router
          </h2>
          {refreshing && (
            <span className="flex items-center gap-1 text-[10px] sm:text-xs text-text-tertiary">
              <Loader2 className="w-3 h-3 animate-spin" />
              Refreshing…
            </span>
          )}
          {isStale && (
            <span className="flex items-center gap-1 text-[10px] sm:text-xs text-status-warning bg-status-warning/10 px-2 py-0.5 rounded-full">
              <AlertCircle className="w-3 h-3" />
              Showing last known data
            </span>
          )}
        </div>
        <p className="text-sm text-text-secondary mt-1">
          Manage the multi-slot Qonduit Router, slot endpoints, and GPU allocation status.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] sm:text-xs text-text-tertiary">
          <span className="font-mono bg-bg-secondary/60 border border-border-subtle rounded px-2 py-1">{routerBase}</span>
          {lastUpdated && !refreshing && <span>Updated {formatTimeAgo(lastUpdated)}</span>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4">
        <MobileCollapsibleCard
          title="Slots"
          icon={<Layers3 className="w-5 h-5 text-accent-primary" />}
          statusBadge={{ status: slotStatus, label: slots.length > 0 ? `${runningSlots}/${slots.length} running` : 'No slots' }}
          summaryText={slots.length > 0 ? `${readySlots} ready · ${slots.length} total` : 'No slot data loaded'}
          metrics={slots.length > 0 ? [
            { label: 'Total', value: String(slots.length) },
            { label: 'Running', value: String(runningSlots) },
            { label: 'Ready', value: String(readySlots) },
          ] : undefined}
          defaultExpanded={true}
          defaultExpandedMobile={true}
          localStorageKey="qonduit-router-slots"
          action={{ label: 'Add Slot', onClick: handleAddSlot, variant: 'primary' }}
        >
          <SlotList
             slots={slots}
             error={slotsError}
             actionLoading={actionLoading}
             logsOpenBySlot={logsOpenBySlot}
             logsBySlot={logsBySlot}
             logsErrorBySlot={logsErrorBySlot}
             preflightBySlot={preflightBySlot}
             preflightErrorBySlot={preflightErrorBySlot}
             onLaunch={(slot) => handleSlotAction(slot, 'launch')}
             onStop={(slot) => handleSlotAction(slot, 'stop')}
             onRestart={(slot) => handleSlotAction(slot, 'restart')}
             onEdit={handleEdit}
             onPreflight={handlePreflight}
             onLogs={handleLogs}
             onCopy={handleCopy}
           />
        </MobileCollapsibleCard>

        <MobileCollapsibleCard
          title="Endpoints"
          icon={<Globe className="w-5 h-5 text-accent-secondary" />}
          statusBadge={{ status: endpointStatus, label: endpoints.length > 0 ? `${activeEndpoints}/${endpoints.length} active` : 'No endpoints' }}
          summaryText={endpoints.length > 0 ? 'OpenAI-compatible slot base URLs' : 'No endpoint data loaded'}
          metrics={endpoints.length > 0 ? [
            { label: 'Total', value: String(endpoints.length) },
            { label: 'Active', value: String(activeEndpoints) },
          ] : undefined}
          defaultExpanded={true}
          defaultExpandedMobile={false}
          localStorageKey="qonduit-router-endpoints"
        >
          <EndpointsPanel routerBase={routerBase} endpoints={endpoints} error={endpointsError} onCopy={handleCopy} />
        </MobileCollapsibleCard>

        <MobileCollapsibleCard
          title="GPU Status"
          icon={<Cpu className="w-5 h-5 text-accent-tertiary" />}
          statusBadge={{ status: gpuStatus, label: vramData ? `${vramData.total} total` : 'Unavailable' }}
          summaryText={vramData ? `Used: ${vramData.used} / Free: ${vramData.free}` : 'GPU information unavailable'}
          metrics={vramData ? [
            { label: 'Total', value: vramData.total },
            { label: 'Used', value: vramData.used },
            { label: 'Free', value: vramData.free },
          ] : undefined}
          defaultExpanded={true}
          defaultExpandedMobile={false}
          localStorageKey="qonduit-router-gpu"
        >
          <RouterGpuPanel vramData={vramData} gpuRows={gpuRows} error={vramError} />
        </MobileCollapsibleCard>

        <MobileAccordionSection title="About the Multi-Slot Router" defaultOpen={false} localStorageKey="qonduit-router-about">
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            The multi-slot Qonduit Router manages independent llama.cpp slots such as Primary and OpenHands.
            Each slot can expose its own OpenAI-compatible base URL while sharing the router control plane.
          </p>
          <div className="flex items-start gap-2 mt-3 text-[10px] sm:text-xs text-text-tertiary">
            <CheckCircle2 className="w-3.5 h-3.5 text-status-success flex-shrink-0 mt-0.5" />
            <p>
              Background polling refreshes slots, endpoints, and GPU data without blanking the last successful response.
              GPU 1 / Quadro K620 is displayed as an excluded display adapter and is not labeled as an inference GPU.
            </p>
          </div>
        </MobileAccordionSection>
      </div>

      <AddSlotDialog
             open={addDialogOpen}
             models={routerModels}
             gpus={gpus}
             modelError={modelsError}
             gpuError={vramError}
             preflightLoading={dialogPreflightLoading}
             preflightResult={dialogPreflightResult}
             preflightError={dialogPreflightError}
             effectiveGpuDevices={dialogEffectiveGpus}
             onPreflight={handleDialogPreflight}
             onCreate={handleCreateSlot}
             onCreateLoading={createLoading}
             onClose={() => setAddDialogOpen(false)}
           />
    
           <EditSlotDialog
             open={Boolean(editingSlot)}
             slot={editingSlot}
             models={routerModels}
             gpus={gpus}
             modelError={modelsError}
             gpuError={vramError}
             preflightLoading={dialogPreflightLoading}
             preflightResult={dialogPreflightResult}
             preflightError={dialogPreflightError}
             effectiveGpuDevices={dialogEffectiveGpus}
             onPreflight={handleDialogPreflight}
             onSave={handleSaveSlot}
             onSaveLoading={saveLoading}
             onClose={() => setEditingSlot(null)}
           />

      {toastMessage && (
        <Toast message={toastMessage} type={toastType} onClose={() => setToastMessage(null)} />
      )}
    </div>
  );
};

export default RouterPage;
