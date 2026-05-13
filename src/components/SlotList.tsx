import React from 'react';
import { RouterSlot } from '../types';
import SlotCard from './SlotCard';

interface SlotListProps {
  slots: RouterSlot[];
  error?: string | null;
  actionLoading?: string | null;
  logsOpenBySlot: Record<string, boolean>;
  logsBySlot: Record<string, string[]>;
  logsErrorBySlot: Record<string, string | null>;
  preflightBySlot: Record<string, string | null>;
  preflightErrorBySlot: Record<string, string | null>;
  onLaunch: (slot: RouterSlot) => void;
  onStop: (slot: RouterSlot) => void;
  onRestart: (slot: RouterSlot) => void;
  onEdit: (slot: RouterSlot) => void;
  onPreflight: (slot: RouterSlot) => void;
  onLogs: (slot: RouterSlot) => void;
  onCopy?: (value: string, label: string) => void;
}

const SlotList: React.FC<SlotListProps> = ({
  slots,
  error,
  actionLoading,
  logsOpenBySlot,
  logsBySlot,
  logsErrorBySlot,
  preflightBySlot,
  preflightErrorBySlot,
  onLaunch,
  onStop,
  onRestart,
  onEdit,
  onPreflight,
  onLogs,
  onCopy,
}) => {
  if (slots.length === 0) {
    return (
      <div className="bg-bg-secondary/50 rounded-lg p-4 border border-border-subtle text-center">
        <p className="text-sm text-text-secondary">No router slots returned yet.</p>
        {error && <p className="text-xs text-status-warning mt-1">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-2 bg-status-warning/5 border border-status-warning/20 rounded-lg">
          <p className="text-xs text-status-warning">{error}</p>
        </div>
      )}
      {slots.map((slot) => (
         <SlotCard
           key={slot.slot_id}
           slot={slot}
           actionLoading={actionLoading}
           logsOpen={logsOpenBySlot[slot.slot_id]}
           logs={logsBySlot[slot.slot_id]}
           logsError={logsErrorBySlot[slot.slot_id]}
           preflightResult={preflightBySlot[slot.slot_id]}
           preflightError={preflightErrorBySlot[slot.slot_id]}
           onLaunch={onLaunch}
           onStop={onStop}
           onRestart={onRestart}
           onEdit={onEdit}
           onPreflight={onPreflight}
           onLogs={onLogs}
           onCopy={onCopy}
         />
       ))}
    </div>
  );
};

export default SlotList;
