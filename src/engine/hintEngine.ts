import { getSecondaryGameplayBonuses } from './attributes';
import {
  GameSaveState,
  HintLevel,
  IntelligenceTier,
  PrimaryAttributeId,
  PuzzleSpec,
} from './types';

export interface HintLevelMetadata {
  level: 1 | 2 | 3;
  name: string;
  baseIpCost: number;
  summary: string;
}

export const HINT_LEVELS: HintLevelMetadata[] = [
  {
    level: 1,
    name: 'Orientation & Where to Look',
    baseIpCost: 3,
    summary: 'Points toward which record, measurement, or rule boundary deserves another look.',
  },
  {
    level: 2,
    name: 'Evidence Relation',
    baseIpCost: 7,
    summary: 'Highlights how two pieces of evidence interact without ruling out options or giving values.',
  },
  {
    level: 3,
    name: 'Structural Frame',
    baseIpCost: 12,
    summary: 'Offers a general reasoning lens or comparison method; Jacob still executes the deduction.',
  },
];

export function computeEffectiveAttributeScore(
  save: GameSaveState,
  relevantAttributes: PrimaryAttributeId[]
): number {
  if (relevantAttributes.length === 0) {
    return save.attributes.analytical.level;
  }
  const sum = relevantAttributes.reduce(
    (acc, attrId) => acc + (save.attributes[attrId]?.level ?? 1),
    0
  );
  // Attribute depth only adjusts prose phrasing register—no artificial tier elevation or answer leak
  return sum / relevantAttributes.length;
}

export function resolveIntelligenceTier(
  save: GameSaveState,
  relevantAttributes: PrimaryAttributeId[]
): IntelligenceTier {
  const score = computeEffectiveAttributeScore(save, relevantAttributes);
  if (score >= 8.5) return 'transcendent';
  if (score >= 5.5) return 'high';
  if (score >= 3.0) return 'moderate';
  return 'low';
}

export function getHintTierLabel(tier: IntelligenceTier): string {
  switch (tier) {
    case 'low':
      return 'Foundational Framing';
    case 'moderate':
      return 'Analytical Framing';
    case 'high':
      return 'Invariant Framing';
    case 'transcendent':
      return 'Meta-Structural Framing';
  }
}

export function computeHintCostIP(
  save: GameSaveState,
  level: Exclude<HintLevel, 0>,
  puzzleDifficultyScore: number
): number {
  const meta = HINT_LEVELS.find((h) => h.level === level);
  if (!meta) return 0;

  const metaLevel = save.attributes.metacognition?.level ?? 1;
  const bookCount = (save.unlockedBookIds?.length ?? save.unlockedArchiveIds.length);
  const secBonuses = getSecondaryGameplayBonuses(
    save.attributes,
    bookCount,
    save.transcendenceRank,
    save.abilities
  );
  const metaDiscount = Math.min(0.25, (metaLevel - 1) * 0.035);
  const knowledgeDiscount = secBonuses.knowledgeHintDiscountBonusPct / 100;
  const discount = Math.min(0.38, metaDiscount + knowledgeDiscount);
  const difficultyScale = 0.8 + (puzzleDifficultyScore / 100) * 0.6;
  return Math.max(1, Math.round(meta.baseIpCost * difficultyScale * (1 - discount)));
}

export function getFreeHintCooldownMs(save: GameSaveState): number {
  const effLevel = save.attributes.processing_efficiency?.level ?? 1;
  const baseMinutes = save.settings.freeHintCooldownMinutes || 3;
  const reduction = Math.min(0.6, (effLevel - 1) * 0.06);
  return Math.round(baseMinutes * 60 * 1000 * (1 - reduction));
}

export function isFreeBasicHintAvailable(save: GameSaveState, nowMs: number = Date.now()): boolean {
  const cooldown = getFreeHintCooldownMs(save);
  return nowMs - save.freeHintLastUsedAt >= cooldown;
}

export function getAdaptiveHintSpeaker(
  puzzle: PuzzleSpec,
  level: 1 | 2 | 3
): string {
  if (puzzle.hintSpeakers?.[level]) {
    return puzzle.hintSpeakers[level]!;
  }
  if (puzzle.id.startsWith('enc_')) {
    return level === 1 ? 'Mara Solis' : level === 2 ? 'Jacob (Field Margin)' : 'Soren Kael';
  }
  if (puzzle.id.startsWith('tut_')) {
    return level === 3 ? 'Jacob (Ledger Note)' : 'Ilya';
  }
  return level === 2 ? 'Ilya (Echoed Ledger)' : 'Jacob (Margin Study)';
}

export function getAdaptiveHintText(
  puzzle: PuzzleSpec,
  level: 1 | 2 | 3,
  tier: IntelligenceTier
): string {
  const variants = puzzle.hints[level];
  if (!variants) {
    return 'Examine the primary exhibits side by side and test which premise conflicts with the record.';
  }
  return variants[tier] || variants.moderate || variants.low;
}
