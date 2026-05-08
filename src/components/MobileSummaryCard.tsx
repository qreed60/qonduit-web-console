import React from 'react';
import StatusBadge from './StatusBadge';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface Metric {
  label: string;
  value: string;
}

interface MobileSummaryCardProps {
  title: string;
  status?: 'online' | 'offline' | 'loading' | 'unknown';
  statusLabel?: string;
  metrics?: Metric[];
  action?: { label: string; onClick: () => void; variant?: 'primary' | 'secondary' };
  onDetails?: () => void;
  detailsLabel?: string;
  children?: React.ReactNode;
  defaultExpanded?: boolean;
}

const MobileSummaryCard: React.FC<MobileSummaryCardProps> = ({
  title,
  status,
  statusLabel,
  metrics,
  action,
  onDetails,
  detailsLabel = 'View details',
  children,
  defaultExpanded = false,
}) => {
  const [expanded, setExpanded] = React.useState(defaultExpanded);

  return (
    <div className="bg-bg-card rounded-xl border border-border-primary overflow-hidden">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <h3 className="text-sm sm:text-base font-semibold text-text-primary truncate">{title}</h3>
            {status && <StatusBadge status={status} label={statusLabel || ''} size="sm" />}
          </div>
          {onDetails && (
            <button
              onClick={onDetails}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-accent-primary border border-accent-primary/30 hover:bg-accent-primary/10 transition-colors flex-shrink-0"
            >
              {detailsLabel}
            </button>
          )}
        </div>

        {/* Metrics */}
        {metrics && metrics.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mb-3">
            {metrics.map((m, i) => (
              <div key={i}>
                <span className="text-[10px] text-text-tertiary uppercase tracking-wider">{m.label}</span>
                <p className="text-sm font-mono text-text-primary">{m.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Action */}
        {action && (
          <button
            onClick={action.onClick}
            className={`w-full min-h-[44px] flex items-center justify-center gap-2 rounded-lg font-medium text-sm transition-all duration-200 ${
              action.variant === 'primary'
                ? 'bg-gradient-to-r from-accent-primary to-accent-tertiary text-white shadow-lg shadow-accent-primary/20'
                : 'border border-border-primary text-text-secondary hover:bg-bg-tertiary'
            }`}
          >
            {action.label}
          </button>
        )}
      </div>

      {/* Expandable content */}
      {children && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between px-4 py-2 bg-bg-secondary/30 border-t border-border-subtle text-xs text-text-tertiary hover:text-text-primary transition-colors"
          >
            <span>{expanded ? 'Hide details' : 'Show details'}</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {expanded && (
            <div className="p-4 border-t border-border-subtle">
              {children}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MobileSummaryCard;
