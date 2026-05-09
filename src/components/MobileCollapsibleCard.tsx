import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import StatusBadge from './StatusBadge';

export interface CardMetric {
  label: string;
  value: string;
}

export interface CardAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export interface StatusBadgeConfig {
  status: 'online' | 'offline' | 'loading' | 'unknown';
  label: string;
}

interface MobileCollapsibleCardProps {
  title: string;
  children: React.ReactNode;

  // Visual
  icon?: React.ReactNode;
  statusBadge?: StatusBadgeConfig;
  summaryText?: string;
  metrics?: CardMetric[];
  action?: CardAction;

  // Interaction
  defaultExpanded?: boolean;
  defaultExpandedMobile?: boolean;
  localStorageKey?: string;

  // Styling
  className?: string;
}

const MobileCollapsibleCard: React.FC<MobileCollapsibleCardProps> = ({
  title,
  icon,
  statusBadge,
  summaryText,
  metrics,
  action,
  defaultExpanded = true,
  defaultExpandedMobile = false,
  localStorageKey,
  className = '',
  children,
}) => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const [expanded, setExpanded] = useState(() => {
    if (localStorageKey) {
      const saved = localStorage.getItem(localStorageKey);
      if (saved !== null) return saved === 'true';
    }
    return isMobile ? defaultExpandedMobile : defaultExpanded;
  });
  const [isMobileView, setIsMobileView] = useState(isMobile);

  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sync expanded on resize to reset behavior
  useEffect(() => {
    if (!isMobileView) {
      setExpanded(defaultExpanded);
    } else {
      setExpanded(defaultExpandedMobile);
    }
  }, [isMobileView, defaultExpanded, defaultExpandedMobile]);

  // Persist to localStorage
  useEffect(() => {
    if (localStorageKey) {
      localStorage.setItem(localStorageKey, String(expanded));
    }
  }, [expanded, localStorageKey]);

  const shouldCollapsible = isMobileView;

  return (
    <div className={`bg-bg-card rounded-xl border border-border-primary shadow-card overflow-hidden ${className}`}>
      <button
        onClick={() => shouldCollapsible && setExpanded(!expanded)}
        className={`w-full flex items-start gap-3 p-4 sm:p-5 text-left transition-colors hover:bg-bg-secondary/30 ${
          !shouldCollapsible ? 'cursor-default' : 'cursor-pointer'
        }`}
        aria-expanded={shouldCollapsible ? expanded : undefined}
        tabIndex={shouldCollapsible ? 0 : -1}
        role={shouldCollapsible ? 'button' : undefined}
      >
        {/* Icon */}
        {icon && (
          <div className="w-10 h-10 rounded-lg bg-bg-secondary flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
        )}

        {/* Title + Summary */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-base sm:text-lg font-semibold text-text-primary">{title}</span>
            {statusBadge && <StatusBadge status={statusBadge.status} label={statusBadge.label} />}
          </div>
          {summaryText && (
            <p className="text-sm text-text-secondary mt-0.5">{summaryText}</p>
          )}

          {/* Metrics Grid */}
          {metrics && metrics.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              {metrics.map((m, i) => (
                <div key={i}>
                  <span className="text-[10px] text-text-tertiary uppercase tracking-wider">
                    {m.label}
                  </span>
                  <p className="text-sm font-mono text-text-primary">{m.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Action Button */}
          {action && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                action.onClick();
              }}
              className={`mt-2 w-full min-h-[44px] flex items-center justify-center gap-2 rounded-lg font-medium text-sm transition-all ${
                action.variant === 'primary'
                  ? 'bg-gradient-to-r from-accent-primary to-accent-tertiary text-white shadow-lg shadow-accent-primary/20'
                  : 'border border-border-primary text-text-secondary hover:text-text-primary'
              }`}
            >
              {action.label}
            </button>
          )}
        </div>

        {/* Chevron Indicator (mobile only) */}
        {shouldCollapsible && (
          <ChevronDown
            className={`w-5 h-5 text-text-tertiary flex-shrink-0 mt-1 transition-transform duration-200 ${
              expanded ? 'rotate-180' : ''
            }`}
          />
        )}
      </button>

      {/* Expanded Content */}
      {(shouldCollapsible && expanded) && (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-border-subtle">
          {children}
        </div>
      )}
      {!shouldCollapsible && (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-border-subtle">
          {children}
        </div>
      )}
    </div>
  );
};

export default MobileCollapsibleCard;
