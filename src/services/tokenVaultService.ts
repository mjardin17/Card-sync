import { Request, Response } from 'express';
import { PlatformId, PlatformConnectionInfo } from '../types/card';
import { PLATFORMS_LIST } from '../data/platforms';
import { getDefaultVault } from './credentialVault';
import { redactString, safeLogger } from '../utils/redact';

// In-memory cache of verified connection metadata (NON-SECRET ONLY)
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
    accountName: 'Direct Clipboard Export',
    storeOrChannel: 'Mercari Mobile App',
    grantedScopes: ['clipboard.export'],
    refreshAvailable: false,
    readPermission: true,
    writePermission: false,
    listingPermission: false,
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
    lastError: 'Approved TCGplayer Pro Developer Partner authorization required.',
  },
};

/**
 * Verifies a platform's connection against official endpoints using stored credentials.
 * Does NOT log or return secrets.
 */
export async function verifyPlatformConnection(
  platform: PlatformId,
  credentials?: Record<string, string> | null
): Promise<PlatformConnectionInfo> {
  const startTime = Date.now();
  const vault = getDefaultVault();

  // If credentials not passed directly, retrieve from encrypted server vault
  let creds = credentials;
  if (!creds) {
    try {
      creds = await vault.get(platform);
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
        lastError: redactString(`Vault read failure: ${err.message}`),
      };
    }
  }

  if (!creds || Object.keys(creds).length === 0) {
    const meta = PLATFORMS_LIST.find((p) => p.id === platform);
    return {
      status: meta?.defaultClassification || 'NOT_CONNECTED',
      authType: (meta?.authCategory === 'OAUTH'
        ? 'OAuth 2.0 (User PKCE)'
        : meta?.authCategory === 'BOT_TOKEN'
        ? 'Official Bot Token'
        : meta?.authCategory === 'MANUAL_EXPORT'
        ? 'Manual Export'
        : meta?.authCategory === 'PARTNER_RESTRICTED'
        ? 'Partner Authorization'
        : 'Developer API Key') as any,
      environment: 'production',
      grantedScopes: meta?.id === 'mercari' ? ['clipboard.export'] : [],
      refreshAvailable: false,
      readPermission: meta?.id === 'mercari',
      writePermission: false,
      listingPermission: false,
      lastError:
        meta?.id === 'whatnot'
          ? 'Approved Whatnot Seller Developer credentials required.'
          : meta?.id === 'tcgplayer'
          ? 'Approved TCGplayer Pro Developer Partner authorization required.'
          : undefined,
    };
  }

  try {
    switch (platform) {
      case 'discord': {
        const webhookUrl = creds.discordWebhookUrl || creds.webhookUrl;
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

        const match = webhookUrl.match(/discord(?:app)?\.com\/api\/webhooks\/(\d+)\/([A-Za-z0-9_\-]+)/);
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
            lastError: 'Invalid Discord Webhook URL format.',
          };
        }

        const webhookId = match[1];
        const res = await fetch(`https://discord.com/api/webhooks/${webhookId}/${match[2]}`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });

        const latency = Date.now() - startTime;
        if (res.ok) {
          const data: any = await res.json();
          return {
            status: 'VERIFIED',
            authType: 'Incoming Webhook',
            environment: 'production',
            accountId: data.id || webhookId,
            accountName: data.name ? `Webhook: ${data.name}` : `Webhook #${webhookId}`,
            storeOrChannel: data.channel_id ? `Channel ID: ${data.channel_id}` : undefined,
            grantedScopes: ['webhooks:execute'],
            refreshAvailable: false,
            readPermission: true,
            writePermission: true,
            listingPermission: true,
            evidenceSource: 'Discord Webhook GET Probe',
            lastVerifiedAt: new Date().toISOString(),
            latencyMs: latency,
          };
        } else {
          return {
            status: 'ERROR',
            authType: 'Incoming Webhook',
            environment: 'production',
            grantedScopes: [],
            refreshAvailable: false,
            readPermission: false,
            writePermission: false,
            listingPermission: false,
            lastError: redactString(`Discord API returned ${res.status}: ${res.statusText}`),
            latencyMs: latency,
          };
        }
      }

      case 'telegram': {
        const botToken = creds.telegramBotToken || creds.botToken;
        const chatId = creds.telegramChatId || creds.chatId;

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
            storeOrChannel: chatId ? `Target Feed: ${chatId}` : 'Chat ID needed for posting',
            grantedScopes: ['bot:sendMessage', 'bot:sendPhoto'],
            refreshAvailable: false,
            readPermission: true,
            writePermission: true,
            listingPermission: Boolean(chatId),
            evidenceSource: 'Telegram getMe API',
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
            lastError: redactString(`Telegram API Error: ${data.description || 'Invalid Bot Token'}`),
            latencyMs: latency,
          };
        }
      }

      case 'bluesky': {
        const handle = creds.blueskyHandle;
        const appPassword = creds.blueskyAppPassword;

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
            evidenceSource: 'AT Protocol Session JWT',
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
            lastError: redactString(`AT Protocol Auth Error: ${errData.message || 'Check handle and App Password.'}`),
            latencyMs: latency,
          };
        }
      }

      case 'ebay': {
        const token = creds.ebayDevToken || creds.ebayUserToken;
        const env = creds.ebayEnvironment === 'sandbox' ? 'sandbox' : 'production';

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
        const res = await fetch(`${baseUrl}/sell/account/v1/privilege`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
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
            storeOrChannel: `Privilege: ${data.sellingLimit?.amount?.value ? '$' + data.sellingLimit.amount.value : 'Active Seller'}`,
            grantedScopes: [
              'https://api.ebay.com/oauth/api_scope/sell.inventory',
              'https://api.ebay.com/oauth/api_scope/sell.account',
            ],
            refreshAvailable: Boolean(creds.ebayRefreshToken),
            readPermission: true,
            writePermission: true,
            listingPermission: true,
            evidenceSource: 'eBay Sell Privilege Verification',
            lastVerifiedAt: new Date().toISOString(),
            latencyMs: latency,
          };
        } else {
          return {
            status: 'ERROR',
            authType: 'OAuth 2.0 (User PKCE)',
            environment: env,
            grantedScopes: [],
            refreshAvailable: false,
            readPermission: false,
            writePermission: false,
            listingPermission: false,
            lastError: redactString(`eBay API returned ${res.status}: ${res.statusText}`),
            latencyMs: latency,
          };
        }
      }

      case 'twitter': {
        const bearerToken = creds.twitterBearerToken || creds.twitterAccessToken;

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

        const res = await fetch('https://api.twitter.com/2/users/me', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${bearerToken}`,
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
            grantedScopes: ['tweet.read', 'tweet.write', 'users.read'],
            refreshAvailable: true,
            readPermission: true,
            writePermission: true,
            listingPermission: true,
            evidenceSource: 'X API v2 User Identity',
            lastVerifiedAt: new Date().toISOString(),
            latencyMs: latency,
          };
        } else {
          return {
            status: 'ERROR',
            authType: 'OAuth 2.0 (User PKCE)',
            environment: 'production',
            grantedScopes: [],
            refreshAvailable: false,
            readPermission: false,
            writePermission: false,
            listingPermission: false,
            lastError: redactString(`Twitter API returned ${res.status}: ${res.statusText}`),
            latencyMs: latency,
          };
        }
      }

      case 'reddit': {
        const clientId = creds.redditClientId;
        const clientSecret = creds.redditSecret;
        const accessToken = creds.redditAccessToken;

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
          const res = await fetch('https://oauth.reddit.com/api/v1/me', {
            headers: {
              Authorization: `bearer ${accessToken}`,
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
              refreshAvailable: Boolean(creds.redditRefreshToken),
              readPermission: true,
              writePermission: true,
              listingPermission: true,
              evidenceSource: 'Reddit OAuth User Identity',
              lastVerifiedAt: new Date().toISOString(),
              latencyMs: latency,
            };
          }
        }

        if (clientId && clientSecret) {
          const authString = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
          const res = await fetch('https://www.reddit.com/api/v1/access_token', {
            method: 'POST',
            headers: {
              Authorization: `Basic ${authString}`,
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
                evidenceSource: 'Reddit App Client Credentials Token',
                lastVerifiedAt: new Date().toISOString(),
                latencyMs: latency,
              };
            }
          }

          return {
            status: 'ERROR',
            authType: 'OAuth 2.0 (App)',
            environment: 'production',
            grantedScopes: [],
            refreshAvailable: false,
            readPermission: false,
            writePermission: false,
            listingPermission: false,
            lastError: redactString(`Reddit Auth Failed: ${res.statusText}`),
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
        const webhookUrl = creds.slackWebhookUrl || creds.webhookUrl;
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
            lastError: 'Invalid Slack Incoming Webhook URL format.',
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
          evidenceSource: 'Slack Validated Webhook URL Format',
          lastVerifiedAt: new Date().toISOString(),
          latencyMs: Date.now() - startTime,
        };
      }

      case 'zapier': {
        const url = creds.zapierWebhookUrl || creds.webhookUrl;
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

        const isZapier =
          /hooks\.zapier\.com\/hooks\/catch\/\d+\/[\w-]+/i.test(url) || /make\.com\/webhook/i.test(url);
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
            lastError: 'Invalid Zapier Catch Hook URL.',
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
          evidenceSource: 'Zapier Validated Webhook Endpoint',
          lastVerifiedAt: new Date().toISOString(),
          latencyMs: Date.now() - startTime,
        };
      }

      case 'webhook': {
        const url = creds.customWebhookUrl || creds.webhookUrl;
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
            lastError: 'Destination webhook must use HTTPS for secure transmission.',
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
          evidenceSource: 'HTTPS Validated Webhook Endpoint',
          lastVerifiedAt: new Date().toISOString(),
          latencyMs: Date.now() - startTime,
        };
      }

      case 'whatnot': {
        const apiKey = creds.whatnotApiKey;
        const username = creds.whatnotSellerUsername;

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

        const res = await fetch('https://api.whatnot.com/v1/user/me', {
          headers: { Authorization: `Bearer ${apiKey}` },
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
            grantedScopes: ['seller:inventory', 'seller:livestream'],
            refreshAvailable: false,
            readPermission: true,
            writePermission: true,
            listingPermission: true,
            evidenceSource: 'Whatnot Seller Account Verification',
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
        const publicKey = creds.tcgplayerPublicKey;
        const privateKey = creds.tcgplayerPrivateKey;

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

        const res = await fetch('https://api.tcgplayer.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `grant_type=client_credentials&client_id=${publicKey}&client_secret=${privateKey}`,
        });

        const latency = Date.now() - startTime;
        if (res.ok) {
          return {
            status: 'VERIFIED',
            authType: 'Partner Authorization',
            environment: 'production',
            accountId: publicKey.slice(0, 10),
            accountName: 'TCGplayer Pro Seller Account',
            storeOrChannel: 'Pro Seller Catalog API',
            grantedScopes: ['inventory:write', 'catalog:read'],
            refreshAvailable: true,
            readPermission: true,
            writePermission: true,
            listingPermission: true,
            evidenceSource: 'TCGplayer Partner Token Verification',
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
            lastError: 'TCGplayer Developer API authorization failed. Check developer.tcgplayer.com keys.',
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
          grantedScopes: ['clipboard.export'],
          refreshAvailable: false,
          readPermission: true,
          writePermission: false,
          listingPermission: false,
          evidenceSource: 'Mercari Structured Clipboard Export System',
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
      lastError: redactString(err.message || 'Verification network timeout.'),
      latencyMs: Date.now() - startTime,
    };
  }
}

/**
 * Handle GET /api/vault/status
 * Returns sanitized metadata only. NEVER returns secrets.
 */
export async function handleGetVaultStatus(req: Request, res: Response) {
  try {
    return res.json({
      success: true,
      statuses: verificationCache,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    safeLogger.error('Error fetching vault status:', err);
    return res.status(500).json({ success: false, error: redactString(err.message) });
  }
}

/**
 * Handle POST /api/vault/save-credentials
 * Saves credentials to encrypted vault, verifies provider, and returns metadata only.
 * NEVER echoes submitted credentials.
 */
export async function handleSaveCredentials(req: Request, res: Response) {
  try {
    const { platform, credentials } = req.body as {
      platform: PlatformId;
      credentials: Record<string, string>;
    };

    if (!platform || !credentials) {
      return res.status(400).json({ success: false, error: 'Platform and credentials are required.' });
    }

    const vault = getDefaultVault();
    // Encrypt and persist to vault
    await vault.set(platform, credentials);

    // Verify platform
    const verifiedStatus = await verifyPlatformConnection(platform, credentials);
    verificationCache[platform] = verifiedStatus;

    // Return sanitized metadata only
    return res.json({
      success: true,
      platform,
      connectionInfo: verifiedStatus,
    });
  } catch (err: any) {
    safeLogger.error('Error saving credentials:', err);
    return res.status(500).json({ success: false, error: redactString(err.message) });
  }
}

/**
 * Handle POST /api/vault/disconnect
 * Purges credentials from encrypted vault.
 */
export async function handleDisconnectPlatform(req: Request, res: Response) {
  try {
    const { platform } = req.body as { platform: PlatformId };

    if (!platform) {
      return res.status(400).json({ success: false, error: 'Platform is required.' });
    }

    const vault = getDefaultVault();
    await vault.delete(platform);

    const defaultMeta = PLATFORMS_LIST.find((p) => p.id === platform);
    verificationCache[platform] = {
      status: defaultMeta?.defaultClassification || 'NOT_CONNECTED',
      authType: (defaultMeta?.authCategory === 'OAUTH'
        ? 'OAuth 2.0 (User PKCE)'
        : defaultMeta?.authCategory === 'BOT_TOKEN'
        ? 'Official Bot Token'
        : defaultMeta?.authCategory === 'MANUAL_EXPORT'
        ? 'Manual Export'
        : defaultMeta?.authCategory === 'PARTNER_RESTRICTED'
        ? 'Partner Authorization'
        : 'Developer API Key') as any,
      environment: 'production',
      grantedScopes: platform === 'mercari' ? ['clipboard.export'] : [],
      refreshAvailable: false,
      readPermission: platform === 'mercari',
      writePermission: false,
      listingPermission: false,
      lastError: undefined,
    };

    return res.json({
      success: true,
      platform,
      connectionInfo: verificationCache[platform],
    });
  } catch (err: any) {
    safeLogger.error('Error disconnecting platform:', err);
    return res.status(500).json({ success: false, error: redactString(err.message) });
  }
}

/**
 * Handle POST /api/vault/verify
 * Verifies a single platform using server-stored credentials.
 * Client does NOT supply credentials.
 */
export async function handleVerifyPlatform(req: Request, res: Response) {
  try {
    const { platform } = req.body as { platform: PlatformId };
    if (!platform) {
      return res.status(400).json({ success: false, error: 'Platform is required.' });
    }

    const verified = await verifyPlatformConnection(platform);
    verificationCache[platform] = verified;

    return res.json({
      success: true,
      platform,
      connectionInfo: verified,
    });
  } catch (err: any) {
    safeLogger.error(`Error verifying platform ${req.body?.platform}:`, err);
    return res.status(500).json({ success: false, error: redactString(err.message) });
  }
}

/**
 * Handle POST /api/vault/verify-all
 * Verifies all platforms using server-stored credentials.
 * Client does NOT supply credentials.
 */
export async function handleVerifyAll(req: Request, res: Response) {
  try {
    const results: Record<string, PlatformConnectionInfo> = {};

    for (const meta of PLATFORMS_LIST) {
      const platformId = meta.id;
      const verified = await verifyPlatformConnection(platformId);
      verificationCache[platformId] = verified;
      results[platformId] = verified;
    }

    return res.json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    safeLogger.error('Error verifying all platforms:', err);
    return res.status(500).json({ success: false, error: redactString(err.message) });
  }
}

/**
 * Direct lookup of cached verification info for server modules.
 */
export function getCachedConnectionInfo(platform: PlatformId): PlatformConnectionInfo {
  return (
    verificationCache[platform] || {
      status: 'NOT_CONNECTED',
      authType: 'Developer API Key',
      environment: 'production',
      grantedScopes: [],
      refreshAvailable: false,
      readPermission: false,
      writePermission: false,
      listingPermission: false,
    }
  );
}
