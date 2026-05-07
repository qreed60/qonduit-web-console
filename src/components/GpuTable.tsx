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

const GpuTable: React.FC<GpuTableProps> = ({ rows }) => (
  <div className="bg-bg-secondary/30 border border-border-subtle rounded-lg overflow-hidden">
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
);

export default GpuTable;
