import React from 'react';

interface StickyMobileActionBarProps {
  children: React.ReactNode;
}

const StickyMobileActionBar: React.FC<StickyMobileActionBarProps> = ({ children }) => (
  <div className="sticky bottom-0 left-0 right-0 z-40 lg:hidden bg-bg-card/95 backdrop-blur-sm border-t border-border-primary p-3 sm:p-4">
    <div className="flex gap-2">
      {children}
    </div>
  </div>
);

export default StickyMobileActionBar;
