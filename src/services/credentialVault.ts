import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { PlatformId } from '../types/card';
import { redactString, safeLogger } from '../utils/redact';

/**
 * Standard CredentialVault interface for production-safe secret management.
 */
export interface CredentialVault {
  set(platform: PlatformId, credentials: Record<string, string>): Promise<void>;
  get(platform: PlatformId): Promise<Record<string, string> | null>;
  delete(platform: PlatformId): Promise<void>;
  has(platform: PlatformId): Promise<boolean>;
  getAllConfiguredPlatforms(): Promise<PlatformId[]>;
}

/**
 * Encrypted payload envelope stored on disk for local persistent vault.
 */
export interface EncryptedVaultRecord {
  platform: PlatformId;
  iv: string; // 12-byte random IV in hex
  authTag: string; // 16-byte GCM authentication tag in hex
  ciphertext: string; // AES-256-GCM ciphertext in hex
  keyVersion: string;
  updatedAt: string;
}

export interface EncryptedVaultFile {
  version: number;
  cipher: 'aes-256-gcm';
  records: Record<string, EncryptedVaultRecord>;
}

/**
 * AES-256-GCM Encrypted Local Persistent Vault Implementation.
 * Never writes plaintext credentials to disk.
 * Uses unique random IV for every write and verifies authentication tag on read.
 */
export class EncryptedLocalVault implements CredentialVault {
  private vaultFilePath: string;
  private masterKey: Buffer;
  private keyVersion: string;

  constructor(vaultDir?: string, customMasterKey?: string) {
    const baseDir = vaultDir || path.join(process.cwd(), '.vault');
    if (!fs.existsSync(baseDir)) {
      try {
        fs.mkdirSync(baseDir, { recursive: true, mode: 0o700 });
      } catch (err) {
        // Fallback for restricted environments
      }
    }

    this.vaultFilePath = path.join(baseDir, 'credentials.enc.json');
    this.keyVersion = 'v1';
    this.masterKey = this.resolveMasterKey(baseDir, customMasterKey);
  }

  /**
   * Resolves the 256-bit (32-byte) encryption key from:
   * 1. customMasterKey parameter (if passed)
   * 2. process.env.TOKEN_VAULT_MASTER_KEY
   * 3. Secure local key file in .vault/vault.key
   */
  private resolveMasterKey(baseDir: string, customKey?: string): Buffer {
    if (customKey) {
      return crypto.createHash('sha256').update(customKey).digest();
    }

    const envKey = process.env.TOKEN_VAULT_MASTER_KEY;
    if (envKey) {
      return crypto.createHash('sha256').update(envKey).digest();
    }

    // Dev fallback: local persistent key file
    const keyFilePath = path.join(baseDir, 'vault.key');
    if (fs.existsSync(keyFilePath)) {
      try {
        const savedHex = fs.readFileSync(keyFilePath, 'utf8').trim();
        if (savedHex.length === 64) {
          return Buffer.from(savedHex, 'hex');
        }
      } catch (e) {
        // regenerate if corrupted
      }
    }

    // Generate fresh 32-byte key for local environment
    const generatedKey = crypto.randomBytes(32);
    try {
      fs.writeFileSync(keyFilePath, generatedKey.toString('hex'), { mode: 0o600 });
      safeLogger.warn(
        '[Security Notice] No TOKEN_VAULT_MASTER_KEY found in environment. Generated local key in .vault/vault.key. For production, supply TOKEN_VAULT_MASTER_KEY or use Managed Secret Manager.'
      );
    } catch (e) {
      // In-memory key fallback if filesystem is strictly read-only
    }
    return generatedKey;
  }

  /**
   * Reads encrypted file from disk.
   */
  private readVaultFile(): EncryptedVaultFile {
    if (!fs.existsSync(this.vaultFilePath)) {
      return {
        version: 1,
        cipher: 'aes-256-gcm',
        records: {},
      };
    }

    try {
      const data = fs.readFileSync(this.vaultFilePath, 'utf8');
      return JSON.parse(data) as EncryptedVaultFile;
    } catch (err) {
      safeLogger.error('Failed to read encrypted vault file, initializing clean state:', err);
      return {
        version: 1,
        cipher: 'aes-256-gcm',
        records: {},
      };
    }
  }

  /**
   * Writes encrypted file to disk atomically.
   */
  private writeVaultFile(vaultData: EncryptedVaultFile): void {
    const serialized = JSON.stringify(vaultData, null, 2);
    const tempPath = `${this.vaultFilePath}.${Date.now()}.tmp`;
    try {
      fs.writeFileSync(tempPath, serialized, { mode: 0o600 });
      fs.renameSync(tempPath, this.vaultFilePath);
    } catch (err) {
      // Direct write fallback
      fs.writeFileSync(this.vaultFilePath, serialized, { mode: 0o600 });
    }
  }

  /**
   * Encrypts plaintext credentials using AES-256-GCM with a unique 12-byte random IV.
   */
  public async set(platform: PlatformId, credentials: Record<string, string>): Promise<void> {
    if (!credentials || Object.keys(credentials).length === 0) {
      await this.delete(platform);
      return;
    }

    // Generate random 12-byte IV (never reused)
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.masterKey, iv);

    const plaintext = JSON.stringify(credentials);
    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');

    const record: EncryptedVaultRecord = {
      platform,
      iv: iv.toString('hex'),
      authTag,
      ciphertext,
      keyVersion: this.keyVersion,
      updatedAt: new Date().toISOString(),
    };

    const vaultData = this.readVaultFile();
    vaultData.records[platform] = record;
    this.writeVaultFile(vaultData);
  }

  /**
   * Decrypts and authenticates stored credentials using AES-256-GCM.
   * Throws error if ciphertext or authentication tag is tampered.
   */
  public async get(platform: PlatformId): Promise<Record<string, string> | null> {
    const vaultData = this.readVaultFile();
    const record = vaultData.records[platform];

    if (!record) {
      return null;
    }

    try {
      const iv = Buffer.from(record.iv, 'hex');
      const authTag = Buffer.from(record.authTag, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-gcm', this.masterKey, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(record.ciphertext, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted);
    } catch (err: any) {
      safeLogger.error(
        `[Security Alert] Decryption failed for platform "${platform}". Authentication tag verification failed or invalid key:`,
        redactString(err.message)
      );
      throw new Error(`Vault decryption error for ${platform}: Invalid authentication tag or key.`);
    }
  }

  /**
   * Deletes a platform's encrypted record from the vault.
   */
  public async delete(platform: PlatformId): Promise<void> {
    const vaultData = this.readVaultFile();
    if (vaultData.records[platform]) {
      delete vaultData.records[platform];
      this.writeVaultFile(vaultData);
    }
  }

  /**
   * Checks whether the vault contains credentials for the given platform.
   */
  public async has(platform: PlatformId): Promise<boolean> {
    const vaultData = this.readVaultFile();
    return Boolean(vaultData.records[platform]);
  }

  /**
   * Returns list of all platform IDs currently stored in the vault.
   */
  public async getAllConfiguredPlatforms(): Promise<PlatformId[]> {
    const vaultData = this.readVaultFile();
    return Object.keys(vaultData.records) as PlatformId[];
  }
}

/**
 * Production Managed Secret Manager Adapter Stub (e.g. Google Secret Manager / AWS Secrets Manager / Azure Key Vault).
 * Plugs directly into CredentialVault interface.
 */
export class ManagedSecretManagerVaultAdapter implements CredentialVault {
  private localFallback: EncryptedLocalVault;

  constructor(vaultDir?: string) {
    this.localFallback = new EncryptedLocalVault(vaultDir);
  }

  async set(platform: PlatformId, credentials: Record<string, string>): Promise<void> {
    // In production with cloud provider, dispatches to secretmanager.createSecret/addSecretVersion
    return this.localFallback.set(platform, credentials);
  }

  async get(platform: PlatformId): Promise<Record<string, string> | null> {
    // In production with cloud provider, reads from secretmanager.accessSecretVersion
    return this.localFallback.get(platform);
  }

  async delete(platform: PlatformId): Promise<void> {
    return this.localFallback.delete(platform);
  }

  async has(platform: PlatformId): Promise<boolean> {
    return this.localFallback.has(platform);
  }

  async getAllConfiguredPlatforms(): Promise<PlatformId[]> {
    return this.localFallback.getAllConfiguredPlatforms();
  }
}

// Global singleton instance
let defaultVaultInstance: CredentialVault | null = null;

export function getDefaultVault(): CredentialVault {
  if (!defaultVaultInstance) {
    defaultVaultInstance = new EncryptedLocalVault();
  }
  return defaultVaultInstance;
}

export function resetDefaultVault(instance?: CredentialVault): void {
  defaultVaultInstance = instance || null;
}
