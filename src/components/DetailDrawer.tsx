import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface DetailDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  actions?: React.ReactNode;
}

const DetailDrawer: React.FC<DetailDrawerProps> = ({
  open,
  onClose,
  title,
  children,
  size = 'md',
  actions,
}) => {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  const widthClass = size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-3xl' : 'max-w-xl';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] animate-fade-in"
        onClick={onClose}
      />
      {/* Mobile: bottom sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[70] lg:hidden animate-slide-up"
        style={{ maxHeight: '85vh' }}
      >
        <div className={`bg-bg-card border-t border-border-primary rounded-t-2xl mx-0 ${widthClass}`}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
            <h3 className="text-base font-semibold text-text-primary">{title}</h3>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="overflow-y-auto p-5" style={{ maxHeight: 'calc(85vh - 120px)' }}>
            {children}
          </div>
          {actions && (
            <div className="flex gap-3 justify-end px-5 py-4 border-t border-border-subtle">
              {actions}
            </div>
          )}
        </div>
      </div>
      {/* Desktop: modal */}
      <div className="hidden lg:flex fixed inset-0 z-[60] items-center justify-center p-4">
        <div className={`bg-bg-card border border-border-primary rounded-2xl shadow-2xl w-full ${widthClass} animate-fade-in-up`}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
            <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="overflow-y-auto p-6" style={{ maxHeight: '70vh' }}>
            {children}
          </div>
          {actions && (
            <div className="flex gap-3 justify-end px-6 py-4 border-t border-border-subtle">
              {actions}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default DetailDrawer;
