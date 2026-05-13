import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CollapsibleDetailProps {
  title: string;
  badge?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const CollapsibleDetail: React.FC<CollapsibleDetailProps> = ({
  title,
  badge,
  defaultOpen = false,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-border-subtle overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-bg-secondary/30 transition-colors text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-semibold text-text-primary">{title}</span>
          {badge && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-accent-primary/10 text-accent-primary flex-shrink-0">
              {badge}
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-text-tertiary flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-text-tertiary flex-shrink-0" />
        )}
      </button>
      {isOpen && (
        <div className="px-3 pb-3 border-t border-border-subtle">
          {children}
        </div>
      )}
    </div>
  );
};

export default CollapsibleDetail;
