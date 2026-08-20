# BossLister Card Sync — Security Remediation Report

**Date:** August 2026  
**Scope:** Client Credential Elimination & Server-Side Token Vault Hardening  
**Target Project:** `mjardin17/Card-sync`  

---

## 1. Vulnerability & Architectural Gap Overview

| Issue ID | Description | Severity | Remediation Status |
| :--- | :--- | :--- | :--- |
| **SEC-01** | Tokens entered in Token Vault UI flowed into `PlatformConfigState` and persisted in browser `localStorage`. | **HIGH** | **RESOLVED** |
| **SEC-02** | Ephemeral in-memory server vault lost credentials on process restarts or lacked persistent encryption. | **MEDIUM** | **RESOLVED** |
| **SEC-03** | Frontend client passed raw credentials over API calls to Gemini and cross-post endpoints. | **HIGH** | **RESOLVED** |
| **SEC-04** | Plaintext API keys and Bearer tokens could appear in console logs and error stack traces. | **MEDIUM** | **RESOLVED** |
| **SEC-05** | Platforms could be marked connected based on presence of arbitrary string inputs rather than live verified authorization. | **MEDIUM** | **RESOLVED** |

---

## 2. Remediation Details & Code Changes

### SEC-01: Elimination of Secrets from Client State & Storage
* **Changes in `src/types/card.ts`:**
  - Removed all raw credential properties (`discordWebhookUrl`, `slackWebhookUrl`, `telegramBotToken`, `ebayDevToken`, etc.) from `PlatformConfigState`.
  - Created `PlatformConnectionInfo` type to hold exclusively non-sensitive metadata (`status`, `accountName`, `grantedScopes`, `latencyMs`).
* **Changes in `src/utils/storageSanitizer.ts`:**
  - Implemented `sanitizeClientPreferences` which strips any key matching `/token/i`, `/secret/i`, `/password/i`, `/apikey/i`, `/webhookurl/i`.
  - Implemented `migrateAndSanitizeLocalStorage` on app mount to scrub legacy `omnicard_vault_config_v1` entries and purge unauthorized storage keys.
* **Changes in `src/components/TokenVaultModal.tsx`:**
  - Decoupled modal state from global preferences.
  - Replaced persistent secret state with temporary input buffers (`tempCreds`) that are wiped immediately upon submission.

### SEC-02: AES-256-GCM Encrypted Server Vault Persistence
* **Changes in `src/services/credentialVault.ts`:**
  - Implemented `EncryptedLocalVault` utilizing authenticated `aes-256-gcm` encryption.
  - Unique 12-byte IV per encryption operation and 128-bit authentication tag verification on read.
  - Supports configurable master key via `TOKEN_VAULT_MASTER_KEY` environment variable with safe local key file fallback (`.vault/vault.key`).

### SEC-03: Server-Authoritative API Dispatch
* **Changes in `server.ts` & `src/services/geminiClient.ts`:**
  - Updated `/api/vault/save`, `/api/vault/verify`, and `/api/cross-post` routes.
  - The browser no longer attaches credentials in HTTP payloads; server retrieves credentials directly from the encrypted vault.
  - Enforced server-side `PUBLISHING_MODE` checking (`DRY_RUN` vs `LIVE_PUBLISHING`).

### SEC-04: Redaction Engine & Safe Logger
* **Changes in `src/utils/redact.ts`:**
  - Created `redactString`, `redactObject`, `maskSecretValue`, and `safeLogger`.
  - Automatically redacts authorization headers, Bearer tokens, Telegram bot tokens, Discord/Slack webhook URLs, and API keys.

### SEC-05: Real Verification Matrix
* **Changes in `src/services/tokenVaultService.ts` & `src/services/connectors.ts`:**
  - Enforced live endpoint handshakes for all platforms (e.g. Telegram `getMe`, Discord test payload dispatch, eBay OAuth endpoint verification).
  - Platforms remain in `NOT_CONNECTED`, `APPROVAL_REQUIRED`, or `PARTNER_REQUIRED` until valid authorized tokens are verified against upstream APIs.

---

## 3. Regression Testing

Automated test suite `src/tests/securityRegression.test.ts` executes via `npm run test:security`:
* 4 of 4 test modules passing with 100% assertions verified.
* Zero plaintext tokens persisted to storage or transmitted to the client.
