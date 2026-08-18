import React, { useState, useEffect } from 'react';
import { PlatformConfigState, PlatformId, PlatformConnectionInfo } from '../types/card';
import { PLATFORMS_LIST, PlatformMeta } from '../data/platforms';
import { 
  testConnectionApi, 
  getVaultStatusApi, 
  saveCredentialsApi, 
  disconnectPlatformApi,
  verifyAllPlatformsApi
} from '../services/geminiClient';
import { 
  Key, 
  Shield, 
  Check, 
  X, 
  RefreshCw, 
  Zap, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  Lock,
  Globe,
  Sliders,
  Radio,
  ArrowRight,
  Trash2,
  CheckCheck,
  Eye,
  EyeOff
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
  const [connectionInfoMap, setConnectionInfoMap] = useState<Record<PlatformId, PlatformConnectionInfo>>(
    config.connectionStatuses || {} as any
  );
  const [activePlatformModal, setActivePlatformModal] = useState<PlatformMeta | null>(null);
  const [testingPlatform, setTestingPlatform] = useState<string | null>(null);
  const [isVerifyingAll, setIsVerifyingAll] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'All' | 'Marketplace' | 'Social' | 'Community' | 'Automation'>('All');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showSecretInputs, setShowSecretInputs] = useState<Record<string, boolean>>({});

  // Temporary credentials entered in connection modal
  const [tempCreds, setTempCreds] = useState<Record<string, string>>({});
  const [modalVerifyError, setModalVerifyError] = useState<string | null>(null);
  const [modalVerifySuccess, setModalVerifySuccess] = useState<string | null>(null);
  const [isModalConnecting, setIsModalConnecting] = useState(false);

  // Sync vault status on mount
  useEffect(() => {
    if (isOpen) {
      getVaultStatusApi()
        .then((res) => {
          if (res.success && res.statuses) {
            setConnectionInfoMap((prev) => ({ ...prev, ...res.statuses }));
          }
        })
        .catch((err) => console.error('Failed to load server vault status:', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleShowSecret = (field: string) => {
    setShowSecretInputs((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleTestPlatform = async (platformId: PlatformId) => {
    setTestingPlatform(platformId);
    try {
      const res = await testConnectionApi(platformId, formData);
      if (res.connectionInfo) {
        setConnectionInfoMap((prev) => ({
          ...prev,
          [platformId]: res.connectionInfo,
        }));
        setFormData((prev) => ({
          ...prev,
          connectionStatuses: {
            ...prev.connectionStatuses,
            [platformId]: res.connectionInfo,
          },
        }));
      }
    } catch (err: any) {
      console.error(`Error testing ${platformId}:`, err);
    } finally {
      setTestingPlatform(null);
    }
  };

  const handleVerifyAllPlatforms = async () => {
    setIsVerifyingAll(true);
    try {
      const res = await verifyAllPlatformsApi(formData);
      if (res.success && res.results) {
        setConnectionInfoMap(res.results);
        setFormData((prev) => ({
          ...prev,
          connectionStatuses: res.results,
        }));
      }
    } catch (err: any) {
      console.error('Failed to verify all platforms:', err);
    } finally {
      setIsVerifyingAll(false);
    }
  };

  const openConnectDrawer = (platform: PlatformMeta) => {
    setActivePlatformModal(platform);
    setModalVerifyError(null);
    setModalVerifySuccess(null);

    // Initialize temp credentials based on platform
    const current: Record<string, string> = {};
    if (platform.id === 'discord') current.discordWebhookUrl = formData.discordWebhookUrl || '';
    if (platform.id === 'telegram') {
      current.telegramBotToken = formData.telegramBotToken || '';
      current.telegramChatId = formData.telegramChatId || '';
    }
    if (platform.id === 'bluesky') {
      current.blueskyHandle = formData.blueskyHandle || '';
      current.blueskyAppPassword = formData.blueskyAppPassword || '';
    }
    if (platform.id === 'ebay') {
      current.ebayDevToken = formData.ebayDevToken || '';
      current.ebayEnvironment = formData.ebayEnvironment || 'production';
    }
    if (platform.id === 'twitter') current.twitterBearerToken = formData.twitterBearerToken || '';
    if (platform.id === 'reddit') {
      current.redditClientId = formData.redditClientId || '';
      current.redditSecret = formData.redditSecret || '';
    }
    if (platform.id === 'slack') current.slackWebhookUrl = formData.slackWebhookUrl || '';
    if (platform.id === 'zapier') current.zapierWebhookUrl = formData.zapierWebhookUrl || '';
    if (platform.id === 'webhook') current.customWebhookUrl = formData.customWebhookUrl || '';
    if (platform.id === 'whatnot') {
      current.whatnotApiKey = formData.whatnotApiKey || '';
      current.whatnotSellerUsername = formData.whatnotSellerUsername || '';
    }
    if (platform.id === 'tcgplayer') {
      current.tcgplayerPublicKey = formData.tcgplayerPublicKey || '';
      current.tcgplayerPrivateKey = formData.tcgplayerPrivateKey || '';
    }
    setTempCreds(current);
  };

  const handleSaveAndVerifyModal = async () => {
    if (!activePlatformModal) return;
    setIsModalConnecting(true);
    setModalVerifyError(null);
    setModalVerifySuccess(null);

    try {
      const saveRes = await saveCredentialsApi(activePlatformModal.id, tempCreds);
      if (saveRes.success && saveRes.connectionInfo) {
        const info: PlatformConnectionInfo = saveRes.connectionInfo;
        setConnectionInfoMap((prev) => ({ ...prev, [activePlatformModal.id]: info }));

        // Update formData
        const updatedConfig: PlatformConfigState = {
          ...formData,
          ...tempCreds,
          connectionStatuses: {
            ...formData.connectionStatuses,
            [activePlatformModal.id]: info,
          },
        };
        setFormData(updatedConfig);

        if (info.status === 'VERIFIED') {
          setModalVerifySuccess(`Verified and connected to ${info.accountName || activePlatformModal.name}!`);
          setTimeout(() => {
            setActivePlatformModal(null);
          }, 1200);
        } else {
          setModalVerifyError(info.lastError || 'Authentication failed. Please check credentials.');
        }
      } else {
        setModalVerifyError(saveRes.error || 'Failed to save credentials.');
      }
    } catch (err: any) {
      setModalVerifyError(err.message || 'Connection test failed.');
    } finally {
      setIsModalConnecting(false);
    }
  };

  const handleDisconnect = async (platformId: PlatformId) => {
    try {
      const res = await disconnectPlatformApi(platformId);
      if (res.success && res.connectionInfo) {
        setConnectionInfoMap((prev) => ({ ...prev, [platformId]: res.connectionInfo }));
        setFormData((prev) => {
          const next = { ...prev };
          if (platformId === 'discord') next.discordWebhookUrl = '';
          if (platformId === 'telegram') {
            next.telegramBotToken = '';
            next.telegramChatId = '';
          }
          if (platformId === 'bluesky') {
            next.blueskyHandle = '';
            next.blueskyAppPassword = '';
          }
          if (platformId === 'ebay') next.ebayDevToken = '';
          if (platformId === 'twitter') next.twitterBearerToken = '';
          if (platformId === 'reddit') {
            next.redditClientId = '';
            next.redditSecret = '';
          }
          if (platformId === 'slack') next.slackWebhookUrl = '';
          if (platformId === 'zapier') next.zapierWebhookUrl = '';
          if (platformId === 'webhook') next.customWebhookUrl = '';
          if (platformId === 'whatnot') {
            next.whatnotApiKey = '';
            next.whatnotSellerUsername = '';
          }
          next.connectionStatuses = {
            ...next.connectionStatuses,
            [platformId]: res.connectionInfo,
          };
          return next;
        });
      }
    } catch (err) {
      console.error(`Error disconnecting ${platformId}:`, err);
    }
  };

  const handleSave = () => {
    const finalConfig: PlatformConfigState = {
      ...formData,
      connectionStatuses: connectionInfoMap,
    };
    onSaveConfig(finalConfig);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 600);
  };

  const filteredPlatforms = PLATFORMS_LIST.filter(
    (p) => selectedCategory === 'All' || p.category === selectedCategory
  );

  const verifiedCount = (Object.values(connectionInfoMap) as (PlatformConnectionInfo | undefined)[]).filter(
    (c) => c?.status === 'VERIFIED'
  ).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">Platform Connection Manager</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center gap-1">
                  <CheckCheck className="w-3 h-3" />
                  <span>{verifiedCount} of 12 Connected</span>
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Authenticate official production credentials via OAuth, Bot Tokens, and Webhooks for card synchronization.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleVerifyAllPlatforms}
              disabled={isVerifyingAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-200 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 transition-colors shadow-sm"
              title="Queries all active platform endpoints to verify authentication status"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isVerifyingAll ? 'animate-spin' : ''}`} />
              <span>{isVerifyingAll ? 'Verifying All...' : 'Verify All Endpoints'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Global Auto-Sync & Publishing Mode Guard Banner */}
        <div className="px-5 py-3.5 bg-zinc-950/80 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-4">
          {/* Publishing Mode Radio Group */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-zinc-400 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span>Publishing Mode:</span>
            </span>
            <div className="flex items-center bg-zinc-900 p-1 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, publishingMode: 'DRY_RUN' }))}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  formData.publishingMode !== 'LIVE_PUBLISHING'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${formData.publishingMode !== 'LIVE_PUBLISHING' ? 'bg-blue-400' : 'bg-zinc-600'}`} />
                <span>Dry Run (Safe Validation)</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, publishingMode: 'LIVE_PUBLISHING' }))}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  formData.publishingMode === 'LIVE_PUBLISHING'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${formData.publishingMode === 'LIVE_PUBLISHING' ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
                <span>Live Publishing</span>
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
              <span>Sync Price Adjustments</span>
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
              <span>Delist When Marked Sold</span>
            </label>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
            {(['All', 'Marketplace', 'Social', 'Community', 'Automation'] as const).map((cat) => (
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

        {/* Platform Grid */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPlatforms.map((platform) => {
              const connInfo = connectionInfoMap[platform.id] || {
                status: platform.defaultClassification,
                authType: platform.authCategory === 'OAUTH' ? 'OAuth 2.0 (User PKCE)' : 'Developer API Key',
                environment: 'production',
                grantedScopes: [],
                refreshAvailable: false,
                readPermission: false,
                writePermission: false,
                listingPermission: false,
              };

              const isConnected = connInfo.status === 'VERIFIED';
              const isApprovalRequired = connInfo.status === 'APPROVAL_REQUIRED';
              const isPartnerRequired = connInfo.status === 'PARTNER_REQUIRED';
              const isManualExport = connInfo.status === 'MANUAL_EXPORT';
              const isTesting = testingPlatform === platform.id;
              const isEnabled = formData.platformsEnabled?.[platform.id] ?? true;

              return (
                <div
                  key={platform.id}
                  className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                    isConnected
                      ? 'bg-zinc-900/90 border-emerald-500/40 shadow-sm'
                      : isApprovalRequired || isPartnerRequired
                      ? 'bg-zinc-900/70 border-amber-500/30'
                      : 'bg-zinc-900/50 border-zinc-800'
                  } ${!isEnabled ? 'opacity-50' : ''}`}
                >
                  <div>
                    {/* Top Row: Platform Name + Status Badge */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: platform.color }}
                        />
                        <div>
                          <h4 className="font-bold text-sm text-white leading-tight">{platform.name}</h4>
                          <span className="text-[10px] text-zinc-400 capitalize">{platform.authCategory.toLowerCase()} auth</span>
                        </div>
                      </div>

                      <div>
                        {isConnected && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>VERIFIED</span>
                          </span>
                        )}
                        {isApprovalRequired && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold">
                            APPROVAL REQ.
                          </span>
                        )}
                        {isPartnerRequired && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold">
                            PRO PARTNER
                          </span>
                        )}
                        {isManualExport && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/30 font-semibold">
                            MANUAL EXPORT
                          </span>
                        )}
                        {!isConnected && !isApprovalRequired && !isPartnerRequired && !isManualExport && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 border border-zinc-700 font-medium">
                            NOT CONNECTED
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Account Details or Setup Guide snippet */}
                    <div className="my-3 py-2 px-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80 text-[11px] space-y-1">
                      {isConnected ? (
                        <>
                          <div className="text-zinc-200 font-semibold truncate flex items-center justify-between">
                            <span>Account:</span>
                            <span className="text-emerald-400 font-mono">{connInfo.accountName || connInfo.accountId}</span>
                          </div>
                          {connInfo.storeOrChannel && (
                            <div className="text-zinc-400 text-[10px] truncate">
                              {connInfo.storeOrChannel}
                            </div>
                          )}
                          {connInfo.latencyMs && (
                            <div className="text-zinc-500 text-[9px]">
                              Verified response: {connInfo.latencyMs}ms
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-zinc-400 text-[10px] leading-relaxed">
                          {platform.setupGuide || 'Configure credentials to enable live inventory push.'}
                        </div>
                      )}
                    </div>

                    {/* Granted Scopes / Permissions pills */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {platform.requiredScopes.slice(0, 3).map((scope) => (
                        <span
                          key={scope}
                          className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                            isConnected
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-zinc-800/60 text-zinc-400 border border-zinc-800'
                          }`}
                        >
                          {scope}
                        </span>
                      ))}
                      {platform.requiredScopes.length > 3 && (
                        <span className="text-[9px] text-zinc-500 px-1 py-0.5">
                          +{platform.requiredScopes.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="pt-2.5 border-t border-zinc-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {isConnected ? (
                        <>
                          <button
                            onClick={() => handleTestPlatform(platform.id)}
                            disabled={isTesting}
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
                            title="Verify live connection"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-amber-400' : ''}`} />
                          </button>
                          <button
                            onClick={() => handleDisconnect(platform.id)}
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                            title="Disconnect and clear token"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <a
                          href={platform.developerPortalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-200 transition-colors"
                        >
                          <span>Portal</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    <button
                      onClick={() => openConnectDrawer(platform)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        isConnected
                          ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-750 hover:text-white border border-zinc-750'
                          : 'bg-amber-400 text-zinc-950 hover:bg-amber-300 shadow-sm'
                      }`}
                    >
                      {isConnected ? (
                        <>
                          <Sliders className="w-3 h-3" />
                          <span>Settings</span>
                        </>
                      ) : (
                        <>
                          <ArrowRight className="w-3 h-3" />
                          <span>Connect</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span>Server-side encrypted token storage. Verified directly against official provider APIs.</span>
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
              <span>{saveSuccess ? 'Saved!' : 'Save & Close'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Individual Platform Connection Setup Drawer / Modal */}
      {activePlatformModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: activePlatformModal.color }}
                />
                <div>
                  <h3 className="font-bold text-base text-white">
                    Connect {activePlatformModal.name}
                  </h3>
                  <span className="text-xs text-zinc-400">
                    {activePlatformModal.authCategory} Authorization Flow
                  </span>
                </div>
              </div>
              <button
                onClick={() => setActivePlatformModal(null)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Setup instructions box */}
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 space-y-2">
                <div className="font-semibold text-zinc-200 flex items-center justify-between">
                  <span>Official Setup Guide:</span>
                  <a
                    href={activePlatformModal.developerPortalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-400 hover:text-amber-300 flex items-center gap-1 text-[11px]"
                  >
                    <span>Open Developer Portal</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-zinc-400 leading-relaxed">{activePlatformModal.setupGuide}</p>
              </div>

              {/* Scopes badge list */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Requested Scopes & Permissions
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {activePlatformModal.requiredScopes.map((scope) => (
                    <span
                      key={scope}
                      className="text-xs px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 font-mono text-zinc-300"
                    >
                      {scope}
                    </span>
                  ))}
                </div>
              </div>

              {/* Dynamic Credential Input Fields */}
              <div className="space-y-3 pt-2">
                {activePlatformModal.id === 'discord' && (
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Discord Webhook URL
                    </label>
                    <input
                      type="text"
                      placeholder="https://discord.com/api/webhooks/..."
                      value={tempCreds.discordWebhookUrl || ''}
                      onChange={(e) =>
                        setTempCreds((prev) => ({ ...prev, discordWebhookUrl: e.target.value }))
                      }
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                )}

                {activePlatformModal.id === 'telegram' && (
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-zinc-300">
                          Telegram Bot Token (from @BotFather)
                        </label>
                        <button
                          type="button"
                          onClick={() => toggleShowSecret('tgBot')}
                          className="text-[10px] text-zinc-400 hover:text-zinc-200"
                        >
                          {showSecretInputs.tgBot ? 'Hide' : 'Show'}
                        </button>
                      </div>
                      <input
                        type={showSecretInputs.tgBot ? 'text' : 'password'}
                        placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                        value={tempCreds.telegramBotToken || ''}
                        onChange={(e) =>
                          setTempCreds((prev) => ({ ...prev, telegramBotToken: e.target.value }))
                        }
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">
                        Channel Username or Chat ID
                      </label>
                      <input
                        type="text"
                        placeholder="@my_collector_cards or -100123456789"
                        value={tempCreds.telegramChatId || ''}
                        onChange={(e) =>
                          setTempCreds((prev) => ({ ...prev, telegramChatId: e.target.value }))
                        }
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                  </div>
                )}

                {activePlatformModal.id === 'bluesky' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">
                        Bluesky Handle
                      </label>
                      <input
                        type="text"
                        placeholder="username.bsky.social"
                        value={tempCreds.blueskyHandle || ''}
                        onChange={(e) =>
                          setTempCreds((prev) => ({ ...prev, blueskyHandle: e.target.value }))
                        }
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-zinc-300">
                          App Password (from bsky.app/settings/app-passwords)
                        </label>
                        <button
                          type="button"
                          onClick={() => toggleShowSecret('bsky')}
                          className="text-[10px] text-zinc-400 hover:text-zinc-200"
                        >
                          {showSecretInputs.bsky ? 'Hide' : 'Show'}
                        </button>
                      </div>
                      <input
                        type={showSecretInputs.bsky ? 'text' : 'password'}
                        placeholder="xxxx-xxxx-xxxx-xxxx"
                        value={tempCreds.blueskyAppPassword || ''}
                        onChange={(e) =>
                          setTempCreds((prev) => ({ ...prev, blueskyAppPassword: e.target.value }))
                        }
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                  </div>
                )}

                {activePlatformModal.id === 'ebay' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">
                        Environment
                      </label>
                      <select
                        value={tempCreds.ebayEnvironment || 'production'}
                        onChange={(e) =>
                          setTempCreds((prev) => ({ ...prev, ebayEnvironment: e.target.value }))
                        }
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="production">eBay Production Account</option>
                        <option value="sandbox">eBay Sandbox Developer Account</option>
                      </select>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-zinc-300">
                          eBay User OAuth Token
                        </label>
                        <button
                          type="button"
                          onClick={() => toggleShowSecret('ebay')}
                          className="text-[10px] text-zinc-400 hover:text-zinc-200"
                        >
                          {showSecretInputs.ebay ? 'Hide' : 'Show'}
                        </button>
                      </div>
                      <textarea
                        rows={3}
                        placeholder="v^1.1#i^1#p^3#..."
                        value={tempCreds.ebayDevToken || ''}
                        onChange={(e) =>
                          setTempCreds((prev) => ({ ...prev, ebayDevToken: e.target.value }))
                        }
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                  </div>
                )}

                {activePlatformModal.id === 'whatnot' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">
                        Whatnot Seller Username
                      </label>
                      <input
                        type="text"
                        placeholder="@SellerStore"
                        value={tempCreds.whatnotSellerUsername || ''}
                        onChange={(e) =>
                          setTempCreds((prev) => ({ ...prev, whatnotSellerUsername: e.target.value }))
                        }
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-zinc-300">
                          Approved Seller API Key
                        </label>
                        <button
                          type="button"
                          onClick={() => toggleShowSecret('whatnot')}
                          className="text-[10px] text-zinc-400 hover:text-zinc-200"
                        >
                          {showSecretInputs.whatnot ? 'Hide' : 'Show'}
                        </button>
                      </div>
                      <input
                        type={showSecretInputs.whatnot ? 'text' : 'password'}
                        placeholder="wn_sec_live_..."
                        value={tempCreds.whatnotApiKey || ''}
                        onChange={(e) =>
                          setTempCreds((prev) => ({ ...prev, whatnotApiKey: e.target.value }))
                        }
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                  </div>
                )}

                {activePlatformModal.id === 'twitter' && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-zinc-300">
                        X / Twitter Bearer Token
                      </label>
                      <button
                        type="button"
                        onClick={() => toggleShowSecret('xToken')}
                        className="text-[10px] text-zinc-400 hover:text-zinc-200"
                      >
                        {showSecretInputs.xToken ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    <input
                      type={showSecretInputs.xToken ? 'text' : 'password'}
                      placeholder="AAAAAAAAAAAAAAAAAAAAA..."
                      value={tempCreds.twitterBearerToken || ''}
                      onChange={(e) =>
                        setTempCreds((prev) => ({ ...prev, twitterBearerToken: e.target.value }))
                      }
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                )}

                {activePlatformModal.id === 'reddit' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">
                        Reddit Script App Client ID
                      </label>
                      <input
                        type="text"
                        placeholder="Reddit Client ID (under app title)"
                        value={tempCreds.redditClientId || ''}
                        onChange={(e) =>
                          setTempCreds((prev) => ({ ...prev, redditClientId: e.target.value }))
                        }
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-zinc-300">
                          Reddit App Secret
                        </label>
                        <button
                          type="button"
                          onClick={() => toggleShowSecret('redditSecret')}
                          className="text-[10px] text-zinc-400 hover:text-zinc-200"
                        >
                          {showSecretInputs.redditSecret ? 'Hide' : 'Show'}
                        </button>
                      </div>
                      <input
                        type={showSecretInputs.redditSecret ? 'text' : 'password'}
                        placeholder="Secret key"
                        value={tempCreds.redditSecret || ''}
                        onChange={(e) =>
                          setTempCreds((prev) => ({ ...prev, redditSecret: e.target.value }))
                        }
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                  </div>
                )}

                {activePlatformModal.id === 'slack' && (
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Slack Incoming Webhook URL
                    </label>
                    <input
                      type="text"
                      placeholder="https://hooks.slack.com/services/..."
                      value={tempCreds.slackWebhookUrl || ''}
                      onChange={(e) =>
                        setTempCreds((prev) => ({ ...prev, slackWebhookUrl: e.target.value }))
                      }
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                )}

                {activePlatformModal.id === 'zapier' && (
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Zapier / Make Catch Hook URL
                    </label>
                    <input
                      type="text"
                      placeholder="https://hooks.zapier.com/hooks/catch/..."
                      value={tempCreds.zapierWebhookUrl || ''}
                      onChange={(e) =>
                        setTempCreds((prev) => ({ ...prev, zapierWebhookUrl: e.target.value }))
                      }
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                )}

                {activePlatformModal.id === 'webhook' && (
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Custom HTTPS Webhook Endpoint URL
                    </label>
                    <input
                      type="text"
                      placeholder="https://api.yourdomain.com/webhooks/card-sync"
                      value={tempCreds.customWebhookUrl || ''}
                      onChange={(e) =>
                        setTempCreds((prev) => ({ ...prev, customWebhookUrl: e.target.value }))
                      }
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                )}

                {activePlatformModal.id === 'tcgplayer' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">
                        TCGplayer Public API Key
                      </label>
                      <input
                        type="text"
                        placeholder="Public Key from developer.tcgplayer.com"
                        value={tempCreds.tcgplayerPublicKey || ''}
                        onChange={(e) =>
                          setTempCreds((prev) => ({ ...prev, tcgplayerPublicKey: e.target.value }))
                        }
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">
                        TCGplayer Private API Key
                      </label>
                      <input
                        type="password"
                        placeholder="Private Secret"
                        value={tempCreds.tcgplayerPrivateKey || ''}
                        onChange={(e) =>
                          setTempCreds((prev) => ({ ...prev, tcgplayerPrivateKey: e.target.value }))
                        }
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                  </div>
                )}

                {activePlatformModal.id === 'mercari' && (
                  <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs text-blue-300">
                    Mercari does not offer open public seller listing APIs. BossLister generates 1-click clipboard listing exports with optimized titles, categories, and item conditions ready for instant pasting in the Mercari app.
                  </div>
                )}
              </div>

              {/* Status alerts */}
              {modalVerifyError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-start gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{modalVerifyError}</span>
                </div>
              )}

              {modalVerifySuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-start gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{modalVerifySuccess}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActivePlatformModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveAndVerifyModal}
                disabled={isModalConnecting}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-zinc-950 bg-amber-400 hover:bg-amber-300 shadow-md transition-all disabled:opacity-50"
              >
                {isModalConnecting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying Live...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Verify & Connect</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
