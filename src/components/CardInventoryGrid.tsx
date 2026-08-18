import React, { useState } from 'react';
import { CardItem, CardCategory, PlatformId } from '../types/card';
import { CurrencyCode, formatCurrency } from '../utils/currencyAndShipping';
import { PLATFORMS_LIST } from '../data/platforms';
import { 
  Search, 
  Filter, 
  Sparkles, 
  Send, 
  TrendingUp, 
  ShieldCheck, 
  DollarSign, 
  ExternalLink,
  Tag,
  CheckCircle2,
  Clock,
  Radio,
  Layers,
  ArrowUpDown,
  Plus,
  UploadCloud
} from 'lucide-react';

interface CardInventoryGridProps {
  cards: CardItem[];
  currency: CurrencyCode;
  onSelectCard: (card: CardItem) => void;
  onOpenScanner: () => void;
  onOpenBatchScanner: () => void;
  onCrossPostAll: (card: CardItem) => void;
  onCrossPostAllBatch: () => void;
  isSyncingAll: boolean;
}

export const CardInventoryGrid: React.FC<CardInventoryGridProps> = ({
  cards,
  currency,
  onSelectCard,
  onOpenScanner,
  onOpenBatchScanner,
  onCrossPostAll,
  onCrossPostAllBatch,
  isSyncingAll,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'worth_desc' | 'worth_asc' | 'recent' | 'trend'>('worth_desc');

  // Filter & Search Logic
  const filteredCards = cards.filter((card) => {
    const matchesCategory =
      selectedCategory === 'all' ||
      (selectedCategory === 'graded' && card.grader !== 'Raw') ||
      (selectedCategory === 'sold' && card.status === 'sold') ||
      card.category === selectedCategory;

    const matchesSearch =
      card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.subjectOrPlayer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.setName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.grader.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  // Sorting
  const sortedCards = [...filteredCards].sort((a, b) => {
    if (sortBy === 'worth_desc') {
      return (b.estimatedWorth?.fairMarketValue || b.askingPrice) - (a.estimatedWorth?.fairMarketValue || a.askingPrice);
    }
    if (sortBy === 'worth_asc') {
      return (a.estimatedWorth?.fairMarketValue || a.askingPrice) - (b.estimatedWorth?.fairMarketValue || b.askingPrice);
    }
    if (sortBy === 'trend') {
      return (b.estimatedWorth?.trend30DayPercent || 0) - (a.estimatedWorth?.trend30DayPercent || 0);
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Batch Sync Controls */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-950 p-6 rounded-3xl border border-zinc-800 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="relative z-10 space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-extrabold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-300" />
              Automated Zero-Labor Multi-Channel Engine
            </span>
            <span className="text-[11px] text-zinc-400 font-mono">10 Platforms Connected</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
            Sync your card collection everywhere with 1 click.
          </h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            AI automatically authenticates the card, calculates realized auction worth from eBay and PWCC comps, and broadcasts tailored listings across Discord, eBay, Reddit, Twitter, Slack, Telegram, and Bluesky.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={onOpenBatchScanner}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold text-zinc-200 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-all hover:scale-105"
          >
            <UploadCloud className="w-4 h-4 text-amber-400" />
            <span>Bulk Scan / CSV Import</span>
          </button>

          <button
            onClick={onCrossPostAllBatch}
            disabled={isSyncingAll}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black text-zinc-950 bg-amber-400 hover:bg-amber-300 shadow-xl shadow-amber-500/20 transition-all hover:scale-105 active:scale-95"
          >
            {isSyncingAll ? (
              <span className="animate-spin text-sm">⏳</span>
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>{isSyncingAll ? 'Syncing All Active...' : 'Blast Sync All Cards Everywhere'}</span>
          </button>
        </div>

        {/* Ambient subtle glow background */}
        <div className="absolute -right-10 -bottom-10 w-72 h-72 rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {[
            { id: 'all', label: 'All Vault Cards' },
            { id: 'pokemon', label: '⚡ Pokémon TCG' },
            { id: 'racing', label: '🏎️ Sports Cars & F1' },
            { id: 'crossover', label: '⚡🏎️ Pokémon x Supercars' },
            { id: 'sports', label: '🏀 Sports Cards (NBA/NFL)' },
            { id: 'mtg', label: '🔮 Magic The Gathering' },
            { id: 'graded', label: '⭐ Graded PSA/BGS' },
            { id: 'sold', label: '🏷️ Sold Archive' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-amber-400 text-zinc-950 shadow-md shadow-amber-500/20'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search & Sort Input */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search player, set, grade..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="relative">
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-300 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="worth_desc">Worth: High to Low</option>
              <option value="worth_asc">Worth: Low to High</option>
              <option value="trend">Top 30-Day Trend</option>
              <option value="recent">Recently Added</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      {sortedCards.length === 0 ? (
        <div className="bg-zinc-900/40 border border-dashed border-zinc-800 rounded-3xl p-12 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-500">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">No cards match your filter</h3>
          <p className="text-xs text-zinc-400 max-w-sm">
            Scan a new collectible card or clear your search terms to view your synchronized vault.
          </p>
          <button
            onClick={onOpenScanner}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-zinc-950 bg-amber-400 hover:bg-amber-300 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Scan New Card</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-5">
          {sortedCards.map((card) => {
            const isGraded = card.grader && card.grader !== 'Raw';
            const fmv = card.estimatedWorth?.fairMarketValue || card.askingPrice;

            // Count synced platforms
            const syncedCount = Object.values(card.listings).filter(
              (l: any) => l?.status === 'synced'
            ).length;

            return (
              <div
                key={card.id}
                onClick={() => onSelectCard(card)}
                className="group bg-zinc-900/90 hover:bg-zinc-900 rounded-2xl border border-zinc-800 hover:border-amber-500/50 shadow-lg hover:shadow-2xl transition-all duration-200 overflow-hidden flex flex-col cursor-pointer"
              >
                {/* Card Image Banner */}
                <div className="relative aspect-[3/3.8] bg-zinc-950 p-4 flex items-center justify-center overflow-hidden">
                  <img
                    src={card.frontImage}
                    alt={card.title}
                    className="max-h-full object-contain filter drop-shadow-md group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />

                  {/* Slab Grade Badge */}
                  {isGraded && (
                    <div className="absolute top-3 left-3 bg-red-700/95 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-md shadow-md border border-red-500/40 flex items-center gap-1 tracking-wider uppercase backdrop-blur-sm">
                      <ShieldCheck className="w-3 h-3 text-yellow-300" />
                      <span>{card.grader} {card.gradeScore}</span>
                    </div>
                  )}

                  {/* Sold Ribbon */}
                  {card.status === 'sold' && (
                    <div className="absolute top-3 right-3 bg-red-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
                      SOLD
                    </div>
                  )}

                  {/* 30-day Trend Badge */}
                  {card.estimatedWorth?.trend30DayPercent && card.status !== 'sold' && (
                    <div className="absolute top-3 right-3 bg-zinc-900/90 backdrop-blur-md text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-0.5">
                      <TrendingUp className="w-3 h-3" />
                      +{card.estimatedWorth.trend30DayPercent}%
                    </div>
                  )}

                  {/* Pop count footer badge on image */}
                  {card.estimatedWorth?.popReportEstimate && (
                    <div className="absolute bottom-2 left-3 text-[9px] text-zinc-400 bg-black/70 px-2 py-0.5 rounded backdrop-blur">
                      {card.estimatedWorth.popReportEstimate.split('/')[0]}
                    </div>
                  )}
                </div>

                {/* Card Metadata Details */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                      <span>{card.setName}</span>
                      <span>•</span>
                      <span>{card.year}</span>
                    </div>

                    <h3 className="text-sm font-bold text-white leading-snug line-clamp-2 group-hover:text-amber-300 transition-colors">
                      {card.title}
                    </h3>
                  </div>

                  {/* Market Valuation vs Asking Price Row */}
                  <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-850 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-bold text-zinc-500 uppercase block">
                        Fair Market Value
                      </span>
                      <span className="text-base font-black text-amber-400 font-mono">
                        {formatCurrency(fmv, currency)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase block">
                        Asking Price
                      </span>
                      <span className="text-sm font-bold text-zinc-200 font-mono">
                        {formatCurrency(card.askingPrice, currency)}
                      </span>
                    </div>
                  </div>

                  {/* Connected Platform Status Badges */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[10px] text-zinc-400">
                      <span className="font-semibold">Synced Channels:</span>
                      <span className="text-emerald-400 font-mono font-bold">
                        {syncedCount} / 10 Platforms Synced
                      </span>
                    </div>

                    {/* Platform Dots */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {PLATFORMS_LIST.map((platform) => {
                        const status = card.listings[platform.id]?.status;
                        const isSynced = status === 'synced';

                        return (
                          <div
                            key={platform.id}
                            title={`${platform.name}: ${status || 'not posted'}`}
                            className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold transition-all ${
                              isSynced
                                ? 'bg-zinc-800 text-white border border-zinc-700'
                                : 'bg-zinc-950 text-zinc-600 border border-zinc-900 opacity-40'
                            }`}
                            style={{
                              borderColor: isSynced ? platform.color : undefined,
                            }}
                          >
                            <span style={{ color: isSynced ? platform.color : undefined }}>
                              {platform.name[0]}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Card Action Buttons */}
                  <div className="pt-2 border-t border-zinc-800/80 flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCrossPostAll(card);
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-black text-zinc-950 bg-amber-400 hover:bg-amber-300 transition-colors shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Sync Everywhere</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
