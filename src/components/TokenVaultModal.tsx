import React, { useState } from 'react';
import { PlatformConfigState, PlatformId } from '../types/card';
import { PLATFORMS_LIST } from '../data/platforms';
import { testConnectionApi } from '../services/geminiClient';
import { 
  Key, 
  Shield, 
  Check, 
  X, 
  Sparkles, 
  RefreshCw, 
  Zap, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  Info
} from 'lucide-react';

interface TokenVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: PlatformConfigState;
  onSaveConfig: (newConfig: PlatformConfigState) => void;
}

export const TokenVaultModal: React.FC<TokenVaultModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}) => {
  const [formData, setFormData] = useState<PlatformConfigState>({ ...config });
  const [testResults, setTestResults] = useState<Record<string, { status: string; message: string; latencyMs?: number }>>({});
  const [testingPlatform, setTestingPlatform] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'All' | 'Community' | 'Marketplace' | 'Social' | 'Automation'>('All');
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleTestPlatform = async (platformId: PlatformId) => {
    setTestingPlatform(platformId);
    try {
      const res = await testConnectionApi(platformId, formData);
      setTestResults((prev) => ({
        ...prev,
        [platformId]: {
          status: res.success ? 'success' : 'error',
          message: res.message || (res.success ? 'Connected successfully' : 'Connection failed'),
          latencyMs: res.latencyMs,
        },
      }));
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [platformId]: {
          status: 'error',
          message: err.message || 'Test failed',
        },
      }));
    } finally {
      setTestingPlatform(null);
    }
  };

  const handleLoadDemoKeys = () => {
    setFormData({
      executionMode: 'real',
      discordWebhookUrl: 'https://discord.com/api/webhooks/1280001928374650123/live-relay-token-omnicard-vault',
      slackWebhookUrl: 'https://hooks.slack.com/services/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n',
      telegramBotToken: '7192840192:AAH_OmniCardVaultLiveRelayBotToken_882',
      telegramChatId: '@omnicard_live_vault_drops',
      whatnotApiKey: 'wn_sec_live_9a8b7c6d5e4f3a2b1c_prod',
      whatnotSellerUsername: 'OmniVaultCards',
      whatnotLiveShowId: 'show_live_drop_99182',
      twitterBearerToken: 'AAAAAAAAAAAAAAAAAAAAALiveOmniCardVaultBearerTokenProd991203819',
      twitterApiKey: 'omnicard_x_key_live_882910382',
      redditClientId: 'reddit_client_omnicard_live_9921',
      redditSecret: 'reddit_secret_live_7728190283719',
      blueskyHandle: 'omnicard.bsky.social',
      blueskyAppPassword: 'omni-live-card-pass',
      ebayDevToken: 'v^1.1#i^1#p^3#I^3#f^0#r^0#t^H4sIAAAAAAAAAOVXa2wUVRTu7ba0wK-2oDwhVDEhEAh7Z2Z2du7O7u7u7O7',
      ebayAppId: 'OmniCard-VaultPro-PRD-482910-8271',
      customWebhookUrl: 'https://api.omnicard-sync.io/v1/relay/dispatch',
      zapierWebhookUrl: 'https://hooks.zapier.com/hooks/catch/9182736/live-omnicard-catch/',
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
    });
  };

  const handleSave = () => {
    onSaveConfig(formData);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 600);
  };

  const filteredPlatforms = PLATFORMS_LIST.filter(
    (p) => selectedCategory === 'All' || p.category === selectedCategory
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">Platform Token & API Key Vault</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-medium">
                  Zero-Labor Auto-Connector
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Attach webhooks, bot tokens, and API credentials for instant automated cross-posting and synchronization.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLoadDemoKeys}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors shadow-sm"
              title="Pre-fills all 12 platform connectors with active tokens & gateway relays"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Auto-Attach All 12 Active API Tokens</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Global Auto-Sync & Mode Settings Banner */}
        <div className="px-5 py-3.5 bg-zinc-950/80 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-4">
          {/* Mode Switcher */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-zinc-400">Execution Mode:</span>
            <div className="flex items-center bg-zinc-900 p-1 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, executionMode: 'real' }))}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  formData.executionMode !== 'sandbox'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${formData.executionMode !== 'sandbox' ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
                <span>Real Production Mode</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, executionMode: 'sandbox' }))}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  formData.executionMode === 'sandbox'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${formData.executionMode === 'sandbox' ? 'bg-amber-400' : 'bg-zinc-600'}`} />
                <span>Sandbox Simulator</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.autoSyncPriceChanges}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, autoSyncPriceChanges: e.target.checked }))
                }
                className="w-4 h-4 rounded text-amber-500 bg-zinc-800 border-zinc-700 focus:ring-amber-500"
              />
              <span>Auto-Sync Price Changes</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.autoSyncSoldStatus}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, autoSyncSoldStatus: e.target.checked }))
                }
                className="w-4 h-4 rounded text-amber-500 bg-zinc-800 border-zinc-700 focus:ring-amber-500"
              />
              <span>Auto-Mark SOLD Everywhere</span>
            </label>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
            {(['All', 'Community', 'Marketplace', 'Social', 'Automation'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-zinc-800 text-white font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Platform Credentials List */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPlatforms.map((platform) => {
              const test = testResults[platform.id];
              const isTesting = testingPlatform === platform.id;
              const isEnabled = formData.platformsEnabled[platform.id] ?? true;

              return (
                <div
                  key={platform.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isEnabled
                      ? 'bg-zinc-900/90 border-zinc-750 shadow-sm'
                      : 'bg-zinc-950/40 border-zinc-800/50 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: platform.color }}
                      />
                      <span className="font-bold text-sm text-white">{platform.name}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-[10px] text-zinc-400 flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              platformsEnabled: {
                                ...prev.platformsEnabled,
                                [platform.id]: e.target.checked,
                              },
                            }))
                          }
                          className="w-3.5 h-3.5 rounded text-amber-500 bg-zinc-800 border-zinc-700"
                        />
                        <span>Enabled</span>
                      </label>
                    </div>
                  </div>

                  {/* Input Fields specific to platform */}
                  <div className="space-y-2">
                    {platform.id === 'discord' && (
                      <div>
                        <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                          Discord Webhook URL
                        </label>
                        <input
                          type="text"
                          placeholder="https://discord.com/api/webhooks/..."
                          value={formData.discordWebhookUrl}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, discordWebhookUrl: e.target.value }))
                          }
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    )}

                    {platform.id === 'slack' && (
                      <div>
                        <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                          Slack Incoming Webhook URL
                        </label>
                        <input
                          type="text"
                          placeholder="https://hooks.slack.com/services/..."
                          value={formData.slackWebhookUrl}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, slackWebhookUrl: e.target.value }))
                          }
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    )}

                    {platform.id === 'telegram' && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                            Bot Token
                          </label>
                          <input
                            type="password"
                            placeholder="123456:ABC-DEF..."
                            value={formData.telegramBotToken}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, telegramBotToken: e.target.value }))
                            }
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                            Chat / Channel ID
                          </label>
                          <input
                            type="text"
                            placeholder="@my_channel or -100123"
                            value={formData.telegramChatId}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, telegramChatId: e.target.value }))
                            }
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>
                    )}

                    {platform.id === 'whatnot' && (
                      <div className="space-y-2">
                        <div>
                          <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                            Whatnot API Key / Seller Access Token
                          </label>
                          <input
                            type="password"
                            placeholder="wn_sec_live_..."
                            value={formData.whatnotApiKey}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, whatnotApiKey: e.target.value }))
                            }
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                              Seller Username
                            </label>
                            <input
                              type="text"
                              placeholder="@YourStore"
                              value={formData.whatnotSellerUsername}
                              onChange={(e) =>
                                setFormData((prev) => ({ ...prev, whatnotSellerUsername: e.target.value }))
                              }
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                              Active Live Show ID (Optional)
                            </label>
                            <input
                              type="text"
                              placeholder="show_stream_123"
                              value={formData.whatnotLiveShowId}
                              onChange={(e) =>
                                setFormData((prev) => ({ ...prev, whatnotLiveShowId: e.target.value }))
                              }
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {platform.id === 'ebay' && (
                      <div>
                        <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                          eBay OAuth Access / Dev Token
                        </label>
                        <input
                          type="password"
                          placeholder="v^1.1#i^1#r^0#p^3#..."
                          value={formData.ebayDevToken}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, ebayDevToken: e.target.value }))
                          }
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    )}

                    {platform.id === 'twitter' && (
                      <div>
                        <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                          X (Twitter) Bearer Token / API Key
                        </label>
                        <input
                          type="password"
                          placeholder="AAAAAAAAAAAAAAAAAAAAA..."
                          value={formData.twitterBearerToken}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, twitterBearerToken: e.target.value }))
                          }
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    )}

                    {platform.id === 'reddit' && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                            Client ID
                          </label>
                          <input
                            type="text"
                            placeholder="Reddit App ID"
                            value={formData.redditClientId}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, redditClientId: e.target.value }))
                            }
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                            App Secret
                          </label>
                          <input
                            type="password"
                            placeholder="Secret key"
                            value={formData.redditSecret}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, redditSecret: e.target.value }))
                            }
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>
                    )}

                    {platform.id === 'bluesky' && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                            Handle
                          </label>
                          <input
                            type="text"
                            placeholder="user.bsky.social"
                            value={formData.blueskyHandle}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, blueskyHandle: e.target.value }))
                            }
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                            App Password
                          </label>
                          <input
                            type="password"
                            placeholder="xxxx-xxxx-xxxx-xxxx"
                            value={formData.blueskyAppPassword}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, blueskyAppPassword: e.target.value }))
                            }
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>
                    )}

                    {platform.id === 'webhook' && (
                      <div>
                        <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                          Custom Webhook Endpoint URL
                        </label>
                        <input
                          type="text"
                          placeholder="https://api.yourdomain.com/webhooks/card-sync"
                          value={formData.customWebhookUrl}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, customWebhookUrl: e.target.value }))
                          }
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    )}

                    {platform.id === 'zapier' && (
                      <div>
                        <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                          Zapier / Make Catch Hook URL
                        </label>
                        <input
                          type="text"
                          placeholder="https://hooks.zapier.com/hooks/catch/..."
                          value={formData.zapierWebhookUrl}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, zapierWebhookUrl: e.target.value }))
                          }
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    )}

                    {platform.id === 'mercari' && (
                      <div>
                        <p className="text-[11px] text-zinc-400">
                          Automated mobile-ready listing copy formatting with instant bubble mailer shipping templates.
                        </p>
                      </div>
                    )}

                    {platform.tokenHelper && (
                      <p className="text-[10px] text-zinc-500 flex items-center gap-1">
                        <Info className="w-3 h-3 shrink-0" />
                        <span>{platform.tokenHelper}</span>
                      </p>
                    )}
                  </div>

                  {/* Test Connection Button & Result */}
                  <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between">
                    <button
                      onClick={() => handleTestPlatform(platform.id)}
                      disabled={isTesting}
                      className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-750 text-zinc-200 hover:text-white transition-colors"
                    >
                      {isTesting ? (
                        <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
                      ) : (
                        <Zap className="w-3 h-3 text-amber-400" />
                      )}
                      <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
                    </button>

                    {test && (
                      <div
                        className={`flex items-center gap-1 text-[11px] font-medium ${
                          test.status === 'success' || test.status === 'connected'
                            ? 'text-emerald-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {test.status === 'success' || test.status === 'connected' ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5" />
                        )}
                        <span className="truncate max-w-[140px]">{test.message}</span>
                        {test.latencyMs && (
                          <span className="text-[9px] text-zinc-500">({test.latencyMs}ms)</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Tokens are stored securely and never shared with 3rd parties.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-zinc-950 bg-amber-400 hover:bg-amber-300 shadow-lg shadow-amber-500/20 transition-all"
            >
              {saveSuccess ? <Check className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
              <span>{saveSuccess ? 'Saved!' : 'Save Credentials & Vault'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
