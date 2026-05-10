import React, { useState } from 'react';
import { FileText, Loader2, Plus } from 'lucide-react';
import { createRagTextDocument } from '../services/ragApi';

interface RagTextNoteCardProps {
  projectId: string;
  availableCollections: string[];
  defaultCollection?: string;
  onSaveComplete: () => void;
  toastMessage: (msg: string, type: 'success' | 'error') => void;
}

const RagTextNoteCard: React.FC<RagTextNoteCardProps> = ({
  projectId,
  availableCollections,
  defaultCollection,
  onSaveComplete,
  toastMessage,
}) => {
  const [docName, setDocName] = useState('');
  const [selectedCollection, setSelectedCollection] = useState<string | undefined>(defaultCollection);
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!docName.trim() || !content.trim()) return;
    setSaving(true);
    try {
      const result = await createRagTextDocument(projectId, {
        document_name: docName.trim(),
        content: content.trim(),
        collection: selectedCollection,
      });
      if (result.ok) {
        toastMessage(`Note "${docName.trim()}" saved (${result.chunks_created || 0} chunks)`, 'success');
        setDocName('');
        setContent('');
        onSaveComplete();
      } else {
        toastMessage(result.error || 'Save failed', 'error');
      }
    } catch (err) {
      toastMessage(err instanceof Error ? err.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-bg-card rounded-xl border border-border-primary p-4 sm:p-5 shadow-card">
      <div className="flex items-center gap-2 mb-3">
        <Plus className="w-4 h-4 text-accent-secondary" />
        <h3 className="text-sm font-semibold text-text-primary">Add Text Note</h3>
      </div>

      <div className="space-y-3">
        {/* Document name */}
        <div>
          <label className="block text-[10px] sm:text-xs text-text-tertiary mb-1 font-medium">
            Document Name
          </label>
          <input
            type="text"
            value={docName}
            onChange={(e) => setDocName(e.target.value)}
            placeholder="e.g., Meeting Notes, Procedure, Reference"
            className="w-full px-3 py-2.5 bg-bg-secondary border border-border-primary rounded-lg text-xs text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent-primary/50 transition-colors min-h-[40px]"
          />
        </div>

        {/* Collection selector */}
        {availableCollections.length > 1 && (
          <div>
            <label className="block text-[10px] sm:text-xs text-text-tertiary mb-1 font-medium">
              Collection (optional)
            </label>
            <select
              value={selectedCollection || ''}
              onChange={(e) => setSelectedCollection(e.target.value || undefined)}
              className="w-full px-3 py-2.5 bg-bg-secondary border border-border-primary rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-primary/50 transition-colors min-h-[40px]"
            >
              <option value="">Default collection</option>
              {availableCollections.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )}

        {/* Text area */}
        <div>
          <label className="block text-[10px] sm:text-xs text-text-tertiary mb-1 font-medium">
            Content
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste text, procedures, reference snippets, or any content..."
            rows={8}
            className="w-full px-3 py-2.5 bg-bg-secondary border border-border-primary rounded-lg text-xs text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent-primary/50 transition-colors resize-y min-h-[120px]"
          />
          <p className="text-[10px] text-text-tertiary mt-1">
            Quick notes, procedures, reference snippets, or any text content.
          </p>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={!docName.trim() || !content.trim() || saving}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-accent-secondary to-accent-tertiary hover:from-accent-secondary-hover hover:to-accent-tertiary text-white rounded-lg font-medium text-sm shadow-lg shadow-accent-secondary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <FileText className="w-4 h-4" />
              Save to RAG
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default RagTextNoteCard;
