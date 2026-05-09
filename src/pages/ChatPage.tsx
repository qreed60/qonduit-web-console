import React, { useState, useEffect, useRef } from 'react';
import { fetchProviderModels, fetchChatCompletions, getSettings, NormalizedModel } from '../services/api';
import { ChatMessage, ProviderType } from '../types';
import Toast from '../components/Toast';
import RagContextSelector from '../components/RagContextSelector';
import {
  Send,
  Loader2,
  AlertCircle,
  MessageSquare,
  Settings2,
  Copy,
  RefreshCw,
  Globe,
} from 'lucide-react';

const ChatPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [models, setModels] = useState<NormalizedModel[]>([]);
  const [modelLoading, setModelLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [currentProvider, setCurrentProvider] = useState<ProviderType>('Direct');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // RAG context selection (only used when Gateway mode is active)
  const [ragSelection, setRagSelection] = useState<{
    projectId: string;
    collection: string | null;
    enabled: boolean;
  }>({ projectId: '', collection: null, enabled: true });

  // Load models when provider changes or on mount
  useEffect(() => {
    const settings = getSettings();
    setCurrentProvider(settings.defaultProvider);
    loadModels(settings.defaultProvider);
  }, []);

  // Reload models when provider changes
  useEffect(() => {
    loadModels(currentProvider);
  }, [currentProvider]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const loadModels = async (provider: ProviderType = currentProvider) => {
      setModelLoading(true);
      try {
        const providerModels = await fetchProviderModels(provider);
        setModels(providerModels);
        if (providerModels.length > 0) {
          // Prefer the settings default model, otherwise use first available
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

  const handleSend = async () => {
     if (!input.trim() || !selectedModel || loading) return;
 
     const userMessage: ChatMessage = { role: 'user', content: input.trim() };
     const newMessages = [...messages, userMessage];
     setMessages(newMessages);
     setInput('');
     setLoading(true);
     setError(null);
 
     try {
       // Build RAG selection for Gateway mode
       const ragPayload = (currentProvider === 'Gateway' && ragSelection.enabled && ragSelection.projectId)
         ? {
             projectId: ragSelection.projectId,
             collection: ragSelection.collection || undefined,
           }
         : undefined;
 
       const response = await fetchChatCompletions(selectedModel, newMessages, undefined, ragPayload);
       const assistantMessage = response.choices?.[0]?.message;
       if (assistantMessage) {
         setMessages([...newMessages, assistantMessage]);
       } else {
         setError('No response received from model');
       }
     } catch (err) {
       const msg = err instanceof Error ? err.message : 'Failed to get response';
       setError(msg);
       setToastMessage(`Chat error: ${msg}`);
     } finally {
       setLoading(false);
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
      setToastMessage('Message copied to clipboard');
    } catch { /* ignore */ }
  };

  const handleClearChat = () => {
    setMessages([]);
    setError(null);
  };

  const handleRetry = () => {
    if (messages.length > 0) {
      // Retry the last user message
      const lastUserMsgIndex = [...messages].reverse().findIndex(m => m.role === 'user');
      if (lastUserMsgIndex >= 0) {
        const retryMessages = messages.slice(0, messages.length - lastUserMsgIndex);
        setMessages(retryMessages);
        handleSend();
      }
    }
  };

  return (
         <div className="flex flex-col h-full bg-bg-primary">
           {/* Header */}
           <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 px-4 py-4 sm:px-6 sm:py-3 border-b border-border-primary bg-bg-card">
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
             <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
               {/* Row 1: Provider + Model on mobile, side by side on desktop */}
               <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                 {/* Provider Selector */}
                 <div className="flex items-center gap-2 w-full sm:w-auto">
                   <Globe className="w-4 h-4 text-text-tertiary flex-shrink-0" />
                   <select
                     value={currentProvider}
                     onChange={(e) => setCurrentProvider(e.target.value as ProviderType)}
                     disabled={modelLoading || loading}
                     className="flex-1 sm:flex-initial px-4 py-3 bg-bg-secondary border border-border-primary rounded-lg text-sm font-medium text-text-primary focus:outline-none focus:border-accent-primary/50 disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
                   >
                     <option value="Direct">Direct</option>
                     <option value="Gateway">Gateway</option>
                   </select>
                 </div>
                 {/* Model Selector */}
                 <div className="flex items-center gap-2 w-full sm:w-auto">
                   {modelLoading ? (
                     <Loader2 className="w-5 h-5 text-text-tertiary animate-spin flex-shrink-0" />
                   ) : (
                     <select
                       value={selectedModel}
                       onChange={(e) => setSelectedModel(e.target.value)}
                       disabled={loading}
                       className="flex-1 sm:flex-initial px-4 py-3 bg-bg-secondary border border-border-primary rounded-lg text-sm font-medium text-text-primary focus:outline-none focus:border-accent-primary/50 disabled:opacity-50 disabled:cursor-not-allowed truncate min-h-[48px]"
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
                      className="p-3 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-all duration-200 disabled:opacity-50 min-h-[48px] min-w-[48px] flex items-center justify-center"
                      title="Refresh models"
                    >
                      <RefreshCw className={`w-5 h-5 ${modelLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>
 
               {/* Row 2: RAG + Settings on mobile, side by side on desktop */}
               <div className="flex flex-row items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                 {/* RAG Context Selector (only in Gateway mode) */}
                 {currentProvider === 'Gateway' && (
                   <div className="flex items-center gap-2 w-full sm:w-auto">
                     <RagContextSelector
                       onSelectionChange={(selection) => setRagSelection(selection)}
                     />
                   </div>
                 )}
                 {/* Settings Toggle */}
                 <button
                  onClick={() => setShowSettings(!showSettings)}
                  className={`p-3 rounded-lg transition-all duration-200 min-h-[48px] min-w-[48px] flex items-center justify-center ${showSettings ? 'text-accent-primary bg-accent-primary/10' : 'text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary'}`}
                  title="Chat settings"
                >
                  <Settings2 className="w-5 h-5" />
                </button>
               </div>
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
                   {currentProvider === 'Gateway' && (
                     <>
                       <span>·</span>
                       <span>RAG: <span className={`font-medium ${ragSelection.enabled && ragSelection.projectId ? 'text-accent-primary' : 'text-text-tertiary'}`}>
                         {ragSelection.enabled && ragSelection.projectId
                           ? `${ragSelection.projectId}${ragSelection.collection ? ` / ${ragSelection.collection}` : ''}`
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
         {messages.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-full text-center">
             <div className="w-16 h-16 bg-accent-primary/10 rounded-2xl flex items-center justify-center mb-4 border border-accent-primary/20">
               <MessageSquare className="w-8 h-8 text-accent-primary" />
             </div>
             <h3 className="text-lg font-semibold text-text-primary mb-2">Start a Conversation</h3>
             <p className="text-sm text-text-secondary max-w-md">
               Send a message to chat with your AI model through the Memory Gateway.
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
 
             {/* Loading Indicator */}
             {loading && (
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
             <div className="flex items-end gap-3">
               <div className="flex-1 relative">
                 <textarea
                   ref={inputRef}
                   value={input}
                   onChange={handleTextareaInput}
                   onKeyDown={handleKeyDown}
                   placeholder={models.length === 0 ? 'No models available — check your Gateway endpoint' : 'Type a message... (Enter to send, Shift+Enter for new line)'}
                   disabled={loading || models.length === 0}
                   rows={1}
                   className="w-full px-4 py-4 bg-bg-secondary border border-border-primary rounded-xl text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent-primary/50 focus:ring-1 focus:ring-accent-primary/50 resize-none disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 min-h-[52px]"
                 />
               </div>
               <div className="flex items-center gap-2 flex-shrink-0">
                 <button
                   onClick={handleClearChat}
                   disabled={loading || messages.length === 0}
                   className="p-3 rounded-xl text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-h-[52px] min-w-[52px] flex items-center justify-center"
                   title="Clear chat"
                 >
                   <RefreshCw className="w-5 h-5" />
                 </button>
                 <button
                   onClick={handleSend}
                   disabled={loading || !input.trim() || models.length === 0}
                   className="p-3 rounded-xl bg-gradient-to-r from-accent-primary to-accent-tertiary hover:from-accent-primary-hover hover:to-accent-tertiary text-white shadow-lg shadow-accent-primary/20 hover:shadow-accent-primary/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none min-h-[52px] min-w-[52px] flex items-center justify-center"
                   title="Send message"
                 >
                   {loading ? (
                     <Loader2 className="w-5 h-5 animate-spin" />
                   ) : (
                     <Send className="w-5 h-5" />
                   )}
                 </button>
               </div>
             </div>
             <p className="text-[10px] sm:text-xs text-text-tertiary mt-2 text-center">
               Responses are generated by the selected model via the Memory Gateway
             </p>
           </div>
         </div>

      {/* Toast */}
      {toastMessage && (
        <Toast message={toastMessage} type="info" onClose={() => setToastMessage(null)} />
      )}
    </div>
  );
};

export default ChatPage;
