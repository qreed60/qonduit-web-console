import React from 'react';

interface GpuTableProps {
  rows: Array<{
    index: number;
    name: string;
    total: string;
    used: string;
    free: string;
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
          <span>GPU</span>
          <span>Name</span>
          <span className="text-right">Total</span>
          <span className="text-right">Used</span>
          <span className="text-right">Free</span>
        </div>
        {rows.map((gpu) => (
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

      {/* Mobile: stacked cards */}
      <div className="md:hidden space-y-2">
        {rows.map((gpu) => (
          <div key={gpu.index} className={`bg-bg-secondary/30 border border-border-subtle rounded-lg p-3 ${gpu.isDisplay ? 'border-status-warning/30' : ''}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-text-tertiary">#{gpu.index}</span>
                <span className="text-sm font-medium text-text-primary truncate">{gpu.name}</span>
                {gpu.isDisplay && (
                  <span className="text-[10px] text-status-warning flex-shrink-0">(display)</span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-text-tertiary">Total</span>
                <p className="font-mono text-text-primary">{gpu.total}</p>
              </div>
              <div>
                <span className="text-[10px] text-text-tertiary">Used</span>
                <p className="font-mono text-status-warning">{gpu.used}</p>
              </div>
              <div>
                <span className="text-[10px] text-text-tertiary">Free</span>
                <p className="font-mono text-status-success">{gpu.free}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GpuTable;
