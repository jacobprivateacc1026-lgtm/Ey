import { DIFFICULTY_CONFIG } from './difficultyConfig';
import { evaluateStrictFreeResponse } from './strictEvaluator';
import {
  DifficultyBand,
  HintLevel,
  HintTierVariants,
  PuzzleCategory,
  PuzzleOption,
  PuzzleQualityReport,
  PuzzleSpec,
  SpatialGridConfig,
  StrictVerdict,
} from './types';

// Deterministic PRNG (Mulberry32) so procedural seeds are 100% reproducible
export function createSeededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWithRng<T>(items: T[], rng: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function normalizeAnswer(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.,;!?]+$/g, '');
}

export function serializeGrid(grid: number[][]): string {
  return grid.map((row) => row.join('')).join('|');
}

export function parseGrid(serialized: string): number[][] {
  return serialized.split('|').map((row) => row.split('').map((v) => Number(v)));
}

export function rotateGrid90CW(grid: number[][]): number[][] {
  const n = grid.length;
  const res = Array.from({ length: n }, () => Array(n).fill(0));
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      res[c][n - 1 - r] = grid[r][c];
    }
  }
  return res;
}

export function reflectGridHorizontal(grid: number[][]): number[][] {
  return grid.map((row) => [...row].reverse());
}

export interface AnswerVerificationResult {
  correct: boolean;
  scoreRatio: number; // 0 to 1 (useful for open-ended rubric puzzles)
  feedback: string;
  verdict?: StrictVerdict;
  weaknessDiagnosis?: string;
  matchedCriterionLabels?: string[];
}

export function verifyPuzzleAnswer(puzzle: PuzzleSpec, rawAnswer: string): AnswerVerificationResult {
  if (puzzle.interactionType === 'rubric_synthesis' && (puzzle.strictRubricSpec || puzzle.rubricCriteria)) {
    const strict = evaluateStrictFreeResponse(puzzle, rawAnswer);
    return {
      correct: strict.correct,
      verdict: strict.verdict,
      scoreRatio: strict.scoreRatio,
      feedback: strict.feedback,
      weaknessDiagnosis: strict.weaknessDiagnosis,
      matchedCriterionLabels: strict.matchedCriterionLabels,
    };
  }

  if (puzzle.interactionType === 'spatial_grid') {
    const cleanSubmitted = rawAnswer.trim();
    const matched = puzzle.validSolutions.some((sol) => sol === cleanSubmitted);
    return {
      correct: matched,
      scoreRatio: matched ? 1 : 0,
      feedback: matched
        ? 'Spatial configuration matches the invariant target lattice.'
        : 'The lattice configuration does not satisfy the target transformation law.',
    };
  }

  if (puzzle.interactionType === 'multi_select') {
    const normSub = rawAnswer
      .split(',')
      .map((s) => normalizeAnswer(s))
      .filter(Boolean)
      .sort()
      .join(',');
    const matched = puzzle.validSolutions.some((sol) => {
      const normSol = sol
        .split(',')
        .map((s) => normalizeAnswer(s))
        .filter(Boolean)
        .sort()
        .join(',');
      return normSol === normSub;
    });
    return {
      correct: matched,
      scoreRatio: matched ? 1 : 0,
      feedback: matched
        ? 'Selected set satisfies every joint constraint.'
        : 'The selected combination violates at least one boundary condition.',
    };
  }

  const normalized = normalizeAnswer(rawAnswer);
  if (!normalized) {
    return {
      correct: false,
      scoreRatio: 0,
      feedback: 'Enter or select a candidate solution before submitting.',
    };
  }

  const matched = puzzle.validSolutions.some((sol) => normalizeAnswer(sol) === normalized);
  return {
    correct: matched,
    scoreRatio: matched ? 1 : 0,
    feedback: matched
      ? 'Solution verified against all governing constraints.'
      : 'Candidate does not hold against every constraint. Re-examine your evidence before trying again.',
  };
}

export function buildPuzzleSignature(puzzle: PuzzleSpec): string {
  return `${puzzle.category}::${puzzle.interactionType}::${puzzle.promptBody.slice(0, 80)}::${puzzle.validSolutions.join('|')}`;
}

const HINT_LEAK_REGEX =
  /\b(?:solution:|model answer:|answer:|select option|choose option|option [1-4]\b|pick the (?:first|second|third|fourth) option)\b/i;

export function validatePuzzleQuality(
  puzzle: PuzzleSpec,
  existingSignatures: Set<string> = new Set()
): PuzzleQualityReport {
  const errors: string[] = [];
  const hasObjective = Boolean(puzzle.objective && puzzle.objective.trim().length >= 8);
  if (!hasObjective) errors.push('Missing clear objective');

  const hasConsistentRules =
    Boolean(puzzle.instructions) && Array.isArray(puzzle.rules) && puzzle.rules.length > 0;
  if (!hasConsistentRules) errors.push('Missing instructions or explicit rules');

  let solutionVerified = puzzle.validSolutions.length > 0;
  if (puzzle.interactionType !== 'rubric_synthesis') {
    for (const sol of puzzle.validSolutions) {
      const check = verifyPuzzleAnswer(puzzle, sol);
      if (!check.correct) {
        solutionVerified = false;
        errors.push(`Declared solution "${sol}" failed self-verification`);
      }
    }
  } else {
    solutionVerified = Boolean(puzzle.rubricCriteria && puzzle.rubricCriteria.length >= 2);
    if (!solutionVerified) errors.push('Rubric synthesis puzzle lacks criteria');
  }

  // Hint cap and anti-leak checks: strictly levels 1..3 present, no level > 3, no direct spoilers
  let hintsConsistent = true;
  const hintRecord = puzzle.hints as Record<number, HintTierVariants | undefined>;
  const extraHintKeys = Object.keys(hintRecord).filter((k) => Number(k) > 3 || Number(k) < 1);
  if (extraHintKeys.length > 0) {
    hintsConsistent = false;
    errors.push(`Hints exceed 3-tier cap: unexpected tiers [${extraHintKeys.join(', ')}]`);
  }

  for (let lvl = 1 as Exclude<HintLevel, 0>; lvl <= 3; lvl = (lvl + 1) as Exclude<HintLevel, 0>) {
    const h = puzzle.hints[lvl];
    if (!h || !h.low || !h.moderate || !h.high || !h.transcendent) {
      hintsConsistent = false;
      errors.push(`Incomplete intelligence tiers at hint level ${lvl}`);
      continue;
    }
    const variants = [h.low, h.moderate, h.high, h.transcendent];
    for (const v of variants) {
      if (HINT_LEAK_REGEX.test(v)) {
        hintsConsistent = false;
        errors.push(`Hint level ${lvl} leaks explicit answer phrasing: "${v.slice(0, 60)}"`);
      }
      if (puzzle.options && puzzle.validSolutions[0] && puzzle.validSolutions[0].length >= 4) {
        const solLower = puzzle.validSolutions[0].toLowerCase();
        if (v.toLowerCase().includes(solLower)) {
          hintsConsistent = false;
          errors.push(`Hint level ${lvl} leaks option id "${puzzle.validSolutions[0]}"`);
        }
      }
    }
  }

  const signature = buildPuzzleSignature(puzzle);
  const noDuplicateSignature = !existingSignatures.has(signature);
  if (!noDuplicateSignature) errors.push('Duplicate puzzle signature detected');

  const estimatedDifficulty = Math.min(
    100,
    Math.max(
      10,
      Math.round(
        puzzle.difficultyScore * 0.7 +
          puzzle.rules.length * 4 +
          puzzle.relevantAttributes.length * 3
      )
    )
  );

  return {
    isValid:
      hasObjective &&
      hasConsistentRules &&
      solutionVerified &&
      hintsConsistent &&
      noDuplicateSignature,
    signature,
    estimatedDifficulty,
    checks: {
      hasObjective,
      hasConsistentRules,
      solutionVerified,
      hintsConsistent,
      noDuplicateSignature,
    },
    errors,
  };
}

function makeTierHints(
  low: string,
  moderate: string,
  high: string,
  transcendent: string
): HintTierVariants {
  return { low, moderate, high, transcendent };
}

function difficultyBandFromScore(score: number): DifficultyBand {
  if (score < 28) return 'Foundational';
  if (score < 45) return 'Intermediate';
  if (score < 62) return 'Advanced';
  if (score < 78) return 'Expert';
  if (score < 90) return 'Extremely Advanced';
  return 'Endgame';
}

// ============================================================================
// HANDCRAFTED CANONICAL PUZZLES (Stages I - VI)
// ============================================================================

export const CANONICAL_PUZZLES: Record<string, PuzzleSpec> = {
  // STAGE I: THE FOUNDATIONAL UNIVERSE
  's1_axiom_spire_1': {
    id: 's1_axiom_spire_1',
    title: 'The Euclidean Cadence',
    universeId: 'stage_1',
    regionId: 'r1_euclidean_spire',
    stageNumber: 1,
    modeKey: 'stage_1',
    narrative: {
      context: 'The Threshold Resonance Pillar at the foot of the Euclidean Spire governs atmospheric stability across Stage I.',
      intro: 'Jacob steps onto the basalt causeway. Five bronze tuning plates hum in sequence while the sixth plate sits dark, holding the lift gates shut.',
      investigationClues: [
        {
          id: 'clue_s1_1_engraving',
          title: 'Builder’s Stela Fragment',
          source: 'Spire Base Inscription',
          body: 'Foundational Masons never relied on constant increments when stone arches climbed smoothly; they balanced curvature across neighboring intervals.',
        },
      ],
      consequences: 'Restoring the sixth tone engages the astrolabe lift and attunes Jacob to the Foundational Builders’ harmonic architecture.',
      storyEventId: 'story_s1_spire_awakened',
      storyEventTitle: 'Awakening the Euclidean Spire',
      linkedArchiveIds: ['arch_finite_differences'],
      linkedDiscoveryIds: ['disc_spire_inscription'],
    },
    category: 'mathematical',
    difficulty: 'Foundational',
    difficultyScore: 22,
    relevantAttributes: ['pattern_recognition', 'analytical'],
    interactionType: 'numeric_input',
    objective: 'Determine the missing 6th resonance frequency on the Spire dial.',
    instructions: 'Inspect the tuning plates and builder plaques below, then enter the integer frequency that completes the sequence.',
    rules: [
      'A single low-degree integer progression governs all six plates.',
      'Exclude environmental telemetry unrelated to the harmonic plates.',
    ],
    promptBody:
      'Five carved plates chime along the causeway: 3, 7, 13, 21, 31. Check the plinth records below and enter the sixth frequency.',
    sceneObjects: [
      {
        id: 'obj_spire_plates',
        label: 'Basalt Tuning Plates I–V',
        locationNote: 'Causeway Rail',
        kindTag: 'Acoustic Array',
        observation: 'Measured plate pitches read 3, 7, 13, 21, and 31 Hz in ascending slot order.',
      },
      {
        id: 'obj_spire_wind_vane',
        label: 'Causeway Draft Meter',
        locationNote: 'East Balustrade',
        kindTag: 'Weather Sensor',
        observation: 'Ambient spire wind pressure reads 14 Pa steady from the northwest.',
      },
    ],
    documents: [
      {
        id: 'doc_spire_plaque',
        title: 'Euclidean Mason Margin',
        source: 'Threshold Plinth',
        reliabilityNote: 'Primary quarry specification',
        excerpt: 'When steps grow wider at each arch, check whether the change between intervals settles before committing to a constant multiplier.',
      },
    ],
    visualData: {
      sequence: [3, 7, 13, 21, 31, '?'],
    },
    workspaceMode: 'rule_shift',
    workspaceData: {
      mode: 'rule_shift',
      headline: 'Spire Plate Register · Interval Inspection',
      leftColumnTitle: 'Active Tuning Slots',
      leftItems: ['Plate 1: 3', 'Plate 2: 7', 'Plate 3: 13', 'Plate 4: 21', 'Plate 5: 31', 'Plate 6: ?'],
      rightColumnTitle: 'Method Check',
      rightItems: ['Measure consecutive jumps', 'Inspect whether jump differences hold steady', 'Verify candidate on Plate 1→5'],
      tacticalNote: 'When first gaps keep moving, examine the rate at which the gaps themselves change.',
    },
    validSolutions: ['43'],
    defaultErrorPattern: 'obvious_reading',
    explanation:
      'First differences between adjacent terms are 4, 6, 8, 10—rising by +2 each step (second-order finite difference = 2, matching n² + n + 1). Extending the next step (+12) from 31 yields 43.',
    postSolvePrompt: {
      question: 'Why did checking a second difference succeed where looking for a single multiplier failed?',
      patternPrompt: 'Where else might environmental readings (like wind pressure) masquerade as sequence inputs?',
      takeaway: 'Tabulate differences layer by layer before testing a polynomial or recurrence.',
    },
    cognitiveTools: {
      decomposition: [
        'Record the jump between each adjacent pair of plates.',
        'Check whether the jumps themselves grow by a uniform offset.',
      ],
      dependencyMapping: ['Plate n + 1 depends on Plate n plus an arithmetic shift.'],
      anomalyHighlight: 'Growth accelerates smoothly rather than staying linear or multiplying cleanly.',
      symbolicTranslation: 'a(n) - a(n-1) = f(n); check Δ²a(n).',
      alternativeHypotheses: [
        'Compare a polynomial law against a shifted multiplicative rule on Plates 1–5.',
      ],
    },
    hints: {
      1: makeTierHints(
        'Watch how much the frequency rises between each consecutive pair of plates rather than testing multiplication first.',
        'Compute the gap between adjacent plates and check whether those gaps follow a steady progression.',
        'Examine discrete first differences Δa(n) across the first five plates.',
        'Evaluate the second-order finite difference behavior across the sequence.'
      ),
      2: makeTierHints(
        'Write down the four gaps between the five plates side by side and ask what connects the gaps themselves.',
        'Compare how each gap changes from one pair to the next rather than averaging them.',
        'Check whether Δ²a(n) settles to an invariant constant across all five terms.',
        'Verify whether a degree-2 polynomial fits all five observed points simultaneously.'
      ),
      3: makeTierHints(
        'Once you have the pattern of the gaps, extend one more gap past 31—and check whether a quadratic formula n² + n + 1 agrees across Plates 1 to 5.',
        'Extrapolate the next first difference from the constant second difference and apply it to Plate 5.',
        'Bridge finite-difference extrapolation with closed-form quadratic verification before submitting.',
        'Confirm convergence between Δ² invariance and quadratic interpolation at n = 6.'
      ),
    },
    hintSpeakers: {
      1: 'Ilya (Echoed Margin)',
      2: 'Jacob (Bench Note)',
      3: 'Builder Stela',
    },
    rewards: { xp: 45, ip: 18, kp: 8 },
  },

  's1_euclidean_symmetry': {
    id: 's1_euclidean_symmetry',
    title: 'Mirror of the Orthogonal Gate',
    universeId: 'stage_1',
    regionId: 'r1_euclidean_spire',
    stageNumber: 1,
    modeKey: 'stage_1',
    narrative: {
      context: 'The Orthogonal Gate seals the upper bridge connecting the Spire to the Conservatory.',
      intro: 'A carved stone monolith jammed mid-turn along its iron track. Jacob must align the counter-lattice to the slab’s rotated orientation before the counterweights release.',
      investigationClues: [
        {
          id: 'clue_s1_2_pivot',
          title: 'Pivot Bearing Wear',
          source: 'Monolith Axis',
          body: 'Circular score marks along the stone collar confirm pure clockwise quarter-turn travel without flipping the slab.',
        },
      ],
      consequences: 'The stone bridge extends smoothly, revealing pathways toward the Arithmetic Conservatory and an unstable procedural rift.',
      storyEventId: 'story_s1_gate_aligned',
      storyEventTitle: 'Alignment of the Orthogonal Bridge',
      linkedDiscoveryIds: ['disc_spire_chamber'],
    },
    category: 'spatial',
    difficulty: 'Foundational',
    difficultyScore: 25,
    relevantAttributes: ['spatial', 'working_memory'],
    interactionType: 'spatial_grid',
    objective: 'Construct the 90° clockwise rotation of the source 3×3 glyph on the interactive lattice.',
    instructions: 'Toggle cells in the interactive lattice until they represent the source glyph turned one quarter-turn clockwise.',
    rules: [
      'A 90° clockwise rotation maps (row r, col c) to (col c, N - 1 - row r).',
      'No reflections, inversions, or cell additions are permitted.',
    ],
    promptBody:
      'The Orthogonal Gate carries a carved 3×3 sigil on its jammed counterweight. Trace its 90° clockwise turn onto the target lattice.',
    sceneObjects: [
      {
        id: 'obj_monolith_collar',
        label: 'Monolith Pivot Collar',
        locationNote: 'Center Axle',
        kindTag: 'Bearing Ring',
        observation: 'Pin stops permit quarter-turn rotation clockwise only; axial flip pins remain welded shut.',
      },
      {
        id: 'obj_anchor_count',
        label: 'Chiseled Tile Tally',
        locationNote: 'Frame Rim',
        kindTag: 'Masonry Stamp',
        observation: 'Target lock requires conservation of total active stone tiles across rotation.',
      },
    ],
    visualData: {
      spatialGrid: {
        size: 3,
        initialGrid: [
          [1, 1, 0],
          [1, 0, 0],
          [0, 1, 1],
        ],
        targetPattern: [
          [0, 1, 1],
          [1, 0, 1],
          [1, 0, 0],
        ],
        ruleSummary: 'Rotate Source 90° Clockwise',
        allowRotation: false,
      },
    },
    validSolutions: ['011|101|100'],
    defaultErrorPattern: 'assumed_untested',
    explanation:
      'Rotating 90° clockwise carries the top row [1,1,0] into the right column (top-to-bottom), the middle row [1,0,0] into the center column, and the bottom row [0,1,1] into the left column—yielding [0,1,1] / [1,0,1] / [1,0,0].',
    postSolvePrompt: {
      question: 'Why does reversing rows vertically produce a reflection rather than a 90° turn?',
      patternPrompt: 'Which corner anchor lets you verify rotation direction in two seconds?',
      takeaway: 'Track one asymmetric corner or edge orbit first; never confuse transposition with rotation.',
    },
    cognitiveTools: {
      decomposition: [
        'Track one source row at a time: Top Row -> Right Column.',
        'Middle Row -> Middle Column (top to bottom).',
        'Bottom Row -> Left Column (top to bottom).',
      ],
      dependencyMapping: ['Rotation preserves total active count and center occupancy.'],
      anomalyHighlight: 'A pure transpose without column reversal yields a diagonal reflection, not a clockwise turn.',
      symbolicTranslation: 'T(r, c) = (c, N - 1 - r).',
      alternativeHypotheses: ['Verify whether transpose + horizontal flip differs from transpose + vertical flip.'],
    },
    hints: {
      1: makeTierHints(
        'Watch where the top edge of the source grid lands when you turn the square one quarter-turn to the right.',
        'Track an asymmetric corner cell rather than trying to rotate all nine squares at once.',
        'Remember that clockwise rotation maps rows directly into columns in reversed horizontal order.',
        'Apply the dihedral map (r, c) ↦ (c, N - 1 - r) while preserving active cell count.'
      ),
      2: makeTierHints(
        'Top row becomes the rightmost column from top to bottom; bottom row becomes the leftmost column.',
        'Check your middle row separately: a cell in the center-left rotates into the top-middle.',
        'Decompose into transpose followed by horizontal row reversal.',
        'Verify corner orbits and edge midpoints independently around the center.'
      ),
      3: makeTierHints(
        'Confirm three invariants before submitting: same count of active tiles, corners shifted clockwise once, and no accidental mirror flip.',
        'Verify each column of your target top-to-bottom against the corresponding row of the source.',
        'Cross-check every source cell via T(r, c) = (c, 2 - r).',
        'Audit corner orbit closure and active-tile conservation.'
      ),
    },
    hintSpeakers: {
      1: 'Jacob (Margin Note)',
      2: 'Ilya (Echoed Ledger)',
      3: 'Jacob (Drafting Check)',
    },
    rewards: { xp: 55, ip: 20, kp: 10 },
  },

  's1_conservatory_logic': {
    id: 's1_conservatory_logic',
    title: 'Triad of the Conservatory',
    universeId: 'stage_1',
    regionId: 'r2_arithmetic_conservatory',
    stageNumber: 1,
    modeKey: 'stage_1',
    narrative: {
      context: 'Scholars of the Arithmetic Conservatory sealed their harmonic key inside three obsidian pillars built to punish hasty assumptions.',
      intro: 'Three bronze plaques gleam under dust in the hall. One pillar holds the key, and Conservatory law insists exactly one plaque speaks truth.',
      investigationClues: [
        {
          id: 'clue_s1_3_protocol',
          title: 'Conservatory Seal Protocol',
          source: 'Bronze Plaque Header',
          body: 'Door wardens enforced a strict quota: one true inscription, two false inscriptions, one key.',
        },
      ],
      consequences: 'Recovering the Harmonic Key opens the stairwell toward the Observatory of First Causes.',
      storyEventId: 'story_s1_conservatory_key',
      storyEventTitle: 'Key of the Arithmetic Conservatory',
      linkedArchiveIds: ['arch_bivalent_pairs'],
      linkedDiscoveryIds: ['disc_conservatory_archive'],
    },
    category: 'formal_logic',
    difficulty: 'Foundational',
    difficultyScore: 28,
    relevantAttributes: ['analytical', 'linguistic'],
    interactionType: 'multiple_choice',
    objective: 'Identify which pillar holds the Harmonic Key based on the inscribed plaques.',
    instructions: 'Inspect each plaque and verify truth counts across all three possible locations. Exactly ONE plaque is TRUE and ONE pillar holds the Key.',
    rules: [
      'Exactly ONE of Pillars {Alpha, Beta, Gamma} holds the Key.',
      'Exactly ONE of the three bronze inscriptions is TRUE; two are FALSE.',
    ],
    promptBody:
      'Three pillars stand across the Conservatory hall. Examine the three plaques and determine which pillar conceals the key.',
    sceneObjects: [
      {
        id: 'obj_plaque_alpha',
        label: 'Plaque on Alpha',
        locationNote: 'West Pillar',
        kindTag: 'Inscription',
        observation: '"The Key is inside Alpha."',
      },
      {
        id: 'obj_plaque_beta',
        label: 'Plaque on Beta',
        locationNote: 'Center Pillar',
        kindTag: 'Inscription',
        observation: '"The Key is NOT inside Beta."',
      },
      {
        id: 'obj_plaque_gamma',
        label: 'Plaque on Gamma',
        locationNote: 'East Pillar',
        kindTag: 'Inscription',
        observation: '"The Key is NOT inside Alpha."',
      },
    ],
    documents: [
      {
        id: 'doc_conservatory_edict',
        title: 'Conservatory Gate Rubric',
        source: 'Threshold Arch',
        reliabilityNote: 'Engraved governing rule',
        excerpt: 'Exactly one vault houses the key, and the total count of truthful plaques across all three pillars equals one.',
      },
    ],
    visualData: {
      premises: [
        'Alpha: "The Key is in Alpha."',
        'Beta: "The Key is NOT in Beta."',
        'Gamma: "The Key is NOT in Alpha."',
        'Quota: Exactly 1 pillar holds the Key; exactly 1 plaque is true.',
      ],
    },
    workspaceMode: 'social_reading',
    workspaceData: {
      mode: 'social_reading',
      headline: 'Three-Pillar Truth Quota Matrix',
      rows: [
        { label: 'Test Alpha = Holder', primary: 'Evaluate Alpha, Beta, Gamma', secondary: 'Count total TRUE plaques' },
        { label: 'Test Beta = Holder', primary: 'Evaluate Alpha, Beta, Gamma', secondary: 'Count total TRUE plaques' },
        { label: 'Test Gamma = Holder', primary: 'Evaluate Alpha, Beta, Gamma', secondary: 'Count total TRUE plaques' },
      ],
      tacticalNote: 'Watch for claims that form a strict negation pair over the same pillar.',
    },
    options: [
      { id: 'gamma', label: 'Pillar Gamma', detail: 'Places key inside Gamma', exploitedPattern: 'ignored_detail' },
      { id: 'alpha', label: 'Pillar Alpha', detail: 'Places key inside Alpha', exploitedPattern: 'obvious_reading' },
      { id: 'beta', label: 'Pillar Beta', detail: 'Places key inside Beta' },
    ],
    validSolutions: ['beta'],
    defaultErrorPattern: 'obvious_reading',
    explanation:
      'Alpha ("in Alpha") and Gamma ("not in Alpha") are direct negations: regardless of where the key sits, one is true and one is false, spending the single-truth quota. Beta ("not in Beta") must therefore be false, placing the key in Beta (Alpha=F, Beta=F, Gamma=T -> 1 true).',
    postSolvePrompt: {
      question: 'Why did pairing Alpha and Gamma resolve Beta without needing to guess?',
      patternPrompt: 'What happens if you only look at one speaker telling the truth without checking the quota on the other two?',
      takeaway: 'Exhaustive contradiction pairs {P, ¬P} automatically consume one unit of a fixed truth quota.',
    },
    cognitiveTools: {
      decomposition: [
        'Build a 3-row truth table over candidate locations {Alpha, Beta, Gamma}.',
        'Count how many plaques evaluate true in each row.',
      ],
      dependencyMapping: ['Compare any two plaques making opposite claims about the same pillar.'],
      anomalyHighlight: 'Negated assertions about the same subject cannot both be false or both be true under bivalence.',
      symbolicTranslation: '∑ Truth_i = 1 across {K=A, K≠B, K≠A}.',
      alternativeHypotheses: ['Check whether assuming one plaque truthful leaves zero contradictions across the other two.'],
    },
    hints: {
      1: makeTierHints(
        'Compare what the three plaques refer to—two of them talk about the exact same pillar from opposite sides.',
        'Look for a pair of assertions that cannot both be true and cannot both be false.',
        'Notice the truth-quota constraint alongside classical excluded middle on Alpha.',
        'Evaluate ∑ T_i = 1 by isolating mutually negating statements first.'
      ),
      2: makeTierHints(
        'Test each pillar one at a time and count how many of the three plaques come out true under that world.',
        'Remember: if a complementary pair uses up your single TRUE slot, what does that require of the remaining plaque?',
        'Partition the three inscriptions into {contradictory pair} and {residual claim}.',
        'Check what falsifying the residual claim entails.'
      ),
      3: makeTierHints(
        'Check all three rows carefully—two candidates yield 2 true statements, breaking the quota, leaving only one consistent model.',
        'Negate the false residual statement cleanly and verify that the resulting truth count equals 1.',
        'Verify your candidate across all three inscriptions: count must equal 1 True, 2 False.',
        'Confirm uniqueness of the T=1 assignment across {A, B, G}.'
      ),
    },
    hintSpeakers: {
      1: 'Ilya (Echoed Margin)',
      2: 'Conservatory Ledger',
      3: 'Jacob (Bench Check)',
    },
    rewards: { xp: 55, ip: 22, kp: 12 },
  },

  's1_observatory_science': {
    id: 's1_observatory_science',
    title: 'Pendulum of Variable Gravity',
    universeId: 'stage_1',
    regionId: 'r3_first_causes',
    stageNumber: 1,
    modeKey: 'stage_1',
    narrative: {
      context: 'High above the Foundational abyss, the Observatory calibrates gravity chambers for vessels crossing neighboring realities.',
      intro: 'Jacob inspects three brass trial logs bolted beside a swinging fourth chamber. Counterweights, barometers, and tether notches clutter the wall.',
      investigationClues: [
        {
          id: 'clue_s1_4_margin',
          title: 'Observatory Logbook Margin',
          source: 'Brass Register',
          body: 'An earlier calibrator noted that heavy bobs and light bobs keep identical rhythm whenever tether and pull remain untouched.',
        },
      ],
      consequences: 'Calibrating Chamber IV stabilizes the Observatory beacon—recording an invariance principle Jacob will need again in Stage II’s Vaelori ruins.',
      storyEventId: 'story_s1_observatory_calibrated',
      storyEventTitle: 'Observatory Pendulum Calibration',
      linkedDiscoveryIds: ['disc_obs_artifact'],
    },
    category: 'scientific',
    difficulty: 'Intermediate',
    difficultyScore: 34,
    relevantAttributes: ['analytical', 'pattern_recognition', 'abstract'],
    interactionType: 'numeric_input',
    objective: 'Predict the oscillation period T (in seconds) of Chamber IV from the brass trial logs.',
    instructions: 'Inspect the three experimental chambers and wall gauges below, isolate which parameters govern T, and enter the integer period for Chamber IV.',
    rules: [
      'A consistent physical law relates active chamber parameters to period T.',
      'Not every recorded measurement necessarily enters the law.',
    ],
    promptBody:
      'Chamber IV sits uncalibrated at L = 100 m, M = 7 kg, g = 4 m/s². Inspect the prior chamber plates and deduce its period T (s).',
    sceneObjects: [
      {
        id: 'obj_trial_1_plate',
        label: 'Chamber I Brass Plate',
        locationNote: 'North Pillar',
        kindTag: 'Trial Log',
        observation: 'L = 4 m, M = 2 kg, g = 1 m/s² → Period T = 2 s.',
      },
      {
        id: 'obj_trial_2_plate',
        label: 'Chamber II Brass Plate',
        locationNote: 'Center Pillar',
        kindTag: 'Trial Log',
        observation: 'L = 16 m, M = 5 kg, g = 1 m/s² → Period T = 4 s.',
      },
      {
        id: 'obj_trial_3_plate',
        label: 'Chamber III Brass Plate',
        locationNote: 'South Pillar',
        kindTag: 'Trial Log',
        observation: 'L = 36 m, M = 10 kg, g = 4 m/s² → Period T = 3 s.',
      },
      {
        id: 'obj_barometer_dial',
        label: 'Corridor Barometer',
        locationNote: 'Gallery Arch',
        kindTag: 'Ambient Gauge',
        observation: 'Chamber atmosphere steady at 101 kPa across all four runs.',
      },
    ],
    documents: [
      {
        id: 'doc_calib_note',
        title: 'Calibration Protocol Slip',
        source: 'Brass Bench',
        reliabilityNote: 'Archival engineering log',
        excerpt: 'Compare pairs that hold local gravity g constant first before trying to account for Chamber III.',
      },
    ],
    visualData: {
      equations: [
        'Chamber I:   L = 4,   M = 2,  g = 1  →  T = 2',
        'Chamber II:  L = 16,  M = 5,  g = 1  →  T = 4',
        'Chamber III: L = 36,  M = 10, g = 4  →  T = 3',
        'Chamber IV:  L = 100, M = 7,  g = 4  →  T = ?',
      ],
    },
    workspaceMode: 'tactical_shift',
    workspaceData: {
      mode: 'tactical_shift',
      headline: 'Chamber Variable Register · Parameter Isolation',
      rows: [
        { label: 'Varying Length (Chambers I vs II)', primary: 'g = 1 held constant', secondary: 'Compare L, M, and T shifts' },
        { label: 'Varying Gravity (Chamber III)', primary: 'g = 4 introduced', secondary: 'Compare scaling relative to Chamber I/II' },
        { label: 'Chamber IV Target', primary: 'L = 100, M = 7, g = 4', secondary: 'Verify model across all three logs first' },
      ],
      tacticalNote: 'Not every recorded gauge sits on a causal wire; verify each variable against controlled pairs.',
    },
    validSolutions: ['5'],
    defaultErrorPattern: 'assumed_untested',
    explanation:
      'Comparing Chambers I and II (g = 1 held steady), multiplying L by 4 doubles T even while mass M changes 2 → 5—matching T = √(L/g) with zero dependence on mass M. Checking Chamber III confirms √(36/4) = 3 s. Chamber IV gives √(100/4) = 5 s.',
    postSolvePrompt: {
      question: 'How did comparing Chambers I and II rule out bob mass M as a primary driver?',
      patternPrompt: 'Why do decorative or passive measurements often sit alongside real causal variables in field logs?',
      takeaway: 'Hold one parameter steady while varying another to strip out inert distractors before fitting a law.',
    },
    cognitiveTools: {
      decomposition: [
        'Compare Chambers I and II where g remains equal.',
        'Check how increasing g affects T in Chamber III.',
        'Test whether M contributes any consistent residual.',
      ],
      dependencyMapping: ['Isolate active causal variables from inert measurements.'],
      anomalyHighlight: 'Lengths and gravity numbers across all four runs are clean squares.',
      symbolicTranslation: 'T = k · L^a · M^b · g^c.',
      alternativeHypotheses: [
        'Test linear ratio L/M against Chamber II before trusting mass.',
      ],
    },
    hints: {
      1: makeTierHints(
        'Compare Chamber I and Chamber II first—notice gravity stays fixed while two other numbers change.',
        'Look at the numerical type shared by every length L and gravity reading g across all chambers.',
        'Test controlled pairs to isolate ∂T/∂L before factoring in Chamber III’s change in g.',
        'Examine power-law exponents (a, b, c) for L, M, and g using rational square-root scaling.'
      ),
      2: makeTierHints(
        'Check whether mass M explains any change between Chambers I, II, and III—or whether square roots of L and g already account for everything.',
        'Once you know how T scales with L at g = 1, compare Chamber III against what T would be if g stayed 1.',
        'Fit T = k · L^α · g^γ and test whether any residual remains for mass M.',
        'Check dimensional invariance of L/g relative to T².'
      ),
      3: makeTierHints(
        'Test your proposed law on all three brass plates (I, II, III) before applying it to L = 100 and g = 4.',
        'Verify that your ratio of L and g produces exact integers for Chambers I–III and apply the same relation to Chamber IV.',
        'Confirm T² · g / L invariance across Chambers I–III, then evaluate Chamber IV.',
        'Evaluate the verified power law at (L=100, M=7, g=4).'
      ),
    },
    hintSpeakers: {
      1: 'Observatory Register',
      2: 'Jacob (Bench Check)',
      3: 'Ilya (Echoed Note)',
    },
    rewards: { xp: 65, ip: 25, kp: 15 },
  },

  // STAGE II: THE FRACTURED UNIVERSES
  's2_causal_fork': {
    id: 's2_causal_fork',
    title: 'The Bifurcated Chronometer',
    universeId: 'stage_2',
    regionId: 'r4_causal_bifurcation',
    stageNumber: 2,
    modeKey: 'stage_2',
    narrative: {
      context: 'Entering Stage II breaks Euclidean locality: conduits remember which relay a traveler crossed prior.',
      intro: 'The Loomwrights’ bridge splits across a temporal eddy. Taking the shortest visible opening surges Relay B’s downstream impedance.',
      investigationClues: [
        {
          id: 'clue_s2_1_loomwright',
          title: 'Loomwright Conduit Gauge',
          source: 'Relay A Console',
          body: 'Discharge marks show Stabilizer C vents residual impedance on Relay B before B→D engages.',
        },
      ],
      consequences: 'Synchronizing Node D stabilizes the Stage II landing platform, opening paths toward both the Probabilistic Archipelago and the silent Ruins of the Vaelori.',
      storyEventId: 'story_s2_chronometer_synced',
      storyEventTitle: 'Synchronization of Causal Forks',
      linkedDiscoveryIds: ['disc_s2_fork'],
    },
    category: 'strategic',
    difficulty: 'Intermediate',
    difficultyScore: 44,
    relevantAttributes: ['working_memory', 'processing_efficiency', 'analytical'],
    interactionType: 'numeric_input',
    objective: 'Find the minimum total relay cycles required to reach Node D from Node A.',
    instructions: 'Inspect every edge and conditional modifier below, evaluate all simple paths A→D, and enter the minimum integer cycle total.',
    rules: [
      'Paths must start at Node A and end at Node D.',
      'A→B costs 2, B→D costs 6 (doubled to 12 if entered directly from A without passing C).',
      'A→C costs 3, C→B costs 1 (stabilizes B), C→D costs 7.',
    ],
    promptBody:
      'In the Fractured Universes, conduit delays mutate based on prior route history. Determine the minimum valid cycles from Node A to Node D.',
    sceneObjects: [
      {
        id: 'obj_relay_b_coil',
        label: 'Relay B Impedance Coil',
        locationNote: 'Center Arch',
        kindTag: 'Conduit Node',
        observation: 'Direct incoming charge from A trips the doubler circuit on outgoing edge B→D.',
      },
      {
        id: 'obj_stabilizer_c',
        label: 'Stabilizer C Grounding Rod',
        locationNote: 'Lower Spur',
        kindTag: 'Damper Relay',
        observation: 'Routing A→C bleeds excess phase before reaching B, holding B→D at nominal base delay.',
      },
    ],
    visualData: {
      diagramNodes: [
        { id: 'A', label: 'Origin A' },
        { id: 'B', label: 'Relay B (History-sensitive)' },
        { id: 'C', label: 'Stabilizer C' },
        { id: 'D', label: 'Target D' },
      ],
      diagramEdges: [
        { from: 'A', to: 'B', relation: '2 cycles (leaves B unstable)' },
        { from: 'B', to: 'D', relation: '6 cycles (12 if unstable)' },
        { from: 'A', to: 'C', relation: '3 cycles' },
        { from: 'C', to: 'B', relation: '1 cycle (stabilizes B)' },
        { from: 'C', to: 'D', relation: '7 cycles' },
      ],
    },
    workspaceMode: 'war_table',
    workspaceData: {
      mode: 'war_table',
      headline: 'Conduit Graph · Simple Path Evaluation',
      rows: [
        { label: 'Direct Opening (A → B → D)', primary: 'Check B stability flag', secondary: 'Compute full path delay' },
        { label: 'Bypass Route (A → C → D)', primary: 'Skips Relay B entirely', secondary: 'Compute full path delay' },
        { label: 'Stabilized Detour (A → C → B → D)', primary: 'Passes C before B', secondary: 'Compute full path delay' },
      ],
      tacticalNote: 'Locally cheap openings can trigger downstream penalties unless neutralized earlier in the sequence.',
    },
    validSolutions: ['10'],
    defaultErrorPattern: 'obvious_reading',
    explanation:
      'Evaluating all three valid routes: A→B→D triggers the instability penalty (2 + 12 = 14); A→C→D costs 3 + 7 = 10; A→C→B→D stabilizes B via C and costs 3 + 1 + 6 = 10. Both routes through C achieve the minimum of 10 cycles.',
    multipleSolutionsNote: 'Two distinct routes (A→C→D and A→C→B→D) tie for the 10-cycle minimum.',
    postSolvePrompt: {
      question: 'Why did the shortest initial step A→B produce the worst total route?',
      patternPrompt: 'In adversarial or stateful systems, what mistake happens when optimizing step 1 greedily?',
      takeaway: 'Track state flags carried forward along paths instead of minimizing local edge weights in isolation.',
    },
    cognitiveTools: {
      decomposition: [
        'List every valid simple path from A to D.',
        'Evaluate the B→D delay using each path’s state flag.',
      ],
      dependencyMapping: ['Edge weight B→D depends on whether Node C precedes Node B.'],
      anomalyHighlight: 'The lowest initial edge weight triggers an upstream penalty on the next hop.',
      symbolicTranslation: 'State = (Node, c_visited ∈ {0,1}).',
      alternativeHypotheses: ['Compare bypassing B completely against paying the C→B stabilization detour.'],
    },
    hints: {
      1: makeTierHints(
        'Do not stop after looking at the smallest number leaving Node A—check what penalty activates on the next jump.',
        'List all simple paths from A to D and mark which ones visit C before B.',
        'Represent the graph as a state-augmented shortest path with State = (Node, C_visited).',
        'Compare all history-dependent paths from A to D before picking the smallest total.'
      ),
      2: makeTierHints(
        'Compare the route going straight through B with both routes passing through C first.',
        'Verify the cost of B→D separately for direct entry from A versus stabilized entry from C.',
        'Evaluate the detour C→B→D alongside the bypass C→D.',
        'Audit each candidate sum against the B-stability condition.'
      ),
      3: makeTierHints(
        'Compute all three route totals side by side—you may notice two different routes tie at the bottom.',
        'Check whether visiting C makes the longer-looking 3-edge route competitive with the 2-edge bypass.',
        'Select the minimum cycle count across the three evaluated route totals.',
        'Confirm global optimality over the state-expanded DAG.'
      ),
    },
    hintSpeakers: {
      1: 'Loomwright Console',
      2: 'Jacob (Route Margin)',
      3: 'Ilya (Echoed Note)',
    },
    rewards: { xp: 85, ip: 30, kp: 16 },
  },

  's2_probabilistic_urn': {
    id: 's2_probabilistic_urn',
    title: 'Bayesian Relic of the Archipelago',
    universeId: 'stage_2',
    regionId: 'r5_probabilistic_archipelago',
    stageNumber: 2,
    modeKey: 'stage_2',
    narrative: {
      context: 'Inside the Probabilistic Archipelago, matter phases between twin vaults whose ratios test conditional reasoning.',
      intro: 'An unnamed traveler left a cyan shard beside two closed vaults without recording which door yielded it. Jacob must compute true posterior odds before confronting the Stochastic Weaver.',
      investigationClues: [
        {
          id: 'clue_s2_2_slate',
          title: 'Archipelago Assay Slate',
          source: 'Altar Engraving',
          body: 'Once a cyan draw is observed, sample outcomes narrow exclusively to draws capable of producing cyan.',
        },
      ],
      consequences: 'Locking the exact posterior likelihood aligns the Archipelago tideway toward the Stochastic Weaver’s sanctum.',
      storyEventId: 'story_s2_bayesian_tide',
      storyEventTitle: 'Bayesian Calibration of the Archipelago',
      linkedArchiveIds: ['arch_bayesian_updating'],
      linkedDiscoveryIds: ['disc_s2_bayes'],
    },
    category: 'mathematical',
    difficulty: 'Intermediate',
    difficultyScore: 50,
    relevantAttributes: ['analytical', 'metacognition', 'abstract'],
    interactionType: 'multiple_choice',
    objective: 'Determine the posterior probability that the drawn cyan shard came from Vault X.',
    instructions: 'Two vaults have equal 50/50 prior probability. Vault X holds [3 Cyan, 1 Void]; Vault Y holds [1 Cyan, 3 Void]. Compute P(Vault X | Cyan drawn).',
    rules: [
      'Vault X and Vault Y are equally likely to be picked a priori (1/2 each).',
      'Each shard inside the chosen vault is equally likely to be drawn.',
    ],
    promptBody:
      'A traveler chooses one of two identical vaults at random and draws a single cyan shard. Determine the exact conditional probability that Vault X was chosen.',
    sceneObjects: [
      {
        id: 'obj_vault_x_tag',
        label: 'Vault X Inventory Brass',
        locationNote: 'West Pedestal',
        kindTag: 'Vault Manifest',
        observation: 'Sealed contents: 3 Cyan shards, 1 Void shard.',
      },
      {
        id: 'obj_vault_y_tag',
        label: 'Vault Y Inventory Brass',
        locationNote: 'East Pedestal',
        kindTag: 'Vault Manifest',
        observation: 'Sealed contents: 1 Cyan shard, 3 Void shards.',
      },
    ],
    documents: [
      {
        id: 'doc_altar_draw',
        title: 'Altar Extraction Witness Slip',
        source: 'Tideway Marker',
        reliabilityNote: 'Verified observation',
        excerpt: 'One vault was picked uniformly at random; a single shard was drawn and confirmed Cyan.',
      },
    ],
    workspaceMode: 'cat_mouse',
    workspaceData: {
      mode: 'cat_mouse',
      headline: 'Twin Vault Contents · Prior & Likelihood Framing',
      leftColumnTitle: 'Vault X (50% Prior)',
      leftItems: ['3 Cyan shards', '1 Void shard', '4 total shards'],
      rightColumnTitle: 'Vault Y (50% Prior)',
      rightItems: ['1 Cyan shard', '3 Void shards', '4 total shards'],
      tacticalNote: 'Distinguish joint probability P(X ∩ Cyan) from conditional probability P(X | Cyan).',
    },
    options: [
      { id: '1/2', label: '50% (1/2)', detail: 'Equal priors keep both vaults equally likely', exploitedPattern: 'assumed_untested' },
      { id: '2/3', label: '66.7% (2/3)', detail: 'Twice as likely to come from Vault X', exploitedPattern: 'guessed' },
      { id: '3/4', label: '75% (3/4)', detail: 'Three times as likely to come from Vault X' },
      { id: '3/8', label: '37.5% (3/8)', detail: 'Joint likelihood of Vault X and Cyan', exploitedPattern: 'ignored_detail' },
    ],
    validSolutions: ['3/4'],
    defaultErrorPattern: 'ignored_detail',
    explanation:
      'Out of all 8 equally likely shard draws across the two vaults, 4 yield Cyan (3 inside Vault X, 1 inside Vault Y). Conditioning on observing Cyan restricts the sample space to those 4 Cyan draws: P(Vault X | Cyan) = 3 / 4 = 75%. (3/8 is P(X ∩ Cyan), the unconditional joint probability.)',
    postSolvePrompt: {
      question: 'Why does 3/8 represent a common trap here?',
      patternPrompt: 'What denominator separates P(A ∩ B) from P(A | B)?',
      takeaway: 'Always normalize by the total probability of the observed evidence, not the unfiltered sample space.',
    },
    cognitiveTools: {
      decomposition: [
        'Enumerate total draws across both vaults assuming many repeated trials.',
        'Discard Void draws because the observed shard is already known to be Cyan.',
      ],
      dependencyMapping: ['Observing Cyan scales prior odds by the likelihood ratio P(Cyan|X) : P(Cyan|Y).'],
      anomalyHighlight: 'Joint probability uses denominator 1 (all 8 outcomes); conditional probability divides by P(Cyan).',
      symbolicTranslation: 'P(X | C) = P(C | X)·P(X) / [P(C | X)·P(X) + P(C | Y)·P(Y)].',
      alternativeHypotheses: ['Simulate 100 picks from X and 100 from Y, then count what fraction of Cyan results came from X.'],
    },
    hints: {
      1: makeTierHints(
        'Picture picking a vault 100 times from X and 100 times from Y—then ignore every Void draw since you already hold a Cyan shard.',
        'Distinguish between the chance of drawing X AND Cyan before looking, versus the chance of X AFTER seeing Cyan.',
        'Apply Bayesian likelihood weighting rather than joint probability.',
        'Compute posterior odds ratio by multiplying prior odds by P(Cyan | X) / P(Cyan | Y).'
      ),
      2: makeTierHints(
        'Count how many total Cyan shards sit across both vaults combined, and check how many of those belong to Vault X.',
        'Divide the joint probability P(X ∩ Cyan) by the total probability P(Cyan) across both vaults.',
        'Condition the 8-element equiprobable sample space onto the subset matching the observation.',
        'Convert likelihood ratio between the two vaults into a normalized posterior probability.'
      ),
      3: makeTierHints(
        'Check your ratio carefully: do not stop at the unnormalized joint fraction over all 8 shards.',
        'Normalize Vault X’s cyan outcomes by total cyan outcomes across Vault X and Vault Y.',
        'Verify that P(X|C) + P(Y|C) sums cleanly to 1.',
        'Confirm posterior odds normalization.'
      ),
    },
    hintSpeakers: {
      1: 'Altar Slate',
      2: 'Ilya (Echoed Margin)',
      3: 'Jacob (Bench Check)',
    },
    rewards: { xp: 90, ip: 32, kp: 18 },
  },

  // FRACTURED CIVILIZATION ARC: THE VAELORI (STAGE II)
  's2_vaelori_chronicle': {
    id: 's2_vaelori_chronicle',
    title: 'Fractured Archives of the Vaelori',
    universeId: 'stage_2',
    regionId: 'r4b_vaelori_ruins',
    stageNumber: 2,
    modeKey: 'stage_2',
    narrative: {
      context: 'An extinct fracture-dwelling civilization—the Vaelori—vanished abruptly, leaving three conflicting stone tablets in their outer gatehouse.',
      intro: 'Three stelae disagree on the date and sequence of the Vaelori departure. Physical marks on the vault door and orbital dial tell a quieter story than two of the carvings.',
      investigationClues: [
        {
          id: 'clue_vaelori_solstice',
          title: 'Orbital Sundial Plate',
          source: 'Courtyard Sundial',
          body: 'Residual precession rings show zero eclipse alignment during Cycle 4.',
        },
        {
          id: 'clue_vaelori_seal_order',
          title: 'Vault Threshold Latch',
          source: 'Inner Arch',
          body: 'Stone bolt sockets indicate the vault door could only latch from inside once outer aqueduct pressure dropped to zero.',
        },
      ],
      consequences: 'Isolating the uncorrupted chronicle reveals the Vaelori base-6 harmonic dial etched behind the outer gate.',
      storyEventId: 'story_vaelori_chronicle_verified',
      storyEventTitle: 'Vaelori Act I: The Corrupted Stelae',
      linkedDiscoveryIds: ['disc_vaelori_lexicon'],
    },
    category: 'linguistic',
    difficulty: 'Intermediate',
    difficultyScore: 48,
    relevantAttributes: ['linguistic', 'analytical', 'metacognition'],
    interactionType: 'multiple_choice',
    objective: 'Identify the single historical tablet consistent with both physical vault mechanics and astronomical evidence.',
    instructions: 'Inspect every stela and physical courtyard trace below, then select the sole consistent chronicle.',
    rules: [
      'A genuine chronicle cannot contradict itself or verified physical mechanics.',
      'Cross-check dates, inside-vs-outside positions, and cause-effect order.',
    ],
    promptBody:
      'Three Vaelori tablets give conflicting accounts of their disappearance. Audit all five exhibits below to determine which tablet preserves the true historical record.',
    sceneObjects: [
      {
        id: 'obj_vaelori_latch',
        label: 'Vault Bronze Bolt Socket',
        locationNote: 'Inner Vault Frame',
        kindTag: 'Mechanism Trace',
        observation: 'Interior deadbolt engages only from inside the sanctuary and stays jammed while Outer Aqueduct pressure holds.',
      },
      {
        id: 'obj_vaelori_sundial',
        label: 'Orbital Sundial Ring',
        locationNote: 'Gatehouse Courtyard',
        kindTag: 'Astronomical Plate',
        observation: 'Cycle 4 shows clear unbroken solar transit; no double eclipse occurred in Cycle 4.',
      },
    ],
    documents: [
      {
        id: 'doc_vaelori_t1',
        title: 'Tablet I — High Mason Record',
        source: 'West Alcove',
        reliabilityNote: 'Chiseled inscription (date disputed)',
        excerpt: 'The Vault sealed before the Aqueduct stopped, while every citizen watched the Aqueduct dry up from outside the sealed Vault.',
      },
      {
        id: 'doc_vaelori_t2',
        title: 'Tablet II — Solar Choir Ledger',
        source: 'North Alcove',
        reliabilityNote: 'Chiseled inscription (unverified provenance)',
        excerpt: 'When the Aqueduct ceased at dusk in Cycle 5, the Choir withdrew inward and drew the Vault seal behind them.',
      },
      {
        id: 'doc_vaelori_t3',
        title: 'Tablet III — Eclipse Annal',
        source: 'East Alcove',
        reliabilityNote: 'Chiseled inscription (date disputed)',
        excerpt: 'During the double eclipse of Cycle 4, the Choir escaped before the Aqueduct stopped and sealed the Vault from outside.',
      },
    ],
    visualData: {
      premises: [
        'Mechanism: Vault bolts lock strictly from inside after Aqueduct stops.',
        'Sundial: No eclipse occurred in Cycle 4.',
      ],
    },
    workspaceMode: 'rule_shift',
    workspaceData: {
      mode: 'rule_shift',
      headline: 'Provenance Reconciliation · Claims vs Physical Traces',
      rows: [
        { label: 'Tablet I · High Mason', primary: 'Seal before Aqueduct dry', secondary: 'Citizens outside watching' },
        { label: 'Tablet II · Solar Choir', primary: 'Aqueduct ceases Cycle 5', secondary: 'Choir seals from inside' },
        { label: 'Tablet III · Eclipse Annal', primary: 'Cycle 4 double eclipse', secondary: 'Sealed from outside early' },
      ],
      tacticalNote: 'Physical mechanism traces and astronomical plates test inscriptions independently of stone prestige.',
    },
    options: [
      { id: 'tablet_1', label: 'Tablet I — High Mason Record', detail: 'Seal closed before Aqueduct stopped', exploitedPattern: 'unreliable_source' },
      { id: 'tablet_3', label: 'Tablet III — Eclipse Annal', detail: 'Cycle 4 double eclipse departure', exploitedPattern: 'unreliable_source' },
      { id: 'tablet_2', label: 'Tablet II — Solar Choir Ledger', detail: 'Cycle 5 departure after Aqueduct ceased' },
    ],
    validSolutions: ['tablet_2'],
    defaultErrorPattern: 'unreliable_source',
    explanation:
      'Tablet I violates the mechanical constraint (seal could not close before the Aqueduct stopped) and claims everyone stayed outside watching. Tablet III asserts both a non-existent Cycle 4 double eclipse and sealing from outside before the Aqueduct stopped. Only Tablet II aligns with both physical and astronomical records.',
    postSolvePrompt: {
      question: 'Why was comparing stone claims against non-written physical hardware decisive here?',
      patternPrompt: 'Which two independent checks falsified the forged or drifted stelae?',
      takeaway: 'Cross-examine written accounts against mechanical invariants and physical dates.',
    },
    cognitiveTools: {
      decomposition: [
        'Check chronological order: Aqueduct vs Vault Seal.',
        'Check bolt mechanics: interior vs exterior sealing.',
        'Check Cycle 4 astronomical datum.',
      ],
      dependencyMapping: ['Each tablet must satisfy physical sequence, bolt direction, and sundial date jointly.'],
      anomalyHighlight: 'Notice multiple constraints (date, order, side of door) must all hold simultaneously.',
      symbolicTranslation: 'Valid(T) ⇔ OrderOK(T) ∧ MechanicsOK(T) ∧ AstronomyOK(T).',
      alternativeHypotheses: ['Verify whether any tablet contradicts itself internally even before external checks.'],
    },
    hints: {
      1: makeTierHints(
        'Test every tablet against the bronze bolt socket and the courtyard sundial instead of judging by title or style.',
        'Check two independent dimensions on each tablet: event order/side of door, and the cycle date cited.',
        'Treat the physical hardware traces as hard invariants and check which inscriptions break them.',
        'Intersect causal sequence consistency with astronomical falsification.'
      ),
      2: makeTierHints(
        'Look closely at what each tablet says about whether the Vault sealed from inside or outside, and when the Aqueduct stopped.',
        'Ask whether a vault door designed to bolt only from inside after dry-out matches the High Mason or Eclipse claims.',
        'Audit each inscription separately against bolt mechanics and Cycle 4 sundial evidence.',
        'Confirm whether any inscription violates more than one physical trace.'
      ),
      3: makeTierHints(
        'Two of the tablets fail physical checks on both sequence and mechanism; verify the remaining one satisfies every line.',
        'Check that your chosen tablet aligns cleanly with Cycle 5, interior bolting, and post-aqueduct sealing.',
        'Validate every clause of the surviving account against all physical exhibits before committing.',
        'Confirm unique joint satisfaction across all constraints.'
      ),
    },
    hintSpeakers: {
      1: 'Courtyard Sundial',
      2: 'Jacob (Field Margin)',
      3: 'Ilya (Echoed Note)',
    },
    rewards: { xp: 90, ip: 32, kp: 20 },
  },

  's2_vaelori_cipher': {
    id: 's2_vaelori_cipher',
    title: 'Senary Lock of the Vaelori Sanctum',
    universeId: 'stage_2',
    regionId: 'r4b_vaelori_ruins',
    stageNumber: 2,
    modeKey: 'stage_2',
    narrative: {
      context: 'Unlike base-10 builders, the Vaelori counted masonry, cycles, and portal locks in base-6 (senary) rings.',
      intro: 'The Solar Choir Ledger guides Jacob to a brass threshold dial displaying three-digit triplets calibrated in senary notation alongside pottery tallies.',
      investigationClues: [
        {
          id: 'clue_vaelori_ros',
          title: 'Calibrated Sample Plinth',
          source: 'Threshold Plinth',
          body: 'Two weathered calibration plates carve the correspondence between three-ring triplets and stair counts.',
        },
      ],
      consequences: 'Decoding the base-6 lock parts the Choir Sanctuary doors, exposing the final instrument chamber.',
      storyEventId: 'story_vaelori_cipher_decoded',
      storyEventTitle: 'Vaelori Act II: The Base-6 Threshold',
      linkedArchiveIds: ['arch_vaelori_base6'],
    },
    category: 'mathematical',
    difficulty: 'Intermediate',
    difficultyScore: 52,
    relevantAttributes: ['abstract', 'pattern_recognition', 'analytical'],
    interactionType: 'numeric_input',
    objective: 'Convert the Vaelori base-6 triplet [2, 4, 1]_6 into a base-10 integer.',
    instructions: 'Inspect the threshold calibration plates, verify the positional weights of the three rings, and enter the base-10 value of [2, 4, 1]_6.',
    rules: [
      'Each ring represents one positional place in a uniform constant-base system.',
      'Ignore non-numeric mason ornament marks.',
    ],
    promptBody:
      'Two calibrated sample rings sit beside the main Sanctuary dial. Deduce the positional rule and translate the final lock triplet [2, 4, 1]_6.',
    sceneObjects: [
      {
        id: 'obj_plinth_sample_1',
        label: 'Threshold Sample A',
        locationNote: 'Left Jamb',
        kindTag: 'Calibration Plate',
        observation: 'Triplet [1, 0, 4]_6 corresponds to 40 steps.',
      },
      {
        id: 'obj_plinth_sample_2',
        label: 'Threshold Sample B',
        locationNote: 'Right Jamb',
        kindTag: 'Calibration Plate',
        observation: 'Triplet [1, 3, 2]_6 corresponds to 56 steps.',
      },
      {
        id: 'obj_amphora_tally',
        label: 'Broken Amphora Rim',
        locationNote: 'Alcove Floor',
        kindTag: 'Pottery Shard',
        observation: 'Merchant tally scratched "14 jars delivered"—unrelated to stone dial geometry.',
      },
    ],
    visualData: {
      equations: [
        '[1, 0, 4]_6  →  40',
        '[1, 3, 2]_6  →  56',
        '[2, 4, 1]_6  →  ?',
      ],
    },
    workspaceMode: 'tactical_shift',
    workspaceData: {
      mode: 'tactical_shift',
      headline: 'Senary Positional Register · Ring Weights',
      rows: [
        { label: 'Outer Ring', primary: 'Digit = 2', secondary: 'Determine positional multiplier' },
        { label: 'Middle Ring', primary: 'Digit = 4', secondary: 'Determine positional multiplier' },
        { label: 'Inner Ring', primary: 'Digit = 1', secondary: 'Determine positional multiplier' },
      ],
      tacticalNote: 'Verify your inferred place-value weights on BOTH Sample A and Sample B before decoding the target.',
    },
    validSolutions: ['97'],
    defaultErrorPattern: 'assumed_untested',
    explanation:
      'In base 6, place weights from left to right are 6² = 36, 6¹ = 6, and 6⁰ = 1. Check samples: 1(36)+0(6)+4(1)=40 and 1(36)+3(6)+2(1)=56. Therefore [2, 4, 1]_6 = 2(36) + 4(6) + 1(1) = 97.',
    postSolvePrompt: {
      question: 'How does testing both Sample A and Sample B verify you did not guess the base incorrectly?',
      patternPrompt: 'What mistake comes from adding raw digits (2+4+1) or reading base-6 digits as decimal?',
      takeaway: 'Never interpret positional notation using decimal intuition when the subscript specifies a different base.',
    },
    cognitiveTools: {
      decomposition: [
        'Test powers of 6 (36, 6, 1) against Sample A [1, 0, 4]_6.',
        'Cross-check the same weights against Sample B [1, 3, 2]_6.',
      ],
      dependencyMapping: ['Each ring scales left by a factor of 6.'],
      anomalyHighlight: 'Summing raw face digits ignores positional powers of the base.',
      symbolicTranslation: 'Value([a, b, c]_b) = a·b² + b_mid·b + c.',
      alternativeHypotheses: ['Apply Horner nesting: ((a × 6) + b) × 6 + c.'],
    },
    hints: {
      1: makeTierHints(
        'Notice the subscript 6 on each triplet: in base 6, each step to the left multiplies place value by 6 rather than 10.',
        'Check how [1, 0, 4]_6 produces 40 and verify the same place weights on [1, 3, 2]_6.',
        'Evaluate positional weights b², b¹, b⁰ for b = 6 across both sample inscriptions.',
        'Apply Horner’s evaluation over base 6.'
      ),
      2: makeTierHints(
        'Work out the weight of each of the three slots first using Sample A, then make sure Sample B also matches 56.',
        'Once the middle and left ring weights are confirmed, multiply each digit of [2, 4, 1]_6 by its own place weight.',
        'Compute each positional term separately before summing.',
        'Verify ((a · 6) + b) · 6 + c equivalence.'
      ),
      3: makeTierHints(
        'Double-check your arithmetic on each of the three products (left ring, middle ring, units) and confirm the total sits slightly below 100.',
        'Add the three weighted terms cleanly without dropping the units place.',
        'Verify parity and mod-6 remainder of your final integer against the rightmost digit 1.',
        'Check final sum mod 6 == 1.'
      ),
    },
    hintSpeakers: {
      1: 'Threshold Plinth',
      2: 'Jacob (Ledger Note)',
      3: 'Ilya (Echoed Note)',
    },
    rewards: { xp: 95, ip: 34, kp: 20 },
  },

  's2_vaelori_verdict': {
    id: 's2_vaelori_verdict',
    title: 'The Vaelori Resonance Verdict',
    universeId: 'stage_2',
    regionId: 'r4b_vaelori_ruins',
    stageNumber: 2,
    modeKey: 'stage_2',
    narrative: {
      context: 'Inside the Choir Sanctuary, Vaelori instruments reveal no siege or blast—only intact masonry around an empty dimensional Anchor Core.',
      intro: 'Jacob reconstructs the final hours of the Choir by uniting Stage II’s sanctuary logs with Stage I’s Observatory pendulum law.',
      investigationClues: [
        {
          id: 'clue_vaelori_weight_myth',
          title: 'Anchor Console Log',
          source: 'Sanctuary Lectern',
          body: 'When ambient gravity spiked, engineers stacked triple-weight counterweights onto their pendulums instead of adjusting cable lengths.',
        },
      ],
      consequences: 'Jacob uncovers how a mistaken physical assumption detuned the Choir’s evacuation portals, scattering surviving vessels toward Stage V.',
      storyEventId: 'story_vaelori_mystery_solved',
      storyEventTitle: 'Vaelori Act III: The Mass-Invariance Tragedy',
      linkedArchiveIds: ['arch_finite_differences', 'arch_bayesian_updating'],
      linkedDiscoveryIds: ['disc_obs_artifact', 'disc_vaelori_aqueduct'],
    },
    category: 'hybrid',
    difficulty: 'Intermediate',
    difficultyScore: 56,
    relevantAttributes: ['analytical', 'creative', 'metacognition', 'abstract'],
    interactionType: 'multiple_choice',
    objective: 'Reconstruct the causal flaw that triggered the Vaelori disappearance.',
    instructions: 'Inspect the Sanctuary console, counterweight tally, and Stage I Observatory reference below to diagnose what happened to the Choir.',
    rules: [
      'Consistent accounts must satisfy both Stage I pendulum physics and Stage II physical sanctuary traces.',
      'Portal synchronization required exact oscillation period T = 2 seconds.',
    ],
    promptBody:
      'When local gravity jumped at the Vaelori Anchor Core, the engineers altered one parameter while leaving another untouched. Determine the true physical outcome.',
    sceneObjects: [
      {
        id: 'obj_anchor_core_log',
        label: 'Anchor Core Console',
        locationNote: 'Center Dais',
        kindTag: 'Telemetry Record',
        observation: 'Gravity surged from g = 1 to g = 4 m/s²; engineers kept tether L = 4 m and tripled bob mass M.',
      },
      {
        id: 'obj_aqueduct_valves',
        label: 'Intact Inner Vault Valves',
        locationNote: 'Sanctuary Perimeter',
        kindTag: 'Physical Hardware',
        observation: 'Walls, seals, and floor tiles show zero fracture or flood silt; exit portals discharged cleanly inward.',
      },
    ],
    documents: [
      {
        id: 'doc_obs_reference',
        title: 'Stage I Observatory Brass Note',
        source: 'Jacob’s Field Ledger',
        reliabilityNote: 'Previously verified Stage I law',
        excerpt: 'Oscillation period across tested chambers obeyed T = √(L / g); bob mass M remained causally inert.',
      },
    ],
    visualData: {
      premises: [
        'Required portal lock period: T = 2 s',
        'Sanctuary settings after surge: g = 4, L = 4, M tripled',
        'Verified physical trace: No structural shatter or flood damage',
      ],
    },
    workspaceMode: 'social_reading',
    workspaceData: {
      mode: 'social_reading',
      headline: 'Sanctuary Audit · Engineer Intent vs Physical Mechanism',
      rows: [
        { label: 'Engineer Intervention', primary: 'Tripled Counterweight Mass M', secondary: 'Kept tether length L = 4' },
        { label: 'Physical Environment', primary: 'Gravity surged g: 1 → 4', secondary: 'Calculate actual resulting period T' },
        { label: 'Site Condition', primary: 'Intact vault & drained aqueduct', secondary: 'Cross-check candidate scenarios' },
      ],
      tacticalNote: 'Separate what the Vaelori believed controlled the period from what actually governs oscillation.',
    },
    options: [
      {
        id: 'mass_overload',
        label: 'Counterweight Mass Collapsed the Vault',
        detail: 'Heavy mass slowed the period to 6s and shattered the sanctuary floor',
        exploitedPattern: 'assumed_untested',
      },
      {
        id: 'orbital_detuning',
        label: 'Period Halved to 1s — Desynchronized Jump',
        detail: 'Mass exerted no effect while g=4 halved period below the 2s portal lock',
      },
      {
        id: 'aqueduct_flood',
        label: 'Aqueduct Breached the Outer Seals',
        detail: 'External water flooded the chamber before portals engaged',
        exploitedPattern: 'unreliable_source',
      },
    ],
    validSolutions: ['orbital_detuning'],
    defaultErrorPattern: 'assumed_untested',
    explanation:
      'Using Stage I’s verified law T = √(L/g): mass M exerts zero influence on period. With L = 4 and g = 4, T dropped to √(4/4) = 1s instead of the required 2s (which demanded L = 16). Combined with intact vault valves and zero siege/flood damage, their mistuned departure scattered them beyond Stage II.',
    postSolvePrompt: {
      question: 'Which false assumption did the Vaelori engineers share with a careless player in Stage I’s Observatory?',
      patternPrompt: 'How did the intact vault valves confirm evacuation rather than structural collapse?',
      takeaway: 'Cross-stage physical laws carry forward; verify both mathematical formulas and physical scene evidence.',
    },
    cognitiveTools: {
      decomposition: [
        'Re-evaluate Stage I’s pendulum law at L = 4, g = 4, and tripled M.',
        'Compare the resulting period T against the 2s portal requirement.',
        'Check each scenario against intact vault hardware.',
      ],
      dependencyMapping: ['Stage I Observatory invariance law governs Stage II Anchor Core timing.'],
      anomalyHighlight: 'Intervening on an inert variable (mass) leaves the real driver (L/g ratio) uncorrected.',
      symbolicTranslation: 'Compute √(L_new / g_new) and compare with 2s.',
      alternativeHypotheses: ['Check what tether length L would actually have kept T = 2s under g = 4.'],
    },
    hints: {
      1: makeTierHints(
        'Recall what you proved about counterweight mass back in Stage I’s Observatory before testing the three scenarios.',
        'Evaluate T using Stage I’s verified pendulum relation with L = 4 and g = 4, then compare against the physical vault condition.',
        'Cross-reference the Sanctuary’s intact valves (Tablet II) with the invariance law for oscillation period.',
        'Test which scenario matches both mass-invariance and undamaged masonry.'
      ),
      2: makeTierHints(
        'Since mass does not slow or speed up the swing, ask what happens to the swing time when gravity rises fourfold at fixed tether length.',
        'Notice two of the scenarios invent structural damage or flooding—check the Vault Valve exhibit to see if those fit the evidence.',
        'Separate causal effect (L/g scaling) from engineer intention (changing M).',
        'Verify period shift direction when denominator g increases 4×.'
      ),
      3: makeTierHints(
        'Pick the verdict that respects both the exact numerical period under L=4, g=4 and the undamaged state of the Sanctuary.',
        'Confirm that your selected explanation accounts for mass irrelevance and clean portal departure.',
        'Ensure zero contradiction with Tablet II’s interior sealing evidence.',
        'Confirm consistency across mathematical physics and historical site traces.'
      ),
    },
    hintSpeakers: {
      1: 'Jacob (Field Ledger)',
      2: 'Sanctuary Hardware',
      3: 'Ilya (Echoed Note)',
    },
    rewards: { xp: 115, ip: 40, kp: 26, ep: 1 },
  },

  // STAGE III: THE INFINITE STRUCTURES
  's3_recursive_citadel': {
    id: 's3_recursive_citadel',
    title: 'Tower of Self-Reference',
    universeId: 'stage_3',
    regionId: 'r6_recursive_citadel',
    stageNumber: 3,
    modeKey: 'stage_3',
    narrative: {
      context: 'The Recursor Guild erected spiraling spires where each stone landing encodes a weighted combination of the two landings below it.',
      intro: 'An ascent dial demands the exact 7th elevation index before the upper citadel floor locks into place.',
      investigationClues: [
        {
          id: 'clue_s3_1_notch',
          title: 'Masonry Index Tally',
          source: 'Stairwell Pillar',
          body: 'Builders etched F(0)=1 and F(1)=2 directly at floor zero to prevent indexing drift.',
        },
      ],
      consequences: 'Opening the 7th floor clears passage into the Hyperdimensional Lattice.',
      storyEventId: 'story_s3_citadel_ascended',
      storyEventTitle: 'Ascent of the Recursive Citadel',
      linkedDiscoveryIds: ['disc_s3_rec'],
    },
    category: 'pattern',
    difficulty: 'Advanced',
    difficultyScore: 60,
    relevantAttributes: ['abstract', 'pattern_recognition', 'working_memory'],
    interactionType: 'numeric_input',
    objective: 'Evaluate F(7) for the Citadel’s shifted second-order recurrence.',
    instructions: 'Tabulate F(n) step by step from n = 0 up to n = 7 without omitting the -1 shift at any step.',
    rules: [
      'F(0) = 1, F(1) = 2.',
      'For n ≥ 2: F(n) = F(n - 1) + 2 · F(n - 2) - 1.',
    ],
    promptBody:
      'The Recursive Citadel governs its lift elevation via:\nF(0) = 1, F(1) = 2,\nF(n) = F(n - 1) + 2·F(n - 2) - 1 for n ≥ 2.\nCompute the exact value of F(7).',
    sceneObjects: [
      {
        id: 'obj_citadel_anchors',
        label: 'Floor Zero Anchors',
        locationNote: 'Spiral Plinth',
        kindTag: 'Base Register',
        observation: 'Base index 0 engraved as 1; base index 1 engraved as 2.',
      },
    ],
    visualData: {
      equations: [
        'F(0) = 1',
        'F(1) = 2',
        'F(n) = F(n - 1) + 2·F(n - 2) - 1',
        'Target: F(7)',
      ],
    },
    workspaceMode: 'commit_plan',
    workspaceData: {
      mode: 'commit_plan',
      headline: 'Bottom-Up Tabulation · Elevation Sequence F(0..7)',
      rows: [
        { label: 'Base Cases', primary: 'F(0) = 1, F(1) = 2', secondary: 'Start tabulation from n = 2' },
        { label: 'Transition Check', primary: 'Current = Prev1 + 2·Prev2 − 1', secondary: 'Watch index alignment & −1 constant' },
        { label: 'Target Output', primary: 'Evaluate F(7)', secondary: 'Double-check F(5) and F(6) before computing F(7)' },
      ],
      tacticalNote: 'Pin each floor value explicitly rather than holding nested mental stacks.',
    },
    validSolutions: ['86'],
    defaultErrorPattern: 'ignored_detail',
    explanation:
      'Tabulating sequentially: F(0)=1, F(1)=2, F(2)=2+2(1)-1=3, F(3)=3+2(2)-1=6, F(4)=6+2(3)-1=11, F(5)=11+2(6)-1=22, F(6)=22+2(11)-1=43, F(7)=43+2(22)-1=86.',
    postSolvePrompt: {
      question: 'Which term in the recurrence causes off-by-one drift if skipped mid-table?',
      patternPrompt: 'How does bottom-up tabulation prevent exponential mental branching?',
      takeaway: 'Store intermediate states explicitly in order whenever recurrences include inhomogeneous shifts.',
    },
    cognitiveTools: {
      decomposition: [
        'Use bottom-up dynamic tabulation from n = 2 sequentially to n = 7.',
        'Record every intermediate integer cleanly on your scratchpad.',
      ],
      dependencyMapping: ['Each F(n) depends strictly on F(n-1), 2·F(n-2), and the -1 shift.'],
      anomalyHighlight: 'Notice the constant -1 shift: even parity transitions differ slightly from pure homogeneous doubling.',
      symbolicTranslation: 'G(n) = F(n) - 1/2 yields homogeneous G(n) = G(n-1) + 2·G(n-2).',
      alternativeHypotheses: ['Verify whether odd-to-even transitions match an alternating doubling rhythm across early terms.'],
    },
    hints: {
      1: makeTierHints(
        'Write down F(2), F(3), F(4), F(5), and F(6) on paper or your scratchpad one step at a time—do not skip straight to F(7).',
        'Use bottom-up tabulation rather than expanding F(7) backward into smaller calls.',
        'Compute F(2)..F(4) carefully and check whether a parity rhythm appears between adjacent terms.',
        'Shifting G(n) = F(n) - 1/2 removes the constant term for an independent algebraic check.'
      ),
      2: makeTierHints(
        'Double-check F(2) and F(3) first: remember to multiply F(n-2) by 2 AND subtract 1 every single step.',
        'Watch the index order: F(n-1) enters with coefficient 1, while F(n-2) enters with coefficient 2.',
        'Confirm F(4) and F(5) obey both the direct recurrence and parity consistency.',
        'Verify characteristic roots (r=2, r=-1) against your tabulated F(4) and F(5).'
      ),
      3: makeTierHints(
        'Once F(5) and F(6) sit cleanly in front of you, run the formula once more—checking you multiplied the older term by 2 and subtracted 1.',
        'Audit each transition from n=2 to n=7 to ensure zero missing -1 shifts.',
        'Verify your final F(7) against any alternating parity pattern observed across earlier pairs.',
        'Cross-verify bottom-up table against closed-form evaluation at n=7.'
      ),
    },
    hintSpeakers: {
      1: 'Stairwell Pillar',
      2: 'Jacob (Scratchpad)',
      3: 'Ilya (Echoed Note)',
    },
    rewards: { xp: 115, ip: 38, kp: 20 },
  },

  's3_hyper_lattice': {
    id: 's3_hyper_lattice',
    title: 'Hypercube Vertex Parity',
    universeId: 'stage_3',
    regionId: 'r7_hyperdimensional_lattice',
    stageNumber: 3,
    modeKey: 'stage_3',
    narrative: {
      context: 'Suspended above the Citadel floats a translucent 4-dimensional tesseract whose corridors connect corners differing in one coordinate.',
      intro: 'Navigation sensors lock every corridor two hops from origin (0,0,0,0) until Jacob computes the exact count of anchor vertices satisfying both distance and parity.',
      investigationClues: [
        {
          id: 'clue_s3_2_shadow',
          title: '3D Projection Analogy',
          source: 'Lattice Frame',
          body: 'On a 3D cube, corners two edges away from (0,0,0) have two 1s; extend that subset principle into four dimensions.',
        },
      ],
      consequences: 'Calibrating the weight-2 layer opens the gateway to The Infinite Recursor.',
      storyEventId: 'story_s3_hypercube_mapped',
      storyEventTitle: 'Charting the Four-Dimensional Lattice',
      linkedDiscoveryIds: ['disc_s3_hyper'],
    },
    category: 'hybrid',
    difficulty: 'Advanced',
    difficultyScore: 66,
    relevantAttributes: ['spatial', 'abstract', 'analytical'],
    interactionType: 'numeric_input',
    objective: 'Count how many vertices of a 4-dimensional hypercube sit at Hamming distance 2 from (0,0,0,0) AND have an even number of 1s.',
    instructions: 'Model each 4D vertex as a 4-bit vector in {0,1}⁴ and determine how many vectors satisfy both constraints jointly.',
    rules: [
      'A vertex is a 4-tuple (x₁, x₂, x₃, x₄) with each x_i ∈ {0, 1}.',
      'Edges connect vertices differing in exactly 1 coordinate.',
    ],
    promptBody:
      'In the 4-cube {0,1}⁴, how many vertices sit at exact shortest-path distance 2 from origin (0,0,0,0) while having an even count of 1-coordinates?',
    sceneObjects: [
      {
        id: 'obj_tesseract_frame',
        label: '4D Coordinate Beacon',
        locationNote: 'Lattice Origin',
        kindTag: 'Geometry Anchor',
        observation: 'Origin locked at (0, 0, 0, 0); each step toggles a single binary coordinate.',
      },
    ],
    visualData: {
      equations: [
        'Space: {0, 1}^4 (16 vertices)',
        'Origin: (0, 0, 0, 0)',
        'Conditions: Distance = 2 AND Even weight',
      ],
    },
    workspaceMode: 'tactical_shift',
    workspaceData: {
      mode: 'tactical_shift',
      headline: 'Dimensional Translation · Geometric Distance to Coordinate Flips',
      leftColumnTitle: 'Spatial Intuition (3D Cube)',
      leftItems: ['Origin at (0,0,0)', 'Each edge flips 1 coordinate', 'Count corners 2 hops away'],
      rightColumnTitle: 'Combinatorial Representation (4D)',
      rightItems: ['4 binary slots: (_ , _ , _ , _)', 'Distance 2 from all-zeros fixes how many 1s?', 'Check parity clause independently'],
      tacticalNote: 'When 4D spatial visualization stretches thin, translate shortest-path hops into coordinate selections.',
    },
    validSolutions: ['6'],
    defaultErrorPattern: 'assumed_untested',
    explanation:
      'Shortest-path distance 2 from (0,0,0,0) means flipping exactly 2 coordinates from 0 to 1—so Hamming weight is 2 (already even!). Counting 4-bit vectors with two 1s gives C(4, 2) = (4 × 3) / 2 = 6.',
    postSolvePrompt: {
      question: 'Why did translating geometric hops into coordinate subsets make 4D counting straightforward?',
      patternPrompt: 'Was the "even number of 1s" constraint restrictive or redundant once distance = 2 was fixed?',
      takeaway: 'Shift from visualization to combinatorics whenever spatial dimension exceeds 3.',
    },
    cognitiveTools: {
      decomposition: [
        'Translate "distance 2 from (0,0,0,0)" into the exact count of 1s in the binary tuple.',
        'Check whether any weight-2 tuple can ever have odd parity.',
      ],
      dependencyMapping: ['Distance constraint and parity constraint interact—test for redundancy!'],
      anomalyHighlight: 'Two constraints sometimes overlap completely instead of cutting candidates in half.',
      symbolicTranslation: '|{ v ∈ {0,1}⁴ : ∑v_i = 2 and (∑v_i) mod 2 = 0 }|.',
      alternativeHypotheses: ['Verify your combinatorics formula on a familiar 3D cube (distance 2 from origin) first.'],
    },
    hints: {
      1: makeTierHints(
        'Think of four slots (_ _ _ _): moving 2 edges from (0,0,0,0) flips two 0s into 1s.',
        'Translate shortest-path edges into Hamming weight, then check whether the parity rule eliminates any weight-2 vectors.',
        'Map distance-2 vertices on {0,1}^n to k-element subsets of the coordinate axes.',
        'Evaluate whether the even-parity condition adds any restriction to the weight-2 layer of B_4.'
      ),
      2: makeTierHints(
        'List all distinct ways to place two 1s and two 0s across four coordinate slots without missing or repeating any.',
        'Test your counting method on a 3D cube first: how many corners sit 2 edges from (0,0,0)? Apply the same binomial rule to 4 slots.',
        'Apply binomial selection over 4 independent axes for k = 2 flips.',
        'Check C(4, 2) vs symmetry across 1-coordinate vs 0-coordinate inversions.'
      ),
      3: makeTierHints(
        'Count how many start with 1 and how many start with 0—make sure each 4-tuple has exactly two 1s and no duplicates.',
        'Double-check your division in 4! / (2! × 2!) so you do not submit permutations instead of combinations.',
        'Verify all weight-2 vertices satisfy even parity trivially before submitting.',
        'Confirm binomial layer cardinality.'
      ),
    },
    hintSpeakers: {
      1: 'Lattice Frame',
      2: 'Jacob (Margin Study)',
      3: 'Ilya (Echoed Note)',
    },
    rewards: { xp: 125, ip: 40, kp: 22 },
  },

  // STAGE IV: THE CONCEPTUAL REALITIES
  's4_modal_cathedral': {
    id: 's4_modal_cathedral',
    title: 'Modal Necessity in Kripke Space',
    universeId: 'stage_4',
    regionId: 'r8_modal_cathedral',
    stageNumber: 4,
    modeKey: 'stage_4',
    narrative: {
      context: 'The Modalists built prism halls where worlds connect via asymmetric one-way corridors of possibility.',
      intro: 'At World W₁, the glass bridge points exclusively toward W₂—offering no mirror back onto W₁ itself.',
      investigationClues: [
        {
          id: 'clue_s4_1_mirror',
          title: 'One-Way Prism Axiom',
          source: 'Cathedral Lectern',
          body: 'Operators □ and ◇ inspect only worlds reachable along outgoing arrows, regardless of whether an arrow loops home.',
        },
      ],
      consequences: 'Mastering non-reflexive necessity opens the Cathedral threshold toward The Paradox Architect.',
      storyEventId: 'story_s4_kripke_breached',
      storyEventTitle: 'Breaching Non-Reflexive Kripke Space',
      linkedArchiveIds: ['arch_paraconsistent_truth'],
      linkedDiscoveryIds: ['disc_s4_modal'],
    },
    category: 'formal_logic',
    difficulty: 'Expert',
    difficultyScore: 76,
    relevantAttributes: ['abstract', 'analytical', 'linguistic'],
    interactionType: 'multiple_choice',
    objective: 'Determine which modal statement holds at World W₁ in this non-reflexive frame.',
    instructions: 'Evaluate □P ("P holds at ALL worlds accessible from W") and ◇P ("P holds at AT LEAST ONE world accessible from W") strictly along the listed arrows.',
    rules: [
      'Worlds: {W₁, W₂}.',
      'Accessibility R: W₁ sees ONLY W₂ (W₁ does NOT see itself); W₂ sees W₂.',
      'Valuation: At W₁, P is FALSE; at W₂, P is TRUE.',
    ],
    promptBody:
      'In a non-reflexive prism chamber, W₁ reaches only W₂ (no self-loop at W₁). Given P is FALSE at W₁ and TRUE at W₂, which formula is TRUE at W₁?',
    sceneObjects: [
      {
        id: 'obj_w1_prism',
        label: 'World W₁ Prism Lens',
        locationNote: 'Origin Chamber',
        kindTag: 'Modal Node',
        observation: 'Local gauge: P = FALSE. Outgoing corridor: W₂ only (self-loop sealed shut).',
      },
      {
        id: 'obj_w2_prism',
        label: 'World W₂ Prism Lens',
        locationNote: 'Far Chamber',
        kindTag: 'Modal Node',
        observation: 'Local gauge: P = TRUE. Outgoing corridor: W₂.',
      },
    ],
    visualData: {
      premises: [
        'Accessible from W₁: { W₂ } only',
        'Accessible from W₂: { W₂ }',
        'Valuation: W₁ ⊭ P (False), W₂ ⊨ P (True)',
      ],
    },
    workspaceMode: 'rule_shift',
    workspaceData: {
      mode: 'rule_shift',
      headline: 'Kripke Sightline Register · Local Truth vs Outbound Access',
      rows: [
        { label: 'At World W₁ Locally', primary: 'P = FALSE', secondary: 'Is W₁ inside R(W₁)?' },
        { label: 'Across R(W₁) = {W₂}', primary: 'P = TRUE at W₂', secondary: 'Evaluate □P and ◇P by definition' },
      ],
      tacticalNote: 'Check classical habits at the door: □P → P holds ONLY when every world accesses itself.',
    },
    options: [
      { id: 'p_implies_box_p', label: 'P ∧ ◇¬P', detail: 'P holds locally and ¬P is reachable', exploitedPattern: 'ignored_detail' },
      { id: 'not_box_p', label: '¬□P ∧ ¬◇P', detail: 'Neither necessity nor possibility of P holds', exploitedPattern: 'assumed_untested' },
      { id: 'box_p_and_not_p', label: '□P ∧ ¬P', detail: 'Necessarily P holds alongside local ¬P' },
      { id: 'box_not_p', label: '□¬P ∧ ¬P', detail: 'Necessarily ¬P holds alongside local ¬P', exploitedPattern: 'obvious_reading' },
    ],
    validSolutions: ['box_p_and_not_p'],
    defaultErrorPattern: 'assumed_untested',
    explanation:
      'Because W₁ has no self-loop, R(W₁) = {W₂}. Every world in R(W₁) makes P true, so W₁ ⊨ □P is true. At W₁ itself, P is false, so W₁ ⊨ ¬P is also true. Hence □P ∧ ¬P holds (Axiom T fails without reflexivity).',
    postSolvePrompt: {
      question: 'Which hidden assumption from ordinary modal reasoning breaks in a non-reflexive frame?',
      patternPrompt: 'Why can "necessarily P" hold at a world where P itself is false?',
      takeaway: 'Never smuggle Axiom T (□P → P) into a frame whose accessibility relation lacks self-loops.',
    },
    cognitiveTools: {
      decomposition: [
        'Step 1: Evaluate local P at W₁ directly.',
        'Step 2: List the exact set R(W₁) of worlds W₁ can see.',
        'Step 3: Test whether P holds in ALL worlds inside R(W₁).',
      ],
      dependencyMapping: ['Modal operators inspect R(W₁) while atomic letters inspect W₁ itself.'],
      anomalyHighlight: 'Everyday intuition assumes a world always accesses itself—that requires explicit reflexivity.',
      symbolicTranslation: 'W₁ ⊨ □P iff ∀w ∈ R(W₁), w ⊨ P.',
      alternativeHypotheses: ['Compare System K semantics against reflexive System T semantics.'],
    },
    hints: {
      1: makeTierHints(
        'Check carefully whether W₁ is included in its own arrow list—everyday habit assumes it is, even when the rules forbid it.',
        'Separate truth AT W₁ from truth across the set of worlds reachable FROM W₁.',
        'Test whether Axiom T (□P → P) remains valid when R fails reflexivity.',
        'Evaluate V(W₁, P) and ∀w ∈ R(W₁) V(w, P) independently under System K.'
      ),
      2: makeTierHints(
        'To test "necessarily P" at W₁, check ONLY the worlds W₁ points toward, and test local truth at W₁ separately.',
        'Remember: if W₁ points solely to W₂, every reachable world has P = TRUE, even though W₁ itself has P = FALSE.',
        'Evaluate both conjuncts independently rather than assuming □P contradicts ¬P.',
        'Check reflexivity failure on R(W₁) = {W₂}.'
      ),
      3: makeTierHints(
        'Combine your local value at W₁ with what holds across all worlds inside W₁’s outbound reach set.',
        'Verify each candidate formula half-by-half against W₁’s local valuation and R(W₁).',
        'Confirm your chosen conjunction matches both W₁ ⊭ P and ∀w ∈ R(W₁), w ⊨ P.',
        'Verify System K countermodel to Axiom T.'
      ),
    },
    hintSpeakers: {
      1: 'Cathedral Lectern',
      2: 'Ilya (Echoed Margin)',
      3: 'Jacob (Proof Audit)',
    },
    rewards: { xp: 150, ip: 48, kp: 26 },
  },

  // STAGE V: THE BEYOND
  's5_epistemic_synthesis': {
    id: 's5_epistemic_synthesis',
    title: 'The Incomplete Axiom Mirror',
    universeId: 'stage_5',
    regionId: 'r9_axiomless_expanse',
    stageNumber: 5,
    modeKey: 'stage_5',
    narrative: {
      context: 'Deep in Stage V drifts an intact Boundary Watcher gate alongside faint Vaelori navigation chimes.',
      intro: 'The Watcher bars entry to any mind claiming a consistent system can certify its own freedom from contradiction purely inside its own axioms.',
      investigationClues: [
        {
          id: 'clue_s5_1_watcher',
          title: 'Boundary Watcher Inscription',
          source: 'Expanse Monolith',
          body: 'An inconsistent rulebook proves anything, including its own soundness; verification must stand outside.',
        },
      ],
      consequences: 'Articulating meta-system ascent stabilizes the Expanse and isolates the Vaelori signal converging toward Stage VI.',
      storyEventId: 'story_s5_incompleteness_transcended',
      storyEventTitle: 'Beyond Internal Self-Verification',
      linkedArchiveIds: ['arch_epistemic_calibration'],
      linkedDiscoveryIds: ['disc_s5_godel'],
    },
    category: 'philosophical',
    difficulty: 'Extremely Advanced',
    difficultyScore: 84,
    relevantAttributes: ['creative', 'metacognition', 'abstract', 'linguistic'],
    interactionType: 'rubric_synthesis',
    objective: 'Construct a coherent resolution explaining why an observer inside a formal system cannot prove the system’s own total consistency without an external meta-criterion.',
    instructions: 'Write a concise structural explanation addressing self-reference, the tension between consistency and completeness/provability, and how ascending to an external meta-level resolves the deadlock.',
    rules: [
      'Address why internal self-referential proof leads to paradox or circularity.',
      'Explain why a consistent expressive system cannot prove its own consistency internally.',
      'Propose how stepping to an external meta-level framework resolves verification non-circularly.',
    ],
    promptBody:
      'In the Axiomless Expanse, the Watcher gate states: "No proof inside this chamber can certify that this chamber produces no contradictions." Explain the structural barrier behind this lock and how Jacob resolves it without circularity.',
    sceneObjects: [
      {
        id: 'obj_watcher_lock',
        label: 'Boundary Watcher Seal',
        locationNote: 'Threshold Arch',
        kindTag: 'Axiom Gate',
        observation: 'Gate rejects internal self-certifications; accepts proofs referencing an external meta-criterion.',
      },
    ],
    rubricCriteria: [
      {
        id: 'self_ref',
        label: 'Self-Reference & Circularity',
        keywords: ['self-refer', 'circular', 'gödel', 'godel', 'paradox', 'diagonal', 'itself', 'internal'],
        weight: 1,
      },
      {
        id: 'consistency_completeness',
        label: 'Consistency vs Completeness',
        keywords: ['consisten', 'contradict', 'complete', 'undecidable', 'unprovable', 'true'],
        weight: 1,
      },
      {
        id: 'meta_level',
        label: 'Meta-System / External Axiom',
        keywords: ['meta', 'external', 'outside', 'higher', 'stronger', 'hierarchy', 'framework'],
        weight: 1,
      },
    ],
    strictRubricSpec: {
      criteria: [
        {
          id: 'self_ref',
          label: 'Self-Reference & Circularity',
          stems: ['self-refer', 'circular', 'gödel', 'godel', 'paradox', 'diagonal', 'itself', 'internal', 'within', 'inside'],
          requiredPolarity: 'any',
          missingHint: 'Explain why a system evaluating itself from within triggers self-reference or circularity.',
        },
        {
          id: 'consistency_unprovable',
          label: 'Consistency vs Incompleteness Bound',
          stems: ['prov', 'verif', 'establish', 'guarant', 'certif'],
          requiredPolarity: 'negate',
          negatedStems: ['unprovab', 'incomplete', 'undecid', 'cannot prove', 'unable to prove', 'fails to prove', 'cannot verify'],
          missingHint: 'Specify that a consistent system cannot prove its own consistency without becoming incomplete (or risking explosion).',
        },
        {
          id: 'meta_level',
          label: 'External Meta-Framework Ascent',
          stems: ['meta', 'external', 'outside', 'higher', 'stronger', 'hierarchy', 'framework'],
          requiredPolarity: 'any',
          missingHint: 'State how stepping outside to a stronger external meta-level framework resolves the verification deadlock.',
        },
      ],
      forbiddenClaims: [
        {
          pattern: '(?:can|able\\s+to|easily|always)\\s+(?:prove|verify|establish)\\s+its\\s+own\\s+consistency\\s+(?:from\\s+within|internally|inside)',
          reason: 'A sufficiently expressive consistent system cannot prove its own consistency from inside itself.',
        },
        {
          pattern: '(?:no|never|without\\s+any|does\\s+not\\s+need)\\s+(?:external|meta-?level|meta-?system|outside\\s+framework)',
          reason: 'Validating consistency non-circularly requires ascending to an external meta-level system.',
        },
      ],
      contradictionPairs: [
        {
          affirmPattern: 'system\\s+can\\s+prove\\s+its\\s+own\\s+consistency',
          negatePattern: '(?:cannot|never|unprovable|fails?\\s+to)\\s+(?:prove|verify).*consistency',
          reason: 'Answer simultaneously claims the system can and cannot prove its own consistency.',
        },
      ],
      softFlaws: [
        {
          pattern: 'both\\s+complete\\s+and\\s+consistent|complete\\s+without\\s+limitation|prove\\s+every\\s+truth\\s+inside',
          reason: 'Clarify that Gödelian expressiveness prevents simultaneous internal completeness and self-proved consistency.',
        },
      ],
      causalBridgeGroups: [
        ['self-refer', 'circular', 'gödel', 'godel', 'paradox', 'diagonal', 'internal', 'within'],
        ['meta', 'external', 'outside', 'higher', 'stronger', 'hierarchy', 'framework'],
      ],
      weakBridgeReason: 'Connect why internal self-reference blocks self-proof directly to why an external meta-level escapes that loop.',
    },
    workspaceMode: 'rule_shift',
    workspaceData: {
      mode: 'rule_shift',
      headline: 'Internal Verification Trap vs External Meta-Language',
      leftColumnTitle: 'Inside System S',
      leftItems: ['Uses only rules inside S', 'Inconsistent S proves anything (explosion)', 'Diagonal statements evade internal closure'],
      rightColumnTitle: 'Stepping Outside S',
      rightItems: ['Ascends to broader meta-framework', 'Evaluates S non-circularly', 'Separates truth from internal provability'],
      tacticalNote: 'Ask why a broken rulebook "vouching for itself" proves nothing, and how escaping that loop works.',
    },
    validSolutions: [
      'Because internal self-reference creates circular paradoxes like Gödelian undecidability, a consistent system cannot prove its own consistency without becoming incomplete; stepping to an external meta-level framework resolves it.',
    ],
    defaultErrorPattern: 'assumed_untested',
    multipleSolutionsNote: 'Evaluated strictly for causal coherence across self-reference, consistency/incompleteness, and meta-system ascent.',
    explanation:
      'By Gödel’s Second Incompleteness Theorem, any sufficiently expressive consistent system cannot prove its own consistency from within without circularity (an inconsistent system proves everything via explosion). Resolving verification non-circularly requires stepping to a stronger external meta-framework.',
    postSolvePrompt: {
      question: 'Why does an inconsistent system readily "prove" its own consistency while a sound one cannot?',
      patternPrompt: 'Where in everyday reasoning do we trust an internal audit that shares the exact flaws it checks?',
      takeaway: 'Never accept a system as its own sole judge; step outward to an independent criterion.',
    },
    cognitiveTools: {
      decomposition: [
        'Criterion 1: Explain why internal self-reference becomes circular.',
        'Criterion 2: Connect consistency to unprovability / incompleteness.',
        'Criterion 3: Explain escaping via a stronger external meta-framework.',
      ],
      dependencyMapping: ['Self-reference + Consistency → Unprovable internal truth → External Meta-level.'],
      anomalyHighlight: 'Inconsistent systems prove arbitrary statements—so self-endorsement proves nothing.',
      symbolicTranslation: 'Con(S) requires S′ ⊃ S for non-circular grounding.',
      alternativeHypotheses: ['Frame via Gödelian incompleteness or Tarskian semantic hierarchy.'],
    },
    hints: {
      1: makeTierHints(
        'Think about what goes wrong when a rulebook tries to certify its own reliability using only sentences written inside itself.',
        'Separate three ideas: why self-reference loops circularly, why consistency blocks full internal self-proof, and what outside standpoint breaks the circle.',
        'Examine the asymmetry between consistent and inconsistent systems under internal self-verification.',
        'Connect diagonal self-reference with Tarskian / Gödelian meta-system ascent.'
      ),
      2: makeTierHints(
        'Explain why an inconsistent chamber can still falsely claim to have zero contradictions, and name what higher vantage point escapes that trap.',
        'Make sure your explanation links internal unprovability directly to why stepping to an external framework resolves it.',
        'Ensure causal flow connects self-referential circularity -> consistency/incompleteness bound -> external meta-system.',
        'Check against contradiction or claiming simultaneous completeness and internal self-proof.'
      ),
      3: makeTierHints(
        'Read your draft for causal logic rather than keywords alone: state clearly why it CANNOT certify itself inside and why an outside framework works.',
        'Check polarity and clarity across all three rubric pillars before submitting.',
        'Verify your bridge explains how S′ outside S avoids internal circularity without implying S is complete.',
        'Audit causal coherence across all three criteria.'
      ),
    },
    hintSpeakers: {
      1: 'Watcher Seal',
      2: 'Jacob (Synthesis Note)',
      3: 'Ilya (Echoed Margin)',
    },
    rewards: { xp: 200, ip: 65, kp: 35, ep: 1 },
  },

  // STAGE VI: THE INFINITE POSSIBILITY
  's6_convergence_nexus': {
    id: 's6_convergence_nexus',
    title: 'Convergence of Dual Realities',
    universeId: 'stage_6',
    regionId: 'r10_convergence_nexus',
    stageNumber: 6,
    modeKey: 'stage_6',
    category: 'hybrid',
    difficulty: 'Endgame',
    difficultyScore: 92,
    relevantAttributes: ['analytical', 'abstract', 'creative', 'metacognition', 'spatial'],
    interactionType: 'numeric_input',
    narrative: {
      context: 'At the Convergence Nexus, echoes from prior universes lock into one numeric keystone.',
      intro: 'Two intersecting projections guard the Sovereign’s threshold: a modular congruence system and a matrix trace primality constraint.',
      investigationClues: [
        {
          id: 'clue_s6_1_intersect',
          title: 'Dual-Projection Lens',
          source: 'Nexus Astrolabe',
          body: 'Coupling two coprime moduli narrows integers below 50 to a tiny residue set before testing matrix trace.',
        },
      ],
      consequences: 'Resolving the Convergence Key opens the final chamber of The Architect of Possibility.',
      storyEventId: 'story_s6_convergence_key',
      storyEventTitle: 'Convergence of Dual Realities',
      linkedArchiveIds: ['arch_infinite_possibility', 'arch_finite_differences'],
      linkedDiscoveryIds: ['disc_s6_omega'],
    },
    objective: 'Find the unique integer X (0 < X < 50) satisfying both the modular ring equations and the prime matrix trace constraint.',
    instructions: 'Combine the two modular congruences with the matrix trace primality test and enter the unique integer X.',
    rules: [
      '0 < X < 50.',
      'X ≡ 3 (mod 5) and X ≡ 4 (mod 7).',
      'For M = [[X, 2], [3, 5]], Trace(M) = X + 5 must be PRIME.',
    ],
    promptBody:
      'Intersect both Nexus projections for 0 < X < 50:\n1. X ≡ 3 (mod 5) and X ≡ 4 (mod 7)\n2. Trace([[X, 2], [3, 5]]) = X + 5 is PRIME.\nEnter the unique integer X.',
    sceneObjects: [
      {
        id: 'obj_nexus_astrolabe',
        label: 'Nexus Congruence Ring',
        locationNote: 'Center Astrolabe',
        kindTag: 'Arithmetic Ring',
        observation: 'Range bounded strictly to integers between 1 and 49; coupled moduli 5 and 7.',
      },
      {
        id: 'obj_trace_prism',
        label: 'Matrix Trace Prism',
        locationNote: 'Upper Mirror',
        kindTag: 'Structural Gate',
        observation: 'Diagonal sum X + 5 must remain prime (non-composite, > 1).',
      },
    ],
    visualData: {
      equations: [
        '0 < X < 50',
        'X mod 5 = 3',
        'X mod 7 = 4',
        'Trace(M) = X + 5 is PRIME',
      ],
    },
    workspaceMode: 'commit_plan',
    workspaceData: {
      mode: 'commit_plan',
      headline: 'Dual-Filter Sieve · Congruence Before Primality',
      rows: [
        { label: 'Constraint 1: Mod 7', primary: 'Find X < 50 with X mod 7 = 4', secondary: 'Small finite candidate list' },
        { label: 'Constraint 2: Mod 5', primary: 'Intersect with X mod 5 = 3', secondary: 'Restrict to shared residue' },
        { label: 'Constraint 3: Trace', primary: 'Test X + 5 primality', secondary: 'Confirm all 3 bounds together' },
      ],
      tacticalNote: 'Filter by the larger modulus first to shrink candidates down before testing primality.',
    },
    validSolutions: ['18'],
    defaultErrorPattern: 'ignored_detail',
    explanation:
      'Integers < 50 with X ≡ 4 (mod 7) are 4, 11, 18, 25, 32, 39, 46. Filtering for X ≡ 3 (mod 5) (last digit 3 or 8) leaves only 18. Check Trace(M) = 18 + 5 = 23 (prime). Unique X = 18.',
    postSolvePrompt: {
      question: 'Why did sieving by mod 7 before mod 5 speed up locating the unique solution?',
      patternPrompt: 'What would change if the upper bound grew from 50 to 100?',
      takeaway: 'Constrain candidate sets with the tightest modulus first, then check secondary conditions cleanly.',
    },
    cognitiveTools: {
      decomposition: [
        'Generate integers < 50 satisfying the mod 7 remainder.',
        'Filter those candidates by the mod 5 remainder.',
        'Verify X + 5 is prime.',
      ],
      dependencyMapping: ['Coprime moduli 5 and 7 determine a unique residue mod 35.'],
      anomalyHighlight: 'Base-10 numbers congruent to 3 (mod 5) take only two possible final digits.',
      symbolicTranslation: 'CRT(5, 7) on (3, 4) intersected with [1, 49] and Primality(X + 5).',
      alternativeHypotheses: ['Solve mod 35 directly, then check multiples inside (0, 50).'],
    },
    hints: {
      1: makeTierHints(
        'Start with the wider step size: write out the few positive numbers under 50 that leave remainder 4 when divided by 7.',
        'Notice what final digits a number must end in to leave remainder 3 when divided by 5, then cross-check your mod-7 list.',
        'Apply the Chinese Remainder Theorem across coprime moduli 5 and 7 inside (0, 50).',
        'Resolve the unique residue mod 35 in range and verify trace primality.'
      ),
      2: makeTierHints(
        'Check each number in your mod-7 list against remainder 3 mod 5 before checking whether X + 5 is prime.',
        'Verify that no second candidate mod 35 fits strictly below 50.',
        'Confirm your surviving candidate satisfies both remainders and yields a prime trace.',
        'Audit CRT candidate uniqueness within 1..49.'
      ),
      3: makeTierHints(
        'Verify all three rules one last time on your candidate integer: strictly under 50, remainder 3 mod 5, remainder 4 mod 7, and X + 5 prime.',
        'Ensure you enter X itself rather than the prime Trace value (X + 5).',
        'Distinguish X from Trace(M) before committing.',
        'Confirm target variable X vs trace output.'
      ),
    },
    hintSpeakers: {
      1: 'Nexus Astrolabe',
      2: 'Jacob (Margin Study)',
      3: 'Ilya (Echoed Note)',
    },
    rewards: { xp: 260, ip: 90, kp: 50, ep: 2 },
  },
};

// ============================================================================
// PROCEDURAL PUZZLE GENERATOR (Validated Offline Engine)
// ============================================================================

export function generateProceduralPuzzle(
  category: PuzzleCategory,
  difficultyScore: number,
  seed: number,
  existingSignatures: Set<string> = new Set(),
  stageNumber: number = 1
): PuzzleSpec {
  const clampedDiff = Math.max(12, Math.min(98, Math.round(difficultyScore)));
  let attemptSeed = seed;

  for (let attempt = 0; attempt < 8; attempt++) {
    const rng = createSeededRng(attemptSeed);
    const puzzle = buildProceduralByCategory(category, clampedDiff, attemptSeed, rng, stageNumber);
    puzzle.modeKey = 'procedural';
    const report = validatePuzzleQuality(puzzle, existingSignatures);
    if (report.isValid) {
      puzzle.qualityReport = report;
      if (!puzzle.narrative) {
        puzzle.narrative = {
          context: `Procedural Dimensional Rift emerging within Stage ${stageNumber}'s conceptual manifold.`,
          intro: `An unstable ${puzzle.category.replace('_', ' ')} tear pulses at complexity ${clampedDiff}/100, awaiting structural stabilization.`,
          consequences: `Resolving this rift stabilizes Stage ${stageNumber} invariants and records another field specimen in Jacob's Book.`,
        };
      }
      return puzzle;
    }
    attemptSeed += 7919;
  }

  const rng = createSeededRng(seed + 99991);
  const fallback = buildProceduralMathematical(clampedDiff, seed + 99991, rng, stageNumber);
  fallback.modeKey = 'procedural';
  fallback.qualityReport = validatePuzzleQuality(fallback, new Set());
  return fallback;
}

function buildProceduralByCategory(
  category: PuzzleCategory,
  difficultyScore: number,
  seed: number,
  rng: () => number,
  stageNumber: number
): PuzzleSpec {
  switch (category) {
    case 'mathematical':
      return buildProceduralMathematical(difficultyScore, seed, rng, stageNumber);
    case 'formal_logic':
      return buildProceduralFormalLogic(difficultyScore, seed, rng, stageNumber);
    case 'pattern':
      return buildProceduralPattern(difficultyScore, seed, rng, stageNumber);
    case 'spatial':
      return buildProceduralSpatial(difficultyScore, seed, rng, stageNumber);
    case 'scientific':
      return buildProceduralScientific(difficultyScore, seed, rng, stageNumber);
    case 'linguistic':
      return buildProceduralLinguistic(difficultyScore, seed, rng, stageNumber);
    case 'strategic':
      return buildProceduralStrategic(difficultyScore, seed, rng, stageNumber);
    case 'philosophical':
      return buildProceduralPhilosophical(difficultyScore, seed, rng, stageNumber);
    case 'hybrid':
      return buildProceduralHybrid(difficultyScore, seed, rng, stageNumber);
  }
}

function buildProceduralMathematical(
  diff: number,
  seed: number,
  rng: () => number,
  stageNumber: number
): PuzzleSpec {
  const band = difficultyBandFromScore(diff);
  const cfg = DIFFICULTY_CONFIG.procedural;

  if (diff >= 60) {
    const t0 = Math.floor(rng() * 3) + 1;
    const t1 = Math.floor(rng() * 4) + 2;
    const w2 = rng() > 0.5 ? 2 : 3;
    const kShift = Math.floor(rng() * 3) + 1;
    const seq = [t0, t1];
    for (let i = 2; i < 6; i++) {
      seq.push(seq[i - 1] + w2 * seq[i - 2] - kShift);
    }
    const fifth = seq[4];
    const sixth = seq[5];
    const firstFive = seq.slice(0, 5);
    return {
      id: `proc_math_${seed}`,
      title: `Coupled Recurrence Manifold #${seed % 1000}`,
      universeId: `stage_${stageNumber}`,
      regionId: 'procedural_rift',
      stageNumber,
      modeKey: 'procedural',
      category: 'mathematical',
      difficulty: band,
      difficultyScore: diff,
      relevantAttributes: ['analytical', 'abstract', 'working_memory'],
      interactionType: 'numeric_input',
      objective: 'Deduce the two-step linear recurrence with constant shift and compute the 6th integer.',
      instructions: 'Determine how each term depends on its two immediate predecessors plus a fixed constant shift k, then evaluate term 6.',
      rules: [
        'Each term from index 3 onward obeys a(n) = a(n-1) + m·a(n-2) + c for fixed integers m and c.',
        `Synthesis depth level ${cfg.synthesisDepth}: verify your inferred (m, c) across ALL transitions in the sample before predicting term 6.`,
      ],
      promptBody: `An advanced harmonic register emits: ${firstFive.join(', ')}, ?. Deduce the recurrence and compute the 6th emission.`,
      visualData: { sequence: [...firstFive, '?'] },
      validSolutions: [String(sixth)],
      defaultErrorPattern: 'assumed_untested',
      explanation: `Solving across transitions yields m=${w2} and shift c=-${kShift}, i.e., a(n) = a(n-1) + ${w2}·a(n-2) - ${kShift}. At n=6: ${fifth} + ${w2}(${seq[3]}) - ${kShift} = ${sixth}.`,
      postSolvePrompt: {
        question: 'Why was verifying (m, c) across two independent transitions necessary before projecting term 6?',
        patternPrompt: 'What distinguishes a coupled two-step recurrence from a quadratic finite-difference sequence?',
        takeaway: 'Solve unknown linear coefficients over at least two consecutive transitions and validate on a third.',
      },
      cognitiveTools: {
        decomposition: [
          'Test small integer weights m on a(n-2) across transitions n=3 and n=4.',
          'Check whether the remaining offset c stays constant across every transition.',
        ],
        dependencyMapping: ['Each term blends two prior states plus a constant shift.'],
        anomalyHighlight: 'Second differences do not settle to a constant here—look back two terms.',
        symbolicTranslation: 'a(n) - a(n-1) = m·a(n-2) + c.',
        alternativeHypotheses: ['Write simultaneous equations for n=3 and n=4 to solve (m, c).'],
      },
      hints: {
        1: makeTierHints(
          'Compare each number against the previous number plus a small multiple of the one two steps back.',
          'Compute a(n) - a(n-1) and compare it against a(n-2) across terms 3, 4, and 5.',
          'Test a depth-2 inhomogeneous recurrence a(n) = a(n-1) + m·a(n-2) + c.',
          'Set up two transition differences to isolate integer weight m and constant shift c.'
        ),
        2: makeTierHints(
          'Pick the two transitions from terms 3 and 4 to solve for the multiplier m on a(n-2) and the constant shift.',
          'Verify your candidate (m, c) reproduces term 5 accurately before touching term 6.',
          'Solve Δ(n) - Δ(n-1) against a(n-2) - a(n-3) to extract m cleanly.',
          'Verify m and c invariance across n = 3, 4, 5.'
        ),
        3: makeTierHints(
          'Apply your verified (m, c) rule carefully to the 4th and 5th numbers to generate the 6th.',
          'Double-check arithmetic sign on the constant shift c before entering term 6.',
          'Evaluate term 6 using the verified depth-2 recurrence.',
          'Confirm recurrence consistency at n = 6.'
        ),
      },
      rewards: { xp: 52 + Math.round(diff * 1.4), ip: 20 + Math.round(diff * 0.4), kp: 12 + Math.round(diff * 0.2) },
      isProcedural: true,
      seed,
    };
  }

  const a = Math.floor(rng() * (diff > 50 ? 5 : 3)) + 1;
  const b = Math.floor(rng() * 6) + 1;
  const c = Math.floor(rng() * 12) + 2;
  const terms = [1, 2, 3, 4, 5].map((n) => a * n * n + b * n + c);
  const answer = a * 36 + b * 6 + c;

  return {
    id: `proc_math_${seed}`,
    title: `Harmonic Polynomial #${seed % 1000}`,
    universeId: `stage_${stageNumber}`,
    regionId: 'procedural_rift',
    stageNumber,
    modeKey: 'procedural',
    category: 'mathematical',
    difficulty: band,
    difficultyScore: diff,
    relevantAttributes: ['analytical', 'pattern_recognition', 'abstract'],
    interactionType: 'numeric_input',
    objective: 'Determine the 6th term generated by the underlying integer law.',
    instructions: 'Analyze the first five terms, check higher-order differences, and enter the exact 6th integer.',
    rules: [
      'A low-degree integer law generates terms at n = 1, 2, 3, 4, 5, 6.',
      'Check difference layers systematically.',
    ],
    promptBody: `A procedural resonance stream emits: ${terms.join(', ')}, ?. Compute the 6th emission.`,
    visualData: { sequence: [...terms, '?'] },
    validSolutions: [String(answer)],
    defaultErrorPattern: 'obvious_reading',
    explanation: `First differences are ${terms[1] - terms[0]}, ${terms[2] - terms[1]}, ${terms[3] - terms[2]}, ${terms[4] - terms[3]}, rising by constant Δ² = ${2 * a}. Next jump is ${terms[4] - terms[3] + 2 * a}, giving ${answer} (${a}n² + ${b}n + ${c}).`,
    postSolvePrompt: {
      question: 'Which difference layer became invariant first?',
      patternPrompt: 'How can you verify your extrapolated value without guessing?',
      takeaway: 'Tabulate differences until a constant invariant layer emerges.',
    },
    cognitiveTools: {
      decomposition: ['Compute adjacent first differences.', 'Check second-order differences between adjacent gaps.'],
      dependencyMapping: ['Term 6 extends Term 5 by the next extrapolated difference.'],
      anomalyHighlight: 'Look one layer deeper than adjacent differences.',
      symbolicTranslation: 'Test Δ²a(n) invariance across terms 1..5.',
      alternativeHypotheses: ['Finite difference table vs quadratic interpolation.'],
    },
    hints: {
      1: makeTierHints(
        'Subtract each number from the next to see the sequence of gaps.',
        'Compute the first-order differences between consecutive terms.',
        'Evaluate Δa(n) and test Δ²a(n).',
        'Inspect the second-order finite difference operator.'
      ),
      2: makeTierHints(
        'Check how much the gaps themselves increase from one step to the next.',
        'Verify whether the second difference stays identical across every pair.',
        'Extrapolate the next first difference from the constant second difference.',
        'Extend Δ² invariance cleanly to the 5th gap.'
      ),
      3: makeTierHints(
        'Add your next gap onto the fifth term and verify parity/size carefully.',
        'Double-check your addition onto the 5th term before submitting.',
        'Confirm agreement between difference extrapolation and quadratic fit.',
        'Verify n = 6 evaluation.'
      ),
    },
    rewards: { xp: 40 + Math.round(diff * 1.4), ip: 16 + Math.round(diff * 0.4), kp: 8 + Math.round(diff * 0.2) },
    isProcedural: true,
    seed,
  };
}

function buildProceduralFormalLogic(
  diff: number,
  seed: number,
  rng: () => number,
  stageNumber: number
): PuzzleSpec {
  const band = difficultyBandFromScore(diff);
  const entities = ['Vex', 'Kael', 'Orin', 'Sola'];

  if (diff >= 58) {
    const names = entities.slice();
    const p4 = shuffleWithRng([0, 1, 2, 3], rng);
    const target = p4[0];
    const a = p4[1];
    const b = p4[2];
    const decoy = p4[3];

    const statements4 = [
      `Witness 1 (${names[0]}): "The Core is in ${names[a]} or ${names[b]}."`,
      `Witness 2 (${names[1]}): "The Core is NOT in ${names[a]}."`,
      `Witness 3 (${names[2]}): "The Core resides in ${names[target]}."`,
      `Witness 4 (${names[3]}): "The Core resides in ${names[b]}."`,
    ];
    const solId = names[target].toLowerCase();
    const shuffledOptions: PuzzleOption[] = shuffleWithRng(
      names.map((n) => ({
        id: n.toLowerCase(),
        label: `Node ${n}`,
        detail: `Assign Core to ${n}`,
        exploitedPattern: n.toLowerCase() === solId ? undefined : 'ignored_detail',
      })),
      rng
    );

    return {
      id: `proc_logic_${seed}`,
      title: `Four-Node Deductive Quorum #${seed % 1000}`,
      universeId: `stage_${stageNumber}`,
      regionId: 'procedural_rift',
      stageNumber,
      modeKey: 'procedural',
      category: 'formal_logic',
      difficulty: band,
      difficultyScore: diff,
      relevantAttributes: ['analytical', 'linguistic', 'metacognition'],
      interactionType: 'multiple_choice',
      objective: 'Determine which single node houses the Core given an exact two-truth quorum.',
      instructions: 'Exactly ONE of the four nodes holds the Core, and exactly TWO of the four witness broadcasts are TRUE.',
      rules: [
        'Exactly 1 of {Vex, Kael, Orin, Sola} holds the Core.',
        'Exactly 2 of the 4 witness statements are TRUE; the other 2 are FALSE.',
      ],
      promptBody: 'Cross-examine four witness broadcasts under a 2-truth quorum. Which node holds the Core?',
      visualData: { premises: statements4 },
      options: shuffledOptions,
      validSolutions: [solId],
      defaultErrorPattern: 'ignored_detail',
      explanation: `Checking all four candidate locations: ${names[a]} yields 1 truth, ${names[b]} yields 3 truths, ${names[decoy]} yields 1 truth, and ONLY ${names[target]} yields exactly 2 truths (Witnesses 2 and 3).`,
      postSolvePrompt: {
        question: 'Why did counting truths in all four candidate worlds outperform trusting any single witness claim?',
        patternPrompt: 'Which witness over-satisfied the 2-truth quorum when tested?',
        takeaway: 'In quorum puzzles, check the exact count of true statements across every candidate assignment.',
      },
      cognitiveTools: {
        decomposition: [
          'Test all four candidate nodes as a 4-row truth table.',
          'Count how many witness broadcasts come out TRUE in each row.',
        ],
        dependencyMapping: ['Check which candidates trigger either 1 truth or 3 truths instead of 2.'],
        anomalyHighlight: 'Two broadcasts can overlap positively, pushing a candidate over the 2-truth cap.',
        symbolicTranslation: '∑_{i=1..4} Truth(W_i | Core = X) = 2.',
        alternativeHypotheses: ['Eliminate 1-truth and 3-truth rows systematically.'],
      },
      hints: {
        1: makeTierHints(
          'Make a 4-row checklist testing each node as the Core and counting how many witnesses turn out TRUE.',
          'Check whether any candidate satisfies Witnesses 1, 2, and 4 all at once—exceeding the 2-truth limit.',
          'Eliminate nodes producing 1 or 3 true broadcasts under the ∑ T_i = 2 quorum.',
          'Solve ∑ T_i = 2 exhaustively over the 4-node domain.'
        ),
        2: makeTierHints(
          'Test whether the node named in Witness 4 yields too many truths, and whether the node excluded by Witness 2 yields too few.',
          'Compare all 4 truth counts carefully before picking a candidate.',
          'Verify which candidate keeps exactly two statements TRUE and two FALSE.',
          'Audit truth counts across all four hypothetical assignments.'
        ),
        3: makeTierHints(
          'Once you find a candidate with 2 truths, confirm every other node yields either 1 or 3 truths before submitting.',
          'Verify all four witnesses against your surviving node one final time.',
          'Confirm uniqueness of the 2-truth quorum model.',
          'Verify uniqueness across all 4 worlds.'
        ),
      },
      rewards: { xp: 52 + Math.round(diff * 1.4), ip: 20 + Math.round(diff * 0.4), kp: 12 + Math.round(diff * 0.2) },
      isProcedural: true,
      seed,
    };
  }

  const names = entities.slice(0, 3);
  const perm = shuffleWithRng([0, 1, 2], rng);
  const solo = perm[0];
  const pA = perm[1];
  const pB = perm[2];

  const statements = ['', '', ''];
  statements[pA] = `${names[pA]} says: "The Core resides in ${names[pA]}."`;
  statements[pB] = `${names[pB]} says: "The Core does NOT reside in ${names[pA]}."`;
  statements[solo] = `${names[solo]} says: "The Core does NOT reside in ${names[solo]}."`;

  const solId = names[solo].toLowerCase();
  const shuffledOptions: PuzzleOption[] = shuffleWithRng(
    names.map((n) => ({
      id: n.toLowerCase(),
      label: `Node ${n}`,
      detail: `Assign Core to ${n}`,
      exploitedPattern: n.toLowerCase() === solId ? undefined : 'obvious_reading',
    })),
    rng
  );

  return {
    id: `proc_logic_${seed}`,
    title: `Axiomatic Verdict #${seed % 1000}`,
    universeId: `stage_${stageNumber}`,
    regionId: 'procedural_rift',
    stageNumber,
    modeKey: 'procedural',
    category: 'formal_logic',
    difficulty: band,
    difficultyScore: diff,
    relevantAttributes: ['analytical', 'linguistic', 'metacognition'],
    interactionType: 'multiple_choice',
    objective: 'Identify the single node holding the Core.',
    instructions: 'Exactly ONE of the three nodes holds the Core, and exactly ONE of the three declarations is TRUE.',
    rules: [
      'Exactly 1 of {Vex, Kael, Orin} holds the Core.',
      'Exactly 1 of the 3 statements is TRUE.',
    ],
    promptBody: `Three autonomous nodes broadcast mutually constraining claims. Determine which node holds the Core.`,
    visualData: { premises: statements },
    options: shuffledOptions,
    validSolutions: [solId],
    defaultErrorPattern: 'obvious_reading',
    explanation: `${names[pA]} and ${names[pB]} directly contradict each other about ${names[pA]}, spending the single TRUE slot. Thus ${names[solo]}'s claim ("NOT in ${names[solo]}") must be FALSE—proving the Core resides in ${names[solo]}.`,
    postSolvePrompt: {
      question: 'Which two declarations guaranteed one truth between them regardless of where the Core sat?',
      patternPrompt: 'What happens if you ignore the contradiction pair and trust a random speaker?',
      takeaway: 'Locate P / ¬P pairs first whenever total truth count is fixed.',
    },
    cognitiveTools: {
      decomposition: [
        'Test all 3 locations and count TRUE statements in each case.',
        'Look for two broadcasts asserting direct opposites about the same node.',
      ],
      dependencyMapping: ['A strict negation pair always contributes exactly 1 TRUE declaration.'],
      anomalyHighlight: 'Two broadcasts reference the exact same target with opposite polarity.',
      symbolicTranslation: 'P ⊕ ¬P consumes the single TRUE slot.',
      alternativeHypotheses: ['Truth-table exhaustion across all 3 rows.'],
    },
    hints: {
      1: makeTierHints(
        'Two nodes make directly opposite claims about the exact same node.',
        'Find the contradictory pair among the three declarations.',
        'Locate the P / ¬P partition consuming the truth quota.',
        'Evaluate T(pair) = 1 under classical bivalence.'
      ),
      2: makeTierHints(
        'Since one of the two opposite claims must be true, what does the 1-truth limit force for the remaining third node’s claim?',
        'Check all three candidate rows by hand and count true claims per row.',
        'Negate the forced-false claim once the contradiction pair spends the truth slot.',
        'Audit consistency on the 3-row truth table.'
      ),
      3: makeTierHints(
        'Verify that your candidate produces 1 True and 2 False statements across all three broadcasts.',
        'Confirm no other node yields a truth count of 1.',
        'Validate T-count = 1 before locking.',
        'Verify uniqueness.'
      ),
    },
    rewards: { xp: 42 + Math.round(diff * 1.4), ip: 18 + Math.round(diff * 0.4), kp: 10 + Math.round(diff * 0.2) },
    isProcedural: true,
    seed,
  };
}

function buildProceduralPattern(
  diff: number,
  seed: number,
  rng: () => number,
  stageNumber: number
): PuzzleSpec {
  const band = difficultyBandFromScore(diff);
  const m = Math.floor(rng() * 2) + 2;
  const k = Math.floor(rng() * 5) + 1;
  const start = Math.floor(rng() * 4) + 2;
  const seq = [start];
  for (let i = 1; i < 5; i++) {
    seq.push(seq[i - 1] * m + (i % 2 === 1 ? k : -k));
  }
  const next = seq[4] * m + (5 % 2 === 1 ? k : -k);

  return {
    id: `proc_pattern_${seed}`,
    title: `Alternating Operator #${seed % 1000}`,
    universeId: `stage_${stageNumber}`,
    regionId: 'procedural_rift',
    stageNumber,
    modeKey: 'procedural',
    category: 'pattern',
    difficulty: band,
    difficultyScore: diff,
    relevantAttributes: ['pattern_recognition', 'working_memory'],
    interactionType: 'numeric_input',
    objective: 'Discover the alternating recursive operator and compute the 6th term.',
    instructions: 'Inspect how each term transforms into the next, checking both scaling factor and parity-based sign alternation.',
    rules: [
      'A constant multiplier and an alternating +/- offset govern every transition.',
    ],
    promptBody: `Decode the alternating signal: ${seq.join(', ')}, ?.`,
    visualData: { sequence: [...seq, '?'] },
    validSolutions: [String(next)],
    defaultErrorPattern: 'ignored_detail',
    explanation: `Each step multiplies by ${m} and alternates +${k} (odd steps) and -${k} (even steps). Step 5 adds +${k}: ${seq[4]} × ${m} + ${k} = ${next}.`,
    postSolvePrompt: {
      question: 'How did separating the multiplier from the residual make the alternating offset visible?',
      patternPrompt: 'Which sign mistake happens on Step 5 if you lose track of transition parity?',
      takeaway: 'Factor out approximate ratios first, then inspect the sign pattern of the residuals.',
    },
    cognitiveTools: {
      decomposition: [
        'Compare adjacent ratios between consecutive terms.',
        'Inspect residual offsets after multiplying by the integer scale factor.',
      ],
      dependencyMapping: ['Residual sign alternates on odd vs even transition indices.'],
      anomalyHighlight: 'Look at the parity (+ vs -) of the remainder at each transition.',
      symbolicTranslation: 'a(n+1) = m·a(n) + (-1)^(step) · k.',
      alternativeHypotheses: ['Verify consistent |k| across all four observed steps.'],
    },
    hints: {
      1: makeTierHints(
        'Look at the approximate ratio between consecutive terms—each step roughly doubles or triples plus/minus a small nudge.',
        'Test small integer multipliers (2 or 3) and record the exact remainder at each step.',
        'Separate the constant linear scale factor from the parity-alternating perturbation.',
        'Evaluate residual r(i) = a(i+1) - m·a(i) across steps 1..4.'
      ),
      2: makeTierHints(
        'Track whether each step overshoots or undershoots the clean multiple—notice how the sign flips every turn.',
        'Verify your inferred multiplier and offset magnitude across all four observed transitions.',
        'Determine step parity for transition 5->6 before applying the residual sign.',
        'Confirm sign alternation parity on step 5.'
      ),
      3: makeTierHints(
        'Double-check whether transition 5 takes + or - before adding your offset onto the multiplied 5th term.',
        'Verify all four prior steps match your exact rule before entering term 6.',
        'Check transition 5 arithmetic carefully.',
        'Confirm step 5 output.'
      ),
    },
    rewards: { xp: 45 + Math.round(diff * 1.4), ip: 18 + Math.round(diff * 0.4), kp: 10 + Math.round(diff * 0.2) },
    isProcedural: true,
    seed,
  };
}

function buildProceduralSpatial(
  diff: number,
  seed: number,
  rng: () => number,
  stageNumber: number
): PuzzleSpec {
  const band = difficultyBandFromScore(diff);
  const size = diff >= 65 ? 4 : 3;
  const initialGrid: number[][] = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (__, c) => (rng() > 0.55 || (r === 0 && c === 0) ? 1 : 0))
  );
  initialGrid[0][0] = 1;
  initialGrid[0][size - 1] = 0;
  initialGrid[size - 1][size - 1] = 1;

  const useReflection = rng() > 0.5;
  const target = useReflection ? reflectGridHorizontal(initialGrid) : rotateGrid90CW(initialGrid);
  const opName = useReflection ? 'Horizontal Mirror Reflection' : '90° Clockwise Rotation';

  return {
    id: `proc_spatial_${seed}`,
    title: `Manifold Transform #${seed % 1000}`,
    universeId: `stage_${stageNumber}`,
    regionId: 'procedural_rift',
    stageNumber,
    modeKey: 'procedural',
    category: 'spatial',
    difficulty: band,
    difficultyScore: diff,
    relevantAttributes: ['spatial', 'working_memory'],
    interactionType: 'spatial_grid',
    objective: `Apply a ${opName} to the ${size}×${size} source lattice.`,
    instructions: `Toggle cells in the target lattice to construct the exact ${opName} of the source lattice.`,
    rules: [
      useReflection
        ? `Reflection mirrors columns left-to-right: (r, c) ↦ (r, ${size - 1} - c).`
        : `90° CW rotation maps (r, c) ↦ (c, ${size - 1} - r).`,
    ],
    promptBody: `Reconstruct the ${size}×${size} spatial sigil under a ${opName}.`,
    visualData: {
      spatialGrid: {
        size,
        initialGrid,
        targetPattern: target,
        ruleSummary: opName,
      },
    },
    validSolutions: [serializeGrid(target)],
    defaultErrorPattern: 'assumed_untested',
    explanation: `Applying ${opName} row by row maps the source lattice cleanly onto ${serializeGrid(target)}.`,
    postSolvePrompt: {
      question: 'Which anchor cells confirmed orientation without recomputing the entire grid mentally?',
      patternPrompt: 'What conservation invariant catches accidental clicks immediately?',
      takeaway: 'Anchor asymmetric corners first and verify active cell conservation.',
    },
    cognitiveTools: {
      decomposition: [
        useReflection
          ? 'Reverse each row left-to-right independently.'
          : 'Turn Row 0 into the rightmost column, continuing row by row.',
      ],
      dependencyMapping: ['Total active cell count remains strictly conserved.'],
      anomalyHighlight: 'Verify asymmetric corners before interior tiles.',
      symbolicTranslation: useReflection
        ? `M(r, c) = S(r, ${size - 1} - c)`
        : `R(r, c) = S(${size - 1} - c, r)`,
      alternativeHypotheses: ['Verify corners first to anchor orientation.'],
    },
    hints: {
      1: makeTierHints(
        'Count the active tiles in the source first so your total active count matches.',
        'Anchor the four corners before filling interior cells.',
        'Map coordinates explicitly using the stated transformation rule.',
        'Verify corner orbits and count conservation.'
      ),
      2: makeTierHints(
        useReflection ? 'Mirror one horizontal row at a time from left to right.' : 'Turn each horizontal row into a vertical column from right to left.',
        'Check your top row against its mapped source edge or row.',
        'Apply the coordinate formula cell-by-cell.',
        'Project source rows onto transformed basis vectors.'
      ),
      3: makeTierHints(
        'Verify each corner cell and check that total active cells match the source grid exactly.',
        'Audit each target row independently against the stated rule.',
        'Verify no reflection/rotation confusion on asymmetric corners.',
        'Confirm coordinate bijection across all grid positions.'
      ),
    },
    rewards: { xp: 48 + Math.round(diff * 1.4), ip: 18 + Math.round(diff * 0.4), kp: 10 + Math.round(diff * 0.2) },
    isProcedural: true,
    seed,
  };
}

function buildProceduralScientific(
  diff: number,
  seed: number,
  rng: () => number,
  stageNumber: number
): PuzzleSpec {
  const band = difficultyBandFromScore(diff);
  const alpha = Math.floor(rng() * 3) + 2;
  const beta = Math.floor(rng() * 3) + 1;
  const t1 = { x: 2, y: 1, z: 5, out: alpha * 2 + beta * 1 };
  const t2 = { x: 2, y: 3, z: 9, out: alpha * 2 + beta * 3 };
  const t3 = { x: 4, y: 3, z: 1, out: alpha * 4 + beta * 3 };
  const t4 = { x: 5, y: 4, z: 8 };
  const ans = alpha * t4.x + beta * t4.y;

  return {
    id: `proc_sci_${seed}`,
    title: `Causal Assay #${seed % 1000}`,
    universeId: `stage_${stageNumber}`,
    regionId: 'procedural_rift',
    stageNumber,
    modeKey: 'procedural',
    category: 'scientific',
    difficulty: band,
    difficultyScore: diff,
    relevantAttributes: ['analytical', 'pattern_recognition'],
    interactionType: 'numeric_input',
    objective: 'Infer the causal weights of X, Y, and Z from controlled trials and predict Trial 4.',
    instructions: 'Determine which variables actually drive Output E across Trials 1–3 and compute Trial 4.',
    rules: [
      'Output E is a linear combination of the active causal variables.',
      'Not every measured variable necessarily affects E.',
    ],
    promptBody: `Experimental chamber readings:\n• Trial 1: X=${t1.x}, Y=${t1.y}, Z=${t1.z} → E=${t1.out}\n• Trial 2: X=${t2.x}, Y=${t2.y}, Z=${t2.z} → E=${t2.out}\n• Trial 3: X=${t3.x}, Y=${t3.y}, Z=${t3.z} → E=${t3.out}\nPredict Trial 4: X=${t4.x}, Y=${t4.y}, Z=${t4.z} → E=?`,
    visualData: {
      equations: [
        `T1: X=${t1.x}, Y=${t1.y}, Z=${t1.z} => E=${t1.out}`,
        `T2: X=${t2.x}, Y=${t2.y}, Z=${t2.z} => E=${t2.out}`,
        `T3: X=${t3.x}, Y=${t3.y}, Z=${t3.z} => E=${t3.out}`,
        `T4: X=${t4.x}, Y=${t4.y}, Z=${t4.z} => E=?`,
      ],
    },
    validSolutions: [String(ans)],
    defaultErrorPattern: 'assumed_untested',
    explanation: `Comparing T1 vs T2 (X constant) isolates Y's weight (${beta}). Comparing T2 vs T3 (Y constant) isolates X's weight (${alpha}), and checking T1 confirms Z is inert (weight 0). Thus T4 = ${alpha}(5) + ${beta}(4) = ${ans}.`,
    postSolvePrompt: {
      question: 'Which trial pair isolated Y without needing to solve three simultaneous equations?',
      patternPrompt: 'How did you verify whether Z was active or an inert decoy?',
      takeaway: 'Pair controlled trials sharing a fixed input first, then check residuals across all rows.',
    },
    cognitiveTools: {
      decomposition: [
        'Compare T1 vs T2 (where X stays fixed).',
        'Compare T2 vs T3 (where Y stays fixed).',
        'Check whether any residual remains for Z on T1..T3.',
      ],
      dependencyMapping: ['Test partial effect of each input separately.'],
      anomalyHighlight: 'Look at which measured inputs hold steady across pairs T1-T2 and T2-T3.',
      symbolicTranslation: 'E = a·X + b·Y + c·Z.',
      alternativeHypotheses: ['Controlled variable difference method.'],
    },
    hints: {
      1: makeTierHints(
        'Compare Trial 1 and Trial 2 where X stays identical, then check Trial 2 against Trial 3 where Y stays identical.',
        'Use controlled trial pairs to isolate individual slopes before worrying about Z.',
        'Take partial differences across (T1, T2) and (T2, T3) to test causal weights.',
        'Evaluate ∂E/∂Y and ∂E/∂X first, then test whether Z leaves any non-zero residual.'
      ),
      2: makeTierHints(
        'Check if multiples of X and Y alone already match Trial 1, 2, and 3—or whether Z forces an extra offset.',
        'Plug your X and Y weights back into all three trials to check whether Z changes anything.',
        'Test whether ∂E/∂Z equals zero across all three equations.',
        'Verify three-equation consistency with your inferred linear coefficients.'
      ),
      3: makeTierHints(
        'Apply your verified weights onto Trial 4’s active X and Y values carefully.',
        'Verify your Trial 4 calculation against the Trial 3 baseline.',
        'Evaluate linear causal output at T4.',
        'Confirm T4 prediction.'
      ),
    },
    rewards: { xp: 46 + Math.round(diff * 1.4), ip: 18 + Math.round(diff * 0.4), kp: 12 + Math.round(diff * 0.2) },
    isProcedural: true,
    seed,
  };
}

function buildProceduralLinguistic(
  diff: number,
  seed: number,
  rng: () => number,
  stageNumber: number
): PuzzleSpec {
  const band = difficultyBandFromScore(diff);
  const vocabPool = [
    { alien1: 'Zor-ka', alien2: 'Zor-ven', alien3: 'Mir-ka', root1: 'Star', root2: 'Light', mod1: 'Ancient', mod2: 'Rising' },
    { alien1: 'Tal-no', alien2: 'Tal-ri', alien3: 'Sol-no', root1: 'Bridge', root2: 'Gate', mod1: 'Silent', mod2: 'Open' },
    { alien1: 'Vei-lu', alien2: 'Vei-sa', alien3: 'Kro-lu', root1: 'Mind', root2: 'Void', mod1: 'Infinite', mod2: 'Still' },
  ];
  const v = vocabPool[Math.floor(rng() * vocabPool.length)];
  const targetWord = `${v.alien3.split('-')[0]}-${v.alien2.split('-')[1]}`;
  const correctMeaning = `${v.mod2} ${v.root2}`;

  const rawOptions: PuzzleOption[] = [
    { id: 'correct', label: correctMeaning, detail: `${v.mod2} modifying ${v.root2}` },
    { id: 'd1', label: `${v.mod1} ${v.root2}`, detail: `Combines ${v.mod1} with ${v.root2}`, exploitedPattern: 'ignored_detail' },
    { id: 'd2', label: `${v.mod2} ${v.root1}`, detail: `Combines ${v.mod2} with ${v.root1}`, exploitedPattern: 'obvious_reading' },
    { id: 'd3', label: `${v.root2} ${v.mod1}`, detail: `Reverses word order with ${v.mod1}`, exploitedPattern: 'assumed_untested' },
  ];

  return {
    id: `proc_ling_${seed}`,
    title: `Xenolexicon Reconstruction #${seed % 1000}`,
    universeId: `stage_${stageNumber}`,
    regionId: 'procedural_rift',
    stageNumber,
    modeKey: 'procedural',
    category: 'linguistic',
    difficulty: band,
    difficultyScore: diff,
    relevantAttributes: ['linguistic', 'analytical', 'pattern_recognition'],
    interactionType: 'multiple_choice',
    objective: `Translate the unseen compound phrase "${targetWord}".`,
    instructions: 'Deduce which morpheme carries the noun and which carries the modifier across the three bilingual pairs.',
    rules: [
      'Each hyphenated term pairs one prefix morpheme and one suffix morpheme.',
      'Grammatical order (Modifier-Noun vs Noun-Modifier) stays consistent.',
    ],
    promptBody: `Decipher the lexicon:\n• "${v.alien1}" = "${v.mod1} ${v.root1}"\n• "${v.alien2}" = "${v.mod1} ${v.root2}"\n• "${v.alien3}" = "${v.mod2} ${v.root1}"\nWhat does "${targetWord}" mean?`,
    visualData: {
      premises: [
        `${v.alien1}  =  ${v.mod1} ${v.root1}`,
        `${v.alien2}  =  ${v.mod1} ${v.root2}`,
        `${v.alien3}  =  ${v.mod2} ${v.root1}`,
        `${targetWord}  =  ?`,
      ],
    },
    options: shuffleWithRng(rawOptions, rng),
    validSolutions: ['correct'],
    defaultErrorPattern: 'ignored_detail',
    explanation: `Comparing phrases 1 & 2 isolates prefix "${v.alien1.split('-')[0]}" = "${v.mod1}" and suffix "${v.alien2.split('-')[1]}" = "${v.root2}". Comparing phrases 1 & 3 isolates prefix "${v.alien3.split('-')[0]}" = "${v.mod2}". Combining them gives "${correctMeaning}".`,
    postSolvePrompt: {
      question: 'Which two inscriptions formed a minimal pair for isolating the suffix morpheme?',
      patternPrompt: 'Why is checking syntactic order important alongside vocabulary translation?',
      takeaway: 'Align minimal pairs sharing one morpheme to separate stems cleanly from modifiers.',
    },
    cognitiveTools: {
      decomposition: ['Compare phrase 1 vs phrase 2 (shared prefix).', 'Compare phrase 1 vs phrase 3 (shared suffix).'],
      dependencyMapping: ['Shared alien morpheme maps onto shared English word.'],
      anomalyHighlight: 'Overlap between pairs isolates each half uniquely.',
      symbolicTranslation: 'f(A-B) = Map(A) + Map(B).',
      alternativeHypotheses: ['Verify whether the language places modifier before noun or noun before modifier.'],
    },
    hints: {
      1: makeTierHints(
        'Compare the first two phrases to see which alien part stays the same and which English word stays the same.',
        'Align shared prefixes and suffixes across minimal pairs.',
        'Isolate morpheme invariants via pairwise set intersection.',
        'Map prefix-to-modifier and suffix-to-noun homomorphisms.'
      ),
      2: makeTierHints(
        'Compare phrase 1 against phrase 3 to decode the second prefix and first suffix.',
        'Reconstruct both halves of the unseen target phrase separately.',
        'Verify consistent head-final word order across all three examples.',
        'Compose prefix(phrase 3) with suffix(phrase 2).'
      ),
      3: makeTierHints(
        'Put your decoded modifier and decoded noun together in the same word order shown by the examples.',
        'Confirm your chosen translation uses neither the leftover modifier nor the leftover root.',
        'Cross-check both morphemes in your choice against all three reference phrases.',
        'Confirm lexical consistency.'
      ),
    },
    rewards: { xp: 42 + Math.round(diff * 1.3), ip: 16 + Math.round(diff * 0.4), kp: 14 + Math.round(diff * 0.2) },
    isProcedural: true,
    seed,
  };
}

function buildProceduralStrategic(
  diff: number,
  seed: number,
  rng: () => number,
  stageNumber: number
): PuzzleSpec {
  const band = difficultyBandFromScore(diff);
  const budget = 10;
  const aCost = 3, aVal = 7 + Math.floor(rng() * 3);
  const bCost = 4, bVal = 9 + Math.floor(rng() * 4);
  const cCost = 5, cVal = 11 + Math.floor(rng() * 4);
  const dCost = 6, dVal = 14 + Math.floor(rng() * 3);

  const items = [
    { name: 'Beacon A', cost: aCost, val: aVal },
    { name: 'Beacon B', cost: bCost, val: bVal },
    { name: 'Beacon C', cost: cCost, val: cVal },
    { name: 'Beacon D', cost: dCost, val: dVal },
  ];

  let bestVal = 0;
  let bestCombo = '';
  for (let mask = 0; mask < 16; mask++) {
    let costSum = 0;
    let valSum = 0;
    const names: string[] = [];
    for (let i = 0; i < 4; i++) {
      if (mask & (1 << i)) {
        costSum += items[i].cost;
        valSum += items[i].val;
        names.push(items[i].name);
      }
    }
    if (costSum <= budget && valSum > bestVal) {
      bestVal = valSum;
      bestCombo = names.join(' + ');
    }
  }

  return {
    id: `proc_strat_${seed}`,
    title: `Capacitated Allocation #${seed % 1000}`,
    universeId: `stage_${stageNumber}`,
    regionId: 'procedural_rift',
    stageNumber,
    modeKey: 'procedural',
    category: 'strategic',
    difficulty: band,
    difficultyScore: diff,
    relevantAttributes: ['processing_efficiency', 'analytical', 'working_memory'],
    interactionType: 'numeric_input',
    objective: `Maximize total resonance output within a strict ${budget}-unit energy budget.`,
    instructions: 'Each beacon activates at most once. Evaluate all feasible subsets under cost ≤ 10 and enter the maximum total output.',
    rules: [
      `Total Energy Cost ≤ ${budget}.`,
      'No partial activations permitted (0/1 selection).',
    ],
    promptBody: `Allocate ${budget} Energy across up to four beacons:\n• Beacon A: Cost ${aCost}, Output ${aVal}\n• Beacon B: Cost ${bCost}, Output ${bVal}\n• Beacon C: Cost ${cCost}, Output ${cVal}\n• Beacon D: Cost ${dCost}, Output ${dVal}\nWhat is the maximum achievable output?`,
    visualData: {
      equations: items.map((it) => `${it.name}: Cost=${it.cost} → Output=${it.val}`),
    },
    validSolutions: [String(bestVal)],
    defaultErrorPattern: 'obvious_reading',
    explanation: `Since the three cheapest beacons cost 3+4+5=12 > 10, at most 2 beacons fit. Checking feasible pairs yields optimal output ${bestVal} (${bestCombo}).`,
    postSolvePrompt: {
      question: 'Why does picking by highest output-to-cost ratio fail on some discrete budget choices?',
      patternPrompt: 'How did the minimum 3-item cost bound prune the entire search space?',
      takeaway: 'Check cardinality bounds and compare all feasible combinations rather than relying on greedy ratios.',
    },
    cognitiveTools: {
      decomposition: [
        'Check whether any 3 items can fit within cost 10.',
        'Evaluate all valid pairs with combined cost ≤ 10.',
      ],
      dependencyMapping: ['Minimum 3-item sum exceeds budget, bounding subsets cleanly.'],
      anomalyHighlight: 'Highest single ratio does not guarantee optimal knapsack utilization.',
      symbolicTranslation: 'max ∑ v_i x_i  s.t.  ∑ c_i x_i ≤ 10, x_i ∈ {0,1}.',
      alternativeHypotheses: ['Compare greedy value-per-unit against exact pair enumeration.'],
    },
    hints: {
      1: makeTierHints(
        'Check whether three beacons can fit inside 10 energy at all before testing combinations.',
        'Notice the three cheapest items already exceed your total budget.',
        'Bound maximum subset cardinality from the smallest weights first.',
        'Card(S) ≤ 2 bounds the 0-1 knapsack space.'
      ),
      2: makeTierHints(
        'Compare every pair of beacons whose costs add to 10 or less—do not assume the highest ratio wins.',
        'List all pairs costing ≤ 10 side by side so you do not miss any feasible combination.',
        'Evaluate every valid 2-element subset; discard any pair totaling over 10.',
        'Exhaustively evaluate feasible 2-subsets.'
      ),
      3: makeTierHints(
        'Double-check both cost sum (≤ 10) and output sum on your best pair before entering.',
        'Confirm you are entering the total OUTPUT, not the energy cost.',
        'Verify feasibility constraint on optimal pair.',
        'Confirm global maximum.'
      ),
    },
    rewards: { xp: 48 + Math.round(diff * 1.4), ip: 20 + Math.round(diff * 0.4), kp: 10 + Math.round(diff * 0.2) },
    isProcedural: true,
    seed,
  };
}

function buildProceduralPhilosophical(
  diff: number,
  seed: number,
  rng: () => number,
  stageNumber: number
): PuzzleSpec {
  const band = difficultyBandFromScore(diff);
  const variant = diff >= 60 ? Math.floor(rng() * 3) : Math.floor(rng() * 2);

  if (variant === 2) {
    const rawOpts: PuzzleOption[] = [
      { id: 'val_b', label: 'B (Both — Designated Glut)', detail: 'Glut stays contained at B without trivializing Q' },
      { id: 'val_t', label: 'T (True Only)', detail: 'Contradiction triggers classical explosion to T', exploitedPattern: 'assumed_untested' },
      { id: 'val_f', label: 'F (False Only)', detail: 'Both terms collapse to purely false under negation', exploitedPattern: 'ignored_detail' },
    ];
    return {
      id: `proc_phil_${seed}`,
      title: `Paraconsistent LP Gate #${seed % 1000}`,
      universeId: `stage_${stageNumber}`,
      regionId: 'procedural_rift',
      stageNumber,
      modeKey: 'procedural',
      category: 'philosophical',
      difficulty: band,
      difficultyScore: diff,
      relevantAttributes: ['abstract', 'analytical', 'metacognition'],
      interactionType: 'multiple_choice',
      objective: 'Evaluate a non-classical Logic of Paradox (LP) formula when P takes the paradoxical glut value Both (B).',
      instructions: 'In Priest’s 3-valued paraconsistent logic LP, values obey order F < B < T, with ¬T=F, ¬F=T, ¬B=B, (X ∧ Y)=min(X,Y), and (X ∨ Y)=max(X,Y). Evaluate (P ∧ ¬P) ∨ Q when P = B and Q = F.',
      rules: [
        'Truth order: F < B < T.',
        'Negation swaps T/F and leaves B fixed (¬B = B).',
        'Conjunction takes min; Disjunction takes max.',
      ],
      promptBody:
        'A gate runs on 3-valued Paraconsistent Logic (LP). Let P = B (Both) and Q = F (False).\nCompute the LP truth value of (P ∧ ¬P) ∨ Q.',
      visualData: {
        equations: [
          'Order: F < B < T',
          'P = B,  Q = F',
          'Compute: (P ∧ ¬P) ∨ Q',
        ],
      },
      options: shuffleWithRng(rawOpts, rng),
      validSolutions: ['val_b'],
      defaultErrorPattern: 'assumed_untested',
      explanation:
        'In LP, ¬B = B, so P ∧ ¬P = min(B, B) = B. Then B ∨ Q = max(B, F) = B—containing the contradiction at B rather than exploding to T.',
      postSolvePrompt: {
        question: 'Why did P ∧ ¬P evaluate differently in LP than in classical Boolean logic?',
        patternPrompt: 'What stops a single paradoxical premise from turning Q = F into true?',
        takeaway: 'Compute 3-valued lattice operators strictly step-by-step instead of applying classical assumptions.',
      },
      cognitiveTools: {
        decomposition: ['Evaluate ¬P first.', 'Evaluate min(P, ¬P).', 'Evaluate max(result, Q).'],
        dependencyMapping: ['LP operators follow the order lattice F < B < T cleanly.'],
        anomalyHighlight: 'In classical logic P ∧ ¬P is always F; in LP, ¬B stays B.',
        symbolicTranslation: 'max(min(P, ¬P), Q) under order F < B < T.',
        alternativeHypotheses: ['Trace every operator step on paper from inside the parentheses outward.'],
      },
      hints: {
        1: makeTierHints(
          'Work strictly from the inside out: first find ¬P, then take the smaller of P and ¬P, then take the larger of that result and Q.',
          'Do not assume P ∧ ¬P equals False—compute min(B, ¬B) directly from the order F < B < T.',
          'Evaluate the three-valued lattice operations step by step without invoking classical explosion.',
          'Apply lattice min/max over F < B < T.'
        ),
        2: makeTierHints(
          'Check what ¬B equals under LP negation, and notice whether taking min of identical values changes anything.',
          'Once the left half of the ∨ is evaluated, compare it with Q = F under max(left, F) using F < B < T.',
          'Verify whether max(result, F) elevates anything to T.',
          'Audit final disjunction over F < B < T.'
        ),
        3: makeTierHints(
          'Confirm each of the three steps (¬P, ∧, ∨) independently against the stated order F < B < T.',
          'Verify classical explosion did not sneak into your step.',
          'Confirm designated lattice preservation.',
          'Verify consistency.'
        ),
      },
      rewards: { xp: 58 + Math.round(diff * 1.4), ip: 24 + Math.round(diff * 0.4), kp: 18 + Math.round(diff * 0.2) },
      isProcedural: true,
      seed,
    };
  }

  if (variant === 0) {
    const rawOpts: PuzzleOption[] = [
      {
        id: 'drop_explosion',
        label: 'Reject Ex Falso Quodlibet (Principle of Explosion)',
        detail: 'Quarantines contradictions instead of entailing arbitrary claims',
      },
      {
        id: 'drop_identity',
        label: 'Reject A = A (Law of Identity)',
        detail: 'Suspends reflexive equality across formal expressions',
        exploitedPattern: 'assumed_untested',
      },
      {
        id: 'add_random',
        label: 'Replace Deductions with Probability Sampling',
        detail: 'Substitutes stochastic polling for deductive validity',
        exploitedPattern: 'obvious_reading',
      },
    ];
    return {
      id: `proc_phil_${seed}`,
      title: `Paraconsistent Dialectic #${seed % 1000}`,
      universeId: `stage_${stageNumber}`,
      regionId: 'procedural_rift',
      stageNumber,
      modeKey: 'procedural',
      category: 'philosophical',
      difficulty: band,
      difficultyScore: diff,
      relevantAttributes: ['abstract', 'metacognition', 'linguistic'],
      interactionType: 'multiple_choice',
      objective: 'Identify the structural inference rule modified to keep a local contradiction from trivializing an entire archive.',
      instructions: 'Select the precise structural principle separating classical trivialization from paraconsistent containment.',
      rules: [
        'In classical logic, (P ∧ ¬P) ⊢ Q holds for arbitrary unrelated Q.',
      ],
      promptBody:
        'A cosmic archive holds one contradictory pair (P ∧ ¬P) beside thousands of sound observations. Under classical rules, any arbitrary Q becomes provable. Which structural change prevents total collapse while preserving inference?',
      options: shuffleWithRng(rawOpts, rng),
      validSolutions: ['drop_explosion'],
      defaultErrorPattern: 'assumed_untested',
      explanation:
        'Classical explosion (Ex Falso Quodlibet) lets any contradiction derive arbitrary Q. Paraconsistent logics reject or restrict Explosion so contradictions remain localized.',
      postSolvePrompt: {
        question: 'Why does discarding identity (A = A) or deductive inference go further than needed?',
        patternPrompt: 'Which specific link lets one contradiction spread to unrelated statements?',
        takeaway: 'Isolate the minimal inference step causing collapse rather than abandoning deduction altogether.',
      },
      cognitiveTools: {
        decomposition: ['Separate the local contradiction from global trivialization.'],
        dependencyMapping: ['(P ∧ ¬P) ⊢ Q depends on Disjunctive Syllogism + Addition.'],
        anomalyHighlight: 'Look for the specific classical rule linking contradiction to arbitrary Q.',
        symbolicTranslation: 'Block (P ∧ ¬P) ⊢ Q without breaking valid unrelated proofs.',
        alternativeHypotheses: ['Compare surgical rule restriction vs abandoning deduction entirely.'],
      },
      hints: {
        1: makeTierHints(
          'Look for the rule specifically responsible for letting one contradiction prove unrelated statements Q.',
          'Distinguish isolating an inference rule from discarding identity or abandoning logic altogether.',
          'Identify the classical rule mediating (P ∧ ¬P) ⊢ Q.',
          'Target trivialization control while preserving non-contradictory inference.'
        ),
        2: makeTierHints(
          'Ask which option preserves valid deduction on clean parts of the archive while quarantining the contradiction.',
          'Verify why rejecting equality A = A fails to preserve ordinary sound records.',
          'Compare paraconsistent containment against replacing deduction with randomness.',
          'Evaluate minimal rule surgical removal.'
        ),
        3: makeTierHints(
          'Select the principle that directly blocks arbitrary Q derivation from a localized contradiction.',
          'Confirm both quarantine and deductive preservation hold.',
          'Verify consistency.',
          'Audit logical minimalism.'
        ),
      },
      rewards: { xp: 52 + Math.round(diff * 1.4), ip: 22 + Math.round(diff * 0.4), kp: 16 + Math.round(diff * 0.2) },
      isProcedural: true,
      seed,
    };
  }

  return {
    id: `proc_phil_${seed}`,
    title: `Epistemic Identity Continuum #${seed % 1000}`,
    universeId: `stage_${stageNumber}`,
    regionId: 'procedural_rift',
    stageNumber,
    modeKey: 'procedural',
    category: 'philosophical',
    difficulty: band,
    difficultyScore: diff,
    relevantAttributes: ['creative', 'metacognition', 'abstract'],
    interactionType: 'rubric_synthesis',
    objective: 'Propose an identity criterion resolving the Ship of Theseus when parts are replaced gradually AND originals are reassembled.',
    instructions: 'Explain functional/spatiotemporal continuity versus material composition, and show why "sameness" splits into two distinct relations.',
    rules: [
      'Address continuity (functional/process) vs material composition.',
      'Explain why two criteria generate two non-identical candidates.',
    ],
    promptBody:
      'A starship replaces every hull plate over a century while an archivist collects the discarded plates and reassembles them into an identical frame. Why does asking "Which one is the real ship?" mislead, and how should identity be formalized here?',
    rubricCriteria: [
      { id: 'continuity', label: 'Functional/Process Continuity', keywords: ['continu', 'process', 'function', 'history', 'form', 'ongoing'], weight: 1 },
      { id: 'material', label: 'Material Composition', keywords: ['materi', 'part', 'piece', 'plate', 'origin', 'matter'], weight: 1 },
      { id: 'split', label: 'Concept Splitting / Dual Criteria', keywords: ['two', 'split', 'ambigu', 'criteria', 'definit', 'context', 'both'], weight: 1 },
    ],
    validSolutions: [
      'The question conflates two distinct identity criteria: ongoing functional continuity (the active ship) and original material composition (the reassembled ship); splitting the concept resolves the ambiguity.',
    ],
    defaultErrorPattern: 'assumed_untested',
    explanation:
      'Identity over time splits across two distinct criteria: spatiotemporal/functional continuity tracks the sailing vessel, while material origin tracks the reassembled parts. Disambiguating the criteria dissolves the forced binary.',
    postSolvePrompt: {
      question: 'Why does forcing a single yes/no answer preserve the paradox?',
      patternPrompt: 'Where else do single words hide two incompatible definitions?',
      takeaway: 'Split overloaded terms into explicit distinct relations whenever intuition stalls.',
    },
    cognitiveTools: {
      decomposition: ['Identify the two competing notions of "same".', 'Explain why forced uniqueness misfires.'],
      dependencyMapping: ['Ambiguous predicate "same" -> Same_Process vs Same_Matter.'],
      anomalyHighlight: 'The deadlock stems from treating two criteria as one single relation.',
      symbolicTranslation: 'Identity(t) = { Continuity(process), Continuity(matter) }.',
      alternativeHypotheses: ['Concept engineering / dual-criteria disambiguation.'],
    },
    hints: {
      1: makeTierHints(
        'Compare what each ship preserved from the original: one preserved the uninterrupted voyage and form, the other preserved the physical plates.',
        'Locate the hidden ambiguity inside the word "same" rather than picking one ship by gut feel.',
        'Contrast ongoing functional continuity against material origin.',
        'Disambiguate the identity predicate into two orthogonal relations.'
      ),
      2: makeTierHints(
        'Make sure your answer names both physical material parts and ongoing functional history, and explains why one word hides two criteria.',
        'Explain why "which is the real ship?" assumes a single criterion where two independent criteria apply.',
        'Connect both halves through concept splitting.',
        'Cover continuity, material composition, and dual criteria.'
      ),
      3: makeTierHints(
        'Review your paragraph to make sure you actually explain why the question misleads rather than just listing terms.',
        'Check clarity across continuity, material identity, and conceptual splitting.',
        'Verify clean causal linkage.',
        'Audit precision.'
      ),
    },
    rewards: { xp: 55 + Math.round(diff * 1.4), ip: 24 + Math.round(diff * 0.4), kp: 18 + Math.round(diff * 0.2) },
    isProcedural: true,
    seed,
  };
}

function buildProceduralHybrid(
  diff: number,
  seed: number,
  rng: () => number,
  stageNumber: number
): PuzzleSpec {
  const band = difficultyBandFromScore(diff);
  const p = 5;
  const q = 7;
  const r1 = Math.floor(rng() * 4) + 1;
  const r2 = Math.floor(rng() * 6) + 1;
  const wantEven = rng() > 0.5;
  let targetX = -1;
  for (let x = 11; x <= 90; x++) {
    if (x % p === r1 && x % q === r2 && (x % 2 === 0) === wantEven) {
      targetX = x;
      break;
    }
  }
  if (targetX === -1) targetX = 18;

  return {
    id: `proc_hybrid_${seed}`,
    title: `Dual-System Lattice #${seed % 1000}`,
    universeId: `stage_${stageNumber}`,
    regionId: 'procedural_rift',
    stageNumber,
    modeKey: 'procedural',
    category: 'hybrid',
    difficulty: band,
    difficultyScore: diff,
    relevantAttributes: ['analytical', 'abstract', 'processing_efficiency', 'spatial'],
    interactionType: 'numeric_input',
    objective: `Find the smallest integer X > 10 that satisfies the modular congruences AND ${wantEven ? 'EVEN' : 'ODD'} parity.`,
    instructions: 'Combine arithmetic residue filtering with parity symmetry to find the smallest valid X.',
    rules: [
      'X > 10.',
      `X ≡ ${r1} (mod 5) and X ≡ ${r2} (mod 7).`,
      `X must be ${wantEven ? 'EVEN' : 'ODD'}.`,
    ],
    promptBody: `Cross-system synthesis required:\n1. X > 10\n2. X mod 5 = ${r1}\n3. X mod 7 = ${r2}\n4. Parity constraint: X is ${wantEven ? 'EVEN' : 'ODD'}.\nEnter the smallest valid integer X.`,
    visualData: {
      equations: [
        'X > 10',
        `X ≡ ${r1} (mod 5)`,
        `X ≡ ${r2} (mod 7)`,
        `Parity(X) = ${wantEven ? 'Even' : 'Odd'}`,
      ],
    },
    validSolutions: [String(targetX)],
    defaultErrorPattern: 'ignored_detail',
    explanation: `Combining mod 5 = ${r1} with ${wantEven ? 'even' : 'odd'} parity fixes the exact base-10 units digit, and filtering numbers > 10 ending in that digit by mod 7 = ${r2} yields ${targetX}.`,
    postSolvePrompt: {
      question: 'How did coupling the mod-5 remainder with parity pin down the exact last digit immediately?',
      patternPrompt: 'Which mistake appears if you find the smallest CRT match mod 35 and forget the parity requirement?',
      takeaway: 'Merge compatible moduli (such as 5 and 2 into mod 10) first to slash candidate checks.',
    },
    cognitiveTools: {
      decomposition: [
        'Determine which two final digits leave the target remainder mod 5.',
        'Use the parity rule to pick one single final digit.',
        'Step by 10s above 10 until mod 7 matches.',
      ],
      dependencyMapping: ['Coupling mod 5 and mod 2 fixes the residue class mod 10.'],
      anomalyHighlight: 'Combining mod 5 with parity pins the units digit down to a single choice.',
      symbolicTranslation: 'CRT across coprime moduli {2, 5, 7} gives a unique residue mod 70.',
      alternativeHypotheses: ['Sieve mod 7 upward or step mod 10 upward—both reach the exact same integer.'],
    },
    hints: {
      1: makeTierHints(
        `Think about what last digits are possible when X mod 5 = ${r1}, then apply the ${wantEven ? 'EVEN' : 'ODD'} constraint to narrow them to one digit.`,
        'Couple the mod-5 and parity rules first so every candidate has a fixed units digit.',
        'Merge CRT(5, 2) immediately into a single mod-10 residue class before testing mod 7.',
        'Solve mod 10 first, then step through candidates above 10 against mod 7.'
      ),
      2: makeTierHints(
        'Test numbers larger than 10 ending in your unique final digit one by one against the mod-7 remainder.',
        'Check your smallest positive match to make sure it strictly exceeds 10.',
        'Verify your candidate against all four stated constraints independently.',
        'Confirm uniqueness modulo 70 inside (10, 80].'
      ),
      3: makeTierHints(
        'Check all four conditions (greater than 10, mod 5, mod 7, and parity) on your number before entering.',
        'Confirm you did not accidentally stop at a match ≤ 10.',
        'Verify X > 10 and all three modular checks.',
        'Audit final candidate.'
      ),
    },
    rewards: { xp: 60 + Math.round(diff * 1.5), ip: 24 + Math.round(diff * 0.45), kp: 15 + Math.round(diff * 0.25) },
    isProcedural: true,
    seed,
  };
}
