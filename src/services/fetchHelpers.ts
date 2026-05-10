import { RagEndpointError } from '../types';

// ── RagEndpointError helpers ────────────────────────────────────────────────

export function makeRagEndpointError(params: {
  url: string;
  status?: number;
  statusText?: string;
  bodyPreview?: string;
  message: string;
  timestamp?: number;
}): RagEndpointError {
  return {
    url: params.url,
    status: params.status,
    statusText: params.statusText,
    bodyPreview: params.bodyPreview,
    message: params.message,
    timestamp: params.timestamp ?? Date.now(),
  };
}

export function isRagEndpointError(err: unknown): err is RagEndpointError {
  return (
    !!err &&
    typeof err === 'object' &&
    'message' in err &&
    'url' in err
  );
}

/**
 * Fetch JSON with defensive error handling.
 * - Detects non-JSON responses (HTML, plain text)
 * - Preserves HTTP status
 * - Includes URL and short body preview in errors
 */
export async function safeFetchJsonWithPreview(
  url: string,
  options?: RequestInit,
  context?: string
): Promise<{ data: unknown; response: Response }> {
  let response: Response;
  let bodyPreview = '';
  let fullText = '';

  try {
    response = await fetch(url, options);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Connection failed';
    throw makeRagEndpointError({
      url,
      message: `${message} (URL: ${url})`,
      timestamp: Date.now(),
    });
  }

  // Read full body text (always, even on error)
  try {
    fullText = await response.text();
    bodyPreview = fullText.length > 300 ? fullText.substring(0, 300) + '...' : fullText;
  } catch {
    bodyPreview = '[unable to read body]';
  }

  // Check content type
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw makeRagEndpointError({
      url,
      status: response.status,
      statusText: response.statusText,
      bodyPreview,
      message: `${context || url} returned ${contentType} instead of application/json.`,
      timestamp: Date.now(),
    });
  }

  // Parse JSON from full text (not truncated preview)
  try {
    const data = JSON.parse(fullText);
    return { data, response };
  } catch {
    throw makeRagEndpointError({
      url,
      status: response.status,
      statusText: response.statusText,
      bodyPreview,
      message: `JSON parse failed for ${context || url}.`,
      timestamp: Date.now(),
    });
  }
}
