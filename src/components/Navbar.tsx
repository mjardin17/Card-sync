import React from 'react';
import { CardItem, PlatformConfigState } from '../types/card';
import { CurrencyCode, CURRENCIES, formatCurrency } from '../utils/currencyAndShipping';
import { 
  Camera, 
  Key, 
  Sparkles, 
  Activity, 
  Layers, 
  ShieldCheck, 
  TrendingUp, 
  DollarSign,
  Radio,
  Send,
  UploadCloud,
  Globe2
} from 'lucide-react';

interface NavbarProps {
  cards: CardItem[];
  config: PlatformConfigState;
  currency: CurrencyCode;
  onCurrencyChange: (currency: CurrencyCode) => void;
  onToggleExecutionMode: () => void;
  onOpenScanner: () => void;
  onOpenBatchScanner: () => void;
  onOpenVault: () => void;
  onOpenActivityDrawer: () => void;
  onCrossPostAllCards: () => void;
  isSyncingAll: boolean;
  unreadLogsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  cards,
  config,
  currency,
  onCurrencyChange,
  onToggleExecutionMode,
  onOpenScanner,
  onOpenBatchScanner,
  onOpenVault,
  onOpenActivityDrawer,
  onCrossPostAllCards,
  isSyncingAll,
  unreadLogsCount,
}) => {
  const isRealMode = config.executionMode !== 'sandbox';

  // Calculate total portfolio worth
  const totalWorthUSD = cards.reduce((acc, card) => {
    return acc + (card.estimatedWorth?.fairMarketValue || card.askingPrice || 0);
  }, 0);

  // Count active verified connected platforms from metadata
  const verifiedPlatformsCount = Object.values(config.connectionStatuses || {}).filter(
    (conn: any) => conn?.status === 'VERIFIED'
  ).length;

  return (
    <header className="sticky top-0 z-40 w-full bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 p-0.5 shadow-lg shadow-amber-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
              <Layers className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-white tracking-tight">
                BossLister<span className="text-amber-400">Sync</span>
              </h1>
              <button
                onClick={onToggleExecutionMode}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all flex items-center gap-1 ${
                  isRealMode
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/25 shadow-sm shadow-emerald-500/10'
                    : 'bg-amber-500/15 text-amber-400 border-amber-500/40 hover:bg-amber-500/25'
                }`}
                title="Click to toggle between Real Live Production Mode and Sandbox Simulator"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isRealMode ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span>{isRealMode ? 'REAL MODE' : 'SANDBOX'}</span>
              </button>
            </div>
            <p className="text-[11px] text-zinc-400 hidden md:block">
              {isRealMode ? 'Live Multi-Channel APIs & Webhooks' : 'Sandbox Simulator Engine'}
            </p>
          </div>
        </div>

        {/* Center: Portfolio Market Worth Pill & Currency Selector */}
        <div className="hidden lg:flex items-center gap-3 bg-zinc-900/90 px-3.5 py-1.5 rounded-2xl border border-zinc-800 shadow-inner">
          <div>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
              Portfolio Fair Market Value
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-black text-amber-400 font-mono">
                {formatCurrency(totalWorthUSD, currency)}
              </span>
              <span className="text-[10px] font-bold text-emerald-400 flex items-center bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                <TrendingUp className="w-3 h-3 mr-0.5" />
                +8.4%
              </span>
            </div>
          </div>

          <div className="h-6 w-px bg-zinc-800" />

          {/* Currency Switcher */}
          <div className="flex items-center gap-1">
            <Globe2 className="w-3.5 h-3.5 text-zinc-400" />
            <select
              value={currency}
              onChange={(e) => onCurrencyChange(e.target.value as CurrencyCode)}
              className="bg-zinc-800 text-xs font-bold text-amber-400 border border-zinc-700 rounded-lg px-2 py-1 focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              {Object.values(CURRENCIES).map((c) => (
                <option key={c.code} value={c.code}>
                  {c.symbol} {c.code}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Mode Switch Toggle Pill */}
          <button
            onClick={onToggleExecutionMode}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-bold border transition-all ${
              isRealMode
                ? 'text-emerald-300 bg-emerald-950/30 border-emerald-700/50 hover:bg-emerald-900/40'
                : 'text-amber-300 bg-amber-950/30 border-amber-700/50 hover:bg-amber-900/40'
            }`}
            title="Toggle Live Real Mode"
          >
            <Radio className={`w-3.5 h-3.5 ${isRealMode ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
            <span>{isRealMode ? 'Real Mode: ON' : 'Sandbox Mode'}</span>
          </button>

          {/* Batch Bulk Scanner Button */}
          <button
            onClick={onOpenBatchScanner}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-zinc-200 bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 transition-all hover:border-amber-500/50"
            title="Batch Bulk Scanner & CSV Import/Export"
          >
            <UploadCloud className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Bulk / CSV</span>
          </button>

          {/* API Token Vault Button */}
          <button
            onClick={onOpenVault}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-zinc-200 bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 transition-all hover:border-amber-500/50"
          >
            <Key className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Token Vault</span>
            {verifiedPlatformsCount > 0 ? (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono border border-emerald-500/30">
                {verifiedPlatformsCount} Connected
              </span>
            ) : (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-mono">
                Setup
              </span>
            )}
          </button>

          {/* Sync Live Log Stream Trigger */}
          <button
            onClick={onOpenActivityDrawer}
            className="relative p-2 rounded-xl text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 transition-all"
            title="Live Sync Logs"
          >
            <Activity className="w-4 h-4 text-emerald-400" />
            {unreadLogsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          {/* 1-Click Scan & Appraise Button */}
          <button
            onClick={onOpenScanner}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black text-zinc-950 bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 shadow-lg shadow-amber-500/20 transition-all hover:scale-105 active:scale-95"
          >
            <Camera className="w-4 h-4" />
            <span>Scan Slab</span>
          </button>
        </div>
      </div>
    </header>
  );
};
