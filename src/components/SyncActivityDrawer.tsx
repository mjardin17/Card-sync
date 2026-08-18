import React from 'react';
import { SyncLogEntry } from '../types/card';
import { PLATFORMS_LIST } from '../data/platforms';
import { 
  X, 
  Activity, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Radio, 
  Trash2,
  Send,
  Sparkles
} from 'lucide-react';

interface SyncActivityDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  logs: SyncLogEntry[];
  onClearLogs: () => void;
}

export const SyncActivityDrawer: React.FC<SyncActivityDrawerProps> = ({
  isOpen,
  onClose,
  logs,
  onClearLogs,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-zinc-900 border-l border-zinc-750 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      {/* Drawer Header */}
      <div className="p-4 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-white">Live Sync & Webhook Stream</h3>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <p className="text-[11px] text-zinc-400">Real-time audit log of cross-posts and events</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {logs.length > 0 && (
            <button
              onClick={onClearLogs}
              className="p-1.5 text-zinc-500 hover:text-zinc-300 rounded hover:bg-zinc-800 transition-colors text-xs"
              title="Clear Logs"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Log Feed */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 font-mono text-xs">
        {logs.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center text-zinc-500 space-y-2 font-sans">
            <Radio className="w-8 h-8 text-zinc-600 animate-pulse" />
            <p className="text-xs">No sync activity yet</p>
            <p className="text-[11px] text-zinc-600 max-w-xs">
              When you cross-post, sync price changes, or test webhooks, live events will stream here.
            </p>
          </div>
        ) : (
          logs.map((log) => {
            const platform = PLATFORMS_LIST.find((p) => p.id === log.platform);

            return (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/90 flex flex-col gap-1.5 hover:border-zinc-700 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: platform?.color || '#F1C40F' }}
                    />
                    <span className="font-bold text-white font-sans text-xs">
                      {platform?.name.split(' ')[0] || log.platform}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-850 text-zinc-400 font-sans">
                      {log.action.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>

                <div className="text-zinc-300 font-sans text-xs">
                  <span className="font-semibold text-zinc-100">{log.cardTitle}</span>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-zinc-850">
                  <div className="flex items-center gap-1">
                    {log.status === 'success' || log.status === 'simulated' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                    )}
                    <span
                      className={
                        log.status === 'success'
                          ? 'text-emerald-400 font-sans'
                          : log.status === 'simulated'
                          ? 'text-amber-400 font-sans'
                          : 'text-red-400 font-sans'
                      }
                    >
                      {log.status === 'success' ? 'Live Synced' : log.status === 'simulated' ? 'Sandbox Verified' : 'Failed'}
                    </span>
                  </div>

                  {log.latencyMs && (
                    <span className="text-[10px] text-zinc-500">{log.latencyMs}ms</span>
                  )}
                </div>

                {log.details && (
                  <div className="text-[10px] text-zinc-400 bg-zinc-900 p-1.5 rounded truncate">
                    {log.details}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Drawer Footer Status */}
      <div className="p-3 bg-zinc-950 border-t border-zinc-800 text-center text-[11px] text-zinc-400 flex items-center justify-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        <span>Sync daemon active & listening for price updates</span>
      </div>
    </div>
  );
};
