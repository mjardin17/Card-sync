export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CAD' | 'AUD';

export interface CurrencyRate {
  code: CurrencyCode;
  symbol: string;
  rateAgainstUSD: number;
  name: string;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyRate> = {
  USD: { code: 'USD', symbol: '$', rateAgainstUSD: 1.0, name: 'US Dollar (USD)' },
  EUR: { code: 'EUR', symbol: '€', rateAgainstUSD: 0.92, name: 'Euro (EUR)' },
  GBP: { code: 'GBP', symbol: '£', rateAgainstUSD: 0.79, name: 'British Pound (GBP)' },
  JPY: { code: 'JPY', symbol: '¥', rateAgainstUSD: 154.5, name: 'Japanese Yen (JPY)' },
  CAD: { code: 'CAD', symbol: 'C$', rateAgainstUSD: 1.38, name: 'Canadian Dollar (CAD)' },
  AUD: { code: 'AUD', symbol: 'A$', rateAgainstUSD: 1.55, name: 'Australian Dollar (AUD)' },
};

export function formatCurrency(amountUSD: number, currency: CurrencyCode = 'USD'): string {
  const info = CURRENCIES[currency] || CURRENCIES.USD;
  const converted = amountUSD * info.rateAgainstUSD;
  
  if (currency === 'JPY') {
    return `${info.symbol}${Math.round(converted).toLocaleString()}`;
  }
  
  return `${info.symbol}${converted.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export interface ShippingMethod {
  id: string;
  name: string;
  carrier: string;
  packaging: string;
  insuranceMax: number;
  estimatedDays: string;
  domesticCostUSD: number;
  intlCostUSD: number;
  recommendedFor: string;
}

export const SHIPPING_METHODS: ShippingMethod[] = [
  {
    id: 'usps-bmwt',
    name: 'USPS Ground Advantage (BMWT)',
    carrier: 'USPS',
    packaging: 'Bubble Mailer + Toploader Shield + Team Bag',
    insuranceMax: 100,
    estimatedDays: '2-5 Business Days',
    domesticCostUSD: 4.85,
    intlCostUSD: 17.50,
    recommendedFor: 'Cards $20 - $250',
  },
  {
    id: 'usps-priority-box',
    name: 'USPS Priority Mail Small Flat Rate Box',
    carrier: 'USPS',
    packaging: 'Rigid Box + Bubble Wrap + Graded Slab Sleeve',
    insuranceMax: 500,
    estimatedDays: '1-3 Business Days',
    domesticCostUSD: 9.85,
    intlCostUSD: 36.00,
    recommendedFor: 'Graded Slabs $250 - $1,500',
  },
  {
    id: 'ups-2day-insured',
    name: 'UPS 2nd Day Air (Signature Required)',
    carrier: 'UPS',
    packaging: 'Double-Boxed Armor + Tamper Tape + Full Declared Value',
    insuranceMax: 10000,
    estimatedDays: '2 Business Days Guaranteed',
    domesticCostUSD: 24.50,
    intlCostUSD: 68.00,
    recommendedFor: 'High-End Grails $1,500 - $10,000+',
  },
  {
    id: 'dhl-express-intl',
    name: 'DHL Express Worldwide Tracked',
    carrier: 'DHL',
    packaging: 'Rigid Container + Waterproof Sealed',
    insuranceMax: 5000,
    estimatedDays: '2-4 Days Global',
    domesticCostUSD: 32.00,
    intlCostUSD: 48.00,
    recommendedFor: 'International Buyers (Tokyo / London / Paris)',
  },
];
