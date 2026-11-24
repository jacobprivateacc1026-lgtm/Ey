import React, { useState } from 'react';
import { CheckCircle2, Lock, Sparkles } from 'lucide-react';
import { COGNITIVE_ABILITIES } from '../engine/attributes';
import { canUnlockOrUpgradeAbility } from '../engine/progression';
import { GameSaveState } from '../engine/types';

interface AbilityTreeProps {
  save: GameSaveState;
  onUnlockAbility: (abilityId: string) => { ok: boolean; message: string };
}

export const AbilityTree: React.FC<AbilityTreeProps> = ({ save, onUnlockAbility }) => {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [filterAttr, setFilterAttr] = useState<string>('all');

  const filtered =
    filterAttr === 'all'
      ? COGNITIVE_ABILITIES
      : COGNITIVE_ABILITIES.filter((a) => a.primaryAttribute === filterAttr);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-white">
            Cognitive Ability Tree
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Unlockable mental instruments that reveal structural decompositions, dependencies, and hidden anomalies inside the Puzzle Chamber.
          </p>
        </div>
        <div className="text-xs font-mono text-slate-300 tabular-nums">
          Available: {save.ip} IP · {save.ep} EP
        </div>
      </div>

      {/* Filter Segmented Control */}
      <div className="flex flex-wrap gap-1.5 p-1.5 rounded-lg border border-slate-800 bg-[#090D18] w-fit">
        {[
          { id: 'all', label: 'All Branches' },
          { id: 'analytical', label: 'Analytical' },
          { id: 'abstract', label: 'Abstract' },
          { id: 'working_memory', label: 'Memory' },
          { id: 'pattern_recognition', label: 'Pattern' },
          { id: 'spatial', label: 'Spatial' },
          { id: 'metacognition', label: 'Metacognition' },
          { id: 'creative', label: 'Creative' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilterAttr(tab.id)}
            className={`min-h-[38px] px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
              filterAttr === tab.id
                ? 'bg-cyan-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {feedback && (
        <div role="status" className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-4 py-2.5 text-xs text-cyan-200">
          {feedback}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((ability) => {
          const rank = save.abilities[ability.id] ?? 0;
          const check = canUnlockOrUpgradeAbility(save, ability.id);
          const maxed = rank >= ability.maxRank;

          return (
            <div
              key={ability.id}
              className={`rounded-xl border p-5 flex flex-col justify-between space-y-4 ${
                rank > 0
                  ? 'border-cyan-500/45 bg-[#0D1526]'
                  : 'border-slate-800 bg-[#0B101D]'
              }`}
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-display text-base font-semibold text-white">
                      {ability.name}
                    </h2>
                    <div className="text-xs text-slate-400 mt-0.5 capitalize">
                      {ability.primaryAttribute.replace('_', ' ')} · Rank {rank}/{ability.maxRank}
                    </div>
                  </div>
                  {maxed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-1" />
                  ) : !check.allowed ? (
                    <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-1" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-1" />
                  )}
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{ability.summary}</p>
                <div className="text-[11px] font-mono text-cyan-300/90">
                  Chamber Utility: {ability.inPuzzleEffect}
                </div>

                <div className="text-[11px] text-slate-400 pt-1">
                  Prerequisites: {ability.primaryAttribute.replace('_', ' ')} Lv{' '}
                  {ability.minAttributeLevel + rank}
                  {ability.secondaryRequirements &&
                    Object.entries(ability.secondaryRequirements)
                      .map(([k, v]) => ` · ${k.replace('_', ' ')} Lv ${v}`)
                      .join('')}
                </div>
              </div>

              {maxed ? (
                <div className="min-h-[42px] rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs font-medium flex items-center justify-center">
                  Mastered
                </div>
              ) : (
                <button
                  type="button"
                  disabled={!check.allowed}
                  onClick={() => {
                    const res = onUnlockAbility(ability.id);
                    setFeedback(`${ability.name}: ${res.message}`);
                  }}
                  className={`min-h-[42px] w-full px-4 py-2 rounded-lg text-xs font-semibold transition-colors tabular-nums ${
                    check.allowed
                      ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                      : 'border border-slate-800 bg-[#070A12] text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {check.allowed
                    ? `${rank === 0 ? 'Unlock' : 'Upgrade'} (${check.costIP} IP${
                        check.costEP > 0 ? ` + ${check.costEP} EP` : ''
                      })`
                    : check.reason}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
