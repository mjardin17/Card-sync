import React, { useState } from 'react';
import { CardItem, PlatformId } from '../types/card';
import { PLATFORMS_LIST } from '../data/platforms';
import { 
  Check, 
  Copy, 
  ExternalLink, 
  Sparkles, 
  Share2, 
  Send,
  MessageSquare,
  ShoppingBag,
  Code
} from 'lucide-react';

interface PlatformPreviewCardsProps {
  card: CardItem;
  generatedListings?: any;
  onCrossPostSingle?: (platform: PlatformId) => void;
  syncingPlatform?: PlatformId | null;
}

export const PlatformPreviewCards: React.FC<PlatformPreviewCardsProps> = ({
  card,
  generatedListings,
  onCrossPostSingle,
  syncingPlatform,
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformId>('discord');
  const [copied, setCopied] = useState(false);

  const platformMeta = PLATFORMS_LIST.find((p) => p.id === selectedPlatform) || PLATFORMS_LIST[0];
  const listing = generatedListings?.[selectedPlatform] || {};
  const listingStatus = card.listings[selectedPlatform];

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900/60 rounded-2xl border border-zinc-800 overflow-hidden">
      {/* Platform Tab Bar */}
      <div className="flex items-center gap-1.5 p-2 bg-zinc-950/70 border-b border-zinc-800 overflow-x-auto scrollbar-thin">
        {PLATFORMS_LIST.map((platform) => {
          const isSelected = selectedPlatform === platform.id;
          const status = card.listings[platform.id]?.status;
          const isSynced = status === 'synced';

          return (
            <button
              key={platform.id}
              onClick={() => setSelectedPlatform(platform.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: platform.color }}
              />
              <span>{platform.name.split(' ')[0]}</span>
              {isSynced && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Synced" />
              )}
            </button>
          );
        })}
      </div>

      {/* Header Info for Selected Platform */}
      <div className="p-3.5 bg-zinc-900/40 border-b border-zinc-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs"
            style={{ backgroundColor: `${platformMeta.color}20`, color: platformMeta.color }}
          >
            {platformMeta.name[0]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white">{platformMeta.name}</h4>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                Fee: {platformMeta.feePercentage}%
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">{platformMeta.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onCrossPostSingle && (
            <button
              onClick={() => onCrossPostSingle(selectedPlatform)}
              disabled={syncingPlatform === selectedPlatform}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all shadow-sm"
              style={{ backgroundColor: platformMeta.color }}
            >
              {syncingPlatform === selectedPlatform ? (
                <span className="animate-spin text-xs">⏳</span>
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>{listingStatus?.status === 'synced' ? 'Re-Sync Live' : 'Post to ' + platformMeta.name.split(' ')[0]}</span>
            </button>
          )}
        </div>
      </div>

      {/* Live Preview Display Container */}
      <div className="flex-1 p-4 overflow-y-auto bg-zinc-950/40">
        {selectedPlatform === 'discord' && (
          <div className="max-w-md mx-auto bg-[#313338] text-zinc-200 rounded-lg p-3.5 shadow-xl font-sans text-xs border border-zinc-700/40">
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-8 h-8 rounded-full bg-[#5865F2] flex items-center justify-center text-white font-bold text-xs shadow">
                BOT
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white text-xs">OmniCard Drop Bot</span>
                  <span className="bg-[#5865F2] text-[9px] text-white font-semibold px-1 rounded">APP</span>
                  <span className="text-[10px] text-zinc-400">Today at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="text-[11px] text-zinc-300">✨ NEW CARD LISTED FOR SALE</div>
              </div>
            </div>

            {/* Discord Embed Box */}
            <div className="border-l-4 border-[#F1C40F] bg-[#2B2D31] rounded-r p-3 flex flex-col gap-2 shadow-inner">
              <div className="text-sm font-bold text-white hover:underline cursor-pointer">
                {listing.embedTitle || `🃏 ${card.title} • $${card.askingPrice}`}
              </div>
              <div className="text-zinc-300 whitespace-pre-line text-[11px]">
                {listing.embedDescription || `🔥 **Available Now!**\n**Player:** ${card.subjectOrPlayer}\n**Set:** ${card.setName} (${card.year})\n**Asking Price:** $${card.askingPrice}`}
              </div>

              {/* Embed Fields */}
              <div className="grid grid-cols-2 gap-2 my-1 pt-2 border-t border-zinc-750">
                <div className="bg-[#1E1F22] p-1.5 rounded">
                  <div className="text-[9px] font-bold text-zinc-400 uppercase">💰 Price</div>
                  <div className="text-xs font-bold text-emerald-400">${card.askingPrice}</div>
                </div>
                <div className="bg-[#1E1F22] p-1.5 rounded">
                  <div className="text-[9px] font-bold text-zinc-400 uppercase">⭐ Grade</div>
                  <div className="text-xs font-bold text-white">{card.grader} {card.gradeScore}</div>
                </div>
              </div>

              {card.frontImage && (
                <div className="rounded overflow-hidden max-h-48 bg-zinc-950/60 p-1 flex justify-center">
                  <img src={card.frontImage} alt="Card Scan" className="h-44 object-contain rounded" />
                </div>
              )}

              <div className="text-[9px] text-zinc-400 pt-1 flex items-center justify-between">
                <span>{listing.footerText || 'OmniCard Sync • Verified Collector'}</span>
                <span>ID: {card.id}</span>
              </div>
            </div>
          </div>
        )}

        {selectedPlatform === 'ebay' && (
          <div className="max-w-lg mx-auto bg-white text-zinc-900 rounded-xl p-4 shadow-xl text-xs font-sans border border-zinc-300">
            <div className="flex items-center justify-between border-b pb-2 mb-3">
              <span className="font-bold text-blue-600 text-base tracking-tighter">e<span className="text-red-500">b</span><span className="text-yellow-500">a</span><span className="text-green-600">y</span></span>
              <span className="text-[10px] text-zinc-500">100% Positive Feedback (482)</span>
            </div>

            <h3 className="text-sm font-bold text-zinc-900 leading-snug mb-2">
              {listing.title || card.seoTitle || card.title}
            </h3>

            <div className="flex gap-4 mb-3">
              <div className="w-28 h-36 bg-zinc-100 rounded border p-1 flex items-center justify-center shrink-0">
                <img src={card.frontImage} alt="" className="max-h-full object-contain" />
              </div>
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="text-xs text-zinc-500">Buy It Now:</div>
                  <div className="text-xl font-extrabold text-zinc-900">${card.askingPrice.toLocaleString()}</div>
                  <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">Free USPS Ground Advantage (BMWT)</div>
                </div>
                <div className="flex gap-1.5 mt-2">
                  <button className="flex-1 bg-blue-600 text-white font-bold py-1.5 rounded-full text-xs">Buy It Now</button>
                  <button className="flex-1 bg-blue-50 text-blue-700 border border-blue-600 font-bold py-1.5 rounded-full text-xs">Best Offer</button>
                </div>
              </div>
            </div>

            <div className="bg-zinc-50 p-2.5 rounded-lg border text-[11px] mb-2">
              <div className="font-bold text-zinc-800 mb-1">Item Specifics:</div>
              <div className="grid grid-cols-2 gap-1 text-[10px]">
                <div><span className="text-zinc-500">Card Name:</span> {card.subjectOrPlayer}</div>
                <div><span className="text-zinc-500">Grader:</span> {card.grader}</div>
                <div><span className="text-zinc-500">Grade:</span> {card.gradeScore}</div>
                <div><span className="text-zinc-500">Set:</span> {card.setName} ({card.year})</div>
              </div>
            </div>

            <div className="text-[11px] text-zinc-600 line-clamp-3">
              {card.conditionNotes || 'Flawless condition, safely packaged in bubble mailer.'}
            </div>
          </div>
        )}

        {selectedPlatform === 'whatnot' && (
          <div className="max-w-md mx-auto bg-zinc-950 text-white rounded-2xl p-4 shadow-2xl text-xs font-sans border-2 border-[#FFE600]/80">
            {/* Whatnot Live Header */}
            <div className="flex items-center justify-between border-b border-zinc-850 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#FFE600] text-zinc-950 font-black flex items-center justify-center text-xs">
                  W
                </div>
                <span className="font-black text-sm text-[#FFE600] tracking-wide">WHATNOT LIVE</span>
              </div>
              <div className="flex items-center gap-1.5 bg-red-600/20 text-red-400 border border-red-500/40 px-2 py-0.5 rounded-full text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                <span>ON AIR SHOW</span>
              </div>
            </div>

            {/* Auction Lot Card */}
            <div className="bg-zinc-900/90 rounded-xl p-3.5 border border-zinc-800 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-mono text-[#FFE600] font-bold uppercase tracking-wider block">
                    LOT #14 • SUDDEN DEATH AUCTION
                  </span>
                  <h3 className="text-sm font-bold text-white mt-0.5 leading-snug">
                    {listing.lotTitle || card.title}
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-zinc-400 block">Current Bid</span>
                  <span className="text-lg font-black text-[#FFE600] font-mono">
                    ${listing.startingBid || 1}
                  </span>
                </div>
              </div>

              {/* Card Scan in Stream Stage */}
              <div className="relative bg-zinc-950 rounded-lg p-2 flex justify-center items-center h-48 overflow-hidden border border-zinc-800">
                <img src={card.frontImage} alt="" className="h-full object-contain rounded" />
                <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-mono font-bold text-[#FFE600] border border-[#FFE600]/30">
                  ⚡ 30s Sudden Death
                </div>
                <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-mono font-bold text-white">
                  Grade: {card.grader} {card.gradeScore}
                </div>
              </div>

              {/* Live Bid Controls */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button className="w-full bg-[#FFE600] hover:bg-[#ebd300] text-zinc-950 font-black py-2 rounded-xl text-xs transition-all shadow-md shadow-[#FFE600]/20 flex items-center justify-center gap-1.5">
                  <span>Custom Bid +$5</span>
                </button>
                <button className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-2 rounded-xl text-xs border border-zinc-700 flex items-center justify-center gap-1">
                  <span>Buy It Now: ${card.askingPrice}</span>
                </button>
              </div>

              <div className="text-[10px] text-zinc-400 flex items-center justify-between pt-2 border-t border-zinc-800/80">
                <span>Shipping: $4.50 BMWT (Bundled)</span>
                <span>Livestream Lot Queue: Ready</span>
              </div>
            </div>
          </div>
        )}

        {selectedPlatform === 'reddit' && (
          <div className="max-w-lg mx-auto bg-zinc-900 text-zinc-200 rounded-xl p-4 shadow-xl text-xs font-sans border border-zinc-800">
            <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] mb-2">
              <span className="font-bold text-orange-500">r/pkmntcgtrades</span>
              <span>• Posted by u/HobbyCollector • 2 hours ago</span>
            </div>

            <h3 className="text-sm font-bold text-white mb-2.5">
              {listing.title || `[US, US] [H] ${card.title} [W] $${card.askingPrice} PayPal G&S`}
            </h3>

            <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 text-zinc-300 font-mono text-[11px] whitespace-pre-line leading-relaxed mb-3">
              {listing.bodyMarkdown || `### [H] Have:\n* **${card.title}** (${card.grader} ${card.gradeScore})\n* Price: **$${card.askingPrice} shipped BMWT**\n\n### [W] Want:\n* PayPal Goods & Services only.`}
            </div>

            <div className="flex items-center gap-4 text-zinc-400 text-[11px] border-t border-zinc-800 pt-2">
              <span className="flex items-center gap-1">🔺 14 Upvotes</span>
              <span className="flex items-center gap-1">💬 8 Comments</span>
              <span className="text-emerald-400 font-semibold">Verified Trader +45</span>
            </div>
          </div>
        )}

        {selectedPlatform === 'twitter' && (
          <div className="max-w-md mx-auto bg-black text-white rounded-2xl p-4 shadow-xl text-xs font-sans border border-zinc-800">
            <div className="flex items-start gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-red-500 flex items-center justify-center font-bold text-xs">
                OC
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-white text-xs">OmniCard Vault</span>
                  <span className="text-blue-400 text-[11px]">✓</span>
                  <span className="text-zinc-500 text-[11px]">@omnicard_hq</span>
                </div>
                <div className="text-zinc-100 text-xs mt-1 whitespace-pre-line leading-relaxed">
                  {listing.tweetText || `🚨 FOR SALE: ${card.title} (${card.grader} ${card.gradeScore})\n💰 $${card.askingPrice} shipped BMWT!\n\n#TheHobby #CardCollector #CardsForSale`}
                </div>
              </div>
            </div>

            {card.frontImage && (
              <div className="rounded-xl overflow-hidden border border-zinc-800 my-2 max-h-52 bg-zinc-900 flex justify-center">
                <img src={card.frontImage} alt="" className="max-h-48 object-contain" />
              </div>
            )}

            <div className="flex items-center justify-between text-zinc-500 text-[11px] pt-2 border-t border-zinc-800/80">
              <span>💬 12</span>
              <span>🔁 28</span>
              <span>❤️ 142</span>
              <span>📊 2.4K</span>
            </div>
          </div>
        )}

        {selectedPlatform === 'slack' && (
          <div className="max-w-md mx-auto bg-zinc-900 text-zinc-100 rounded-xl p-4 shadow-xl text-xs font-sans border border-zinc-800">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded bg-[#4A154B] text-white flex items-center justify-center font-bold text-xs">
                #
              </div>
              <div>
                <span className="font-bold text-white text-xs">#card-drops-vip</span>
                <span className="text-[10px] text-zinc-400 ml-2">OmniCard App</span>
              </div>
            </div>
            <div className="border-l-4 border-[#4A154B] bg-zinc-950 p-3 rounded-r text-zinc-200">
              <div className="font-bold text-white text-xs mb-1">🃏 {card.title}</div>
              <div className="text-zinc-300 text-[11px]">
                <strong>Price:</strong> ${card.askingPrice} | <strong>Est. FMV:</strong> ${card.estimatedWorth?.fairMarketValue || card.askingPrice}
                <br />
                <strong>Grade:</strong> {card.grader} {card.gradeScore}
              </div>
            </div>
          </div>
        )}

        {selectedPlatform === 'telegram' && (
          <div className="max-w-sm mx-auto bg-[#182533] text-white rounded-2xl p-4 shadow-xl text-xs font-sans border border-zinc-800">
            <div className="bg-[#202F3F] p-3 rounded-xl border border-zinc-700/50">
              <div className="font-bold text-amber-400 text-xs mb-1">🃏 NEW CARD DROP ALERT</div>
              <div className="text-white font-bold text-xs mb-2">{card.title}</div>
              <div className="text-zinc-200 text-[11px] space-y-1 mb-2">
                <div>💰 <b>Asking Price:</b> ${card.askingPrice}</div>
                <div>⭐ <b>Grade:</b> {card.grader} {card.gradeScore}</div>
                <div>📊 <b>Fair Market:</b> ${card.estimatedWorth?.fairMarketValue || card.askingPrice}</div>
              </div>
              <button className="w-full bg-[#2AABEE] text-white font-bold py-1.5 rounded-lg text-xs hover:bg-[#229ED9] transition-colors">
                ⚡ Instant Claim & Checkout
              </button>
            </div>
          </div>
        )}

        {(selectedPlatform === 'webhook' || selectedPlatform === 'zapier') && (
          <div className="max-w-md mx-auto bg-zinc-950 text-emerald-400 rounded-xl p-4 shadow-xl text-xs font-mono border border-zinc-800">
            <div className="flex items-center justify-between text-zinc-400 text-[10px] mb-2 font-sans border-b border-zinc-800 pb-1.5">
              <span>POST Application/JSON Payload</span>
              <button
                onClick={() => handleCopyText(JSON.stringify({ event: 'card.sync', card }, null, 2))}
                className="flex items-center gap-1 text-zinc-300 hover:text-white"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
              </button>
            </div>
            <pre className="overflow-x-auto text-[11px] leading-relaxed text-zinc-300">
              {JSON.stringify(
                {
                  event: 'card.cross_post',
                  timestamp: new Date().toISOString(),
                  cardId: card.id,
                  title: card.title,
                  askingPrice: card.askingPrice,
                  estimatedWorth: card.estimatedWorth?.fairMarketValue,
                  grader: card.grader,
                  gradeScore: card.gradeScore,
                  targetPlatform: selectedPlatform,
                },
                null,
                2
              )}
            </pre>
          </div>
        )}
      </div>

      {/* Footer Copy Helper */}
      <div className="p-2.5 bg-zinc-950/90 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
        <span className="flex items-center gap-1 text-[11px]">
          <Sparkles className="w-3 h-3 text-amber-400" />
          AI Auto-Tailored for {platformMeta.name} specs
        </span>
        <button
          onClick={() => {
            const copyContent = typeof listing === 'string' ? listing : JSON.stringify(listing, null, 2);
            handleCopyText(copyContent);
          }}
          className="flex items-center gap-1 text-xs text-zinc-300 hover:text-white px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copied to Clipboard' : 'Copy Listing Copy'}</span>
        </button>
      </div>
    </div>
  );
};
