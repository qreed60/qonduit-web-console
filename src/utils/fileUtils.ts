/**
 * File utility functions for document upload and chat attachments.
 */

/**
 * Convert a File to base64 string (without data URI prefix).
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip data URI prefix, keep only base64
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Convert bytes to human-readable string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Infer MIME type from file extension as fallback.
 */
export function inferMimeType(filename: string, fallback?: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const mimeMap: Record<string, string> = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    doc: 'application/msword',
    txt: 'text/plain',
    md: 'text/markdown',
    json: 'application/json',
    csv: 'text/csv',
    xml: 'application/xml',
    html: 'text/html',
    vhdl: 'text/vhdl',
    v: 'text/plain',       // Verilog
    sv: 'text/plain',      // SystemVerilog
    py: 'text/x-python',
    js: 'text/javascript',
    ts: 'text/typescript',
    tsx: 'text/typescript',
    jsx: 'text/javascript',
    dart: 'text/x-dart',
    kt: 'text/x-kotlin',
    java: 'text/x-java',
    c: 'text/x-c',
    h: 'text/x-c',
    cpp: 'text/x-c++',
    cc: 'text/x-c++',
    cs: 'text/x-csharp',
    go: 'text/x-go',
    rs: 'text/x-rust',
    swift: 'text/x-swift',
    sh: 'text/x-shellscript',
    bash: 'text/x-shellscript',
    sql: 'text/x-sql',
    yaml: 'text/yaml',
    yml: 'text/yaml',
    toml: 'text/toml',
    ini: 'text/plain',
    conf: 'text/plain',
    dockerfile: 'text/plain',
    makefile: 'text/plain',
    tcl: 'text/x-tcl',
    xdc: 'text/plain',
    sdc: 'text/plain',
    qsf: 'text/plain',
    log: 'text/plain',
  };
  return mimeMap[ext] || fallback || 'application/octet-stream';
}

/**
 * Supported file extensions hint text.
 */
export const SUPPORTED_FILE_HINTS = [
  'PDF', 'DOCX', 'TXT', 'Markdown', 'JSON', 'CSV', 'XML',
  'logs', 'VHDL', 'Verilog', 'SystemVerilog', 'Python', 'JS/TS',
  'Dart', 'Kotlin', 'Java', 'C/C++', 'C#', 'Go', 'Rust',
  'Swift', 'shell', 'SQL', 'YAML', 'TOML', 'INI', 'Dockerfile',
  'Makefile', 'Tcl', 'XDC', 'SDC', 'QSF',
];

/**
 * Google Docs export helper text.
 */
export const GOOGLE_EXPORT_HELP = (
  'Google Docs: download as DOCX or PDF. ' +
  'Google Sheets: download as CSV. ' +
  'Google Slides: download as PDF or PPTX.'
);

/**
 * Maximum file size for base64 attachments (10 MB).
 */
export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
