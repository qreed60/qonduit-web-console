import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface MobileAccordionSectionProps {
  title: string;
  badge?: string;
  defaultOpen?: boolean;
  localStorageKey?: string;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
}

const MobileAccordionSection: React.FC<MobileAccordionSectionProps> = ({
  title,
  badge,
  defaultOpen = false,
  localStorageKey,
  children,
  headerActions,
}) => {
  const [isOpen, setIsOpen] = useState(() => {
    if (localStorageKey) {
      const saved = localStorage.getItem(localStorageKey);
      if (saved !== null) return saved === 'true';
    }
    return defaultOpen;
  });

  useEffect(() => {
    if (localStorageKey) {
      localStorage.setItem(localStorageKey, String(isOpen));
    }
  }, [isOpen, localStorageKey]);

  return (
    <div className="bg-bg-card rounded-xl border border-border-primary overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 hover:bg-bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-sm sm:text-base font-semibold text-text-primary truncate">{title}</span>
          {badge && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent-primary/10 text-accent-primary flex-shrink-0">
              {badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {headerActions}
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-text-tertiary" />
          ) : (
            <ChevronDown className="w-4 h-4 text-text-tertiary" />
          )}
        </div>
      </button>
      {isOpen && (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-border-subtle">
          {children}
        </div>
      )}
    </div>
  );
};

export default MobileAccordionSection;
