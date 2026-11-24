import React, { useState } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { QUEST_CATALOG } from '../engine/multiverseData';
import { getQuestProgress } from '../engine/progression';
import { GameSaveState, QuestCategory } from '../engine/types';

interface QuestLogProps {
  save: GameSaveState;
}

export const QuestLog: React.FC<QuestLogProps> = ({ save }) => {
  const [catFilter, setCatFilter] = useState<'All' | QuestCategory>('All');
  const categories: ('All' | QuestCategory)[] = [
    'All',
    'Main',
    'Cognitive',
    'Exploration',
    'Research',
    'Challenge',
    'Hidden',
  ];

  const quests =
    catFilter === 'All'
      ? QUEST_CATALOG
      : QUEST_CATALOG.filter((q) => q.category === catFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-white">
            Quest Log
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Track Main multiverse progression, Cognitive mastery, Exploration, Research, Challenge, and Hidden objectives. Rewards grant automatically on completion.
          </p>
        </div>
        <div className="text-xs font-mono text-slate-300 tabular-nums">
          Completed {save.completedQuestIds.length} / {QUEST_CATALOG.length}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 p-1.5 rounded-lg border border-slate-800 bg-[#090D18] w-fit">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCatFilter(c)}
            className={`min-h-[38px] px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
              catFilter === c
                ? 'bg-cyan-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {quests.map((q) => {
          const done = save.completedQuestIds.includes(q.id);
          const prog = getQuestProgress(save, q);
          const pct = Math.min(100, Math.round((prog.current / prog.target) * 100));

          return (
            <div
              key={q.id}
              className={`rounded-xl border p-5 space-y-3 ${
                done
                  ? 'border-emerald-500/40 bg-[#0A1619]'
                  : 'border-slate-800 bg-[#0B101D]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-mono text-slate-400">
                    {q.category} Quest
                  </div>
                  <h2 className="font-display text-base font-semibold text-white mt-0.5">
                    {q.title}
                  </h2>
                </div>
                {done ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-600 shrink-0" />
                )}
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">{q.description}</p>

              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs font-mono text-slate-400 tabular-nums">
                  <span>Progress</span>
                  <span>
                    {prog.current} / {prog.target} ({pct}%)
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full transition-all ${done ? 'bg-emerald-400' : 'bg-cyan-400'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              <div className="text-[11px] font-mono text-amber-300/90 tabular-nums">
                Reward: +{q.rewards.xp} XP · +{q.rewards.ip} IP · +{q.rewards.kp} KP
                {q.rewards.ep ? ` · +${q.rewards.ep} EP` : ''}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
