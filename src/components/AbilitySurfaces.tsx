import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Compass,
  Eye,
  GitBranch,
  Layers,
  Network,
  Scale,
  Sparkles,
} from 'lucide-react';
import { COGNITIVE_ABILITIES } from '../engine/attributes';
import { ERROR_PATTERN_MAP } from '../engine/metacognition';
import { GameSaveState, PuzzleSpec } from '../engine/types';

interface AbilitySurfacesProps {
  puzzle: PuzzleSpec;
  save: GameSaveState;
  spatialState?: number[][];
}

export const AbilitySurfaces: React.FC<AbilitySurfacesProps> = ({
  puzzle,
  save,
  spatialState,
}) => {
  const unlockedAbilities = useMemo(
    () => COGNITIVE_ABILITIES.filter((ab) => (save.abilities[ab.id] ?? 0) >= 1),
    [save.abilities]
  );

  const [activeId, setActiveId] = useState<string | null>(
    unlockedAbilities[0]?.id ?? null
  );
  const [checkedSubgoals, setCheckedSubgoals] = useState<number[]>([]);
  const [premiseAIdx, setPremiseAIdx] = useState<number>(0);
  const [premiseBIdx, setPremiseBIdx] = useState<number>(1);
  const [binderVerdict, setBinderVerdict] = useState<string>('');
  const [scanLeftIdx, setScanLeftIdx] = useState<number>(0);
  const [scanRightIdx, setScanRightIdx] = useState<number>(1);
  const [flaggedDiscrepancies, setFlaggedDiscrepancies] = useState<string[]>([]);
  const [symbolicDraft, setSymbolicDraft] = useState<string>('');
  const [theoryNotes, setTheoryNotes] = useState<Record<number, string>>({});

  const activeAbility =
    unlockedAbilities.find((a) => a.id === activeId) ?? unlockedAbilities[0] ?? null;

  const statementsPool = useMemo(() => {
    const rows: { title: string; body: string }[] = [];
    puzzle.rules.forEach((r, idx) => rows.push({ title: `Rule ${idx + 1}`, body: r }));
    puzzle.visualData?.premises?.forEach((p, idx) =>
      rows.push({ title: `Premise ${idx + 1}`, body: p })
    );
    puzzle.documents?.forEach((d) =>
      rows.push({ title: d.title, body: `${d.source}: ${d.excerpt}` })
    );
    puzzle.sceneObjects?.forEach((o) =>
      rows.push({ title: o.label, body: `${o.locationNote}: ${o.observation}` })
    );
    return rows;
  }, [puzzle.rules, puzzle.visualData?.premises, puzzle.documents, puzzle.sceneObjects]);

  if (unlockedAbilities.length === 0) {
    return (
      <section className="rounded-xl border border-slate-800 bg-[#0B101D] p-4 sm:p-5 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold text-white">
            Cognitive Instruments
          </h2>
          <span className="text-[11px] font-mono text-slate-500">0 Unlocked</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Unlock abilities in the Abilities tab using Intelligence Points to open player-operated worksheets (Decomposition outlines, Contradiction Binders, Discrepancy Scanners, and Calibration Logs) here.
        </p>
      </section>
    );
  }

  return (
    <section
      data-testid="ability-surfaces"
      className="rounded-xl border border-slate-800 bg-[#0B101D] p-4 sm:p-5 space-y-3.5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-sm font-semibold text-white">
          Cognitive Instruments
        </h2>
        <span className="text-[11px] font-mono text-slate-400">
          {unlockedAbilities.length} Active Workspaces
        </span>
      </div>

      {/* Ability Selector Tabs */}
      <div className="flex flex-wrap gap-1.5">
        {unlockedAbilities.map((ab) => {
          const isCurrent = activeAbility?.id === ab.id;
          return (
            <button
              key={ab.id}
              type="button"
              onClick={() => setActiveId(ab.id)}
              className={`min-h-[36px] px-2.5 py-1 rounded-md border text-xs font-medium transition-colors ${
                isCurrent
                  ? 'border-cyan-400 bg-cyan-500/15 text-cyan-200'
                  : 'border-slate-800 bg-[#06080E] text-slate-400 hover:text-white'
              }`}
            >
              {ab.surfaceName ?? ab.name}
            </button>
          );
        })}
      </div>

      {/* Active Interactive Ability Surface — strictly manual, zero answer leaks */}
      {activeAbility && (
        <div className="rounded-lg border border-slate-800 bg-[#06080E] p-3.5 space-y-3 animate-panel-reveal">
          <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-cyan-300">
            <span>
              {activeAbility.surfaceName ?? activeAbility.name} · Rank{' '}
              {save.abilities[activeAbility.id] ?? 1}
            </span>
            <span className="text-slate-500">Manual Workspace</span>
          </div>

          {activeAbility.id === 'decomposition' && (
            <div className="space-y-2">
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                Check off sub-questions as you verify each step yourself:
              </div>
              <div className="space-y-1.5">
                {puzzle.cognitiveTools.decomposition.map((step, i) => {
                  const done = checkedSubgoals.includes(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() =>
                        setCheckedSubgoals((prev) =>
                          prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
                        )
                      }
                      className={`w-full text-left px-3 py-2 rounded border text-xs transition-colors ${
                        done
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200 line-through'
                          : 'border-slate-800 bg-[#0B101D] text-slate-200 hover:border-slate-600'
                      }`}
                    >
                      {i + 1}. {step}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeAbility.id === 'dependency_mapping' && (
            <div className="space-y-2">
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
                Variable &amp; Rule Dependencies:
              </div>
              <ul className="space-y-1.5 text-xs text-slate-200 list-disc pl-5">
                {puzzle.cognitiveTools.dependencyMapping.map((dep, i) => (
                  <li key={i}>{dep}</li>
                ))}
              </ul>
            </div>
          )}

          {activeAbility.id === 'logical_verification' && (
            <div className="space-y-2.5">
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-amber-300" />
                Compare two statements manually to audit whether they agree or clash:
              </div>
              {statementsPool.length >= 2 ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <select
                        value={premiseAIdx}
                        onChange={(e) => setPremiseAIdx(Number(e.target.value))}
                        aria-label="Statement A"
                        className="w-full min-h-[36px] rounded border border-slate-800 bg-[#0B101D] px-2 text-xs text-white"
                      >
                        {statementsPool.map((s, idx) => (
                          <option key={idx} value={idx}>
                            {s.title}
                          </option>
                        ))}
                      </select>
                      <div className="rounded border border-slate-800 bg-[#0B101D] p-2 text-xs text-slate-300">
                        {statementsPool[premiseAIdx]?.body}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <select
                        value={premiseBIdx}
                        onChange={(e) => setPremiseBIdx(Number(e.target.value))}
                        aria-label="Statement B"
                        className="w-full min-h-[36px] rounded border border-slate-800 bg-[#0B101D] px-2 text-xs text-white"
                      >
                        {statementsPool.map((s, idx) => (
                          <option key={idx} value={idx}>
                            {s.title}
                          </option>
                        ))}
                      </select>
                      <div className="rounded border border-slate-800 bg-[#0B101D] p-2 text-xs text-slate-300">
                        {statementsPool[premiseBIdx]?.body}
                      </div>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={binderVerdict}
                    onChange={(e) => setBinderVerdict(e.target.value)}
                    placeholder="Record your manual audit (e.g., A forces B to fail unless X)..."
                    className="w-full min-h-[36px] rounded border border-slate-800 bg-[#0B101D] px-2.5 text-xs text-white placeholder:text-slate-600"
                  />
                </>
              ) : (
                <p className="text-xs text-slate-400">
                  Place statements on your Evidence Board above to compare pairs here.
                </p>
              )}
            </div>
          )}

          {activeAbility.id === 'anomaly_detection' && (
            <div className="space-y-2.5">
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-violet-300" />
                Side-by-Side Exhibit Scanner (mark discrepancies manually):
              </div>
              {statementsPool.length >= 2 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { idx: scanLeftIdx, setIdx: setScanLeftIdx, label: 'Left Exhibit' },
                    { idx: scanRightIdx, setIdx: setScanRightIdx, label: 'Right Exhibit' },
                  ].map((pane, pIdx) => {
                    const item = statementsPool[pane.idx] ?? statementsPool[0];
                    const flagKey = `${pIdx}:${item?.title}`;
                    const flagged = flaggedDiscrepancies.includes(flagKey);
                    return (
                      <div key={pIdx} className="space-y-1.5">
                        <select
                          value={pane.idx}
                          onChange={(e) => pane.setIdx(Number(e.target.value))}
                          aria-label={pane.label}
                          className="w-full min-h-[36px] rounded border border-slate-800 bg-[#0B101D] px-2 text-xs text-white"
                        >
                          {statementsPool.map((s, idx) => (
                            <option key={idx} value={idx}>
                              {s.title}
                            </option>
                          ))}
                        </select>
                        <div className="rounded border border-slate-800 bg-[#0B101D] p-2.5 text-xs text-slate-300 space-y-2">
                          <p>{item?.body}</p>
                          <button
                            type="button"
                            onClick={() =>
                              setFlaggedDiscrepancies((prev) =>
                                prev.includes(flagKey)
                                  ? prev.filter((k) => k !== flagKey)
                                  : [...prev, flagKey]
                              )
                            }
                            className={`px-2 py-1 rounded border text-[11px] font-mono ${
                              flagged
                                ? 'border-amber-400 bg-amber-500/15 text-amber-200'
                                : 'border-slate-700 text-slate-400 hover:text-white'
                            }`}
                          >
                            {flagged ? 'Marked Suspect' : 'Mark Suspect'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-300">
                  {puzzle.cognitiveTools.anomalyHighlight}
                </p>
              )}
            </div>
          )}

          {activeAbility.id === 'symbolic_translation' && (
            <div className="space-y-2">
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                Symbolic Framing Reference &amp; Scratchpad:
              </div>
              <div className="rounded border border-slate-800 bg-[#0B101D] p-2.5 text-xs font-mono text-amber-200">
                {puzzle.cognitiveTools.symbolicTranslation}
              </div>
              <textarea
                rows={2}
                value={symbolicDraft}
                onChange={(e) => setSymbolicDraft(e.target.value)}
                placeholder="Rewrite conditions in your own notation (e.g., Let x = ..., if P -> Q)..."
                className="w-full rounded border border-slate-800 bg-[#0B101D] p-2 text-xs font-mono text-white placeholder:text-slate-600"
              />
            </div>
          )}

          {activeAbility.id === 'divergent_exploration' && (
            <div className="space-y-2">
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-violet-300" />
                Test Competing Models Manually:
              </div>
              {puzzle.cognitiveTools.alternativeHypotheses.map((hyp, i) => (
                <div
                  key={i}
                  className="rounded border border-slate-800 bg-[#0B101D] p-2.5 space-y-1.5"
                >
                  <div className="text-xs text-slate-200">{hyp}</div>
                  <input
                    type="text"
                    value={theoryNotes[i] ?? ''}
                    onChange={(e) =>
                      setTheoryNotes((prev) => ({ ...prev, [i]: e.target.value }))
                    }
                    placeholder="Evidence for or against this model..."
                    className="w-full min-h-[34px] rounded border border-slate-800 bg-[#06080E] px-2 text-[11px] text-white placeholder:text-slate-600"
                  />
                </div>
              ))}
            </div>
          )}

          {activeAbility.id === 'error_detection' && (
            <div className="space-y-2">
              <div className="text-xs text-slate-400">
                Recent Slips From Your Personal Notebook (no answer hints):
              </div>
              {save.errorJournal.length === 0 ? (
                <p className="text-xs text-slate-400">
                  No logged slips yet. Any wrong attempts you diagnose will surface patterns to watch here.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {save.errorJournal.slice(-3).reverse().map((entry) => (
                    <li
                      key={entry.id}
                      className="rounded border border-slate-800 bg-[#0B101D] p-2 text-[11px] text-slate-300"
                    >
                      <span className="font-mono text-amber-300">
                        {ERROR_PATTERN_MAP[entry.actualPattern]?.shortLabel ?? entry.actualPattern}
                      </span>{' '}
                      on <span className="text-white">{entry.puzzleTitle}</span>: “
                      {entry.reflectionText}”
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {activeAbility.id === 'confidence_calibration' && (
            <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs tabular-nums">
              {[
                {
                  label: 'Sure',
                  correct: save.confidenceStats?.sureCorrect ?? 0,
                  total: save.confidenceStats?.sureTotal ?? 0,
                },
                {
                  label: 'Think so',
                  correct: save.confidenceStats?.thinkSoCorrect ?? 0,
                  total: save.confidenceStats?.thinkSoTotal ?? 0,
                },
                {
                  label: 'Guessing',
                  correct: save.confidenceStats?.guessingCorrect ?? 0,
                  total: save.confidenceStats?.guessingTotal ?? 0,
                },
              ].map((row) => (
                <div key={row.label} className="rounded border border-slate-800 bg-[#0B101D] p-2">
                  <div className="text-[11px] text-slate-400">{row.label}</div>
                  <div className="text-sm text-cyan-300 font-semibold mt-0.5">
                    {row.total > 0 ? `${Math.round((row.correct / row.total) * 100)}%` : '—'}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {row.correct}/{row.total}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeAbility.id === 'spatial_parity_lens' &&
            puzzle.visualData?.spatialGrid &&
            spatialState && (() => {
              const sz = puzzle.visualData.spatialGrid.size;
              const activeCount = spatialState.flat().filter(Boolean).length;
              const srcCount = puzzle.visualData.spatialGrid.initialGrid
                .flat()
                .filter(Boolean).length;
              const rowCounts = spatialState.map((r) => r.filter(Boolean).length);
              return (
                <div className="text-xs font-mono text-cyan-200 space-y-1 tabular-nums">
                  <div>
                    Active Cells: {activeCount} (Source had {srcCount} across {sz}×{sz})
                  </div>
                  <div className="text-slate-400">
                    Row Counts: [{rowCounts.join(', ')}]
                  </div>
                </div>
              );
            })()}

          {![
            'decomposition',
            'dependency_mapping',
            'logical_verification',
            'anomaly_detection',
            'symbolic_translation',
            'divergent_exploration',
            'error_detection',
            'confidence_calibration',
            'spatial_parity_lens',
          ].includes(activeAbility.id) && (
            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Network className="w-3.5 h-3.5 text-cyan-400" />
                <span>{activeAbility.inPuzzleEffect}</span>
              </div>
              {activeAbility.id === 'conceptual_projection' && (
                <p className="text-[11px] font-mono text-amber-200/90 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  Unlocked Book Folios: {save.unlockedBookIds?.length ?? save.unlockedArchiveIds.length}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
