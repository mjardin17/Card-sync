# BossLister Card Sync — Production Auth & Token Security Report

**Document Version:** 1.0.0  
**Security Status:** Production Ready / Hardened  
**Last Verified:** August 2026  
**Architecture:** Zero Client-Side Secrets / AES-256-GCM Server Vault  

---

## 1. Executive Summary

BossLister Card Sync has been refactored to eliminate all client-side credential persistence, placeholder tokens, and synthetic connection statuses. All API tokens, OAuth refresh tokens, bot credentials, and webhook endpoints are now strictly stored, encrypted, and verified server-side.

The client browser environment maintains **zero knowledge** of sensitive credentials, receiving only non-sensitive metadata (such as platform connection status, account handle, and latency).

---

## 2. Production Security Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   CLIENT (Browser / UI)                 │
│  - No secret tokens in React state                      │
│  - No secret tokens in localStorage                     │
│  - Ephemeral modal inputs purged immediately on submit  │
│  - Sanitizer runs on mount to purge legacy storage keys │
└────────────────────────────┬────────────────────────────┘
                             │ HTTPS / REST (Masked Only)
┌────────────────────────────▼────────────────────────────┐
│                   SERVER (server.ts)                    │
│  - Express REST API with authentication route guards   │
│  - Safe logging engine with automatic redaction         │
│  - Server-side token verification against live platform │
└────────────────────────────┬────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────┐
│            ENCRYPTED VAULT (AES-256-GCM)                │
│  - 256-bit Master Key (env or local key file)           │
│  - Unique 12-byte IV per encryption operation           │
│  - 128-bit Authentication Tag (tamper verification)     │
│  - In-memory cache + encrypted on-disk storage          │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Platform Integration & Verification Matrix

Every platform connector requires real authorized credentials and authenticates against live upstream endpoints before entering `VERIFIED` status:

| Platform | Authentication Mechanism | Live Verification Endpoint | Supported Mode |
| :--- | :--- | :--- | :--- |
| **eBay** | OAuth 2.0 (User PKCE / Refresh Token) | `https://api.ebay.com/identity/v1/oauth2/token` + `/sell/inventory/v1/inventory_item` | Real Multi-Listing |
| **Discord** | Webhook Token Authentication | `POST /api/webhooks/{id}/{token}` | Instant Showcase |
| **Telegram** | Bot Token + Channel ID Authorization | `https://api.telegram.org/bot<TOKEN>/getMe` | Channel Broadcast |
| **Slack** | Incoming Webhook Authorization | `POST https://hooks.slack.com/services/...` | Team Marketplace |
| **Bluesky** | AT Protocol App Password Session | `https://bsky.social/xrpc/com.atproto.server.createSession` | Decentralized Feed |
| **Reddit** | OAuth 2.0 App Client ID + Secret | `https://www.reddit.com/api/v1/access_token` | Subreddit Sales |
| **Twitter / X** | OAuth 2.0 / App Bearer Token | `https://api.twitter.com/2/users/me` | Social Feed |
| **Whatnot** | Developer Partner API Key | Live Developer Verification / Approval Guard | Live Stream Auction |
| **TCGPlayer** | Partner Authorization Program | Partner Verification Guard | Graded & Singles Sync |
| **Mercari** | Zero-API Manual CSV Export Format | Standardized CSV / Clipboard Exporter | Domestic Direct Sales |
| **Webhooks / Zapier** | Custom Webhook Endpoints | Header verification & test payload dispatch | Custom Automation |

---

## 4. Key Security Controls Implemented

### 4.1. Client-Side Sanitization & Storage Allowlist
* **Browser localStorage:** Only non-sensitive data keys (`omnicard_vault_cards_v1`, `omnicard_client_prefs_v1`, `omnicard_vault_logs_v1`, `omnicard_vault_currency_v1`) are permitted.
* **Automatic Migration:** On startup, `migrateAndSanitizeLocalStorage` purges legacy keys (e.g. `omnicard_vault_config_v1`) and strips any field matching secret patterns (`/token/i`, `/secret/i`, `/password/i`, `/apikey/i`, `/webhookurl/i`).
* **Ephemeral UI State:** The `TokenVaultModal` holds input values in temporary state that is immediately cleared upon API dispatch.

### 4.2. Cryptographic Token Vault (`EncryptedLocalVault`)
* **Algorithm:** AES-256-GCM authenticated symmetric encryption.
* **Key Derivation:** SHA-256 derivation from `TOKEN_VAULT_MASTER_KEY` or secure auto-generated 32-byte host key.
* **Tamper Proofing:** Modifying ciphertext or auth tags throws cryptographic decryption errors immediately, preventing injection or silent corruption.

### 4.3. Universal Secret Redaction Engine
* Centralized `safeLogger` and `redactSecretsInObject` utility automatically masks Bearer tokens, passwords, webhook secrets, and private keys from console outputs, logs, and error responses.

---

## 5. Automated Verification & Regression Testing

The automated security regression test suite (`src/tests/securityRegression.test.ts`) verifies:
1. **Encrypted Vault Storage:** Validates AES-256-GCM encryption, key file access, and rejection of tampered ciphertext.
2. **Storage Sanitizer:** Validates that client preference serializers strip all credential fields while preserving UI preferences.
3. **LocalStorage Purging:** Validates that legacy keys and unauthorized storage entries are removed on initialization.
4. **Redaction Engine:** Validates that tokens, passwords, webhook URLs, and Authorization headers are masked in strings and objects.

All 4 test suites pass with zero warnings.
