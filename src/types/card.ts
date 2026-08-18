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

export interface PlatformConfigState {
  executionMode: 'real' | 'sandbox';
  discordWebhookUrl: string;
  slackWebhookUrl: string;
  telegramBotToken: string;
  telegramChatId: string;
  ebayAppId: string;
  ebayDevToken: string;
  whatnotApiKey: string;
  whatnotSellerUsername: string;
  whatnotLiveShowId: string;
  twitterApiKey: string;
  twitterBearerToken: string;
  redditClientId: string;
  redditSecret: string;
  blueskyHandle: string;
  blueskyAppPassword: string;
  customWebhookUrl: string;
  zapierWebhookUrl: string;
  autoSyncPriceChanges: boolean;
  autoSyncSoldStatus: boolean;
  platformsEnabled: Record<PlatformId, boolean>;
}

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
