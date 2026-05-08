import React from 'react';
import { MemoryStick } from 'lucide-react';

interface GpuSummaryProps {
  total: string;
  used: string;
  free: string;
  error?: string | null;
}

const GpuSummary: React.FC<GpuSummaryProps> = ({ total, used, free, error }) => {
  if (error) {
    return (
      <div className="flex items-center gap-2 p-3 bg-bg-secondary/50 border border-border-subtle rounded-lg">
        <MemoryStick className="w-4 h-4 text-text-tertiary flex-shrink-0" />
        <span className="text-xs text-text-tertiary">{error}</span>
      </div>
    );
  }

  return (
     <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 px-3 py-2.5 bg-bg-secondary/50 rounded-lg border border-border-subtle">
       <MemoryStick className="w-4 h-4 text-accent-primary flex-shrink-0" />
       <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm flex-1 w-full">
         <span className="text-text-secondary font-medium">Detected GPU Memory:</span>
         <div className="flex flex-wrap items-center gap-2 sm:gap-4">
           <span className="text-text-secondary">Total: <span className="font-mono text-text-primary">{total}</span></span>
           <span className="text-text-secondary">Used: <span className="font-mono text-status-warning">{used}</span></span>
           <span className="text-text-secondary">Free: <span className="font-mono text-status-success">{free}</span></span>
         </div>
       </div>
     </div>
   );
};

export default GpuSummary;
