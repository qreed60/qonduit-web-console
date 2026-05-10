import React from 'react';
import { X, File } from 'lucide-react';
import { ChatAttachment, ChatAttachmentMode } from '../types';
import { inferMimeType, formatFileSize } from '../utils/fileUtils';

interface ChatAttachmentChipsProps {
  attachments: ChatAttachment[];
  onRemove: (id: string) => void;
  onModeChange: (id: string, mode: ChatAttachmentMode) => void;
  onCollectionChange: (id: string, collection: string) => void;
  defaultProjectId?: string;
  availableCollections?: string[];
}

const ChatAttachmentChips: React.FC<ChatAttachmentChipsProps> = ({
  attachments,
  onRemove,
  onModeChange,
  onCollectionChange,
  defaultProjectId,
  availableCollections,
}) => {
  if (attachments.length === 0) return null;

  return (
    <div className="space-y-2 mb-3">
      {attachments.map((att) => (
        <div
          key={att.id}
          className="flex items-start gap-2 bg-bg-secondary border border-border-primary rounded-lg p-3 transition-all"
        >
          {/* File icon */}
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-accent-primary/10 flex items-center justify-center">
            <File className="w-4 h-4 text-accent-primary" />
          </div>

          {/* File info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-text-primary truncate" title={att.name}>
                {att.name}
              </p>
              <span className="text-[10px] text-text-tertiary flex-shrink-0">
                {formatFileSize(att.size)}
              </span>
            </div>
            <p className="text-[10px] text-text-tertiary font-mono">
              {inferMimeType(att.name, att.type)}
            </p>

            {/* Mode selector */}
            <div className="flex items-center gap-2 mt-2">
              <select
                value={att.mode}
                onChange={(e) => onModeChange(att.id, e.target.value as ChatAttachmentMode)}
                className="flex-1 sm:flex-initial px-2 py-1.5 bg-bg-tertiary border border-border-primary rounded text-[10px] sm:text-xs text-text-primary focus:outline-none focus:border-accent-primary/50 transition-colors min-h-[32px]"
              >
                <option value="chat_context_only">Use for this chat only</option>
                <option value="save_to_rag">Save to RAG and use now</option>
                <option value="save_to_rag_only">Save to RAG only</option>
              </select>

              {/* Project/collection selectors for RAG modes */}
              {(att.mode === 'save_to_rag' || att.mode === 'save_to_rag_only') && (
                <>
                  {defaultProjectId && (
                    <span className="text-[10px] text-text-tertiary hidden sm:inline">
                      {defaultProjectId}
                    </span>
                  )}
                  {availableCollections && availableCollections.length > 0 && (
                    <select
                      value={att.collection || ''}
                      onChange={(e) => onCollectionChange(att.id, e.target.value)}
                      className="px-2 py-1.5 bg-bg-tertiary border border-border-primary rounded text-[10px] sm:text-xs text-text-primary focus:outline-none focus:border-accent-primary/50 transition-colors min-h-[32px]"
                      title="Collection"
                    >
                      <option value="">Default</option>
                      {availableCollections.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Remove button */}
          <button
            onClick={() => onRemove(att.id)}
            className="flex-shrink-0 p-1.5 rounded-lg text-text-tertiary hover:text-status-error hover:bg-status-error/10 transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
            title="Remove attachment"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ChatAttachmentChips;
