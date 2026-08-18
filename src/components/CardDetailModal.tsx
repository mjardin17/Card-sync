import React, { useState } from 'react';
import { CardItem, PlatformConfigState, PlatformId } from '../types/card';
import { CurrencyCode, formatCurrency } from '../utils/currencyAndShipping';
import { PLATFORMS_LIST, calculatePlatformPayout } from '../data/platforms';
import { CardTilt3D } from './CardTilt3D';
import { PlatformPreviewCards } from './PlatformPreviewCards';
import { PriceHistoryGradeChart } from './PriceHistoryGradeChart';
import { CurrencyShippingWidget } from './CurrencyShippingWidget';
import { 
  X, 
  Sparkles, 
  Send, 
  TrendingUp, 
  DollarSign, 
  ShieldCheck, 
  RefreshCw, 
  Tag, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  Share2,
  Trash2,
  Check,
  Bot,
  Printer,
  Camera,
  Globe2,
  LineChart
} from 'lucide-react';

interface CardDetailModalProps {
  card: CardItem | null;
  isOpen: boolean;
  onClose: () => void;
  config: PlatformConfigState;
  currency: CurrencyCode;
  onCurrencyChange: (currency: CurrencyCode) => void;
  onUpdateCard: (updatedCard: CardItem) => void;
  onDeleteCard: (cardId: string) => void;
  onCrossPostAll: (card: CardItem) => void;
  onCrossPostSingle: (card: CardItem, platformId: PlatformId) => void;
  onSyncPriceChange: (card: CardItem, newPrice: number) => void;
  onMarkSold: (card: CardItem) => void;
  onOpenOfferNegotiator: (card: CardItem) => void;
  onOpenWatermarkModal: (card: CardItem) => void;
  onOpenPrintModal: (card: CardItem) => void;
  isSyncing: boolean;
  syncingPlatform: PlatformId | null;
}

export const CardDetailModal: React.FC<CardDetailModalProps> = ({
  card,
  isOpen,
  onClose,
  config,
  currency,
  onCurrencyChange,
  onUpdateCard,
  onDeleteCard,
  onCrossPostAll,
  onCrossPostSingle,
  onSyncPriceChange,
  onMarkSold,
  onOpenOfferNegotiator,
  onOpenWatermarkModal,
  onOpenPrintModal,
  isSyncing,
  syncingPlatform,
}) => {
  const [activeTab, setActiveTab] = useState<'listings' | 'charts' | 'shipping' | 'fees'>('listings');
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceInput, setPriceInput] = useState<number>(card?.askingPrice || 0);

  if (!isOpen || !card) return null;

  const handlePriceSave = () => {
    onSyncPriceChange(card, priceInput);
    setEditingPrice(false);
  };

  const isGraded = card.grader && card.grader !== 'Raw';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-6xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between">
          <div className="flex items-center gap-3 truncate">
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-bold border border-amber-500/30">
                {card.category.toUpperCase()}
              </span>
              {card.status === 'sold' ? (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 font-bold border border-red-500/30">
                  SOLD
                </span>
              ) : (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/30">
                  ACTIVE LISTING
                </span>
              )}
            </div>
            <h3 className="text-base sm:text-lg font-black text-white truncate">
              {card.title}
            </h3>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onDeleteCard(card.id)}
              className="p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors"
              title="Delete Card from Vault"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Grid */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: 3D Holographic Card & Quick Attributes (5 cols) */}
          <div className="lg:col-span-5 flex flex-col items-center gap-4">
            <CardTilt3D card={card} className="w-full max-w-sm" />

            {/* Quick Price & Action Hub */}
            <div className="w-full max-w-sm bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Asking Price ({currency})
                </span>
                {!editingPrice ? (
                  <button
                    onClick={() => {
                      setPriceInput(card.askingPrice);
                      setEditingPrice(true);
                    }}
                    className="text-xs text-amber-400 hover:text-amber-300 font-semibold"
                  >
                    Edit & Sync
                  </button>
                ) : (
                  <button
                    onClick={handlePriceSave}
                    className="text-xs bg-amber-400 text-zinc-950 font-bold px-2 py-0.5 rounded"
                  >
                    Save & Sync
                  </button>
                )}
              </div>

              {!editingPrice ? (
                <div className="text-3xl font-black text-amber-400">
                  {formatCurrency(card.askingPrice, currency)}
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={priceInput}
                    onChange={(e) => setPriceInput(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-lg font-bold text-white focus:outline-none focus:border-amber-400"
                  />
                  <button
                    onClick={handlePriceSave}
                    className="px-3 bg-amber-400 text-zinc-950 font-bold text-xs rounded"
                  >
                    Sync
                  </button>
                </div>
              )}

              {/* Status Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-850">
                <button
                  onClick={() => onCrossPostAll(card)}
                  disabled={isSyncing}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-black text-zinc-950 bg-amber-400 hover:bg-amber-300 shadow-md shadow-amber-500/20 transition-all"
                >
                  {isSyncing ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>Sync Everywhere</span>
                </button>

                {card.status !== 'sold' ? (
                  <button
                    onClick={() => onMarkSold(card)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 transition-colors"
                  >
                    <Tag className="w-3.5 h-3.5" />
                    <span>Mark as SOLD</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      onUpdateCard({ ...card, status: 'active' });
                    }}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Re-Activate</span>
                  </button>
                )}
              </div>

              {/* Pro Collector Action Bar */}
              <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-zinc-850">
                <button
                  onClick={() => onOpenOfferNegotiator(card)}
                  className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-amber-400/40 text-zinc-300 text-[10px] font-bold transition-all"
                  title="AI Offer Assistant"
                >
                  <Bot className="w-3.5 h-3.5 text-amber-400" />
                  <span>AI Negotiate</span>
                </button>

                <button
                  onClick={() => onOpenWatermarkModal(card)}
                  className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-amber-400/40 text-zinc-300 text-[10px] font-bold transition-all"
                  title="Anti-Scam Watermarking"
                >
                  <Camera className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Watermark</span>
                </button>

                <button
                  onClick={() => onOpenPrintModal(card)}
                  className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-amber-400/40 text-zinc-300 text-[10px] font-bold transition-all"
                  title="Print Show Tag / Slip"
                >
                  <Printer className="w-3.5 h-3.5 text-blue-400" />
                  <span>Print Label</span>
                </button>
              </div>
            </div>

            {/* Spec Details Table */}
            <div className="w-full max-w-sm bg-zinc-950/80 p-3.5 rounded-xl border border-zinc-800/80 text-xs space-y-2">
              <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                Authentication & Card Specs
              </div>
              <div className="grid grid-cols-2 gap-y-1.5 text-zinc-300 text-[11px]">
                <div><span className="text-zinc-500">Player/Subject:</span> {card.subjectOrPlayer}</div>
                <div><span className="text-zinc-500">Set:</span> {card.setName}</div>
                <div><span className="text-zinc-500">Year:</span> {card.year}</div>
                <div><span className="text-zinc-500">Card #:</span> {card.cardNumber}</div>
                <div><span className="text-zinc-500">Parallel:</span> {card.variant}</div>
                <div><span className="text-zinc-500">Grade:</span> {card.grader} {card.gradeScore}</div>
                {card.certNumber && (
                  <div className="col-span-2">
                    <span className="text-zinc-500">Cert #:</span> <span className="font-mono text-amber-300">{card.certNumber}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Multi-Platform Previews & Market Worth Tabs (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Tab navigation */}
            <div className="flex items-center gap-1.5 border-b border-zinc-800 pb-2 overflow-x-auto scrollbar-thin">
              <button
                onClick={() => setActiveTab('listings')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === 'listings'
                    ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Share2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Multi-Platform Listings</span>
              </button>

              <button
                onClick={() => setActiveTab('charts')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === 'charts'
                    ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <LineChart className="w-3.5 h-3.5 text-emerald-400" />
                <span>Comps & Grade Spreads</span>
              </button>

              <button
                onClick={() => setActiveTab('shipping')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === 'shipping'
                    ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Globe2 className="w-3.5 h-3.5 text-amber-300" />
                <span>Global Shipping</span>
              </button>

              <button
                onClick={() => setActiveTab('fees')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === 'fees'
                    ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5 text-blue-400" />
                <span>Fee Comparator</span>
              </button>
            </div>

            {/* Tab 1: Multi-Platform Previews */}
            {activeTab === 'listings' && (
              <div className="flex-1 flex flex-col gap-4">
                <PlatformPreviewCards
                  card={card}
                  generatedListings={card.generatedListings}
                  onCrossPostSingle={(platform) => onCrossPostSingle(card, platform)}
                  syncingPlatform={syncingPlatform}
                />
              </div>
            )}

            {/* Tab 2: Comps & Grade Spreads */}
            {activeTab === 'charts' && (
              <div className="flex-1">
                <PriceHistoryGradeChart card={card} currency={currency} />
              </div>
            )}

            {/* Tab 3: Global Currency & Shipping */}
            {activeTab === 'shipping' && (
              <div className="flex-1">
                <CurrencyShippingWidget 
                  card={card} 
                  currency={currency} 
                  onCurrencyChange={onCurrencyChange} 
                />
              </div>
            )}

            {/* Tab 4: Fees & Net Take-Home Calculator */}
            {activeTab === 'fees' && (
              <div className="space-y-4">
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                  <h4 className="text-xs font-bold text-white mb-1">
                    Multi-Platform Net Payout Comparison
                  </h4>
                  <p className="text-[11px] text-zinc-400 mb-3">
                    See exactly how much profit you take home across each channel for an asking price of <strong>{formatCurrency(card.askingPrice, currency)}</strong>.
                  </p>

                  <div className="space-y-2">
                    {PLATFORMS_LIST.map((p) => {
                      const payout = calculatePlatformPayout(card.askingPrice, p.id);
                      return (
                        <div
                          key={p.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: p.color }}
                            />
                            <div>
                              <span className="font-bold text-zinc-200">{p.name}</span>
                              <span className="text-[10px] text-zinc-500 block">
                                Fee: {p.feePercentage}% {p.feeFixed > 0 && `+ $${p.feeFixed}`}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="font-bold text-emerald-400 font-mono text-sm">
                              {formatCurrency(payout.net, currency)} Net
                            </div>
                            <div className="text-[10px] text-red-400/90 font-mono">
                              -{formatCurrency(payout.fee, currency)} fee
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
