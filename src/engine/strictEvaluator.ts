import {
  PuzzleSpec,
  StrictRubricCriterionSpec,
  StrictRubricSpec,
  StrictVerdict,
} from './types';

export interface StrictEvaluationResult {
  correct: boolean;
  verdict: StrictVerdict;
  scoreRatio: number;
  feedback: string;
  weaknessDiagnosis?: string;
  matchedCriterionLabels: string[];
  missingCriterionLabels: string[];
}

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|rules?|prompts?)/i,
  /system\s+prompt/i,
  /mark\s+(this|my\s+answer|submission)\s+as\s+(accepted|correct|passed)/i,
  /override\s+(rubric|evaluator|grading|check)/i,
  /you\s+are\s+now\s+/i,
  /\[\s*admin\s*\]/i,
];

const RELATIONAL_CONNECTIVES = new Set([
  'because',
  'therefore',
  'thus',
  'hence',
  'so',
  'since',
  'if',
  'unless',
  'when',
  'while',
  'although',
  'though',
  'whereas',
  'yet',
  'but',
  'without',
  'requires',
  'require',
  'causes',
  'cause',
  'prevents',
  'prevent',
  'proves',
  'prove',
  'fails',
  'fail',
  'forces',
  'force',
  'leads',
  'lead',
  'means',
  'mean',
  'breaks',
  'break',
  'isolates',
  'isolate',
  'distinguishes',
  'distinguish',
  'separates',
  'separate',
  'depends',
  'depend',
  'cannot',
  "can't",
  'must',
  'allows',
  'allow',
  'resolves',
  'resolve',
  'shows',
  'show',
  'explains',
  'explain',
  'reveals',
  'reveal',
  'contradicts',
  'contradict',
  'implies',
  'imply',
  'shifts',
  'shift',
  'updates',
  'update',
  'avoids',
  'avoid',
  'leaves',
  'leave',
]);

const NEGATION_TOKENS = new Set([
  'not',
  'never',
  'no',
  'nor',
  'cannot',
  "can't",
  'cant',
  'without',
  'unable',
  'impossible',
  'fail',
  'fails',
  'failed',
  'lacks',
  'lack',
  'neither',
  'unprovable',
  'incapable',
  'refutes',
  'refute',
  'refuses',
  'refuse',
  'denies',
  'deny',
  'false',
  "isn't",
  "aren't",
  "won't",
  "doesn't",
  "don't",
]);

const STOPWORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'of',
  'to',
  'in',
  'on',
  'for',
  'with',
  'by',
  'from',
  'at',
  'as',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'that',
  'this',
  'these',
  'those',
  'it',
  'its',
  'they',
  'their',
  'we',
  'our',
  'you',
  'your',
  'one',
  'two',
  'three',
  'both',
  'each',
  'every',
  'any',
  'all',
]);

function cleanNormalize(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[“”"'`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeWords(text: string): string[] {
  const m = cleanNormalize(text).match(/[a-z0-9'-]+/g);
  return m ?? [];
}

function splitClauses(text: string): string[] {
  return cleanNormalize(text)
    .split(/(?:[.;!?]+|\b(?:but|however|although|while|yet|whereas|nevertheless)\b)/g)
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
}

function getNgrams(words: string[], n: number): Set<string> {
  const out = new Set<string>();
  if (words.length < n) return out;
  for (let i = 0; i <= words.length - n; i++) {
    out.add(words.slice(i, i + n).join(' '));
  }
  return out;
}

function checkPromptEcho(
  submissionWords: string[],
  puzzle: PuzzleSpec
): boolean {
  if (submissionWords.length < 8) return false;
  const promptSource = [
    puzzle.promptBody,
    puzzle.objective,
    puzzle.instructions,
    ...puzzle.rules,
  ].join(' ');
  const promptWords = tokenizeWords(promptSource);
  const sub3 = getNgrams(submissionWords, 3);
  const prompt3 = getNgrams(promptWords, 3);
  if (sub3.size === 0) return false;

  let overlap3 = 0;
  for (const gram of sub3) {
    if (prompt3.has(gram)) overlap3++;
  }
  const overlapRatio = overlap3 / sub3.size;

  const promptContentSet = new Set(promptWords.filter((w) => !STOPWORDS.has(w) && w.length >= 4));
  const novelContent = submissionWords.filter(
    (w) => !STOPWORDS.has(w) && w.length >= 4 && !promptContentSet.has(w)
  );
  const uniqueNovel = new Set(novelContent);

  if (overlapRatio > 0.56 && uniqueNovel.size < 8) {
    return true;
  }
  if (overlapRatio > 0.68) {
    return true;
  }
  return false;
}

function isKeywordStuffed(
  rawSubmission: string,
  words: string[],
  clauses: string[],
  spec: StrictRubricSpec
): boolean {
  if (words.length < 6) return true;

  // Count relational / reasoning connectives
  let connectiveCount = 0;
  for (const w of words) {
    if (RELATIONAL_CONNECTIVES.has(w)) connectiveCount++;
  }

  // Count how many rubric stems appear across the text
  const allStems = spec.criteria.flatMap((c) => c.stems);
  let stemHits = 0;
  const norm = cleanNormalize(rawSubmission);
  for (const stem of allStems) {
    if (norm.includes(stem.toLowerCase())) stemHits++;
  }

  // Comma / newline fragmented lists with minimal verbs or structure
  const commaSegments = rawSubmission.split(/[,/\n]+/).filter((s) => s.trim().length > 0);
  if (commaSegments.length >= 4 && connectiveCount === 0) {
    return true;
  }

  const avgWordsPerClause =
    clauses.length > 0 ? words.length / clauses.length : words.length;
  if (stemHits >= 3 && connectiveCount === 0 && avgWordsPerClause < 8) {
    return true;
  }

  if (words.length >= 12 && connectiveCount === 0 && clauses.length <= 2) {
    // Allow well-formed explanatory prose with active verbs (verbs ending in s/ed/ing or modal forms)
    const activeVerbs = words.filter((w) =>
      /(?:create|creates|prevent|prevents|require|requires|prove|proves|depend|depends|show|shows|mean|means|break|breaks|fail|fails|cause|causes|force|forces|step|steps|shift|shifts|audit|audits|test|tests|compare|compares|reduce|reduces|stand|stands|build|builds|hide|hides|claim|claims|claiming|assume|assumes|treat|treats|collapse|collapses|resolve|resolves|validate|validates|distinguish|distinguishes|separate|separates|yield|yields|make|makes|work|works|mirror|mirrors|enforce|enforces|erase|erases|erasing|repeat|repeats|remain|remains|translate|translates|track|tracks|deny|denies|destroy|destroys|protect|protects|replace|replaces|eliminate|eliminates|decide|decides|choose|chooses)$/.test(
        w
      )
    );
    if (activeVerbs.length === 0) {
      return true;
    }
  }

  return false;
}

function hasNegationBefore(clauseWords: string[], stemIndex: number): boolean {
  const start = Math.max(0, stemIndex - 6);
  for (let i = start; i < stemIndex; i++) {
    if (NEGATION_TOKENS.has(clauseWords[i])) {
      return true;
    }
  }
  return false;
}

function evaluateCriterionInClauses(
  criterion: StrictRubricCriterionSpec,
  clauses: string[]
): {
  matched: boolean;
  polarityViolation: boolean;
} {
  let matchedPositive = false;
  let sawPolarityViolation = false;
  const minWords = criterion.minClauseWords ?? 4;

  for (const clause of clauses) {
    const clauseWords = tokenizeWords(clause);
    if (clauseWords.length < minWords) continue;

    // Check explicit negatedStems (e.g., "incomplete", "unprovable", "undecidable" count as negated/affirmed barrier)
    if (criterion.negatedStems) {
      for (const negStem of criterion.negatedStems) {
        if (clause.includes(negStem.toLowerCase())) {
          if (criterion.requiredPolarity === 'negate' || criterion.requiredPolarity === 'any') {
            matchedPositive = true;
          }
        }
      }
    }

    for (const stem of criterion.stems) {
      const lowerStem = stem.toLowerCase();
      const idx = clauseWords.findIndex((w) => w.includes(lowerStem));
      if (idx === -1 && !clause.includes(lowerStem)) continue;

      const wordPos = idx !== -1 ? idx : 0;
      const isNegated = hasNegationBefore(clauseWords, wordPos);

      if (criterion.requiredPolarity === 'any') {
        matchedPositive = true;
      } else if (criterion.requiredPolarity === 'affirm') {
        if (isNegated && !/(?:cannot|not)\s+(?:be\s+)?(?:avoided|ignored|escaped|proven|proved)/.test(clause)) {
          sawPolarityViolation = true;
        } else {
          matchedPositive = true;
        }
      } else if (criterion.requiredPolarity === 'negate') {
        // E.g. "cannot prove its own consistency" -> negated "prove consistency" is REQUIRED
        if (isNegated || /(?:cannot|never|unable|impossible|fails?\s+to|unprovable|undecidable|without)/.test(clause)) {
          matchedPositive = true;
        } else if (/(?:prov|verif|establish|guarant|certif)/.test(lowerStem)) {
          sawPolarityViolation = true;
        } else {
          matchedPositive = true;
        }
      }
    }
  }

  return {
    matched: matchedPositive,
    polarityViolation: !matchedPositive && sawPolarityViolation,
  };
}

function buildFallbackSpecFromPuzzle(puzzle: PuzzleSpec): StrictRubricSpec {
  const criteria: StrictRubricCriterionSpec[] = (puzzle.rubricCriteria ?? []).map((c) => ({
    id: c.id,
    label: c.label,
    stems: c.keywords,
    requiredPolarity: 'any',
    missingHint: `Address ${c.label.toLowerCase()} explicitly within a causal sentence.`,
  }));
  return {
    criteria,
    forbiddenClaims: [],
  };
}

export function evaluateStrictFreeResponse(
  puzzle: PuzzleSpec,
  rawAnswer: string
): StrictEvaluationResult {
  const trimmed = rawAnswer.trim();
  const normalized = cleanNormalize(trimmed);
  const words = tokenizeWords(trimmed);
  const clauses = splitClauses(trimmed);
  const spec = puzzle.strictRubricSpec ?? buildFallbackSpecFromPuzzle(puzzle);

  // Stage 1: Injection & minimum substance guard
  if (!trimmed || normalized.length < 28 || words.length < 7) {
    return {
      correct: false,
      verdict: 'Rejected (incorrect)',
      scoreRatio: 0,
      feedback:
        'Rejected (incorrect): Provide a complete explanation in connected prose (at least a full reasoning sentence) rather than a fragment.',
      weaknessDiagnosis: 'Too brief to articulate a causal mechanism.',
      matchedCriterionLabels: [],
      missingCriterionLabels: spec.criteria.map((c) => c.label),
    };
  }

  for (const rx of INJECTION_PATTERNS) {
    if (rx.test(trimmed)) {
      return {
        correct: false,
        verdict: 'Rejected (incorrect)',
        scoreRatio: 0,
        feedback:
          'Rejected (incorrect): Evaluation rules cannot be bypassed. Address the structural problem directly in your own words.',
        weaknessDiagnosis: 'Invalid meta-instruction or prompt-injection pattern detected.',
        matchedCriterionLabels: [],
        missingCriterionLabels: spec.criteria.map((c) => c.label),
      };
    }
  }

  // Stage 2: Prompt echo & keyword-stuffing gate
  if (checkPromptEcho(words, puzzle)) {
    return {
      correct: false,
      verdict: 'Rejected (incorrect)',
      scoreRatio: 0,
      feedback:
        'Rejected (incorrect): Your response largely echoes the prompt wording. Explain the causal mechanism in your own reasoning.',
      weaknessDiagnosis: 'High n-gram overlap with the prompt without original reasoning.',
      matchedCriterionLabels: [],
      missingCriterionLabels: spec.criteria.map((c) => c.label),
    };
  }

  if (isKeywordStuffed(trimmed, words, clauses, spec)) {
    return {
      correct: false,
      verdict: 'Rejected (incorrect)',
      scoreRatio: 0,
      feedback:
        'Rejected (incorrect): Connect your terms into clear causal reasoning (how and why each condition forces the outcome) instead of listing keywords.',
      weaknessDiagnosis: 'Unlinked term list without causal syntax.',
      matchedCriterionLabels: [],
      missingCriterionLabels: spec.criteria.map((c) => c.label),
    };
  }

  // Stage 3: Forbidden claims & contradictory double-hedging
  for (const claim of spec.forbiddenClaims) {
    const rx = new RegExp(claim.pattern, 'i');
    if (rx.test(normalized)) {
      return {
        correct: false,
        verdict: 'Rejected (incorrect)',
        scoreRatio: 0,
        feedback: `Rejected (incorrect): ${claim.reason}`,
        weaknessDiagnosis: claim.reason,
        matchedCriterionLabels: [],
        missingCriterionLabels: spec.criteria.map((c) => c.label),
      };
    }
  }

  if (spec.contradictionPairs) {
    for (const pair of spec.contradictionPairs) {
      const affRx = new RegExp(pair.affirmPattern, 'i');
      const negRx = new RegExp(pair.negatePattern, 'i');
      const hasAff = clauses.some((cl) => affRx.test(cl) && !negRx.test(cl));
      const hasNeg = clauses.some((cl) => negRx.test(cl));
      if (hasAff && hasNeg) {
        return {
          correct: false,
          verdict: 'Rejected (incorrect)',
          scoreRatio: 0,
          feedback: `Rejected (incorrect): Self-contradictory stance detected — ${pair.reason}`,
          weaknessDiagnosis: pair.reason,
          matchedCriterionLabels: [],
          missingCriterionLabels: spec.criteria.map((c) => c.label),
        };
      }
    }
  }

  // Stage 4: Criterion evaluation with clause polarity
  const matched: string[] = [];
  const missing: StrictRubricCriterionSpec[] = [];
  const polarityErrors: string[] = [];

  for (const criterion of spec.criteria) {
    const res = evaluateCriterionInClauses(criterion, clauses);
    if (res.matched) {
      matched.push(criterion.label);
    } else {
      missing.push(criterion);
      if (res.polarityViolation) {
        polarityErrors.push(criterion.label);
      }
    }
  }

  if (polarityErrors.length > 0 && matched.length === 0) {
    return {
      correct: false,
      verdict: 'Rejected (incorrect)',
      scoreRatio: 0,
      feedback: `Rejected (incorrect): Your reasoning inverts a governing constraint on ${polarityErrors.join(', ')}.`,
      weaknessDiagnosis: `Polarity inversion on ${polarityErrors.join(', ')}.`,
      matchedCriterionLabels: matched,
      missingCriterionLabels: missing.map((m) => m.label),
    };
  }

  // Stage 5: Causal bridge & soft flaw audit
  let bridgePassed = true;
  if (spec.causalBridgeGroups && spec.causalBridgeGroups.length >= 2) {
    bridgePassed = spec.causalBridgeGroups.every((group) =>
      group.some((stem) => normalized.includes(stem.toLowerCase()))
    );
  }

  let triggeredSoftFlaw: string | undefined;
  if (spec.softFlaws) {
    for (const flaw of spec.softFlaws) {
      if (new RegExp(flaw.pattern, 'i').test(normalized)) {
        triggeredSoftFlaw = flaw.reason;
        break;
      }
    }
  }

  const totalCriteria = Math.max(1, spec.criteria.length);
  const ratio = matched.length / totalCriteria;

  if (matched.length === 0) {
    return {
      correct: false,
      verdict: 'Rejected (incorrect)',
      scoreRatio: 0,
      feedback:
        'Rejected (incorrect): None of the core structural conditions are addressed in a valid causal form.',
      weaknessDiagnosis: 'Off-topic or misses all governing mechanisms.',
      matchedCriterionLabels: [],
      missingCriterionLabels: spec.criteria.map((c) => c.label),
    };
  }

  // Accepted requires ALL criteria matched, causal bridge intact, and no soft flaw
  if (matched.length === totalCriteria && bridgePassed && !triggeredSoftFlaw) {
    return {
      correct: true,
      verdict: 'Accepted',
      scoreRatio: 1,
      feedback: `Accepted: Coherent reasoning across all ${totalCriteria} structural requirements (${matched.join(' · ')}).`,
      matchedCriterionLabels: matched,
      missingCriterionLabels: [],
    };
  }

  // Not yet (weakness found): partial match, broken causal bridge, or soft flaw
  const gapParts: string[] = [];
  if (missing.length > 0) {
    gapParts.push(missing[0].missingHint);
  }
  if (!bridgePassed && spec.weakBridgeReason) {
    gapParts.push(spec.weakBridgeReason);
  }
  if (triggeredSoftFlaw) {
    gapParts.push(triggeredSoftFlaw);
  }

  const diagnosis = gapParts.join(' ');
  return {
    correct: false,
    verdict: 'Not yet (weakness found)',
    scoreRatio: Math.max(0.25, Math.min(0.85, ratio)),
    feedback: `Not yet (weakness found): Solid start on ${matched.join(', ')}. ${diagnosis}`,
    weaknessDiagnosis: diagnosis,
    matchedCriterionLabels: matched,
    missingCriterionLabels: missing.map((m) => m.label),
  };
}
