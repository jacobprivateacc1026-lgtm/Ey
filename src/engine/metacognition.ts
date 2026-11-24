import { getModeDifficultyConfig, resolvePuzzleModeKey } from './difficultyConfig';
import {
  ConfidenceStats,
  ConfidenceTag,
  ErrorJournalEntry,
  ErrorPatternId,
  ErrorPatternMeta,
  GameSaveState,
  PuzzleSpec,
  ReflectiveProfile,
} from './types';

export const ERROR_PATTERNS: ErrorPatternMeta[] = [
  {
    id: 'assumed_untested',
    label: 'Assumed something untested',
    shortLabel: 'Untested assumption',
    description: 'Carried over an external habit or unverified premise without checking the rules.',
  },
  {
    id: 'ignored_detail',
    label: 'Ignored a detail',
    shortLabel: 'Missed detail',
    description: 'Skipped a boundary condition, number, quantifier, or physical constraint in the record.',
  },
  {
    id: 'unreliable_source',
    label: 'Trusted an unreliable source',
    shortLabel: 'Unreliable source',
    description: 'Accepted a speaker, tablet, or log entry whose provenance or accuracy was compromised.',
  },
  {
    id: 'obvious_reading',
    label: 'Took the obvious reading',
    shortLabel: 'Surface reading',
    description: 'Committed to the first surface pattern or intuitive phrasing without testing alternatives.',
  },
  {
    id: 'ignored_opponent',
    label: "Ignored the opponent's response",
    shortLabel: 'Ignored opponent',
    description: 'Planned in isolation without accounting for how an adversary or shifting rule reacts.',
  },
  {
    id: 'guessed',
    label: 'Guessed',
    shortLabel: 'Guessed',
    description: 'Submitted a candidate before tracing the evidence to a reasoned conclusion.',
  },
];

export const ERROR_PATTERN_MAP: Record<ErrorPatternId, ErrorPatternMeta> = ERROR_PATTERNS.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<ErrorPatternId, ErrorPatternMeta>
);

const FILLER_REGEX =
  /^(?:idk|i don'?t know|dont know|no idea|not sure|oops|my bad|wrong|mistake|i guessed|just guessed|test|asdf+|qwer+|nothing|none|whatever|skip|n\/a|\.+|\?+|!+)$/i;

export interface ReflectionEffortCheck {
  ok: boolean;
  reason?: string;
}

function tokenizeClean(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9']+/g) ?? []).filter(Boolean);
}

export function validateReflectionEffort(
  rawText: string,
  puzzle: PuzzleSpec,
  isEscalated: boolean = false
): ReflectionEffortCheck {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return {
      ok: false,
      reason: 'Write 1–2 sentences explaining where your reasoning slipped before continuing.',
    };
  }
  if (trimmed.length < 15) {
    return {
      ok: false,
      reason: 'Too brief—name what constraint, assumption, or detail misled your step (at least 15 characters).',
    };
  }
  if (FILLER_REGEX.test(trimmed)) {
    return {
      ok: false,
      reason: 'Generic filler does not log a useful diagnosis. Describe the specific misstep in your reasoning.',
    };
  }

  // Reject single-character mash or gibberish repetition like "aaaaaaaaaaaaaaa" or "asdfasdfasdf"
  const lettersOnly = trimmed.toLowerCase().replace(/[^a-z]/g, '');
  if (lettersOnly.length >= 6) {
    const uniqueLetters = new Set(lettersOnly.split(''));
    if (uniqueLetters.size <= 3 || /(.)\1{4,}/.test(lettersOnly)) {
      return {
        ok: false,
        reason: 'Please enter a coherent 1–2 sentence reflection in plain words.',
      };
    }
    const vowels = (lettersOnly.match(/[aeiouy]/g) ?? []).length;
    if (vowels / lettersOnly.length < 0.16) {
      return {
        ok: false,
        reason: 'Your note looks like random characters—state clearly what detail or premise tripped you up.',
      };
    }
  }

  const words = tokenizeClean(trimmed);
  const uniqueWords = new Set(words);
  if (words.length < 3 || uniqueWords.size < 3) {
    return {
      ok: false,
      reason: 'Include at least 3 distinct words explaining the error rather than repeating a fragment.',
    };
  }

  // Reject echoing puzzle prompt or objective verbatim
  const promptText = `${puzzle.objective} ${puzzle.promptBody} ${puzzle.instructions}`.toLowerCase();
  if (trimmed.length >= 24 && promptText.includes(trimmed.toLowerCase())) {
    return {
      ok: false,
      reason: 'Do not copy the prompt text—state in your own words why your answer failed.',
    };
  }

  if (isEscalated) {
    const referenceTerms = new Set<string>();
    const collectTerms = (src: string) => {
      for (const tok of tokenizeClean(src)) {
        if (tok.length >= 4) referenceTerms.add(tok);
      }
    };
    puzzle.sceneObjects?.forEach((o) => {
      collectTerms(o.label);
      collectTerms(o.kindTag);
    });
    puzzle.documents?.forEach((d) => {
      collectTerms(d.title);
      collectTerms(d.source);
    });
    puzzle.rules.forEach(collectTerms);
    puzzle.visualData?.premises?.forEach(collectTerms);

    const hasGroundedTerm =
      referenceTerms.size === 0 || words.some((w) => referenceTerms.has(w) || /\d/.test(w));
    if (!hasGroundedTerm) {
      return {
        ok: false,
        reason:
          'Repeated misses require citing a concrete rule, exhibit, object, or number from this challenge.',
      };
    }
  }

  return { ok: true };
}

export function inferExploitedPattern(
  puzzle: PuzzleSpec,
  submittedAnswer: string,
  confidence?: ConfidenceTag
): ErrorPatternId {
  if (confidence === 'guessing' && submittedAnswer.trim().length <= 6) {
    return 'guessed';
  }
  const norm = submittedAnswer.trim().toLowerCase();

  // Check multiple-choice option metadata first
  if (puzzle.options) {
    const matchedOpt = puzzle.options.find(
      (opt) => opt.id.toLowerCase() === norm || opt.label.toLowerCase() === norm
    );
    if (matchedOpt?.exploitedPattern) {
      return matchedOpt.exploitedPattern;
    }
  }

  // Heuristic matching by puzzle mechanics & interaction
  if (puzzle.documents && puzzle.documents.some((d) => d.reliabilityNote.toLowerCase().includes('conflict') || d.reliabilityNote.toLowerCase().includes('corrupt') || d.reliabilityNote.toLowerCase().includes('unverified'))) {
    if (puzzle.defaultErrorPattern) return puzzle.defaultErrorPattern;
  }

  if (puzzle.interactionType === 'numeric_input' && puzzle.validSolutions[0]) {
    const expectedNum = Number(puzzle.validSolutions[0]);
    const submittedNum = Number(norm);
    if (!Number.isFinite(submittedNum)) {
      return 'guessed';
    }
    if (Number.isFinite(expectedNum) && expectedNum !== 0) {
      const ratio = Math.abs(submittedNum / expectedNum);
      if (ratio < 0.7 || ratio > 1.35) {
        return 'obvious_reading';
      }
      return 'ignored_detail';
    }
  }

  if (puzzle.workspaceMode === 'cat_mouse' || puzzle.workspaceMode === 'war_table' || puzzle.workspaceMode === 'social_reading') {
    return puzzle.defaultErrorPattern ?? 'ignored_opponent';
  }

  if (puzzle.interactionType === 'spatial_grid') {
    return puzzle.defaultErrorPattern ?? 'assumed_untested';
  }

  if (puzzle.interactionType === 'rubric_synthesis') {
    return puzzle.defaultErrorPattern ?? 'assumed_untested';
  }

  return puzzle.defaultErrorPattern ?? 'ignored_detail';
}

export interface MetacognitionResolution {
  nextState: GameSaveState;
  entry: ErrorJournalEntry;
  clarityLost: number;
  clarityRefunded: number;
  actualPattern: ErrorPatternMeta;
  diagnosisMatched: boolean;
  feedbackHeadline: string;
  feedbackDetail: string;
}

export function applyMetacognitionPenalty(
  state: GameSaveState,
  puzzle: PuzzleSpec,
  params: {
    submittedAnswer: string;
    confidence?: ConfidenceTag;
    selectedPattern: ErrorPatternId;
    reflectionText: string;
    isBoss?: boolean;
    evidenceCited?: string;
  }
): MetacognitionResolution {
  const modeConfig = getModeDifficultyConfig(puzzle, params.isBoss);
  const modeKey = resolvePuzzleModeKey(puzzle, params.isBoss);
  const actualId = inferExploitedPattern(puzzle, params.submittedAnswer, params.confidence);
  const diagnosisMatched = params.selectedPattern === actualId;
  const actualPattern = ERROR_PATTERN_MAP[actualId];

  const basePenalty = modeConfig.clarityWrongPenalty;
  const sureMultiplier = params.confidence === 'sure' ? modeConfig.claritySureMultiplier : 1;
  const rawPenalty = Math.round(basePenalty * sureMultiplier);
  const refund = basePenalty > 0 && diagnosisMatched ? modeConfig.clarityMatchRefund : 0;
  const netPenalty = Math.max(0, rawPenalty - refund);

  const currentClarity = typeof state.clarity === 'number' ? state.clarity : modeConfig.clarityMax;
  const nextClarity = Math.max(modeConfig.clarityFloor, currentClarity - netPenalty);
  const actualClarityLost = Math.max(0, currentClarity - nextClarity);

  const prevConf = state.confidenceStats ?? {
    sureTotal: 0,
    sureCorrect: 0,
    thinkSoTotal: 0,
    thinkSoCorrect: 0,
    guessingTotal: 0,
    guessingCorrect: 0,
  };
  const nextConf: ConfidenceStats = { ...prevConf };
  if (params.confidence === 'sure') nextConf.sureTotal += 1;
  else if (params.confidence === 'think_so') nextConf.thinkSoTotal += 1;
  else if (params.confidence === 'guessing') nextConf.guessingTotal += 1;

  const entry: ErrorJournalEntry = {
    id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
    puzzleId: puzzle.id,
    puzzleTitle: puzzle.title,
    modeKey,
    submittedAnswer: params.submittedAnswer.slice(0, 120),
    confidence: params.confidence,
    selectedPattern: params.selectedPattern,
    actualPattern: actualId,
    diagnosisMatched,
    reflectionText: params.reflectionText.trim(),
    clarityDelta: -actualClarityLost,
    evidenceCited: params.evidenceCited,
  };

  const prevOpp = state.opponentMemory ?? {
    opponentResponses: {},
    patternCounts: {},
    overconfidentMisses: 0,
    totalMisses: 0,
    cleanFirstTrySolves: 0,
  };
  const nextOpp = {
    ...prevOpp,
    totalMisses: prevOpp.totalMisses + 1,
    overconfidentMisses:
      prevOpp.overconfidentMisses + (params.confidence === 'sure' ? 1 : 0),
    patternCounts: {
      ...prevOpp.patternCounts,
      [actualId]: (prevOpp.patternCounts[actualId] ?? 0) + 1,
    },
    lastMissPuzzleTitle: puzzle.title,
    lastMissPattern: actualId,
  };

  const nextState: GameSaveState = {
    ...state,
    clarity: nextClarity,
    clarityMax: modeConfig.clarityMax,
    mistakePatterns: {
      ...(state.mistakePatterns ?? {}),
      [actualId]: ((state.mistakePatterns ?? {})[actualId] ?? 0) + 1,
    },
    errorJournal: [...(state.errorJournal ?? []), entry].slice(-120),
    confidenceStats: nextConf,
    opponentMemory: nextOpp,
    lastSavedAt: Date.now(),
  };

  const feedbackHeadline = diagnosisMatched
    ? `Diagnosis aligned · ${actualPattern.shortLabel}`
    : `Diagnosis revised · ${actualPattern.shortLabel}`;

  const clarityClause =
    basePenalty === 0
      ? 'Zero Clarity penalty in this introductory mode.'
      : params.confidence === 'sure'
        ? `Overconfident ("Sure") submission increased Clarity strain (-${actualClarityLost} net, floor ${modeConfig.clarityFloor}).`
        : diagnosisMatched
          ? `Accurate self-audit recovered ${refund} Clarity (-${actualClarityLost} net).`
          : `Clarity shifted by -${actualClarityLost} (floor ${modeConfig.clarityFloor}).`;

  const feedbackDetail = diagnosisMatched
    ? `You identified "${actualPattern.label}" accurately. ${clarityClause}`
    : `This error exploited "${actualPattern.label}" rather than "${ERROR_PATTERN_MAP[params.selectedPattern].label}". Check that seam before retrying—no answer is revealed. ${clarityClause}`;

  return {
    nextState,
    entry,
    clarityLost: actualClarityLost,
    clarityRefunded: refund,
    actualPattern,
    diagnosisMatched,
    feedbackHeadline,
    feedbackDetail,
  };
}

export function recordConfidenceOnSolve(
  state: GameSaveState,
  confidence?: ConfidenceTag,
  attempts: number = 1
): GameSaveState {
  const prevConf = state.confidenceStats ?? {
    sureTotal: 0,
    sureCorrect: 0,
    thinkSoTotal: 0,
    thinkSoCorrect: 0,
    guessingTotal: 0,
    guessingCorrect: 0,
  };
  const nextConf: ConfidenceStats = { ...prevConf };
  if (confidence === 'sure') {
    nextConf.sureTotal += 1;
    nextConf.sureCorrect += 1;
  } else if (confidence === 'think_so') {
    nextConf.thinkSoTotal += 1;
    nextConf.thinkSoCorrect += 1;
  } else if (confidence === 'guessing') {
    nextConf.guessingTotal += 1;
    nextConf.guessingCorrect += 1;
  }

  const prevOpp = state.opponentMemory ?? {
    opponentResponses: {},
    patternCounts: {},
    overconfidentMisses: 0,
    totalMisses: 0,
    cleanFirstTrySolves: 0,
  };

  return {
    ...state,
    confidenceStats: nextConf,
    opponentMemory: {
      ...prevOpp,
      cleanFirstTrySolves: prevOpp.cleanFirstTrySolves + (attempts === 1 ? 1 : 0),
    },
  };
}

export function computeReflectiveProfile(state: GameSaveState): ReflectiveProfile {
  const journal = state.errorJournal ?? [];
  const conf = state.confidenceStats ?? {
    sureTotal: 0,
    sureCorrect: 0,
    thinkSoTotal: 0,
    thinkSoCorrect: 0,
    guessingTotal: 0,
    guessingCorrect: 0,
  };

  const counts = new Map<ErrorPatternId, number>();
  for (const p of ERROR_PATTERNS) {
    const val = (state.opponentMemory?.patternCounts?.[p.id] ?? 0) + (state.mistakePatterns?.[p.id] ?? 0);
    if (val > 0) counts.set(p.id, val);
  }
  if (counts.size === 0 && journal.length > 0) {
    for (const j of journal) {
      counts.set(j.actualPattern, (counts.get(j.actualPattern) ?? 0) + 1);
    }
  }

  const sortedPatterns = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  const dominantId = sortedPatterns[0]?.[0] ?? null;
  const dominantPattern = dominantId ? ERROR_PATTERN_MAP[dominantId] : null;

  const sureMisses = Math.max(0, conf.sureTotal - conf.sureCorrect);
  const overconfidenceRatePct =
    conf.sureTotal > 0 ? Math.round((sureMisses / conf.sureTotal) * 100) : 0;

  let calibrationLabel = 'Unmeasured';
  if (conf.sureTotal + conf.thinkSoTotal + conf.guessingTotal >= 2) {
    if (conf.sureTotal >= 2 && overconfidenceRatePct >= 40) {
      calibrationLabel = 'Overconfident on first readings';
    } else if (conf.guessingTotal > conf.sureTotal + conf.thinkSoTotal && conf.guessingCorrect > 0) {
      calibrationLabel = 'Under-trusting sound deductions';
    } else if (overconfidenceRatePct <= 20) {
      calibrationLabel = 'Well-calibrated certainty';
    } else {
      calibrationLabel = 'Developing calibration';
    }
  }

  const solved = state.performanceHistory.filter((r) => r.solved);
  const strengths: string[] = [];
  if (solved.filter((r) => r.hintsUsed === 0).length >= 3) {
    strengths.push('Sustains independent reasoning without leaning on hint tiers.');
  }
  if (solved.filter((r) => r.attempts === 1).length >= 3) {
    strengths.push('Verifies boundary cases before committing early attempts.');
  }
  if ((state.secondOrderReflections ? Object.keys(state.secondOrderReflections).length : 0) >= 2) {
    strengths.push('Articulates structural principles cleanly after solving.');
  }
  if (strengths.length === 0) {
    strengths.push('Profile strengthens as Jacob resolves chapters, field notes, and chambers.');
  }

  const blindSpots: string[] = [];
  if (dominantPattern) {
    blindSpots.push(`Recurring drift toward: ${dominantPattern.label.toLowerCase()}.`);
  }
  if (conf.sureTotal >= 2 && overconfidenceRatePct >= 35) {
    blindSpots.push(`Marked "Sure" on ${sureMisses} of ${conf.sureTotal} uncertain or flawed submissions.`);
  }
  if (journal.length >= 2) {
    const diagAccuracy = journal.filter((j) => j.diagnosisMatched).length / journal.length;
    if (diagAccuracy < 0.5) {
      blindSpots.push('Self-audits often misclassify which assumption caused the slip.');
    }
  }
  if (blindSpots.length === 0) {
    blindSpots.push('No pronounced habit bias recorded yet; keep testing assumptions explicitly.');
  }

  const summaryLine =
    solved.length === 0 && journal.length === 0
      ? 'Jacob’s habits are still unetched. Every claim you inspect and every mistake you audit shapes how companions and guardians read you.'
      : `Across ${solved.length} solved encounters and ${journal.length} logged audits, calibration reads as ${calibrationLabel.toLowerCase()}.`;

  const characterObservation = dominantPattern
    ? `Ilya notes in the margin: "When Jacob speeds up, he tends toward '${dominantPattern.shortLabel.toLowerCase()}'. Slow the pen at that exact corner."`
    : 'Ilya leaves the margin blank: "No predictable tell yet—only clean ledger work."';

  return {
    summaryLine,
    strengths,
    blindSpots,
    calibrationLabel,
    overconfidenceRatePct,
    dominantPattern,
    characterObservation,
  };
}
