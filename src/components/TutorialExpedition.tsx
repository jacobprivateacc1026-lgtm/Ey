import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Brain,
  CheckCircle2,
  Compass,
  Eye,
  Lightbulb,
  Lock,
  Play,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { getAttributeUpgradeCost, PRIMARY_ATTRIBUTES } from '../engine/attributes';
import {
  computeHintCostIP,
  getAdaptiveHintText,
  resolveIntelligenceTier,
} from '../engine/hintEngine';
import {
  evaluateTutorialSubmission,
  TUTORIAL_HINT_LEVEL_LABELS,
  TUTORIAL_STAGES,
} from '../engine/prologueAndTutorialData';
import {
  DiagnosticFeedbackKind,
  GameSaveState,
  HintLevel,
  PrimaryAttributeId,
  TutorialMechanicMode,
  TutorialStageSpec,
} from '../engine/types';
import { CharacterPortrait } from './CharacterPortrait';

interface TutorialExpeditionProps {
  save: GameSaveState;
  initialStageIndex?: number;
  isReplay?: boolean;
  onSpendHintIP: (costIP: number, isFreePulse: boolean) => void;
  onSolveTutorialStage: (
    stageIndex: number,
    metrics: {
      attempts: number;
      hintsUsed: number;
      maxHintLevel: HintLevel;
      timeSeconds: number;
    }
  ) => {
    xp: number;
    ip: number;
    kp: number;
    ep: number;
  };
  onUpgradeAttribute: (attrId: PrimaryAttributeId) => { ok: boolean; message: string };
  onCompleteExpedition: () => void;
  onReturnToAtlas?: () => void;
}

const TEACH_UPGRADE_ATTRS: PrimaryAttributeId[] = [
  'analytical',
  'pattern_recognition',
  'abstract',
];

function buildInitialStepOrder(stage: TutorialStageSpec): string[] {
  if (!stage.orderedSteps || stage.orderedSteps.length === 0) return [];
  if (stage.orderedSteps.length >= 4) {
    return [
      stage.orderedSteps[1].id,
      stage.orderedSteps[0].id,
      stage.orderedSteps[3].id,
      stage.orderedSteps[2].id,
    ];
  }
  return stage.orderedSteps.map((s) => s.id).reverse();
}

const DIAGNOSTIC_STYLE: Record<
  DiagnosticFeedbackKind,
  { border: string; bg: string; title: string; body: string }
> = {
  correct: {
    border: 'border-emerald-500/40',
    bg: 'bg-emerald-500/10',
    title: 'text-emerald-300',
    body: 'text-emerald-100',
  },
  alternative: {
    border: 'border-emerald-400/50',
    bg: 'bg-emerald-500/10',
    title: 'text-cyan-300',
    body: 'text-emerald-100',
  },
  incomplete: {
    border: 'border-amber-500/45',
    bg: 'bg-amber-500/10',
    title: 'text-amber-300',
    body: 'text-amber-100',
  },
  unsupported: {
    border: 'border-violet-400/45',
    bg: 'bg-violet-500/10',
    title: 'text-violet-300',
    body: 'text-violet-100',
  },
  incorrect: {
    border: 'border-rose-500/40',
    bg: 'bg-rose-500/10',
    title: 'text-rose-300',
    body: 'text-rose-100',
  },
};

function executeStepTrace(stepOrder: string[]): {
  stepId: string;
  formula: string;
  before: number;
  after: number;
}[] {
  let current = 0;
  const rows: { stepId: string; formula: string; before: number; after: number }[] = [];
  for (const id of stepOrder) {
    const before = current;
    if (id === 'step_seed') {
      current = 12;
      rows.push({ stepId: id, formula: 'Set register = 12', before, after: current });
    } else if (id === 'step_flux') {
      current = 2 * before - 4;
      rows.push({
        stepId: id,
        formula: `2 × ${before} − 4`,
        before,
        after: current,
      });
    } else if (id === 'step_branch') {
      const div5 = before % 5 === 0;
      current = div5 ? before + 3 : Number((before / 2).toFixed(2));
      rows.push({
        stepId: id,
        formula: div5 ? `${before} mod 5 = 0 ⇒ ${before} + 3` : `${before} mod 5 ≠ 0 ⇒ ${before} ÷ 2`,
        before,
        after: current,
      });
    } else if (id === 'step_prime') {
      current = 3 * before + 3;
      rows.push({
        stepId: id,
        formula: `3 × ${before} + ω(30)=3`,
        before,
        after: current,
      });
    }
  }
  return rows;
}

function renderStageApparatus(
  mode: TutorialMechanicMode,
  taggedSignalIds: string[],
  eliminatedIds: string[]
) {
  if (mode === 'observation_inspect') {
    const hasA = taggedSignalIds.includes('obs_alpha');
    const hasB = taggedSignalIds.includes('obs_beta');
    const hasH = taggedSignalIds.includes('obs_harmonic');
    return (
      <div className="border-t border-b border-slate-800/80 py-3">
        <div className="text-[11px] font-mono uppercase tracking-wider text-cyan-300/90 mb-2">
          Beacon Mixer Schematic · Frequency Bus vs Passive Wall Gauges
        </div>
        <svg viewBox="0 0 420 92" className="w-full h-24 rounded-md bg-[#060912]" aria-hidden="true">
          <rect x="12" y="16" width="84" height="24" rx="4" fill="#0B1324" stroke={hasA ? '#22D3EE' : '#334155'} />
          <text x="54" y="31" textAnchor="middle" fill="#E2E8F0" fontSize="10" fontFamily="monospace">α Coil (5 Hz)</text>
          <rect x="110" y="16" width="84" height="24" rx="4" fill="#0B1324" stroke={hasB ? '#22D3EE' : '#334155'} />
          <text x="152" y="31" textAnchor="middle" fill="#E2E8F0" fontSize="10" fontFamily="monospace">β Fork (7 Hz)</text>
          <rect x="208" y="16" width="90" height="24" rx="4" fill="#0B1324" stroke={hasH ? '#F59E0B' : '#334155'} />
          <text x="253" y="31" textAnchor="middle" fill="#FDE68A" fontSize="10" fontFamily="monospace">Offset (+5 Hz)</text>
          <line x1="54" y1="40" x2="54" y2="58" stroke="#22D3EE" strokeOpacity="0.6" />
          <line x1="152" y1="40" x2="152" y2="58" stroke="#22D3EE" strokeOpacity="0.6" />
          <line x1="253" y1="40" x2="253" y2="58" stroke="#F59E0B" strokeOpacity="0.6" />
          <line x1="54" y1="58" x2="253" y2="58" stroke="#38BDF8" strokeWidth="1.5" />
          <rect x="115" y="64" width="128" height="20" rx="3" fill="#081626" stroke="#22D3EE" strokeOpacity="0.6" />
          <text x="179" y="77" textAnchor="middle" fill="#67E8F9" fontSize="10" fontFamily="monospace">Mixer Output (? Hz)</text>
          {/* Disconnected corridor pipe gauges */}
          <rect x="316" y="16" width="92" height="62" rx="4" fill="#0A0D16" stroke="#1E293B" strokeDasharray="3 2" />
          <text x="362" y="38" textAnchor="middle" fill="#64748B" fontSize="9" fontFamily="monospace">94 kPa · 18%</text>
          <text x="362" y="54" textAnchor="middle" fill="#64748B" fontSize="9" fontFamily="monospace">120 ms · 42 K</text>
          <text x="362" y="69" textAnchor="middle" fill="#475569" fontSize="8" fontFamily="monospace">Unwired Drift</text>
        </svg>
      </div>
    );
  }

  if (mode === 'pattern_sequence') {
    return (
      <div className="border-t border-b border-slate-800/80 py-3">
        <div className="text-[11px] font-mono uppercase tracking-wider text-cyan-300/90 mb-2">
          Astrolabe Gear Arc · Jump Progression Diagram
        </div>
        <svg viewBox="0 0 420 84" className="w-full h-20 rounded-md bg-[#060912]" aria-hidden="true">
          <path d="M 32 58 Q 74 22 114 58" fill="none" stroke="#38BDF8" strokeWidth="1.4" />
          <path d="M 114 58 Q 156 18 196 58" fill="none" stroke="#38BDF8" strokeWidth="1.4" />
          <path d="M 196 58 Q 238 14 278 58" fill="none" stroke="#38BDF8" strokeWidth="1.4" />
          <path d="M 278 58 Q 324 10 374 58" fill="none" stroke="#F59E0B" strokeDasharray="3 2" strokeWidth="1.4" />
          <text x="73" y="34" textAnchor="middle" fill="#7DD3FC" fontSize="10" fontFamily="monospace">+4</text>
          <text x="155" y="30" textAnchor="middle" fill="#7DD3FC" fontSize="10" fontFamily="monospace">+8</text>
          <text x="237" y="26" textAnchor="middle" fill="#7DD3FC" fontSize="10" fontFamily="monospace">+16</text>
          <text x="326" y="24" textAnchor="middle" fill="#FCD34D" fontSize="10" fontFamily="monospace">+32?</text>
          {[32, 114, 196, 278, 374].map((x, idx) => (
            <circle key={x} cx={x} cy="58" r="10" fill="#0B1222" stroke={idx === 4 ? '#F59E0B' : '#475569'} />
          ))}
          <text x="32" y="62" textAnchor="middle" fill="#E2E8F0" fontSize="10" fontFamily="monospace">3</text>
          <text x="114" y="62" textAnchor="middle" fill="#E2E8F0" fontSize="10" fontFamily="monospace">7</text>
          <text x="196" y="62" textAnchor="middle" fill="#E2E8F0" fontSize="10" fontFamily="monospace">15</text>
          <text x="278" y="62" textAnchor="middle" fill="#E2E8F0" fontSize="10" fontFamily="monospace">31</text>
          <text x="374" y="62" textAnchor="middle" fill="#FDE68A" fontSize="10" fontFamily="monospace">?</text>
        </svg>
      </div>
    );
  }

  if (mode === 'deduction_premises') {
    return (
      <div className="border-t border-b border-slate-800/80 py-3">
        <div className="text-[11px] font-mono uppercase tracking-wider text-amber-300/90 mb-2">
          Three Plinths & Oil Lantern Chamber Sketch
        </div>
        <svg viewBox="0 0 420 88" className="w-full h-22 rounded-md bg-[#060912]" aria-hidden="true">
          {/* Amber */}
          <rect x="26" y="34" width="96" height="42" rx="4" fill="#17120A" stroke="#F59E0B" strokeOpacity="0.6" />
          <text x="74" y="53" textAnchor="middle" fill="#FDE68A" fontSize="10" fontFamily="monospace">Amber Plinth</text>
          <text x="74" y="67" textAnchor="middle" fill="#FBBF24" fontSize="9" fontFamily="monospace">Carved Sun</text>
          {/* Cobalt */}
          <rect x="162" y="34" width="96" height="42" rx="4" fill="#0B1322" stroke="#38BDF8" strokeOpacity="0.45" />
          <text x="210" y="53" textAnchor="middle" fill="#BAE6FD" fontSize="10" fontFamily="monospace">Cobalt Plinth</text>
          <text x="210" y="67" textAnchor="middle" fill="#94A3B8" fontSize="9" fontFamily="monospace">Lantern Unlit</text>
          {/* Violet */}
          <rect x="298" y="34" width="96" height="42" rx="4" fill="#140E24" stroke="#A78BFA" strokeOpacity="0.45" />
          <text x="346" y="53" textAnchor="middle" fill="#DDD6FE" fontSize="10" fontFamily="monospace">Violet Plinth</text>
          <text x="346" y="67" textAnchor="middle" fill="#94A3B8" fontSize="9" fontFamily="monospace">Not Leftmost</text>
          <text x="210" y="20" textAnchor="middle" fill="#94A3B8" fontSize="9" fontFamily="monospace">
            Rule 2: If Seal on Cobalt ⇒ Lantern Lit (Contrapositive Check)
          </text>
        </svg>
      </div>
    );
  }

  if (mode === 'hypothesis_elimination') {
    const aliveCount = 4 - eliminatedIds.length;
    return (
      <div className="border-t border-b border-slate-800/80 py-3 space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="uppercase tracking-wider text-violet-300">
            Controlled Variable Matrix · Log A vs Log B
          </span>
          <span className="text-slate-400 tabular-nums">{aliveCount}/4 Hypotheses Remaining</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-1.5 pr-3 font-normal">Factor</th>
                <th className="py-1.5 px-3 font-normal">Log A (Reversed)</th>
                <th className="py-1.5 pl-3 font-normal">Log B (Forward)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200 tabular-nums">
              <tr>
                <td className="py-1.5 pr-3 text-slate-400">Travelers</td>
                <td className="py-1.5 px-3">1 (unchanged)</td>
                <td className="py-1.5 pl-3">1 (unchanged)</td>
              </tr>
              <tr>
                <td className="py-1.5 pr-3 text-slate-400">Mass</td>
                <td className="py-1.5 px-3">62 kg (unchanged)</td>
                <td className="py-1.5 pl-3">62 kg (unchanged)</td>
              </tr>
              <tr>
                <td className="py-1.5 pr-3 text-slate-400">Hour</td>
                <td className="py-1.5 px-3">Hour 4 (composite)</td>
                <td className="py-1.5 pl-3">Hour 5 (prime)</td>
              </tr>
              <tr>
                <td className="py-1.5 pr-3 text-amber-300">Starlight</td>
                <td className="py-1.5 px-3 text-rose-300">Red-Shift</td>
                <td className="py-1.5 pl-3 text-cyan-300">Blue-Shift</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (mode === 'capstone_synthesis') {
    return (
      <div className="border-t border-b border-slate-800/80 py-3">
        <div className="text-[11px] font-mono uppercase tracking-wider text-amber-300/90 mb-2">
          Nexus of Three Resonators · Failure Coupling Topology
        </div>
        <svg viewBox="0 0 420 96" className="w-full h-24 rounded-md bg-[#060912]" aria-hidden="true">
          <line x1="88" y1="68" x2="210" y2="24" stroke="#F59E0B" strokeOpacity="0.6" strokeWidth="1.4" />
          <line x1="332" y1="68" x2="210" y2="24" stroke="#F59E0B" strokeOpacity="0.6" strokeWidth="1.4" />
          <line x1="88" y1="68" x2="332" y2="68" stroke="#334155" strokeDasharray="3 2" />
          {/* Pillar II -> Pillar I */}
          <rect x="28" y="54" width="110" height="28" rx="4" fill="#0B101D" stroke="#38BDF8" />
          <text x="83" y="72" textAnchor="middle" fill="#E0F2FE" fontSize="10" fontFamily="monospace">Pillar II (9 Hz)</text>
          {/* Pillar I */}
          <rect x="148" y="10" width="124" height="28" rx="4" fill="#17101A" stroke="#F43F5E" strokeOpacity="0.8" />
          <text x="210" y="28" textAnchor="middle" fill="#FECDD3" fontSize="10" fontFamily="monospace">Pillar I (Desync?)</text>
          {/* Pillar III -> Pillar I */}
          <rect x="282" y="54" width="110" height="28" rx="4" fill="#0B101D" stroke="#38BDF8" />
          <text x="337" y="72" textAnchor="middle" fill="#E0F2FE" fontSize="10" fontFamily="monospace">Pillar III (11 Hz)</text>
        </svg>
      </div>
    );
  }

  return null;
}

export const TutorialExpedition: React.FC<TutorialExpeditionProps> = ({
  save,
  initialStageIndex = 0,
  isReplay = false,
  onSpendHintIP,
  onSolveTutorialStage,
  onUpgradeAttribute,
  onCompleteExpedition,
  onReturnToAtlas,
}) => {
  const safeInitial = Math.max(0, Math.min(TUTORIAL_STAGES.length - 1, initialStageIndex));
  const [stageIndex, setStageIndex] = useState<number>(safeInitial);
  const [answer, setAnswer] = useState<string>('');
  const [attempts, setAttempts] = useState<number>(0);
  const [hintsUsed, setHintsUsed] = useState<number>(0);
  const [revealedHintLevel, setRevealedHintLevel] = useState<number>(0);
  const [feedback, setFeedback] = useState<{
    kind: DiagnosticFeedbackKind;
    headline: string;
    message: string;
  } | null>(null);
  const [solved, setSolved] = useState<boolean>(false);
  const [earnedRewards, setEarnedRewards] = useState<{
    xp: number;
    ip: number;
    kp: number;
    ep: number;
  } | null>(null);
  const [attrUpgradeMsg, setAttrUpgradeMsg] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>('');

  // Interactive mechanic states per stage
  const [inspectedIds, setInspectedIds] = useState<string[]>([]);
  const [taggedSignalIds, setTaggedSignalIds] = useState<string[]>([]);
  const [activePremiseIndices, setActivePremiseIndices] = useState<number[]>([]);
  const [eliminatedHypothesisIds, setEliminatedHypothesisIds] = useState<string[]>([]);
  const [secondaryChoice, setSecondaryChoice] = useState<string>('');
  const [stepOrder, setStepOrder] = useState<string[]>(() =>
    buildInitialStepOrder(TUTORIAL_STAGES[safeInitial] ?? TUTORIAL_STAGES[0])
  );
  const [traceLog, setTraceLog] = useState<
    { stepId: string; formula: string; before: number; after: number }[] | null
  >(null);

  const stageStartRef = useRef<number>(Date.now());

  const stage = TUTORIAL_STAGES[stageIndex] ?? TUTORIAL_STAGES[0];
  const puzzle = stage.puzzle;

  const resetForStage = (nextIdx: number) => {
    const nextStage = TUTORIAL_STAGES[nextIdx] ?? TUTORIAL_STAGES[0];
    setStageIndex(nextIdx);
    setAnswer('');
    setAttempts(0);
    setHintsUsed(0);
    setRevealedHintLevel(0);
    setFeedback(null);
    setSolved(false);
    setEarnedRewards(null);
    setAttrUpgradeMsg(null);
    setNotes('');
    setInspectedIds([]);
    setTaggedSignalIds([]);
    setActivePremiseIndices([]);
    setEliminatedHypothesisIds([]);
    setSecondaryChoice('');
    setStepOrder(buildInitialStepOrder(nextStage));
    setTraceLog(null);
    stageStartRef.current = Date.now();
  };

  useEffect(() => {
    stageStartRef.current = Date.now();
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [stageIndex]);

  const intelligenceTier = useMemo(
    () => resolveIntelligenceTier(save, puzzle.relevantAttributes),
    [save, puzzle.relevantAttributes]
  );

  const stepOrderVerified = useMemo(() => {
    if (!stage.correctStepOrder || stage.correctStepOrder.length === 0) return true;
    return (
      stepOrder.length === stage.correctStepOrder.length &&
      stage.correctStepOrder.every((id, idx) => stepOrder[idx] === id)
    );
  }, [stage.correctStepOrder, stepOrder]);

  const moveStep = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= stepOrder.length) return;
    setStepOrder((prev) => {
      const copy = [...prev];
      const tmp = copy[index];
      copy[index] = copy[target];
      copy[target] = tmp;
      return copy;
    });
    setTraceLog(null);
  };

  const handleRunTrace = () => {
    setTraceLog(executeStepTrace(stepOrder));
  };

  const toggleInspect = (id: string) => {
    setInspectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const toggleSignalTag = (id: string) => {
    setTaggedSignalIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleEliminateHypothesis = (id: string) => {
    setEliminatedHypothesisIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    if (answer === id && !eliminatedHypothesisIds.includes(id)) {
      setAnswer('');
    }
  };

  const handleRequestHint = (level: 1 | 2 | 3 | 4 | 5) => {
    if (level > stage.maxHintLevel) return;
    if (level <= revealedHintLevel) return;
    const isFreeTutorialCue = stage.stageNumber === 1 && level === 1;
    const cost = isFreeTutorialCue ? 0 : computeHintCostIP(save, level, puzzle.difficultyScore);

    if (!isFreeTutorialCue && save.ip < cost) {
      setFeedback({
        kind: 'incomplete',
        headline: 'Insufficient Intelligence Points',
        message: `Level ${level} guidance requires ${cost} IP (you currently hold ${save.ip} IP).`,
      });
      return;
    }

    onSpendHintIP(cost, false);
    setRevealedHintLevel(level);
    setHintsUsed((h) => h + 1);
    setFeedback(null);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (solved) return;

    if (stage.mechanicMode === 'observation_inspect' && inspectedIds.length < 3) {
      setFeedback({
        kind: 'incomplete',
        headline: 'Observe the Chamber First',
        message: `Inspect at least 3 Beacon Corridor objects above (${inspectedIds.length}/5 inspected) so you verify which units carry Hz signals before submitting.`,
      });
      return;
    }

    if (stage.mechanicMode === 'multistep_builder' && !stepOrderVerified) {
      setFeedback({
        kind: 'incomplete',
        headline: 'Verify Execution Sequence First',
        message:
          'Arrange Steps 1–4 in exact execution order (Initialize -> Flux Mirror -> Divisibility Gate -> Final Seal) inside the Pipeline Builder before locking the calibration key.',
      });
      return;
    }

    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);

    const check = evaluateTutorialSubmission(stage, answer);
    if (!check.correct) {
      setFeedback({
        kind: check.kind,
        headline: check.headline,
        message: check.message,
      });
      return;
    }

    if (
      stage.secondaryCheck &&
      stage.mechanicMode === 'pattern_sequence' &&
      secondaryChoice &&
      secondaryChoice !== stage.secondaryCheck.validId
    ) {
      setFeedback({
        kind: 'incomplete',
        headline: 'Check Companion Verification Dial',
        message:
          'Your main sequence answer (63) is right! Re-check the companion dial (2, 6, 14, 30, ?): the jumps double (+4, +8, +16, +32), so 30 + 32 = 62.',
      });
      return;
    }

    const elapsedSeconds = Math.max(1, Math.round((Date.now() - stageStartRef.current) / 1000));
    const granted = onSolveTutorialStage(stageIndex, {
      attempts: nextAttempts,
      hintsUsed,
      maxHintLevel: revealedHintLevel as HintLevel,
      timeSeconds: elapsedSeconds,
    });
    setSolved(true);
    setEarnedRewards(granted);
    setFeedback({
      kind: check.kind,
      headline: check.headline,
      message: check.message,
    });
  };

  const isLastStage = stageIndex >= TUTORIAL_STAGES.length - 1;
  const completedSet = new Set(save.completedTutorialStageNumbers ?? []);

  return (
    <div
      data-testid="tutorial-expedition"
      className="min-h-screen bg-[#06080E] text-slate-100 flex flex-col"
    >
      {/* Top Expedition Header with Threshold Workbench Backdrop Accent */}
      <header className="relative overflow-hidden border-b border-slate-800 bg-[#080B14]">
        <img
          src="/src/assets/images/tutorial_threshold_bench_1795508240138.jpg"
          alt="Threshold calibration bench"
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-cover opacity-15 pointer-events-none"
        />
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Compass className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="text-xs sm:text-sm font-medium text-white">
              Threshold Expedition ·{' '}
              <span className="text-cyan-300 font-mono tabular-nums">
                Stage {stage.stageNumber} of {TUTORIAL_STAGES.length}
              </span>{' '}
              · <span className="text-slate-300">{stage.skillFocus}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-slate-300 tabular-nums">
            <span>
              Level <strong className="text-white">{save.tubLevel}</strong> ·{' '}
              <span className="text-cyan-300" data-testid="tutorial-ip-display">
                {save.ip} IP
              </span>{' '}
              · <span className="text-violet-300">{save.kp} KP</span> ·{' '}
              <span className="text-amber-300">{save.ep} EP</span>
            </span>
            {isReplay && onReturnToAtlas && (
              <button
                type="button"
                onClick={onReturnToAtlas}
                className="min-h-[38px] px-3 py-1 rounded-lg border border-slate-700 bg-[#0B101D] hover:border-slate-500 text-xs font-sans text-slate-200 whitespace-nowrap"
              >
                Return to Atlas
              </button>
            )}
          </div>
        </div>

        {/* 6-Stage Expedition Step Strip */}
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pb-3 flex flex-wrap items-center gap-2">
          {TUTORIAL_STAGES.map((st, idx) => {
            const cleared =
              completedSet.has(st.stageNumber) ||
              save.tutorialStageIndex > idx ||
              (idx === stageIndex && solved);
            const active = idx === stageIndex;
            const clickable =
              cleared || idx <= save.tutorialStageIndex || isReplay;
            return (
              <button
                key={st.id}
                type="button"
                disabled={!clickable}
                onClick={() => clickable && resetForStage(idx)}
                className={`min-h-[36px] px-2.5 py-1 rounded text-xs font-mono transition-colors tabular-nums whitespace-nowrap ${
                  active
                    ? 'bg-cyan-500 text-slate-950 font-semibold'
                    : cleared
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:border-emerald-400/60'
                      : 'bg-[#0B101D]/90 text-slate-500 border border-slate-800 cursor-not-allowed'
                }`}
              >
                {st.stageNumber}. {st.skillFocus}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Expedition Workspace */}
      <main
        key={stage.id}
        className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 grid grid-cols-1 lg:grid-cols-12 gap-6 animate-chamber-enter"
      >
        {/* Left/Primary Interactive Challenge Column */}
        <div className="lg:col-span-7 space-y-5">
          {/* Guide Briefing with Ilya Portrait */}
          <section className="rounded-xl border border-slate-800 bg-[#090D18] p-5 space-y-3.5">
            <div className="text-xs font-mono uppercase tracking-[0.14em] text-cyan-400">
              {stage.title}
            </div>

            <div className="flex items-start gap-3.5 border-t border-b border-slate-800/80 py-3">
              <CharacterPortrait portraitKey="ilya" speakerName={stage.guideName} size="md" />
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-2 text-xs font-mono">
                  <span className="font-semibold text-amber-300">{stage.guideName}</span>
                  {stage.guideRole && (
                    <span className="text-slate-400">· {stage.guideRole}</span>
                  )}
                </div>
                <blockquote className="text-xs sm:text-sm text-amber-100 leading-relaxed">
                  {stage.guideOpeningQuote}
                </blockquote>
              </div>
            </div>

            <p className="text-sm text-slate-200 leading-relaxed">{stage.narrativeIntro}</p>
            <p className="text-xs text-slate-300 leading-relaxed">{stage.demonstrationTip}</p>
          </section>

          {/* Interactive Workbench Panel */}
          <section className="rounded-xl border border-slate-800 bg-[#0B101D] p-5 sm:p-6 space-y-5">
            <div>
              <h1 className="font-display text-xl sm:text-2xl font-semibold text-white">
                {puzzle.title}
              </h1>
              <p className="text-xs text-slate-400 mt-1">{puzzle.objective}</p>
            </div>

            {/* Stage-Specific Physical Workbench Schematic */}
            {renderStageApparatus(stage.mechanicMode, taggedSignalIds, eliminatedHypothesisIds)}

            {/* Interactive Object / Evidence Inspection Grid (Stages 1, 2, 4, 6) */}
            {stage.inspectables && stage.inspectables.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2 text-xs font-mono">
                  <span className="text-cyan-300 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" />
                    Interactive Chamber Inspection
                  </span>
                  <span className="text-slate-400 tabular-nums">
                    {inspectedIds.length} / {stage.inspectables.length} Inspected
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {stage.inspectables.map((item) => {
                    const isInspected = inspectedIds.includes(item.id);
                    const isTaggedSignal = taggedSignalIds.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        className={`rounded-lg border p-3 transition-colors space-y-2 ${
                          isInspected
                            ? item.isSignal
                              ? 'border-cyan-500/45 bg-[#081322]'
                              : 'border-slate-700 bg-[#080B13]'
                            : 'border-slate-800 bg-[#06080E] hover:border-slate-600'
                        }`}
                      >
                        <button
                          type="button"
                          data-testid={`inspect-${item.id}`}
                          onClick={() => toggleInspect(item.id)}
                          className="w-full text-left flex items-start justify-between gap-2"
                        >
                          <div>
                            <div className="text-[11px] font-mono text-slate-400">
                              {item.categoryTag}
                            </div>
                            <div className="text-xs sm:text-sm font-semibold text-white">
                              {item.label}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">{item.shortPreview}</div>
                          </div>
                          <span className="text-[11px] font-mono text-amber-300 whitespace-nowrap">
                            {item.glyph}
                          </span>
                        </button>

                        {isInspected && (
                          <div className="border-t border-slate-800/80 pt-2 space-y-2 animate-panel-reveal">
                            <p className="text-xs text-slate-200 leading-relaxed">
                              {item.inspectionDetail}
                            </p>
                            {stage.mechanicMode === 'observation_inspect' && (
                              <button
                                type="button"
                                onClick={() => toggleSignalTag(item.id)}
                                className={`min-h-[36px] px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                                  isTaggedSignal
                                    ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-200'
                                    : 'border border-slate-700 bg-[#0B101D] text-slate-400 hover:text-white'
                                }`}
                              >
                                {isTaggedSignal ? 'Tagged: Signal' : 'Mark as Frequency Signal'}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sequence Visual Strip */}
            {puzzle.visualData?.sequence && (
              <div className="flex flex-wrap items-center gap-2 py-2 font-mono text-sm tabular-nums">
                {puzzle.visualData.sequence.map((val, idx) => (
                  <React.Fragment key={idx}>
                    <span
                      className={`px-2.5 py-1 rounded border ${
                        val === '?'
                          ? 'border-cyan-400/60 text-cyan-300 bg-cyan-500/10'
                          : 'border-slate-800 text-white bg-[#06080E]'
                      }`}
                    >
                      {val}
                    </span>
                    {idx < puzzle.visualData!.sequence!.length - 1 && (
                      <span className="text-slate-600">→</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}

            {/* Interactive Premises */}
            {puzzle.visualData?.premises && (
              <div className="space-y-1.5">
                <div className="text-[11px] font-mono text-slate-400">
                  Premises & Logs (tap any line to highlight while reasoning)
                </div>
                <ul className="space-y-1.5">
                  {puzzle.visualData.premises.map((p, idx) => {
                    const active = activePremiseIndices.includes(idx);
                    return (
                      <li key={idx}>
                        <button
                          type="button"
                          onClick={() =>
                            setActivePremiseIndices((prev) =>
                              prev.includes(idx) ? prev.filter((x) => x !== idx) : [...prev, idx]
                            )
                          }
                          className={`w-full text-left rounded-lg border px-3.5 py-2 text-xs leading-relaxed transition-colors ${
                            active
                              ? 'border-amber-400/50 bg-amber-500/10 text-amber-100'
                              : 'border-slate-800 bg-[#06080E] text-slate-200 hover:border-slate-600'
                          }`}
                        >
                          {p}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Interactive Step Pipeline Builder + Commit & Run Trace (Stage 5) */}
            {stage.mechanicMode === 'multistep_builder' && stage.orderedSteps && (
              <div className="border-t border-b border-slate-800/80 py-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-mono text-cyan-300">
                    Step Sequence Builder (Arrange 1 → 4)
                  </div>
                  <span
                    className={`text-[11px] font-mono ${
                      stepOrderVerified ? 'text-emerald-300' : 'text-amber-300'
                    }`}
                    data-testid="step-order-status"
                  >
                    {stepOrderVerified ? 'Pipeline Order Verified' : 'Reorder Execution Steps'}
                  </span>
                </div>

                <div className="space-y-2">
                  {stepOrder.map((stepId, idx) => {
                    const def = stage.orderedSteps!.find((s) => s.id === stepId);
                    const isCorrectSlot = stage.correctStepOrder?.[idx] === stepId;
                    return (
                      <div
                        key={stepId}
                        className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs ${
                          stepOrderVerified
                            ? 'border-emerald-500/35 bg-emerald-500/5 text-emerald-100'
                            : isCorrectSlot
                              ? 'border-cyan-500/35 bg-[#06080E] text-slate-100'
                              : 'border-slate-800 bg-[#06080E] text-slate-300'
                        }`}
                      >
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-cyan-300 tabular-nums">
                              {idx + 1}.
                            </span>
                            <span>{def?.label}</span>
                          </div>
                          {def?.transformDesc && (
                            <div className="text-[11px] font-mono text-slate-400 pl-5">
                              {def.transformDesc}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            aria-label={`Move step ${idx + 1} up`}
                            disabled={idx === 0}
                            onClick={() => moveStep(idx, -1)}
                            className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded border border-slate-700 bg-[#0B101D] hover:border-cyan-400 disabled:opacity-30"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Move step ${idx + 1} down`}
                            disabled={idx === stepOrder.length - 1}
                            onClick={() => moveStep(idx, 1)}
                            className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded border border-slate-700 bg-[#0B101D] hover:border-cyan-400 disabled:opacity-30"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    data-testid="tutorial-run-trace-btn"
                    onClick={handleRunTrace}
                    className="min-h-[40px] px-4 py-1.5 rounded-lg border border-cyan-500/50 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-200 text-xs font-mono inline-flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Commit &amp; Run Trace
                  </button>
                  <span className="text-[11px] font-mono text-slate-400">
                    Executes current step arrangement on register = 0
                  </span>
                </div>

                {traceLog && (
                  <div
                    data-testid="tutorial-trace-output"
                    className="rounded-lg border border-slate-800 bg-[#06080E] p-3 space-y-1.5 text-xs font-mono tabular-nums animate-panel-reveal"
                  >
                    {traceLog.map((row, idx) => (
                      <div key={row.stepId} className="flex items-center justify-between gap-2">
                        <span className="text-slate-300">
                          [{idx + 1}] {row.formula}
                        </span>
                        <span className="text-cyan-300 font-semibold">→ {row.after}</span>
                      </div>
                    ))}
                    <div
                      className={`pt-1.5 border-t border-slate-800/80 ${
                        stepOrderVerified ? 'text-emerald-300' : 'text-amber-300'
                      }`}
                    >
                      {stepOrderVerified
                        ? 'Pipeline Validated · Final Output = 72'
                        : 'Sequence Mismatch · Reorder tumblers so Initialize leads cleanly'}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="text-sm text-slate-100 whitespace-pre-line leading-relaxed border-t border-slate-800/80 pt-4">
              {puzzle.promptBody}
            </div>

            <div className="text-xs text-slate-400 space-y-1">
              {puzzle.rules.map((r, i) => (
                <div key={i}>• {r}</div>
              ))}
            </div>

            {/* Companion Pattern / Observation Verification Check (Stages 1 & 2) */}
            {stage.secondaryCheck && !solved && (
              <div className="border-t border-slate-800/80 pt-3.5 space-y-2">
                <div className="text-xs font-medium text-amber-200">
                  {stage.secondaryCheck.prompt}
                </div>
                <div className="space-y-1.5">
                  {stage.secondaryCheck.options.map((opt) => {
                    const active = secondaryChoice === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSecondaryChoice(opt.id)}
                        className={`w-full text-left rounded border px-3 py-2 text-xs transition-colors ${
                          active
                            ? 'border-cyan-400 bg-cyan-500/10 text-white'
                            : 'border-slate-800 bg-[#06080E] text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                {secondaryChoice && (
                  <div
                    className={`text-[11px] font-mono ${
                      secondaryChoice === stage.secondaryCheck.validId
                        ? 'text-emerald-300'
                        : 'text-amber-300'
                    }`}
                  >
                    {secondaryChoice === stage.secondaryCheck.validId
                      ? `Verified: ${stage.secondaryCheck.explanation}`
                      : 'Re-check the observed rule before finalizing.'}
                  </div>
                )}
              </div>
            )}

            {/* Answer Controls */}
            {!solved ? (
              <form onSubmit={handleSubmit} className="space-y-4 border-t border-slate-800/80 pt-4">
                {puzzle.interactionType === 'multiple_choice' && puzzle.options ? (
                  <div className="space-y-2.5">
                    {stage.mechanicMode === 'hypothesis_elimination' && (
                      <div className="text-[11px] font-mono text-slate-400">
                        Eliminate hypotheses falsified by Log A &amp; B, then select the surviving theory:
                      </div>
                    )}
                    {puzzle.options.map((opt) => {
                      const selected = answer === opt.id;
                      const eliminated = eliminatedHypothesisIds.includes(opt.id);
                      return (
                        <div
                          key={opt.id}
                          className={`rounded-lg border p-3 transition-colors flex items-center justify-between gap-3 ${
                            eliminated
                              ? 'border-slate-900 bg-[#05070C] opacity-55'
                              : selected
                                ? 'border-cyan-400 bg-cyan-500/10 text-white'
                                : 'border-slate-800 bg-[#06080E] hover:border-slate-600 text-slate-200'
                          }`}
                        >
                          <button
                            type="button"
                            disabled={eliminated}
                            onClick={() => setAnswer(opt.id)}
                            className="flex-1 text-left"
                          >
                            <div
                              className={`text-sm font-medium ${
                                eliminated ? 'line-through text-slate-500' : ''
                              }`}
                            >
                              {opt.label}
                            </div>
                            {opt.detail && (
                              <div className="text-xs text-slate-400 mt-0.5">{opt.detail}</div>
                            )}
                          </button>

                          {stage.mechanicMode === 'hypothesis_elimination' && (
                            <button
                              type="button"
                              data-testid={`eliminate-${opt.id}`}
                              onClick={() => toggleEliminateHypothesis(opt.id)}
                              className={`min-h-[38px] px-2.5 py-1 rounded border text-[11px] font-mono inline-flex items-center gap-1 whitespace-nowrap ${
                                eliminated
                                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                                  : 'border-rose-500/35 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20'
                              }`}
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              {eliminated ? 'Restore' : 'Eliminate'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div>
                    <label
                      htmlFor="tutorial-answer-input"
                      className="block text-xs font-mono text-slate-400 mb-1.5"
                    >
                      {puzzle.instructions}
                    </label>
                    <input
                      id="tutorial-answer-input"
                      data-testid="tutorial-answer-input"
                      type="text"
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      placeholder="Enter your verified answer..."
                      className="w-full min-h-[46px] rounded-lg border border-slate-700 bg-[#06080E] px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-cyan-400"
                    />
                    {stage.validAlternativeDisplayNote && (
                      <p className="text-[11px] text-slate-500 mt-1">
                        {stage.validAlternativeDisplayNote}
                      </p>
                    )}
                  </div>
                )}

                {feedback && (
                  <div
                    role="status"
                    data-testid="tutorial-feedback"
                    className={`rounded-lg border px-4 py-3 space-y-1 ${DIAGNOSTIC_STYLE[feedback.kind].border} ${DIAGNOSTIC_STYLE[feedback.kind].bg}`}
                  >
                    <div
                      className={`text-xs font-mono uppercase tracking-wider font-semibold ${DIAGNOSTIC_STYLE[feedback.kind].title}`}
                    >
                      {feedback.headline}
                    </div>
                    <p className={`text-xs leading-relaxed ${DIAGNOSTIC_STYLE[feedback.kind].body}`}>
                      {feedback.message}
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs font-mono text-slate-400 tabular-nums">
                    Attempts: {attempts}
                  </span>
                  <button
                    type="submit"
                    data-testid="tutorial-submit-btn"
                    disabled={!answer.trim()}
                    className="min-h-[44px] px-6 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 text-sm font-semibold transition-colors whitespace-nowrap"
                  >
                    Submit Answer
                  </button>
                </div>
              </form>
            ) : (
              /* Post-Solve Reasoning Explanation, Reward Summary & Transition */
              <div className="space-y-4 border-t border-slate-800 pt-4 animate-panel-reveal">
                <div className="flex items-start gap-2.5 text-emerald-300">
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold">
                      {feedback?.headline ?? `Stage ${stage.stageNumber} Verified`}
                    </div>
                    {earnedRewards &&
                      (earnedRewards.xp > 0 ||
                      earnedRewards.ip > 0 ||
                      earnedRewards.kp > 0 ||
                      earnedRewards.ep > 0 ? (
                        <div
                          data-testid="tutorial-reward-summary"
                          className="text-xs font-mono text-slate-300 mt-0.5 tabular-nums"
                        >
                          +{earnedRewards.xp} XP · +{earnedRewards.ip} IP · +{earnedRewards.kp} KP
                          {earnedRewards.ep > 0 ? ` · +${earnedRewards.ep} EP` : ''}
                        </div>
                      ) : (
                        <div
                          data-testid="tutorial-reward-summary"
                          className="text-xs font-mono text-slate-400 mt-0.5"
                        >
                          Review Mode · Stage already mastered (rewards claimed previously)
                        </div>
                      ))}
                  </div>
                </div>

                <div className="border-t border-slate-800/80 pt-3 space-y-1.5">
                  <div className="text-xs font-mono uppercase tracking-wider text-amber-300">
                    Why This Matters &amp; Reasoning Explanation
                  </div>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                    {puzzle.explanation}
                  </p>
                </div>

                {/* Stage 3 Integrated IP Attribute Upgrade Prompt */}
                {stage.teachAttributeUpgrade && (
                  <div className="rounded-lg border border-cyan-500/40 bg-cyan-500/5 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-cyan-300">
                      <Sparkles className="w-4 h-4" />
                      Cultivate Your Mind · Available {save.ip} IP
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Intelligence Points (IP) earned from reasoning permanently upgrade your cognitive attributes, sharpening future insights and hints. Invest in an attribute below:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {TEACH_UPGRADE_ATTRS.map((attrId) => {
                        const meta = PRIMARY_ATTRIBUTES.find((a) => a.id === attrId);
                        const stateAttr = save.attributes[attrId];
                        const cost = getAttributeUpgradeCost(stateAttr.level);
                        const canAfford = save.ip >= cost;
                        return (
                          <button
                            key={attrId}
                            type="button"
                            data-testid={`tutorial-upgrade-${attrId}`}
                            disabled={!canAfford}
                            onClick={() => {
                              const res = onUpgradeAttribute(attrId);
                              setAttrUpgradeMsg(`${meta?.shortName ?? attrId}: ${res.message}`);
                            }}
                            className="text-left rounded-lg border border-slate-700 bg-[#0B101D] hover:border-cyan-400 disabled:opacity-50 p-2.5 transition-colors"
                          >
                            <div className="text-xs font-semibold text-white">
                              {meta?.shortName} Lv {stateAttr.level}
                            </div>
                            <div className="text-[11px] font-mono text-cyan-300 mt-0.5 tabular-nums">
                              {canAfford ? `Upgrade (${cost} IP)` : `Need ${cost} IP`}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {attrUpgradeMsg && (
                      <div className="text-xs font-mono text-emerald-300">{attrUpgradeMsg}</div>
                    )}
                  </div>
                )}

                <p className="text-xs sm:text-sm text-slate-300 italic leading-relaxed">
                  {stage.nextStageTransition}
                </p>

                <div className="flex justify-end">
                  {!isLastStage ? (
                    <button
                      type="button"
                      data-testid="tutorial-next-stage-btn"
                      onClick={() => resetForStage(stageIndex + 1)}
                      className="min-h-[44px] px-6 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap"
                    >
                      Continue to Stage {stage.stageNumber + 1}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      data-testid="tutorial-complete-btn"
                      onClick={onCompleteExpedition}
                      className="min-h-[46px] px-7 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap"
                    >
                      Enter Multiverse Stage I
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Contextual Skill Guidance, Graduated IP Hints & Scratchpad */}
        <aside className="lg:col-span-5 space-y-5">
          {/* Contextual Skill Guidance */}
          <section className="rounded-xl border border-slate-800 bg-[#090D18] p-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-violet-300">
              <Brain className="w-4 h-4" />
              Contextual Guidance · {stage.skillFocus}
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {stage.contextualGuidance}
            </p>
          </section>

          {/* Graduated Intelligence Hint Matrix (Levels 1-5) */}
          <section className="rounded-xl border border-slate-800 bg-[#0B101D] p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-300" />
                Graduated Intelligence Hints
              </h2>
              <span className="text-[11px] font-mono text-cyan-300 tabular-nums">
                {save.ip} IP Available
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Hints sharpen reasoning gradually without replacing thought. Deeper hint tiers unlock stage by stage.
            </p>

            <div className="divide-y divide-slate-800/80 border-t border-slate-800/80">
              {([1, 2, 3, 4, 5] as const).map((lvl) => {
                const meta = TUTORIAL_HINT_LEVEL_LABELS[lvl];
                const unlockedThisStage = lvl <= stage.maxHintLevel;
                const alreadyRevealed = revealedHintLevel >= lvl;
                const isFree = stage.stageNumber === 1 && lvl === 1;
                const cost = isFree ? 0 : computeHintCostIP(save, lvl, puzzle.difficultyScore);
                const canAfford = isFree || save.ip >= cost;
                const canRevealNext =
                  unlockedThisStage &&
                  !alreadyRevealed &&
                  lvl === revealedHintLevel + 1 &&
                  !solved;

                return (
                  <div
                    key={lvl}
                    className={`py-3 space-y-2 ${!unlockedThisStage ? 'opacity-55' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-semibold text-white">{meta.title}</div>
                        <div className="text-[11px] text-slate-400">{meta.subtitle}</div>
                      </div>

                      {!unlockedThisStage ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-500 whitespace-nowrap">
                          <Lock className="w-3 h-3" />
                          Stage {lvl}+
                        </span>
                      ) : alreadyRevealed ? (
                        <span className="text-[11px] font-mono text-emerald-300 whitespace-nowrap">
                          Revealed
                        </span>
                      ) : (
                        <button
                          type="button"
                          data-testid={`tutorial-hint-${lvl}-btn`}
                          disabled={!canRevealNext || !canAfford}
                          onClick={() => handleRequestHint(lvl)}
                          className="min-h-[38px] px-3 py-1 rounded-md bg-amber-400/90 hover:bg-amber-300 disabled:bg-slate-800 disabled:text-slate-400 text-slate-950 text-xs font-semibold whitespace-nowrap tabular-nums"
                        >
                          {isFree
                            ? 'Free Cue'
                            : !canAfford
                              ? `Need ${cost} IP`
                              : `${cost} IP`}
                        </button>
                      )}
                    </div>

                    {alreadyRevealed && (
                      <p className="text-xs text-amber-100 leading-relaxed pt-1">
                        {getAdaptiveHintText(puzzle, lvl, intelligenceTier)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Working Scratchpad */}
          <section className="rounded-xl border border-slate-800 bg-[#090D18] p-4 space-y-2">
            <label
              htmlFor="tutorial-scratchpad"
              className="block text-xs font-mono uppercase tracking-wider text-slate-400"
            >
              Working Scratchpad
            </label>
            <textarea
              id="tutorial-scratchpad"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Track eliminated cases, intermediate numbers, or rival theories..."
              className="w-full rounded-lg border border-slate-800 bg-[#06080E] p-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </section>
        </aside>
      </main>
    </div>
  );
};
