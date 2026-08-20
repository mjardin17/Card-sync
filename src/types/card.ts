export type CardCategory = 
  | 'pokemon' 
  | 'sports' 
  | 'racing' 
  | 'crossover' 
  | 'mtg' 
  | 'yugioh' 
  | 'onepiece' 
  | 'tcg' 
  | 'other';
export type Grader = 'PSA' | 'BGS' | 'CGC' | 'SGC' | 'Raw';

export type PlatformId = 
  | 'ebay' 
  | 'whatnot'
  | 'discord' 
  | 'reddit' 
  | 'twitter' 
  | 'slack' 
  | 'telegram' 
  | 'bluesky' 
  | 'mercari' 
  | 'tcgplayer' 
  | 'webhook' 
  | 'zapier';

export interface SaleComp {
  date: string;
  platform: string;
  grade: string;
  price: number;
  title: string;
}

export interface CardEstimatedWorth {
  fairMarketValue: number;
  priceRangeLow: number;
  priceRangeHigh: number;
  confidenceScore: number;
  trend30DayPercent: number;
  liquidityRating: 'High' | 'Medium' | 'Low';
  popReportEstimate?: string;
  recentSales: SaleComp[];
}

export interface PlatformListingState {
  status: 'not_posted' | 'synced' | 'pending' | 'error' | 'sold_updated';
  lastSyncedAt?: string;
  liveUrl?: string;
  listingId?: string;
  error?: string;
  responseData?: any;
}

export interface CardItem {
  id: string;
  title: string;
  category: CardCategory;
  subjectOrPlayer: string;
  setName: string;
  year: string;
  cardNumber: string;
  variant: string;
  grader: Grader;
  gradeScore: string;
  certNumber?: string;
  keyAttributes: string[];
  frontImage: string;
  backImage?: string;
  askingPrice: number;
  minPrice?: number;
  soldPrice?: number;
  estimatedWorth: CardEstimatedWorth;
  recommendedListingPrice?: number;
  conditionNotes?: string;
  seoTitle?: string;
  listings: Partial<Record<PlatformId, PlatformListingState>>;
  generatedListings?: any;
  status: 'active' | 'sold' | 'reserved' | 'draft';
  syncStatus: 'synced' | 'pending' | 'drift' | 'syncing';
  createdAt: string;
  updatedAt: string;
}

export interface PlatformConnectionInfo {
  status: 'VERIFIED' | 'NOT_CONNECTED' | 'ERROR' | 'APPROVAL_REQUIRED' | 'PARTNER_REQUIRED' | 'MANUAL_EXPORT' | 'RECONNECT_REQUIRED';
  authType: 'OAuth 2.0 (User PKCE)' | 'OAuth 2.0 (App)' | 'AT Protocol Session' | 'Official Bot Token' | 'Incoming Webhook' | 'Developer API Key' | 'Partner Authorization' | 'Manual Export';
  environment: 'production' | 'sandbox';
  accountId?: string;
  accountName?: string;
  storeOrChannel?: string;
  grantedScopes: string[];
  expiresAt?: string | null;
  refreshAvailable: boolean;
  readPermission: boolean;
  writePermission: boolean;
  listingPermission: boolean;
  lastVerifiedAt?: string | null;
  lastError?: string | null;
  latencyMs?: number;
  evidenceSource?: string;
}

/**
 * Sanitized client preferences stored in browser localStorage.
 * Guaranteed to NEVER contain secrets or access tokens.
 */
export interface ClientPlatformPreferences {
  executionMode: 'real' | 'sandbox';
  publishingMode: 'DRY_RUN' | 'LIVE_PUBLISHING';
  autoSyncPriceChanges: boolean;
  autoSyncSoldStatus: boolean;
  platformsEnabled: Record<PlatformId, boolean>;
  connectionStatuses: Partial<Record<PlatformId, PlatformConnectionInfo>>;
}

/**
 * Backwards-compatible alias for client-side configuration.
 * Note: Secret fields have been eliminated from client state.
 */
export type PlatformConfigState = ClientPlatformPreferences;

export interface SyncLogEntry {
  id: string;
  timestamp: string;
  cardId: string;
  cardTitle: string;
  platform: PlatformId;
  action: 'create' | 'update_price' | 'mark_sold' | 'verify' | 'test';
  status: 'success' | 'simulated' | 'failed';
  message: string;
  details?: string;
  latencyMs?: number;
}
