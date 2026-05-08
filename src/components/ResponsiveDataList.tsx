import React from 'react';

interface ResponsiveDataListProps {
  headers: string[];
  rows: React.ReactNode[][];
  emptyState?: React.ReactNode;
}

const ResponsiveDataList: React.FC<ResponsiveDataListProps> = ({
  headers,
  rows,
  emptyState,
}) => {
  if (rows.length === 0 && emptyState) {
    return <div className="text-center py-6 text-text-tertiary text-sm">{emptyState}</div>;
  }

  // Determine grid columns based on header count
  const gridCols = headers.length <= 2 ? 'grid-cols-2' : headers.length <= 3 ? 'grid-cols-3' : headers.length <= 4 ? 'grid-cols-4' : 'grid-cols-5';

  return (
    <div className="space-y-2">
      {/* Desktop: table view */}
      <div className="hidden md:block bg-bg-secondary/30 border border-border-subtle rounded-lg overflow-hidden">
        <div className={`grid ${gridCols} gap-2 px-3 py-1.5 bg-bg-tertiary/50 text-[10px] font-medium text-text-tertiary uppercase tracking-wider`}>
          {headers.map((h, i) => (
            <span key={i} className={i === headers.length - 1 ? 'text-right' : ''}>{h}</span>
          ))}
        </div>
        {rows.map((row, rowIdx) => (
          <div
            key={rowIdx}
            className={`grid ${gridCols} gap-2 px-3 py-2 text-xs border-t border-border-subtle`}
          >
            {row.map((cell, cellIdx) => (
              <span
                key={cellIdx}
                className={cellIdx === row.length - 1 ? 'text-right' : ''}
              >
                {cell}
              </span>
            ))}
          </div>
        ))}
      </div>

      {/* Mobile: stacked cards */}
      <div className="md:hidden space-y-2">
        {rows.map((row, rowIdx) => (
          <div
            key={rowIdx}
            className="bg-bg-secondary/30 border border-border-subtle rounded-lg p-3 space-y-1.5"
          >
            {row.map((cell, cellIdx) => (
              <div key={cellIdx} className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-text-tertiary uppercase tracking-wider flex-shrink-0">
                  {headers[cellIdx]}
                </span>
                <span className="text-xs text-text-primary text-right flex-1 min-w-0">
                  {cell}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResponsiveDataList;
