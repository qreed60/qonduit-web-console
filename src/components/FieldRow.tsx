import React from 'react';
import { Copy, CheckCircle } from 'lucide-react';

interface FieldRowProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
  truncate?: boolean;
  monospace?: boolean;
  copyable?: boolean;
  onCopy?: () => void;
}

const FieldRow: React.FC<FieldRowProps> = ({
  label,
  value,
  icon,
  truncate = true,
  monospace = false,
  copyable = false,
  onCopy,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    if (!onCopy) return;
    await onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex items-start justify-between gap-2 py-1.5">
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        {icon && <span className="text-text-tertiary flex-shrink-0">{icon}</span>}
        <span className="text-[10px] uppercase tracking-wide text-text-tertiary flex-shrink-0">{label}</span>
      </div>
      <div className="flex items-center gap-1.5 min-w-0 justify-end">
        <p
          className={`text-sm text-text-primary ${monospace ? 'font-mono' : ''} ${truncate ? 'truncate' : ''}`}
          title={truncate ? value : undefined}
        >
          {value}
        </p>
        {copyable && (
          <button
            onClick={handleCopy}
            className="p-2 rounded-lg text-text-tertiary hover:text-accent-primary hover:bg-bg-tertiary transition-colors flex-shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center"
            title="Copy"
          >
            {copied ? <CheckCircle className="w-3.5 h-3.5 text-status-success" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
};

export default FieldRow;
