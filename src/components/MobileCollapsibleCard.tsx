import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
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
  children?: React.ReactNode;

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
       if (saved !== null) {
         // If saved state is valid, use it
         const parsed = saved === 'true';
         // Check if saved state is reasonable for current viewport
         const mobile = window.innerWidth < 640;
         if (mobile && parsed === defaultExpandedMobile) return defaultExpandedMobile;
         if (!mobile && parsed === defaultExpanded) return defaultExpanded;
         // Saved state conflicts with defaults — use defaults
         return mobile ? defaultExpandedMobile : defaultExpanded;
       }
     }
     return isMobile ? defaultExpandedMobile : defaultExpanded;
   });
   const prevMobileRef = useRef(isMobile);

  useEffect(() => {
     const handleResize = () => {
       const mobile = window.innerWidth < 640;
 
       // Only reset expanded state when viewport type changes (mobile <-> desktop)
       if (prevMobileRef.current !== mobile) {
         prevMobileRef.current = mobile;
         setExpanded(mobile ? defaultExpandedMobile : defaultExpanded);
       }
     };
     window.addEventListener('resize', handleResize);
     return () => window.removeEventListener('resize', handleResize);
   }, [defaultExpanded, defaultExpandedMobile]);

  // Persist to localStorage
  useEffect(() => {
    if (localStorageKey) {
      localStorage.setItem(localStorageKey, String(expanded));
    }
  }, [expanded, localStorageKey]);

  const toggleExpanded = () => setExpanded(prev => !prev);

  return (
    <div className={`bg-bg-card rounded-xl border border-border-primary shadow-card overflow-hidden ${className}`}>
      {/* Collapsible header — always clickable */}
      <button
        onClick={toggleExpanded}
        className="w-full flex items-start gap-3 p-4 sm:p-5 text-left transition-colors hover:bg-bg-secondary/30 cursor-pointer"
        aria-expanded={expanded}
        tabIndex={0}
        role="button"
      >
        {/* Icon */}
        {icon && (
          <div className="w-10 h-10 rounded-lg bg-bg-secondary flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
        )}

        {/* Title + Summary + Metrics */}
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

        {/* Chevron Indicator — always visible */}
        <div className="flex-shrink-0 mt-1">
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-text-tertiary transition-transform duration-200" />
          ) : (
            <ChevronDown className="w-5 h-5 text-text-tertiary transition-transform duration-200" />
          )}
        </div>
      </button>

      {/* Expanded Content — only render when expanded */}
      {expanded && children && (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-border-subtle">
          {children}
        </div>
      )}
    </div>
  );
};

export default MobileCollapsibleCard;
