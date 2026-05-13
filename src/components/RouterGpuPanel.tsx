import React from 'react';
import GpuSummary from './GpuSummary';
import GpuTable from './GpuTable';

interface RouterGpuPanelProps {
  vramData: { total: string; used: string; free: string } | null;
  gpuRows: Array<{ index: number; label: string; name: string; total: string; used: string; free: string; isDisplay?: boolean }>;
  error?: string | null;
}

const RouterGpuPanel: React.FC<RouterGpuPanelProps> = ({ vramData, gpuRows, error }) => {
  if (!vramData) {
    return (
      <div className="bg-bg-secondary/50 rounded-lg p-3 border border-border-subtle">
        <p className="text-xs text-text-tertiary">{error || 'GPU information unavailable'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <GpuSummary total={vramData.total} used={vramData.used} free={vramData.free} />
      {gpuRows.length > 0 ? (
        <GpuTable rows={gpuRows} />
      ) : (
        <p className="text-xs text-text-tertiary bg-bg-secondary/50 rounded-lg border border-border-subtle p-3">
          No per-GPU rows were returned by the router.
        </p>
      )}
    </div>
  );
};

export default RouterGpuPanel;
