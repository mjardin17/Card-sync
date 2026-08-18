import { PlatformId } from '../types/card';

export interface PlatformMeta {
  id: PlatformId;
  name: string;
  badge: string;
  color: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  iconName: string;
  category: 'Marketplace' | 'Community' | 'Social' | 'Automation';
  feePercentage: number;
  feeFixed: number;
  description: string;
  tokenFieldLabel?: string;
  tokenFieldName?: string;
  tokenHelper?: string;
  supportsLiveWebhook: boolean;
}

export const PLATFORMS_LIST: PlatformMeta[] = [
  {
    id: 'discord',
    name: 'Discord Webhook / Servers',
    badge: 'Real Webhook Live',
    color: '#5865F2',
    textColor: 'text-[#5865F2]',
    bgColor: 'bg-[#5865F2]/10',
    borderColor: 'border-[#5865F2]/30',
    iconName: 'MessageSquare',
    category: 'Community',
    feePercentage: 0,
    feeFixed: 0,
    description: 'Instant rich embeds dispatched to card drop & trading channels via Webhook URL.',
    tokenFieldLabel: 'Discord Webhook URL',
    tokenFieldName: 'discordWebhookUrl',
    tokenHelper: 'Channel Settings -> Integrations -> Webhooks -> Copy Webhook URL',
    supportsLiveWebhook: true,
  },
  {
    id: 'ebay',
    name: 'eBay Marketplace',
    badge: 'Top Selling Channel',
    color: '#0064D2',
    textColor: 'text-[#0064D2]',
    bgColor: 'bg-[#0064D2]/10',
    borderColor: 'border-[#0064D2]/30',
    iconName: 'ShoppingBag',
    category: 'Marketplace',
    feePercentage: 13.25,
    feeFixed: 0.30,
    description: 'Formatted SEO title, Buy It Now + Best Offer, Item specifics, and condition disclosure.',
    tokenFieldLabel: 'eBay User Auth Token',
    tokenFieldName: 'ebayDevToken',
    tokenHelper: 'eBay Developer Portal -> User Tokens / OAuth Access Token',
    supportsLiveWebhook: false,
  },
  {
    id: 'whatnot',
    name: 'Whatnot (Live Shows & Marketplace)',
    badge: 'Live Shows & $1 Starts',
    color: '#FFE600',
    textColor: 'text-[#FFE600]',
    bgColor: 'bg-[#FFE600]/10',
    borderColor: 'border-[#FFE600]/30',
    iconName: 'Radio',
    category: 'Marketplace',
    feePercentage: 10.9, // 8% commission + 2.9% payment processing
    feeFixed: 0.30,
    description: 'Livestream auction lot sync ($1 sudden-death drops, buy-it-now store, and live show queue).',
    tokenFieldLabel: 'Whatnot Seller API Key / Token',
    tokenFieldName: 'whatnotApiKey',
    tokenHelper: 'Whatnot Seller Hub -> Settings -> Developer / API Access Token',
    supportsLiveWebhook: true,
  },
  {
    id: 'reddit',
    name: 'Reddit (r/pkmntcgtrades, etc.)',
    badge: '0% Platform Fee',
    color: '#FF4500',
    textColor: 'text-[#FF4500]',
    bgColor: 'bg-[#FF4500]/10',
    borderColor: 'border-[#FF4500]/30',
    iconName: 'Share2',
    category: 'Community',
    feePercentage: 2.99,
    feeFixed: 0.49, // PayPal Goods & Services fee
    description: 'Standard [H]/[W] formatted markdown with timestamps, asking prices, and PayPal G&S terms.',
    tokenFieldLabel: 'Reddit Client ID / App Secret',
    tokenFieldName: 'redditClientId',
    tokenHelper: 'reddit.com/prefs/apps -> Create Script App -> Client ID & Secret',
    supportsLiveWebhook: false,
  },
  {
    id: 'twitter',
    name: 'Twitter / X',
    badge: 'Showcase & DMs',
    color: '#000000',
    textColor: 'text-zinc-900 dark:text-zinc-100',
    bgColor: 'bg-zinc-800/10',
    borderColor: 'border-zinc-700/30',
    iconName: 'Twitter',
    category: 'Social',
    feePercentage: 0,
    feeFixed: 0,
    description: '280-char optimized card drop announcement with hashtags, market comps, and image attachment.',
    tokenFieldLabel: 'X Bearer Token / API Key',
    tokenFieldName: 'twitterBearerToken',
    tokenHelper: 'developer.x.com -> Projects & Apps -> Keys and Tokens',
    supportsLiveWebhook: false,
  },
  {
    id: 'slack',
    name: 'Slack Deal Channel',
    badge: 'Real Webhook Live',
    color: '#4A154B',
    textColor: 'text-[#4A154B]',
    bgColor: 'bg-[#4A154B]/10',
    borderColor: 'border-[#4A154B]/30',
    iconName: 'Hash',
    category: 'Community',
    feePercentage: 0,
    feeFixed: 0,
    description: 'Block Kit card cards sent to internal collector teams and VIP investor channels.',
    tokenFieldLabel: 'Slack Incoming Webhook URL',
    tokenFieldName: 'slackWebhookUrl',
    tokenHelper: 'api.slack.com/apps -> Incoming Webhooks -> Add New Webhook to Workspace',
    supportsLiveWebhook: true,
  },
  {
    id: 'telegram',
    name: 'Telegram Channel / Bot',
    badge: 'Real Bot API Live',
    color: '#229ED9',
    textColor: 'text-[#229ED9]',
    bgColor: 'bg-[#229ED9]/10',
    borderColor: 'border-[#229ED9]/30',
    iconName: 'Send',
    category: 'Community',
    feePercentage: 0,
    feeFixed: 0,
    description: 'HTML formatted card alert message sent straight to Telegram VIP subscriber feeds.',
    tokenFieldLabel: 'Telegram Bot Token',
    tokenFieldName: 'telegramBotToken',
    tokenHelper: 'Contact @BotFather on Telegram to create a Bot Token, and specify your @channel_id',
    supportsLiveWebhook: true,
  },
  {
    id: 'bluesky',
    name: 'Bluesky (AT Protocol)',
    badge: 'Collector Network',
    color: '#0085FF',
    textColor: 'text-[#0085FF]',
    bgColor: 'bg-[#0085FF]/10',
    borderColor: 'border-[#0085FF]/30',
    iconName: 'Cloud',
    category: 'Social',
    feePercentage: 0,
    feeFixed: 0,
    description: 'Clean collector updates posted to the decentralized Bluesky card network.',
    tokenFieldLabel: 'Bluesky App Password',
    tokenFieldName: 'blueskyAppPassword',
    tokenHelper: 'Settings -> Advanced -> App Passwords',
    supportsLiveWebhook: false,
  },
  {
    id: 'mercari',
    name: 'Mercari',
    badge: 'Fast Mobile Buyers',
    color: '#FF334B',
    textColor: 'text-[#FF334B]',
    bgColor: 'bg-[#FF334B]/10',
    borderColor: 'border-[#FF334B]/30',
    iconName: 'Tag',
    category: 'Marketplace',
    feePercentage: 10.0,
    feeFixed: 0,
    description: 'Mobile-first listing copy with quick-ship bubble mailer assurances.',
    tokenFieldLabel: 'Mercari Seller API Token',
    tokenFieldName: 'mercariToken',
    tokenHelper: 'Mercari Seller Portal',
    supportsLiveWebhook: false,
  },
  {
    id: 'webhook',
    name: 'Custom Webhook Endpoint',
    badge: 'Real Webhook Live',
    color: '#10B981',
    textColor: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    iconName: 'Webhook',
    category: 'Automation',
    feePercentage: 0,
    feeFixed: 0,
    description: 'Real-time JSON payload sent to any custom server, API gateway, or database webhook.',
    tokenFieldLabel: 'Custom Webhook Destination URL',
    tokenFieldName: 'customWebhookUrl',
    tokenHelper: 'Enter your HTTPS webhook URL endpoint (e.g., https://api.myshop.com/webhook)',
    supportsLiveWebhook: true,
  },
  {
    id: 'zapier',
    name: 'Zapier / Make Automation',
    badge: 'Real Webhook Live',
    color: '#FF4A00',
    textColor: 'text-[#FF4A00]',
    bgColor: 'bg-[#FF4A00]/10',
    borderColor: 'border-[#FF4A00]/30',
    iconName: 'Zap',
    category: 'Automation',
    feePercentage: 0,
    feeFixed: 0,
    description: 'Triggers multi-step Zapier / Make scenarios (sync to Google Sheets, Airtable, Shopify).',
    tokenFieldLabel: 'Zapier / Make Catch Hook URL',
    tokenFieldName: 'zapierWebhookUrl',
    tokenHelper: 'Create a Zap with "Webhooks by Zapier" -> Catch Hook -> Copy Webhook URL',
    supportsLiveWebhook: true,
  },
];

export function calculatePlatformPayout(price: number, platformId: PlatformId) {
  const meta = PLATFORMS_LIST.find((p) => p.id === platformId);
  if (!meta) return { fee: 0, net: price, feePercent: 0 };

  const fee = (price * meta.feePercentage) / 100 + meta.feeFixed;
  const net = Math.max(0, price - fee);

  return {
    fee: Number(fee.toFixed(2)),
    net: Number(net.toFixed(2)),
    feePercent: meta.feePercentage,
  };
}
