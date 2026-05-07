import React from 'react';
import { Layers, AlertCircle } from 'lucide-react';
import { RagCollectionListResponse, RagEndpointError } from '../types';
import EndpointErrorInline from './EndpointErrorInline';

interface RagCollectionsCardProps {
  collections: RagCollectionListResponse | null;
  collectionsError: RagEndpointError | null;
  projectId: string;
}

const RagCollectionsCard: React.FC<RagCollectionsCardProps> = ({
  collections,
  collectionsError,
  projectId,
}) => {
  return (
    <div className="bg-bg-card rounded-xl border border-border-primary p-5 shadow-card">
      <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2 mb-4">
        <Layers className="w-4 h-4 text-accent-primary" />
        Logical Namespace Collections
      </h3>

      <p className="text-[10px] text-text-tertiary mb-3">
        Project: <span className="font-mono text-text-secondary">{projectId}</span>
        <span className="ml-2">
          (These are logical namespace markers, not physical Qdrant collection names)
        </span>
      </p>

      {collectionsError ? (
        <div className="flex items-center gap-2 text-xs text-status-error">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Unable to fetch collections</span>
        </div>
      ) : !collections || collections.collections.length === 0 ? (
        <div className="flex items-center gap-2 text-xs text-text-tertiary py-4">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>No marker collections found, or Qdrant is unavailable.</span>
        </div>
      ) : (
        <div className="space-y-1.5">
          {collections.collections.map((name) => (
            <div
              key={name}
              className="flex items-center gap-2 px-3 py-2 bg-bg-secondary rounded-lg border border-border-subtle"
            >
              <Layers className="w-3 h-3 text-accent-primary/60 flex-shrink-0" />
              <span className="text-xs font-mono text-text-primary">{name}</span>
            </div>
          ))}
        </div>
      )}

      <EndpointErrorInline error={collectionsError} />
    </div>
  );
};

export default RagCollectionsCard;
