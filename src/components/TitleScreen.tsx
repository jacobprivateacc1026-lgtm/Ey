import React, { useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface TitleScreenProps {
  hasSave: boolean;
  savedLevel: number;
  savedStage: number;
  audioEnabled: boolean;
  onContinue: () => void;
  onNewGame: () => void;
  onToggleAudio: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  hasSave,
  savedLevel,
  savedStage,
  audioEnabled,
  onContinue,
  onNewGame,
  onToggleAudio,
}) => {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const activeTag = document.activeElement?.tagName;
      if (
        activeTag === 'BUTTON' ||
        activeTag === 'A' ||
        activeTag === 'INPUT' ||
        activeTag === 'TEXTAREA'
      ) {
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (hasSave) {
          onContinue();
        } else {
          onNewGame();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hasSave, onContinue, onNewGame]);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#06080E] text-slate-100 flex flex-col justify-between">
      {/* Illustrated Key Art Backdrop */}
      <div className="absolute inset-0 pointer-events-none">
        <img
          src="/src/assets/images/title_backdrop_1795484729811.jpg"
          alt="Infinite cosmic astrolabe horizon"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover object-center opacity-85"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, rgba(6,8,14,0.96) 0%, rgba(6,8,14,0.84) 44%, rgba(6,8,14,0.35) 100%)',
          }}
        />
      </div>

      {/* Top utility control */}
      <div className="relative z-10 flex items-center justify-end px-6 py-5 md:px-12">
        <button
          type="button"
          onClick={onToggleAudio}
          aria-label={audioEnabled ? 'Mute sound effects' : 'Enable sound effects'}
          className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg border border-slate-800 bg-[#0B101D]/90 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40 transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400"
        >
          {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>
      </div>

      {/* Left-aligned focal lockup over calm negative space */}
      <main className="relative z-10 max-w-6xl w-full mx-auto px-6 md:px-12 py-8 flex-1 flex items-center">
        <div className="max-w-xl space-y-8">
          {/* Custom Inline SVG Emblem & Title Lockup */}
          <div className="space-y-5">
            <svg
              viewBox="0 0 88 88"
              className="w-16 h-16 text-amber-300"
              aria-hidden="true"
            >
              <circle cx="44" cy="44" r="38" fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.2" />
              <circle cx="44" cy="44" r="26" fill="none" stroke="#22D3EE" strokeOpacity="0.65" strokeWidth="1.2" />
              <polygon
                points="44,10 73,27 73,61 44,78 15,61 15,27"
                fill="none"
                stroke="#A78BFA"
                strokeOpacity="0.7"
                strokeWidth="1.2"
              />
              <circle cx="44" cy="44" r="5" fill="#22D3EE" />
              <line x1="44" y1="6" x2="44" y2="82" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1" />
              <line x1="6" y1="44" x2="82" y2="44" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1" />
            </svg>

            <div className="space-y-3">
              <p className="text-xs font-mono tracking-[0.2em] uppercase text-cyan-400">
                Single-Player Intellectual Odyssey
              </p>
              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-white text-balance leading-[1.06]">
                TUB: The Infinite Possibility
              </h1>
              <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-lg">
                Traverse six escalating realities of mathematics, formal logic, spatial geometry, and epistemic synthesis. Cultivate the cognitive instruments required to comprehend unfamiliar universes.
              </p>
            </div>
          </div>

          {/* Primary Menu Actions (<= 3 actions) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            {hasSave ? (
              <>
                <button
                  type="button"
                  data-start="true"
                  onClick={onContinue}
                  className="min-h-[48px] px-7 py-3 rounded-lg bg-cyan-500 text-slate-950 font-semibold text-sm tracking-wide hover:bg-cyan-400 active:scale-[0.99] transition-all whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-cyan-300"
                >
                  Continue Journey
                </button>
                <button
                  type="button"
                  onClick={onNewGame}
                  className="min-h-[48px] px-6 py-3 rounded-lg border border-slate-700 bg-[#0B101D]/90 text-slate-200 font-medium text-sm hover:border-slate-500 hover:text-white transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-cyan-300"
                >
                  New Game
                </button>
              </>
            ) : (
              <button
                type="button"
                data-start="true"
                onClick={onNewGame}
                className="min-h-[48px] px-8 py-3 rounded-lg bg-cyan-500 text-slate-950 font-semibold text-sm tracking-wide hover:bg-cyan-400 active:scale-[0.99] transition-all whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-cyan-300"
              >
                Begin Exploration
              </button>
            )}
          </div>

          {hasSave && (
            <p className="text-xs font-mono text-slate-400 tabular-nums">
              Saved Consciousness · Level {savedLevel} · Stage {savedStage} Unlocked · Offline Ready
            </p>
          )}
        </div>
      </main>

      {/* Bottom flat control hint */}
      <footer className="relative z-10 px-6 py-4 md:px-12 text-xs text-slate-400 font-mono">
        Press Enter or Space to start · Persistent local saves · 100% offline engine
      </footer>
    </div>
  );
};
