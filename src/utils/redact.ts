/**
 * Centralized Secret Redaction Utility for BossLister Card Sync
 * Ensures that access tokens, bearer tokens, API keys, passwords,
 * bot tokens, and webhook secrets are redacted from logs, errors,
 * and API responses.
 */

// Patterns to detect and redact sensitive values
const SECRET_REGEX_PATTERNS = [
  // Bearer tokens & OAuth tokens
  /Bearer\s+([A-Za-z0-9_\-\.~+/]+=*)/gi,
  // Discord Webhooks: https://discord.com/api/webhooks/123456789/token-secret
  /(https?:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/)([A-Za-z0-9_\-]+)/gi,
  // Slack Webhooks: https://hooks.slack.com/services/T00/B00/token-secret
  /(https?:\/\/hooks\.slack\.com\/services\/[A-Z0-9]+\/[A-Z0-9]+\/)([A-Za-z0-9_\-]+)/gi,
  // Telegram Bot Token in URLs or strings: 1234567890:AAH...
  /(\b\d{8,12}:[A-Za-z0-9_-]{30,45}\b)/g,
  // AT Protocol / Bluesky app passwords (xxxx-xxxx-xxxx-xxxx)
  /\b([a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4})\b/gi,
  // Generic API keys, private keys, secrets in query params or JSON
  /("(?:access_token|refreshToken|botToken|apiKey|secret|appPassword|privateKey|ebayDevToken|twitterBearerToken|whatnotApiKey)"\s*:\s*)"([^"]+)"/gi,
  // Basic Auth headers
  /Basic\s+([A-Za-z0-9+/=]+)/gi,
];

// Sensitive key names for JSON object recursion
const SENSITIVE_KEY_NAMES = new Set([
  'token',
  'accesstoken',
  'access_token',
  'refreshtoken',
  'refresh_token',
  'bearertoken',
  'bearer_token',
  'bottoken',
  'bot_token',
  'apikey',
  'api_key',
  'privatekey',
  'private_key',
  'clientsecret',
  'client_secret',
  'secret',
  'password',
  'apppassword',
  'app_password',
  'webhookurl',
  'webhook_url',
  'discordwebhookurl',
  'slackwebhookurl',
  'ebaydevtoken',
  'ebayrefreshtoken',
  'whatnotapikey',
  'twitterbearertoken',
  'twitterapikey',
  'redditsecret',
  'tcgplayerprivatekey',
]);

/**
 * Redact secrets from a string
 */
export function redactString(text: string): string {
  if (!text || typeof text !== 'string') return text;

  let result = text;

  // Discord webhook URL redaction
  result = result.replace(
    /(https?:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/)[A-Za-z0-9_\-]+/gi,
    '$1[REDACTED_WEBHOOK_TOKEN]'
  );

  // Slack webhook URL redaction
  result = result.replace(
    /(https?:\/\/hooks\.slack\.com\/services\/[A-Z0-9]+\/[A-Z0-9]+\/)[A-Za-z0-9_\-]+/gi,
    '$1[REDACTED_SLACK_TOKEN]'
  );

  // Telegram bot token redaction
  result = result.replace(
    /\b(\d{8,12}):[A-Za-z0-9_-]{30,45}\b/g,
    '$1:[REDACTED_BOT_TOKEN]'
  );

  // Bluesky app password
  result = result.replace(
    /\b[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}\b/gi,
    '[REDACTED_APP_PASSWORD]'
  );

  // Bearer tokens
  result = result.replace(
    /Bearer\s+[A-Za-z0-9_\-\.~+/]+=*/gi,
    'Bearer [REDACTED_TOKEN]'
  );

  // JSON key-value secrets
  result = result.replace(
    /("(?:access_token|refreshToken|botToken|apiKey|secret|appPassword|privateKey|ebayDevToken|twitterBearerToken|whatnotApiKey)"\s*:\s*)"([^"]+)"/gi,
    '$1"[REDACTED]"'
  );

  return result;
}

/**
 * Checks if a key name is sensitive
 */
export function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[_\-]/g, '');
  if (SENSITIVE_KEY_NAMES.has(normalized)) return true;
  return (
    normalized.includes('token') ||
    normalized.includes('secret') ||
    normalized.includes('password') ||
    normalized.includes('apikey') ||
    normalized.includes('webhook') ||
    normalized.includes('auth') ||
    normalized.includes('privatekey')
  );
}

/**
 * Recursively sanitize an object by stripping or masking sensitive keys
 */
export function redactObject<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    return redactString(obj) as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redactObject(item)) as unknown as T;
  }

  if (typeof obj === 'object') {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (isSensitiveKey(key)) {
        if (typeof value === 'string') {
          sanitized[key] = maskSecretValue(value);
        } else {
          sanitized[key] = '[REDACTED]';
        }
      } else {
        sanitized[key] = redactObject(value);
      }
    }
    return sanitized as T;
  }

  return obj;
}

/**
 * Mask secret string with prefix and suffix for debugging without leaking token
 */
export function maskSecretValue(val: string): string {
  if (!val || typeof val !== 'string') return '[REDACTED]';
  if (val.toLowerCase().includes('password')) return '[REDACTED_PASSWORD]';
  if (val.length <= 8) return '****';
  return `${val.slice(0, 5)}...${val.slice(-4)}`;
}

/**
 * Alias for redactObject
 */
export const redactSecretsInObject = redactObject;


/**
 * Safe logger that redacts secrets before printing
 */
export const safeLogger = {
  log: (...args: any[]) => {
    const sanitized = args.map((a) => (typeof a === 'string' ? redactString(a) : redactObject(a)));
    console.log(...sanitized);
  },
  warn: (...args: any[]) => {
    const sanitized = args.map((a) => (typeof a === 'string' ? redactString(a) : redactObject(a)));
    console.warn(...sanitized);
  },
  error: (...args: any[]) => {
    const sanitized = args.map((a) => (typeof a === 'string' ? redactString(a) : redactObject(a)));
    console.error(...sanitized);
  },
};
