import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ActionButton {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'success' | 'error' | 'warning';
  loading?: boolean;
}

interface MobileActionGroupProps {
  actions: ActionButton[];
  variant?: 'row' | 'grid-2' | 'stack';
}

const variantStyles: Record<string, string> = {
  primary: 'bg-accent-primary/10 text-accent-primary border-accent-primary/20 hover:bg-accent-primary/20',
  secondary: 'bg-bg-tertiary/50 text-text-secondary border-border-primary hover:bg-bg-tertiary',
  success: 'bg-status-success/10 text-status-success border-status-success/20 hover:bg-status-success/20',
  error: 'bg-status-error/10 text-status-error border-status-error/20 hover:bg-status-error/20',
  warning: 'bg-status-warning/10 text-status-warning border-status-warning/20 hover:bg-status-warning/20',
};

const MobileActionGroup: React.FC<MobileActionGroupProps> = ({
  actions,
  variant = 'row',
}) => {
  if (actions.length === 0) return null;

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const useGrid = variant === 'grid-2' && isMobile;
  const useStack = variant === 'stack' || (variant === 'row' && isMobile && actions.length > 4);

  const baseButton =
    'inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]';

  if (useStack) {
    return (
      <div className="flex flex-col gap-2 w-full">
        {actions.map((action, idx) => (
          <button
            key={idx}
            onClick={action.onClick}
            disabled={action.disabled || action.loading}
            className={`${baseButton} w-full ${variantStyles[action.variant || 'secondary']}`}
          >
            {action.loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {action.icon}
            {action.label}
          </button>
        ))}
      </div>
    );
  }

  if (useGrid) {
    return (
      <div className="grid grid-cols-2 gap-2 w-full">
        {actions.map((action, idx) => (
          <button
            key={idx}
            onClick={action.onClick}
            disabled={action.disabled || action.loading}
            className={`${baseButton} ${variantStyles[action.variant || 'secondary']}`}
          >
            {action.loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {action.icon}
            {action.label}
          </button>
        ))}
      </div>
    );
  }

  // Desktop row or small action sets on mobile
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action, idx) => (
        <button
          key={idx}
          onClick={action.onClick}
          disabled={action.disabled || action.loading}
          className={`${baseButton} ${variantStyles[action.variant || 'secondary']}`}
        >
          {action.loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {action.icon}
          {action.label}
        </button>
      ))}
    </div>
  );
};

export default MobileActionGroup;
