import React, { memo, useEffect, useMemo, useState } from 'react';
import { Compass, Lock, CheckCircle2, Sparkles, ShieldAlert, Search, Infinity as InfinityIcon } from 'lucide-react';
import { BOSS_ENCOUNTERS, MULTIVERSE_STAGES } from '../engine/multiverseData';
import { computePlayerAnalytics } from '../engine/progression';
import { GameSaveState, PuzzleCategory, UniverseNode, UniverseStage } from '../engine/types';
import { StageTopologyCanvas } from './StageTopologyCanvas';

interface MultiverseMapProps {
  save: GameSaveState;
  onSelectStage: (stageNumber: number) => void;
  onOpenNode: (node: UniverseNode) => void;
  onLaunchEndgameProcedural: (category: PuzzleCategory, difficultyScore: number) => void;
  onDiscoverItem: (discoveryId: string) => void;
}

export const MultiverseMap: React.FC<MultiverseMapProps> = memo(({
  save,
  onSelectStage,
  onOpenNode,
  onLaunchEndgameProcedural,
  onDiscoverItem,
}) => {
  const activeStageNum = save.activeUniverseStage;
  const activeStage: UniverseStage =
    MULTIVERSE_STAGES.find((s) => s.stageNumber === activeStageNum) ?? MULTIVERSE_STAGES[0];
  const [selectedRegionId, setSelectedRegionId] = useState<string>(activeStage.regions[0]?.id ?? '');
  const [customCategory, setCustomCategory] = useState<PuzzleCategory>('hybrid');
  const [customDifficulty, setCustomDifficulty] = useState<number>(65);

  useEffect(() => {
    setSelectedRegionId(activeStage.regions[0]?.id ?? '');
  }, [activeStage.id]);

  const analytics = useMemo(
    () => computePlayerAnalytics(save),
    [save.performanceHistory, save.mistakePatterns]
  );
  const endgameUnlocked = save.unlockedStage >= 7 || save.defeatedBossIds.includes('boss_architect_possibility');

  const stagePanelAccent =
    activeStage.accentColor === 'gold'
      ? 'border-amber-500/35'
      : activeStage.accentColor === 'violet'
      ? 'border-violet-500/35'
      : 'border-cyan-500/30';

  const isNodeUnlocked = (node: UniverseNode): boolean => {
    if (activeStage.stageNumber > save.unlockedStage) return false;
    if (node.prerequisiteNodeIds.length === 0) return true;
    return node.prerequisiteNodeIds.every((pid) => save.completedNodeIds.includes(pid));
  };

  const currentRegion =
    activeStage.regions.find((r) => r.id === selectedRegionId && r.nodeIds.length > 0) ??
    activeStage.regions[0];

  return (
    <div className="space-y-8">
      {/* Stage Progression Selector */}
      <section aria-label="Multiverse stages" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-white">
              Multiverse Atlas
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Navigate six escalating realities. Each universe enforces distinct physical, mathematical, and logical laws.
            </p>
          </div>
          <div className="text-xs font-mono text-slate-400 tabular-nums">
            Stages Unlocked {Math.min(6, save.unlockedStage)} / 6 · Nodes Cleared {save.completedNodeIds.length}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {MULTIVERSE_STAGES.map((stage) => {
            const locked = stage.stageNumber > save.unlockedStage;
            const isSelected = stage.stageNumber === activeStage.stageNumber;
            const stageCompletedCount = stage.nodes.filter((n) =>
              save.completedNodeIds.includes(n.id)
            ).length;

            return (
              <button
                key={stage.id}
                type="button"
                disabled={locked}
                onClick={() => {
                  onSelectStage(stage.stageNumber);
                  setSelectedRegionId(stage.regions[0]?.id ?? '');
                }}
                className={`min-h-[68px] text-left p-3 rounded-lg border transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                  locked
                    ? 'border-slate-800/80 bg-[#080B14] text-slate-500 cursor-not-allowed'
                    : isSelected
                    ? 'border-cyan-400/70 bg-[#10182B] text-white'
                    : 'border-slate-800 bg-[#0B101D] text-slate-300 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-xs font-mono text-slate-400">
                  <span>Stage {stage.stageNumber}</span>
                  {locked ? (
                    <Lock className="w-3.5 h-3.5 text-slate-600" />
                  ) : (
                    <span className="tabular-nums text-cyan-400">
                      {stageCompletedCount}/{stage.nodes.length}
                    </span>
                  )}
                </div>
                <div className="mt-1 text-sm font-medium truncate">
                  {stage.name.replace(/^Stage [IVX]+:\s*/, '')}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Active Universe Overview + Interactive Constellation Canvas */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Constellation Map */}
        <div className={`lg:col-span-7 rounded-xl border ${stagePanelAccent} bg-[#090D18] p-5 flex flex-col justify-between`}>
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-800/80">
            <div>
              <h2 className="font-display text-xl font-semibold text-white">
                {activeStage.name}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {activeStage.difficultyLabel} · {activeStage.themes.slice(0, 3).join(' · ')}
              </p>
            </div>
            <span className="text-xs font-mono text-amber-300/90">
              {activeStage.logicalFoundation}
            </span>
          </div>

          {/* Mobile Vertical Node Stack (prevents 2D coordinate overlap on <640px screens) */}
          <div className="sm:hidden my-4 space-y-2.5">
            {activeStage.nodes.map((node) => {
              const unlocked = isNodeUnlocked(node);
              const completed = save.completedNodeIds.includes(node.id);
              const isBoss = node.kind === 'boss';
              const isRift = node.kind === 'procedural_rift';
              return (
                <button
                  key={`mob-${node.id}`}
                  type="button"
                  disabled={!unlocked}
                  onClick={() => onOpenNode(node)}
                  className={`w-full min-h-[52px] px-4 py-3 rounded-lg border text-left flex items-center justify-between gap-3 transition-colors ${
                    !unlocked
                      ? 'border-slate-800 bg-[#080B14] text-slate-500 cursor-not-allowed'
                      : isBoss
                      ? 'border-amber-400/70 bg-[#1A1325] text-amber-100'
                      : completed
                      ? 'border-emerald-500/60 bg-[#0C1B1E] text-emerald-100'
                      : isRift
                      ? 'border-violet-400/70 bg-[#151226] text-violet-100'
                      : 'border-cyan-400/70 bg-[#0D1A2B] text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {completed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : !unlocked ? (
                      <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                    ) : isBoss ? (
                      <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                    ) : isRift ? (
                      <Sparkles className="w-4 h-4 text-violet-400 shrink-0" />
                    ) : (
                      <Compass className="w-4 h-4 text-cyan-400 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{node.title}</div>
                      <div className="text-xs text-slate-400 truncate">{node.subtitle}</div>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 shrink-0">
                    {completed ? 'Cleared' : unlocked ? 'Open' : 'Locked'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Desktop/Tablet Interactive SVG + Node Field */}
          <div
            data-testid="multiverse-node-canvas"
            className="hidden sm:block relative my-4 h-80 w-full rounded-lg border border-slate-800/90 bg-[#06080E] overflow-hidden"
          >
            {/* Stage-specific SVG Topological Backdrop */}
            <StageTopologyCanvas stageNumber={activeStage.stageNumber} />

            {/* Dependency Edges Layer */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {activeStage.nodes.map((node) =>
                node.prerequisiteNodeIds.map((preId) => {
                  const pre = activeStage.nodes.find((n) => n.id === preId);
                  if (!pre) return null;
                  const unlocked = isNodeUnlocked(node);
                  return (
                    <line
                      key={`${preId}-${node.id}`}
                      x1={pre.position.x}
                      y1={pre.position.y}
                      x2={node.position.x}
                      y2={node.position.y}
                      stroke={unlocked ? '#22D3EE' : '#334155'}
                      strokeOpacity={unlocked ? 0.55 : 0.45}
                      strokeWidth="0.6"
                      strokeDasharray={unlocked ? undefined : '1.5 1.5'}
                    />
                  );
                })
              )}
            </svg>

            {/* Interactive Nodes */}
            {activeStage.nodes.map((node) => {
              const unlocked = isNodeUnlocked(node);
              const completed = save.completedNodeIds.includes(node.id);
              const isBoss = node.kind === 'boss';
              const isRift = node.kind === 'procedural_rift';

              return (
                <button
                  key={node.id}
                  type="button"
                  disabled={!unlocked}
                  onClick={() => onOpenNode(node)}
                  style={{
                    left: `${node.position.x}%`,
                    top: `${node.position.y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  aria-label={`${node.title} (${completed ? 'Completed' : unlocked ? 'Available' : 'Locked'})`}
                  className={`absolute min-h-[44px] min-w-[44px] px-3 py-2 rounded-lg border text-left transition-transform focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                    !unlocked
                      ? 'border-slate-800 bg-[#0B101D]/90 text-slate-500 cursor-not-allowed'
                      : isBoss
                      ? 'border-amber-400/70 bg-[#1A1325] text-amber-100 hover:scale-105'
                      : completed
                      ? 'border-emerald-500/60 bg-[#0C1B1E] text-emerald-100 hover:scale-105'
                      : isRift
                      ? 'border-violet-400/70 bg-[#151226] text-violet-100 hover:scale-105'
                      : 'border-cyan-400/70 bg-[#0D1A2B] text-white hover:scale-105'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-medium whitespace-nowrap">
                    {completed ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : !unlocked ? (
                      <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    ) : isBoss ? (
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    ) : isRift ? (
                      <Sparkles className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                    ) : (
                      <Compass className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    )}
                    <span>{node.title}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 whitespace-nowrap mt-0.5">
                    {node.subtitle}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300 pt-2">
            <div>
              <span className="text-slate-500 uppercase tracking-wider font-mono text-[11px]">Physical Law</span>
              <p className="mt-1 leading-relaxed">{activeStage.physicalLaws}</p>
            </div>
            <div>
              <span className="text-slate-500 uppercase tracking-wider font-mono text-[11px]">Civilization</span>
              <p className="mt-1 leading-relaxed">{activeStage.civilizationProfile}</p>
            </div>
          </div>
        </div>

        {/* Right: Region Exploration, Lore, Environmental Discoveries */}
        <div className="lg:col-span-5 rounded-xl border border-slate-800 bg-[#0B101D] p-5 flex flex-col justify-between space-y-5">
          {activeStage.bannerImage && (
            <div className="relative h-36 w-full rounded-lg overflow-hidden border border-slate-800">
              <img
                src={activeStage.bannerImage}
                alt={activeStage.name}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B101D] via-transparent to-transparent" />
            </div>
          )}

          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5 border-b border-slate-800 pb-3">
              {activeStage.regions.map((reg) => {
                const active = currentRegion?.id === reg.id;
                return (
                  <button
                    key={reg.id}
                    type="button"
                    onClick={() => setSelectedRegionId(reg.id)}
                    className={`min-h-[38px] px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/50'
                        : 'text-slate-400 hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    {reg.name}
                  </button>
                );
              })}
            </div>

            {currentRegion && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-display text-lg font-medium text-white">
                    {currentRegion.name}
                  </h3>
                  <p className="text-sm text-slate-300 mt-1 leading-relaxed">
                    {currentRegion.atmosphere}
                  </p>
                  <p className="text-xs text-cyan-300/90 mt-2 font-mono">
                    Governing Rule: {currentRegion.mechanicalRule}
                  </p>
                </div>

                {/* Discoverable Chambers, Inscriptions, Artifacts */}
                <div className="space-y-2.5">
                  <div className="text-xs font-mono uppercase tracking-wider text-slate-400">
                    Environmental Discoveries ({currentRegion.discoveries.filter((d) => save.discoveredItemIds.includes(d.id)).length}/{currentRegion.discoveries.length})
                  </div>
                  {currentRegion.discoveries.map((disc) => {
                    const found = save.discoveredItemIds.includes(disc.id);
                    return (
                      <div
                        key={disc.id}
                        className="p-3.5 rounded-lg border border-slate-800 bg-[#070A12] space-y-2"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-medium text-white">{disc.title}</div>
                            <div className="text-xs text-slate-400 mt-0.5 capitalize">
                              {disc.type.replace('_', ' ')} · +{disc.kpReward} KP · +{disc.ipReward} IP
                            </div>
                          </div>
                          {found ? (
                            <span className="text-xs font-mono text-emerald-400 shrink-0">
                              Recorded
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onDiscoverItem(disc.id)}
                              className="min-h-[38px] px-3 py-1.5 rounded-md bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-xs font-medium text-cyan-200 transition-colors inline-flex items-center gap-1.5 shrink-0"
                            >
                              <Search className="w-3.5 h-3.5" />
                              Inspect
                            </button>
                          )}
                        </div>
                        <p
                          key={found ? `${disc.id}-found` : disc.id}
                          className={`text-xs text-slate-300 leading-relaxed ${
                            found ? 'animate-panel-reveal' : ''
                          }`}
                        >
                          {found ? disc.detail : disc.summary}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {currentRegion.bossId && BOSS_ENCOUNTERS[currentRegion.bossId] && (
                  <div className="p-3.5 rounded-lg border border-amber-500/30 bg-[#141020]">
                    <div className="text-xs font-mono uppercase tracking-wider text-amber-300">
                      Regional Boss Encounter
                    </div>
                    <div className="text-sm font-medium text-white mt-1">
                      {BOSS_ENCOUNTERS[currentRegion.bossId].name}
                    </div>
                    <div className="text-xs text-slate-300 mt-0.5">
                      {BOSS_ENCOUNTERS[currentRegion.bossId].epithet}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Procedural Rifts & Endgame Infinite Exploration */}
      <section className="rounded-xl border border-slate-800 bg-[#0B101D] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <InfinityIcon className="w-5 h-5 text-violet-400 shrink-0" />
            <div>
              <h2 className="font-display text-lg font-semibold text-white">
                {endgameUnlocked
                  ? 'Infinite Exploration & Ascension Lab'
                  : 'Procedural Anomaly Simulator'}
              </h2>
              <p className="text-xs text-slate-400">
                Generate verified offline puzzles tailored to your demonstrated profile (Recommended focus: {analytics.recommendedPracticeCategory.replace('_', ' ')}).
              </p>
            </div>
          </div>
          <div className="text-xs font-mono text-slate-400 tabular-nums">
            Adaptive Offset: {save.adaptiveDifficultyOffset >= 0 ? '+' : ''}
            {save.adaptiveDifficultyOffset} · Procedural Solved: {save.proceduralSolvedCount}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4 pt-1">
          <label className="flex-1 text-xs text-slate-300 space-y-1.5">
            <span className="block font-medium">Reasoning Domain</span>
            <select
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value as PuzzleCategory)}
              className="w-full min-h-[44px] rounded-lg border border-slate-700 bg-[#06080E] px-3 text-sm text-white focus-visible:outline-2 focus-visible:outline-cyan-400"
            >
              <option value="mathematical">Mathematical Reasoning</option>
              <option value="formal_logic">Formal Logic</option>
              <option value="pattern">Pattern Recognition</option>
              <option value="spatial">Spatial Reasoning</option>
              <option value="scientific">Scientific Causal Assay</option>
              <option value="linguistic">Linguistic Reconstruction</option>
              <option value="strategic">Strategic Optimization</option>
              <option value="philosophical">Philosophical & Paradox</option>
              <option value="hybrid">Complex Hybrid Synthesis</option>
            </select>
          </label>

          <label className="flex-1 text-xs text-slate-300 space-y-1.5">
            <span className="block font-medium tabular-nums">
              Target Complexity ({customDifficulty}/100)
            </span>
            <input
              type="range"
              min={15}
              max={95}
              value={customDifficulty}
              onChange={(e) => setCustomDifficulty(Number(e.target.value))}
              className="w-full min-h-[44px] accent-cyan-400"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onLaunchEndgameProcedural(customCategory, customDifficulty)}
              className="min-h-[44px] px-5 py-2.5 rounded-lg bg-violet-500 hover:bg-violet-400 text-slate-950 font-semibold text-sm transition-colors whitespace-nowrap shrink-0"
            >
              Generate Anomaly
            </button>

            <button
              type="button"
              onClick={() =>
                onLaunchEndgameProcedural(
                  analytics.growthCategory,
                  Math.min(90, Math.max(20, 28 + save.tubLevel * 4 + save.adaptiveDifficultyOffset))
                )
              }
              title={`Target growth domain: ${analytics.growthCategory.replace('_', ' ')}`}
              className="min-h-[44px] px-4 py-2.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-200 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap shrink-0 capitalize"
            >
              Growth Focus ({analytics.growthCategory.replace('_', ' ')})
            </button>

            <button
              type="button"
              onClick={() =>
                onLaunchEndgameProcedural(
                  analytics.stretchCategory,
                  Math.min(95, Math.max(35, 42 + save.tubLevel * 5 + save.adaptiveDifficultyOffset))
                )
              }
              title={`Peak challenge in strongest domain: ${analytics.stretchCategory.replace('_', ' ')}`}
              className="min-h-[44px] px-4 py-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-200 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap shrink-0 capitalize"
            >
              Peak Stretch ({analytics.stretchCategory.replace('_', ' ')})
            </button>
          </div>
        </div>
      </section>
    </div>
  );
});
