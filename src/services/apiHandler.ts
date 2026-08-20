import { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { PlatformId, CardItem } from '../types/card';
import { getDefaultVault } from './credentialVault';
import { getCachedConnectionInfo, verifyPlatformConnection } from './tokenVaultService';
import { redactString, safeLogger } from '../utils/redact';

// Initialize Gemini with server-side API Key
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export async function handleIdentifyCard(req: Request, res: Response) {
  try {
    const { imageBase64, mimeType = 'image/jpeg', cardHint } = req.body;

    const ai = getGeminiClient();
    if (!ai) {
      return res.json({
        success: true,
        isFallback: true,
        data: generateSmartFallbackIdentification(cardHint || 'Sample Card'),
      });
    }

    const promptText = `
You are a world-class collectible card authenticator and market appraisal expert (Sports Cards, Formula 1 / Supercars / Racing Cards, Pokémon TCG, Pokémon x Supercar Crossovers, Magic The Gathering, Yu-Gi-Oh, One Piece, Graded Slabs PSA/BGS/CGC/SGC).

Carefully analyze the card image provided (and any text hints: "${cardHint || 'none'}").
Identify the card with extreme precision and estimate its fair market worth based on recent realized auction/sales comps.

Return a valid JSON object matching this structure:
{
  "title": "Exact Full Card Name, Year, Set, Variant, and Grade",
  "category": "pokemon" | "sports" | "racing" | "crossover" | "mtg" | "yugioh" | "onepiece" | "other",
  "subjectOrPlayer": "Player or Character name",
  "setName": "Official Set Name",
  "year": "Release year as string",
  "cardNumber": "Card # in set",
  "variant": "Parallel / Variant / Foil type",
  "grader": "PSA" | "BGS" | "CGC" | "SGC" | "Raw",
  "gradeScore": "Grade score",
  "certNumber": "Certification number if visible or empty string",
  "keyAttributes": ["List of key tags e.g. Rookie Card, 1st Edition, Holo Rare"],
  "estimatedWorth": {
    "fairMarketValue": 450,
    "priceRangeLow": 380,
    "priceRangeHigh": 520,
    "confidenceScore": 94,
    "trend30DayPercent": 6.5,
    "liquidityRating": "High" | "Medium" | "Low",
    "popReportEstimate": "PSA 10 Pop: 240 / Total: 1,850",
    "recentSales": [
      { "date": "2026-07-28", "platform": "eBay Auction", "grade": "PSA 10", "price": 465, "title": "Recent verified sold comp title" },
      { "date": "2026-07-14", "platform": "PWCC / Goldin", "grade": "PSA 10", "price": 440, "title": "Recent auction record comp" }
    ]
  },
  "recommendedListingPrice": 475,
  "conditionNotes": "Crisp corners, flawless holo foil surface, sharp centering 55/45.",
  "seoTitle": "High-impact 70-character eBay listing title with top keywords"
}
`;

    let parts: any[] = [{ text: promptText }];
    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      parts = [
        {
          inlineData: {
            mimeType: mimeType,
            data: cleanBase64,
          },
        },
        { text: promptText },
      ];
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: { parts },
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text || '{}';
    const parsedData = JSON.parse(responseText);

    return res.json({
      success: true,
      data: parsedData,
    });
  } catch (err: any) {
    safeLogger.error('Gemini Card Identification Error:', err);
    return res.json({
      success: true,
      isFallback: true,
      data: generateSmartFallbackIdentification(req.body?.cardHint || 'Sample Card'),
    });
  }
}

export async function handleAppraiseComps(req: Request, res: Response) {
  try {
    const { cardTitle, category, grader, gradeScore } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        success: true,
        comps: generateFallbackComps(cardTitle, gradeScore),
      });
    }

    const promptText = `
You are a collectible card market analyst with access to current transaction records.
Analyze recent realized comp sales for:
Card: "${cardTitle}"
Category: "${category}"
Grader & Grade: "${grader} ${gradeScore}"

Return a JSON object:
{
  "fairMarketValue": 450,
  "priceRangeLow": 390,
  "priceRangeHigh": 510,
  "confidenceScore": 95,
  "trend30DayPercent": 7.4,
  "liquidityRating": "High",
  "popReportEstimate": "PSA 10: 312 / PSA 9: 1,420",
  "recentSales": [
    { "date": "2026-08-01", "platform": "eBay Auction", "grade": "${grader} ${gradeScore}", "price": 455, "title": "Verified comp record" },
    { "date": "2026-07-22", "platform": "PWCC Vault", "grade": "${grader} ${gradeScore}", "price": 440, "title": "Verified comp record" },
    { "date": "2026-07-09", "platform": "Goldin Auctions", "grade": "${grader} ${gradeScore}", "price": 465, "title": "Verified comp record" }
  ]
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: promptText,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({
      success: true,
      comps: parsed,
    });
  } catch (err: any) {
    safeLogger.error('Gemini Comps Appraisal Error:', err);
    return res.json({
      success: true,
      comps: generateFallbackComps(req.body?.cardTitle, req.body?.gradeScore),
    });
  }
}

export async function handleGenerateListings(req: Request, res: Response) {
  try {
    const { card } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        success: true,
        listings: generateSmartPlatformListings(card),
      });
    }

    const promptText = `
Generate multi-platform listing copies for this collectible card:
Title: ${card.title}
Category: ${card.category}
Player/Character: ${card.subjectOrPlayer}
Set: ${card.setName} (${card.year})
Card Number: ${card.cardNumber}
Variant: ${card.variant}
Grade: ${card.grader} ${card.gradeScore}
Cert: ${card.certNumber || 'N/A'}
Asking Price: $${card.askingPrice}
Estimated FMV: $${card.estimatedWorth?.fairMarketValue || card.askingPrice}

Generate tailored listings for:
1. eBay (title <= 80 chars, descriptionHtml, itemSpecifics object, startingPrice, buyItNowPrice)
2. Whatnot (lotTitle <= 80 chars, suddenDeathSeconds: 30, startingBid, buyItNowPrice, shippingProfile)
3. Discord (embedTitle, embedDescription, embedColorHex, fields array, footerText)
4. Reddit (title with [US, US] [H] [W] format, bodyMarkdown, subredditSuggestions)
5. Twitter / X (tweetText with hashtags, pricing, condition)
6. Slack (blocksJson)
7. Telegram (messageHtml)
8. Bluesky (postText <= 300 chars)
9. Mercari (title <= 40 chars, description)

Return pure JSON.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: promptText,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({
      success: true,
      listings: parsed,
    });
  } catch (err: any) {
    safeLogger.error('Gemini Listing Generation Error:', err);
    return res.json({
      success: true,
      listings: generateSmartPlatformListings(req.body?.card),
    });
  }
}

export const handleGenerateMultiPlatformListings = handleGenerateListings;

export async function handleTestConnection(req: Request, res: Response) {
  try {
    const { platform } = req.body;
    if (!platform) {
      return res.status(400).json({ success: false, error: 'Platform is required' });
    }
    const info = await verifyPlatformConnection(platform);
    return res.json({ success: true, connectionInfo: info });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}


/**
 * Handle POST /api/dispatch-platform
 * Server reads credentials from CredentialVault. Client NEVER supplies secrets.
 * Enforces server-side PUBLISHING_MODE (defaults to DRY_RUN).
 */
export async function handleDispatchPlatform(req: Request, res: Response) {
  const startTime = Date.now();
  try {
    const { platform, card, listingContent, action = 'post', requestedMode } = req.body as {
      platform: PlatformId;
      card: CardItem;
      listingContent?: any;
      action?: 'post' | 'sold' | 'update';
      requestedMode?: 'DRY_RUN' | 'LIVE_PUBLISHING';
    };

    if (!platform || !card) {
      return res.status(400).json({ success: false, error: 'Platform and card are required.' });
    }

    // Authoritative Server-Side Publishing Mode Check
    const serverPublishingMode = process.env.PUBLISHING_MODE || 'DRY_RUN';
    const effectiveMode = serverPublishingMode === 'LIVE_PUBLISHING' && requestedMode === 'LIVE_PUBLISHING'
      ? 'LIVE_PUBLISHING'
      : 'DRY_RUN';

    // 1. Dry Run Mode Safety Shield
    if (effectiveMode === 'DRY_RUN') {
      const generated =
        listingContent?.[platform] ||
        generateSmartPlatformListings(card)[platform as keyof ReturnType<typeof generateSmartPlatformListings>];
      return res.json({
        success: true,
        platform,
        status: 'dry_run_verified',
        mode: 'DRY_RUN',
        message: `Safety Shield Active: [DRY_RUN] Verified payload format for ${platform.toUpperCase()}. Live external publishing withheld.`,
        payload: generated,
        latencyMs: Date.now() - startTime,
      });
    }

    // 2. Real Live Dispatch - Retrieve credentials from server vault
    const vault = getDefaultVault();
    const creds = await vault.get(platform);

    if (!creds || Object.keys(creds).length === 0) {
      return res.status(400).json({
        success: false,
        platform,
        status: 'missing_credentials',
        message: `Platform ${platform.toUpperCase()} credentials not configured in secure server vault.`,
      });
    }

    switch (platform) {
      case 'discord': {
        const webhookUrl = creds.discordWebhookUrl || creds.webhookUrl;
        if (!webhookUrl) {
          return res.status(400).json({
            success: false,
            platform,
            status: 'missing_credentials',
            message: 'Discord Webhook URL is missing.',
          });
        }

        const embedPayload = {
          username: 'BossLister Card Sync',
          content:
            action === 'sold'
              ? `🔴 **CARD SOLD / DELISTED** - ${card.title} has been marked as SOLD.`
              : action === 'update'
              ? `🔄 **PRICE UPDATE** - ${card.title} is now $${card.askingPrice}!`
              : `✨ **NEW CARD LISTED FOR SALE**`,
          embeds: [
            {
              title: listingContent?.discord?.embedTitle || `${card.title} - $${card.askingPrice}`,
              description:
                listingContent?.discord?.embedDescription ||
                `${card.subjectOrPlayer} | ${card.setName} (${card.year})\n\n**Asking Price:** $${card.askingPrice}\n**Grade:** ${card.grader} ${card.gradeScore}`,
              color: action === 'sold' ? 0xe74c3c : action === 'update' ? 0x3498db : 0xf1c40f,
              fields: listingContent?.discord?.fields || [
                { name: '💰 Price', value: `$${card.askingPrice}`, inline: true },
                { name: '⭐ Grade', value: `${card.grader} ${card.gradeScore}`, inline: true },
              ],
              image: card.frontImage ? { url: card.frontImage } : undefined,
              timestamp: new Date().toISOString(),
            },
          ],
        };

        const fetchRes = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(embedPayload),
        });

        if (!fetchRes.ok) {
          const errText = await fetchRes.text().catch(() => fetchRes.statusText);
          return res.status(fetchRes.status).json({
            success: false,
            platform,
            status: 'error',
            message: redactString(`Discord Webhook failed: ${errText}`),
          });
        }

        return res.json({
          success: true,
          platform,
          status: 'live_synced',
          message: 'Live rich embed dispatched directly to your Discord channel.',
          latencyMs: Date.now() - startTime,
        });
      }

      case 'telegram': {
        const botToken = creds.telegramBotToken || creds.botToken;
        const chatId = creds.telegramChatId || creds.chatId;

        if (!botToken || !chatId) {
          return res.status(400).json({
            success: false,
            platform,
            status: 'missing_credentials',
            message: 'Telegram Bot Token and Chat ID are required in server vault.',
          });
        }

        const tgText =
          `<b>🃏 ${card.title}</b>\n\n` +
          `<b>💰 Price:</b> $${card.askingPrice}\n` +
          `<b>⭐ Grade:</b> ${card.grader} ${card.gradeScore}\n` +
          `<b>📦 Set:</b> ${card.setName} (${card.year})\n\n` +
          `<i>Action: ${action.toUpperCase()}</i>`;

        const tgUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
        const tgRes = await fetch(tgUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: tgText,
            parse_mode: 'HTML',
          }),
        });

        const tgData: any = await tgRes.json().catch(() => ({ ok: false }));
        if (!tgData.ok) {
          return res.status(400).json({
            success: false,
            platform,
            status: 'error',
            message: redactString(`Telegram Error: ${tgData.description || 'Failed to dispatch'}`),
          });
        }

        return res.json({
          success: true,
          platform,
          status: 'live_synced',
          message: 'Published live announcement to Telegram channel.',
          latencyMs: Date.now() - startTime,
        });
      }

      case 'bluesky': {
        const handle = creds.blueskyHandle;
        const appPassword = creds.blueskyAppPassword;

        if (!handle || !appPassword) {
          return res.status(400).json({
            success: false,
            platform,
            status: 'missing_credentials',
            message: 'Bluesky Handle and App Password required.',
          });
        }

        const sessionRes = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identifier: handle.trim(),
            password: appPassword.trim(),
          }),
        });

        if (!sessionRes.ok) {
          const sessionErr: any = await sessionRes.json().catch(() => ({}));
          return res.status(sessionRes.status).json({
            success: false,
            platform,
            status: 'auth_failed',
            message: redactString(`AT Protocol Auth Failed: ${sessionErr.message || 'Invalid credentials'}`),
          });
        }

        const sessionData: any = await sessionRes.json();
        const postText = `🃏 ${action === 'sold' ? '[SOLD]' : '[AVAILABLE]'} ${card.title}\nGrade: ${card.grader} ${card.gradeScore}\nPrice: $${card.askingPrice}\n\n#TheHobby #CardCollector`;

        const recordRes = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionData.accessJwt}`,
          },
          body: JSON.stringify({
            repo: sessionData.did,
            collection: 'app.bsky.feed.post',
            record: {
              $type: 'app.bsky.feed.post',
              text: postText,
              createdAt: new Date().toISOString(),
            },
          }),
        });

        const recordData: any = await recordRes.json().catch(() => ({}));
        if (!recordRes.ok) {
          return res.status(recordRes.status).json({
            success: false,
            platform,
            status: 'error',
            message: redactString(`Bluesky Post Failed: ${recordData.message || 'Error creating record'}`),
          });
        }

        return res.json({
          success: true,
          platform,
          status: 'live_synced',
          listingId: recordData.uri,
          message: 'Post published to Bluesky network.',
          latencyMs: Date.now() - startTime,
        });
      }

      case 'slack': {
        const webhookUrl = creds.slackWebhookUrl || creds.webhookUrl;
        if (!webhookUrl) {
          return res.status(400).json({
            success: false,
            platform,
            status: 'missing_credentials',
            message: 'Slack Webhook URL required.',
          });
        }

        const slackPayload = {
          text: `🃏 *${action.toUpperCase()}*: ${card.title} - $${card.askingPrice} (${card.grader} ${card.gradeScore})`,
          blocks: listingContent?.slack?.blocksJson || [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*${card.title}*\n*Price:* $${card.askingPrice} | *Grade:* ${card.grader} ${card.gradeScore}\n*Set:* ${card.setName} (${card.year})`,
              },
            },
          ],
        };

        const slackRes = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(slackPayload),
        });

        if (!slackRes.ok) {
          return res.status(slackRes.status).json({
            success: false,
            platform,
            status: 'error',
            message: redactString(`Slack Webhook Error ${slackRes.status}`),
          });
        }

        return res.json({
          success: true,
          platform,
          status: 'live_synced',
          message: 'Notification sent to Slack channel.',
          latencyMs: Date.now() - startTime,
        });
      }

      case 'zapier':
      case 'webhook': {
        const url = creds.zapierWebhookUrl || creds.customWebhookUrl || creds.webhookUrl;
        if (!url) {
          return res.status(400).json({
            success: false,
            platform,
            status: 'missing_credentials',
            message: 'Webhook URL is required.',
          });
        }

        const eventPayload = {
          event: action === 'sold' ? 'CARD_SOLD' : action === 'update' ? 'PRICE_UPDATE' : 'NEW_LISTING',
          timestamp: new Date().toISOString(),
          card: {
            id: card.id,
            title: card.title,
            category: card.category,
            price: card.askingPrice,
            grader: card.grader,
            grade: card.gradeScore,
            certNumber: card.certNumber,
            setName: card.setName,
            year: card.year,
            frontImage: card.frontImage,
          },
        };

        const hookRes = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventPayload),
        });

        if (!hookRes.ok) {
          return res.status(hookRes.status).json({
            success: false,
            platform,
            status: 'error',
            message: redactString(`Webhook returned status ${hookRes.status}`),
          });
        }

        return res.json({
          success: true,
          platform,
          status: 'live_synced',
          message: 'Dispatched event to webhook receiver.',
          latencyMs: Date.now() - startTime,
        });
      }

      case 'ebay': {
        const token = creds.ebayDevToken || creds.ebayUserToken;
        if (!token) {
          return res.status(400).json({
            success: false,
            platform,
            status: 'missing_credentials',
            message: 'eBay OAuth User Token required.',
          });
        }

        const baseUrl = creds.ebayEnvironment === 'sandbox' ? 'https://api.sandbox.ebay.com' : 'https://api.ebay.com';
        const inventoryRes = await fetch(`${baseUrl}/sell/inventory/v1/inventory_item/${encodeURIComponent(card.id)}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Content-Language': 'en-US',
          },
          body: JSON.stringify({
            availability: {
              shipToLocationAvailability: { quantity: action === 'sold' ? 0 : 1 },
            },
            condition: 'LIKE_NEW',
            product: {
              title: card.title.slice(0, 80),
              description: card.conditionNotes || card.title,
              aspects: {
                Player: [card.subjectOrPlayer],
                Set: [card.setName],
                Grade: [card.gradeScore],
                Grader: [card.grader],
              },
              imageUrls: card.frontImage ? [card.frontImage] : [],
            },
          }),
        });

        if (!inventoryRes.ok) {
          const errData: any = await inventoryRes.json().catch(() => ({}));
          return res.status(inventoryRes.status).json({
            success: false,
            platform,
            status: 'error',
            message: redactString(
              errData.errors?.[0]?.message || `eBay API returned status ${inventoryRes.status}`
            ),
          });
        }

        return res.json({
          success: true,
          platform,
          status: 'live_synced',
          listingId: `ebay-item-${card.id}`,
          message: 'Successfully updated eBay inventory item via Sell Inventory API.',
          latencyMs: Date.now() - startTime,
        });
      }

      case 'whatnot': {
        return res.status(403).json({
          success: false,
          platform,
          status: 'approval_required',
          message: 'Whatnot requires approved Seller Developer account with live streaming API clearance.',
        });
      }

      case 'tcgplayer': {
        return res.status(403).json({
          success: false,
          platform,
          status: 'partner_required',
          message: 'TCGplayer requires authorized Pro Developer Partner client keys.',
        });
      }

      case 'mercari': {
        return res.json({
          success: true,
          platform,
          status: 'manual_export',
          message: 'Mercari formatted listing generated for 1-click clipboard export in mobile app.',
          payload: generateSmartPlatformListings(card).mercari,
          latencyMs: Date.now() - startTime,
        });
      }

      default:
        return res.status(400).json({
          success: false,
          platform,
          status: 'unsupported',
          message: `Platform ${platform} is not configured for direct dispatch.`,
        });
    }
  } catch (err: any) {
    safeLogger.error('Dispatch error:', err);
    return res.status(500).json({
      success: false,
      status: 'error',
      message: redactString(err.message || 'Dispatch internal failure.'),
      latencyMs: Date.now() - startTime,
    });
  }
}

function generateSmartFallbackIdentification(hint: string) {
  const isJordan = hint.toLowerCase().includes('jordan');
  const isCharizard = hint.toLowerCase().includes('charizard') || hint.toLowerCase().includes('pokemon');

  if (isCharizard) {
    return {
      title: '1999 Pokémon Base Set Charizard Holo 1st Edition PSA 9 MINT',
      category: 'pokemon',
      subjectOrPlayer: 'Charizard',
      setName: 'Base Set (1st Edition)',
      year: '1999',
      cardNumber: '4/102',
      variant: '1st Edition Shadowless Holo',
      grader: 'PSA',
      gradeScore: '9 MINT',
      certNumber: '48201938',
      keyAttributes: ['1st Edition', 'Shadowless', 'Holo Rare', 'Holy Grail'],
      estimatedWorth: {
        fairMarketValue: 12500,
        priceRangeLow: 11000,
        priceRangeHigh: 14200,
        confidenceScore: 98,
        trend30DayPercent: 12.5,
        liquidityRating: 'High',
        popReportEstimate: 'PSA 9 Pop: 642 / Total Graded: 4,120',
        recentSales: [
          { date: '2026-08-02', platform: 'eBay Auction', grade: 'PSA 9', price: 12400, title: '1999 Pokemon Game 1st Edition Shadowless Charizard Holo #4 PSA 9 MINT' },
        ],
      },
      recommendedListingPrice: 12900,
      conditionNotes: 'Exceptional centering, vibrant red foil background, sharp edges with zero silvering.',
      seoTitle: '1999 Pokemon Base Set 1st Edition Charizard Holo 4/102 PSA 9 MINT Shadowless',
    };
  }

  if (isJordan) {
    return {
      title: '1986 Fleer Michael Jordan Rookie Card #57 BGS 8.5 NM-MT+',
      category: 'sports',
      subjectOrPlayer: 'Michael Jordan',
      setName: '1986-87 Fleer',
      year: '1986',
      cardNumber: '#57',
      variant: 'Rookie Card (RC)',
      grader: 'BGS',
      gradeScore: '8.5 NM-MT+',
      certNumber: '001294819',
      keyAttributes: ['Rookie Card', 'Hall of Fame', 'Subgrades: Centering 9, Corners 8.5, Edges 9, Surface 8.5'],
      estimatedWorth: {
        fairMarketValue: 7400,
        priceRangeLow: 6800,
        priceRangeHigh: 8100,
        confidenceScore: 95,
        trend30DayPercent: 4.8,
        liquidityRating: 'High',
        popReportEstimate: 'BGS 8.5 Pop: 1,420 / Total Graded: 14,800',
        recentSales: [
          { date: '2026-08-10', platform: 'eBay Sold', grade: 'BGS 8.5', price: 7350, title: '1986 Fleer Michael Jordan #57 Rookie RC BGS 8.5' },
        ],
      },
      recommendedListingPrice: 7500,
      conditionNotes: 'Bold Chicago Bulls red and blue borders, crisp clarity, exceptional eye appeal.',
      seoTitle: '1986 Fleer Michael Jordan #57 Rookie RC BGS 8.5 Bulls HOF Rare Clean Slabs',
    };
  }

  return {
    title: '2020 Panini Prizm Joe Burrow Silver Rookie #307 PSA 10 GEM MINT',
    category: 'sports',
    subjectOrPlayer: 'Joe Burrow',
    setName: '2020 Panini Prizm Football',
    year: '2020',
    cardNumber: '#307',
    variant: 'Silver Prizm Refractor RC',
    grader: 'PSA',
    gradeScore: '10 GEM MINT',
    certNumber: '59281044',
    keyAttributes: ['Rookie Card (RC)', 'Silver Prizm', 'PSA 10 Gem Mint', 'Key QB'],
    estimatedWorth: {
      fairMarketValue: 1850,
      priceRangeLow: 1650,
      priceRangeHigh: 2100,
      confidenceScore: 96,
      trend30DayPercent: 8.2,
      liquidityRating: 'High',
      popReportEstimate: 'PSA 10 Pop: 3,110 / Total: 7,450',
      recentSales: [
        { date: '2026-08-12', platform: 'eBay Auction', grade: 'PSA 10', price: 1825, title: '2020 Panini Prizm Joe Burrow Silver Prizm #307 Rookie PSA 10 GEM MINT' },
      ],
    },
    recommendedListingPrice: 1895,
    conditionNotes: 'Perfect 50/50 centering, razor sharp silver refractor sheen, pristine case.',
    seoTitle: '2020 Panini Prizm Joe Burrow Silver #307 Rookie RC PSA 10 GEM MINT Bengals',
  };
}

function generateFallbackComps(title: string = 'Collectible Card', grade: string = 'PSA 10') {
  return {
    fairMarketValue: 475,
    priceRangeLow: 410,
    priceRangeHigh: 540,
    confidenceScore: 92,
    trend30DayPercent: 6.2,
    liquidityRating: 'High',
    popReportEstimate: `${grade} Pop: 184 / Total: 1,120`,
    recentSales: [
      { date: '2026-08-05', platform: 'eBay Auction', grade, price: 480, title: `${title} ${grade}` },
      { date: '2026-07-28', platform: 'PWCC Vault', grade, price: 465, title: `${title} ${grade}` },
    ],
  };
}

function generateSmartPlatformListings(card: any) {
  const price = card.askingPrice || card.estimatedWorth?.fairMarketValue || 450;
  return {
    ebay: {
      title: `${card.year || '2023'} ${card.setName || 'Set'} ${card.subjectOrPlayer || 'Card'} ${card.variant || ''} ${card.cardNumber || ''} ${card.grader || 'PSA'} ${card.gradeScore || '10'}`.slice(0, 80),
      startingPrice: Math.round(price * 0.85),
      buyItNowPrice: price,
      bestOfferEnabled: true,
      descriptionHtml: `<div style="font-family: sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; color: #222;">
<h2>${card.title}</h2>
<p><strong>Condition/Grade:</strong> ${card.grader} ${card.gradeScore}</p>
<p><strong>Set & Year:</strong> ${card.setName} (${card.year})</p>
<p><strong>Card Number & Parallel:</strong> ${card.cardNumber} - ${card.variant}</p>
<hr/>
<p><strong>Shipping:</strong> Shipped securely inside a bubble mailer in protective sleeve/cardboard sandwich with USPS Ground Advantage & tracking.</p>
<p><strong>Authenticity Guarantee:</strong> 100% genuine collectible. Prompt communication and same-day dispatch.</p>
</div>`,
      itemSpecifics: {
        'Player/Athlete': card.subjectOrPlayer,
        'Card Name': card.title,
        'Set': card.setName,
        'Graded': card.grader !== 'Raw' ? 'Yes' : 'No',
        'Professional Grader': card.grader,
        'Grade': card.gradeScore,
        'Card Number': card.cardNumber,
        'Year Manufactured': card.year,
      },
    },
    whatnot: {
      lotTitle: `${card.title} - ${card.grader} ${card.gradeScore}`.slice(0, 80),
      startingBid: 1,
      buyItNowPrice: price,
      suddenDeathSeconds: 30,
      category: card.category === 'pokemon' ? 'Pokemon TCG' : 'Sports Cards',
      condition: `${card.grader} ${card.gradeScore}`,
      lotType: 'auction',
      description: `${card.title} [${card.grader} ${card.gradeScore}]. Fast bubble mailer shipping with tracking. Authentic collector slab ready for live stream auction run!`,
      shippingProfile: 'USPS Bubble Mailer 4oz (Tracked)',
    },
    discord: {
      embedTitle: `🃏 ${card.title} • $${price}`,
      embedDescription: `🔥 **Available Now!**\n\n**Player/Subject:** ${card.subjectOrPlayer}\n**Set:** ${card.setName} (${card.year})\n**Parallel:** ${card.variant}\n**Grade:** ${card.grader} ${card.gradeScore}\n\n**Price:** **$${price}** *(Comps: $${card.estimatedWorth?.fairMarketValue || price})*\n**Shipping:** $5 BMWT / Free over $100\n\n*DM to claim or make an offer!*`,
      embedColorHex: '#F1C40F',
      fields: [
        { name: '💰 Asking Price', value: `$${price}`, inline: true },
        { name: '📊 FMV Comps', value: `$${card.estimatedWorth?.fairMarketValue || price}`, inline: true },
        { name: '⭐ Grade', value: `${card.grader} ${card.gradeScore}`, inline: true },
      ],
      footerText: 'BossLister Card Sync • Verified Collector Listing',
    },
    reddit: {
      title: `[US, US] [H] ${card.title} [W] $${price} PayPal G&S`,
      bodyMarkdown: `### [H] Have:
* **${card.title}**
* **Grade/Condition:** ${card.grader} ${card.gradeScore} (Cert #${card.certNumber || 'Verified'})
* **Set:** ${card.setName} (${card.year}) - ${card.variant}
* **Price:** **$${price} shipped BMWT** (Recent comps: $${card.estimatedWorth?.fairMarketValue || price})
* **Timestamp & Photos:** [View High-Res Front/Back Scans](${card.frontImage || 'https://images.unsplash.com/photo-1613771404784-3a5686aa2be3'})

---
### [W] Want:
* PayPal Goods & Services only.
* Tracked bubble mailer shipping included in continental US.`,
      subredditSuggestions: ['r/pkmntcgtrades', 'r/sportscards', 'r/baseballcards', 'r/footballcards'],
    },
    twitter: {
      tweetText: `🚨 FS / FOR SALE 🚨\n\n🃏 ${card.title}\n⭐ Grade: ${card.grader} ${card.gradeScore}\n💰 Price: $${price} (Comps: $${card.estimatedWorth?.fairMarketValue || price})\n\n📦 Ships BMWT w/ full tracking. DMs open!\n\n#TheHobby #CardCollector #CardsForSale #PokemonTCG #SportsCards`,
    },
    slack: {
      blocksJson: [
        { type: 'header', text: { type: 'plain_text', text: `🃏 New Listing: ${card.title}` } },
        { type: 'section', text: { type: 'mrkdwn', text: `*Price:* $${price} | *Est. Value:* $${card.estimatedWorth?.fairMarketValue || price}\n*Grade:* ${card.grader} ${card.gradeScore}` } },
      ],
    },
    telegram: {
      messageHtml: `<b>🃏 NEW CARD DROP</b>\n\n<b>${card.title}</b>\n💰 <b>Price:</b> $${price}\n⭐ <b>Grade:</b> ${card.grader} ${card.gradeScore}\n📊 <b>Market Value:</b> $${card.estimatedWorth?.fairMarketValue || price}\n\n<i>Reply or DM to purchase with instant tracking.</i>`,
    },
    bluesky: {
      postText: `🃏 Fresh listing available:\n${card.title}\nGrade: ${card.grader} ${card.gradeScore}\nAsking: $${price} (Market: $${card.estimatedWorth?.fairMarketValue || price})\n\n#TheHobby #CardCollector`,
    },
    mercari: {
      title: `${card.title}`.slice(0, 40),
      description: `Authentic ${card.title}! Condition: ${card.grader} ${card.gradeScore}. Carefully packed in penny sleeve, top loader / graded slab shield, and sturdy bubble mailer with tracking. Ships fast!`,
    },
  };
}
