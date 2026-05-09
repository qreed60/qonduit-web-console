import { apiPath } from '../config/endpoints';
import {
  GatewaySettings,
  GatewaySettingsUpdate,
  PromptTemplate,
  PromptTemplateCreateRequest,
  PromptTemplateListResponse,
} from '../types';

async function parseJsonSafe<T>(response: Response, context: string): Promise<T> {
  if (!response.ok) {
    throw new Error(`${context} failed (HTTP ${response.status}): ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

// ── Gateway Settings ──

export async function getGatewaySettings(): Promise<GatewaySettings> {
  const raw = await parseJsonSafe<GatewaySettings>(
    await fetch(apiPath('gateway', '/v1/gateway/settings')),
    'Gateway settings'
  );
  return raw;
}

export async function updateGatewaySettings(settings: GatewaySettingsUpdate): Promise<GatewaySettings> {
  const response = await fetch(apiPath('gateway', '/v1/gateway/settings'), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  return parseJsonSafe<GatewaySettings>(response, 'Update gateway settings');
}

export async function resetGatewaySettings(): Promise<GatewaySettings> {
  const response = await fetch(apiPath('gateway', '/v1/gateway/settings/reset'), {
    method: 'POST',
  });
  return parseJsonSafe<GatewaySettings>(response, 'Reset gateway settings');
}

// ── Prompt Templates ──

export async function listPromptTemplates(): Promise<PromptTemplateListResponse> {
  const raw = await parseJsonSafe<PromptTemplateListResponse>(
    await fetch(apiPath('gateway', '/v1/gateway/prompt-templates')),
    'Prompt templates'
  );
  return raw;
}

export async function createPromptTemplate(req: PromptTemplateCreateRequest): Promise<PromptTemplate> {
  const response = await fetch(apiPath('gateway', '/v1/gateway/prompt-templates'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  return parseJsonSafe<PromptTemplate>(response, 'Create prompt template');
}

export async function updatePromptTemplate(
  templateId: string,
  req: PromptTemplateCreateRequest
): Promise<PromptTemplate> {
  const response = await fetch(
    apiPath('gateway', `/v1/gateway/prompt-templates/${encodeURIComponent(templateId)}`),
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    }
  );
  return parseJsonSafe<PromptTemplate>(response, `Update prompt template ${templateId}`);
}

export async function deletePromptTemplate(templateId: string): Promise<void> {
  const response = await fetch(
    apiPath('gateway', `/v1/gateway/prompt-templates/${encodeURIComponent(templateId)}`),
    { method: 'DELETE' }
  );
  if (!response.ok) {
    throw new Error(`Delete prompt template failed (HTTP ${response.status})`);
  }
}

export async function activatePromptTemplate(templateId: string): Promise<PromptTemplate> {
  const response = await fetch(
    apiPath('gateway', `/v1/gateway/prompt-templates/${encodeURIComponent(templateId)}/activate`),
    { method: 'POST' }
  );
  return parseJsonSafe<PromptTemplate>(response, `Activate prompt template ${templateId}`);
}

export async function duplicatePromptTemplate(templateId: string): Promise<PromptTemplate> {
  const response = await fetch(
    apiPath('gateway', `/v1/gateway/prompt-templates/${encodeURIComponent(templateId)}/duplicate`),
    { method: 'POST' }
  );
  return parseJsonSafe<PromptTemplate>(response, `Duplicate prompt template ${templateId}`);
}
