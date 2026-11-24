import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Compass,
  FileText,
  HelpCircle,
  Lightbulb,
  MessageSquareQuote,
  RotateCw,
} from 'lucide-react';
import { getSecondaryGameplayBonuses } from '../engine/attributes';
import { getAdaptiveOpponentCue } from '../engine/adaptiveOpponents';
import { getModeDifficultyConfig } from '../engine/difficultyConfig';
import {
  computeHintCostIP,
  getAdaptiveHintSpeaker,
  getAdaptiveHintText,
  getFreeHintCooldownMs,
  getHintTierLabel,
  HINT_LEVELS,
  isFreeBasicHintAvailable,
  resolveIntelligenceTier,
} from '../engine/hintEngine';
import { MetacognitionResolution } from '../engine/metacognition';
import { KNOWLEDGE_ARCHIVE, MULTIVERSE_STAGES } from '../engine/multiverseData';
import { serializeGrid, verifyPuzzleAnswer } from '../engine/puzzleGenerator';
import {
  BossEncounter,
  ConfidenceTag,
  ErrorPatternId,
  EvidenceBoardState,
  GameSaveState,
  HintLevel,
  PuzzleSpec,
  StrictVerdict,
} from '../engine/types';
import { AbilitySurfaces } from './AbilitySurfaces';
import { EvidenceBoard } from './EvidenceBoard';
import { MetacognitionPenaltyPanel } from './MetacognitionPenaltyPanel';
import { ScdWorkspaces } from './ScdWorkspaces';

interface PuzzleChamberProps {
  puzzle: PuzzleSpec;
  save: GameSaveState;
  boss?: BossEncounter;
  bossPhaseIndex?: number;
  onBack: () => void;
  onSaveNotes: (puzzleId: string, notes: string) => void;
  onSpendHintIP: (costIP: number, isFreePulse: boolean) => void;
  onSolveSuccess: (metrics: {
    attempts: number;
    hintsUsed: number;
    maxHintLevel: HintLevel;
    timeSeconds: number;
    confidenceRated?: number;
    confidenceTag?: ConfidenceTag;
    submittedAnswer?: string;
  }) => void;
  onApplyMetacognition: (params: {
    submittedAnswer: string;
    confidence?: ConfidenceTag;
    selectedPattern: ErrorPatternId;
    reflectionText: string;
    isBoss?: boolean;
    evidenceCited?: string;
  }) => MetacognitionResolution;
  onSaveEvidenceBoard: (board: EvidenceBoardState) => void;
  onSaveSecondOrderReflection: (
    puzzleId: string,
    puzzleTitle: string,
    whyItWorks: string,
    patternToWatch: string
  ) => void;
  onAdvanceBossPhase?: () => void;
}

const CONFIDENCE_OPTIONS: { id: ConfidenceTag; label: string; score: number; hint: string }[] = [
  { id: 'sure', label: 'Sure', score: 90, hint: '1.5× Clarity strain if wrong' },
  { id: 'think_so', label: 'Think so', score: 65, hint: 'Standard Clarity strain' },
  { id: 'guessing', label: 'Guessing', score: 30, hint: 'Low calibration weight' },
];

export const PuzzleChamber: React.FC<PuzzleChamberProps> = ({
  puzzle,
  save,
  boss,
  bossPhaseIndex = 0,
  onBack,
  onSaveNotes,
  onSpendHintIP,
  onSolveSuccess,
  onApplyMetacognition,
  onSaveEvidenceBoard,
  onSaveSecondOrderReflection,
  onAdvanceBossPhase,
}) => {
  const [answerInput, setAnswerInput] = useState<string>('');
  const [spatialState, setSpatialState] = useState<number[][]>(() => {
    if (puzzle.visualData?.spatialGrid) {
      const sz = puzzle.visualData.spatialGrid.size;
      return Array.from({ length: sz }, () => Array(sz).fill(0));
    }
    return [];
  });
  const [selectedConfidence, setSelectedConfidence] = useState<ConfidenceTag | null>(null);
  const [attempts, setAttempts] = useState<number>(0);
  const [wrongCountOnPuzzle, setWrongCountOnPuzzle] = useState<number>(0);
  const [unlockedHintLevel, setUnlockedHintLevel] = useState<HintLevel>(0);
  const [hintsUsedCount, setHintsUsedCount] = useState<number>(0);
  const [feedback, setFeedback] = useState<{
    ok: boolean;
    text: string;
    verdict?: StrictVerdict;
    weaknessDiagnosis?: string;
  } | null>(null);
  const [pendingAudit, setPendingAudit] = useState<{
    submittedAnswer: string;
    confidence?: ConfidenceTag;
  } | null>(null);
  const [solved, setSolved] = useState<boolean>(false);
  const [startTime, setStartTime] = useState<number>(() => Date.now());
  const [notes, setNotes] = useState<string>(save.puzzleNotes[puzzle.id] ?? '');
  const [openClueIds, setOpenClueIds] = useState<string[]>([]);
  const [openObjectIds, setOpenObjectIds] = useState<string[]>([]);
  const [openDocumentIds, setOpenDocumentIds] = useState<string[]>([]);
  const [whyItWorksDraft, setWhyItWorksDraft] = useState<string>(
    save.secondOrderReflections?.[puzzle.id]?.whyItWorks ?? ''
  );
  const [patternWatchDraft, setPatternWatchDraft] = useState<string>(
    save.secondOrderReflections?.[puzzle.id]?.patternToWatch ?? ''
  );
  const [reflectionSavedNotice, setReflectionSavedNotice] = useState<boolean>(false);
  const [phaseTransition, setPhaseTransition] = useState<'idle' | 'exiting'>('idle');
  const transitionTimerRef = useRef<number | null>(null);
  const puzzleNotesRef = useRef<Record<string, string>>(save.puzzleNotes);
  puzzleNotesRef.current = save.puzzleNotes;

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current !== null) {
        window.clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
    setPhaseTransition('idle');
    setAnswerInput('');
    if (puzzle.visualData?.spatialGrid) {
      const sz = puzzle.visualData.spatialGrid.size;
      setSpatialState(Array.from({ length: sz }, () => Array(sz).fill(0)));
    } else {
      setSpatialState([]);
    }
    setSelectedConfidence(null);
    setAttempts(0);
    setWrongCountOnPuzzle(0);
    setUnlockedHintLevel(0);
    setHintsUsedCount(0);
    setFeedback(null);
    setPendingAudit(null);
    setSolved(false);
    setStartTime(Date.now());
    setNotes(puzzleNotesRef.current[puzzle.id] ?? '');
    setOpenClueIds([]);
    setOpenObjectIds([]);
    setOpenDocumentIds([]);
    setWhyItWorksDraft(save.secondOrderReflections?.[puzzle.id]?.whyItWorks ?? '');
    setPatternWatchDraft(save.secondOrderReflections?.[puzzle.id]?.patternToWatch ?? '');
    setReflectionSavedNotice(false);
  }, [puzzle.id]);

  const modeConfig = useMemo(
    () => getModeDifficultyConfig(puzzle, Boolean(boss)),
    [puzzle, boss]
  );

  const intelligenceTier = resolveIntelligenceTier(save, puzzle.relevantAttributes);
  const unlockedBookIds = save.unlockedBookIds ?? save.unlockedArchiveIds;

  const secBonuses = useMemo(
    () =>
      getSecondaryGameplayBonuses(
        save.attributes,
        unlockedBookIds.length,
        save.transcendenceRank,
        save.abilities
      ),
    [save.attributes, unlockedBookIds.length, save.transcendenceRank, save.abilities]
  );

  const opponentCue = useMemo(
    () => getAdaptiveOpponentCue(save, puzzle, attempts),
    [save, puzzle, attempts]
  );

  const stageThemeBorder =
    puzzle.stageNumber >= 5
      ? 'border-amber-500/35'
      : puzzle.stageNumber >= 3
        ? 'border-violet-500/35'
        : 'border-cyan-500/30';

  const bookEchoes = useMemo(() => {
    const echoes: { title: string; insight: string; kind: string }[] = [];
    const linkedIds = puzzle.narrative?.linkedArchiveIds ?? [];
    for (const aid of linkedIds) {
      if (unlockedBookIds.includes(aid)) {
        const entry = KNOWLEDGE_ARCHIVE.find((e) => e.id === aid);
        if (entry) {
          echoes.push({
            title: entry.title,
            insight: entry.keyInsight,
            kind: 'Book Folio Resonance',
          });
        }
      }
    }
    const linkedDiscs = puzzle.narrative?.linkedDiscoveryIds ?? [];
    for (const did of linkedDiscs) {
      if (save.discoveredItemIds.includes(did)) {
        for (const st of MULTIVERSE_STAGES) {
          for (const reg of st.regions) {
            const disc = reg.discoveries.find((d) => d.id === did);
            if (disc) {
              echoes.push({
                title: disc.title,
                insight: disc.detail,
                kind: 'Field Discovery Echo',
              });
            }
          }
        }
      }
    }
    return echoes;
  }, [puzzle.narrative, unlockedBookIds, save.discoveredItemIds]);

  const freePulseReady = isFreeBasicHintAvailable(save);
  const freeCooldownMin = Math.ceil(getFreeHintCooldownMs(save) / 60000);

  const toggleSpatialCell = (r: number, c: number) => {
    if (solved || pendingAudit) return;
    setSpatialState((prev) =>
      prev.map((row, rIdx) =>
        rIdx === r ? row.map((val, cIdx) => (cIdx === c ? (val === 1 ? 0 : 1) : val)) : row
      )
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (solved || pendingAudit) return;

    if (!modeConfig.confidenceOptional && !selectedConfidence) {
      setFeedback({
        ok: false,
        text: 'Tag your Confidence (Sure, Think so, or Guessing) before committing your answer.',
      });
      return;
    }

    const submission =
      puzzle.interactionType === 'spatial_grid'
        ? serializeGrid(spatialState)
        : answerInput;

    if (!submission.trim()) {
      setFeedback({ ok: false, text: 'Enter or select a candidate response first.' });
      return;
    }

    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);

    const confMeta = CONFIDENCE_OPTIONS.find((c) => c.id === selectedConfidence);
    const res = verifyPuzzleAnswer(puzzle, submission);

    if (res.correct) {
      setSolved(true);
      setPendingAudit(null);
      setFeedback({ ok: true, text: res.feedback, verdict: res.verdict });
      const elapsed = Math.max(1, Math.round((Date.now() - startTime) / 1000));
      onSolveSuccess({
        attempts: nextAttempts,
        hintsUsed: hintsUsedCount,
        maxHintLevel: unlockedHintLevel,
        timeSeconds: elapsed,
        confidenceRated: confMeta?.score,
        confidenceTag: selectedConfidence ?? undefined,
        submittedAnswer: submission,
      });
    } else {
      setWrongCountOnPuzzle((c) => c + 1);
      setFeedback({
        ok: false,
        text: res.feedback,
        verdict: res.verdict,
        weaknessDiagnosis: res.weaknessDiagnosis,
      });
      setPendingAudit({
        submittedAnswer: submission,
        confidence: selectedConfidence ?? undefined,
      });
    }
  };

  const handleUnlockHint = (targetLevel: 1 | 2 | 3, useFreePulse = false) => {
    if (targetLevel <= unlockedHintLevel) return;
    const cost = useFreePulse ? 0 : computeHintCostIP(save, targetLevel, puzzle.difficultyScore);
    if (!useFreePulse && save.ip < cost) {
      setFeedback({
        ok: false,
        text: `Insufficient IP for Hint Tier ${targetLevel} (needs ${cost} IP, have ${save.ip} IP).`,
      });
      return;
    }
    onSpendHintIP(cost, useFreePulse);
    setUnlockedHintLevel(targetLevel);
    setHintsUsedCount((c) => c + 1);
  };

  const triggerPhaseExitThen = (callback: () => void) => {
    if (phaseTransition !== 'idle') return;
    setPhaseTransition('exiting');
    transitionTimerRef.current = window.setTimeout(() => {
      transitionTimerRef.current = null;
      callback();
    }, 170);
  };

  const nextHintLevel = Math.min(3, unlockedHintLevel + 1) as 1 | 2 | 3;
  const nextHintCost = computeHintCostIP(save, nextHintLevel, puzzle.difficultyScore);
  const clarityPct = Math.max(
    0,
    Math.min(100, Math.round((save.clarity / (modeConfig.clarityMax || 100)) * 100))
  );

  return (
    <div
      key={puzzle.id}
      data-testid="puzzle-chamber-stage"
      data-transition={phaseTransition}
      className={`space-y-5 ${
        phaseTransition === 'exiting' ? 'animate-chamber-exit' : 'animate-chamber-enter'
      }`}
    >
      {/* Top Chamber Bar: Back, Clarity Meter, Difficulty Telemetry */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => triggerPhaseExitThen(onBack)}
          className="min-h-[44px] px-3 py-2 -ml-3 rounded-lg text-sm font-medium text-slate-300 hover:text-white inline-flex items-center gap-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Return to Multiverse
        </button>

        <div className="flex flex-wrap items-center gap-4 text-xs font-mono tabular-nums">
          <div className="flex items-center gap-2.5" data-testid="chamber-clarity-meter">
            <span className="text-slate-400">Clarity</span>
            <div className="w-24 h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  save.clarity <= modeConfig.clarityFloor + 10
                    ? 'bg-rose-400'
                    : save.clarity < 60
                      ? 'bg-amber-400'
                      : 'bg-cyan-400'
                }`}
                style={{ width: `${clarityPct}%` }}
              />
            </div>
            <span className="text-white">
              {save.clarity}/{modeConfig.clarityMax}
            </span>
            <span className="text-slate-500">(Floor {modeConfig.clarityFloor})</span>
          </div>

          <span className="text-slate-400">
            {puzzle.difficulty} · {puzzle.category.replace('_', ' ')} · {puzzle.difficultyScore}/100 · Attempts {attempts}
          </span>
        </div>
      </div>

      {/* Boss Phase Banner */}
      {boss && (
        <div className="rounded-xl border border-amber-500/40 bg-[#141020] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-panel-reveal">
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-amber-300">
              Guardian Encounter · Phase {bossPhaseIndex + 1} of {boss.phases.length}
            </div>
            <h2 className="font-display text-lg font-semibold text-white mt-0.5">
              {boss.name} — {boss.phases[bossPhaseIndex]?.title}
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              {boss.phases[bossPhaseIndex]?.narrativeShift}
            </p>
          </div>
          <div className="text-xs font-mono text-amber-200/90 shrink-0">
            Constraint: {boss.phases[bossPhaseIndex]?.newConstraint}
          </div>
        </div>
      )}

      {/* Adaptive Opponent Memory Cue */}
      <section
        aria-label="Chamber observation"
        data-testid="adaptive-opponent-cue"
        className="rounded-xl border border-slate-800 bg-[#090D18] px-4 py-3 flex flex-wrap items-start justify-between gap-3"
      >
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <MessageSquareQuote className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
          <div className="space-y-0.5 min-w-0">
            <div className="text-xs font-mono text-amber-300">
              {opponentCue.speaker} <span className="text-slate-400">· {opponentCue.role}</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">{opponentCue.line}</p>
          </div>
        </div>
        <span className="text-[11px] font-mono text-slate-400 shrink-0">
          {opponentCue.tacticalStance}
        </span>
      </section>

      {/* Main Two-Column Puzzle Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Brief, Neutral Exhibits, Interactive Inputs, Self-Audit Gate & Resolution */}
        <div className="lg:col-span-7 space-y-5">
          <div className={`rounded-xl border ${stageThemeBorder} bg-[#0B101D] p-5 sm:p-6 space-y-5`}>
            <div className="space-y-2.5">
              {puzzle.narrative?.context && (
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  {puzzle.narrative.context}
                </div>
              )}
              <h1 className="font-display text-2xl font-semibold text-white">
                {puzzle.title}
              </h1>
              {puzzle.narrative?.intro && (
                <p className="border-t border-slate-800/80 pt-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {puzzle.narrative.intro}
                </p>
              )}
              <p className="text-sm font-medium text-cyan-300">Objective: {puzzle.objective}</p>
              <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                {puzzle.promptBody}
              </p>
            </div>

            {/* Neutral Unhighlighted Inspectable Scene Objects */}
            {puzzle.sceneObjects && puzzle.sceneObjects.length > 0 && (
              <div className="border-t border-slate-800/80 pt-4 space-y-2">
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  Chamber Objects ({puzzle.sceneObjects.length})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {puzzle.sceneObjects.map((obj) => {
                    const isOpen = openObjectIds.includes(obj.id);
                    return (
                      <div
                        key={obj.id}
                        className="rounded-lg border border-slate-800 bg-[#06080E]"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setOpenObjectIds((prev) =>
                              prev.includes(obj.id)
                                ? prev.filter((id) => id !== obj.id)
                                : [...prev, obj.id]
                            )
                          }
                          className="w-full min-h-[42px] px-3 py-2 text-left flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="text-[10px] font-mono text-slate-500">
                              {obj.kindTag} · {obj.locationNote}
                            </div>
                            <div className="text-xs font-medium text-slate-200 truncate">
                              {obj.label}
                            </div>
                          </div>
                          {isOpen ? (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          )}
                        </button>
                        {isOpen && (
                          <div className="px-3 pb-2.5 pt-1 border-t border-slate-800/80 text-xs text-slate-300 leading-relaxed">
                            {obj.observation}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Neutral Unhighlighted Documents & Exhibits */}
            {puzzle.documents && puzzle.documents.length > 0 && (
              <div className="border-t border-slate-800/80 pt-4 space-y-2">
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  Documents &amp; Records ({puzzle.documents.length})
                </div>
                <div className="space-y-2">
                  {puzzle.documents.map((doc) => {
                    const isOpen = openDocumentIds.includes(doc.id);
                    return (
                      <div
                        key={doc.id}
                        className="rounded-lg border border-slate-800 bg-[#06080E]"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setOpenDocumentIds((prev) =>
                              prev.includes(doc.id)
                                ? prev.filter((id) => id !== doc.id)
                                : [...prev, doc.id]
                            )
                          }
                          className="w-full min-h-[42px] px-3 py-2 text-left flex items-center justify-between gap-2 text-xs"
                        >
                          <span className="font-medium text-slate-200 flex items-center gap-1.5">
                            {isOpen ? (
                              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            )}
                            {doc.title}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500">
                            {doc.source}
                          </span>
                        </button>
                        {isOpen && (
                          <div className="px-3 pb-3 pt-1.5 border-t border-slate-800/80 space-y-1.5 text-xs">
                            <p className="text-slate-200 leading-relaxed">{doc.excerpt}</p>
                            <div className="text-[11px] font-mono text-slate-400">
                              Provenance: {doc.reliabilityNote}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Collapsible Narrative Investigation Fragments (no contradictionHint leaks) */}
            {puzzle.narrative?.investigationClues &&
              puzzle.narrative.investigationClues.length > 0 && (
                <div className="border-t border-slate-800/80 pt-3.5 space-y-2">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5" />
                    Field Records ({puzzle.narrative.investigationClues.length})
                  </div>
                  <div className="space-y-2">
                    {puzzle.narrative.investigationClues.map((clue) => {
                      const isOpen = openClueIds.includes(clue.id);
                      return (
                        <div
                          key={clue.id}
                          className="rounded border border-slate-800/80 bg-[#06080E]"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setOpenClueIds((prev) =>
                                prev.includes(clue.id)
                                  ? prev.filter((id) => id !== clue.id)
                                  : [...prev, clue.id]
                              )
                            }
                            className="w-full min-h-[40px] px-3 py-2 flex items-center justify-between gap-2 text-left text-xs font-medium text-slate-200 hover:text-cyan-200"
                          >
                            <span className="flex items-center gap-1.5">
                              {isOpen ? (
                                <ChevronDown className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              )}
                              {clue.title}
                            </span>
                            <span className="text-[11px] font-mono text-slate-500">
                              {clue.source}
                            </span>
                          </button>
                          {isOpen && (
                            <div className="px-3 pb-3 pt-1 text-xs text-slate-300 border-t border-slate-800/70">
                              <p className="leading-relaxed">{clue.body}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            {/* Cross-Universe Book Knowledge Echoes */}
            {bookEchoes.length > 0 && secBonuses.knowledgeArchiveEchoUnlocked && (
              <div className="rounded-lg border border-violet-500/35 bg-[#110D20] p-3.5 space-y-1.5">
                <div className="text-[11px] font-mono uppercase tracking-wider text-violet-300 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  Book Folio Resonance
                </div>
                {bookEchoes.map((echo, idx) => (
                  <div key={idx} className="text-xs text-slate-200 leading-relaxed">
                    <span className="text-violet-300 font-medium">{echo.title}</span> ({echo.kind}):{' '}
                    {echo.insight}
                  </div>
                ))}
              </div>
            )}

            {/* Structured Visual Data */}
            {puzzle.visualData?.sequence && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {puzzle.visualData.sequence.map((val, idx) => (
                  <div
                    key={idx}
                    className={`min-w-[48px] h-12 px-3 rounded-lg border flex items-center justify-center font-mono text-base tabular-nums ${
                      val === '?'
                        ? 'border-cyan-400/70 bg-cyan-500/10 text-cyan-300 font-semibold'
                        : 'border-slate-700 bg-[#06080E] text-white'
                    }`}
                  >
                    {val}
                  </div>
                ))}
              </div>
            )}

            {puzzle.visualData?.equations && (
              <div className="rounded-lg border border-slate-800 bg-[#06080E] p-3.5 space-y-1.5 font-mono text-xs sm:text-sm text-cyan-100">
                {puzzle.visualData.equations.map((eq, i) => (
                  <div key={i}>{eq}</div>
                ))}
              </div>
            )}

            {puzzle.visualData?.premises && (
              <div className="rounded-lg border border-slate-800 bg-[#06080E] p-3.5 space-y-2 text-sm text-slate-200">
                {puzzle.visualData.premises.map((prem, i) => (
                  <div key={i} className="leading-relaxed">
                    {prem}
                  </div>
                ))}
              </div>
            )}

            {puzzle.visualData?.diagramEdges && (
              <div className="rounded-lg border border-slate-800 bg-[#06080E] p-3.5 space-y-1.5 text-xs font-mono text-slate-200">
                {puzzle.visualData.diagramEdges.map((edge, i) => (
                  <div key={i}>
                    {edge.from} → {edge.to} : <span className="text-cyan-300">{edge.relation}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Spatial Interactive Lattice */}
            {puzzle.interactionType === 'spatial_grid' && puzzle.visualData?.spatialGrid && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                <div className="space-y-2">
                  <div className="text-xs font-mono uppercase tracking-wider text-slate-400">
                    Source Glyph
                  </div>
                  <div
                    className="grid gap-1.5 w-fit p-2.5 rounded-lg border border-slate-800 bg-[#06080E]"
                    style={{
                      gridTemplateColumns: `repeat(${puzzle.visualData.spatialGrid.size}, minmax(0, 1fr))`,
                    }}
                  >
                    {puzzle.visualData.spatialGrid.initialGrid.map((row, r) =>
                      row.map((cell, c) => (
                        <div
                          key={`src-${r}-${c}`}
                          className={`w-11 h-11 rounded border ${
                            cell === 1
                              ? 'bg-violet-500/80 border-violet-300'
                              : 'bg-slate-900/80 border-slate-800'
                          }`}
                        />
                      ))
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-wider text-cyan-300">
                      Interactive Lattice ({puzzle.visualData.spatialGrid.ruleSummary})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const sz = puzzle.visualData!.spatialGrid!.size;
                        setSpatialState(Array.from({ length: sz }, () => Array(sz).fill(0)));
                      }}
                      className="text-xs text-slate-400 hover:text-white inline-flex items-center gap-1"
                    >
                      <RotateCw className="w-3 h-3" />
                      Clear
                    </button>
                  </div>
                  <div
                    className="grid gap-1.5 w-fit p-2.5 rounded-lg border border-cyan-500/40 bg-[#06080E]"
                    style={{
                      gridTemplateColumns: `repeat(${puzzle.visualData.spatialGrid.size}, minmax(0, 1fr))`,
                    }}
                  >
                    {spatialState.map((row, r) =>
                      row.map((cell, c) => (
                        <button
                          key={`tgt-${r}-${c}`}
                          type="button"
                          onClick={() => toggleSpatialCell(r, c)}
                          aria-label={`Toggle row ${r + 1} column ${c + 1} (${cell === 1 ? 'active' : 'inactive'})`}
                          className={`w-11 h-11 rounded border transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                            cell === 1
                              ? 'bg-cyan-400 border-cyan-200'
                              : 'bg-slate-900 border-slate-700 hover:border-slate-500'
                          }`}
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Structural Analysis Bench */}
            {puzzle.workspaceData && <ScdWorkspaces workspace={puzzle.workspaceData} />}

            {/* Governing Rules */}
            <div className="border-t border-slate-800/80 pt-4 space-y-1.5">
              <div className="text-xs font-mono uppercase tracking-wider text-slate-400">
                Governing Rules
              </div>
              <ul className="space-y-1 text-xs text-slate-300 list-disc pl-4">
                {puzzle.rules.map((rule, i) => (
                  <li key={i}>{rule}</li>
                ))}
              </ul>
              <p className="text-xs text-slate-400 pt-1">{puzzle.instructions}</p>
            </div>

            {/* Metacognition Penalty / Reflection Gate on Wrong Answer */}
            {pendingAudit && !solved && (
              <MetacognitionPenaltyPanel
                puzzle={puzzle}
                save={save}
                submittedAnswer={pendingAudit.submittedAnswer}
                confidence={pendingAudit.confidence}
                wrongCountOnPuzzle={wrongCountOnPuzzle}
                isBoss={Boolean(boss)}
                onApplyDiagnosis={({ selectedPattern, reflectionText, evidenceCited }) =>
                  onApplyMetacognition({
                    submittedAnswer: pendingAudit.submittedAnswer,
                    confidence: pendingAudit.confidence,
                    selectedPattern,
                    reflectionText,
                    isBoss: Boolean(boss),
                    evidenceCited,
                  })
                }
                onCompleteAudit={() => setPendingAudit(null)}
              />
            )}

            {/* Answer Submission Form (Disabled while pending self-audit) */}
            {!solved && !pendingAudit && (
              <form
                key="phase-active"
                onSubmit={handleSubmit}
                className="space-y-4 border-t border-slate-800/80 pt-4 animate-panel-reveal"
              >
                {(puzzle.interactionType === 'numeric_input' ||
                  puzzle.interactionType === 'text_input') && (
                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium text-slate-300">Your Answer</span>
                    <input
                      type="text"
                      inputMode={puzzle.interactionType === 'numeric_input' ? 'numeric' : 'text'}
                      value={answerInput}
                      onChange={(e) => setAnswerInput(e.target.value)}
                      placeholder={
                        puzzle.interactionType === 'numeric_input'
                          ? 'Enter value...'
                          : 'Enter solution...'
                      }
                      className="w-full min-h-[48px] rounded-lg border border-slate-700 bg-[#06080E] px-4 text-base font-mono text-white placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-cyan-400"
                    />
                  </label>
                )}

                {puzzle.interactionType === 'multiple_choice' && puzzle.options && (
                  <div className="space-y-2" role="radiogroup" aria-label="Answer choices">
                    {puzzle.options.map((opt) => {
                      const selected = answerInput === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setAnswerInput(opt.id)}
                          className={`w-full min-h-[52px] text-left p-3.5 rounded-lg border transition-colors flex items-center justify-between gap-3 ${
                            selected
                              ? 'border-cyan-400 bg-cyan-500/15 text-white'
                              : 'border-slate-800 bg-[#06080E] text-slate-300 hover:border-slate-600'
                          }`}
                        >
                          <div>
                            <div className="text-sm font-medium">{opt.label}</div>
                            {opt.detail && (
                              <div className="text-xs text-slate-400 mt-0.5">{opt.detail}</div>
                            )}
                          </div>
                          <span
                            className={`w-4 h-4 rounded-full border shrink-0 ${
                              selected ? 'border-cyan-400 bg-cyan-400' : 'border-slate-600'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                )}

                {puzzle.interactionType === 'multi_select' && puzzle.options && (
                  <div className="space-y-2" role="group" aria-label="Multi-select choices">
                    {puzzle.options.map((opt) => {
                      const selectedSet = new Set(
                        answerInput
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean)
                      );
                      const checked = selectedSet.has(opt.id);
                      const toggleOpt = () => {
                        const next = new Set(selectedSet);
                        if (next.has(opt.id)) next.delete(opt.id);
                        else next.add(opt.id);
                        setAnswerInput(Array.from(next).sort().join(','));
                      };
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={toggleOpt}
                          className={`w-full min-h-[52px] text-left p-3.5 rounded-lg border transition-colors flex items-center justify-between gap-3 ${
                            checked
                              ? 'border-cyan-400 bg-cyan-500/15 text-white'
                              : 'border-slate-800 bg-[#06080E] text-slate-300 hover:border-slate-600'
                          }`}
                        >
                          <div>
                            <div className="text-sm font-medium">{opt.label}</div>
                            {opt.detail && (
                              <div className="text-xs text-slate-400 mt-0.5">{opt.detail}</div>
                            )}
                          </div>
                          <span
                            className={`w-5 h-5 rounded border shrink-0 inline-flex items-center justify-center ${
                              checked
                                ? 'border-cyan-400 bg-cyan-400 text-slate-950'
                                : 'border-slate-600 text-transparent'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {puzzle.interactionType === 'rubric_synthesis' && (
                  <div className="space-y-2">
                    <label className="block space-y-1.5">
                      <span className="text-xs font-medium text-slate-300">
                        Conceptual Synthesis (Evaluated strictly against{' '}
                        {puzzle.strictRubricSpec?.criteria.length ??
                          puzzle.rubricCriteria?.length ??
                          3}{' '}
                        criteria)
                      </span>
                      <textarea
                        rows={4}
                        value={answerInput}
                        onChange={(e) => setAnswerInput(e.target.value)}
                        placeholder="Articulate the causal distinction, hidden assumption, or boundary condition in connected prose..."
                        className="w-full rounded-lg border border-slate-700 bg-[#06080E] p-3.5 text-sm text-white placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-cyan-400"
                      />
                    </label>
                    {(puzzle.strictRubricSpec?.criteria ?? puzzle.rubricCriteria) && (
                      <div className="text-xs text-slate-400">
                        Criteria:{' '}
                        {(puzzle.strictRubricSpec?.criteria ?? puzzle.rubricCriteria)!
                          .map((c) => c.label)
                          .join(' · ')}
                      </div>
                    )}
                  </div>
                )}

                {/* 1-Tap Confidence Selector */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-slate-300">
                      1. How certain are you?{' '}
                      <span className="text-slate-500">
                        ({modeConfig.confidenceOptional ? 'Optional' : 'Required'})
                      </span>
                    </span>
                    {selectedConfidence && (
                      <span className="text-[11px] font-mono text-amber-300">
                        {CONFIDENCE_OPTIONS.find((c) => c.id === selectedConfidence)?.hint}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {CONFIDENCE_OPTIONS.map((opt) => {
                      const active = selectedConfidence === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          data-testid={`confidence-${opt.id}`}
                          onClick={() => setSelectedConfidence(opt.id)}
                          className={`min-h-[42px] px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                            active
                              ? opt.id === 'sure'
                                ? 'border-amber-400 bg-amber-500/15 text-amber-100'
                                : 'border-cyan-400 bg-cyan-500/15 text-cyan-100'
                              : 'border-slate-800 bg-[#06080E] text-slate-300 hover:border-slate-600'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {feedback && (
                  <div
                    key={`${attempts}-${feedback.ok ? 'ok' : 'err'}`}
                    role="status"
                    data-testid="chamber-feedback"
                    className={`p-3.5 rounded-lg border text-xs leading-relaxed flex items-start gap-2.5 animate-panel-reveal ${
                      feedback.ok
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
                        : feedback.verdict === 'Not yet (weakness found)'
                          ? 'border-amber-500/45 bg-amber-500/10 text-amber-100'
                          : 'border-rose-500/40 bg-rose-500/10 text-rose-100'
                    }`}
                  >
                    {feedback.ok ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-300" />
                    )}
                    <div className="space-y-1">
                      {feedback.verdict && (
                        <div className="font-mono font-semibold uppercase tracking-wider text-[11px]">
                          {feedback.verdict}
                        </div>
                      )}
                      <div>{feedback.text}</div>
                      {feedback.weaknessDiagnosis && !feedback.ok && (
                        <div className="text-[11px] opacity-90 pt-0.5 border-t border-white/10">
                          {feedback.weaknessDiagnosis}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    data-testid="chamber-submit-btn"
                    className="min-h-[46px] px-6 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm transition-colors"
                  >
                    Submit Answer
                  </button>
                </div>
              </form>
            )}

            {/* Solved View: Formal Explanation (Hidden until Solved) + Post-Solve Second-Order Reflection */}
            {solved && (
              <div
                key="phase-resolved"
                className="border-t border-emerald-500/30 pt-5 space-y-5 animate-panel-reveal"
              >
                <div className="flex items-center gap-2 text-emerald-300 font-medium text-base">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  Challenge Resolved
                </div>

                <div className="rounded-lg border border-slate-800 bg-[#06080E] p-4 space-y-2">
                  <div className="text-xs font-mono uppercase tracking-wider text-slate-400">
                    Verified Reasoning Explanation
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed">{puzzle.explanation}</p>
                  {puzzle.narrative?.consequences && (
                    <p className="text-xs text-amber-200/95 border-t border-slate-800 pt-2 leading-relaxed">
                      Consequence: {puzzle.narrative.consequences}
                    </p>
                  )}
                  {puzzle.multipleSolutionsNote && (
                    <p className="text-xs text-cyan-300 mt-1">{puzzle.multipleSolutionsNote}</p>
                  )}
                </div>

                {/* Second-Order Reflection */}
                <div className="rounded-xl border border-cyan-500/30 bg-[#080F1D] p-4 space-y-3">
                  <div className="text-xs font-mono uppercase tracking-wider text-cyan-300">
                    Second-Order Reflection (Saved to Your Book)
                  </div>
                  <p className="text-xs text-slate-300">
                    {puzzle.postSolvePrompt?.question ??
                      'Why did this structural solution hold cleanly over the surface trap?'}
                  </p>
                  <textarea
                    rows={2}
                    data-testid="second-order-why-input"
                    value={whyItWorksDraft}
                    onChange={(e) => {
                      setWhyItWorksDraft(e.target.value);
                      setReflectionSavedNotice(false);
                    }}
                    placeholder="In one sentence: why does this rule hold?"
                    className="w-full rounded-lg border border-slate-800 bg-[#06080E] p-2.5 text-xs text-white placeholder:text-slate-500"
                  />
                  <input
                    type="text"
                    value={patternWatchDraft}
                    onChange={(e) => {
                      setPatternWatchDraft(e.target.value);
                      setReflectionSavedNotice(false);
                    }}
                    placeholder={
                      puzzle.postSolvePrompt?.patternPrompt ??
                      'What trap will you watch for next time?'
                    }
                    className="w-full min-h-[38px] rounded-lg border border-slate-800 bg-[#06080E] px-2.5 text-xs text-white placeholder:text-slate-500"
                  />
                  <div className="flex items-center justify-between gap-2">
                    {reflectionSavedNotice ? (
                      <span className="text-xs font-mono text-emerald-300">
                        Recorded in Plan Replay &amp; Reflections.
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">
                        {puzzle.postSolvePrompt?.takeaway}
                      </span>
                    )}
                    <button
                      type="button"
                      disabled={!whyItWorksDraft.trim()}
                      onClick={() => {
                        onSaveSecondOrderReflection(
                          puzzle.id,
                          puzzle.title,
                          whyItWorksDraft,
                          patternWatchDraft
                        );
                        setReflectionSavedNotice(true);
                      }}
                      className="min-h-[36px] px-3.5 py-1 rounded-md border border-cyan-400/50 bg-cyan-500/15 hover:bg-cyan-500/25 disabled:opacity-40 text-xs font-medium text-cyan-200 whitespace-nowrap"
                    >
                      Save Reflection
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs font-mono text-amber-300 tabular-nums">
                    Rewards: +{puzzle.rewards.xp} XP · +{puzzle.rewards.ip} IP · +{puzzle.rewards.kp} KP
                    {puzzle.rewards.ep ? ` · +${puzzle.rewards.ep} EP` : ''}
                  </div>
                  {boss && onAdvanceBossPhase && bossPhaseIndex + 1 < boss.phases.length ? (
                    <button
                      type="button"
                      onClick={() => triggerPhaseExitThen(onAdvanceBossPhase)}
                      className="min-h-[44px] px-5 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-sm transition-colors"
                    >
                      Advance to Phase {bossPhaseIndex + 2}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => triggerPhaseExitThen(onBack)}
                      className="min-h-[44px] px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition-colors"
                    >
                      Continue Exploration
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Evidence Board, Unlocked Ability Surfaces, 3-Tier Hints, Scratchpad */}
        <div className="lg:col-span-5 space-y-5">
          <EvidenceBoard
            puzzle={puzzle}
            save={save}
            onSaveBoard={onSaveEvidenceBoard}
          />

          <AbilitySurfaces
            puzzle={puzzle}
            save={save}
            spatialState={spatialState}
          />

          {/* Strictly 3 Character-Delivered Non-Revealing Hint Tiers */}
          <div className="rounded-xl border border-slate-800 bg-[#0B101D] p-5 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-display text-base font-semibold text-white flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-300" />
                  Character Guidance (Max 3 Tiers)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {getHintTierLabel(intelligenceTier)} · Tier {unlockedHintLevel}/3 · {save.ip} IP
                </p>
              </div>
            </div>

            {unlockedHintLevel > 0 ? (
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {HINT_LEVELS.filter((h) => h.level <= unlockedHintLevel).map((meta) => (
                  <div
                    key={meta.level}
                    className="rounded-lg border border-slate-800 bg-[#06080E] p-3 space-y-1 animate-panel-reveal"
                  >
                    <div className="text-[11px] font-mono text-amber-300">
                      Tier {meta.level} · {meta.name} ·{' '}
                      <span className="text-cyan-300">
                        {getAdaptiveHintSpeaker(puzzle, meta.level)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed">
                      {getAdaptiveHintText(puzzle, meta.level, intelligenceTier)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 leading-relaxed">
                No guidance requested. Hints point toward overlooked evidence or comparisons—they never name or eliminate choices.
              </p>
            )}

            {!solved && unlockedHintLevel < 3 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {unlockedHintLevel === 0 && freePulseReady && (
                  <button
                    type="button"
                    onClick={() => handleUnlockHint(1, true)}
                    className="min-h-[42px] px-3.5 py-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-200 text-xs font-medium transition-colors"
                  >
                    Free Orientation Cue ({freeCooldownMin}m cooldown)
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleUnlockHint(nextHintLevel, false)}
                  className="min-h-[42px] px-4 py-2 rounded-lg border border-amber-400/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-200 text-xs font-medium transition-colors tabular-nums"
                >
                  Ask Tier {nextHintLevel}: {HINT_LEVELS[nextHintLevel - 1]?.name} ({nextHintCost} IP)
                </button>
              </div>
            )}
          </div>

          {/* Scratchpad Notes */}
          <div className="rounded-xl border border-slate-800 bg-[#0B101D] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold text-white flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-slate-400" />
                Scratchpad Notes
              </h2>
              <button
                type="button"
                onClick={() => onSaveNotes(puzzle.id, notes)}
                className="text-xs font-medium text-cyan-300 hover:text-cyan-200"
              >
                Save Notes
              </button>
            </div>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => onSaveNotes(puzzle.id, notes)}
              placeholder="Record intermediate calculations, contradictions, or notes..."
              className="w-full rounded-lg border border-slate-800 bg-[#06080E] p-3 text-xs text-slate-200 placeholder:text-slate-600 focus-visible:outline-2 focus-visible:outline-cyan-400"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
