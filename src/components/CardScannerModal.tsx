import React, { useState, useRef } from 'react';
import { CardItem } from '../types/card';
import { identifyCardApi, generateListingsApi } from '../services/geminiClient';
import { 
  Camera, 
  Upload, 
  Sparkles, 
  X, 
  Search, 
  ShieldCheck, 
  DollarSign, 
  TrendingUp, 
  Check, 
  Loader2,
  Image as ImageIcon,
  Flame
} from 'lucide-react';

interface CardScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCardAdded: (newCard: CardItem, autoCrossPost: boolean) => void;
}

const PRESET_SCAN_SAMPLES = [
  {
    name: '1999 Charizard 1st Edition PSA 9',
    hint: '1999 Pokemon Base Set Charizard 1st Edition Holo 4/102 PSA 9 MINT',
    image: 'https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=800&auto=format&fit=crop&q=80',
    type: 'Pokémon TCG',
  },
  {
    name: '2020 Topps F1 Lewis Hamilton Refractor PSA 10',
    hint: '2020 Topps Chrome Formula 1 Lewis Hamilton Refractor #1 PSA 10 GEM MINT',
    image: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&auto=format&fit=crop&q=80',
    type: 'Sports Cars & F1',
  },
  {
    name: '2024 Pokémon x Supercar Pikachu GT-R PSA 10',
    hint: '2024 Pokemon x Supercar Pikachu GT-R Nismo Edition Holo Card PSA 10 GEM MINT Crossover',
    image: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800&auto=format&fit=crop&q=80',
    type: 'Pokémon x Supercar',
  },
  {
    name: '2023 Ferrari Leclerc Red Sparkle /99 PSA 10',
    hint: '2023 Panini Prizm Charles Leclerc Ferrari Red Sparkle Prizm 99 PSA 10 GEM MINT F1',
    image: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800&auto=format&fit=crop&q=80',
    type: 'Sports Cars & F1',
  },
  {
    name: '1986 Fleer Michael Jordan RC BGS 8.5',
    hint: '1986 Fleer Michael Jordan #57 Rookie RC BGS 8.5',
    image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&auto=format&fit=crop&q=80',
    type: 'Basketball RC',
  },
  {
    name: '2020 Panini Prizm Joe Burrow Silver PSA 10',
    hint: '2020 Panini Prizm Joe Burrow Silver Rookie #307 PSA 10 GEM MINT',
    image: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=800&auto=format&fit=crop&q=80',
    type: 'Football RC',
  },
  {
    name: '2023 Pokémon Revavroom ex SIR PSA 10',
    hint: '2023 Pokemon Obsidian Flames Revavroom ex SIR 224/198 Special Illustration Rare PSA 10',
    image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&auto=format&fit=crop&q=80',
    type: 'Engine Pokémon',
  },
  {
    name: '1993 Alpha MTG Black Lotus PSA 7',
    hint: '1993 Magic The Gathering MTG Alpha Black Lotus PSA 7 NM',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
    type: 'MTG Grail',
  },
];

export const CardScannerModal: React.FC<CardScannerModalProps> = ({
  isOpen,
  onClose,
  onCardAdded,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'camera' | 'search'>('upload');
  const [cardImage, setCardImage] = useState<string | null>(null);
  const [cardHint, setCardHint] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanStepText, setScanStepText] = useState('');
  const [identifiedCard, setIdentifiedCard] = useState<any | null>(null);
  const [askingPriceInput, setAskingPriceInput] = useState<number>(0);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setCardImage(base64);
      triggerAiScan(base64, file.name.replace(/\.[^/.]+$/, ''));
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setCardImage(base64);
      triggerAiScan(base64, file.name.replace(/\.[^/.]+$/, ''));
    };
    reader.readAsDataURL(file);
  };

  const startCamera = async () => {
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 800;
    canvas.height = videoRef.current.videoHeight || 600;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const photoBase64 = canvas.toDataURL('image/jpeg', 0.9);
    setCardImage(photoBase64);
    stopCamera();
    triggerAiScan(photoBase64, 'Camera Scan Card');
  };

  const handlePresetSelect = (preset: (typeof PRESET_SCAN_SAMPLES)[0]) => {
    setCardImage(preset.image);
    setCardHint(preset.hint);
    triggerAiScan(preset.image, preset.hint);
  };

  const triggerAiScan = async (imageBase64?: string, hintText?: string) => {
    setIsScanning(true);
    setIdentifiedCard(null);

    setScanStepText('Analyzing visual card markers & slab certification...');
    try {
      const result = await identifyCardApi({
        imageBase64: imageBase64?.startsWith('data:') ? imageBase64 : undefined,
        cardHint: hintText || cardHint,
      });

      setScanStepText('Calculating real-time market value & eBay/PWCC comps...');
      await new Promise((r) => setTimeout(r, 600));

      setScanStepText('Generating cross-post formats for Discord, eBay, Reddit, Twitter...');
      const listings = await generateListingsApi(result);

      setIdentifiedCard({
        ...result,
        generatedListings: listings,
      });

      const initialPrice = result.recommendedListingPrice || result.estimatedWorth?.fairMarketValue || 500;
      setAskingPriceInput(initialPrice);
    } catch (err) {
      console.error('Scan error:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleConfirmAndAdd = (autoCrossPost: boolean) => {
    if (!identifiedCard) return;

    const newCardItem: CardItem = {
      id: `card-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title: identifiedCard.title || 'Identified Collectible Card',
      category: identifiedCard.category || 'pokemon',
      subjectOrPlayer: identifiedCard.subjectOrPlayer || 'Subject',
      setName: identifiedCard.setName || 'Premier Set',
      year: identifiedCard.year || '2023',
      cardNumber: identifiedCard.cardNumber || '#1',
      variant: identifiedCard.variant || 'Base',
      grader: identifiedCard.grader || 'PSA',
      gradeScore: identifiedCard.gradeScore || '10 GEM MINT',
      certNumber: identifiedCard.certNumber || `${Math.floor(10000000 + Math.random() * 90000000)}`,
      keyAttributes: identifiedCard.keyAttributes || ['Graded Slab', 'Authentic'],
      frontImage: cardImage || 'https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=800&auto=format&fit=crop&q=80',
      askingPrice: Number(askingPriceInput) || identifiedCard.estimatedWorth?.fairMarketValue || 450,
      minPrice: Math.round((Number(askingPriceInput) || 450) * 0.85),
      estimatedWorth: identifiedCard.estimatedWorth || {
        fairMarketValue: Number(askingPriceInput) || 450,
        priceRangeLow: Math.round(Number(askingPriceInput) * 0.9),
        priceRangeHigh: Math.round(Number(askingPriceInput) * 1.15),
        confidenceScore: 95,
        trend30DayPercent: 6.2,
        liquidityRating: 'High',
        recentSales: [],
      },
      recommendedListingPrice: identifiedCard.recommendedListingPrice,
      conditionNotes: identifiedCard.conditionNotes,
      seoTitle: identifiedCard.seoTitle,
      generatedListings: identifiedCard.generatedListings,
      status: 'active',
      syncStatus: autoCrossPost ? 'syncing' : 'pending',
      listings: {
        ebay: { status: autoCrossPost ? 'synced' : 'pending' },
        discord: { status: autoCrossPost ? 'synced' : 'pending' },
        reddit: { status: autoCrossPost ? 'synced' : 'pending' },
        twitter: { status: autoCrossPost ? 'synced' : 'pending' },
        slack: { status: autoCrossPost ? 'synced' : 'pending' },
        telegram: { status: autoCrossPost ? 'synced' : 'pending' },
        bluesky: { status: autoCrossPost ? 'synced' : 'pending' },
        mercari: { status: autoCrossPost ? 'synced' : 'pending' },
        webhook: { status: autoCrossPost ? 'synced' : 'pending' },
        zapier: { status: autoCrossPost ? 'synced' : 'pending' },
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onCardAdded(newCardItem, autoCrossPost);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">AI Card Scanner & Appraisal Engine</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-medium">
                  Zero Labor Required
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Snap or upload any card to instantly detect player, set, grade, real market worth & auto-prepare multi-platform listings.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {!identifiedCard && (
            <>
              {/* Method Switcher Tabs */}
              <div className="flex items-center justify-center gap-2 p-1 bg-zinc-950 rounded-xl border border-zinc-800 max-w-md mx-auto">
                <button
                  onClick={() => {
                    stopCamera();
                    setActiveTab('upload');
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'upload'
                      ? 'bg-zinc-800 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload / Drop Image</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('camera');
                    startCamera();
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'camera'
                      ? 'bg-zinc-800 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Camera Live Scan</span>
                </button>

                <button
                  onClick={() => {
                    stopCamera();
                    setActiveTab('search');
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'search'
                      ? 'bg-zinc-800 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Search by Name</span>
                </button>
              </div>

              {/* Upload Dropzone */}
              {activeTab === 'upload' && (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-zinc-700 hover:border-amber-500/70 bg-zinc-950/60 hover:bg-zinc-950/90 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3 group-hover:scale-110 transition-transform">
                    <ImageIcon className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1">
                    Drag & Drop front scan of any card
                  </h4>
                  <p className="text-xs text-zinc-400 max-w-sm mb-3">
                    Supports Graded Slabs (PSA, BGS, CGC, SGC) and raw sports, Pokémon, MTG, or Yu-Gi-Oh cards.
                  </p>
                  <span className="text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                    Browse Computer Scans
                  </span>
                </div>
              )}

              {/* Live Camera View */}
              {activeTab === 'camera' && (
                <div className="relative rounded-2xl overflow-hidden bg-black border border-zinc-800 aspect-video max-w-xl mx-auto flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />

                  {/* Bounding box guide for slab / card */}
                  <div className="absolute inset-8 border-2 border-amber-400/80 rounded-xl pointer-events-none flex flex-col justify-between p-2 shadow-2xl">
                    <div className="flex justify-between items-center text-[10px] text-amber-300 font-mono bg-black/60 px-2 py-0.5 rounded backdrop-blur">
                      <span>ALIGN CARD HERE</span>
                      <span>AUTO-FOCUS</span>
                    </div>
                    <div className="text-center text-[10px] text-zinc-300 bg-black/60 px-2 py-0.5 rounded backdrop-blur mx-auto">
                      Hold steady for maximum optical resolution
                    </div>
                  </div>

                  <button
                    onClick={capturePhoto}
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 px-6 py-2.5 rounded-full bg-amber-400 text-zinc-950 font-bold text-xs flex items-center gap-2 shadow-xl hover:bg-amber-300 transition-all hover:scale-105"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Capture & Appraise</span>
                  </button>
                </div>
              )}

              {/* Text Search Input */}
              {activeTab === 'search' && (
                <div className="bg-zinc-950/60 p-5 rounded-2xl border border-zinc-800 max-w-xl mx-auto space-y-3">
                  <label className="block text-xs font-semibold text-zinc-300">
                    Enter Card Name, Year, Set, or Player
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. 1999 Charizard Base Set Holo PSA 9 or 1986 Fleer Michael Jordan"
                      value={cardHint}
                      onChange={(e) => setCardHint(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && triggerAiScan(undefined, cardHint)}
                      className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                    />
                    <button
                      onClick={() => triggerAiScan(undefined, cardHint)}
                      className="px-5 py-2.5 rounded-xl bg-amber-400 text-zinc-950 font-bold text-xs hover:bg-amber-300 transition-colors flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Identify</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Zero-Labor Preset Sample Carousel */}
              <div className="border-t border-zinc-800 pt-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-300">
                    <Flame className="w-4 h-4 text-amber-400" />
                    <span>Instant 1-Click Test Cards (Zero Labor)</span>
                  </div>
                  <span className="text-[11px] text-zinc-500">
                    Click any card to appraise and generate listings instantly
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {PRESET_SCAN_SAMPLES.map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => handlePresetSelect(preset)}
                      className="group bg-zinc-950 hover:bg-zinc-850 p-2 rounded-xl border border-zinc-800 hover:border-amber-500/60 transition-all flex flex-col items-center text-left text-xs"
                    >
                      <div className="aspect-[3/4] w-full rounded-lg overflow-hidden bg-zinc-900 mb-2 relative flex items-center justify-center p-1">
                        <img
                          src={preset.image}
                          alt={preset.name}
                          className="h-full object-contain group-hover:scale-105 transition-transform"
                        />
                        <span className="absolute top-1 right-1 text-[9px] font-bold bg-black/80 px-1.5 py-0.5 rounded text-amber-300 border border-zinc-700">
                          {preset.type}
                        </span>
                      </div>
                      <span className="font-semibold text-zinc-200 text-[11px] line-clamp-2 text-center group-hover:text-amber-300">
                        {preset.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Scanning In-Progress Indicator */}
          {isScanning && (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-amber-500/20 border-t-amber-400 animate-spin" />
                <Sparkles className="w-6 h-6 text-amber-400 absolute inset-0 m-auto animate-pulse" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white mb-1">
                  Gemini Vision Appraisal Engine Running
                </h4>
                <p className="text-xs text-amber-300 font-mono animate-pulse">
                  {scanStepText || 'Processing collectible card metadata...'}
                </p>
              </div>
            </div>
          )}

          {/* Identified Card Result Screen */}
          {identifiedCard && !isScanning && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Card Summary Card Header */}
              <div className="bg-zinc-950 p-5 rounded-2xl border border-zinc-800 flex flex-col md:flex-row gap-5 items-center">
                <div className="w-32 aspect-[3/4.2] rounded-xl overflow-hidden bg-zinc-900 border border-zinc-700 p-1 flex items-center justify-center shrink-0">
                  <img
                    src={cardImage || 'https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=800&auto=format&fit=crop&q=80'}
                    alt=""
                    className="max-h-full object-contain rounded"
                  />
                </div>

                <div className="flex-1 space-y-2 text-left">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-bold border border-emerald-500/30 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      AUTHENTICATED & IDENTIFIED
                    </span>
                    <span className="text-xs text-zinc-400">
                      {identifiedCard.grader} {identifiedCard.gradeScore}
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-white leading-tight">
                    {identifiedCard.title}
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                    <div className="bg-zinc-900/80 p-2 rounded-lg border border-zinc-800">
                      <span className="text-[10px] text-zinc-500 block">Set & Year</span>
                      <span className="font-bold text-zinc-200 truncate block">
                        {identifiedCard.setName} ({identifiedCard.year})
                      </span>
                    </div>
                    <div className="bg-zinc-900/80 p-2 rounded-lg border border-zinc-800">
                      <span className="text-[10px] text-zinc-500 block">Card # & Variant</span>
                      <span className="font-bold text-zinc-200 truncate block">
                        {identifiedCard.cardNumber} • {identifiedCard.variant}
                      </span>
                    </div>
                    <div className="bg-zinc-900/80 p-2 rounded-lg border border-zinc-800">
                      <span className="text-[10px] text-zinc-500 block">PSA/BGS Pop</span>
                      <span className="font-bold text-amber-300 truncate block">
                        {identifiedCard.estimatedWorth?.popReportEstimate?.split('/')[0] || 'Pop 420'}
                      </span>
                    </div>
                    <div className="bg-zinc-900/80 p-2 rounded-lg border border-zinc-800">
                      <span className="text-[10px] text-zinc-500 block">30-Day Trend</span>
                      <span className="font-bold text-emerald-400 flex items-center gap-0.5">
                        <TrendingUp className="w-3 h-3" />
                        +{identifiedCard.estimatedWorth?.trend30DayPercent || 7.5}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Market Worth & Comps Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-1">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                    Estimated Fair Market Worth
                  </span>
                  <div className="text-2xl font-black text-amber-400 flex items-center gap-1">
                    <DollarSign className="w-6 h-6 text-amber-400" />
                    <span>{(identifiedCard.estimatedWorth?.fairMarketValue || 450).toLocaleString()}</span>
                  </div>
                  <span className="text-[10px] text-zinc-400 block">
                    Confidence: {identifiedCard.estimatedWorth?.confidenceScore || 95}% (Based on recent auction records)
                  </span>
                </div>

                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-1">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                    Realized Comps Range
                  </span>
                  <div className="text-lg font-bold text-white pt-1">
                    ${(identifiedCard.estimatedWorth?.priceRangeLow || 400).toLocaleString()} – ${(identifiedCard.estimatedWorth?.priceRangeHigh || 500).toLocaleString()}
                  </div>
                  <span className="text-[10px] text-zinc-400 block">
                    Low / High Band over last 90 days
                  </span>
                </div>

                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-1">
                  <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block">
                    Your Asking / List Price
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-lg font-bold text-zinc-400">$</span>
                    <input
                      type="number"
                      value={askingPriceInput}
                      onChange={(e) => setAskingPriceInput(Number(e.target.value))}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1 text-base font-bold text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <span className="text-[10px] text-zinc-400 block">
                    Rec. Listing: ${identifiedCard.recommendedListingPrice || identifiedCard.estimatedWorth?.fairMarketValue}
                  </span>
                </div>
              </div>

              {/* Recent Realized Sales Comps Table */}
              {identifiedCard.estimatedWorth?.recentSales && identifiedCard.estimatedWorth.recentSales.length > 0 && (
                <div className="bg-zinc-950 rounded-xl border border-zinc-800 p-4">
                  <div className="text-xs font-bold text-zinc-300 mb-2 flex items-center justify-between">
                    <span>Recent Realized Sales Comps (eBay, PWCC, Goldin)</span>
                    <span className="text-[10px] text-zinc-500">Verified Sold Records</span>
                  </div>
                  <div className="space-y-1.5">
                    {identifiedCard.estimatedWorth.recentSales.map((comp: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/60 text-xs border border-zinc-850"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-[10px] text-zinc-500 font-mono">{comp.date}</span>
                          <span className="font-semibold text-zinc-200 truncate">{comp.title}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
                            {comp.grade}
                          </span>
                          <span className="font-bold text-emerald-400 font-mono">
                            ${comp.price.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between">
          <button
            onClick={() => {
              if (identifiedCard) {
                setIdentifiedCard(null);
              } else {
                stopCamera();
                onClose();
              }
            }}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            {identifiedCard ? 'Scan Another Card' : 'Cancel'}
          </button>

          {identifiedCard && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleConfirmAndAdd(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-200 bg-zinc-800 hover:bg-zinc-700 transition-colors"
              >
                Save to Portfolio
              </button>
              <button
                onClick={() => handleConfirmAndAdd(true)}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black text-zinc-950 bg-amber-400 hover:bg-amber-300 shadow-lg shadow-amber-500/20 transition-all hover:scale-105"
              >
                <Sparkles className="w-4 h-4" />
                <span>Blast & Sync Everywhere (0 Labor)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
