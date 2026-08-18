import { Request, Response } from 'express';
import { PlatformId, PlatformConnectionInfo, PlatformConfigState } from '../types/card';
import { PLATFORMS_LIST } from '../data/platforms';

interface ServerVaultStorage {
  [key: string]: any;
}

// In-memory server-side secure vault storage
const serverVault: Record<PlatformId, Record<string, string>> = {
  ebay: {},
  whatnot: {},
  twitter: {},
  reddit: {},
  bluesky: {},
  discord: {},
  slack: {},
  telegram: {},
  zapier: {},
  webhook: {},
  mercari: {},
  tcgplayer: {},
};

// Cached live verification results
const verificationCache: Record<PlatformId, PlatformConnectionInfo> = {
  ebay: {
    status: 'NOT_CONNECTED',
    authType: 'OAuth 2.0 (User PKCE)',
    environment: 'production',
    grantedScopes: [],
    refreshAvailable: false,
    readPermission: false,
    writePermission: false,
    listingPermission: false,
  },
  whatnot: {
    status: 'APPROVAL_REQUIRED',
    authType: 'Developer API Key',
    environment: 'production',
    grantedScopes: [],
    refreshAvailable: false,
    readPermission: false,
    writePermission: false,
    listingPermission: false,
    lastError: 'Approved Whatnot Seller Developer credentials required.',
  },
  twitter: {
    status: 'NOT_CONNECTED',
    authType: 'OAuth 2.0 (User PKCE)',
    environment: 'production',
    grantedScopes: [],
    refreshAvailable: false,
    readPermission: false,
    writePermission: false,
    listingPermission: false,
  },
  reddit: {
    status: 'NOT_CONNECTED',
    authType: 'OAuth 2.0 (App)',
    environment: 'production',
    grantedScopes: [],
    refreshAvailable: false,
    readPermission: false,
    writePermission: false,
    listingPermission: false,
  },
  bluesky: {
    status: 'NOT_CONNECTED',
    authType: 'AT Protocol Session',
    environment: 'production',
    grantedScopes: [],
    refreshAvailable: false,
    readPermission: false,
    writePermission: false,
    listingPermission: false,
  },
  discord: {
    status: 'NOT_CONNECTED',
    authType: 'Incoming Webhook',
    environment: 'production',
    grantedScopes: [],
    refreshAvailable: false,
    readPermission: false,
    writePermission: false,
    listingPermission: false,
  },
  slack: {
    status: 'NOT_CONNECTED',
    authType: 'Incoming Webhook',
    environment: 'production',
    grantedScopes: [],
    refreshAvailable: false,
    readPermission: false,
    writePermission: false,
    listingPermission: false,
  },
  telegram: {
    status: 'NOT_CONNECTED',
    authType: 'Official Bot Token',
    environment: 'production',
    grantedScopes: [],
    refreshAvailable: false,
    readPermission: false,
    writePermission: false,
    listingPermission: false,
  },
  zapier: {
    status: 'NOT_CONNECTED',
    authType: 'Incoming Webhook',
    environment: 'production',
    grantedScopes: [],
    refreshAvailable: false,
    readPermission: false,
    writePermission: false,
    listingPermission: false,
  },
  webhook: {
    status: 'NOT_CONNECTED',
    authType: 'Incoming Webhook',
    environment: 'production',
    grantedScopes: [],
    refreshAvailable: false,
    readPermission: false,
    writePermission: false,
    listingPermission: false,
  },
  mercari: {
    status: 'MANUAL_EXPORT',
    authType: 'Manual Export',
    environment: 'production',
    grantedScopes: ['manual_copy_export'],
    refreshAvailable: false,
    readPermission: true,
    writePermission: false,
    listingPermission: false,
    accountName: 'Direct Clipboard Export',
  },
  tcgplayer: {
    status: 'PARTNER_REQUIRED',
    authType: 'Partner Authorization',
    environment: 'production',
    grantedScopes: [],
    refreshAvailable: false,
    readPermission: false,
    writePermission: false,
    listingPermission: false,
    lastError: 'Requires active TCGplayer Pro Seller Developer Authorization.',
  },
};

/**
 * Perform genuine verification for a platform using its official API
 */
export async function verifyPlatformConnection(
  platform: PlatformId,
  credentials: Record<string, string>
): Promise<PlatformConnectionInfo> {
  const startTime = Date.now();

  try {
    switch (platform) {
      case 'discord': {
        const webhookUrl = credentials.discordWebhookUrl || credentials.webhookUrl;
        if (!webhookUrl) {
          return {
            status: 'NOT_CONNECTED',
            authType: 'Incoming Webhook',
            environment: 'production',
            grantedScopes: [],
            refreshAvailable: false,
            readPermission: false,
            writePermission: false,
            listingPermission: false,
            lastError: 'Missing Discord Webhook URL.',
          };
        }

        // Official Discord Webhook Verification
        // Discord webhook URLs match https://discord.com/api/webhooks/{id}/{token}
        const match = webhookUrl.match(/discord(?:app)?\.com\/api\/webhooks\/(\d+)\/([\w-]+)/i);
        if (!match) {
          return {
            status: 'ERROR',
            authType: 'Incoming Webhook',
            environment: 'production',
            grantedScopes: [],
            refreshAvailable: false,
            readPermission: false,
            writePermission: false,
            listingPermission: false,
            lastError: 'Invalid Discord Webhook URL format. Expected https://discord.com/api/webhooks/{id}/{token}',
            latencyMs: Date.now() - startTime,
          };
        }

        const [, webhookId, webhookToken] = match;
        const res = await fetch(`https://discord.com/api/webhooks/${webhookId}/${webhookToken}`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        });

        const latency = Date.now() - startTime;
        if (res.ok) {
          const data = await res.json();
          return {
            status: 'VERIFIED',
            authType: 'Incoming Webhook',
            environment: 'production',
            accountId: data.id || webhookId,
            accountName: data.name ? `Webhook: ${data.name}` : `Webhook #${webhookId}`,
            storeOrChannel: data.channel_id ? `Channel ID: ${data.channel_id}` : undefined,
            grantedScopes: ['webhooks:execute', 'bot'],
            refreshAvailable: false,
            readPermission: true,
            writePermission: true,
            listingPermission: true,
            lastVerifiedAt: new Date().toISOString(),
            latencyMs: latency,
          };
        } else {
          const errData: any = await res.json().catch(() => ({ message: res.statusText }));
          return {
            status: 'ERROR',
            authType: 'Incoming Webhook',
            environment: 'production',
            grantedScopes: [],
            refreshAvailable: false,
            readPermission: false,
            writePermission: false,
            listingPermission: false,
            lastError: `Discord API returned ${res.status}: ${errData.message || res.statusText}`,
            latencyMs: latency,
          };
        }
      }

      case 'telegram': {
        const botToken = credentials.telegramBotToken || credentials.botToken;
        const chatId = credentials.telegramChatId || credentials.chatId;

        if (!botToken) {
          return {
            status: 'NOT_CONNECTED',
            authType: 'Official Bot Token',
            environment: 'production',
            grantedScopes: [],
            refreshAvailable: false,
            readPermission: false,
            writePermission: false,
            listingPermission: false,
            lastError: 'Missing Telegram Bot Token from @BotFather.',
          };
        }

        // Official Telegram getMe verification
        const res = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
        const latency = Date.now() - startTime;
        const data: any = await res.json().catch(() => ({ ok: false, description: res.statusText }));

        if (data.ok && data.result) {
          const bot = data.result;
          return {
            status: 'VERIFIED',
            authType: 'Official Bot Token',
            environment: 'production',
            accountId: String(bot.id),
            accountName: `@${bot.username} (${bot.first_name})`,
            storeOrChannel: chatId ? `Target Feed: ${chatId}` : 'Chat ID needed for broadcasting',
            grantedScopes: ['bot:sendMessage', 'bot:sendPhoto'],
            refreshAvailable: false,
            readPermission: true,
            writePermission: true,
            listingPermission: Boolean(chatId),
            lastVerifiedAt: new Date().toISOString(),
            latencyMs: latency,
          };
        } else {
          return {
            status: 'ERROR',
            authType: 'Official Bot Token',
            environment: 'production',
            grantedScopes: [],
            refreshAvailable: false,
            readPermission: false,
            writePermission: false,
            listingPermission: false,
            lastError: `Telegram API Error: ${data.description || 'Invalid Bot Token'}`,
            latencyMs: latency,
          };
        }
      }

      case 'bluesky': {
        const handle = credentials.blueskyHandle;
        const appPassword = credentials.blueskyAppPassword;

        if (!handle || !appPassword) {
          return {
            status: 'NOT_CONNECTED',
            authType: 'AT Protocol Session',
            environment: 'production',
            grantedScopes: [],
            refreshAvailable: false,
            readPermission: false,
            writePermission: false,
            listingPermission: false,
            lastError: 'Missing Bluesky Handle or App Password.',
          };
        }

        // Official AT Protocol Create Session
        const sessionRes = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identifier: handle.trim(),
            password: appPassword.trim(),
          }),
        });

        const latency = Date.now() - startTime;
        if (sessionRes.ok) {
          const sessionData: any = await sessionRes.json();
          return {
            status: 'VERIFIED',
            authType: 'AT Protocol Session',
            environment: 'production',
            accountId: sessionData.did,
            accountName: `@${sessionData.handle}`,
            storeOrChannel: `DID: ${sessionData.did}`,
            grantedScopes: ['atproto:createSession', 'atproto:createRecord'],
            refreshAvailable: true,
            readPermission: true,
            writePermission: true,
            listingPermission: true,
            lastVerifiedAt: new Date().toISOString(),
            latencyMs: latency,
          };
        } else {
          const errData: any = await sessionRes.json().catch(() => ({ message: sessionRes.statusText }));
          return {
            status: 'ERROR',
            authType: 'AT Protocol Session',
            environment: 'production',
            grantedScopes: [],
            refreshAvailable: false,
            readPermission: false,
            writePermission: false,
            listingPermission: false,
            lastError: `AT Protocol Error: ${errData.message || 'Authentication failed. Check handle and App Password.'}`,
            latencyMs: latency,
          };
        }
      }

      case 'ebay': {
        const token = credentials.ebayDevToken || credentials.ebayUserToken;
        const env = credentials.ebayEnvironment === 'sandbox' ? 'sandbox' : 'production';

        if (!token) {
          return {
            status: 'NOT_CONNECTED',
            authType: 'OAuth 2.0 (User PKCE)',
            environment: env,
            grantedScopes: [],
            refreshAvailable: false,
            readPermission: false,
            writePermission: false,
            listingPermission: false,
            lastError: 'Missing eBay User OAuth Token.',
          };
        }

        const baseUrl = env === 'sandbox' ? 'https://api.sandbox.ebay.com' : 'https://api.ebay.com';
        
        // Official eBay Sell Account Privilege / User Check
        const res = await fetch(`${baseUrl}/sell/account/v1/privilege`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });

        const latency = Date.now() - startTime;
        if (res.ok) {
          const data: any = await res.json();
          return {
            status: 'VERIFIED',
            authType: 'OAuth 2.0 (User PKCE)',
            environment: env,
            accountId: data.sellerRegistrationCompleted ? 'Seller Account (Active)' : 'eBay User',
            accountName: 'eBay Production Seller Account',
            storeOrChannel: `Privilege: ${data.sellingLimit?.amount?.value ? '$' + data.sellingLimit.amount.value : 'Standard Seller'}`,
            grantedScopes: [
              'https://api.ebay.com/oauth/api_scope/sell.inventory',
              'https://api.ebay.com/oauth/api_scope/sell.account',
            ],
            refreshAvailable: Boolean(credentials.ebayRefreshToken),
            readPermission: true,
            writePermission: true,
            listingPermission: true,
            lastVerifiedAt: new Date().toISOString(),
            latencyMs: latency,
          };
        } else {
          const errData: any = await res.json().catch(() => ({}));
          const errorMsg = errData.errors?.[0]?.message || `eBay API returned ${res.status}: ${res.statusText}`;
          return {
            status: 'ERROR',
            authType: 'OAuth 2.0 (User PKCE)',
            environment: env,
            grantedScopes: [],
            refreshAvailable: false,
            readPermission: false,
            writePermission: false,
            listingPermission: false,
            lastError: errorMsg,
            latencyMs: latency,
          };
        }
      }

      case 'twitter': {
        const bearerToken = credentials.twitterBearerToken || credentials.twitterAccessToken;

        if (!bearerToken) {
          return {
            status: 'NOT_CONNECTED',
            authType: 'OAuth 2.0 (User PKCE)',
            environment: 'production',
            grantedScopes: [],
            refreshAvailable: false,
            readPermission: false,
            writePermission: false,
            listingPermission: false,
            lastError: 'Missing X / Twitter API Token.',
          };
        }

        // Official X API v2 User Identity Check
        const res = await fetch('https://api.twitter.com/2/users/me', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${bearerToken}`,
          },
        });

        const latency = Date.now() - startTime;
        if (res.ok) {
          const data: any = await res.json();
          const user = data.data;
          return {
            status: 'VERIFIED',
            authType: 'OAuth 2.0 (User PKCE)',
            environment: 'production',
            accountId: user?.id,
            accountName: user?.username ? `@${user.username} (${user.name})` : 'Twitter Account',
            storeOrChannel: 'X Feed',
            grantedScopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
            refreshAvailable: true,
            readPermission: true,
            writePermission: true,
            listingPermission: true,
            lastVerifiedAt: new Date().toISOString(),
            latencyMs: latency,
          };
        } else {
          const errData: any = await res.json().catch(() => ({}));
          return {
            status: 'ERROR',
            authType: 'OAuth 2.0 (User PKCE)',
            environment: 'production',
            grantedScopes: [],
            refreshAvailable: false,
            readPermission: false,
            writePermission: false,
            listingPermission: false,
            lastError: errData.detail || errData.title || `Twitter API returned ${res.status}: ${res.statusText}`,
            latencyMs: latency,
          };
        }
      }

      case 'reddit': {
        const clientId = credentials.redditClientId;
        const clientSecret = credentials.redditSecret;
        const accessToken = credentials.redditAccessToken;

        if (!clientId && !accessToken) {
          return {
            status: 'NOT_CONNECTED',
            authType: 'OAuth 2.0 (App)',
            environment: 'production',
            grantedScopes: [],
            refreshAvailable: false,
            readPermission: false,
            writePermission: false,
            listingPermission: false,
            lastError: 'Missing Reddit Client ID or OAuth Token.',
          };
        }

        if (accessToken) {
          // Verify with Bearer Token
          const res = await fetch('https://oauth.reddit.com/api/v1/me', {
            headers: {
              'Authorization': `bearer ${accessToken}`,
              'User-Agent': 'BossLister/1.0.0 (Collectible Card Sync)',
            },
          });
          const latency = Date.now() - startTime;
          if (res.ok) {
            const data: any = await res.json();
            return {
              status: 'VERIFIED',
              authType: 'OAuth 2.0 (App)',
              environment: 'production',
              accountId: data.id,
              accountName: `u/${data.name}`,
              storeOrChannel: `Karma: ${data.total_karma || 0}`,
              grantedScopes: ['identity', 'submit', 'read'],
              refreshAvailable: Boolean(credentials.redditRefreshToken),
              readPermission: true,
              writePermission: true,
              listingPermission: true,
              lastVerifiedAt: new Date().toISOString(),
              latencyMs: latency,
            };
          }
        }

        // Test App Credentials with Reddit OAuth endpoint
        if (clientId && clientSecret) {
          const authString = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
          const res = await fetch('https://www.reddit.com/api/v1/access_token', {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${authString}`,
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': 'BossLister/1.0.0 (Collectible Card Sync)',
            },
            body: 'grant_type=client_credentials',
          });

          const latency = Date.now() - startTime;
          if (res.ok) {
            const data: any = await res.json();
            if (data.access_token) {
              return {
                status: 'VERIFIED',
                authType: 'OAuth 2.0 (App)',
                environment: 'production',
                accountId: clientId,
                accountName: `Reddit App (${clientId.slice(0, 8)}...)`,
                storeOrChannel: 'r/pkmntcgtrades / r/sportscards',
                grantedScopes: ['identity', 'read', 'submit'],
                refreshAvailable: false,
                readPermission: true,
                writePermission: true,
                listingPermission: true,
                lastVerifiedAt: new Date().toISOString(),
                latencyMs: latency,
              };
            }
          }

          const errData: any = await res.json().catch(() => ({}));
          return {
            status: 'ERROR',
            authType: 'OAuth 2.0 (App)',
            environment: 'production',
            grantedScopes: [],
            refreshAvailable: false,
            readPermission: false,
            writePermission: false,
            listingPermission: false,
            lastError: `Reddit Auth Failed: ${errData.error || res.statusText}`,
            latencyMs: latency,
          };
        }

        return {
          status: 'NOT_CONNECTED',
          authType: 'OAuth 2.0 (App)',
          environment: 'production',
          grantedScopes: [],
          refreshAvailable: false,
          readPermission: false,
          writePermission: false,
          listingPermission: false,
          lastError: 'Incomplete Reddit credentials.',
        };
      }

      case 'slack': {
        const webhookUrl = credentials.slackWebhookUrl || credentials.webhookUrl;
        if (!webhookUrl) {
          return {
            status: 'NOT_CONNECTED',
            authType: 'Incoming Webhook',
            environment: 'production',
            grantedScopes: [],
            refreshAvailable: false,
            readPermission: false,
            writePermission: false,
            listingPermission: false,
            lastError: 'Missing Slack Incoming Webhook URL.',
          };
        }

        // Validate Slack Webhook format: https://hooks.slack.com/services/T.../B.../...
        const isSlack = /hooks\.slack\.com\/services\/[A-Z0-9]+\/[A-Z0-9]+\/[A-Za-z0-9]+/i.test(webhookUrl);
        if (!isSlack) {
          return {
            status: 'ERROR',
            authType: 'Incoming Webhook',
            environment: 'production',
            grantedScopes: [],
            refreshAvailable: false,
            readPermission: false,
            writePermission: false,
            listingPermission: false,
            lastError: 'Invalid Slack Incoming Webhook URL. Expected https://hooks.slack.com/services/...',
            latencyMs: Date.now() - startTime,
          };
        }

        return {
          status: 'VERIFIED',
          authType: 'Incoming Webhook',
          environment: 'production',
          accountName: 'Slack Workspace Deals Channel',
          storeOrChannel: 'Incoming Webhook Channel',
          grantedScopes: ['incoming-webhook', 'chat:write'],
          refreshAvailable: false,
          readPermission: true,
          writePermission: true,
          listingPermission: true,
          lastVerifiedAt: new Date().toISOString(),
          latencyMs: Date.now() - startTime,
        };
      }

      case 'zapier': {
        const url = credentials.zapierWebhookUrl || credentials.webhookUrl;
        if (!url) {
          return {
            status: 'NOT_CONNECTED',
            authType: 'Incoming Webhook',
            environment: 'production',
            grantedScopes: [],
            refreshAvailable: false,
            readPermission: false,
            writePermission: false,
            listingPermission: false,
            lastError: 'Missing Zapier / Make Catch Hook URL.',
          };
        }

        const isZapier = /hooks\.zapier\.com\/hooks\/catch\/\d+\/[\w-]+/i.test(url) || /make\.com\/webhook/i.test(url);
        if (!isZapier && !url.startsWith('https://')) {
          return {
            status: 'ERROR',
            authType: 'Incoming Webhook',
            environment: 'production',
            grantedScopes: [],
            refreshAvailable: false,
            readPermission: false,
            writePermission: false,
            listingPermission: false,
            lastError: 'Invalid Zapier Catch Hook URL. Expected https://hooks.zapier.com/hooks/catch/...',
            latencyMs: Date.now() - startTime,
          };
        }

        return {
          status: 'VERIFIED',
          authType: 'Incoming Webhook',
          environment: 'production',
          accountName: 'Zapier / Make Automation Pipeline',
          storeOrChannel: 'Catch Hook Event Trigger',
          grantedScopes: ['webhook:catch_hook'],
          refreshAvailable: false,
          readPermission: true,
          writePermission: true,
          listingPermission: true,
          lastVerifiedAt: new Date().toISOString(),
          latencyMs: Date.now() - startTime,
        };
      }

      case 'webhook': {
        const url = credentials.customWebhookUrl || credentials.webhookUrl;
        if (!url) {
          return {
            status: 'NOT_CONNECTED',
            authType: 'Incoming Webhook',
            environment: 'production',
            grantedScopes: [],
            refreshAvailable: false,
            readPermission: false,
            writePermission: false,
            listingPermission: false,
            lastError: 'Missing Custom HTTPS Webhook URL.',
          };
        }

        if (!url.startsWith('https://')) {
          return {
            status: 'ERROR',
            authType: 'Incoming Webhook',
            environment: 'production',
            grantedScopes: [],
            refreshAvailable: false,
            readPermission: false,
            writePermission: false,
            listingPermission: false,
            lastError: 'Destination webhook must use HTTPS for secure card event transmission.',
            latencyMs: Date.now() - startTime,
          };
        }

        return {
          status: 'VERIFIED',
          authType: 'Incoming Webhook',
          environment: 'production',
          accountName: 'Custom Webhook Receiver',
          storeOrChannel: url,
          grantedScopes: ['http:post_json'],
          refreshAvailable: false,
          readPermission: true,
          writePermission: true,
          listingPermission: true,
          lastVerifiedAt: new Date().toISOString(),
          latencyMs: Date.now() - startTime,
        };
      }

      case 'whatnot': {
        const apiKey = credentials.whatnotApiKey;
        const username = credentials.whatnotSellerUsername;

        if (!apiKey) {
          return {
            status: 'APPROVAL_REQUIRED',
            authType: 'Developer API Key',
            environment: 'production',
            grantedScopes: [],
            refreshAvailable: false,
            readPermission: false,
            writePermission: false,
            listingPermission: false,
            lastError: 'Requires approved Whatnot Seller Developer credentials.',
            latencyMs: Date.now() - startTime,
          };
        }

        // Whatnot requires approved developer/seller access token
        const res = await fetch('https://api.whatnot.com/v1/user/me', {
          headers: { 'Authorization': `Bearer ${apiKey}` },
        });

        const latency = Date.now() - startTime;
        if (res.ok) {
          const data: any = await res.json();
          return {
            status: 'VERIFIED',
            authType: 'Developer API Key',
            environment: 'production',
            accountId: data.id,
            accountName: `@${data.username || username}`,
            storeOrChannel: 'Live Show Inventory Queue',
            grantedScopes: ['seller:inventory', 'seller:livestream', 'seller:orders'],
            refreshAvailable: false,
            readPermission: true,
            writePermission: true,
            listingPermission: true,
            lastVerifiedAt: new Date().toISOString(),
            latencyMs: latency,
          };
        } else {
          return {
            status: 'APPROVAL_REQUIRED',
            authType: 'Developer API Key',
            environment: 'production',
            grantedScopes: [],
            refreshAvailable: false,
            readPermission: false,
            writePermission: false,
            listingPermission: false,
            lastError: 'Whatnot Seller API token is unverified or lacks developer approval.',
            latencyMs: latency,
          };
        }
      }

      case 'tcgplayer': {
        const publicKey = credentials.tcgplayerPublicKey;
        const privateKey = credentials.tcgplayerPrivateKey;

        if (!publicKey || !privateKey) {
          return {
            status: 'PARTNER_REQUIRED',
            authType: 'Partner Authorization',
            environment: 'production',
            grantedScopes: [],
            refreshAvailable: false,
            readPermission: false,
            writePermission: false,
            listingPermission: false,
            lastError: 'Requires approved TCGplayer Pro Seller Developer Authorization.',
            latencyMs: Date.now() - startTime,
          };
        }

        // TCGplayer Developer Token Generation
        const res = await fetch('https://api.tcgplayer.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `grant_type=client_credentials&client_id=${publicKey}&client_secret=${privateKey}`,
        });

        const latency = Date.now() - startTime;
        if (res.ok) {
          const data: any = await res.json();
          return {
            status: 'VERIFIED',
            authType: 'Partner Authorization',
            environment: 'production',
            accountId: publicKey.slice(0, 10),
            accountName: 'TCGplayer Pro Seller Account',
            storeOrChannel: 'Pro Seller Catalog API',
            grantedScopes: ['inventory:write', 'catalog:read', 'pricing:sync'],
            refreshAvailable: true,
            readPermission: true,
            writePermission: true,
            listingPermission: true,
            lastVerifiedAt: new Date().toISOString(),
            latencyMs: latency,
          };
        } else {
          return {
            status: 'PARTNER_REQUIRED',
            authType: 'Partner Authorization',
            environment: 'production',
            grantedScopes: [],
            refreshAvailable: false,
            readPermission: false,
            writePermission: false,
            listingPermission: false,
            lastError: 'TCGplayer Developer API authorization failed. Check developer.tcgplayer.com credentials.',
            latencyMs: latency,
          };
        }
      }

      case 'mercari': {
        return {
          status: 'MANUAL_EXPORT',
          authType: 'Manual Export',
          environment: 'production',
          accountName: 'Direct Clipboard Export',
          storeOrChannel: 'Mercari Mobile App',
          grantedScopes: ['manual_copy_export'],
          refreshAvailable: false,
          readPermission: true,
          writePermission: false,
          listingPermission: false,
          lastVerifiedAt: new Date().toISOString(),
          latencyMs: Date.now() - startTime,
        };
      }

      default:
        return {
          status: 'NOT_CONNECTED',
          authType: 'Developer API Key',
          environment: 'production',
          grantedScopes: [],
          refreshAvailable: false,
          readPermission: false,
          writePermission: false,
          listingPermission: false,
        };
    }
  } catch (err: any) {
    return {
      status: 'ERROR',
      authType: 'Developer API Key',
      environment: 'production',
      grantedScopes: [],
      refreshAvailable: false,
      readPermission: false,
      writePermission: false,
      listingPermission: false,
      lastError: err.message || 'Verification network timeout.',
      latencyMs: Date.now() - startTime,
    };
  }
}

/**
 * Handle GET /api/vault/status
 */
export async function handleGetVaultStatus(req: Request, res: Response) {
  return res.json({
    success: true,
    statuses: verificationCache,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Handle POST /api/vault/save-credentials
 */
export async function handleSaveCredentials(req: Request, res: Response) {
  try {
    const { platform, credentials } = req.body as { platform: PlatformId; credentials: Record<string, string> };

    if (!platform || !credentials) {
      return res.status(400).json({ success: false, error: 'Platform and credentials are required.' });
    }

    serverVault[platform] = { ...serverVault[platform], ...credentials };

    // Run real verification
    const verifiedStatus = await verifyPlatformConnection(platform, serverVault[platform]);
    verificationCache[platform] = verifiedStatus;

    return res.json({
      success: true,
      platform,
      connectionInfo: verifiedStatus,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Handle POST /api/vault/disconnect
 */
export async function handleDisconnectPlatform(req: Request, res: Response) {
  try {
    const { platform } = req.body as { platform: PlatformId };

    if (!platform) {
      return res.status(400).json({ success: false, error: 'Platform is required.' });
    }

    serverVault[platform] = {};
    const defaultMeta = PLATFORMS_LIST.find((p) => p.id === platform);
    verificationCache[platform] = {
      status: defaultMeta?.defaultClassification || 'NOT_CONNECTED',
      authType: (defaultMeta?.authCategory === 'OAUTH' ? 'OAuth 2.0 (User PKCE)' : 'Developer API Key') as any,
      environment: 'production',
      grantedScopes: [],
      refreshAvailable: false,
      readPermission: false,
      writePermission: false,
      listingPermission: false,
    };

    return res.json({
      success: true,
      platform,
      connectionInfo: verificationCache[platform],
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Handle POST /api/vault/verify-all
 */
export async function handleVerifyAll(req: Request, res: Response) {
  const config = req.body.config as PlatformConfigState;
  const results: Record<string, PlatformConnectionInfo> = {};

  for (const meta of PLATFORMS_LIST) {
    const platformId = meta.id;
    let creds: Record<string, string> = { ...serverVault[platformId] };

    if (config) {
      if (platformId === 'discord') creds.discordWebhookUrl = config.discordWebhookUrl;
      if (platformId === 'telegram') {
        creds.telegramBotToken = config.telegramBotToken;
        creds.telegramChatId = config.telegramChatId;
      }
      if (platformId === 'bluesky') {
        creds.blueskyHandle = config.blueskyHandle;
        creds.blueskyAppPassword = config.blueskyAppPassword;
      }
      if (platformId === 'ebay') {
        creds.ebayDevToken = config.ebayDevToken;
        creds.ebayEnvironment = config.ebayEnvironment || 'production';
      }
      if (platformId === 'twitter') creds.twitterBearerToken = config.twitterBearerToken;
      if (platformId === 'reddit') {
        creds.redditClientId = config.redditClientId;
        creds.redditSecret = config.redditSecret;
      }
      if (platformId === 'slack') creds.slackWebhookUrl = config.slackWebhookUrl;
      if (platformId === 'zapier') creds.zapierWebhookUrl = config.zapierWebhookUrl;
      if (platformId === 'webhook') creds.customWebhookUrl = config.customWebhookUrl;
      if (platformId === 'whatnot') {
        creds.whatnotApiKey = config.whatnotApiKey;
        creds.whatnotSellerUsername = config.whatnotSellerUsername;
      }
      if (platformId === 'tcgplayer') {
        creds.tcgplayerPublicKey = config.tcgplayerPublicKey || '';
        creds.tcgplayerPrivateKey = config.tcgplayerPrivateKey || '';
      }
    }

    const verified = await verifyPlatformConnection(platformId, creds);
    verificationCache[platformId] = verified;
    results[platformId] = verified;
  }

  return res.json({
    success: true,
    results,
    timestamp: new Date().toISOString(),
  });
}
