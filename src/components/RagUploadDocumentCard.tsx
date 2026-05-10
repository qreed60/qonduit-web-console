import React, { useState, useRef } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { uploadRagDocument } from '../services/ragApi';
import { SUPPORTED_FILE_HINTS, GOOGLE_EXPORT_HELP, MAX_ATTACHMENT_SIZE, formatFileSize } from '../utils/fileUtils';

interface RagUploadDocumentCardProps {
  projectId: string;
  availableCollections: string[];
  defaultCollection?: string;
  onUploadComplete: () => void;
  toastMessage: (msg: string, type: 'success' | 'error') => void;
}

const RagUploadDocumentCard: React.FC<RagUploadDocumentCardProps> = ({
  projectId,
  availableCollections,
  defaultCollection,
  onUploadComplete,
  toastMessage,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<string | undefined>(defaultCollection);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_ATTACHMENT_SIZE) {
        toastMessage(`File too large: ${formatFileSize(file.size)} (max ${formatFileSize(MAX_ATTACHMENT_SIZE)})`, 'error');
        e.target.value = '';
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const result = await uploadRagDocument(projectId, selectedFile, selectedCollection);
      if (result.ok) {
        toastMessage(`Uploaded "${selectedFile.name}" (${result.chunks_created || 0} chunks)`, 'success');
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        onUploadComplete();
      } else {
        toastMessage(result.error || 'Upload failed', 'error');
      }
    } catch (err) {
      toastMessage(err instanceof Error ? err.message : 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-bg-card rounded-xl border border-border-primary p-4 sm:p-5 shadow-card">
      <div className="flex items-center gap-2 mb-3">
        <Upload className="w-4 h-4 text-accent-primary" />
        <h3 className="text-sm font-semibold text-text-primary">Upload Document</h3>
      </div>

      <div className="space-y-3">
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

        {/* File picker */}
        <div>
          <label className="block text-[10px] sm:text-xs text-text-tertiary mb-1 font-medium">
            File
          </label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-3 bg-bg-secondary border border-dashed border-border-primary rounded-lg cursor-pointer hover:border-accent-primary/50 hover:bg-bg-tertiary/50 transition-all min-h-[44px]"
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,.docx,.doc,.txt,.md,.json,.csv,.xml,.html,.vhdl,.v,.sv,.py,.js,.ts,.tsx,.jsx,.dart,.kt,.java,.c,.h,.cpp,.cc,.cs,.go,.rs,.swift,.sh,.bash,.sql,.yaml,.yml,.toml,.ini,.conf,.dockerfile,.makefile,.tcl,.xdc,.sdc,.qsf,.log"
            />
            {selectedFile ? (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-text-primary truncate">{selectedFile.name}</p>
                <p className="text-[10px] text-text-tertiary">{formatFileSize(selectedFile.size)}</p>
              </div>
            ) : (
              <p className="text-xs text-text-tertiary">Click to select a file</p>
            )}
          </div>
        </div>

        {/* Supported file types */}
        <div>
          <p className="text-[10px] text-text-tertiary mb-1">Supported:</p>
          <div className="flex gap-1 overflow-x-auto -mx-1 px-1 pb-1">
            {SUPPORTED_FILE_HINTS.map(f => (
              <span
                key={f}
                className="px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] bg-bg-tertiary text-text-tertiary font-mono flex-shrink-0"
              >
                {f}
              </span>
            ))}
          </div>
          <p className="text-[10px] text-text-tertiary mt-1">{GOOGLE_EXPORT_HELP}</p>
        </div>

        {/* Upload button */}
        <button
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-accent-primary to-accent-tertiary hover:from-accent-primary-hover hover:to-accent-tertiary text-white rounded-lg font-medium text-sm shadow-lg shadow-accent-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Upload to RAG
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default RagUploadDocumentCard;
