import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { getModeDifficultyConfig } from '../engine/difficultyConfig';
import {
  ERROR_PATTERNS,
  MetacognitionResolution,
  validateReflectionEffort,
} from '../engine/metacognition';
import {
  ConfidenceTag,
  ErrorPatternId,
  GameSaveState,
  PuzzleSpec,
} from '../engine/types';

interface MetacognitionPenaltyPanelProps {
  puzzle: PuzzleSpec;
  save: GameSaveState;
  submittedAnswer: string;
  confidence?: ConfidenceTag;
  wrongCountOnPuzzle: number;
  isBoss?: boolean;
  onApplyDiagnosis: (params: {
    selectedPattern: ErrorPatternId;
    reflectionText: string;
    evidenceCited?: string;
  }) => MetacognitionResolution;
  onCompleteAudit: () => void;
}

export const MetacognitionPenaltyPanel: React.FC<MetacognitionPenaltyPanelProps> = ({
  puzzle,
  save,
  submittedAnswer,
  confidence,
  wrongCountOnPuzzle,
  isBoss = false,
  onApplyDiagnosis,
  onCompleteAudit,
}) => {
  const [selectedPattern, setSelectedPattern] = useState<ErrorPatternId | null>(null);
  const [reflectionText, setReflectionText] = useState<string>('');
  const [evidenceCited, setEvidenceCited] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [resolution, setResolution] = useState<MetacognitionResolution | null>(null);

  const modeConfig = useMemo(
    () => getModeDifficultyConfig(puzzle, isBoss),
    [puzzle, isBoss]
  );

  const isEscalated = wrongCountOnPuzzle >= 2;
  const basePenalty = modeConfig.clarityWrongPenalty;
  const effectivePenalty =
    confidence === 'sure'
      ? Math.round(basePenalty * modeConfig.claritySureMultiplier)
      : basePenalty;

  const citeOptions = useMemo(() => {
    const items: string[] = [];
    puzzle.sceneObjects?.forEach((o) => items.push(o.label));
    puzzle.documents?.forEach((d) => items.push(d.title));
    return items.slice(0, 6);
  }, [puzzle.sceneObjects, puzzle.documents]);

  const handleSubmitAudit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPattern) {
      setValidationError('Select which of the 6 common error patterns tripped this attempt.');
      return;
    }

    const combinedText = evidenceCited
      ? `${reflectionText.trim()} (Exhibit: ${evidenceCited})`
      : reflectionText.trim();

    const effortCheck = validateReflectionEffort(combinedText, puzzle, isEscalated);
    if (!effortCheck.ok) {
      setValidationError(effortCheck.reason ?? 'Please enter a concrete 1–2 sentence diagnosis.');
      return;
    }

    setValidationError(null);
    const res = onApplyDiagnosis({
      selectedPattern,
      reflectionText: combinedText,
      evidenceCited: evidenceCited || undefined,
    });
    setResolution(res);
  };

  if (resolution) {
    return (
      <section
        data-testid="metacognition-resolution"
        className="rounded-xl border border-amber-500/45 bg-[#12101A] p-4 sm:p-5 space-y-3.5 animate-panel-reveal"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            {resolution.diagnosisMatched ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />
            )}
            <span>{resolution.feedbackHeadline}</span>
          </div>
          <span className="text-xs font-mono text-amber-300 tabular-nums">
            Clarity {resolution.nextState.clarity}/{resolution.nextState.clarityMax}
            {resolution.clarityLost > 0 ? ` (−${resolution.clarityLost})` : ''}
          </span>
        </div>

        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
          {resolution.feedbackDetail}
        </p>

        <div className="text-[11px] font-mono text-slate-400">
          Logged to Personal Notebook · Your reflection and diagnosis are preserved for review.
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            data-testid="metacognition-continue-btn"
            onClick={onCompleteAudit}
            className="min-h-[42px] px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold transition-colors"
          >
            Return to Challenge &amp; Revise
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      data-testid="metacognition-penalty-panel"
      className="rounded-xl border border-rose-500/40 bg-[#120D16] p-4 sm:p-5 space-y-4 animate-panel-reveal"
    >
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-rose-500/20 pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-rose-300">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            Metacognitive Audit Required Before Retry
          </div>
          <p className="text-xs text-slate-300">
            Submitted: <span className="font-mono text-white">“{submittedAnswer.slice(0, 64) || '(blank)'}”</span>
            {confidence && (
              <>
                {' · '}Confidence:{' '}
                <span className="font-mono text-amber-200">
                  {confidence === 'sure' ? 'Sure (1.5× Clarity strain)' : confidence === 'think_so' ? 'Think so' : 'Guessing'}
                </span>
              </>
            )}
          </p>
        </div>

        <div className="text-right text-xs font-mono tabular-nums text-slate-300">
          {basePenalty === 0 ? (
            <span className="text-emerald-300">0 Clarity Penalty (Intro Mode)</span>
          ) : (
            <span>
              Base −{effectivePenalty} Clarity · Accurate diagnosis refunds +{modeConfig.clarityMatchRefund}
              <span className="block text-[11px] text-slate-400">
                Clarity {save.clarity}/{modeConfig.clarityMax} (Floor {modeConfig.clarityFloor})
              </span>
            </span>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmitAudit} className="space-y-4">
        <div className="space-y-2">
          <div className="text-xs font-medium text-slate-200">
            1. Which failure pattern tripped this attempt?
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ERROR_PATTERNS.map((pat) => {
              const active = selectedPattern === pat.id;
              return (
                <button
                  key={pat.id}
                  type="button"
                  data-testid={`pattern-${pat.id}`}
                  onClick={() => {
                    setSelectedPattern(pat.id);
                    setValidationError(null);
                  }}
                  className={`min-h-[44px] text-left p-2.5 rounded-lg border transition-colors ${
                    active
                      ? 'border-amber-400 bg-amber-500/15 text-white'
                      : 'border-slate-800 bg-[#080910] text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <div className="text-xs font-semibold">{pat.label}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    {pat.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {citeOptions.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[11px] font-mono text-slate-400">
              {isEscalated
                ? 'Repeat miss: tap or reference the exact exhibit/object involved:'
                : 'Optional: link the exhibit or record involved'}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {citeOptions.map((label) => {
                const chosen = evidenceCited === label;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setEvidenceCited(chosen ? '' : label)}
                    className={`min-h-[34px] px-2.5 py-1 rounded border text-[11px] transition-colors ${
                      chosen
                        ? 'border-cyan-400 bg-cyan-500/15 text-cyan-200'
                        : 'border-slate-800 bg-[#080910] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-slate-200">
            2. Write 1–2 specific sentences explaining what you assumed or missed
            {isEscalated && (
              <span className="text-amber-300 ml-1">
                (Cite a rule, exhibit name, or number from this room)
              </span>
            )}
          </span>
          <textarea
            rows={2}
            data-testid="metacognition-reflection-input"
            value={reflectionText}
            onChange={(e) => {
              setReflectionText(e.target.value);
              if (validationError) setValidationError(null);
            }}
            placeholder="e.g., I trusted the first increment across Plate 1–2 without checking whether the second difference held on Plate 4..."
            className="w-full rounded-lg border border-slate-700 bg-[#06080E] p-3 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
          />
        </label>

        {validationError && (
          <div
            role="alert"
            data-testid="metacognition-validation-error"
            className="rounded-lg border border-rose-500/45 bg-rose-500/10 px-3 py-2 text-xs text-rose-200"
          >
            {validationError}
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-400">
            Misdiagnoses still unlock retry and reveal the pattern exploited—never the solution.
          </span>
          <button
            type="submit"
            data-testid="metacognition-submit-btn"
            className="min-h-[42px] px-5 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-semibold whitespace-nowrap transition-colors"
          >
            Log Self-Audit &amp; Retry
          </button>
        </div>
      </form>
    </section>
  );
};
