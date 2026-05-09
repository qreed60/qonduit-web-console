import React, { useState } from 'react';
import { Settings2 } from 'lucide-react';
import GatewayDefaultsCard from '../components/GatewayDefaultsCard';
import PromptTemplatesCard from '../components/PromptTemplatesCard';

const GatewaySettingsPage: React.FC = () => {
  const [activeTemplate, setActiveTemplate] = useState<string | undefined>();

  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6 h-full flex flex-col">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-bg-secondary flex items-center justify-center">
            <Settings2 className="w-5 h-5 text-accent-primary" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-accent-primary to-accent-tertiary bg-clip-text text-transparent">
            Gateway Settings
          </h2>
        </div>
        <p className="text-sm text-text-secondary mt-2">
          Configure default gateway parameters and manage prompt templates
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl space-y-4 sm:space-y-6">
          <GatewayDefaultsCard onSettingsChange={(settings) => setActiveTemplate(settings.active_prompt_template)} />
          <PromptTemplatesCard activeTemplateId={activeTemplate} />
        </div>
      </div>
    </div>
  );
};

export default GatewaySettingsPage;
