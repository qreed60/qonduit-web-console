import React, { useState, useCallback } from 'react';
import { GatewaySettings } from '../types';
import GatewayDefaultsCard from './GatewayDefaultsCard';
import PromptTemplatesCard from './PromptTemplatesCard';

interface GatewaySettingsSectionProps {
  onSummaryChange?: (summary: string) => void;
}

const GatewaySettingsSection: React.FC<GatewaySettingsSectionProps> = ({ onSummaryChange }) => {
  const [activeTemplateId, setActiveTemplateId] = useState<string | undefined>();

  const handleSettingsChange = useCallback((settings: GatewaySettings) => {
    setActiveTemplateId(settings.active_prompt_template_id);
    // Build summary for the parent card
    const templateName = settings.active_prompt_template_id || '—';
    const ragStr = settings.rag_enabled_default ? 'On' : 'Off';
    onSummaryChange?.(`Active: ${templateName} · RAG default: ${ragStr}`);
  }, [onSummaryChange]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <GatewayDefaultsCard onSettingsChange={handleSettingsChange} />
      <PromptTemplatesCard activeTemplateId={activeTemplateId} />
    </div>
  );
};

export default GatewaySettingsSection;
