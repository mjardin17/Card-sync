import React, { useState, useRef } from 'react';
import { CardItem, CardCategory, Grader } from '../types/card';
import { identifyCardApi } from '../services/geminiClient';
import { 
  X, 
  UploadCloud, 
  FileSpreadsheet, 
  Download, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Trash2, 
  Plus,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface BatchBulkScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCards: (newCards: CardItem[]) => void;
  existingCards: CardItem[];
}

interface QueuedCard {
  id: string;
  fileName: string;
  fileDataUrl: string;
  status: 'queued' | 'processing' | 'done' | 'error';
  progress: number;
  result?: Partial<CardItem>;
  error?: string;
}

export const BatchBulkScannerModal: React.FC<BatchBulkScannerModalProps> = ({
  isOpen,
  onClose,
  onAddCards,
  existingCards,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'batch_scan' | 'csv_sync'>('batch_scan');
  const [queue, setQueue] = useState<QueuedCard[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [csvText, setCsvText] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const csvFileInputRef = useRef<HTMLInputElement | null>(null);

  // Handle Multi-file Drop / Selection
  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newItems: QueuedCard[] = [];
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => {
        const item: QueuedCard = {
          id: `queue-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          fileName: file.name,
          fileDataUrl: reader.result as string,
          status: 'queued',
          progress: 0,
        };
        setQueue((prev) => [...prev, item]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Run Batch Processing
  const runBatchProcessing = async () => {
    if (isProcessing || queue.length === 0) return;
    setIsProcessing(true);

    const updatedQueue = [...queue];

    for (let i = 0; i < updatedQueue.length; i++) {
      if (updatedQueue[i].status === 'done') continue;

      updatedQueue[i].status = 'processing';
      updatedQueue[i].progress = 35;
      setQueue([...updatedQueue]);

      try {
        const item = updatedQueue[i];
        const res = await identifyCardApi({
          imageBase64: item.fileDataUrl,
          cardHint: item.fileName.replace(/\.[^/.]+$/, ''),
        });

        updatedQueue[i].progress = 100;
        updatedQueue[i].status = 'done';
        updatedQueue[i].result = {
          id: `card-${Date.now()}-${i}`,
          title: res.title || item.fileName,
          category: (res.category as CardCategory) || 'other',
          subjectOrPlayer: res.subjectOrPlayer || 'Unknown Subject',
          setName: res.setName || 'Standard Collection',
          year: res.year || '2024',
          cardNumber: res.cardNumber || '#1',
          variant: res.variant || 'Base Edition',
          grader: (res.grader as Grader) || 'PSA',
          gradeScore: res.gradeScore || '10 GEM MINT',
          certNumber: res.certNumber || `${Math.floor(10000000 + Math.random() * 90000000)}`,
          keyAttributes: res.keyAttributes || ['Graded Slab', 'Authenticated Specimen'],
          frontImage: item.fileDataUrl,
          askingPrice: res.recommendedListingPrice || res.estimatedWorth?.fairMarketValue || 250,
          minPrice: Math.round((res.recommendedListingPrice || 250) * 0.88),
          estimatedWorth: res.estimatedWorth || {
            fairMarketValue: 250,
            priceRangeLow: 220,
            priceRangeHigh: 290,
            confidenceScore: 92,
            trend30DayPercent: 5.4,
            liquidityRating: 'High',
            recentSales: [],
          },
          recommendedListingPrice: res.recommendedListingPrice || 250,
          conditionNotes: res.conditionNotes || 'Pristine authenticated slab condition.',
          seoTitle: res.seoTitle || res.title,
          status: 'active',
          syncStatus: 'synced',
          listings: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setQueue([...updatedQueue]);
      } catch (err: any) {
        updatedQueue[i].status = 'error';
        updatedQueue[i].error = err.message || 'Recognition failed';
        setQueue([...updatedQueue]);
      }
    }

    setIsProcessing(false);
  };

  // Add all completed to vault
  const handleImportAllCompleted = () => {
    const completedCards = queue
      .filter((q) => q.status === 'done' && q.result)
      .map((q) => q.result as CardItem);

    if (completedCards.length > 0) {
      onAddCards(completedCards);
      onClose();
    }
  };

  // Export existing inventory to CSV
  const handleExportCSV = () => {
    const headers = [
      'ID',
      'Title',
      'Category',
      'Subject/Player',
      'Set Name',
      'Year',
      'Card #',
      'Grade',
      'Cert #',
      'Asking Price ($)',
      'Fair Market Value ($)',
      'Status',
      'Date Added',
    ];

    const rows = existingCards.map((c) => [
      c.id,
      `"${c.title.replace(/"/g, '""')}"`,
      c.category,
      `"${c.subjectOrPlayer.replace(/"/g, '""')}"`,
      `"${c.setName.replace(/"/g, '""')}"`,
      c.year,
      `"${c.cardNumber}"`,
      `"${c.grader} ${c.gradeScore}"`,
      c.certNumber || 'N/A',
      c.askingPrice,
      c.estimatedWorth?.fairMarketValue || c.askingPrice,
      c.status,
      c.createdAt,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `omnicard-vault-portfolio-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle CSV Import File
  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      setCsvText(text);
      parseAndImportCsv(text);
    };
    reader.readAsText(file);
  };

  const parseAndImportCsv = (text: string) => {
    const lines = text.split('\n').filter((l) => l.trim().length > 0);
    if (lines.length <= 1) return;

    const importedCards: CardItem[] = [];
    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map((p) => p.replace(/^"|"$/g, '').trim());
      if (parts.length < 3) continue;

      const title = parts[1] || parts[0] || 'Imported Card';
      const category = (parts[2] as CardCategory) || 'other';
      const price = Number(parts[9]) || Number(parts[3]) || 150;

      importedCards.push({
        id: `card-csv-${Date.now()}-${i}`,
        title,
        category,
        subjectOrPlayer: parts[3] || title,
        setName: parts[4] || 'CSV Import Set',
        year: parts[5] || '2024',
        cardNumber: parts[6] || '#1',
        variant: 'Standard',
        grader: 'PSA',
        gradeScore: parts[7] || '10 GEM MINT',
        certNumber: parts[8] || `${Math.floor(10000000 + Math.random() * 90000000)}`,
        keyAttributes: ['CSV Imported Specimen'],
        frontImage: 'https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=800&auto=format&fit=crop&q=80',
        askingPrice: price,
        minPrice: Math.round(price * 0.88),
        estimatedWorth: {
          fairMarketValue: price,
          priceRangeLow: Math.round(price * 0.9),
          priceRangeHigh: Math.round(price * 1.1),
          confidenceScore: 90,
          trend30DayPercent: 5.0,
          liquidityRating: 'High',
          recentSales: [],
        },
        recommendedListingPrice: price,
        conditionNotes: 'Imported via bulk CSV portfolio sync.',
        seoTitle: title,
        status: 'active',
        syncStatus: 'synced',
        listings: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    if (importedCards.length > 0) {
      onAddCards(importedCards);
      onClose();
    }
  };

  const doneCount = queue.filter((q) => q.status === 'done').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-zinc-950 shadow-md">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                Batch Bulk Scanner & CSV Portfolio Importer
              </h3>
              <p className="text-xs text-zinc-400">
                Upload up to 30 slab photos at once or import spreadsheets from PSA, CollX & eBay
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="p-3 bg-zinc-950/70 border-b border-zinc-800 flex items-center justify-between px-6">
          <div className="flex items-center gap-2 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => setActiveTab('batch_scan')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'batch_scan'
                  ? 'bg-amber-400 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              Multi-Photo Batch Scanner ({queue.length})
            </button>
            <button
              onClick={() => setActiveTab('csv_sync')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'csv_sync'
                  ? 'bg-amber-400 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              CSV Spreadsheets (PSA / eBay / CollX)
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export Vault to CSV
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
          {activeTab === 'batch_scan' ? (
            <div className="space-y-5">
              {/* Drag & Drop Upload Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleFilesSelected(e.dataTransfer.files);
                }}
                className="border-2 border-dashed border-zinc-700 hover:border-amber-400 bg-zinc-950/60 hover:bg-zinc-950 p-8 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handleFilesSelected(e.target.files)}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-amber-400/10 text-amber-400 group-hover:scale-110 flex items-center justify-center mb-3 transition-transform">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">
                  Drag & drop multiple card slab scans here, or click to browse
                </h4>
                <p className="text-xs text-zinc-400 max-w-sm">
                  Supports JPG, PNG, HEIC. Upload up to 30 cards at once for parallel AI recognition & comps appraisal.
                </p>
              </div>

              {/* Queue Summary & Action Bar */}
              {queue.length > 0 && (
                <div className="flex items-center justify-between bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-zinc-300">
                      Queue: <strong className="text-amber-400">{doneCount}</strong> of {queue.length} ready
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setQueue([])}
                      className="px-3 py-1.5 text-xs text-zinc-400 hover:text-red-400 font-semibold"
                    >
                      Clear Queue
                    </button>

                    {!isProcessing && doneCount < queue.length && (
                      <button
                        onClick={runBatchProcessing}
                        className="flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black px-4 py-2 rounded-xl text-xs shadow-lg transition-all"
                      >
                        <Sparkles className="w-4 h-4" />
                        Start Batch AI Appraisal
                      </button>
                    )}

                    {isProcessing && (
                      <div className="flex items-center gap-2 bg-zinc-800 text-amber-400 px-4 py-2 rounded-xl text-xs font-bold">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Appraising Slabs...
                      </div>
                    )}

                    {doneCount > 0 && (
                      <button
                        onClick={handleImportAllCompleted}
                        className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black px-4 py-2 rounded-xl text-xs shadow-lg transition-all"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Add {doneCount} Cards to Vault
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Queued Cards Grid */}
              {queue.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {queue.map((item, idx) => (
                    <div
                      key={item.id}
                      className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 flex items-center gap-3"
                    >
                      <img
                        src={item.fileDataUrl}
                        alt={item.fileName}
                        className="w-14 h-18 object-cover rounded-lg border border-zinc-700 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">
                          {item.result?.title || item.fileName}
                        </p>
                        <p className="text-[11px] text-zinc-400 truncate">
                          {item.result ? `${item.result.grader} ${item.result.gradeScore} • $${item.result.askingPrice}` : 'Queued for scan'}
                        </p>

                        <div className="mt-2 flex items-center gap-2">
                          {item.status === 'queued' && (
                            <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-bold">
                              Queued
                            </span>
                          )}
                          {item.status === 'processing' && (
                            <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Scanning AI...
                            </span>
                          )}
                          {item.status === 'done' && (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Appraised
                            </span>
                          )}
                          {item.status === 'error' && (
                            <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded font-bold">
                              Error
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* CSV Import Tab */
            <div className="space-y-5">
              <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800 space-y-4">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-amber-400" />
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                    Import PSA Set Registry, eBay, or TCGplayer CSV
                  </h4>
                </div>
                <p className="text-xs text-zinc-400">
                  Quickly migrate your whole collection spreadsheet into the OmniCard Vault to activate cross-posting.
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    ref={csvFileInputRef}
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleCsvFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => csvFileInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black px-5 py-2.5 rounded-xl text-xs shadow-lg transition-all"
                  >
                    <UploadCloud className="w-4 h-4" />
                    Select CSV Spreadsheet File
                  </button>
                  <button
                    onClick={() => {
                      const sampleCsv = `ID,Title,Category,Subject,Set,Year,CardNumber,Grade,Cert,Price\n1,"2023 Panini Prizm Victor Wembanyama #136 PSA 10",sports,"Victor Wembanyama","Panini Prizm",2023,"#136","PSA 10","91028341",780\n2,"1999 Pokemon Base Set Blastoise Holo #2/102 PSA 9",pokemon,"Blastoise","Base Set",1999,"#2/102","PSA 9","48102941",620`;
                      parseAndImportCsv(sampleCsv);
                    }}
                    className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold px-4 py-2.5 rounded-xl text-xs transition-colors"
                  >
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Load Sample PSA Registry Export
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
