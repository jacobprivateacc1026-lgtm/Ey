import React, { useState } from 'react';

interface CharacterPortraitProps {
  portraitKey?: string;
  speakerName: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

interface RasterPortraitSpec {
  src: string;
  alt: string;
  accentBorder: string;
}

const RASTER_PORTRAITS: Record<string, RasterPortraitSpec> = {
  jacob_young: {
    src: '/src/assets/images/portrait_jacob_human_1795508242067.jpg',
    alt: 'Portrait of seventeen-year-old Jacob, Meridian transit apprentice',
    accentBorder: 'border-amber-400/45',
  },
  ilya: {
    src: '/src/assets/images/portrait_ilya_guide_1795508241665.jpg',
    alt: 'Portrait of Ilya, Keeper of the Unsealed Ledger',
    accentBorder: 'border-cyan-400/45',
  },
  jacob_architect: {
    src: '/src/assets/images/tub_avatar_1795484730603.jpg',
    alt: 'Portrait of Jacob before concentric golden astrolabe rings',
    accentBorder: 'border-violet-400/45',
  },
  tub: {
    src: '/src/assets/images/tub_avatar_1795484730603.jpg',
    alt: 'Portrait of TUB framed by astrolabe calibration rings',
    accentBorder: 'border-cyan-400/45',
  },
};

const SIZE_CLASS: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'w-10 h-10',
  md: 'w-14 h-14',
  lg: 'w-20 h-24 sm:w-24 sm:h-28',
};

function renderGeometricMedallion(portraitKey: string | undefined, speakerName: string) {
  switch (portraitKey) {
    case 'vance':
      return (
        <svg
          viewBox="0 0 64 64"
          role="img"
          aria-label={`${speakerName} brass transit surveyor medallion`}
          className="w-full h-full bg-[#121620]"
        >
          <rect width="64" height="64" fill="#111521" />
          <line x1="8" y1="50" x2="56" y2="50" stroke="#F59E0B" strokeOpacity="0.45" strokeWidth="1.5" />
          <line x1="12" y1="54" x2="52" y2="54" stroke="#64748B" strokeOpacity="0.4" strokeWidth="1" />
          {/* Drafting compass + shoulder silhouette */}
          <path d="M18 50 C20 38, 44 38, 46 50" fill="#1E293B" stroke="#94A3B8" strokeWidth="1.5" />
          <circle cx="32" cy="24" r="9" fill="#1E293B" stroke="#FBBF24" strokeWidth="1.5" />
          <path d="M32 10 L32 14 M22 24 L26 24 M38 24 L42 24" stroke="#F59E0B" strokeWidth="1.2" />
          <path d="M25 32 L32 20 L39 32" fill="none" stroke="#CBD5E1" strokeOpacity="0.55" strokeWidth="1.2" />
        </svg>
      );
    case 'reyes':
      return (
        <svg
          viewBox="0 0 64 64"
          role="img"
          aria-label={`${speakerName} cognitive laboratory emblem`}
          className="w-full h-full bg-[#0D171F]"
        >
          <rect width="64" height="64" fill="#0B151D" />
          <polygon
            points="32,8 52,20 52,44 32,56 12,44 12,20"
            fill="none"
            stroke="#2DD4BF"
            strokeOpacity="0.35"
            strokeWidth="1.2"
          />
          <circle cx="24" cy="28" r="6" fill="#0F2933" stroke="#5EEAD4" strokeWidth="1.4" />
          <circle cx="40" cy="28" r="6" fill="#0F2933" stroke="#5EEAD4" strokeWidth="1.4" />
          <line x1="30" y1="28" x2="34" y2="28" stroke="#5EEAD4" strokeWidth="1.4" />
          <path d="M20 48 C24 40, 40 40, 44 48" fill="none" stroke="#99F6E4" strokeOpacity="0.65" strokeWidth="1.5" />
        </svg>
      );
    case 'nadia':
      return (
        <svg
          viewBox="0 0 64 64"
          role="img"
          aria-label={`${speakerName} water grid gauge emblem`}
          className="w-full h-full bg-[#151210]"
        >
          <rect width="64" height="64" fill="#141110" />
          <circle cx="32" cy="32" r="21" fill="none" stroke="#FB923C" strokeOpacity="0.4" strokeWidth="1.4" />
          <path d="M16 42 Q32 34 48 42" fill="none" stroke="#38BDF8" strokeOpacity="0.7" strokeWidth="1.6" />
          <path d="M18 47 Q32 41 46 47" fill="none" stroke="#38BDF8" strokeOpacity="0.4" strokeWidth="1.2" />
          <circle cx="32" cy="25" r="8" fill="#1F1916" stroke="#FDBA74" strokeWidth="1.5" />
          <line x1="32" y1="25" x2="37" y2="20" stroke="#FB923C" strokeWidth="1.5" />
        </svg>
      );
    case 'mara':
      return (
        <svg
          viewBox="0 0 64 64"
          role="img"
          aria-label={`${speakerName} Heliopause Accord seal`}
          className="w-full h-full bg-[#0C1426]"
        >
          <rect width="64" height="64" fill="#0B1324" />
          <circle cx="32" cy="30" r="20" fill="none" stroke="#38BDF8" strokeOpacity="0.45" strokeWidth="1.4" />
          <circle cx="32" cy="30" r="14" fill="none" stroke="#FBBF24" strokeOpacity="0.55" strokeWidth="1.2" />
          <path d="M16 30 L48 30 M32 10 L32 50" stroke="#38BDF8" strokeOpacity="0.25" strokeWidth="1" />
          <polygon points="32,19 41,30 32,41 23,30" fill="#172554" stroke="#7DD3FC" strokeWidth="1.5" />
        </svg>
      );
    case 'kael':
      return (
        <svg
          viewBox="0 0 64 64"
          role="img"
          aria-label={`${speakerName} Lyraen ethics tribunal fulcrum emblem`}
          className="w-full h-full bg-[#170D14]"
        >
          <rect width="64" height="64" fill="#160C12" />
          <line x1="32" y1="12" x2="32" y2="52" stroke="#FDA4AF" strokeOpacity="0.7" strokeWidth="1.6" />
          <line x1="14" y1="24" x2="50" y2="24" stroke="#E2E8F0" strokeOpacity="0.8" strokeWidth="1.5" />
          <path d="M14 24 L9 38 L19 38 Z" fill="none" stroke="#FB7185" strokeWidth="1.3" />
          <path d="M50 24 L45 38 L55 38 Z" fill="none" stroke="#FB7185" strokeWidth="1.3" />
          <line x1="20" y1="52" x2="44" y2="52" stroke="#94A3B8" strokeWidth="1.6" />
        </svg>
      );
    default: {
      const initial = speakerName.trim().charAt(0).toUpperCase() || 'T';
      return (
        <svg
          viewBox="0 0 64 64"
          role="img"
          aria-label={`${speakerName} archivist sigil`}
          className="w-full h-full bg-[#0C1220]"
        >
          <rect width="64" height="64" fill="#0B101D" />
          <circle cx="32" cy="32" r="22" fill="none" stroke="#475569" strokeWidth="1.4" />
          <text
            x="32"
            y="38"
            textAnchor="middle"
            fill="#E2E8F0"
            fontSize="20"
            fontFamily="ui-sans-serif, system-ui, sans-serif"
            fontWeight="600"
          >
            {initial}
          </text>
        </svg>
      );
    }
  }
}

export const CharacterPortrait: React.FC<CharacterPortraitProps> = ({
  portraitKey,
  speakerName,
  size = 'md',
  className = '',
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const raster = portraitKey ? RASTER_PORTRAITS[portraitKey] : undefined;
  const sizeClass = SIZE_CLASS[size];

  if (raster && !imgFailed) {
    return (
      <div
        className={`${sizeClass} shrink-0 overflow-hidden rounded-lg border ${raster.accentBorder} bg-[#0B101D] ${className}`}
      >
        <img
          src={raster.src}
          alt={raster.alt}
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="h-full w-full object-cover object-top"
        />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass} shrink-0 overflow-hidden rounded-lg border border-slate-700/80 bg-[#0B101D] ${className}`}
    >
      {renderGeometricMedallion(portraitKey, speakerName)}
    </div>
  );
};
