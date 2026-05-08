import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, CheckCircle2 } from 'lucide-react';

interface RawJsonPanelProps {
  data: Record<string, unknown> | null;
  label?: string;
}

const RawJsonPanel: React.FC<RawJsonPanelProps> = ({ data, label = 'Raw JSON' }) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!data) return null;

  const jsonString = JSON.stringify(data, null, 2);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between">
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
          <button
            onClick={handleCopy}
            className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
            title="Copy JSON"
          >
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-status-success" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
      {expanded && (
        <pre className="mt-2 p-3 bg-bg-terminal border border-border-subtle rounded-lg text-[10px] sm:text-xs font-mono text-text-tertiary overflow-auto max-h-64 whitespace-pre-wrap break-all">
          {jsonString}
        </pre>
      )}
    </div>
  );
};

export default RawJsonPanel;
