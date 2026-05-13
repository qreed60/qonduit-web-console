import React from 'react';
import { safeDisplayValue } from '../utils/routerDisplay';

interface GpuTableProps {
  rows: Array<{
    index: number;
    label?: unknown;
    name: unknown;
    total: unknown;
    used: unknown;
    free: unknown;
    isDisplay?: boolean;
  }>;
}

const GpuTable: React.FC<GpuTableProps> = ({ rows }) => {
  if (rows.length === 0) return null;

  return (
    <div className="space-y-2">
      {/* Desktop: table view */}
      <div className="hidden md:block bg-bg-secondary/30 border border-border-subtle rounded-lg overflow-hidden">
        <div className="grid grid-cols-5 gap-2 px-3 py-1.5 bg-bg-tertiary/50 text-[10px] font-medium text-text-tertiary uppercase tracking-wider">
          <span className="col-span-2">GPU</span>
          <span className="text-right">Total</span>
          <span className="text-right">Used</span>
          <span className="text-right">Free</span>
        </div>
        {rows.map((gpu) => {
          const label = safeDisplayValue(gpu.label || gpu.name);
          const total = safeDisplayValue(gpu.total);
          const used = safeDisplayValue(gpu.used);
          const free = safeDisplayValue(gpu.free);
          return (
            <div key={gpu.index} className={`grid grid-cols-5 gap-2 px-3 py-2 text-xs border-t border-border-subtle ${gpu.isDisplay ? 'bg-status-warning/5' : ''}`}>
              <span className="col-span-2 text-text-primary truncate" title={label}>{label}</span>
              <span className="font-mono text-text-primary text-right">{total}</span>
              <span className="font-mono text-status-warning text-right">{used}</span>
              <span className="font-mono text-status-success text-right">{free}</span>
            </div>
          );
        })}
      </div>

      {/* Mobile: stacked cards */}
      <div className="md:hidden space-y-2">
        {rows.map((gpu) => {
          const label = safeDisplayValue(gpu.label || gpu.name);
          const total = safeDisplayValue(gpu.total);
          const used = safeDisplayValue(gpu.used);
          const free = safeDisplayValue(gpu.free);
          return (
            <div key={gpu.index} className={`bg-bg-secondary/30 border border-border-subtle rounded-lg p-3 ${gpu.isDisplay ? 'border-status-warning/30' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-text-primary truncate" title={label}>{label}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-text-tertiary">Total</span>
                  <p className="font-mono text-text-primary">{total}</p>
                </div>
                <div>
                  <span className="text-[10px] text-text-tertiary">Used</span>
                  <p className="font-mono text-status-warning">{used}</p>
                </div>
                <div>
                  <span className="text-[10px] text-text-tertiary">Free</span>
                  <p className="font-mono text-status-success">{free}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GpuTable;
