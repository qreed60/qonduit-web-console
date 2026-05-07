import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface RawJsonPanelProps {
  data: Record<string, unknown> | null;
  label?: string;
}

const RawJsonPanel: React.FC<RawJsonPanelProps> = ({ data, label = 'Raw JSON' }) => {
  const [expanded, setExpanded] = useState(false);

  if (!data) return null;

  return (
    <div className="mt-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-primary transition-colors"
      >
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
        {label}
      </button>
      {expanded && (
        <pre className="mt-2 p-3 bg-bg-terminal border border-border-subtle rounded-lg text-[10px] font-mono text-text-tertiary overflow-auto max-h-64 whitespace-pre-wrap break-all">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
};

export default RawJsonPanel;
