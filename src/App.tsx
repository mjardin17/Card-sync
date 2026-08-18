import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { CardItem, PlatformConfigState, SyncLogEntry, PlatformId } from './types/card';
import { CurrencyCode } from './utils/currencyAndShipping';
import { SAMPLE_CARDS, DEFAULT_PLATFORM_CONFIG } from './data/sampleCards';
import { PLATFORMS_LIST } from './data/platforms';
import { dispatchPlatformApi } from './services/geminiClient';
import { Navbar } from './components/Navbar';
import { CardInventoryGrid } from './components/CardInventoryGrid';
import { CardScannerModal } from './components/CardScannerModal';
import { CardDetailModal } from './components/CardDetailModal';
import { TokenVaultModal } from './components/TokenVaultModal';
import { SyncActivityDrawer } from './components/SyncActivityDrawer';
import { BatchBulkScannerModal } from './components/BatchBulkScannerModal';
import { OfferNegotiatorModal } from './components/OfferNegotiatorModal';
import { CardWatermarkGalleryModal } from './components/CardWatermarkGalleryModal';
import { CardShowPrintModal } from './components/CardShowPrintModal';

const LOCAL_STORAGE_CARDS_KEY = 'omnicard_vault_cards_v1';
const LOCAL_STORAGE_CONFIG_KEY = 'omnicard_vault_config_v1';
const LOCAL_STORAGE_LOGS_KEY = 'omnicard_vault_logs_v1';
const LOCAL_STORAGE_CURRENCY_KEY = 'omnicard_vault_currency_v1';

export default function App() {
  // Application State
  const [cards, setCards] = useState<CardItem[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_CARDS_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error loading cards from storage:', e);
      }
    }
    return SAMPLE_CARDS;
  });

  const [config, setConfig] = useState<PlatformConfigState>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_CONFIG_KEY);
    if (saved) {
      try {
        return { ...DEFAULT_PLATFORM_CONFIG, ...JSON.parse(saved) };
      } catch (e) {
        console.error('Error loading config from storage:', e);
      }
    }
    return DEFAULT_PLATFORM_CONFIG;
  });

  const [currency, setCurrency] = useState<CurrencyCode>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_CURRENCY_KEY);
    return (saved as CurrencyCode) || 'USD';
  });

  const [logs, setLogs] = useState<SyncLogEntry[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_LOGS_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error loading logs from storage:', e);
      }
    }
    return [
      {
        id: 'log-init-1',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        cardId: 'card-charizard-1999',
        cardTitle: '1999 Pokémon Base Set Charizard Holo 1st Edition PSA 9',
        platform: 'discord',
        action: 'create',
        status: 'success',
        message: 'Dispatched Rich Embed to Discord Drop Channel',
        latencyMs: 142,
      },
      {
        id: 'log-init-2',
        timestamp: new Date(Date.now() - 3500000).toISOString(),
        cardId: 'card-charizard-1999',
        cardTitle: '1999 Pokémon Base Set Charizard Holo 1st Edition PSA 9',
        platform: 'ebay',
        action: 'create',
        status: 'simulated',
        message: 'Created eBay draft listing with SEO specifics',
        latencyMs: 210,
      },
    ];
  });

  // UI Modals & Selection State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isBatchScannerOpen, setIsBatchScannerOpen] = useState(false);
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [isActivityDrawerOpen, setIsActivityDrawerOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<CardItem | null>(null);

  // Additional Special Feature Modals
  const [negotiatingCard, setNegotiatingCard] = useState<CardItem | null>(null);
  const [watermarkingCard, setWatermarkingCard] = useState<CardItem | null>(null);
  const [printingCard, setPrintingCard] = useState<CardItem | null>(null);

  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncingCardId, setSyncingCardId] = useState<string | null>(null);
  const [syncingPlatform, setSyncingPlatform] = useState<PlatformId | null>(null);
  const [unreadLogsCount, setUnreadLogsCount] = useState(0);

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_CARDS_KEY, JSON.stringify(cards));
  }, [cards]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_CONFIG_KEY, JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_LOGS_KEY, JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_CURRENCY_KEY, currency);
  }, [currency]);

  // Trigger celebration confetti
  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 75,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#F1C40F', '#10B981', '#3B82F6', '#E11D48'],
      });
    } catch (e) {
      // ignore
    }
  };

  const addLog = (logData: Omit<SyncLogEntry, 'id' | 'timestamp'>) => {
    const newEntry: SyncLogEntry = {
      ...logData,
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
    };
    setLogs((prev) => [newEntry, ...prev.slice(0, 199)]);
    setUnreadLogsCount((prev) => prev + 1);
  };

  // Cross-Post single card across all enabled platforms
  const handleCrossPostAll = async (card: CardItem) => {
    setSyncingCardId(card.id);
    const enabledPlatforms = PLATFORMS_LIST.filter(
      (p) => config.platformsEnabled[p.id] !== false
    );

    let updatedListings = { ...card.listings };

    for (const platform of enabledPlatforms) {
      setSyncingPlatform(platform.id);
      try {
        const res = await dispatchPlatformApi({
          platform: platform.id,
          config,
          card,
          listingContent: card.generatedListings,
          action: 'post',
        });

        updatedListings[platform.id] = {
          status: 'synced',
          lastSyncedAt: new Date().toISOString(),
          listingId: res.listingId,
          responseData: res.payload,
        };

        addLog({
          cardId: card.id,
          cardTitle: card.title,
          platform: platform.id,
          action: 'create',
          status: res.status === 'live_synced' ? 'success' : 'simulated',
          message: res.message || `Dispatched to ${platform.name}`,
          latencyMs: res.latencyMs,
        });
      } catch (err: any) {
        updatedListings[platform.id] = {
          status: 'error',
          error: err.message,
        };
        addLog({
          cardId: card.id,
          cardTitle: card.title,
          platform: platform.id,
          action: 'create',
          status: 'failed',
          message: `Failed to dispatch to ${platform.name}: ${err.message}`,
        });
      }
    }

    const updatedCard: CardItem = {
      ...card,
      listings: updatedListings,
      syncStatus: 'synced',
      updatedAt: new Date().toISOString(),
    };

    setCards((prev) => prev.map((c) => (c.id === card.id ? updatedCard : c)));
    if (selectedCard && selectedCard.id === card.id) {
      setSelectedCard(updatedCard);
    }

    setSyncingCardId(null);
    setSyncingPlatform(null);
    triggerConfetti();
  };

  // Cross-Post single card to a specific platform
  const handleCrossPostSingle = async (card: CardItem, platformId: PlatformId) => {
    setSyncingPlatform(platformId);
    try {
      const res = await dispatchPlatformApi({
        platform: platformId,
        config,
        card,
        listingContent: card.generatedListings,
        action: 'post',
      });

      const updatedCard: CardItem = {
        ...card,
        listings: {
          ...card.listings,
          [platformId]: {
            status: 'synced',
            lastSyncedAt: new Date().toISOString(),
            listingId: res.listingId,
            responseData: res.payload,
          },
        },
        updatedAt: new Date().toISOString(),
      };

      setCards((prev) => prev.map((c) => (c.id === card.id ? updatedCard : c)));
      if (selectedCard && selectedCard.id === card.id) {
        setSelectedCard(updatedCard);
      }

      addLog({
        cardId: card.id,
        cardTitle: card.title,
        platform: platformId,
        action: 'create',
        status: res.status === 'live_synced' ? 'success' : 'simulated',
        message: res.message || `Dispatched to ${platformId}`,
        latencyMs: res.latencyMs,
      });

      triggerConfetti();
    } catch (err: any) {
      addLog({
        cardId: card.id,
        cardTitle: card.title,
        platform: platformId,
        action: 'create',
        status: 'failed',
        message: `Error posting to ${platformId}: ${err.message}`,
      });
    } finally {
      setSyncingPlatform(null);
    }
  };

  // Sync Price Changes across all connected channels
  const handleSyncPriceChange = async (card: CardItem, newPrice: number) => {
    const updatedCard: CardItem = {
      ...card,
      askingPrice: newPrice,
      updatedAt: new Date().toISOString(),
    };

    setCards((prev) => prev.map((c) => (c.id === card.id ? updatedCard : c)));
    if (selectedCard && selectedCard.id === card.id) {
      setSelectedCard(updatedCard);
    }

    if (config.autoSyncPriceChanges) {
      for (const platform of PLATFORMS_LIST) {
        if (card.listings[platform.id]?.status === 'synced') {
          try {
            const res = await dispatchPlatformApi({
              platform: platform.id,
              config,
              card: updatedCard,
              action: 'update',
            });
            addLog({
              cardId: card.id,
              cardTitle: card.title,
              platform: platform.id,
              action: 'update_price',
              status: res.status === 'live_synced' ? 'success' : 'simulated',
              message: `Synced price update to $${newPrice} on ${platform.name}`,
              latencyMs: res.latencyMs,
            });
          } catch (e) {
            // ignore
          }
        }
      }
    }
  };

  // Mark card as SOLD and sync status across all channels
  const handleMarkSold = async (card: CardItem) => {
    const updatedCard: CardItem = {
      ...card,
      status: 'sold',
      soldPrice: card.askingPrice,
      updatedAt: new Date().toISOString(),
    };

    setCards((prev) => prev.map((c) => (c.id === card.id ? updatedCard : c)));
    if (selectedCard && selectedCard.id === card.id) {
      setSelectedCard(updatedCard);
    }

    if (config.autoSyncSoldStatus) {
      for (const platform of PLATFORMS_LIST) {
        if (card.listings[platform.id]?.status === 'synced') {
          try {
            const res = await dispatchPlatformApi({
              platform: platform.id,
              config,
              card: updatedCard,
              action: 'sold',
            });
            addLog({
              cardId: card.id,
              cardTitle: card.title,
              platform: platform.id,
              action: 'mark_sold',
              status: res.status === 'live_synced' ? 'success' : 'simulated',
              message: `Marked as SOLD on ${platform.name} and synced availability`,
              latencyMs: res.latencyMs,
            });
          } catch (e) {
            // ignore
          }
        }
      }
    }

    triggerConfetti();
  };

  // Batch Sync all active cards in vault
  const handleCrossPostAllBatch = async () => {
    setIsSyncingAll(true);
    const activeCards = cards.filter((c) => c.status !== 'sold');

    for (const card of activeCards) {
      await handleCrossPostAll(card);
    }

    setIsSyncingAll(false);
    triggerConfetti();
  };

  // Delete Card
  const handleDeleteCard = (cardId: string) => {
    setCards((prev) => prev.filter((c) => c.id !== cardId));
    if (selectedCard && selectedCard.id === cardId) {
      setSelectedCard(null);
    }
  };

  // Add newly identified card from scanner
  const handleCardAdded = (newCard: CardItem, autoCrossPost: boolean) => {
    setCards((prev) => [newCard, ...prev]);
    setSelectedCard(newCard);

    addLog({
      cardId: newCard.id,
      cardTitle: newCard.title,
      platform: 'webhook',
      action: 'create',
      status: 'success',
      message: `AI Identified & Appraised Card: Worth $${newCard.estimatedWorth?.fairMarketValue || newCard.askingPrice}`,
    });

    if (autoCrossPost) {
      handleCrossPostAll(newCard);
    }
  };

  // Batch Bulk Import of multiple cards
  const handleBatchCardsAdded = (newCards: CardItem[], autoSync: boolean) => {
    setCards((prev) => [...newCards, ...prev]);
    
    addLog({
      cardId: 'batch-import',
      cardTitle: `Batch of ${newCards.length} Cards`,
      platform: 'webhook',
      action: 'create',
      status: 'success',
      message: `Batch Imported ${newCards.length} items to vault`,
    });

    if (autoSync) {
      for (const c of newCards) {
        handleCrossPostAll(c);
      }
    } else {
      triggerConfetti();
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-amber-400 selection:text-zinc-950 flex flex-col">
      {/* Top Navbar */}
      <Navbar
        cards={cards}
        config={config}
        currency={currency}
        onCurrencyChange={(c) => setCurrency(c)}
        onToggleExecutionMode={() => {
          setConfig((prev) => {
            const nextMode = prev.executionMode === 'sandbox' ? 'real' : 'sandbox';
            addLog({
              cardId: 'system',
              cardTitle: 'System Setting',
              platform: 'webhook',
              action: 'test',
              status: 'success',
              message: `Switched execution engine to ${nextMode === 'real' ? 'REAL LIVE PRODUCTION MODE' : 'SANDBOX SIMULATOR'}`,
            });
            return { ...prev, executionMode: nextMode };
          });
        }}
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenBatchScanner={() => setIsBatchScannerOpen(true)}
        onOpenVault={() => setIsVaultOpen(true)}
        onOpenActivityDrawer={() => {
          setIsActivityDrawerOpen(true);
          setUnreadLogsCount(0);
        }}
        onCrossPostAllCards={handleCrossPostAllBatch}
        isSyncingAll={isSyncingAll}
        unreadLogsCount={unreadLogsCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        <CardInventoryGrid
          cards={cards}
          currency={currency}
          onSelectCard={(card) => setSelectedCard(card)}
          onOpenScanner={() => setIsScannerOpen(true)}
          onOpenBatchScanner={() => setIsBatchScannerOpen(true)}
          onCrossPostAll={handleCrossPostAll}
          onCrossPostAllBatch={handleCrossPostAllBatch}
          isSyncingAll={isSyncingAll}
        />
      </main>

      {/* Modals & Drawers */}
      <CardScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onCardAdded={handleCardAdded}
      />

      <BatchBulkScannerModal
        isOpen={isBatchScannerOpen}
        onClose={() => setIsBatchScannerOpen(false)}
        onAddCards={handleBatchCardsAdded}
        currentCards={cards}
      />

      <TokenVaultModal
        isOpen={isVaultOpen}
        onClose={() => setIsVaultOpen(false)}
        config={config}
        onSaveConfig={(newConfig) => setConfig(newConfig)}
      />

      <CardDetailModal
        card={selectedCard}
        isOpen={Boolean(selectedCard)}
        onClose={() => setSelectedCard(null)}
        config={config}
        currency={currency}
        onCurrencyChange={(c) => setCurrency(c)}
        onUpdateCard={(updated) => {
          setCards((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
          setSelectedCard(updated);
        }}
        onDeleteCard={handleDeleteCard}
        onCrossPostAll={handleCrossPostAll}
        onCrossPostSingle={handleCrossPostSingle}
        onSyncPriceChange={handleSyncPriceChange}
        onMarkSold={handleMarkSold}
        onOpenOfferNegotiator={(c) => setNegotiatingCard(c)}
        onOpenWatermarkModal={(c) => setWatermarkingCard(c)}
        onOpenPrintModal={(c) => setPrintingCard(c)}
        isSyncing={Boolean(syncingCardId)}
        syncingPlatform={syncingPlatform}
      />

      {/* AI Offer Assistant Modal */}
      <OfferNegotiatorModal
        isOpen={Boolean(negotiatingCard)}
        onClose={() => setNegotiatingCard(null)}
        card={negotiatingCard}
        currency={currency}
      />

      {/* Anti-Scam Watermarking Studio Modal */}
      <CardWatermarkGalleryModal
        isOpen={Boolean(watermarkingCard)}
        onClose={() => setWatermarkingCard(null)}
        card={watermarkingCard}
      />

      {/* Card Show Printable Labels & Slabs Modal */}
      <CardShowPrintModal
        isOpen={Boolean(printingCard)}
        onClose={() => setPrintingCard(null)}
        card={printingCard}
        currency={currency}
      />

      <SyncActivityDrawer
        isOpen={isActivityDrawerOpen}
        onClose={() => setIsActivityDrawerOpen(false)}
        logs={logs}
        onClearLogs={() => setLogs([])}
      />
    </div>
  );
}
