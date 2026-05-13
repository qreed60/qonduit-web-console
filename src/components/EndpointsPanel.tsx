import React from 'react';
import { Copy, CheckCircle2, AlertCircle } from 'lucide-react';
import { RouterEndpoint } from '../types';
import { safeDisplayValue } from '../utils/routerDisplay';

interface EndpointsPanelProps {
  routerBase: string;
  endpoints: RouterEndpoint[];
  error?: string | null;
  onCopy: (value: string, label: string) => void;
}

function endpointReady(endpoint: RouterEndpoint): boolean {
  return endpoint.ready === true || endpoint.running === true || endpoint.status === 'running';
}

const EndpointsPanel: React.FC<EndpointsPanelProps> = ({ routerBase, endpoints, error, onCopy }) => {
  if (endpoints.length === 0) {
    return (
      <div className="space-y-3">
        <div className="bg-bg-secondary/50 rounded-lg p-3 border border-border-subtle">
          <p className="text-xs text-text-secondary mb-1">Router API Base</p>
          <div className="flex items-center gap-2">
            <p className="text-xs font-mono text-text-primary break-all flex-1">{routerBase}</p>
            <button onClick={() => onCopy(routerBase, 'Router API base')} className="p-1.5 rounded-lg text-text-tertiary hover:text-accent-primary hover:bg-bg-tertiary" title="Copy router API base">
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <p className="text-xs text-text-tertiary bg-bg-secondary/50 rounded-lg border border-border-subtle p-3">
          {error || 'No router slot endpoints returned yet.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg-bg-secondary/50 rounded-lg p-3 border border-border-subtle">
        <p className="text-xs text-text-secondary mb-1">Router API Base</p>
        <div className="flex items-center gap-2">
          <p className="text-xs font-mono text-text-primary break-all flex-1">{routerBase}</p>
          <button onClick={() => onCopy(routerBase, 'Router API base')} className="p-1.5 rounded-lg text-text-tertiary hover:text-accent-primary hover:bg-bg-tertiary" title="Copy router API base">
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {endpoints.map((endpoint) => {
          const ready = endpointReady(endpoint);
          const slotId = safeDisplayValue(endpoint.slot_id);
          const name = safeDisplayValue(endpoint.name || endpoint.slot_id);
          const openaiBase = safeDisplayValue(endpoint.openai_base);
          const status = safeDisplayValue(endpoint.status ?? (ready ? 'ready' : 'not ready'));
          return (
            <div key={`${endpoint.slot_id}-${endpoint.openai_base}`} className="bg-bg-secondary/40 rounded-lg p-4 border border-border-subtle">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {ready ? <CheckCircle2 className="w-4 h-4 text-status-success" /> : <AlertCircle className="w-4 h-4 text-status-warning" />}
                    <h4 className="text-sm font-semibold text-text-primary truncate">{name}</h4>
                  </div>
                  <p className="text-[10px] text-text-tertiary font-mono mt-0.5">slot: {slotId}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${ready ? 'text-status-success border-status-success/20 bg-status-success/10' : 'text-status-warning border-status-warning/20 bg-status-warning/10'}`}>
                  {status}
                </span>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-text-tertiary">OpenAI Base</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs font-mono text-text-primary break-all flex-1">{openaiBase}</p>
                    <button onClick={() => onCopy(openaiBase, `${name} OpenAI base`)} className="p-1.5 rounded-lg text-text-tertiary hover:text-accent-primary hover:bg-bg-tertiary" title="Copy OpenAI base">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-text-tertiary">Endpoint Base</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs font-mono text-text-primary break-all flex-1">{routerBase}</p>
                    <button onClick={() => onCopy(routerBase, 'Router endpoint base')} className="p-1.5 rounded-lg text-text-tertiary hover:text-accent-primary hover:bg-bg-tertiary" title="Copy endpoint base">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EndpointsPanel;
