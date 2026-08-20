import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { EncryptedLocalVault } from '../services/credentialVault';
import { sanitizeClientPreferences, purgeDisallowedStorageKeys } from '../utils/storageSanitizer';
import { redactSecretsInObject, redactString } from '../utils/redact';

async function runSecurityRegressionTests() {
  console.log('🔒 Starting Security & Secret Leakage Regression Test Suite...\n');

  // TEST 1: EncryptedLocalVault AES-256-GCM Storage & Tamper Resistance
  console.log('▶ Test 1: EncryptedLocalVault persistence and cryptographic integrity');
  const testVaultDir = path.join(process.cwd(), '.vault_test');
  const testDataFile = path.join(testVaultDir, 'credentials.enc.json');

  try {
    if (fs.existsSync(testVaultDir)) {
      fs.rmSync(testVaultDir, { recursive: true, force: true });
    }

    const vault = new EncryptedLocalVault(testVaultDir);

    // Save secrets for discord and telegram
    await vault.set('discord', { webhookUrl: 'https://discord.com/api/webhooks/12345/secretTokenXYZ' });
    await vault.set('telegram', { botToken: '123456:ABC-DEF1234ghIkl-zyx57W2v1u', chatId: '@testchannel' });

    // Verify stored secrets match original
    const discordCreds = await vault.get('discord');
    assert.strictEqual(discordCreds?.webhookUrl, 'https://discord.com/api/webhooks/12345/secretTokenXYZ');

    const telegramCreds = await vault.get('telegram');
    assert.strictEqual(telegramCreds?.botToken, '123456:ABC-DEF1234ghIkl-zyx57W2v1u');
    assert.strictEqual(telegramCreds?.chatId, '@testchannel');

    // Verify vault raw file on disk is encrypted and does NOT contain plaintext secret
    const rawVaultFileContent = fs.readFileSync(testDataFile, 'utf8');
    assert.strictEqual(rawVaultFileContent.includes('secretTokenXYZ'), false, 'FATAL: Plaintext secret found in vault file!');
    assert.strictEqual(rawVaultFileContent.includes('ABC-DEF1234ghIkl-zyx57W2v1u'), false, 'FATAL: Plaintext token found in vault file!');

    const parsedRaw = JSON.parse(rawVaultFileContent);
    assert.ok(parsedRaw.records?.discord?.iv, 'Vault record must have initialization vector');
    assert.ok(parsedRaw.records?.discord?.authTag, 'Vault record must have authentication tag');
    assert.ok(parsedRaw.records?.discord?.ciphertext, 'Vault record must have ciphertext payload');

    // Tamper Test: Corrupt ciphertext and verify decryption returns null or throws instead of returning corrupt data
    const corruptedPayload = JSON.stringify({
      ...parsedRaw,
      records: {
        ...parsedRaw.records,
        discord: {
          ...parsedRaw.records.discord,
          ciphertext: parsedRaw.records.discord.ciphertext.slice(0, -4) + '0000',
        },
      },
    });
    fs.writeFileSync(testDataFile, corruptedPayload, 'utf8');

    let tamperCaught = false;
    try {
      await vault.get('discord');
    } catch (e: any) {
      tamperCaught = true;
      assert.ok(e.message.includes('Vault decryption error') || e.message.includes('authenticate data'));
    }
    assert.strictEqual(tamperCaught, true, 'Tampered vault record must fail authentication tag check and throw error');

    // Deletion / Purge test
    await vault.delete('discord');
    const afterDelete = await vault.get('discord');
    assert.strictEqual(afterDelete, null, 'Deleted platform credentials must return null');

    console.log('  ✔ EncryptedLocalVault test passed: AES-256-GCM encryption, tamper verification, and secure file storage verified.');
  } finally {
    if (fs.existsSync(testVaultDir)) {
      fs.rmSync(testVaultDir, { recursive: true, force: true });
    }
  }

  // TEST 2: Client Preferences Storage Sanitizer (Strip all secret keys)
  console.log('▶ Test 2: Storage Sanitizer eliminates secrets from client state');
  const dirtyClientPreferences = {
    executionMode: 'sandbox',
    publishingMode: 'DRY_RUN',
    autoSyncPriceChanges: true,
    autoSyncSoldStatus: true,
    platformsEnabled: { discord: true, ebay: true },
    // Secret fields that MUST be stripped:
    discordWebhookUrl: 'https://discord.com/api/webhooks/999/super_secret',
    telegramBotToken: '12345:bot_secret_token',
    telegramChatId: '12345',
    ebayDevToken: 'v^1.1#i^1#p^3#...ebay_secret_token',
    blueskyAppPassword: 'abcd-efgh-ijkl-mnop',
    tcgplayerPrivateKey: 'tcg_private_secret_key',
    whatnotApiKey: 'wn_sec_live_999999',
    connectionStatuses: {
      discord: {
        status: 'VERIFIED',
        accountName: 'Collector Channel',
      },
    },
  };

  const sanitized = sanitizeClientPreferences(dirtyClientPreferences);

  // Assert secret keys are not present in sanitized object
  assert.strictEqual('discordWebhookUrl' in sanitized, false, 'discordWebhookUrl must be stripped');
  assert.strictEqual('telegramBotToken' in sanitized, false, 'telegramBotToken must be stripped');
  assert.strictEqual('ebayDevToken' in sanitized, false, 'ebayDevToken must be stripped');
  assert.strictEqual('blueskyAppPassword' in sanitized, false, 'blueskyAppPassword must be stripped');
  assert.strictEqual('tcgplayerPrivateKey' in sanitized, false, 'tcgplayerPrivateKey must be stripped');
  assert.strictEqual('whatnotApiKey' in sanitized, false, 'whatnotApiKey must be stripped');

  // Assert safe non-secret fields remain intact
  assert.strictEqual(sanitized.executionMode, 'sandbox');
  assert.strictEqual(sanitized.publishingMode, 'DRY_RUN');
  assert.strictEqual(sanitized.autoSyncPriceChanges, true);
  assert.strictEqual((sanitized.connectionStatuses as any)?.discord?.accountName, 'Collector Channel');

  console.log('  ✔ Client Preferences Sanitizer passed: All credential fields stripped while preserving valid UI preferences.');

  // TEST 3: localStorage Key Purging Mock
  console.log('▶ Test 3: LocalStorage legacy key purging & allowlist enforcement');
  const mockStorage: Record<string, string> = {
    omnicard_vault_config_v1: '{"discordWebhookUrl":"https://discord.com/secret"}',
    legacy_auth_tokens: '{"token":"12345"}',
    omnicard_vault_cards_v1: '[{"id":"card-1"}]',
    omnicard_client_prefs_v1: '{"publishingMode":"DRY_RUN"}',
  };

  purgeDisallowedStorageKeys(
    (key) => mockStorage[key] !== undefined,
    (key) => delete mockStorage[key],
    () => Object.keys(mockStorage)
  );

  assert.strictEqual(mockStorage.omnicard_vault_config_v1, undefined, 'Legacy config key must be purged');
  assert.strictEqual(mockStorage.legacy_auth_tokens, undefined, 'Disallowed legacy tokens key must be purged');
  assert.ok(mockStorage.omnicard_vault_cards_v1, 'Allowed cards key must be preserved');
  assert.ok(mockStorage.omnicard_client_prefs_v1, 'Allowed preferences key must be preserved');

  console.log('  ✔ LocalStorage purging passed: Disallowed keys removed, allowed persistence keys preserved.');

  // TEST 4: Redaction Engine Verification
  console.log('▶ Test 4: Redaction Engine Masks Sensitive Data from Logs');
  const sampleLogPayload = {
    user: 'Collector123',
    cardId: 'card-psa-10',
    apiKey: 'sk_live_1234567890abcdef',
    telegramToken: '123456:AAABBBCCCDDDEEEFFF',
    webhookUrl: 'https://hooks.slack.com/services/T00/B00/SECRET_HOOK_123',
    authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token123',
    details: {
      password: 'mySuperSecretPassword!',
      clientSecret: 'secret_abcdef1234567890',
    },
  };

  const redacted = redactSecretsInObject(sampleLogPayload);
  assert.strictEqual(redacted.user, 'Collector123');
  assert.strictEqual(redacted.cardId, 'card-psa-10');
  assert.strictEqual(redacted.apiKey, 'sk_li...cdef');
  assert.strictEqual(redacted.telegramToken, '12345...EFFF');
  assert.strictEqual(redacted.webhookUrl, 'https..._123');
  assert.strictEqual(redacted.authorization, 'Beare...n123');
  assert.strictEqual(redacted.details.password, '[REDACTED_PASSWORD]');
  assert.strictEqual(redacted.details.clientSecret, 'secre...7890');

  // String redaction test
  const rawLogString = 'Connecting with Authorization: Bearer ghp_1234567890abcdef and token 123456:ABC-DEF1234ghIkl';
  const redactedString = redactString(rawLogString);
  assert.strictEqual(redactedString.includes('ghp_1234567890abcdef'), false);
  assert.strictEqual(redactedString.includes('Bearer [REDACTED_TOKEN]'), true);

  console.log('  ✔ Redaction Engine passed: Keys, passwords, tokens, and webhooks successfully masked.');

  console.log('\n✅ ALL 4 SECURITY REGRESSION TESTS PASSED SUCCESSFULLY!');
}

runSecurityRegressionTests().catch((err) => {
  console.error('❌ Security regression test failed:', err);
  process.exit(1);
});
