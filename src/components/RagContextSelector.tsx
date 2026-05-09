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

  const popupRef = useRef<HTMLDivElement>(null);

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

  // Persist selection changes
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

  // Build merged collection options from both sources (memoized)
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
    // Delay to avoid immediate re-close
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [isOpen, handleClose]);

  return (
    <>
      {/* Compact Trigger Badge — always inline, never expands layout */}
      <div className="flex items-center gap-1.5 w-auto flex-shrink-0">
        {/* RAG indicator badge (only when enabled and project selected) */}
        {ragIndicator && (
          <button
            onClick={handleToggle}
            className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-accent-primary/10 text-accent-primary border border-accent-primary/20 flex items-center gap-1.5 hover:bg-accent-primary/20 transition-colors min-h-[32px]"
            title="RAG Context Settings"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="truncate max-w-[120px] sm:max-w-none">{ragIndicator}</span>
          </button>
        )}

        {/* RAG toggle button — always visible */}
        <button
          onClick={handleToggle}
          className={`p-2 rounded-lg transition-all duration-200 min-h-[32px] min-w-[32px] flex items-center justify-center flex-shrink-0 ${
            enabled ? 'text-accent-primary bg-accent-primary/10' : 'text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary'
          }`}
          title={isOpen ? 'Close RAG selector' : 'RAG Context Settings'}
        >
          <Database className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
        </button>
      </div>

      {/* Portal-mounted Backdrop */}
      {isOpen && createPortal(
        <div
          className="fixed inset-0 bg-black/30 z-[90] transition-opacity duration-200"
          onClick={handleBackdropClick}
          aria-hidden="true"
        />,
        document.body
      )}

      {/* Portal-mounted Popup / Modal / Bottom Sheet */}
      {isOpen && createPortal(
        <div
          ref={popupRef}
          className={`fixed transition-all duration-200
            hidden lg:flex lg:items-center lg:justify-center lg:inset-0 lg:z-[100]
            lg:hidden bottom-0 left-0 right-0 z-[100]
            w-[420px] max-w-[90vw] lg:max-h-[80vh] max-h-[85vh]
            overflow-y-auto rounded-2xl bg-bg-card border border-border-primary shadow-2xl
            ${isOpen ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-full opacity-0 scale-95'}
            pb-[env(safe-area-inset-bottom)]
          `}
          role="dialog"
          aria-modal="true"
          aria-label="RAG Context Settings"
        >
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
          <div className="p-4 space-y-4 overflow-y-auto">
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
                  className="mt-1.5 p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-all duration-200 disabled:opacity-50 min-h-[36px] min-w-[36px] flex items-center justify-center"
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
                      </option>
                    ))}
                  </select>
                )}
                {collectionOptions.length > 0 && (
                  <button
                    onClick={() => fetchCollections(selectedProjectId)}
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
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default RagContextSelector;
