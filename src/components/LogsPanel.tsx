import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiPath } from '../config/endpoints';
import {
  Terminal,
  Play,
  Pause,
  RotateCcw,
  Copy,
  CheckCircle2,
  AlertCircle,
  Maximize2,
  Minimize2,
} from 'lucide-react';

interface LogsPanelProps {
  routerStatus: { running: boolean; exists: boolean } | null;
}

const LOG_COLORS: Record<string, string> = {
  ERROR: 'text-status-error',
  WARN: 'text-status-warning',
  DEBUG: 'text-text-tertiary',
  INFO: 'text-text-secondary',
};

const LOGS_URL = '/api/v1/qonduit-router/logs';
const POLL_INTERVAL_MS = 4000;
const maxLines = 500;

const LogsPanel: React.FC<LogsPanelProps> = ({ routerStatus }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const maxLinesRef = useRef(maxLines);

  // Load expanded state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('qonduit-logs-expanded');
    if (saved === 'true') setIsExpanded(true);
  }, []);

  const saveExpandedState = (expanded: boolean) => {
    setIsExpanded(expanded);
    localStorage.setItem('qonduit-logs-expanded', String(expanded));
  };

  const fetchLogs = useCallback(async () => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const url = apiPath('router', LOGS_URL);
      const response = await fetch(url, { signal: controller.signal });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const text = await response.text();
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

      setError(null);

      setLogs(prev => {
        const next = [...prev, ...lines];
        return next.length > maxLinesRef.current ? next.slice(-maxLinesRef.current) : next;
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : 'Failed to fetch logs');
      }
    }
  }, []);

  // Polling effect
  useEffect(() => {
    if (!routerStatus?.running) return;

    // Initial fetch
    fetchLogs();

    const pollInterval = setInterval(() => {
      fetchLogs();
    }, POLL_INTERVAL_MS);

    pollIntervalRef.current = pollInterval;

    return () => {
      clearInterval(pollInterval);
      pollIntervalRef.current = null;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [routerStatus?.running, fetchLogs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(logs.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  // Filter logs by search term
  const filteredLogs = searchTerm
    ? logs.filter((log) => log.toLowerCase().includes(searchTerm.toLowerCase()))
    : logs;

  // Get color class for a log line
  const getLogColor = (log: string): string => {
    const upper = log.toUpperCase();
    for (const [level, color] of Object.entries(LOG_COLORS)) {
      if (upper.includes(level)) return color;
    }
    return 'text-text-secondary';
  };

  const containerHeight = isExpanded ? 'h-[calc(100vh-200px)]' : 'h-64';

  return (
    <div className="bg-bg-card rounded-xl border border-border-primary shadow-card">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-text-tertiary" />
            <h3 className="text-sm font-semibold text-text-primary">Terminal</h3>
          </div>
          {routerStatus?.running && (
            <div className="flex items-center gap-1.5">
              {error ? (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-status-error" />
                  <span className="text-[10px] text-status-error">Error</span>
                </>
              ) : isPaused ? (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-status-warning" />
                  <span className="text-[10px] text-status-warning">Paused</span>
                </>
              ) : (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse-dot" />
                  <span className="text-[10px] text-status-success">Polling</span>
                </>
              )}
            </div>
          )}
          <span className="text-[10px] text-text-tertiary">
            {filteredLogs.length} / {logs.length} lines
          </span>
        </div>
        <div className="flex items-center gap-1">
          {routerStatus?.running && (
            <>
              <button
                 onClick={() => setIsPaused(!isPaused)}
                 className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-all duration-200"
                 title={isPaused ? 'Resume' : 'Pause'}
               >
                 {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
               </button>
              <button
                onClick={fetchLogs}
                className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-all duration-200"
                title="Refresh"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              {error && (
                <button
                  onClick={fetchLogs}
                  className="p-1.5 rounded-lg text-status-warning hover:bg-status-warning/10 transition-all duration-200"
                  title="Retry"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          )}
          {logs.length > 0 && (
            <button
              onClick={handleCopyAll}
              className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-all duration-200"
              title="Copy all logs"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-status-success" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}
          <button
            onClick={() => saveExpandedState(!isExpanded)}
            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-all duration-200"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Search Bar */}
      {logs.length > 0 && (
        <div className="px-4 pb-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter logs..."
            className="w-full px-3 py-1.5 bg-bg-secondary border border-border-subtle rounded-lg text-xs text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent-primary/50 focus:ring-1 focus:ring-accent-primary/50 transition-all duration-200"
          />
        </div>
      )}

      {/* Logs Display */}
      <div className={`px-4 pb-4 ${isExpanded ? 'pt-2' : ''}`}>
        <div className={`bg-bg-terminal rounded-lg border border-border-subtle overflow-hidden ${containerHeight}`}>
          <div className="h-full overflow-y-auto font-mono text-xs p-3">
            {logs.length === 0 ? (
              <div className="flex items-center justify-center h-full text-text-tertiary">
                {error ? (
                  <div className="text-center">
                    <AlertCircle className="w-8 h-8 text-status-error mx-auto mb-2" />
                    <p className="text-status-error mb-1">Connection Error</p>
                    <p className="text-xs text-text-tertiary mb-1">{error}</p>
                    <p className="text-[10px] text-text-tertiary font-mono mb-3">
                      URL: {apiPath('router', LOGS_URL)}
                    </p>
                    {routerStatus?.running && (
                      <button
                        onClick={fetchLogs}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium border border-status-warning/30 text-status-warning hover:bg-status-warning/10 transition-all duration-200"
                      >
                        Retry
                      </button>
                    )}
                  </div>
                ) : !routerStatus ? (
                  <div className="text-center">
                    <Terminal className="w-8 h-8 text-text-tertiary/50 mx-auto mb-2" />
                    <p className="text-text-tertiary text-sm">Router not available</p>
                    <p className="text-text-tertiary/60 text-xs mt-1">Check that the Router service is running</p>
                  </div>
                ) : routerStatus.running ? (
                  <div className="text-center">
                    <Terminal className="w-8 h-8 text-text-tertiary/50 mx-auto mb-2" />
                    <p className="text-text-tertiary text-sm">No logs yet — polling every 4s</p>
                    <p className="text-text-tertiary/60 text-xs mt-1">Logs will appear once the model starts producing output</p>
                    <button
                      onClick={fetchLogs}
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent-primary/10 text-accent-primary border border-accent-primary/20 hover:bg-accent-primary/20 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Refresh
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <Terminal className="w-8 h-8 text-text-tertiary/50 mx-auto mb-2" />
                    <p className="text-text-tertiary text-sm">No logs yet</p>
                    <p className="text-text-tertiary/60 text-xs mt-1">Launch a model to see logs here</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-0.5">
                {filteredLogs.map((log, idx) => (
                  <div key={idx} className={`${getLogColor(log)} hover:bg-white/5 px-1 -mx-1 rounded transition-colors`}>
                    <span className="text-text-tertiary/40 select-none mr-3">{String(idx + 1).padStart(4, ' ')}</span>
                    {log}
                  </div>
                ))}
                <div ref={null} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogsPanel;
