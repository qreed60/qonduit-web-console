import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  appliedRag: RagSelection;
  onApply: (selection: RagSelection) => void;
}

const RagContextSelector: React.FC<RagContextSelectorProps> = ({ appliedRag, onApply }) => {
  const [projects, setProjects] = useState<RagProjectSummary[]>([]);
  const [collections, setCollections] = useState<RagCollectionInfo[]>([]);
  const [projectDetail, setProjectDetail] = useState<RagProjectDetail | null>(null);

  // ── Draft state (internal to the modal) ──
  const [draftProjectId, setDraftProjectId] = useState('');
  const [draftCollection, setDraftCollection] = useState<string | null>(null);
  const [draftEnabled, setDraftEnabled] = useState(true);

  const [projectsLoading, setProjectsLoading] = useState(false);
  const [collectionsLoading, setCollectionsLoading] = useState(false);
  const [projectDetailLoading, setProjectDetailLoading] = useState(false);
  const [projectsError, setProjectsError] = useState<RagEndpointError | null>(null);
  const [collectionsError, setCollectionsError] = useState<RagEndpointError | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const popupRef = useRef<HTMLDivElement>(null);

  // Sync draft when appliedRag changes and modal is closed
  useEffect(() => {
    if (!isOpen) {
      setDraftProjectId(appliedRag.projectId);
      setDraftCollection(appliedRag.collection);
      setDraftEnabled(appliedRag.enabled);
    }
  }, [appliedRag, isOpen]);

  const fetchProjects = useCallback(async () => {
    setProjectsLoading(true);
    setProjectsError(null);
    try {
      const result = await getRagProjects();
      setProjects(result.projects);
      if (!result.projects.length) {
        // Keep draft as-is if no projects
      } else if (!result.projects.some(p => p.project_id === draftProjectId)) {
        // First time: select first existing or first project
        const firstExisting = result.projects.find(p => p.exists);
        const firstProject = result.projects[0];
        const target = firstExisting || firstProject;
        if (target && !draftProjectId) {
          setDraftProjectId(target.project_id);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCollections = useCallback(async (projectId: string) => {
    setCollectionsLoading(true);
    setCollectionsError(null);
    try {
      const result = await getRagCollections(projectId);
      setCollections(result.collections);
    } catch (err) {
      setCollectionsError(err instanceof Error ? {
        url: `gateway/v1/rag/projects/${projectId}/collections`,
        message: err.message,
        timestamp: Date.now(),
      } : null);
    } finally {
      setCollectionsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (draftProjectId) {
      fetchCollections(draftProjectId);
      fetchProjectDetail(draftProjectId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftProjectId]);

  // Build merged collection options from both sources (memoized)
  const collectionOptions = useMemo(
    () => buildRagCollectionOptions(projectDetail, {
      collections,
      project_id: draftProjectId,
    }),
    [projectDetail, collections, draftProjectId]
  );

  // Known collection names for validation
  const knownCollectionNames = useMemo(
    () => new Set(collectionOptions.map(c => c.name)),
    [collectionOptions]
  );

  const handleProjectChange = (projectId: string) => {
    setDraftProjectId(projectId);
    setDraftCollection(null);
  };

  const handleCollectionChange = (collection: string) => {
    setDraftCollection(collection || null);
  };

  const formatNumber = (n: number): string => n.toLocaleString();

  const selectedProject = projects.find(p => p.project_id === draftProjectId);
  
    // Check if applied collection exists in current collection options
   const appliedCollectionKnown = appliedRag.collection
     ? collectionOptions.some(c => c.name === appliedRag.collection) || draftProjectId === appliedRag.projectId
     : true;
 
   // Trigger indicator (from applied state, not draft) — always visible when enabled with a project
   const ragIndicatorText = appliedRag.enabled && appliedRag.projectId
     ? `RAG: ${appliedRag.projectId}${
         appliedRag.collection
           ? appliedCollectionKnown
             ? ` / ${appliedRag.collection}`
             : ` / ${appliedRag.collection} (loading…)`
           : ' / all collections'
       }`
     : null;

  // Close handler
  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Toggle handler
  const handleToggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  // Close on backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }, [handleClose]);

  // Close on Esc key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, handleClose]);

  // Close when clicking outside (popup ref)
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [isOpen, handleClose]);

  // Shared panel content (rendered once)
  const renderPanelContent = () => (
    <>
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-3 border-b border-border-subtle">
        <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <Database className="w-4 h-4 text-accent-primary" />
          RAG Context
        </h4>
        <button
          onClick={handleClose}
          className="p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-all duration-200 min-h-[36px] min-w-[36px] flex items-center justify-center"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="p-4 space-y-4">
        {/* Enable/disable toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-secondary">Enable RAG context</span>
          <button
            onClick={() => setDraftEnabled(!draftEnabled)}
            className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
              draftEnabled ? 'bg-accent-primary' : 'bg-text-tertiary/30'
            }`}
            role="switch"
            aria-checked={draftEnabled}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                draftEnabled ? 'translate-x-5' : 'translate-x-0'
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
              value={draftProjectId}
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
              className="mt-1.5 p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-all duration-200 disabled:opacity-50 min-h-[36px] min-w-[36px] flex items-center justify-center"
              title="Refresh projects"
            >
              <RefreshCw className={`w-4 h-4 ${projectsLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>

        {/* Collections dropdown */}
        {draftProjectId && (
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
                value={draftCollection || ''}
                onChange={(e) => handleCollectionChange(e.target.value)}
                className="w-full px-3 py-2.5 bg-bg-secondary border border-border-primary rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-primary/50 min-h-[44px]"
              >
                <option value="">— Select collection —</option>
                {collectionOptions.map((col) => (
                  <option key={col.name} value={col.name}>
                    {col.name}
                    {col.point_count !== undefined ? ` (${formatNumber(col.point_count)} pts)` : ''}
                  </option>
                ))}
                {/* Ensure the currently selected value is always visible */}
                {draftCollection && !knownCollectionNames.has(draftCollection) && (
                  <option value={draftCollection} disabled>
                    {draftCollection} (loading…)
                  </option>
                )}
              </select>
            )}
            {collectionOptions.length > 0 && (
              <button
                onClick={() => fetchCollections(draftProjectId)}
                disabled={collectionsLoading}
                className="mt-1.5 p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-all duration-200 disabled:opacity-50 min-h-[36px] min-w-[36px] flex items-center justify-center"
                title="Refresh collections"
              >
                <RefreshCw className={`w-4 h-4 ${collectionsLoading ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        )}

        {/* Selected RAG info (compact status) */}
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

        {/* Action buttons */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => {
              onApply({ projectId: draftProjectId, collection: draftCollection, enabled: draftEnabled });
              // Persist to localStorage
              if (draftProjectId) {
                try {
                  localStorage.setItem(RAG_SELECTION_KEY, JSON.stringify({
                    projectId: draftProjectId,
                    collection: draftCollection,
                    enabled: draftEnabled,
                  }));
                } catch { /* ignore */ }
              }
              setIsOpen(false);
            }}
            className="flex-1 min-h-[48px] px-4 py-3 rounded-xl text-sm font-medium bg-accent-primary text-white hover:bg-accent-primary/90 transition-all duration-200"
          >
            Apply
          </button>
          <button
            onClick={() => {
              // Revert draft to applied
              setDraftProjectId(appliedRag.projectId);
              setDraftCollection(appliedRag.collection);
              setDraftEnabled(appliedRag.enabled);
              setIsOpen(false);
            }}
            className="flex-1 min-h-[48px] px-4 py-3 rounded-xl text-sm font-medium border border-border-primary text-text-secondary hover:bg-bg-tertiary transition-all duration-200"
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Compact Trigger Badge */}
      <div className="flex items-center gap-1.5 w-auto flex-shrink-0">
        {/* RAG indicator badge (only when enabled and project selected) */}
        {ragIndicatorText && (
          <button
            onClick={handleToggle}
            className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-accent-primary/10 text-accent-primary border border-accent-primary/20 flex items-center gap-1.5 hover:bg-accent-primary/20 transition-colors min-h-[32px]"
            title="RAG Context Settings"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="truncate max-w-[120px] sm:max-w-none">{ragIndicatorText}</span>
          </button>
        )}

        {/* RAG toggle button — always visible */}
        <button
          onClick={handleToggle}
          className={`p-2 rounded-lg transition-all duration-200 min-h-[32px] min-w-[32px] flex items-center justify-center flex-shrink-0 ${
            appliedRag.enabled ? 'text-accent-primary bg-accent-primary/10' : 'text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary'
          }`}
          title={isOpen ? 'Close RAG selector' : 'RAG Context Settings'}
        >
          <Database className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
        </button>
      </div>

      {/* Single portal containing backdrop + panel as siblings */}
      {isOpen && createPortal(
        <div className="fixed inset-0 z-[9999] pointer-events-none" aria-modal="true" aria-label="RAG Context Settings">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 pointer-events-auto transition-opacity duration-200"
            onClick={handleBackdropClick}
            aria-hidden="true"
          />

          {/* Mobile bottom sheet + Desktop centered modal */}
          <div
            ref={popupRef}
            className="absolute z-[10000] pointer-events-auto bg-bg-card border border-border-primary shadow-2xl overflow-y-auto
              inset-x-0 bottom-0 rounded-t-2xl max-h-[85vh] pb-[env(safe-area-inset-bottom)]
              lg:rounded-2xl lg:max-w-[520px] lg:w-[480px] lg:max-h-[80vh]
              lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2
              transition-transform transition-opacity duration-200
              translate-y-0 opacity-100
            "
          >
            {renderPanelContent()}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default RagContextSelector;
