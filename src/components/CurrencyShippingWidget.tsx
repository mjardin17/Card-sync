import React, { useState } from 'react';
import { 
  CurrencyCode, 
  CURRENCIES, 
  formatCurrency, 
  SHIPPING_METHODS, 
  ShippingMethod 
} from '../utils/currencyAndShipping';
import { CardItem } from '../types/card';
import { 
  Truck, 
  Globe2, 
  ShieldCheck, 
  DollarSign, 
  Package, 
  Clock, 
  Info, 
  CheckCircle2,
  ChevronDown
} from 'lucide-react';

interface CurrencyShippingWidgetProps {
  card: CardItem;
  currency: CurrencyCode;
  onCurrencyChange: (newCurrency: CurrencyCode) => void;
}

export const CurrencyShippingWidget: React.FC<CurrencyShippingWidgetProps> = ({
  card,
  currency,
  onCurrencyChange,
}) => {
  const [destination, setDestination] = useState<'domestic' | 'international'>('domestic');
  const [selectedMethodId, setSelectedMethodId] = useState<string>('usps-bmwt');

  const askingPrice = card.askingPrice;
  const selectedShipping = SHIPPING_METHODS.find((m) => m.id === selectedMethodId) || SHIPPING_METHODS[0];
  const shippingCostUSD = destination === 'domestic' ? selectedShipping.domesticCostUSD : selectedShipping.intlCostUSD;
  const totalWithShippingUSD = askingPrice + shippingCostUSD;

  // International duties/VAT estimate (approx 10-20% depending on EU/UK/JP)
  const estimatedVatRate = destination === 'international' ? 0.15 : 0.0;
  const estimatedVatUSD = askingPrice * estimatedVatRate;
  const grandTotalUSD = totalWithShippingUSD + estimatedVatUSD;

  return (
    <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-800 space-y-5">
      {/* Top Controls: Currency & Destination */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Globe2 className="w-5 h-5 text-amber-400" />
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              Global Currency & Insured Shipping Calculator
            </h4>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real-time multi-currency exchange rates and carrier shipping matrices
          </p>
        </div>

        {/* Currency Selector Pill */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-zinc-400">Display:</span>
          <select
            value={currency}
            onChange={(e) => onCurrencyChange(e.target.value as CurrencyCode)}
            className="bg-zinc-900 border border-zinc-700 text-amber-400 font-bold rounded-lg px-3 py-1 text-xs focus:outline-none focus:border-amber-400"
          >
            {Object.values(CURRENCIES).map((c) => (
              <option key={c.code} value={c.code}>
                {c.symbol} {c.code} - {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Destination Switcher */}
      <div className="flex items-center gap-2 bg-zinc-900 p-1 rounded-xl border border-zinc-800 self-start">
        <button
          onClick={() => setDestination('domestic')}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
            destination === 'domestic'
              ? 'bg-amber-400 text-zinc-950 shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Truck className="w-4 h-4" />
          Domestic US (50 States + PR)
        </button>
        <button
          onClick={() => setDestination('international')}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
            destination === 'international'
              ? 'bg-amber-400 text-zinc-950 shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Globe2 className="w-4 h-4" />
          International (UK, EU, Japan, Canada, Australia)
        </button>
      </div>

      {/* Carrier Selection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {SHIPPING_METHODS.map((method) => {
          const costUSD = destination === 'domestic' ? method.domesticCostUSD : method.intlCostUSD;
          const isSelected = selectedMethodId === method.id;

          return (
            <div
              key={method.id}
              onClick={() => setSelectedMethodId(method.id)}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                isSelected
                  ? 'bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/30'
                  : 'bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-white">{method.name}</span>
                </div>
                <span className="font-black text-sm text-amber-400">
                  {formatCurrency(costUSD, currency)}
                </span>
              </div>

              <p className="text-[11px] text-zinc-400 mt-1">
                {method.packaging}
              </p>

              <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-2 pt-2 border-t border-zinc-800/80">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-zinc-400" />
                  {method.estimatedDays}
                </span>
                <span className="text-emerald-400 font-semibold">
                  Insured up to ${method.insuranceMax.toLocaleString()}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Total Landed Cost Breakdown */}
      <div className="bg-zinc-900/80 p-4 rounded-xl border border-zinc-800 space-y-2 text-xs">
        <div className="flex justify-between text-zinc-300">
          <span>Card Asking Price:</span>
          <span className="font-bold text-white">{formatCurrency(askingPrice, currency)}</span>
        </div>

        <div className="flex justify-between text-zinc-300">
          <span>{selectedShipping.name} ({destination}):</span>
          <span className="font-bold text-white">{formatCurrency(shippingCostUSD, currency)}</span>
        </div>

        {destination === 'international' && (
          <div className="flex justify-between text-zinc-400 text-[11px]">
            <span className="flex items-center gap-1">
              Estimated Import Duties & VAT (15% avg):
              <Info className="w-3 h-3 text-zinc-500" />
            </span>
            <span>+{formatCurrency(estimatedVatUSD, currency)}</span>
          </div>
        )}

        <div className="pt-2 border-t border-zinc-800 flex justify-between items-center">
          <span className="text-sm font-black text-white">Estimated Buyer Landed Total:</span>
          <span className="text-lg font-black text-emerald-400">
            {formatCurrency(destination === 'international' ? grandTotalUSD : totalWithShippingUSD, currency)}
          </span>
        </div>
      </div>
    </div>
  );
};
