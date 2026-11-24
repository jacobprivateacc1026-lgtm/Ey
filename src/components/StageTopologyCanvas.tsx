import React from 'react';

interface StageTopologyCanvasProps {
  stageNumber: number;
}

export const StageTopologyCanvas: React.FC<StageTopologyCanvasProps> = ({ stageNumber }) => {
  return (
    <svg
      className="absolute inset-0 h-full w-full pointer-events-none"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`stageGlow-${stageNumber}`} cx="50%" cy="50%" r="65%">
          <stop
            offset="0%"
            stopColor={
              stageNumber >= 5 ? '#F59E0B' : stageNumber >= 3 ? '#8B5CF6' : '#06B6D4'
            }
            stopOpacity="0.14"
          />
          <stop offset="100%" stopColor="#06080E" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="100" height="100" fill={`url(#stageGlow-${stageNumber})`} />

      {stageNumber === 1 && (
        <g stroke="#334155" strokeWidth="0.32" fill="none">
          {/* Euclidean orthogonal grid & calibration rings */}
          <line x1="25" y1="6" x2="25" y2="94" strokeOpacity="0.45" />
          <line x1="50" y1="4" x2="50" y2="96" strokeOpacity="0.55" strokeDasharray="1.2 1.2" />
          <line x1="75" y1="6" x2="75" y2="94" strokeOpacity="0.45" />
          <line x1="6" y1="25" x2="94" y2="25" strokeOpacity="0.45" />
          <line x1="4" y1="50" x2="96" y2="50" strokeOpacity="0.55" strokeDasharray="1.2 1.2" />
          <line x1="6" y1="75" x2="94" y2="75" strokeOpacity="0.45" />
          <circle cx="50" cy="50" r="22" stroke="#22D3EE" strokeOpacity="0.28" />
          <circle cx="50" cy="50" r="38" stroke="#1E293B" strokeDasharray="1.5 1.5" />
        </g>
      )}

      {stageNumber === 2 && (
        <g stroke="#22D3EE" strokeOpacity="0.24" strokeWidth="0.35" fill="none">
          {/* Vaelori senary 6-spoked wheel + bifurcated causal arcs */}
          <circle cx="50" cy="50" r="36" strokeDasharray="2 1.4" />
          <circle cx="50" cy="50" r="19" stroke="#F59E0B" strokeOpacity="0.24" />
          <line x1="50" y1="12" x2="50" y2="88" />
          <line x1="17" y1="31" x2="83" y2="69" />
          <line x1="17" y1="69" x2="83" y2="31" />
          <path d="M12 72 Q50 38 88 26" stroke="#38BDF8" strokeOpacity="0.3" strokeDasharray="1.2 1.2" />
          <path d="M12 28 Q50 62 88 74" stroke="#F59E0B" strokeOpacity="0.26" strokeDasharray="1.2 1.2" />
        </g>
      )}

      {stageNumber === 3 && (
        <g stroke="#A78BFA" strokeOpacity="0.26" strokeWidth="0.35" fill="none">
          {/* Recursive Citadel tesseract projection & nested rotated squares */}
          <rect x="20" y="20" width="60" height="60" />
          <rect x="33" y="33" width="34" height="34" stroke="#22D3EE" strokeOpacity="0.28" />
          <line x1="20" y1="20" x2="33" y2="33" />
          <line x1="80" y1="20" x2="67" y2="33" />
          <line x1="20" y1="80" x2="33" y2="67" />
          <line x1="80" y1="80" x2="67" y2="67" />
          <polygon points="50,12 88,50 50,88 12,50" strokeOpacity="0.22" strokeDasharray="1.5 1.5" />
        </g>
      )}

      {stageNumber === 4 && (
        <g stroke="#C084FC" strokeOpacity="0.26" strokeWidth="0.35" fill="none">
          {/* Asymmetric Kripke accessibility rays & shattered mirror triangles */}
          <polygon points="18,76 46,18 82,66" />
          <polygon points="28,22 78,34 52,84" stroke="#38BDF8" strokeOpacity="0.22" strokeDasharray="1.4 1.2" />
          <line x1="10" y1="50" x2="90" y2="32" strokeOpacity="0.3" />
          <line x1="24" y1="88" x2="76" y2="14" strokeOpacity="0.2" />
        </g>
      )}

      {stageNumber === 5 && (
        <g stroke="#FBBF24" strokeOpacity="0.28" strokeWidth="0.38" fill="none">
          {/* Fractured Horizon boundary arcs & convergence vectors */}
          <path d="M 16 34 A 38 38 0 0 1 78 20" />
          <path d="M 86 48 A 38 38 0 0 1 26 80" />
          <path d="M 14 66 A 38 38 0 0 1 12 42" stroke="#94A3B8" strokeOpacity="0.35" />
          <circle cx="50" cy="50" r="24" stroke="#F59E0B" strokeOpacity="0.22" strokeDasharray="3 2" />
          <line x1="12" y1="50" x2="88" y2="50" strokeOpacity="0.18" />
          <line x1="50" y1="12" x2="50" y2="88" strokeOpacity="0.18" />
        </g>
      )}

      {stageNumber >= 6 && (
        <g stroke="#FBBF24" strokeOpacity="0.3" strokeWidth="0.36" fill="none">
          {/* Three Resonators harmonic convergence rings */}
          <circle cx="50" cy="50" r="41" strokeOpacity="0.22" />
          <circle cx="50" cy="50" r="29" stroke="#22D3EE" strokeOpacity="0.25" />
          <circle cx="50" cy="50" r="16" stroke="#A78BFA" strokeOpacity="0.3" />
          <polygon points="50,14 81,68 19,68" strokeOpacity="0.32" />
          <polygon points="50,86 81,32 19,32" stroke="#22D3EE" strokeOpacity="0.16" strokeDasharray="1.4 1.4" />
        </g>
      )}
    </svg>
  );
};
