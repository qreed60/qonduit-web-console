import React, { useState, useEffect, useCallback } from 'react';
import {
  getRagProjects,
  getRagCollections,
} from '../services/ragApi';
import {
  RagProjectSummary,
  RagCollectionInfo,
  RagEndpointError,
} from '../types';
import { Database, RefreshCw, Loader2, ChevronDown, Sparkles } from 'lucide-react';

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
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
   const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
   const [enabled, setEnabled] = useState(true);
   const [projectsLoading, setProjectsLoading] = useState(false);
  const [collectionsLoading, setCollectionsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState<RagEndpointError | null>(null);
  const [collectionsError, setCollectionsError] = useState<RagEndpointError | null>(null);
  const [expanded, setExpanded] = useState(false);

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

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects();
  }, []);

  // Fetch collections when project changes
  useEffect(() => {
    if (selectedProjectId) {
      fetchCollections(selectedProjectId);
    }
  }, [selectedProjectId]);

  // Notify parent of selection changes
  useEffect(() => {
    onSelectionChange({ projectId: selectedProjectId, collection: selectedCollection, enabled });
  }, [selectedProjectId, selectedCollection, enabled, onSelectionChange]);

  // Persist selection changes
  useEffect(() => {
    if (selectedProjectId) {
      try {
        localStorage.setItem(RAG_SELECTION_KEY, JSON.stringify({
          projectId: selectedProjectId,
          collection: selectedCollection,
          enabled,
        }));
      } catch { /* ignore */ }
    }
  }, [selectedProjectId, selectedCollection, enabled]);

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

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    setSelectedCollection(null);
  };

  const handleCollectionChange = (collection: string) => {
    setSelectedCollection(collection);
  };

  const formatNumber = (n: number): string => n.toLocaleString();

  const selectedProject = projects.find(p => p.project_id === selectedProjectId);
  const selectedCollectionInfo = collections.find(c => c.name === selectedCollection);

  // Show RAG indicator text
  const ragIndicator = enabled && selectedProject
    ? `RAG: ${selectedProject.project_id}${selectedCollectionInfo ? ` / ${selectedCollectionInfo.name}` : ''}`
    : null;

  return (
    <div className="flex items-center gap-2">
      {/* RAG indicator badge */}
      {ragIndicator && (
        <span className="px-2 py-1 rounded-md text-[10px] font-medium bg-accent-primary/10 text-accent-primary border border-accent-primary/20 flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          {ragIndicator}
        </span>
      )}

      {/* Toggle button (only visible when expanded or if RAG is active) */}
      {(expanded || ragIndicator) && (
        <button
          onClick={() => setEnabled(!enabled)}
          className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all duration-200 ${
            enabled
              ? 'bg-status-success/10 text-status-success border border-status-success/20'
              : 'bg-text-tertiary/10 text-text-tertiary border border-border-primary'
          }`}
          title={enabled ? 'Disable RAG context' : 'Enable RAG context'}
        >
          {enabled ? 'RAG On' : 'RAG Off'}
        </button>
      )}

      {/* Expand/collapse button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-all duration-200"
        title={expanded ? 'Hide RAG selector' : 'Show RAG selector'}
      >
        <Database className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} />
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-bg-card border border-border-primary rounded-xl shadow-card z-50 p-4 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-accent-primary" />
              RAG Context
            </h4>
            <button
              onClick={() => setExpanded(false)}
              className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-all duration-200"
              title="Close"
            >
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>

          {/* Enable/disable toggle */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-secondary">Enable RAG context</span>
            <button
              onClick={() => setEnabled(!enabled)}
              className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${
                enabled ? 'bg-accent-primary' : 'bg-text-tertiary/30'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  enabled ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Projects dropdown */}
          <div>
            <label className="block text-[10px] text-text-tertiary uppercase tracking-wider mb-1">
              Project
            </label>
            {projectsLoading ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-bg-secondary rounded-lg border border-border-primary">
                <Loader2 className="w-3 h-3 animate-spin text-text-tertiary" />
                <span className="text-xs text-text-tertiary">Loading projects...</span>
              </div>
            ) : projectsError ? (
              <div className="px-3 py-2 bg-status-error/5 border border-status-error/20 rounded-lg">
                <span className="text-xs text-status-error">{projectsError.message}</span>
              </div>
            ) : projects.length === 0 ? (
              <div className="px-3 py-2 bg-bg-secondary rounded-lg border border-border-primary">
                <span className="text-xs text-text-tertiary">No RAG projects available</span>
              </div>
            ) : (
              <select
                value={selectedProjectId}
                onChange={(e) => handleProjectChange(e.target.value)}
                className="w-full px-3 py-2 bg-bg-secondary border border-border-primary rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-primary/50"
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
                className="mt-1 p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-all duration-200 disabled:opacity-50"
                title="Refresh projects"
              >
                <RefreshCw className={`w-3 h-3 ${projectsLoading ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>

          {/* Collections dropdown */}
          {selectedProjectId && (
            <div>
              <label className="block text-[10px] text-text-tertiary uppercase tracking-wider mb-1">
                Collection
              </label>
              {collectionsLoading ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-bg-secondary rounded-lg border border-border-primary">
                  <Loader2 className="w-3 h-3 animate-spin text-text-tertiary" />
                  <span className="text-xs text-text-tertiary">Loading collections...</span>
                </div>
              ) : collectionsError ? (
                <div className="px-3 py-2 bg-status-error/5 border border-status-error/20 rounded-lg">
                  <span className="text-xs text-status-error">{collectionsError.message}</span>
                </div>
              ) : collections.length === 0 ? (
                <div className="px-3 py-2 bg-bg-secondary rounded-lg border border-border-primary">
                  <span className="text-xs text-text-tertiary">No collections</span>
                </div>
              ) : (
                <select
                  value={selectedCollection || ''}
                  onChange={(e) => handleCollectionChange(e.target.value)}
                  className="w-full px-3 py-2 bg-bg-secondary border border-border-primary rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-primary/50"
                >
                  <option value="">— Select collection —</option>
                  {collections.map(collection => (
                    <option key={collection.name} value={collection.name}>
                      {collection.name}{collection.point_count ? ` (${formatNumber(collection.point_count)} pts)` : ''}
                    </option>
                  ))}
                </select>
              )}
              {collections.length > 0 && (
                <button
                  onClick={() => fetchCollections(selectedProjectId)}
                  disabled={collectionsLoading}
                  className="mt-1 p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-all duration-200 disabled:opacity-50"
                  title="Refresh collections"
                >
                  <RefreshCw className={`w-3 h-3 ${collectionsLoading ? 'animate-spin' : ''}`} />
                </button>
              )}
            </div>
          )}

          {/* Selected RAG info */}
          {selectedProject && (
            <div className="pt-2 border-t border-border-subtle">
              <p className="text-[10px] text-text-tertiary">
                Collection: <span className="font-mono text-text-secondary">{selectedProject.qdrant_collection}</span>
              </p>
              <p className="text-[10px] text-text-tertiary mt-0.5">
                Status: <span className={selectedProject.exists ? 'text-status-success' : 'text-status-warning'}>
                  {selectedProject.exists ? 'Exists' : 'Not Found'}
                </span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RagContextSelector;
