import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getRagProjects,
  getRagCollections,
  getRagProjectDetail,
} from '../services/ragApi';
import {
  RagProjectSummary,
  RagCollectionInfo,
  RagEndpointError,
  RagProjectDetail,
} from '../types';
import { buildRagCollectionOptions } from '../utils/ragCollectionOptions';
import { Database, RefreshCw, Loader2, X, Sparkles } from 'lucide-react';

const RAG_SELECTION_KEY = 'qonduit-rag-chat-selection';

interface RagSelection {
  projectId: string;
  collection: string | null;
  enabled: boolean;
}

interface RagContextSelectorProps {
  onSelectionChange: (selection: RagSelection) => void;
}

const RagContextSelector: React.FC<RagContextSelectorProps> = ({ onSelectionChange }) => {
  const [projects, setProjects] = useState<RagProjectSummary[]>([]);
  const [collections, setCollections] = useState<RagCollectionInfo[]>([]);
  const [projectDetail, setProjectDetail] = useState<RagProjectDetail | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [collectionsLoading, setCollectionsLoading] = useState(false);
  const [projectDetailLoading, setProjectDetailLoading] = useState(false);
  const [projectsError, setProjectsError] = useState<RagEndpointError | null>(null);
  const [collectionsError, setCollectionsError] = useState<RagEndpointError | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Load persisted selection
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RAG_SELECTION_KEY);
      if (raw) {
        const saved: RagSelection = JSON.parse(raw);
        if (saved?.projectId) {
          setSelectedProjectId(saved.projectId);
          setSelectedCollection(saved.collection || null);
          setEnabled(saved.enabled !== false);
        }
      }
    } catch { /* ignore */ }
  }, []);

  const fetchProjects = useCallback(async () => {
    setProjectsLoading(true);
    setProjectsError(null);
    try {
      const result = await getRagProjects();
      setProjects(result.projects);
      // Auto-select first existing project
      if (!selectedProjectId && result.projects.length > 0) {
        const firstExisting = result.projects.find(p => p.exists);
        const firstProject = result.projects[0];
        const target = firstExisting || firstProject;
        if (target) {
          setSelectedProjectId(target.project_id);
        }
      }
    } catch (err) {
      setProjectsError(err instanceof Error ? {
        url: 'gateway/v1/rag/projects',
        message: err.message,
        timestamp: Date.now(),
      } : null);
    } finally {
      setProjectsLoading(false);
    }
  }, [selectedProjectId]);

  const fetchCollections = useCallback(async (projectId: string) => {
    setCollectionsLoading(true);
    setCollectionsError(null);
    try {
      const result = await getRagCollections(projectId);
      setCollections(result.collections);
      // Auto-select first collection if none selected
      if (!selectedCollection && result.collections.length > 0) {
        setSelectedCollection(result.collections[0].name);
      }
    } catch (err) {
      setCollectionsError(err instanceof Error ? {
        url: `gateway/v1/rag/projects/${projectId}/collections`,
        message: err.message,
        timestamp: Date.now(),
      } : null);
    } finally {
      setCollectionsLoading(false);
    }
  }, [selectedCollection]);

  const fetchProjectDetail = useCallback(async (projectId: string) => {
    setProjectDetailLoading(true);
    try {
      const result = await getRagProjectDetail(projectId);
      setProjectDetail(result);
    } catch (err) {
      setProjectDetail(null);
    } finally {
      setProjectDetailLoading(false);
    }
  }, []);

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects();
  }, []);

  // Fetch collections and project detail when project changes
  useEffect(() => {
    if (selectedProjectId) {
      fetchCollections(selectedProjectId);
      fetchProjectDetail(selectedProjectId);
    }
  }, [selectedProjectId, fetchCollections, fetchProjectDetail]);

  // Notify parent of selection changes
  useEffect(() => {
    onSelectionChange({ projectId: selectedProjectId, collection: selectedCollection, enabled });
  }, [selectedProjectId, selectedCollection, enabled, onSelectionChange]);

  // Persist selection changes (deduped to avoid unnecessary writes)
   useEffect(() => {
     if (selectedProjectId) {
       try {
         const toSave = JSON.stringify({
           projectId: selectedProjectId,
           collection: selectedCollection,
           enabled,
         });
         const prev = localStorage.getItem(RAG_SELECTION_KEY);
         if (prev !== toSave) {
           localStorage.setItem(RAG_SELECTION_KEY, toSave);
         }
       } catch { /* ignore */ }
     }
   }, [selectedProjectId, selectedCollection, enabled]);

  // Build merged collection options from both sources (memoized to avoid re-creating on every render)
   const collectionOptions = useMemo(
     () => buildRagCollectionOptions(projectDetail, {
       collections,
       project_id: selectedProjectId,
     }),
     [projectDetail, collections, selectedProjectId]
   );

  // Validate persisted selection against merged options
   useEffect(() => {
     if (selectedCollection && collectionOptions.length > 0) {
       const exists = collectionOptions.some(opt => opt.name === selectedCollection);
       if (!exists) {
         setSelectedCollection(null);
       }
     }
   }, [collectionOptions, selectedCollection]);

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    setSelectedCollection(null);
  };

  const handleCollectionChange = (collection: string) => {
    setSelectedCollection(collection);
  };

  const formatNumber = (n: number): string => n.toLocaleString();

  const selectedProject = projects.find(p => p.project_id === selectedProjectId);
   const selectedCollectionInfo = collectionOptions.find(c => c.name === selectedCollection);

  const ragIndicator = enabled && selectedProject
    ? `RAG: ${selectedProject.project_id}${selectedCollectionInfo ? ` / ${selectedCollectionInfo.name}` : ''}`
    : null;

  // Close handler
  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Toggle handler
  const handleToggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  return (
    <>
      {/* Trigger Button */}
      <div className="flex items-center gap-2 w-full sm:w-auto">
        {/* RAG indicator badge */}
        {ragIndicator && (
          <span className="px-3 py-2 rounded-md text-xs font-medium bg-accent-primary/10 text-accent-primary border border-accent-primary/20 flex items-center gap-1.5 flex-shrink-0">
            <Sparkles className="w-4 h-4" />
            {ragIndicator}
          </span>
        )}

        {/* RAG expand button */}
        <button
          onClick={handleToggle}
          className="p-3 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-all duration-200 min-h-[48px] min-w-[48px] flex items-center justify-center"
          title={isOpen ? 'Hide RAG selector' : 'Show RAG selector'}
        >
          <Database className="w-5 h-5 transition-transform duration-200" />
        </button>
      </div>

      {/* Backdrop (mobile only) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={handleClose}
          aria-hidden="true"
        />
      )}

      {/* Bottom Sheet / Popover Panel */}
      <div
        className={`fixed bottom-0 left-0 right-0 max-h-[75vh] overflow-y-auto rounded-t-2xl bg-bg-card border border-border-primary shadow-2xl z-50 p-4 sm:p-5 space-y-4 transition-transform duration-300 lg:relative lg:max-h-none lg:overflow-visible lg:rounded-xl lg:right-auto lg:top-full lg:mt-2 lg:w-80 lg:shadow-card lg:z-0 lg:border lg:rounded-xl lg:translate-y-0 ${
          isOpen ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="RAG Context Settings"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Database className="w-4 h-4 text-accent-primary" />
            RAG Context
          </h4>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-all duration-200 min-h-[40px] min-w-[40px] flex items-center justify-center"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Enable/disable toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-secondary">Enable RAG context</span>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
              enabled ? 'bg-accent-primary' : 'bg-text-tertiary/30'
            }`}
            role="switch"
            aria-checked={enabled}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Projects dropdown */}
        <div>
          <label className="block text-[10px] text-text-tertiary uppercase tracking-wider mb-1.5">
            Project
          </label>
          {projectsLoading ? (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-bg-secondary rounded-lg border border-border-primary min-h-[44px]">
              <Loader2 className="w-4 h-4 animate-spin text-text-tertiary flex-shrink-0" />
              <span className="text-sm text-text-tertiary">Loading projects...</span>
            </div>
          ) : projectsError ? (
            <div className="px-3 py-2.5 bg-status-error/5 border border-status-error/20 rounded-lg">
              <span className="text-sm text-status-error">{projectsError.message}</span>
            </div>
          ) : projects.length === 0 ? (
            <div className="px-3 py-2.5 bg-bg-secondary rounded-lg border border-border-primary min-h-[44px]">
              <span className="text-sm text-text-tertiary">No RAG projects available</span>
            </div>
          ) : (
            <select
              value={selectedProjectId}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="w-full px-3 py-2.5 bg-bg-secondary border border-border-primary rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-primary/50 min-h-[44px]"
            >
              {projects.map(project => (
                <option key={project.project_id} value={project.project_id}>
                  {project.project_id} ({formatNumber(project.points_count)} pts{project.exists ? '' : ' · not found'})
                </option>
              ))}
            </select>
          )}
          {projects.length > 0 && (
            <button
              onClick={fetchProjects}
              disabled={projectsLoading}
              className="mt-1.5 p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-all duration-200 disabled:opacity-50 min-h-[40px] min-w-[40px] flex items-center justify-center"
              title="Refresh projects"
            >
              <RefreshCw className={`w-4 h-4 ${projectsLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>

        {/* Collections dropdown */}
        {selectedProjectId && (
          <div>
            <label className="block text-[10px] text-text-tertiary uppercase tracking-wider mb-1.5">
              Collection
            </label>
            {collectionsLoading || projectDetailLoading ? (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-bg-secondary rounded-lg border border-border-primary min-h-[44px]">
                <Loader2 className="w-4 h-4 animate-spin text-text-tertiary flex-shrink-0" />
                <span className="text-sm text-text-tertiary">Loading collections...</span>
              </div>
            ) : collectionsError ? (
              <div className="px-3 py-2.5 bg-status-error/5 border border-status-error/20 rounded-lg">
                <span className="text-sm text-status-error">{collectionsError.message}</span>
              </div>
            ) : collectionOptions.length === 0 ? (
              <div className="px-3 py-2.5 bg-bg-secondary rounded-lg border border-border-primary min-h-[44px]">
                <span className="text-sm text-text-tertiary">No collections</span>
              </div>
            ) : (
              <select
                value={selectedCollection || ''}
                onChange={(e) => handleCollectionChange(e.target.value)}
                className="w-full px-3 py-2.5 bg-bg-secondary border border-border-primary rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-primary/50 min-h-[44px]"
              >
                <option value="">— Select collection —</option>
                {collectionOptions.map((col) => (
                  <option key={col.name} value={col.name}>
                    {col.name}
                    {col.point_count !== undefined ? ` (${formatNumber(col.point_count)} pts)` : ''}
                    {col.source === 'logical' ? ' (logical)' : ''}
                  </option>
                ))}
              </select>
            )}
            {collectionOptions.length > 0 && (
               <button
                 onClick={() => fetchCollections(selectedProjectId)}
                 disabled={collectionsLoading}
                 className="mt-1.5 p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-all duration-200 disabled:opacity-50 min-h-[40px] min-w-[40px] flex items-center justify-center"
                 title="Refresh collections"
               >
                 <RefreshCw className={`w-4 h-4 ${collectionsLoading ? 'animate-spin' : ''}`} />
               </button>
             )}
           </div>
         )}

        {/* Selected RAG info */}
        {selectedProject && (
          <div className="pt-3 border-t border-border-subtle">
            <p className="text-xs text-text-tertiary">
              Collection: <span className="font-mono text-text-secondary">{selectedProject.qdrant_collection}</span>
            </p>
            <p className="text-xs text-text-tertiary mt-1">
              Status: <span className={selectedProject.exists ? 'text-status-success' : 'text-status-warning'}>
                {selectedProject.exists ? 'Exists' : 'Not Found'}
              </span>
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default RagContextSelector;
