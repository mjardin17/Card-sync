import React, { useState } from 'react';
import { CardItem, PlatformId } from '../types/card';
import { CurrencyCode, formatCurrency } from '../utils/currencyAndShipping';
import { 
  X, 
  Bot, 
  DollarSign, 
  Percent, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Copy, 
  Check, 
  Sparkles, 
  Send,
  MessageSquare,
  ShieldAlert
} from 'lucide-react';

interface OfferNegotiatorModalProps {
  card: CardItem | null;
  isOpen: boolean;
  onClose: () => void;
  currency: CurrencyCode;
  onSendCounter?: (platform: string, message: string) => void;
}

export const OfferNegotiatorModal: React.FC<OfferNegotiatorModalProps> = ({
  card,
  isOpen,
  onClose,
  currency,
  onSendCounter,
}) => {
  if (!isOpen || !card) return null;

  const [offerAmount, setOfferAmount] = useState<number>(Math.round(card.askingPrice * 0.85));
  const [platformChannel, setPlatformChannel] = useState<'ebay' | 'reddit' | 'discord' | 'mercari' | 'in_person'>('ebay');
  const [buyerName, setBuyerName] = useState<string>('Collector');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const askingPrice = card.askingPrice;
  const minPrice = card.minPrice || Math.round(card.askingPrice * 0.88);
  const fmv = card.estimatedWorth?.fairMarketValue || card.askingPrice;

  // Calculate platform fee rates
  const getFeePercent = () => {
    switch (platformChannel) {
      case 'ebay': return 0.1325; // 13.25% eBay standard
      case 'mercari': return 0.10; // 10% Mercari
      case 'reddit': return 0.03; // 3% PayPal Goods & Services
      case 'discord': return 0.00; // 0% Friends & Family or Direct Crypto/Zelle
      case 'in_person': return 0.00; // 0% Cash / Trade at Card Show
      default: return 0.10;
    }
  };

  const feeRate = getFeePercent();
  const estimatedFee = Math.round(offerAmount * feeRate);
  const netTakeHome = offerAmount - estimatedFee;
  const percentOfAsking = Math.round((offerAmount / askingPrice) * 100);
  const diffFromMin = offerAmount - minPrice;

  // Deal evaluation logic
  let verdict: 'ACCEPT' | 'COUNTER' | 'DECLINE' = 'COUNTER';
  let verdictColor = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
  let verdictDescription = '';

  if (offerAmount >= askingPrice * 0.94) {
    verdict = 'ACCEPT';
    verdictColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    verdictDescription = 'Top tier offer! Exceeds 94% of asking price with strong net take-home margin.';
  } else if (offerAmount < minPrice * 0.90) {
    verdict = 'DECLINE';
    verdictColor = 'text-red-400 bg-red-500/10 border-red-500/30';
    verdictDescription = 'Significantly below minimum reserve floor price ($' + minPrice.toLocaleString() + '). Recommend polite decline or strict counter.';
  } else {
    verdict = 'COUNTER';
    verdictColor = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    verdictDescription = 'Solid negotiation opportunity. Counter between $' + Math.round((offerAmount + askingPrice) / 2).toLocaleString() + ' and $' + minPrice.toLocaleString() + '.';
  }

  // Recommended counter price point
  const recommendedCounter = Math.max(minPrice, Math.round((offerAmount + askingPrice) / 2));

  // Generated Negotiation Responses
  const counterMessages = [
    {
      type: 'Firm & Fair Counter',
      title: 'Comp-Backed Counter-Offer',
      text: `Hi ${buyerName}, thank you for the offer! Recent realized comps for this ${card.title} have been averaging $${fmv.toLocaleString()}. I can meet you at $${recommendedCounter.toLocaleString()} with complimentary insured BMWT (Bubble Mailer with Tracking) shipped tomorrow morning. Let me know if that works for you!`,
    },
    {
      type: 'Direct Deal Discount',
      title: 'Fee-Saving Direct Counter',
      text: `Hey ${buyerName}! I appreciate your interest in the ${card.subjectOrPlayer || card.title}. If we close direct via PayPal G&S or wire to bypass platform surcharges, I can do $${Math.round(recommendedCounter * 0.96).toLocaleString()} shipped with signature tracking. Let me know if you'd like to lock this in!`,
    },
    {
      type: 'Polite Floor Defense',
      title: 'Polite Hold-Firm Response',
      text: `Thanks for reaching out! Given the pristine condition and low pop report on this ${card.grader || 'PSA'} specimen, I'm holding firm near $${askingPrice.toLocaleString()}. The absolute lowest I could let it go for right now is $${minPrice.toLocaleString()}. Appreciate your understanding!`,
    },
  ];

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-zinc-950 shadow-md">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                AI Offer & Negotiation Assistant
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  Smart Deal Analyzer
                </span>
              </h3>
              <p className="text-xs text-zinc-400 truncate max-w-md">
                Analyzing incoming offer for: {card.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6">
          {/* Offer Input & Channel Selector Bar */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
            <div className="md:col-span-4 space-y-1.5">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                Incoming Offer Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</span>
                <input
                  type="number"
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-8 pr-3 py-2 text-lg font-black text-white focus:outline-none focus:border-amber-400"
                />
              </div>
              <div className="text-[11px] text-zinc-400 flex justify-between">
                <span>Asking: ${askingPrice.toLocaleString()}</span>
                <span>Floor: ${minPrice.toLocaleString()}</span>
              </div>
            </div>

            <div className="md:col-span-4 space-y-1.5">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                Sales Channel / Platform
              </label>
              <select
                value={platformChannel}
                onChange={(e) => setPlatformChannel(e.target.value as any)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm font-semibold text-white focus:outline-none focus:border-amber-400"
              >
                <option value="ebay">eBay Best Offer (13.25% fee)</option>
                <option value="reddit">Reddit (r/pkmntcgtrades - 3% G&S)</option>
                <option value="discord">Discord / Trade Server (0% Direct)</option>
                <option value="mercari">Mercari (10% fee)</option>
                <option value="in_person">Card Show Cash / Trade (0% fee)</option>
              </select>
              <span className="text-[11px] text-zinc-500 block">
                Estimated platform fee: {(feeRate * 100).toFixed(2)}%
              </span>
            </div>

            <div className="md:col-span-4 space-y-1.5">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                Buyer Handle / Name
              </label>
              <input
                type="text"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="Collector handle"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm font-medium text-white focus:outline-none focus:border-amber-400"
              />
              <span className="text-[11px] text-zinc-500 block">Used for personalized copy</span>
            </div>
          </div>

          {/* Real-Time Evaluation Verdict Card */}
          <div className={`p-4 rounded-xl border ${verdictColor} flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {verdict === 'ACCEPT' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                {verdict === 'COUNTER' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                {verdict === 'DECLINE' && <XCircle className="w-5 h-5 text-red-400" />}
                <span className="font-black text-sm uppercase tracking-wider">
                  AI Verdict: {verdict} ({percentOfAsking}% of asking)
                </span>
              </div>
              <p className="text-xs text-zinc-300">
                {verdictDescription}
              </p>
            </div>

            <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-l border-zinc-800 pt-3 sm:pt-0 sm:pl-4">
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">
                  Net Take-Home
                </span>
                <span className="text-xl font-black text-emerald-400">
                  {formatCurrency(netTakeHome, currency)}
                </span>
                <span className="text-[10px] text-zinc-500 block">
                  After -{formatCurrency(estimatedFee, currency)} fees
                </span>
              </div>
            </div>
          </div>

          {/* Quick Comparison Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
              <span className="text-zinc-400 block text-[11px]">Fair Market Value</span>
              <span className="font-bold text-white text-sm">{formatCurrency(fmv, currency)}</span>
            </div>
            <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
              <span className="text-zinc-400 block text-[11px]">Your Minimum Floor</span>
              <span className="font-bold text-amber-400 text-sm">{formatCurrency(minPrice, currency)}</span>
            </div>
            <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
              <span className="text-zinc-400 block text-[11px]">Recommended Counter</span>
              <span className="font-bold text-emerald-400 text-sm">{formatCurrency(recommendedCounter, currency)}</span>
            </div>
            <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
              <span className="text-zinc-400 block text-[11px]">Margin vs Floor</span>
              <span className={`font-bold text-sm ${diffFromMin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {diffFromMin >= 0 ? `+${formatCurrency(diffFromMin, currency)}` : `${formatCurrency(diffFromMin, currency)}`}
              </span>
            </div>
          </div>

          {/* AI-Generated Negotiation Messages */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                1-Click Tailored Counter-Offer Scripts
              </h4>
            </div>

            <div className="space-y-3">
              {counterMessages.map((msg, idx) => (
                <div key={idx} className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-amber-400">{msg.type}</span>
                      <span className="text-[11px] text-zinc-500">• {msg.title}</span>
                    </div>
                    <button
                      onClick={() => handleCopy(msg.text, idx)}
                      className="flex items-center gap-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1 rounded font-semibold transition-colors"
                    >
                      {copiedIndex === idx ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-zinc-400" />
                          <span>Copy Script</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed font-mono bg-zinc-900/70 p-3 rounded-lg border border-zinc-800">
                    {msg.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
