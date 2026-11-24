import React, { memo, useMemo, useState } from 'react';
import { ArrowUpCircle, Sparkles } from 'lucide-react';
import {
  getAttributeUpgradeCost,
  getMilestoneForLevel,
  getSecondaryGameplayBonuses,
  getXpForNextTubLevel,
  PRIMARY_ATTRIBUTES,
  SECONDARY_ATTRIBUTES,
} from '../engine/attributes';
import { GameSaveState, PrimaryAttributeId } from '../engine/types';

interface CharacterPanelProps {
  save: GameSaveState;
  onUpgradeAttribute: (attrId: PrimaryAttributeId) => { ok: boolean; message: string };
  onElevateTranscendence: () => { ok: boolean; message: string };
}

export const CharacterPanel: React.FC<CharacterPanelProps> = memo(({
  save,
  onUpgradeAttribute,
  onElevateTranscendence,
}) => {
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const xpNeeded = getXpForNextTubLevel(save.tubLevel);
  const xpPct = Math.min(100, Math.round((save.xp / xpNeeded) * 100));
  const secBonuses = useMemo(
    () =>
      getSecondaryGameplayBonuses(
        save.attributes,
        save.unlockedArchiveIds.length,
        save.transcendenceRank,
        save.abilities
      ),
    [save.attributes, save.unlockedArchiveIds.length, save.transcendenceRank, save.abilities]
  );
  const secondary = secBonuses.secondaryScores;
  const nextMilestone = getMilestoneForLevel(save.tubLevel + 1) ?? getMilestoneForLevel(Math.ceil((save.tubLevel + 1) / 5) * 5);
  const transcendCostEP = 2 + save.transcendenceRank;

  const getSecondaryEffectSummary = (id: string): string => {
    switch (id) {
      case 'knowledge':
        return `${secBonuses.knowledgeArchiveEchoUnlocked ? 'Active: Cross-Universe Echoes' : 'Unlock at Score 18 or 1 Archive'} · -${secBonuses.knowledgeHintDiscountBonusPct}% Hint IP`;
      case 'adaptability':
        return `${secBonuses.adaptabilityReframingUnlocked ? 'Active: Adaptability Lens' : 'Unlocks Lens at Score 20'} · ${secBonuses.adaptabilityEfficiencyBufferPct}% Stage II+ Shift Buffer`;
      case 'systems_thinking':
        return `${secBonuses.systemsLoopLensUnlocked ? 'Active: Systems Loop Lens' : 'Unlocks Lens at Score 20'} · +${secBonuses.systemsCascadeBonusPct}% Hybrid/Boss Yield`;
      case 'cognitive_endurance':
        return `Sustains multi-phase Boss continuity (${save.defeatedBossIds.length}/6 defeated)`;
      case 'insight':
        return 'Deepens Pattern + Abstract structural projections inside Hints';
      case 'perceptual_awareness':
        return `Sharpens Anomaly & Parity precision (${save.discoveredItemIds.length} discoveries recorded)`;
      default:
        return '';
    }
  };

  return (
    <div className="space-y-8">
      {/* TUB Identity & Resource Header */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-5 rounded-xl border border-slate-800 bg-[#0B101D] p-6 flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-5 items-center">
          <img
            src="/src/assets/images/tub_avatar_1795484730603.jpg"
            alt="TUB Cosmic Entity Portrait"
            referrerPolicy="no-referrer"
            className="w-28 h-28 rounded-xl object-cover border border-slate-700 shrink-0"
          />
          <div className="space-y-2 flex-1 w-full">
            <div className="text-xs font-mono uppercase tracking-wider text-cyan-400">
              Protagonist · The Ultimate Being
            </div>
            <h1 className="font-display text-2xl font-semibold text-white">
              TUB — Level {save.tubLevel}
            </h1>
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono text-slate-400 tabular-nums">
                <span>Experience</span>
                <span>
                  {save.xp} / {xpNeeded} XP ({xpPct}%)
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-cyan-400 transition-all"
                  style={{ width: `${xpPct}%` }}
                />
              </div>
            </div>
            {nextMilestone && (
              <p className="text-xs text-slate-400 pt-1">
                Next Milestone (Lv {nextMilestone.level}): {nextMilestone.title} — {nextMilestone.rewardText}
              </p>
            )}
          </div>
        </div>

        <div className="lg:col-span-7 rounded-xl border border-slate-800 bg-[#0B101D] p-6 flex flex-col justify-between space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <div className="text-xs font-mono uppercase text-slate-400">Intelligence Pts</div>
              <div className="text-2xl font-mono font-semibold text-cyan-300 tabular-nums mt-1">
                {save.ip}
              </div>
              <div className="text-[11px] text-slate-500">Attribute & Ability Currency</div>
            </div>
            <div>
              <div className="text-xs font-mono uppercase text-slate-400">Knowledge Pts</div>
              <div className="text-2xl font-mono font-semibold text-violet-300 tabular-nums mt-1">
                {save.kp}
              </div>
              <div className="text-[11px] text-slate-500">Archive Research Currency</div>
            </div>
            <div>
              <div className="text-xs font-mono uppercase text-slate-400">Evolution Pts</div>
              <div className="text-2xl font-mono font-semibold text-amber-300 tabular-nums mt-1">
                {save.ep}
              </div>
              <div className="text-[11px] text-slate-500">Major Milestone Currency</div>
            </div>
            <div>
              <div className="text-xs font-mono uppercase text-slate-400">Transcendence</div>
              <div className="text-2xl font-mono font-semibold text-white tabular-nums mt-1">
                Rank {save.transcendenceRank}
              </div>
              <div className="text-[11px] text-slate-500">+{save.transcendenceRank * 10}% Yield</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
            <p className="text-xs text-slate-400 max-w-md">
              Upgrading Intelligence attributes expands how TUB inspects puzzles, unlocks Ability Tree nodes, and deepens Adaptive Hint precision.
            </p>
            <button
              type="button"
              onClick={() => {
                const res = onElevateTranscendence();
                setStatusMsg(res.message);
              }}
              className="min-h-[42px] px-4 py-2 rounded-lg border border-amber-400/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-200 text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Elevate Transcendence ({transcendCostEP} EP)
            </button>
          </div>
        </div>
      </section>

      {statusMsg && (
        <div role="status" className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-4 py-2.5 text-xs text-cyan-200">
          {statusMsg}
        </div>
      )}

      {/* 9 Primary Cognitive Attributes */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-white">
          Primary Cognitive Attributes (9)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {PRIMARY_ATTRIBUTES.map((meta) => {
            const state = save.attributes[meta.id];
            const cost = getAttributeUpgradeCost(state.level);
            const affordable = save.ip >= cost;
            return (
              <div
                key={meta.id}
                className="rounded-xl border border-slate-800 bg-[#0B101D] p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-display text-base font-semibold text-white">
                      {meta.name}
                    </h3>
                    <span className="text-sm font-mono font-semibold text-cyan-300 tabular-nums shrink-0">
                      Lv {state.level}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">{meta.focus}</div>
                  <p className="text-xs text-slate-300 leading-relaxed">{meta.description}</p>
                  <div className="pt-1 text-[11px] font-mono text-violet-300">
                    Active Effect: {meta.passiveBonusLabel(state.level)}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Lv 5 Milestone: {meta.milestone5Bonus}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!affordable}
                  onClick={() => {
                    const res = onUpgradeAttribute(meta.id);
                    setStatusMsg(`${meta.name}: ${res.message}`);
                  }}
                  className={`min-h-[44px] w-full px-4 py-2 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors tabular-nums ${
                    affordable
                      ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                      : 'border border-slate-800 bg-[#070A12] text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <ArrowUpCircle className="w-4 h-4" />
                  Upgrade to Lv {state.level + 1} ({cost} IP)
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* 6 Derived Secondary Attributes */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-white">
          Secondary Emergent Attributes (6)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SECONDARY_ATTRIBUTES.map((sec) => (
            <div
              key={sec.id}
              className="rounded-xl border border-slate-800 bg-[#090D18] p-4 space-y-1.5"
            >
              <div className="flex items-baseline justify-between">
                <h3 className="text-sm font-semibold text-white">{sec.name}</h3>
                <span className="text-base font-mono font-semibold text-amber-300 tabular-nums">
                  {secondary[sec.id]}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{sec.description}</p>
              <div className="text-[11px] font-mono text-cyan-300/90 pt-1">
                {getSecondaryEffectSummary(sec.id)}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
});
