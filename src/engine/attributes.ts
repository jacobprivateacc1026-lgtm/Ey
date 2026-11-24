import {
  CognitiveAbilityDefinition,
  PrimaryAttributeId,
  PrimaryAttributeState,
  SecondaryAttributeId,
} from './types';

export interface PrimaryAttributeMeta {
  id: PrimaryAttributeId;
  name: string;
  shortName: string;
  focus: string;
  description: string;
  passiveBonusLabel: (level: number) => string;
  milestone5Bonus: string;
  milestone10Bonus: string;
}

export const PRIMARY_ATTRIBUTES: PrimaryAttributeMeta[] = [
  {
    id: 'analytical',
    name: 'Analytical Reasoning',
    shortName: 'Analytical',
    focus: 'Decomposition · Consistency · Structure',
    description:
      'Breaks multi-layered problems into explicit sub-claims, tracks logical dependencies, and supports manual contradiction auditing.',
    passiveBonusLabel: (lvl) =>
      `Opens +${Math.min(4, Math.floor(lvl / 2))} Decomposition worksheet rows & expands Premise Binder slots`,
    milestone5Bonus: 'Unlocks formal Contradiction Binder workspace for pairing conflicting premises',
    milestone10Bonus: 'Enables multi-step dependency link tables in complex chambers',
  },
  {
    id: 'abstract',
    name: 'Abstract Reasoning',
    shortName: 'Abstract',
    focus: 'Invariance · Symbolism · Foundations',
    description:
      'Grasps unfamiliar axiomatic systems, translates surface symbols into invariant structures, and navigates higher-order models.',
    passiveBonusLabel: (lvl) =>
      `Deepens structural framing precision to Depth ${lvl >= 8 ? 4 : lvl >= 5 ? 3 : lvl >= 3 ? 2 : 1}`,
    milestone5Bonus: 'Unlocks Symbolic Notation Canvas inside Puzzle Chamber',
    milestone10Bonus: 'Unlocks cross-system structural mapping view without altering hint limits',
  },
  {
    id: 'working_memory',
    name: 'Working Memory',
    shortName: 'Memory',
    focus: 'State Retention · Multi-Step Buffers',
    description:
      'Holds intermediate transformations, competing hypotheses, and evidence pins across multi-phase encounters.',
    passiveBonusLabel: (lvl) =>
      `Evidence Board & Workspace capacity: ${2 + lvl} pinned claims & persistent note slots`,
    milestone5Bonus: 'Carries Jacob’s pinned evidence across Boss phase shifts',
    milestone10Bonus: 'Maintains cross-phase constraint logs side by side during Endgame',
  },
  {
    id: 'pattern_recognition',
    name: 'Pattern Recognition',
    shortName: 'Pattern',
    focus: 'Regularities · Discrepancies · Recursion',
    description:
      'Sharpens discrepancy comparison tools across logs, receipts, numeric tables, and geometric sequences.',
    passiveBonusLabel: (lvl) =>
      `Opens ${Math.min(5, 1 + Math.floor(lvl / 2))} side-by-side comparison slots in the Discrepancy Scanner`,
    milestone5Bonus: 'Unlocks Second-Difference Scratchpad column for sequence inspection',
    milestone10Bonus: 'Unlocks Recursive Layer Fold diagrammer for self-similar puzzles',
  },
  {
    id: 'spatial',
    name: 'Spatial Intelligence',
    shortName: 'Spatial',
    focus: 'Geometry · Rotations · Dimensions',
    description:
      'Simulates mental rotations, symmetry axes, parity flips, and higher-dimensional projections.',
    passiveBonusLabel: (lvl) =>
      `Unlocks ${lvl >= 3 ? 'axis overlay + grid counter' : 'cell counter'} in Spatial Workbench`,
    milestone5Bonus: 'Unlocks manual Ghost Rotation preview on spatial grids',
    milestone10Bonus: 'Unlocks coordinate projection ledger for N-dimensional lattices',
  },
  {
    id: 'linguistic',
    name: 'Verbal & Linguistic Reasoning',
    shortName: 'Linguistic',
    focus: 'Semantics · Lexicons · Subtext',
    description:
      'Disambiguates polysemous statements, reconstructs alien grammars, and maps speaker motives in the Subtext Ledger.',
    passiveBonusLabel: (lvl) => `Subtext Ledger comparison slots +${lvl}`,
    milestone5Bonus: 'Unlocks Quantifier Scope Scratchpad ("all", "some", "only if")',
    milestone10Bonus: 'Unlocks cross-document cross-reference table in the Book & Chamber',
  },
  {
    id: 'creative',
    name: 'Creative Reasoning',
    shortName: 'Creative',
    focus: 'Synthesis · Alternative Models',
    description:
      'Generates unconventional hypotheses, tests counter-models, and connects distant domains manually.',
    passiveBonusLabel: (lvl) =>
      `Unlocks +${Math.min(3, Math.ceil(lvl / 3))} competing model lanes on the Hypothesis Workbench`,
    milestone5Bonus: 'Reveals multiple-solution notes cleanly after mastery',
    milestone10Bonus: 'Unlocks dual-framework side-by-side synthesis sheet',
  },
  {
    id: 'metacognition',
    name: 'Metacognition',
    shortName: 'Metacognition',
    focus: 'Self-Audit · Assumptions · Calibration',
    description:
      'Monitors reasoning bias, sharpens Clarity recovery on accurate self-audits, and logs confidence calibration.',
    passiveBonusLabel: (lvl) =>
      `Certainty calibration log & ${Math.min(30, lvl * 3)}% hint IP cost discipline`,
    milestone5Bonus: 'Unlocks Pre-Commit Premise Checklist before final submission',
    milestone10Bonus: 'Unlocks full Blind-Spot & Confidence Drift Matrix in Personal Notebook',
  },
  {
    id: 'processing_efficiency',
    name: 'Processing & Decision Efficiency',
    shortName: 'Efficiency',
    focus: 'Plan Sequencing · Pruning · Precision',
    description:
      'Structures search-space matrices and step-replay sequencing without pruning options automatically.',
    passiveBonusLabel: (lvl) =>
      `Reduces free-hint cooldown by ${Math.min(60, lvl * 5)}% & expands Plan Sequence bench`,
    milestone5Bonus: 'Bonus +15% IP yield on verified first-attempt solves',
    milestone10Bonus: 'Unlocks manual Case-Elimination Matrix for multi-constraint trials',
  },
];

export interface SecondaryAttributeMeta {
  id: SecondaryAttributeId;
  name: string;
  derivedFrom: PrimaryAttributeId[];
  description: string;
}

export const SECONDARY_ATTRIBUTES: SecondaryAttributeMeta[] = [
  {
    id: 'knowledge',
    name: 'Knowledge Synthesis',
    derivedFrom: ['linguistic', 'analytical'],
    description: 'Accumulated mastery of Book chapters, historical records, and formal models.',
  },
  {
    id: 'adaptability',
    name: 'Adaptability',
    derivedFrom: ['creative', 'abstract'],
    description: 'Capacity to shift mental models when physical or logical rules change.',
  },
  {
    id: 'cognitive_endurance',
    name: 'Cognitive Endurance',
    derivedFrom: ['working_memory', 'processing_efficiency'],
    description: 'Resilience across multi-phase Boss trials and Clarity-strained sequences.',
  },
  {
    id: 'insight',
    name: 'Insight',
    derivedFrom: ['pattern_recognition', 'abstract'],
    description: 'Capacity to connect scattered documents into a single structural law.',
  },
  {
    id: 'perceptual_awareness',
    name: 'Perceptual Awareness',
    derivedFrom: ['spatial', 'pattern_recognition'],
    description: 'Careful observation of silent environmental details and physical inconsistencies.',
  },
  {
    id: 'systems_thinking',
    name: 'Systems Thinking',
    derivedFrom: ['analytical', 'metacognition'],
    description: 'Holistic comprehension of feedback loops, causal links, and opponent counter-moves.',
  },
];

export function computeSecondaryAttributes(
  primary: Record<PrimaryAttributeId, PrimaryAttributeState>,
  unlockedBookCount: number,
  transcendenceRank: number
): Record<SecondaryAttributeId, number> {
  const avg = (ids: PrimaryAttributeId[]) =>
    ids.reduce((acc, id) => acc + (primary[id]?.level ?? 1), 0) / ids.length;

  return {
    knowledge: Math.round(avg(['linguistic', 'analytical']) * 10 + unlockedBookCount * 4 + transcendenceRank * 8),
    adaptability: Math.round(avg(['creative', 'abstract']) * 10 + transcendenceRank * 6),
    cognitive_endurance: Math.round(avg(['working_memory', 'processing_efficiency']) * 10 + transcendenceRank * 6),
    insight: Math.round(avg(['pattern_recognition', 'abstract']) * 10 + transcendenceRank * 8),
    perceptual_awareness: Math.round(avg(['spatial', 'pattern_recognition']) * 10 + transcendenceRank * 5),
    systems_thinking: Math.round(avg(['analytical', 'metacognition']) * 10 + transcendenceRank * 8),
  };
}

export interface SecondaryGameplayBonuses {
  secondaryScores: Record<SecondaryAttributeId, number>;
  systemsLoopLensUnlocked: boolean;
  adaptabilityReframingUnlocked: boolean;
  knowledgeArchiveEchoUnlocked: boolean;
  adaptabilityEfficiencyBufferPct: number;
  systemsCascadeBonusPct: number;
  knowledgeHintDiscountBonusPct: number;
}

export function getSecondaryGameplayBonuses(
  primary: Record<PrimaryAttributeId, PrimaryAttributeState>,
  unlockedBookCount: number,
  transcendenceRank: number,
  abilities: Record<string, number> = {}
): SecondaryGameplayBonuses {
  const secondaryScores = computeSecondaryAttributes(
    primary,
    unlockedBookCount,
    transcendenceRank
  );
  return {
    secondaryScores,
    systemsLoopLensUnlocked:
      secondaryScores.systems_thinking >= 20 || (abilities['systems_synthesis'] ?? 0) >= 1,
    adaptabilityReframingUnlocked:
      secondaryScores.adaptability >= 20 || (abilities['paradigm_reframing'] ?? 0) >= 1,
    knowledgeArchiveEchoUnlocked:
      secondaryScores.knowledge >= 18 || unlockedBookCount >= 1,
    adaptabilityEfficiencyBufferPct: Math.min(25, Math.max(0, secondaryScores.adaptability - 10)),
    systemsCascadeBonusPct: Math.min(20, Math.max(0, Math.floor((secondaryScores.systems_thinking - 10) / 2))),
    knowledgeHintDiscountBonusPct: Math.min(15, Math.floor(unlockedBookCount * 2)),
  };
}

export function getAttributeUpgradeCost(currentLevel: number): number {
  return Math.round(10 + currentLevel * 7 + Math.pow(currentLevel, 1.25) * 2);
}

export function getXpForNextTubLevel(currentLevel: number): number {
  return Math.round(75 + currentLevel * 40 + Math.pow(currentLevel, 1.45) * 14);
}

export interface LevelMilestone {
  level: number;
  title: string;
  rewardText: string;
}

export function getMilestoneForLevel(level: number): LevelMilestone | null {
  if (level === 2) {
    return { level: 2, title: 'Awakened Observer', rewardText: '+15 IP · Unlocks Stage II Preparation' };
  }
  if (level === 5) {
    return { level: 5, title: 'Architect Initiate', rewardText: '+30 IP · +15 KP · +1 Evolution Point' };
  }
  if (level === 10) {
    return { level: 10, title: 'Sovereign Reasoner', rewardText: '+60 IP · +30 KP · +2 Evolution Points' };
  }
  if (level % 10 === 0 && level > 10) {
    return { level, title: `Transcendent Tier ${level / 10}`, rewardText: '+75 IP · +2 Evolution Points' };
  }
  if (level % 5 === 0 && level > 5) {
    return { level, title: `Cognitive Milestone ${level}`, rewardText: '+35 IP · +1 Evolution Point' };
  }
  return null;
}

export const COGNITIVE_ABILITIES: CognitiveAbilityDefinition[] = [
  // ANALYTICAL
  {
    id: 'decomposition',
    name: 'Decomposition',
    primaryAttribute: 'analytical',
    minAttributeLevel: 1,
    maxRank: 3,
    costPerRankIP: 14,
    surfaceName: 'Sub-Problem Outline',
    summary: 'Opens an interactive sub-goal worksheet inside the Puzzle Chamber.',
    inPuzzleEffect: 'Breaks dense problems into clean, checkable sub-questions you solve yourself.',
    toolKey: 'decomposition',
  },
  {
    id: 'dependency_mapping',
    name: 'Causal Link Mapper',
    primaryAttribute: 'analytical',
    secondaryRequirements: { working_memory: 2 },
    minAttributeLevel: 2,
    maxRank: 3,
    costPerRankIP: 20,
    surfaceName: 'Causal Link Mapper',
    summary: 'Interactive link table for connecting claims, rules, and variable dependencies.',
    inPuzzleEffect: 'Lets Jacob map which claims support, contradict, or test each other.',
    toolKey: 'dependencyMapping',
  },
  {
    id: 'logical_verification',
    name: 'Premise & Contradiction Binder',
    primaryAttribute: 'analytical',
    secondaryRequirements: { metacognition: 2 },
    minAttributeLevel: 3,
    maxRank: 3,
    costPerRankIP: 26,
    surfaceName: 'Premise & Contradiction Binder',
    summary: 'Player-operated premise binder to test pairs of statements against rules manually.',
    inPuzzleEffect: 'Organizes active rules and statements side by side so you can audit consistency yourself—zero auto-answer checking.',
    toolKey: 'logical_verification',
  },
  {
    id: 'systems_synthesis',
    name: 'Systems Synthesis',
    primaryAttribute: 'analytical',
    secondaryRequirements: { metacognition: 2, working_memory: 2 },
    minAttributeLevel: 3,
    maxRank: 2,
    costPerRankIP: 30,
    epRequired: 1,
    surfaceName: 'Adversarial State Ledger',
    summary: 'Opens a manual feedback-loop and opponent-response planner in multi-rule encounters.',
    inPuzzleEffect: 'Tracks cross-variable coupling and opponent memory posture without solving phases.',
  },
  // ABSTRACT
  {
    id: 'structural_perception',
    name: 'Structural Lens',
    primaryAttribute: 'abstract',
    minAttributeLevel: 2,
    maxRank: 3,
    costPerRankIP: 18,
    surfaceName: 'Invariant Comparison Table',
    summary: 'Adds an interactive column view for stripping surface labels down to pure structural relations.',
    inPuzzleEffect: 'Organizes abstract quantities cleanly without upgrading hint strength beyond the 3-tier cap.',
  },
  {
    id: 'symbolic_translation',
    name: 'Symbolic Translation',
    primaryAttribute: 'abstract',
    secondaryRequirements: { linguistic: 2 },
    minAttributeLevel: 2,
    maxRank: 3,
    costPerRankIP: 22,
    surfaceName: 'Formal Notation Scratchpad',
    summary: 'Interactive scratchpad translating prose conditions into symbolic notation for your own manipulation.',
    inPuzzleEffect: 'Provides clean algebraic framing templates without pre-solving values.',
    toolKey: 'symbolicTranslation',
  },
  {
    id: 'conceptual_projection',
    name: 'Conceptual Projection',
    primaryAttribute: 'abstract',
    secondaryRequirements: { creative: 3, analytical: 3 },
    minAttributeLevel: 4,
    maxRank: 2,
    costPerRankIP: 36,
    epRequired: 1,
    surfaceName: 'Cross-System Analogy Sheet',
    summary: 'Maps structural parallels across different universes inside the Evidence Board.',
    inPuzzleEffect: 'Lets Jacob compare analogous mechanics across Stages without lowering challenge rules.',
  },
  // WORKING MEMORY
  {
    id: 'mental_workspace',
    name: 'Evidence & Hypothesis Board',
    primaryAttribute: 'working_memory',
    minAttributeLevel: 1,
    maxRank: 3,
    costPerRankIP: 12,
    surfaceName: 'Evidence Board',
    summary: 'Expands pinned observation cards and hypothesis notes inside every chamber.',
    inPuzzleEffect: 'Pin exhibits, draft hypotheses, and carry notes across Boss phases.',
    toolKey: 'mental_workspace',
  },
  // PATTERN RECOGNITION & SPATIAL
  {
    id: 'anomaly_detection',
    name: 'Observation Discrepancy Scanner',
    primaryAttribute: 'pattern_recognition',
    minAttributeLevel: 1,
    maxRank: 3,
    costPerRankIP: 15,
    surfaceName: 'Discrepancy Scanner',
    summary: 'Side-by-side manual comparison bench for checking two exhibits against each other.',
    inPuzzleEffect: 'Lets you flag suspicious entries yourself and inspect raw counts—zero automatic highlighting.',
    toolKey: 'anomalyHighlight',
  },
  {
    id: 'spatial_parity_lens',
    name: 'Spatial Grid Bench',
    primaryAttribute: 'spatial',
    minAttributeLevel: 2,
    maxRank: 2,
    costPerRankIP: 20,
    surfaceName: 'Spatial Grid Workbench',
    summary: 'Adds manual row/column counters and ghost rotation preview on spatial boards.',
    inPuzzleEffect: 'Shows live counts of active tiles you placed without indicating whether they are right.',
  },
  // METACOGNITION
  {
    id: 'error_detection',
    name: 'Subtext & Error Ledger',
    primaryAttribute: 'metacognition',
    minAttributeLevel: 2,
    maxRank: 3,
    costPerRankIP: 20,
    surfaceName: 'Personal Audit Ledger',
    summary: 'Pulls your own recent Personal Notebook slip patterns right into the chamber.',
    inPuzzleEffect: 'Displays which of the 6 common failure traps you fell into recently—never leaks answer direction or magnitude.',
    toolKey: 'error_detection',
  },
  {
    id: 'confidence_calibration',
    name: 'Confidence Calibration',
    primaryAttribute: 'metacognition',
    secondaryRequirements: { processing_efficiency: 2 },
    minAttributeLevel: 2,
    maxRank: 2,
    costPerRankIP: 18,
    surfaceName: 'Certainty Calibration Log',
    summary: 'Tracks how often "Sure" vs "Think so" vs "Guessing" holds up across chambers.',
    inPuzzleEffect: 'Logs calibration accuracy in your Personal Notebook & Reflective Profile.',
    toolKey: 'confidence_calibration',
  },
  // CREATIVE REASONING
  {
    id: 'divergent_exploration',
    name: 'Divergent Exploration',
    primaryAttribute: 'creative',
    minAttributeLevel: 2,
    maxRank: 3,
    costPerRankIP: 22,
    surfaceName: 'Competing Theories Sheet',
    summary: 'Opens space to line up 2–3 rival explanations side by side and test which survives.',
    inPuzzleEffect: 'Structures competing hypotheses for manual falsification.',
    toolKey: 'alternativeHypotheses',
  },
  {
    id: 'paradigm_reframing',
    name: 'Dialogue & Motive Subtext Ledger',
    primaryAttribute: 'creative',
    secondaryRequirements: { abstract: 2 },
    minAttributeLevel: 3,
    maxRank: 2,
    costPerRankIP: 28,
    epRequired: 1,
    surfaceName: 'Motive Subtext Ledger',
    summary: 'Tracks speaker claims, contradictions, and hidden incentives in social & guardian encounters.',
    inPuzzleEffect: 'Provides structured subtext note columns beside opponent dialogue.',
  },
  {
    id: 'transcendent_synthesis',
    name: 'Plan Sequence & Replay Bench',
    primaryAttribute: 'abstract',
    secondaryRequirements: { analytical: 5, creative: 4, metacognition: 4 },
    minAttributeLevel: 5,
    maxRank: 3,
    costPerRankIP: 50,
    epRequired: 2,
    surfaceName: 'Plan Sequence & Replay',
    summary: 'Endgame planning workbench allowing multi-step commit-and-replay reviews.',
    inPuzzleEffect: 'Records committed multi-step plans for inspection alongside opponent replies.',
  },
];

export function createInitialAttributes(): Record<PrimaryAttributeId, PrimaryAttributeState> {
  return {
    analytical: { id: 'analytical', level: 1, xp: 0 },
    abstract: { id: 'abstract', level: 1, xp: 0 },
    working_memory: { id: 'working_memory', level: 1, xp: 0 },
    pattern_recognition: { id: 'pattern_recognition', level: 1, xp: 0 },
    spatial: { id: 'spatial', level: 1, xp: 0 },
    linguistic: { id: 'linguistic', level: 1, xp: 0 },
    creative: { id: 'creative', level: 1, xp: 0 },
    metacognition: { id: 'metacognition', level: 1, xp: 0 },
    processing_efficiency: { id: 'processing_efficiency', level: 1, xp: 0 },
  };
}
