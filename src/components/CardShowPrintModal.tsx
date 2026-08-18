import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { CardItem } from '../types/card';
import { CurrencyCode, formatCurrency } from '../utils/currencyAndShipping';
import { 
  X, 
  Printer, 
  QrCode, 
  FileText, 
  ShieldCheck, 
  Tag, 
  PackageCheck, 
  Copy, 
  Check,
  Award
} from 'lucide-react';

interface CardShowPrintModalProps {
  card: CardItem | null;
  isOpen: boolean;
  onClose: () => void;
  currency: CurrencyCode;
}

export const CardShowPrintModal: React.FC<CardShowPrintModalProps> = ({
  card,
  isOpen,
  onClose,
  currency,
}) => {
  if (!isOpen || !card) return null;

  const [printMode, setPrintMode] = useState<'stand_tag' | 'packing_slip'>('stand_tag');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [sellerName, setSellerName] = useState<string>('OmniVault Premium Collectibles');
  const [customPriceTag, setCustomPriceTag] = useState<number>(card.askingPrice);
  const [buyerName, setBuyerName] = useState<string>('Valued Collector');
  const [trackingNumber, setTrackingNumber] = useState<string>('9400 1118 9956 2304 8912 01');

  useEffect(() => {
    // Generate high-resolution QR code
    const targetUrl = window.location.href + `#card=${card.id}`;
    QRCode.toDataURL(targetUrl, {
      width: 256,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('QR generation error:', err));
  }, [card]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-4xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Top Header (Hidden on Print) */}
        <div className="print:hidden p-4 sm:p-5 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-zinc-950 shadow-md">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                Card Show Label & Packing Slip Generator
              </h3>
              <p className="text-xs text-zinc-400 truncate max-w-md">
                Print 2.5" × 3.5" slab display inserts & BMWT shipping packing slips
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black px-4 py-2 rounded-xl text-xs shadow-lg transition-all"
            >
              <Printer className="w-4 h-4" />
              Print Now
            </button>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mode Selector & Customization Bar (Hidden on Print) */}
        <div className="print:hidden p-4 bg-zinc-950/70 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => setPrintMode('stand_tag')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                printMode === 'stand_tag'
                  ? 'bg-amber-400 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Tag className="w-4 h-4" />
              Slab Display Stand Insert (2.5" × 3.5")
            </button>
            <button
              onClick={() => setPrintMode('packing_slip')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                printMode === 'packing_slip'
                  ? 'bg-amber-400 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <PackageCheck className="w-4 h-4" />
              BMWT Insured Packing Slip Invoice
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <label className="text-zinc-400 font-medium">Tag Price:</label>
            <input
              type="number"
              value={customPriceTag}
              onChange={(e) => setCustomPriceTag(Number(e.target.value))}
              className="w-28 bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1 text-white font-bold text-xs"
            />
          </div>
        </div>

        {/* Printable Preview Sheet */}
        <div className="flex-1 p-6 overflow-y-auto bg-zinc-900/50 flex justify-center items-center">
          {printMode === 'stand_tag' ? (
            /* Stand Display Tag Preview (Standard 2.5" x 3.5" Collector Proportions) */
            <div className="w-[340px] bg-white text-zinc-900 rounded-2xl p-5 shadow-2xl border-4 border-zinc-900 flex flex-col justify-between space-y-4 font-sans select-none">
              {/* Top Banner */}
              <div className="border-b-2 border-zinc-900 pb-3 flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-black tracking-widest text-zinc-500 uppercase">
                    {card.category.toUpperCase()} • {card.year || '2024'}
                  </span>
                  <h2 className="text-sm font-black text-zinc-900 leading-tight">
                    {card.title}
                  </h2>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[9px] font-bold uppercase bg-zinc-900 text-white px-2 py-0.5 rounded">
                    {card.grader || 'PSA'} {card.gradeScore || 'GEM MINT'}
                  </span>
                </div>
              </div>

              {/* Price & QR Row */}
              <div className="flex items-center justify-between gap-3 bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                <div>
                  <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider block">
                    Show Price
                  </span>
                  <div className="text-2xl font-black text-zinc-950">
                    {formatCurrency(customPriceTag, currency)}
                  </div>
                  <span className="text-[9px] text-zinc-500 block mt-0.5">
                    Cert: {card.certNumber || 'Verified #894012'}
                  </span>
                </div>

                {qrDataUrl && (
                  <div className="flex flex-col items-center shrink-0">
                    <img src={qrDataUrl} alt="Card QR" className="w-16 h-16 rounded border border-zinc-300" />
                    <span className="text-[8px] font-black text-zinc-600 mt-0.5 uppercase tracking-tighter">
                      Scan Comps
                    </span>
                  </div>
                )}
              </div>

              {/* Card Specs Bullet List */}
              <div className="space-y-1 text-[10px] text-zinc-700">
                <div className="flex justify-between border-b border-zinc-100 py-0.5">
                  <span className="font-semibold text-zinc-500">Set:</span>
                  <span className="font-bold">{card.setName || 'Base Series'}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-100 py-0.5">
                  <span className="font-semibold text-zinc-500">Card #:</span>
                  <span className="font-bold">{card.cardNumber || '#1'}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-100 py-0.5">
                  <span className="font-semibold text-zinc-500">Authenticity:</span>
                  <span className="font-bold text-emerald-700">100% Guaranteed Genuine</span>
                </div>
              </div>

              {/* Bottom Footer */}
              <div className="pt-2 border-t border-zinc-200 text-center">
                <span className="text-[9px] font-extrabold text-zinc-400 tracking-wider uppercase">
                  {sellerName} • OmniCard Vault
                </span>
              </div>
            </div>
          ) : (
            /* Full BMWT Packing Slip Invoice Layout */
            <div className="w-full max-w-2xl bg-white text-zinc-900 rounded-xl p-8 shadow-2xl border border-zinc-300 space-y-6 font-sans">
              {/* Slip Header */}
              <div className="flex items-start justify-between border-b-2 border-zinc-900 pb-4">
                <div>
                  <h1 className="text-xl font-black tracking-tight text-zinc-900">
                    OMNICARD VAULT PACKING SLIP
                  </h1>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Official Proof of Authenticity & Insured Transit Slip
                  </p>
                </div>
                <div className="text-right text-xs">
                  <div className="font-bold text-zinc-900">Slip #{card.id.slice(-6).toUpperCase()}</div>
                  <div className="text-zinc-500">{new Date().toLocaleDateString()}</div>
                </div>
              </div>

              {/* Seller / Buyer / Tracking Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-zinc-50 p-4 rounded-lg border border-zinc-200">
                <div>
                  <span className="font-bold text-zinc-500 uppercase text-[10px] block">Shipper / Vault</span>
                  <p className="font-bold text-zinc-900">{sellerName}</p>
                  <p className="text-zinc-600">OmniCard Collector Network</p>
                  <p className="text-zinc-600">contact@omnicardvault.io</p>
                </div>
                <div>
                  <span className="font-bold text-zinc-500 uppercase text-[10px] block">Deliver To</span>
                  <p className="font-bold text-zinc-900">{buyerName}</p>
                  <p className="text-zinc-600">Insured Bubble Mailer with Tracking</p>
                  <p className="font-mono text-[11px] font-semibold text-zinc-800">Track: {trackingNumber}</p>
                </div>
              </div>

              {/* Item Table */}
              <div className="border border-zinc-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-zinc-100 font-bold text-zinc-700 uppercase text-[10px] border-b border-zinc-200">
                    <tr>
                      <th className="p-3">Collectible Card Description</th>
                      <th className="p-3">Grade</th>
                      <th className="p-3">Cert #</th>
                      <th className="p-3 text-right">Declared Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 text-zinc-800">
                    <tr>
                      <td className="p-3 font-semibold">
                        {card.title}
                        <span className="text-[10px] text-zinc-500 block">{card.setName} • Card {card.cardNumber}</span>
                      </td>
                      <td className="p-3 font-bold">{card.grader} {card.gradeScore}</td>
                      <td className="p-3 font-mono">{card.certNumber || 'N/A'}</td>
                      <td className="p-3 text-right font-black">{formatCurrency(customPriceTag, currency)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* QR & Handling Instructions */}
              <div className="flex items-center justify-between gap-4 pt-2 border-t border-zinc-200 text-xs">
                <div className="space-y-1">
                  <span className="font-black text-red-600 uppercase text-[11px] flex items-center gap-1">
                    ⚠️ DO NOT BEND • HIGH-VALUE GRADED SPECIMEN
                  </span>
                  <p className="text-zinc-500 text-[11px]">
                    Packaged in team bag + cardboard armor shield + waterproof bubble mailer.
                  </p>
                </div>

                {qrDataUrl && (
                  <div className="flex items-center gap-2 shrink-0">
                    <img src={qrDataUrl} alt="Verify QR" className="w-14 h-14 rounded border border-zinc-300" />
                    <span className="text-[9px] text-zinc-500 font-semibold max-w-[80px]">
                      Scan to confirm authentic delivery
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
