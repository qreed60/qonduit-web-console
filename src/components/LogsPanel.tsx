import React, { useState, useEffect, useCallback, useRef } from 'react';
import { streamLogs } from '../services/api';
import { apiPath, getEndpoint, getMode } from '../config/endpoints';
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
  Info,
  TestTube,
  ChevronUp,
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
const WAIT_TIMEOUT_MS = 10000; // 10 seconds before showing "no output yet" hint
const MAX_LINES = 500;

/**
 * Get diagnostic hints based on error message content.
 */
function getErrorHint(errorMsg: string): string | null {
  const lower = errorMsg.toLowerCase();
  if (lower.includes('failed to fetch') || lower.includes('networkerror')) {
    return 'This usually means the browser is blocking the request. Check the browser console (F12) for Private Network Access (PNA) or CORS errors. If using Chrome/Edge on LAN, you may need to enable "Private Network Access" in browser settings.';
  }
  if (lower.includes('cors')) {
    return 'CORS policy is blocking the request. The backend needs to add Access-Control-Allow-Origin headers to the /logs endpoint.';
  }
  if (lower.includes('404')) {
    return 'The logs endpoint was not found. Check that the router API is running and the /logs path is correct.';
  }
  if (lower.includes('403')) {
    return 'Access forbidden. Check that the router API allows requests from your current origin.';
  }
  return null;
}

const LogsPanel: React.FC<LogsPanelProps> = ({ routerStatus }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [waitTimeout, setWaitTimeout] = useState(false);
  const [reconnectCount, setReconnectCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const waitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamingRef = useRef(false); // Track streaming state in callback refs

  // Load expanded state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('qonduit-logs-expanded');
    if (saved === 'true') setIsExpanded(true);
  }, []);

  const saveExpandedState = (expanded: boolean) => {
    setIsExpanded(expanded);
    localStorage.setItem('qonduit-logs-expanded', String(expanded));
  };

  const stopStreaming = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsStreaming(false);
    setIsConnected(false);
    streamingRef.current = false;
  }, []);

  const startStreaming = useCallback(async () => {
    // Stop any existing stream first
    stopStreaming();

    streamingRef.current = true;
    setIsStreaming(true);
    setError(null);
    setWaitTimeout(false);
    setTestResult(null);

    // Set up wait timeout — if no logs arrive within 10s, show hint
    if (waitTimerRef.current) clearTimeout(waitTimerRef.current);
    waitTimerRef.current = setTimeout(() => {
      setWaitTimeout(true);
    }, WAIT_TIMEOUT_MS);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      for await (const _ of streamLogs((line: string) => {
        if (controller.signal.aborted || isPaused) return;
        // Clear wait timeout on first log line
        if (waitTimeout) setWaitTimeout(false);
        // Set connected state on first line
        if (!isConnected) setIsConnected(true);
        setLogs((prev) => {
          const next = [...prev, line];
          return next.length > MAX_LINES ? next.slice(-MAX_LINES) : next;
        });
      }, controller.signal)) {
        // Keep the generator running
      }
    } catch (err) {
      if (!controller.signal.aborted && streamingRef.current) {
        const msg = err instanceof Error ? err.message : 'Failed to connect to log stream';
        setError(msg);
        setIsConnected(false);
      }
    } finally {
      if (waitTimerRef.current) {
        clearTimeout(waitTimerRef.current);
        waitTimerRef.current = null;
      }
      if (!controller.signal.aborted && streamingRef.current) {
        setIsStreaming(false);
        setIsConnected(false);
      }
    }
  }, [isPaused, stopStreaming, waitTimeout, isConnected]);

  const reconnect = useCallback(async () => {
    setError(null);
    setReconnectCount((prev) => prev + 1);
    // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
    const backoffMs = Math.min(1000 * Math.pow(2, Math.min(reconnectCount, 4)), 30000);
    console.debug('[LogsPanel] Reconnecting in', backoffMs, 'ms (attempt', reconnectCount + 1, ')');
    await new Promise((resolve) => setTimeout(resolve, backoffMs));
    startStreaming();
  }, [reconnectCount, startStreaming]);

  const togglePause = useCallback(() => {
    if (isPaused) {
      setIsPaused(false);
      startStreaming();
    } else {
      setIsPaused(true);
      stopStreaming();
    }
  }, [isPaused, startStreaming, stopStreaming]);

  // Auto-start streaming when model starts running
  useEffect(() => {
    if (routerStatus?.running && !isStreaming && !error && !isPaused) {
      startStreaming();
    }
    return () => {
      stopStreaming();
    };
  }, [routerStatus?.running, isStreaming, error, isPaused, startStreaming, stopStreaming]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStreaming();
      if (waitTimerRef.current) clearTimeout(waitTimerRef.current);
    };
  }, [stopStreaming]);

  const isRunning = routerStatus?.running;

  // Endpoint info
  const endpointMode = getMode();
  const routerBase = getEndpoint('router');
  const fullLogsUrl = apiPath('router', LOGS_URL);

  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(logs.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const handleTestEndpoint = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const response = await fetch(fullLogsUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(10000),
      });
      const contentType = response.headers.get('content-type') || 'unknown';
      if (response.ok) {
        // Read a small chunk to verify the stream works
        if (response.body) {
          const reader = response.body.getReader();
          const { value } = await reader.read();
          reader.releaseLock();
          const preview = value ? new TextDecoder().decode(value).substring(0, 200) : '(empty)';
          setTestResult({
            ok: true,
            message: `OK (HTTP ${response.status}, Content-Type: ${contentType})\nPreview: ${preview}`,
          });
        } else {
          setTestResult({
            ok: true,
            message: `OK (HTTP ${response.status}, Content-Type: ${contentType}) — but no response body`,
          });
        }
      } else {
        setTestResult({
          ok: false,
          message: `HTTP ${response.status} (Content-Type: ${contentType})`,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setTestResult({
        ok: false,
        message: `Failed: ${msg}`,
      });
    } finally {
      setIsTesting(false);
    }
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

  // Determine status indicator
  const getStatusIndicator = () => {
    if (!isRunning) return null;

    if (error) {
      return (
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-status-error" />
          <span className="text-[10px] text-status-error">Error</span>
          {reconnectCount > 0 && (
            <span className="text-[10px] text-text-tertiary">×{reconnectCount}</span>
          )}
        </div>
      );
    }

    if (isStreaming && !isPaused) {
      if (isConnected) {
        return (
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse-dot" />
            <span className="text-[10px] text-status-success">Connected</span>
          </div>
        );
      }
      return (
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-status-warning animate-pulse-dot" />
          <span className="text-[10px] text-status-warning">Connecting...</span>
        </div>
      );
    }

    if (isPaused) {
      return (
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-status-warning" />
          <span className="text-[10px] text-status-warning">Paused</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-text-tertiary" />
        <span className="text-[10px] text-text-tertiary">Reconnecting...</span>
      </div>
    );
  };

  return (
    <div className="bg-bg-card rounded-xl border border-border-primary shadow-card">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-text-tertiary" />
            <h3 className="text-sm font-semibold text-text-primary">Terminal</h3>
          </div>
          {getStatusIndicator()}
          <span className="text-[10px] text-text-tertiary">
            {filteredLogs.length} / {logs.length} lines
          </span>
        </div>
        <div className="flex items-center gap-1">
          {isRunning && (
            <>
              <button
                onClick={togglePause}
                className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-all duration-200"
                title={isPaused ? 'Resume' : 'Pause'}
              >
                {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              </button>
              {(error || !isStreaming) && (
                <button
                  onClick={reconnect}
                  className="p-1.5 rounded-lg text-status-warning hover:bg-status-warning/10 transition-all duration-200"
                  title="Reconnect"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={handleTestEndpoint}
                disabled={isTesting}
                className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-all duration-200 disabled:opacity-50"
                title="Test Logs Endpoint"
              >
                <TestTube className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              </button>
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
            onClick={() => setShowDebug(!showDebug)}
            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-all duration-200"
            title="Debug Info"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => saveExpandedState(!isExpanded)}
            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-all duration-200"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Debug Panel */}
      {showDebug && (
        <div className="mx-4 mb-2 p-3 bg-bg-secondary rounded-lg border border-border-subtle text-xs font-mono space-y-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-text-primary font-semibold">Debug Information</span>
            <button
              onClick={() => setShowDebug(false)}
              className="text-text-tertiary hover:text-text-primary"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
            <span className="text-text-tertiary">Mode:</span>
            <span className="text-text-primary">{endpointMode}</span>
            <span className="text-text-tertiary">Router Base:</span>
            <span className="text-text-primary break-all">{routerBase}</span>
            <span className="text-text-tertiary">Logs URL:</span>
            <span className="text-text-primary break-all">{fullLogsUrl}</span>
            <span className="text-text-tertiary">Status:</span>
            <span className="text-text-primary">
              {isStreaming ? (isConnected ? 'Connected' : 'Connecting') : error ? 'Error' : isPaused ? 'Paused' : 'Idle'}
            </span>
            <span className="text-text-tertiary">Reconnects:</span>
            <span className="text-text-primary">{reconnectCount}</span>
            <span className="text-text-tertiary">Lines:</span>
            <span className="text-text-primary">{logs.length}</span>
            {error && (
              <>
                <span className="text-text-tertiary">Last Error:</span>
                <span className="text-status-error break-all">{error}</span>
              </>
            )}
          </div>
          {testResult && (
            <div className={`mt-2 pt-2 border-t border-border-subtle ${testResult.ok ? 'text-status-success' : 'text-status-error'}`}>
              <span className="text-text-tertiary">Test Result:</span>
              <pre className="whitespace-pre-wrap mt-1">{testResult.message}</pre>
            </div>
          )}
        </div>
      )}

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
                  <div className="text-center max-w-md">
                    <AlertCircle className="w-8 h-8 text-status-error mx-auto mb-2" />
                    <p className="text-status-error mb-1">Connection Error</p>
                    <p className="text-xs text-text-tertiary mb-1">{error}</p>
                    <p className="text-[10px] text-text-tertiary font-mono mb-2 break-all">
                      URL: {fullLogsUrl}
                    </p>
                    {reconnectCount > 0 && (
                      <p className="text-[10px] text-text-tertiary mb-2">
                        Reconnect attempts: {reconnectCount}
                      </p>
                    )}
                    {getErrorHint(error) && (
                      <p className="text-[10px] text-status-warning mb-3 max-w-xs mx-auto">
                        💡 {getErrorHint(error)}
                      </p>
                    )}
                    {isRunning && (
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={reconnect}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-status-warning/30 text-status-warning hover:bg-status-warning/10 transition-all duration-200"
                        >
                          <RotateCcw className="w-3 h-3 inline mr-1" />
                          Reconnect
                        </button>
                        <button
                          onClick={handleTestEndpoint}
                          disabled={isTesting}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border-subtle text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-all duration-200 disabled:opacity-50"
                        >
                          <TestTube className="w-3 h-3 inline mr-1" />
                          Test Endpoint
                        </button>
                      </div>
                    )}
                  </div>
                ) : !routerStatus ? (
                  <div className="text-center">
                    <Terminal className="w-8 h-8 text-text-tertiary/50 mx-auto mb-2" />
                    <p className="text-text-tertiary text-sm">Router not available</p>
                    <p className="text-text-tertiary/60 text-xs mt-1">Check that the Router service is running</p>
                    <button
                      onClick={startStreaming}
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent-primary/10 text-accent-primary border border-accent-primary/20 hover:bg-accent-primary/20 transition-colors"
                    >
                      <Play className="w-3 h-3" />
                      Start Streaming
                    </button>
                  </div>
                ) : isRunning ? (
                  <div className="text-center">
                    <Terminal className="w-8 h-8 text-text-tertiary/50 mx-auto mb-2" />
                    <p className="text-text-tertiary text-sm">
                      {waitTimeout ? 'Waiting for logs... (no output yet)' : 'Waiting for logs...'}
                    </p>
                    <p className="text-text-tertiary/60 text-xs mt-1">
                      {waitTimeout
                        ? 'The model may still be starting up, or the server is not producing output.'
                        : 'Logs will appear once the model starts'}
                    </p>
                    <button
                      onClick={startStreaming}
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent-primary/10 text-accent-primary border border-accent-primary/20 hover:bg-accent-primary/20 transition-colors"
                    >
                      <Play className="w-3 h-3" />
                      Start Streaming
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <Terminal className="w-8 h-8 text-text-tertiary/50 mx-auto mb-2" />
                    <p className="text-text-tertiary text-sm">No logs yet</p>
                    <p className="text-text-tertiary/60 text-xs mt-1">Launch a model to see logs here</p>
                    <button
                      onClick={startStreaming}
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent-primary/10 text-accent-primary border border-accent-primary/20 hover:bg-accent-primary/20 transition-colors"
                    >
                      <Play className="w-3 h-3" />
                      Start Streaming
                    </button>
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
                <div ref={logsEndRef} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogsPanel;
