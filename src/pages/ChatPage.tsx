import React, { useState, useEffect, useRef, useCallback } from 'react';
import { fetchProviderModels, fetchChatCompletions, streamChatCompletions, getSettings, NormalizedModel, fetchRouterEndpoints, fetchOpenAiModelsFromBase } from '../services/api';
import { ChatMessage, ProviderType, ChatAttachment, ChatAttachmentMode, ChatAttachmentPayload, RouterEndpoint } from '../types';
import Toast from '../components/Toast';
import RagContextSelector from '../components/RagContextSelector';
import ChatAttachmentChips from '../components/ChatAttachmentChips';
import { fileToBase64, formatFileSize, MAX_ATTACHMENT_SIZE } from '../utils/fileUtils';
import { safeDisplayValue } from '../utils/routerDisplay';
import {
  Send,
  Loader2,
  AlertCircle,
  MessageSquare,
  Settings2,
  Copy,
  RefreshCw,
  Globe,
  Paperclip,
} from 'lucide-react';

const RAG_SELECTION_KEY = 'qonduit-rag-chat-selection';
type ChatEndpointMode = 'gateway' | 'direct-slot' | 'gateway-slot';

const ChatPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  const [models, setModels] = useState<NormalizedModel[]>([]);
  const [modelLoading, setModelLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [currentProvider, setCurrentProvider] = useState<ProviderType>('Direct');
  const [endpointMode, setEndpointMode] = useState<ChatEndpointMode>('gateway');
  const [slotEndpoints, setSlotEndpoints] = useState<RouterEndpoint[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [slotEndpointsLoading, setSlotEndpointsLoading] = useState(false);
  const [slotEndpointsError, setSlotEndpointsError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const showToast = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage(msg);
    setToastType(type);
  }, []);

  // ── Applied RAG state (committed, shown in collapsed indicator, persisted) ──
  const [appliedRag, setAppliedRag] = useState(() => {
    try {
      const raw = localStorage.getItem(RAG_SELECTION_KEY);
      if (raw) {
        const saved: { projectId: string; collection: string | null; enabled: boolean } = JSON.parse(raw);
        if (saved?.projectId) {
          return saved;
        }
      }
    } catch { /* ignore */ }
    return { projectId: '', collection: null, enabled: true };
  });

  // ── Streaming state ──
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');

  // Chat attachments
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages or streaming content
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const loadSlotEndpoints = async () => {
    setSlotEndpointsLoading(true);
    try {
      const data = await fetchRouterEndpoints();
      const endpoints = data.endpoints || [];
      setSlotEndpoints(endpoints);
      setSlotEndpointsError(null);
      if (!selectedSlotId && endpoints.length > 0) {
        const primary = endpoints.find((endpoint) => endpoint.slot_id === 'primary');
        setSelectedSlotId(primary?.slot_id || endpoints[0].slot_id);
      }
    } catch (err) {
      setSlotEndpointsError(err instanceof Error ? err.message : 'Failed to fetch router slot endpoints');
    } finally {
      setSlotEndpointsLoading(false);
    }
  };

  const selectedSlotEndpoint = slotEndpoints.find((endpoint) => endpoint.slot_id === selectedSlotId) || null;
  const selectedSlotReady = selectedSlotEndpoint
    ? selectedSlotEndpoint.ready === true || selectedSlotEndpoint.running === true || selectedSlotEndpoint.status === 'running'
    : false;
  const selectedEndpointBase = endpointMode === 'direct-slot' ? selectedSlotEndpoint?.openai_base || '' : 'Gateway/default';
  const directSlotWarning = endpointMode === 'direct-slot'
    ? !selectedSlotEndpoint
      ? 'Selected router slot endpoint is unavailable.'
      : !selectedSlotReady
        ? `${safeDisplayValue(selectedSlotEndpoint.slot_id)} is not ready.`
        : !selectedSlotEndpoint.openai_base
          ? `${safeDisplayValue(selectedSlotEndpoint.slot_id)} has no OpenAI base URL.`
          : null
    : null;
  const gatewaySlotRoutingSupported = false;

  const loadModels = async (provider: ProviderType = currentProvider) => {
    setModelLoading(true);
    try {
      const providerModels = await fetchProviderModels(provider);
      setModels(providerModels);
      setError(null);
      if (providerModels.length > 0) {
        const settings = getSettings();
        const defaultModel = providerModels.find(m => m.id === settings.defaultModel);
        setSelectedModel(defaultModel?.id || providerModels[0].id);
      }
    } catch (err) {
      console.log(`${provider} models unavailable:`, err);
    } finally {
      setModelLoading(false);
    }
  };

  // Load models and router slot endpoints on mount
  useEffect(() => {
    const settings = getSettings();
    setCurrentProvider(settings.defaultProvider);
    loadModels(settings.defaultProvider);
    loadSlotEndpoints();
  }, []);

  // Reload Gateway/default models when provider changes
  useEffect(() => {
    if (endpointMode === 'gateway') {
      loadModels(currentProvider);
    }
  }, [currentProvider, endpointMode]);

  // Reload models from a direct slot endpoint when that endpoint selection changes
  useEffect(() => {
    if (endpointMode !== 'direct-slot') return;
    if (!selectedSlotEndpoint?.openai_base || !selectedSlotReady) {
      setModels([]);
      setSelectedModel('');
      return;
    }

    setModelLoading(true);
    fetchOpenAiModelsFromBase(selectedSlotEndpoint.openai_base, 'Direct')
      .then((slotModels) => {
        setModels(slotModels);
        setSelectedModel(slotModels[0]?.id || '');
      })
      .catch((err) => {
        setModels([]);
        setSelectedModel('');
        setError(err instanceof Error ? err.message : 'Failed to fetch direct slot models');
      })
      .finally(() => setModelLoading(false));
  }, [endpointMode, selectedSlotEndpoint?.openai_base, selectedSlotEndpoint?.slot_id, selectedSlotReady]);

  const handleSend = async () => {
    if (!input.trim() || !selectedModel || loading || isStreaming) return;
    if (endpointMode === 'direct-slot' && (directSlotWarning || !selectedSlotEndpoint?.openai_base)) {
      setError(directSlotWarning || 'No direct router slot endpoint selected.');
      return;
    }

    const userMessage: ChatMessage = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setError(null);
    setIsStreaming(true);
    setStreamingContent('');

    try {
      // Build RAG selection for Gateway mode
      const ragPayload = (endpointMode === 'gateway' && currentProvider === 'Gateway' && appliedRag.enabled && appliedRag.projectId)
        ? {
            projectId: appliedRag.projectId,
            collection: appliedRag.collection || undefined,
          }
        : undefined;

      // Process attachments
      let attachmentPayloads: ChatAttachmentPayload[] | undefined = undefined;
      if (attachments.length > 0) {
        const processed = await Promise.all(
          attachments.map(async (att) => {
            const contentBase64 = await fileToBase64(att.file);
            return {
              name: att.name,
              mime_type: att.type || 'application/octet-stream',
              content_base64: contentBase64,
              collection: (att.mode === 'save_to_rag' || att.mode === 'save_to_rag_only') ? att.collection : undefined,
              mode: att.mode,
              project_id: (att.mode === 'save_to_rag' || att.mode === 'save_to_rag_only') ? att.projectId || ragPayload?.projectId : undefined,
            } as ChatAttachmentPayload;
          })
        );
        attachmentPayloads = processed;
      }

      const chatEndpointBase = endpointMode === 'direct-slot' ? selectedSlotEndpoint?.openai_base : undefined;

      // Try streaming first
      let assistantContent = '';
      let streamSupported = false;

      try {
        for await (const chunk of streamChatCompletions(
          selectedModel,
          newMessages,
          undefined,
          ragPayload,
          attachmentPayloads,
          undefined,
          chatEndpointBase
        )) {
          if (chunk.type === 'delta') {
            assistantContent += chunk.content;
            setStreamingContent(assistantContent);
          } else if (chunk.type === 'error') {
            throw new Error(chunk.error);
          }
        }
        streamSupported = true;
      } catch (streamErr) {
        if (!streamSupported) {
          // Fall back to non-streaming
          const response = await fetchChatCompletions(
            selectedModel,
            newMessages,
            undefined,
            ragPayload,
            attachmentPayloads,
            chatEndpointBase,
          );
          const assistantMessage = response.choices?.[0]?.message;
          assistantContent = assistantMessage?.content || '';
        } else {
          throw streamErr;
        }
      }

      if (assistantContent) {
        const assistantMessage: ChatMessage = { role: 'assistant', content: assistantContent };
        setMessages([...newMessages, assistantMessage]);
      } else {
        setError('No response received from model');
      }

      setAttachments([]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to get response';
      setError(msg);
      showToast(`Chat error: ${msg}`, 'error');
      // Preserve attachments on failure
    } finally {
      setLoading(false);
      setIsStreaming(false);
      setStreamingContent('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
  };

  const handleCopyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      showToast('Message copied to clipboard', 'info');
    } catch { /* ignore */ }
  };

  const handleClearChat = () => {
    setMessages([]);
    setError(null);
  };

  const handleRetry = () => {
    if (messages.length > 0) {
      const lastUserMsgIndex = [...messages].reverse().findIndex(m => m.role === 'user');
      if (lastUserMsgIndex >= 0) {
        const retryMessages = messages.slice(0, messages.length - lastUserMsgIndex);
        setMessages(retryMessages);
        handleSend();
      }
    }
  };

  // ── Attachment helpers ──

  const generateId = () => `att_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: ChatAttachment[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > MAX_ATTACHMENT_SIZE) {
        showToast(`File too large: ${formatFileSize(file.size)} (max ${formatFileSize(MAX_ATTACHMENT_SIZE)})`, 'error');
        continue;
      }
      newAttachments.push({
        id: generateId(),
        file,
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        mode: 'chat_context_only',
        projectId: appliedRag.projectId || undefined,
        collection: appliedRag.collection || undefined,
      });
    }

    if (newAttachments.length > 0) {
      setAttachments(prev => [...prev, ...newAttachments]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveAttachment = useCallback((id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  }, []);

  const handleModeChange = useCallback((id: string, mode: ChatAttachmentMode) => {
    setAttachments(prev => prev.map(a => a.id === id ? { ...a, mode } : a));
  }, []);

  const handleCollectionChange = useCallback((id: string, collection: string) => {
    setAttachments(prev => prev.map(a => a.id === id ? { ...a, collection: collection || undefined } : a));
  }, []);

  const handleOpenFilePicker = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      {/* Header */}
        <div className="flex flex-col items-start gap-2 px-4 py-3 sm:px-6 sm:py-2 border-b border-border-primary bg-bg-card">
          {/* Title row */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <MessageSquare className="w-5 h-5 text-accent-primary flex-shrink-0" />
            <h2 className="text-base sm:text-lg font-semibold text-text-primary">Chat</h2>
            {!selectedModel && !modelLoading && (
              <span className="text-xs text-status-warning flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                No models
              </span>
            )}
          </div>
 
          {/* Controls row 1: Provider + Model */}
          <div className="flex items-center gap-2 w-full flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <Globe className="w-4 h-4 text-text-tertiary flex-shrink-0" />
              <select
                value={currentProvider}
                onChange={(e) => setCurrentProvider(e.target.value as ProviderType)}
                disabled={modelLoading || loading}
                className="flex-1 min-w-0 px-3 py-2 bg-bg-secondary border border-border-primary rounded-lg text-sm font-medium text-text-primary focus:outline-none focus:border-accent-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="Direct">Direct</option>
                <option value="Gateway">Gateway</option>
              </select>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              {modelLoading ? (
                <Loader2 className="w-5 h-5 text-text-tertiary animate-spin flex-shrink-0" />
              ) : (
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  disabled={loading}
                  className="flex-1 min-w-0 px-3 py-2 bg-bg-secondary border border-border-primary rounded-lg text-sm font-medium text-text-primary focus:outline-none focus:border-accent-primary/50 disabled:opacity-50 disabled:cursor-not-allowed truncate"
                >
                  {models.length === 0 ? (
                    <option value="">No models</option>
                  ) : (
                    models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.id}
                      </option>
                    ))
                  )}
                </select>
              )}
              <button
                onClick={() => loadModels(currentProvider)}
                disabled={loading}
                className="p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-all duration-200 disabled:opacity-50 flex-shrink-0"
                title="Refresh models"
              >
                <RefreshCw className={`w-5 h-5 ${modelLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
 
          {/* Controls row 2: Endpoint mode + Slot selector */}
          <div className="flex items-center gap-2 w-full flex-wrap">
            <select
              value={endpointMode}
              onChange={(e) => setEndpointMode(e.target.value as ChatEndpointMode)}
              disabled={loading || isStreaming}
              className="flex-1 min-w-0 px-3 py-2 bg-bg-secondary border border-border-primary rounded-lg text-sm font-medium text-text-primary focus:outline-none focus:border-accent-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="gateway">Gateway/default</option>
              <option value="direct-slot">Direct router slot</option>
              <option value="gateway-slot" disabled={!gatewaySlotRoutingSupported}>Gateway-routed slot (backend support needed)</option>
            </select>
            {endpointMode === 'direct-slot' && (
              <select
                value={selectedSlotId}
                onChange={(e) => setSelectedSlotId(e.target.value)}
                disabled={loading || isStreaming || slotEndpointsLoading || slotEndpoints.length === 0}
                className="flex-1 min-w-0 px-3 py-2 bg-bg-secondary border border-border-primary rounded-lg text-sm font-medium text-text-primary focus:outline-none focus:border-accent-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {slotEndpoints.length === 0 ? (
                  <option value="">No slots</option>
                ) : (
                  slotEndpoints.map((endpoint) => (
                    <option key={endpoint.slot_id} value={endpoint.slot_id}>
                      {safeDisplayValue(endpoint.name || endpoint.slot_id)} — {endpoint.ready || endpoint.running ? 'ready' : safeDisplayValue(endpoint.status || 'unavailable')}
                    </option>
                  ))
                )}
              </select>
            )}
            <button
              onClick={() => { loadModels(currentProvider); loadSlotEndpoints(); }}
              disabled={loading || isStreaming || modelLoading || slotEndpointsLoading}
              className="p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-all duration-200 disabled:opacity-50 flex-shrink-0"
              title="Refresh models and slot endpoints"
            >
              <RefreshCw className={`w-5 h-5 ${modelLoading || slotEndpointsLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
 
          {/* Controls row 3: RAG + Settings */}
          <div className="flex items-center gap-2 w-full justify-between">
            {endpointMode === 'gateway' && currentProvider === 'Gateway' && (
              <div className="flex items-center gap-2">
                <RagContextSelector
                  appliedRag={appliedRag}
                  onApply={(newRag) => {
                    setAppliedRag(newRag);
                  }}
                />
              </div>
            )}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg transition-all duration-200 flex-shrink-0 ${showSettings ? 'text-accent-primary bg-accent-primary/10' : 'text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary'}`}
              title="Chat settings"
            >
              <Settings2 className="w-5 h-5" />
            </button>
          </div>
        </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="px-6 py-3 border-b border-border-primary bg-bg-secondary/50">
          {(() => {
            const settings = getSettings();
            return (
              <div className="flex flex-wrap items-center gap-4 text-xs text-text-secondary">
                <span>Mode: <span className="font-medium text-text-primary">{settings.endpointMode}</span></span>
                <span>·</span>
                <span>Provider: <span className="font-medium text-text-primary">{currentProvider}</span></span>
                <span>·</span>
                <span>Models loaded: <span className="font-medium text-text-primary">{models.length}</span></span>
                <span>·</span>
                <span>Endpoint: <span className="font-mono text-accent-primary">{safeDisplayValue(selectedEndpointBase)}</span></span>
                {endpointMode === 'direct-slot' && (
                  <>
                    <span>·</span>
                    <span>Status: <span className={`font-medium ${directSlotWarning ? 'text-status-warning' : 'text-status-success'}`}>{directSlotWarning || 'running/ready'}</span></span>
                  </>
                )}
                {endpointMode === 'gateway' && currentProvider === 'Gateway' && (
                  <>
                    <span>·</span>
                    <span>RAG: <span className={`font-medium ${appliedRag.enabled && appliedRag.projectId ? 'text-accent-primary' : 'text-text-tertiary'}`}>
                      {appliedRag.enabled && appliedRag.projectId
                        ? `${appliedRag.projectId}${appliedRag.collection ? ` / ${appliedRag.collection}` : ' / all collections'}`
                        : 'Not configured'}
                    </span></span>
                  </>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-4">
        {messages.length === 0 && !isStreaming ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-accent-primary/10 rounded-2xl flex items-center justify-center mb-4 border border-accent-primary/20">
              <MessageSquare className="w-8 h-8 text-accent-primary" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">Start a Conversation</h3>
            <p className="text-sm text-text-secondary max-w-md">
              Send a message to chat with your AI model through the selected endpoint.
              {models.length === 0 && ' No models are currently available — check your Gateway endpoint.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl mx-auto">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex group ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[90%] sm:max-w-[80%] rounded-xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-accent-primary/10 border border-accent-primary/20 text-text-primary'
                      : 'bg-bg-card border border-border-primary text-text-primary'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm whitespace-pre-wrap break-words flex-1">{msg.content}</p>
                    {msg.role === 'assistant' && (
                      <button
                        onClick={() => handleCopyMessage(msg.content)}
                        className="p-1.5 rounded hover:bg-white/10 text-text-tertiary hover:text-text-primary transition-all duration-200 flex-shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                        title="Copy message"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <p className={`text-[10px] sm:text-xs mt-1.5 ${
                    msg.role === 'user' ? 'text-accent-primary/60' : 'text-text-tertiary'
                  }`}>
                    {msg.role === 'user' ? 'You' : selectedModel || 'Model'}
                  </p>
                </div>
              </div>
            ))}

            {/* Streaming message display */}
            {isStreaming && (
              <div className="flex justify-start">
                <div className="max-w-[90%] sm:max-w-[80%] rounded-xl px-4 py-3 bg-bg-card border border-border-primary">
                  <p className="text-sm whitespace-pre-wrap break-words flex-1">
                    {streamingContent || (
                      <span className="flex items-center gap-1">
                        <Loader2 className="w-3 h-3 inline animate-spin" />Streaming…
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] sm:text-xs mt-1.5 text-text-tertiary">{selectedModel || 'Model'}</p>
                </div>
              </div>
            )}

            {/* Loading Indicator (only when not streaming) */}
            {!isStreaming && loading && (
              <div className="flex justify-start">
                <div className="bg-bg-card border border-border-primary rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-accent-primary animate-spin" />
                    <span className="text-xs text-text-secondary">Thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {directSlotWarning && (
        <div className="px-6 py-2 bg-status-warning/10 border-t border-status-warning/20">
          <div className="max-w-3xl mx-auto flex items-center gap-2 text-xs text-status-warning">
            <AlertCircle className="w-3.5 h-3.5" />
            {directSlotWarning}
          </div>
        </div>
      )}

      {slotEndpointsError && endpointMode === 'direct-slot' && (
        <div className="px-6 py-2 bg-status-error/10 border-t border-status-error/20">
          <div className="max-w-3xl mx-auto flex items-center gap-2 text-xs text-status-error">
            <AlertCircle className="w-3.5 h-3.5" />
            {slotEndpointsError}
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="px-6 py-2 bg-status-error/10 border-t border-status-error/20">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-status-error">
              <AlertCircle className="w-3.5 h-3.5" />
              {error}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRetry}
                className="px-2 py-1 rounded text-xs font-medium bg-status-error/20 text-status-error hover:bg-status-error/30 transition-colors"
              >
                Retry
              </button>
              <button
                onClick={() => setError(null)}
                className="px-2 py-1 rounded text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="px-4 py-4 sm:px-6 sm:py-5 border-t border-border-primary bg-bg-card">
        <div className="max-w-3xl mx-auto">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            multiple
            accept=".pdf,.docx,.doc,.txt,.md,.json,.csv,.xml,.html,.vhdl,.v,.sv,.py,.js,.ts,.tsx,.jsx,.dart,.kt,.java,.c,.h,.cpp,.cc,.cs,.go,.rs,.swift,.sh,.bash,.sql,.yaml,.yml,.toml,.ini,.conf,.dockerfile,.makefile,.tcl,.xdc,.sdc,.qsf,.log"
          />

          {/* Attachment chips */}
          <ChatAttachmentChips
            attachments={attachments}
            onRemove={handleRemoveAttachment}
            onModeChange={handleModeChange}
            onCollectionChange={handleCollectionChange}
            defaultProjectId={appliedRag.projectId || undefined}
          />

          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleTextareaInput}
                onKeyDown={handleKeyDown}
                placeholder={models.length === 0 ? 'No models available — check the selected endpoint' : 'Type a message... (Enter to send, Shift+Enter for new line)'}
                disabled={loading || isStreaming || models.length === 0 || Boolean(directSlotWarning)}
                rows={1}
                className="w-full px-4 py-4 pr-12 bg-bg-secondary border border-border-primary rounded-xl text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent-primary/50 focus:ring-1 focus:ring-accent-primary/50 resize-none disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 min-h-[52px]"
              />
              {/* Paperclip button */}
              {models.length > 0 && (
                <button
                  onClick={handleOpenFilePicker}
                  disabled={loading || isStreaming}
                  className="absolute left-3 bottom-3 p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-all duration-200 disabled:opacity-50 min-w-[36px] min-h-[36px] flex items-center justify-center"
                  title="Attach file"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleClearChat}
                disabled={loading || isStreaming || messages.length === 0}
                className="p-3 rounded-xl text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-h-[52px] min-w-[52px] flex items-center justify-center"
                title="Clear chat"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button
                onClick={handleSend}
                disabled={loading || isStreaming || !input.trim() || models.length === 0 || Boolean(directSlotWarning)}
                className="p-3 rounded-xl bg-gradient-to-r from-accent-primary to-accent-tertiary hover:from-accent-primary-hover hover:to-accent-tertiary text-white shadow-lg shadow-accent-primary/20 hover:shadow-accent-primary/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none min-h-[52px] min-w-[52px] flex items-center justify-center"
                title="Send message"
              >
                {loading || isStreaming ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
          <p className="text-[10px] sm:text-xs text-text-tertiary mt-2 text-center">
            Responses use the selected endpoint: <span className="font-mono text-text-secondary">{safeDisplayValue(selectedEndpointBase)}</span>
          </p>
        </div>
      </div>

      {/* Toast */}
      {toastMessage && (
        <Toast message={toastMessage!} type={toastType} onClose={() => setToastMessage(null)} />
      )}
    </div>
  );
};

export default ChatPage;
