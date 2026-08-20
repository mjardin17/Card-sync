import { PlatformId, PlatformConnectionInfo } from '../types/card';

/**
 * Sanitized client preferences stored in browser localStorage.
 * Guaranteed to NEVER contain any access tokens, private keys,
 * passwords, bot tokens, or webhook secrets.
 */
export interface ClientPlatformPreferences {
  executionMode: 'real' | 'sandbox';
  publishingMode: 'DRY_RUN' | 'LIVE_PUBLISHING';
  platformsEnabled: Record<PlatformId, boolean>;
  autoSyncPriceChanges: boolean;
  autoSyncSoldStatus: boolean;
  connectionStatuses: Partial<Record<PlatformId, PlatformConnectionInfo>>;
}

/**
 * Strict allowlist of top-level keys allowed in client configuration.
 */
const ALLOWED_CONFIG_KEYS = new Set<string>([
  'executionMode',
  'publishingMode',
  'platformsEnabled',
  'autoSyncPriceChanges',
  'autoSyncSoldStatus',
  'connectionStatuses',
]);

/**
 * Strict allowlist of keys allowed inside PlatformConnectionInfo metadata.
 */
const ALLOWED_CONNECTION_INFO_KEYS = new Set<string>([
  'status',
  'authType',
  'environment',
  'accountId',
  'accountName',
  'storeOrChannel',
  'grantedScopes',
  'expiresAt',
  'refreshAvailable',
  'readPermission',
  'writePermission',
  'listingPermission',
  'lastVerifiedAt',
  'lastError',
  'latencyMs',
  'evidenceSource',
]);

/**
 * Secret keyword patterns that are unconditionally rejected from client storage.
 */
const SECRET_KEYWORD_PATTERNS = [
  /token/i,
  /secret/i,
  /password/i,
  /apikey/i,
  /api_key/i,
  /privatekey/i,
  /private_key/i,
  /webhookurl/i,
  /webhook_url/i,
  /refreshtoken/i,
  /accesstoken/i,
  /bearer/i,
];

/**
 * Checks if a key name matches any secret pattern.
 */
export function isSecretKeyName(key: string): boolean {
  return SECRET_KEYWORD_PATTERNS.some((pattern) => pattern.test(key));
}

/**
 * Strict allowlist of localStorage keys permitted in the browser.
 */
export const ALLOWED_STORAGE_KEYS = new Set<string>([
  'omnicard_vault_cards_v1',
  'omnicard_client_prefs_v1',
  'omnicard_vault_logs_v1',
  'omnicard_vault_currency_v1',
]);

/**
 * Disallowed or legacy keys that are explicitly purged from localStorage.
 */
export const PURGED_STORAGE_KEYS = ['omnicard_vault_config_v1', 'legacy_auth_tokens', 'bosslister_tokens'];

/**
 * Purges disallowed storage keys from any storage backend.
 */
export function purgeDisallowedStorageKeys(
  hasKey: (key: string) => boolean,
  removeKey: (key: string) => void,
  getAllKeys: () => string[]
): void {
  for (const key of getAllKeys()) {
    if (PURGED_STORAGE_KEYS.includes(key) || (!ALLOWED_STORAGE_KEYS.has(key) && isSecretKeyName(key))) {
      removeKey(key);
    }
  }
}

/**
 * Load sanitized client preferences from localStorage.
 */
export function loadSanitizedClientPreferences(fallback: ClientPlatformPreferences): ClientPlatformPreferences {
  if (typeof window === 'undefined' || !window.localStorage) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem('omnicard_client_prefs_v1');
    if (!raw) {
      return fallback;
    }
    return sanitizeClientPreferences(JSON.parse(raw));
  } catch (e) {
    return fallback;
  }
}

/**
 * Save sanitized client preferences to localStorage.
 */
export function saveSanitizedClientPreferences(prefs: ClientPlatformPreferences): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  const sanitized = sanitizeClientPreferences(prefs);
  window.localStorage.setItem('omnicard_client_prefs_v1', JSON.stringify(sanitized));
}


/**
 * Recursively and defensively sanitizes an object, strictly retaining only
 * allowlisted, non-secret metadata.
 */
export function sanitizeClientPreferences(raw: any): ClientPlatformPreferences {
  if (!raw || typeof raw !== 'object') {
    return getDefaultClientPreferences();
  }

  const result: ClientPlatformPreferences = {
    executionMode: raw.executionMode === 'sandbox' ? 'sandbox' : 'real',
    publishingMode: raw.publishingMode === 'LIVE_PUBLISHING' ? 'LIVE_PUBLISHING' : 'DRY_RUN',
    platformsEnabled: {
      ebay: raw.platformsEnabled?.ebay ?? true,
      whatnot: raw.platformsEnabled?.whatnot ?? true,
      discord: raw.platformsEnabled?.discord ?? true,
      reddit: raw.platformsEnabled?.reddit ?? true,
      twitter: raw.platformsEnabled?.twitter ?? true,
      slack: raw.platformsEnabled?.slack ?? true,
      telegram: raw.platformsEnabled?.telegram ?? true,
      bluesky: raw.platformsEnabled?.bluesky ?? true,
      mercari: raw.platformsEnabled?.mercari ?? true,
      tcgplayer: raw.platformsEnabled?.tcgplayer ?? true,
      webhook: raw.platformsEnabled?.webhook ?? true,
      zapier: raw.platformsEnabled?.zapier ?? true,
    },
    autoSyncPriceChanges: raw.autoSyncPriceChanges !== false,
    autoSyncSoldStatus: raw.autoSyncSoldStatus !== false,
    connectionStatuses: {},
  };

  // Sanitize connectionStatuses
  if (raw.connectionStatuses && typeof raw.connectionStatuses === 'object') {
    for (const [platformKey, info] of Object.entries(raw.connectionStatuses)) {
      // Validate platformKey
      if (isSecretKeyName(platformKey)) continue;

      if (info && typeof info === 'object') {
        const sanitizedInfo: Record<string, any> = {};
        for (const [infoKey, val] of Object.entries(info as Record<string, any>)) {
          // Reject any key matching secret pattern or not in allowlist
          if (isSecretKeyName(infoKey) || !ALLOWED_CONNECTION_INFO_KEYS.has(infoKey)) {
            continue;
          }
          sanitizedInfo[infoKey] = val;
        }
        result.connectionStatuses[platformKey as PlatformId] = sanitizedInfo as PlatformConnectionInfo;
      }
    }
  }

  return result;
}

/**
 * Default safe client preferences with zero credentials.
 */
export function getDefaultClientPreferences(): ClientPlatformPreferences {
  return {
    executionMode: 'real',
    publishingMode: 'DRY_RUN',
    autoSyncPriceChanges: true,
    autoSyncSoldStatus: true,
    platformsEnabled: {
      ebay: true,
      whatnot: true,
      discord: true,
      reddit: true,
      twitter: true,
      slack: true,
      telegram: true,
      bluesky: true,
      mercari: true,
      tcgplayer: true,
      webhook: true,
      zapier: true,
    },
    connectionStatuses: {
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
      },
      mercari: {
        status: 'MANUAL_EXPORT',
        authType: 'Manual Export',
        environment: 'production',
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
      },
    },
  };
}

/**
 * Migration helper that runs on application startup:
 * 1. Reads localStorage key 'omnicard_vault_config_v1'
 * 2. Checks if legacy credentials exist in localStorage
 * 3. Strips all secret fields
 * 4. Marks connectors with legacy browser secrets as RECONNECT_REQUIRED
 * 5. Overwrites localStorage with sanitized preferences
 */
export function migrateAndSanitizeLocalStorage(storageKey = 'omnicard_vault_config_v1'): {
  preferences: ClientPlatformPreferences;
  migrated: boolean;
  reconnectRequiredPlatforms: PlatformId[];
} {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {
      preferences: getDefaultClientPreferences(),
      migrated: false,
      reconnectRequiredPlatforms: [],
    };
  }

  try {
    const rawStored = window.localStorage.getItem(storageKey);
    if (!rawStored) {
      const defaultPrefs = getDefaultClientPreferences();
      window.localStorage.setItem(storageKey, JSON.stringify(defaultPrefs));
      return {
        preferences: defaultPrefs,
        migrated: false,
        reconnectRequiredPlatforms: [],
      };
    }

    const parsed = JSON.parse(rawStored);
    let hadSecrets = false;
    const reconnectPlatforms: PlatformId[] = [];

    // Check for any legacy secret keys
    for (const key of Object.keys(parsed)) {
      if (isSecretKeyName(key) && parsed[key]) {
        hadSecrets = true;
        // Map secret key to platform
        if (key.includes('ebay')) reconnectPlatforms.push('ebay');
        if (key.includes('discord')) reconnectPlatforms.push('discord');
        if (key.includes('slack')) reconnectPlatforms.push('slack');
        if (key.includes('telegram')) reconnectPlatforms.push('telegram');
        if (key.includes('twitter')) reconnectPlatforms.push('twitter');
        if (key.includes('reddit')) reconnectPlatforms.push('reddit');
        if (key.includes('bluesky')) reconnectPlatforms.push('bluesky');
        if (key.includes('whatnot')) reconnectPlatforms.push('whatnot');
        if (key.includes('tcgplayer')) reconnectPlatforms.push('tcgplayer');
        if (key.includes('webhook')) reconnectPlatforms.push('webhook');
        if (key.includes('zapier')) reconnectPlatforms.push('zapier');
      }
    }

    // Sanitize completely
    const sanitized = sanitizeClientPreferences(parsed);

    // If secrets were present, mark affected connectors as RECONNECT_REQUIRED
    if (hadSecrets) {
      for (const p of reconnectPlatforms) {
        if (sanitized.connectionStatuses[p]) {
          sanitized.connectionStatuses[p]!.status = 'RECONNECT_REQUIRED';
          sanitized.connectionStatuses[p]!.lastError =
            'Browser credentials purged for security. Please reconnect using the secure server vault.';
        }
      }
      // Overwrite storage with sanitized version
      window.localStorage.setItem(storageKey, JSON.stringify(sanitized));
      console.warn(
        '[Security Migration] Purged legacy browser-stored credentials from localStorage. Reconnection required for security.'
      );
    }

    return {
      preferences: sanitized,
      migrated: hadSecrets,
      reconnectRequiredPlatforms: reconnectPlatforms,
    };
  } catch (err) {
    console.error('Error during localStorage migration:', err);
    const safeDefault = getDefaultClientPreferences();
    window.localStorage.setItem(storageKey, JSON.stringify(safeDefault));
    return {
      preferences: safeDefault,
      migrated: true,
      reconnectRequiredPlatforms: [],
    };
  }
}
