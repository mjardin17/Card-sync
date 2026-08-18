import React, { useState, useRef, useEffect } from 'react';
import { CardItem } from '../types/card';
import { 
  X, 
  ShieldCheck, 
  Download, 
  Camera, 
  Layers, 
  Sparkles, 
  Eye, 
  Check, 
  Sliders, 
  Lock
} from 'lucide-react';

interface CardWatermarkGalleryModalProps {
  card: CardItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CardWatermarkGalleryModal: React.FC<CardWatermarkGalleryModalProps> = ({
  card,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !card) return null;

  const [activeAngle, setActiveAngle] = useState<'front' | 'back' | 'holo' | 'corners' | 'subgrades'>('front');
  const [watermarkHandle, setWatermarkHandle] = useState<string>('@OmniVault_Verified');
  const [includeDate, setIncludeDate] = useState<boolean>(true);
  const [includeCert, setIncludeCert] = useState<boolean>(true);
  const [watermarkStyle, setWatermarkStyle] = useState<'diagonal_grid' | 'bottom_badge' | 'center_shield'>('diagonal_grid');
  const [opacity, setOpacity] = useState<number>(0.45);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [watermarkedDataUrl, setWatermarkedDataUrl] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Generate dynamic angle images based on card category
  const angleImages = {
    front: card.frontImage,
    back: card.backImage || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    holo: card.frontImage,
    corners: card.frontImage,
    subgrades: card.frontImage,
  };

  const currentImageSrc = angleImages[activeAngle];

  // Draw watermarked canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = currentImageSrc;

    img.onload = () => {
      canvas.width = img.naturalWidth || 800;
      canvas.height = img.naturalHeight || 1100;

      // Draw base image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const dateStr = new Date().toISOString().split('T')[0];
      const certText = card.certNumber ? `PSA Cert #${card.certNumber}` : 'Vault Certified';
      const watermarkMainText = `${watermarkHandle} • ${includeCert ? certText : ''} ${includeDate ? `• ${dateStr}` : ''}`.trim();

      ctx.save();

      if (watermarkStyle === 'diagonal_grid') {
        // Diagonal repeating watermark
        ctx.globalAlpha = opacity;
        ctx.font = `bold ${Math.round(canvas.width * 0.032)}px sans-serif`;
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((-35 * Math.PI) / 180);
        ctx.translate(-canvas.width / 2, -canvas.height / 2);

        const stepY = canvas.height * 0.18;
        for (let y = -canvas.height * 0.5; y < canvas.height * 1.5; y += stepY) {
          ctx.strokeText(watermarkMainText, -canvas.width * 0.2, y);
          ctx.fillText(watermarkMainText, -canvas.width * 0.2, y);
        }
      } else if (watermarkStyle === 'bottom_badge') {
        // High-contrast security bar at bottom
        ctx.globalAlpha = 0.85;
        const barHeight = canvas.height * 0.07;
        ctx.fillStyle = '#09090B';
        ctx.fillRect(0, canvas.height - barHeight, canvas.width, barHeight);

        ctx.fillStyle = '#F59E0B';
        ctx.font = `bold ${Math.round(canvas.width * 0.028)}px sans-serif`;
        ctx.fillText(`🛡️ AUTHENTIC VAULT SPECIMEN`, canvas.width * 0.04, canvas.height - barHeight * 0.4);

        ctx.fillStyle = '#E4E4E7';
        ctx.font = `normal ${Math.round(canvas.width * 0.022)}px sans-serif`;
        ctx.fillText(watermarkMainText, canvas.width * 0.45, canvas.height - barHeight * 0.4);
      } else {
        // Center shield badge
        ctx.globalAlpha = opacity;
        ctx.font = `bold ${Math.round(canvas.width * 0.04)}px sans-serif`;
        ctx.fillStyle = '#F59E0B';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.textAlign = 'center';
        
        ctx.strokeText(`🛡️ ${watermarkHandle}`, canvas.width / 2, canvas.height / 2 - 20);
        ctx.fillText(`🛡️ ${watermarkHandle}`, canvas.width / 2, canvas.height / 2 - 20);
        
        ctx.font = `bold ${Math.round(canvas.width * 0.028)}px sans-serif`;
        ctx.strokeText(certText, canvas.width / 2, canvas.height / 2 + 25);
        ctx.fillText(certText, canvas.width / 2, canvas.height / 2 + 25);
      }

      ctx.restore();

      try {
        setWatermarkedDataUrl(canvas.toDataURL('image/jpeg', 0.92));
      } catch (e) {
        // ignore cross-origin canvas security if external image
      }
    };
  }, [currentImageSrc, watermarkHandle, includeDate, includeCert, watermarkStyle, opacity, card]);

  const handleDownload = () => {
    if (!watermarkedDataUrl) return;
    const a = document.createElement('a');
    a.href = watermarkedDataUrl;
    a.download = `${card.id}-watermarked-${activeAngle}.jpg`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-zinc-950 shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                Multi-Angle Gallery & Anti-Scam Watermark Studio
              </h3>
              <p className="text-xs text-zinc-400 truncate max-w-md">
                Generate tamper-proof photo listings for Reddit, Discord, and eBay
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
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Canvas Preview (7 cols) */}
          <div className="lg:col-span-7 flex flex-col items-center gap-4">
            {/* Angle Switcher Tabs */}
            <div className="flex items-center gap-1.5 bg-zinc-950 p-1.5 rounded-xl border border-zinc-800 w-full justify-between overflow-x-auto">
              {[
                { id: 'front', label: 'Front Face' },
                { id: 'back', label: 'Back Surface' },
                { id: 'holo', label: 'Holo Sheen' },
                { id: 'corners', label: 'Corners (4x)' },
                { id: 'subgrades', label: 'PSA Slab Cert' },
              ].map((angle) => (
                <button
                  key={angle.id}
                  onClick={() => setActiveAngle(angle.id as any)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                    activeAngle === angle.id
                      ? 'bg-amber-400 text-zinc-950 shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {angle.label}
                </button>
              ))}
            </div>

            {/* Canvas Display Frame */}
            <div className="relative w-full max-w-sm aspect-[3/4] bg-zinc-950 rounded-2xl border-2 border-zinc-800 overflow-hidden shadow-2xl flex items-center justify-center p-2">
              <canvas
                ref={canvasRef}
                className="w-full h-full object-contain rounded-xl"
              />
            </div>

            {/* Download Button */}
            <button
              onClick={handleDownload}
              className="w-full max-w-sm flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-zinc-950 font-black py-2.5 rounded-xl shadow-lg transition-all"
            >
              <Download className="w-4 h-4" />
              Download Watermarked Photo
            </button>
          </div>

          {/* Right Column: Watermark Controls & Anti-Theft Protection (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-4">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Anti-Scam Protection Overlay
                </h4>
              </div>

              {/* Watermark Handle Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300">
                  Seller Handle / Vault Identifier
                </label>
                <input
                  type="text"
                  value={watermarkHandle}
                  onChange={(e) => setWatermarkHandle(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm font-semibold text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Style Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300">
                  Watermark Security Pattern
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'diagonal_grid', label: 'Diagonal Grid' },
                    { id: 'bottom_badge', label: 'Bottom Bar' },
                    { id: 'center_shield', label: 'Center Shield' },
                  ].map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setWatermarkStyle(style.id as any)}
                      className={`p-2 text-xs font-bold rounded-lg border text-center transition-all ${
                        watermarkStyle === style.id
                          ? 'bg-amber-400 text-zinc-950 border-amber-400 font-black'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                      }`}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Opacity Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-zinc-300">Opacity / Visibility</span>
                  <span className="text-amber-400 font-bold">{Math.round(opacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.15}
                  max={0.85}
                  step={0.05}
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  className="w-full accent-amber-400"
                />
              </div>

              {/* Toggles */}
              <div className="space-y-2 pt-2 border-t border-zinc-800">
                <label className="flex items-center gap-2.5 text-xs text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeDate}
                    onChange={(e) => setIncludeDate(e.target.checked)}
                    className="accent-amber-400 rounded"
                  />
                  <span>Stamp Live Verification Date (Coins / Timestamp)</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeCert}
                    onChange={(e) => setIncludeCert(e.target.checked)}
                    className="accent-amber-400 rounded"
                  />
                  <span>Stamp PSA / BGS Slab Cert Number</span>
                </label>
              </div>
            </div>

            {/* Collector Anti-Fraud Notice */}
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-1.5">
              <span className="font-bold text-amber-400 block">
                Why Watermarking Matters on Reddit & Discord
              </span>
              <p className="text-zinc-300 text-[11px] leading-relaxed">
                Fraudulent scammers routinely scrape unstamped high-value card photos from eBay to create fake "vouch" posts or r/pkmntcgtrades listing scams. Watermarking with your exact username and date stamp proves authentic in-hand possession.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
