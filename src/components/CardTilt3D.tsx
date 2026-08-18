import React, { useState, useRef } from 'react';
import { CardItem } from '../types/card';
import { ShieldCheck, Sparkles, RefreshCw } from 'lucide-react';

interface CardTilt3DProps {
  card: CardItem;
  className?: string;
  showGradeHeader?: boolean;
}

export const CardTilt3D: React.FC<CardTilt3DProps> = ({
  card,
  className = '',
  showGradeHeader = true,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });
  const [isFlipped, setIsFlipped] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -14;
    const rotateY = ((x - centerX) / centerX) * 14;

    setRotation({ x: rotateX, y: rotateY });
    setGlare({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      opacity: 0.45,
    });
  };

  const handleMouseLeave = () => {
    setRotation({ x: 0, y: 0 });
    setGlare({ x: 50, y: 50, opacity: 0 });
  };

  const isGraded = card.grader && card.grader !== 'Raw';

  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative transition-transform duration-150 ease-out cursor-pointer rounded-2xl p-2.5 bg-gradient-to-b from-zinc-800/90 via-zinc-900/90 to-zinc-950/90 shadow-2xl border border-zinc-700/60 backdrop-blur-md"
        style={{
          transform: `perspective(1000px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) scale3d(1, 1, 1)`,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Holographic foil glare layer */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-300 mix-blend-color-dodge z-30"
          style={{
            background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255, 255, 255, 0.8) 0%, rgba(255, 215, 0, 0.3) 25%, rgba(0, 220, 255, 0.2) 50%, transparent 80%)`,
            opacity: glare.opacity,
          }}
        />

        {/* Graded Slab Outer Shell */}
        <div className="relative w-full rounded-xl overflow-hidden bg-zinc-900/90 border border-zinc-700/50 flex flex-col">
          {/* Authentic PSA / BGS Slab Header */}
          {showGradeHeader && isGraded && (
            <div className="w-full bg-gradient-to-r from-red-800 via-red-700 to-red-900 border-b border-red-900/80 px-3 py-2 text-white shadow-inner flex flex-col gap-0.5 z-20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-black text-sm tracking-wider uppercase text-yellow-300">
                  <ShieldCheck className="w-4 h-4 text-yellow-300" />
                  <span>{card.grader}</span>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-base leading-none text-white tracking-tight">
                    {card.gradeScore}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between text-[10px] text-red-100/90 font-medium truncate">
                <span className="truncate">{card.year} {card.setName}</span>
                <span className="font-mono text-zinc-300 text-[9px] ml-1">#{card.certNumber || '5829104'}</span>
              </div>
              <div className="text-[9px] font-bold text-amber-200 uppercase truncate">
                {card.subjectOrPlayer} • {card.variant || 'Base'}
              </div>
            </div>
          )}

          {/* Card Front / Back Image Container */}
          <div className="relative aspect-[3/4.2] w-full overflow-hidden bg-zinc-950 flex items-center justify-center p-2">
            <img
              src={isFlipped && card.backImage ? card.backImage : card.frontImage}
              alt={card.title}
              className="w-full h-full object-contain rounded-md filter drop-shadow-md transition-all duration-300 group-hover:scale-105"
              loading="lazy"
            />

            {/* Sparkle badge for Gem Mint or High Value */}
            {card.estimatedWorth?.fairMarketValue >= 1000 && (
              <div className="absolute top-3 right-3 bg-amber-500/90 backdrop-blur-md text-amber-950 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-lg border border-amber-300">
                <Sparkles className="w-3 h-3 text-amber-950" />
                <span>${(card.estimatedWorth.fairMarketValue).toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Slab Bottom Cert Footer */}
          {isGraded && (
            <div className="bg-zinc-950/80 px-2.5 py-1 border-t border-zinc-800 flex items-center justify-between text-[9px] text-zinc-400 font-mono">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                VERIFIED SLAB
              </span>
              <span>CERT #{card.certNumber || '64829103'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Flip card button if back image available */}
      {card.backImage && (
        <button
          onClick={() => setIsFlipped(!isFlipped)}
          className="mt-2 text-xs text-zinc-400 hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-800/80 hover:bg-zinc-700 transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          <span>{isFlipped ? 'Show Front Scan' : 'Flip to Back Scan'}</span>
        </button>
      )}
    </div>
  );
};
