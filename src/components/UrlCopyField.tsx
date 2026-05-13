import React, { useState } from 'react';
import { Copy, CheckCircle } from 'lucide-react';

interface UrlCopyFieldProps {
  url: string;
  label: string;
  onCopy: (value: string, label: string) => void;
  truncateLength?: number;
}

const UrlCopyField: React.FC<UrlCopyFieldProps> = ({
  url,
  label,
  onCopy,
  truncateLength = 35,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
     await onCopy(url, label);
     setCopied(true);
     setTimeout(() => setCopied(false), 1500);
   };

  const displayUrl = url.length > truncateLength
    ? `${url.slice(0, truncateLength)}…`
    : url;

  return (
    <div className="flex items-center gap-2">
      <p className="text-xs font-mono text-text-primary truncate flex-1" title={url}>
        {displayUrl}
      </p>
      <button
        onClick={handleCopy}
        className="p-2.5 rounded-lg text-text-tertiary hover:text-accent-primary hover:bg-bg-tertiary transition-colors flex-shrink-0 min-w-[40px] min-h-[40px] flex items-center justify-center"
        title={`Copy ${label}`}
      >
        {copied ? <CheckCircle className="w-4 h-4 text-status-success" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
};

export default UrlCopyField;
