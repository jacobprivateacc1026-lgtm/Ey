import { GameModeKey, PuzzleSpec } from './types';

export interface ModeDifficultyParams {
  modeKey: GameModeKey;
  label: string;
  /** How nuanced distractors must be (1 = simple contrast, 5 = structurally subtle) */
  distractorStrength: 1 | 2 | 3 | 4 | 5;
  /** Number of independent facts or cross-checks required to solve cleanly */
  synthesisDepth: 1 | 2 | 3 | 4 | 5;
  /** Ratio of believable red-herring exhibits / distracting details included */
  noiseLevel: number;
  /** Strictly capped at 3 non-revealing hint tiers */
  hintTiersAllowed: 1 | 2 | 3;
  /** Clarity parameters (non-softlock floor guaranteed) */
  clarityMax: number;
  clarityFloor: number;
  clarityWrongPenalty: number;
  claritySureMultiplier: number;
  clarityMatchRefund: number;
  claritySolveRecover: number;
  /** Confidence tagging optional in easiest tutorial/prologue modes */
  confidenceOptional: boolean;
  /** Opponent counter-reasoning & memory sharpness */
  opponentStrength: 'gentle' | 'measured' | 'sharp' | 'adversarial' | 'sovereign';
}

export const DIFFICULTY_CONFIG: Record<GameModeKey, ModeDifficultyParams> = {
  prologue: {
    modeKey: 'prologue',
    label: 'Prologue Encounters',
    distractorStrength: 2,
    synthesisDepth: 2,
    noiseLevel: 0.25,
    hintTiersAllowed: 3,
    clarityMax: 100,
    clarityFloor: 40,
    clarityWrongPenalty: 0,
    claritySureMultiplier: 1,
    clarityMatchRefund: 0,
    claritySolveRecover: 10,
    confidenceOptional: true,
    opponentStrength: 'gentle',
  },
  tutorial: {
    modeKey: 'tutorial',
    label: 'Threshold Tutorial',
    distractorStrength: 2,
    synthesisDepth: 2,
    noiseLevel: 0.3,
    hintTiersAllowed: 3,
    clarityMax: 100,
    clarityFloor: 50,
    clarityWrongPenalty: 0,
    claritySureMultiplier: 1,
    clarityMatchRefund: 0,
    claritySolveRecover: 8,
    confidenceOptional: true,
    opponentStrength: 'measured',
  },
  stage_1: {
    modeKey: 'stage_1',
    label: 'Stage I · Foundational',
    distractorStrength: 3,
    synthesisDepth: 2,
    noiseLevel: 0.35,
    hintTiersAllowed: 3,
    clarityMax: 100,
    clarityFloor: 20,
    clarityWrongPenalty: 8,
    claritySureMultiplier: 1.5,
    clarityMatchRefund: 3,
    claritySolveRecover: 10,
    confidenceOptional: false,
    opponentStrength: 'measured',
  },
  stage_2: {
    modeKey: 'stage_2',
    label: 'Stage II · Fractured',
    distractorStrength: 4,
    synthesisDepth: 3,
    noiseLevel: 0.45,
    hintTiersAllowed: 3,
    clarityMax: 100,
    clarityFloor: 20,
    clarityWrongPenalty: 10,
    claritySureMultiplier: 1.5,
    clarityMatchRefund: 4,
    claritySolveRecover: 12,
    confidenceOptional: false,
    opponentStrength: 'sharp',
  },
  stage_3: {
    modeKey: 'stage_3',
    label: 'Stage III · Infinite',
    distractorStrength: 4,
    synthesisDepth: 3,
    noiseLevel: 0.5,
    hintTiersAllowed: 3,
    clarityMax: 100,
    clarityFloor: 20,
    clarityWrongPenalty: 12,
    claritySureMultiplier: 1.5,
    clarityMatchRefund: 5,
    claritySolveRecover: 14,
    confidenceOptional: false,
    opponentStrength: 'sharp',
  },
  stage_4: {
    modeKey: 'stage_4',
    label: 'Stage IV · Conceptual',
    distractorStrength: 5,
    synthesisDepth: 4,
    noiseLevel: 0.55,
    hintTiersAllowed: 3,
    clarityMax: 100,
    clarityFloor: 15,
    clarityWrongPenalty: 14,
    claritySureMultiplier: 1.5,
    clarityMatchRefund: 6,
    claritySolveRecover: 16,
    confidenceOptional: false,
    opponentStrength: 'adversarial',
  },
  stage_5: {
    modeKey: 'stage_5',
    label: 'Stage V · The Beyond',
    distractorStrength: 5,
    synthesisDepth: 4,
    noiseLevel: 0.6,
    hintTiersAllowed: 3,
    clarityMax: 100,
    clarityFloor: 15,
    clarityWrongPenalty: 15,
    claritySureMultiplier: 1.5,
    clarityMatchRefund: 6,
    claritySolveRecover: 18,
    confidenceOptional: false,
    opponentStrength: 'adversarial',
  },
  stage_6: {
    modeKey: 'stage_6',
    label: 'Stage VI · Infinite Possibility',
    distractorStrength: 5,
    synthesisDepth: 5,
    noiseLevel: 0.65,
    hintTiersAllowed: 3,
    clarityMax: 100,
    clarityFloor: 15,
    clarityWrongPenalty: 16,
    claritySureMultiplier: 1.5,
    clarityMatchRefund: 7,
    claritySolveRecover: 20,
    confidenceOptional: false,
    opponentStrength: 'sovereign',
  },
  boss: {
    modeKey: 'boss',
    label: 'Guardian Trials',
    distractorStrength: 5,
    synthesisDepth: 4,
    noiseLevel: 0.55,
    hintTiersAllowed: 3,
    clarityMax: 100,
    clarityFloor: 15,
    clarityWrongPenalty: 14,
    claritySureMultiplier: 1.5,
    clarityMatchRefund: 6,
    claritySolveRecover: 22,
    confidenceOptional: false,
    opponentStrength: 'sovereign',
  },
  procedural: {
    modeKey: 'procedural',
    label: 'Procedural Anomalies',
    distractorStrength: 4,
    synthesisDepth: 3,
    noiseLevel: 0.45,
    hintTiersAllowed: 3,
    clarityMax: 100,
    clarityFloor: 20,
    clarityWrongPenalty: 11,
    claritySureMultiplier: 1.5,
    clarityMatchRefund: 4,
    claritySolveRecover: 14,
    confidenceOptional: false,
    opponentStrength: 'sharp',
  },
};

export function resolvePuzzleModeKey(puzzle: PuzzleSpec, isBoss = false): GameModeKey {
  if (puzzle.modeKey) return puzzle.modeKey;
  if (puzzle.id.startsWith('enc_')) return 'prologue';
  if (puzzle.id.startsWith('tut_')) return 'tutorial';
  if (isBoss || puzzle.id.startsWith('boss_')) return 'boss';
  if (puzzle.isProcedural || puzzle.id.startsWith('proc_')) return 'procedural';
  switch (puzzle.stageNumber) {
    case 1:
      return 'stage_1';
    case 2:
      return 'stage_2';
    case 3:
      return 'stage_3';
    case 4:
      return 'stage_4';
    case 5:
      return 'stage_5';
    default:
      return 'stage_6';
  }
}

export function getModeDifficultyConfig(puzzle: PuzzleSpec, isBoss = false): ModeDifficultyParams {
  return DIFFICULTY_CONFIG[resolvePuzzleModeKey(puzzle, isBoss)];
}
