import {
  COGNITIVE_ABILITIES,
  createInitialAttributes,
  getAttributeUpgradeCost,
  getMilestoneForLevel,
  getSecondaryGameplayBonuses,
  getXpForNextTubLevel,
} from './attributes';
import {
  BOSS_ENCOUNTERS,
  KNOWLEDGE_ARCHIVE,
  MULTIVERSE_STAGES,
  QUEST_CATALOG,
} from './multiverseData';
import { getModeDifficultyConfig } from './difficultyConfig';
import { recordConfidenceOnSolve } from './metacognition';
import { PROLOGUE_CHRONICLE_BASE_IDS } from './prologueAndTutorialData';
import {
  BookTextSize,
  ConfidenceTag,
  EvidenceBoardState,
  GameSaveState,
  HintLevel,
  MarginStance,
  PerformanceRecord,
  PlanDecisionEntry,
  PrimaryAttributeId,
  PuzzleCategory,
  PuzzleSpec,
  QuestDefinition,
  TutorialStageSpec,
} from './types';

export const SAVE_SCHEMA_VERSION = 1;

export function createNewSaveState(): GameSaveState {
  const now = Date.now();
  return {
    version: SAVE_SCHEMA_VERSION,
    startedAt: now,
    lastSavedAt: now,
    tubLevel: 1,
    xp: 0,
    ip: 20,
    kp: 10,
    ep: 0,
    clarity: 100,
    clarityMax: 100,
    transcendenceRank: 0,
    attributes: createInitialAttributes(),
    abilities: {},
    unlockedStage: 1,
    completedNodeIds: [],
    defeatedBossIds: [],
    bossPhaseProgress: {},
    discoveredItemIds: [],
    unlockedArchiveIds: [],
    unlockedBookIds: [],
    unlockedStoryEvents: [],
    completedQuestIds: [],
    puzzleNotes: {},
    mistakePatterns: {},
    freeHintLastUsedAt: 0,
    adaptiveDifficultyOffset: 0,
    performanceHistory: [],
    activeUniverseStage: 1,
    settings: {
      audioEnabled: true,
      ambientMusicEnabled: false,
      adaptiveDifficultyEnabled: true,
      freeHintCooldownMinutes: 3,
      showConfidenceCalibration: true,
    },
    proceduralSolvedCount: 0,
    prologueCompleted: false,
    prologueBeatIndex: 0,
    tutorialCompleted: false,
    tutorialStageIndex: 0,
    completedTutorialStageNumbers: [],
    unlockedChronicleIds: [],
    completedStoryEncounterIds: [],
    errorJournal: [],
    confidenceStats: {
      sureTotal: 0,
      sureCorrect: 0,
      thinkSoTotal: 0,
      thinkSoCorrect: 0,
      guessingTotal: 0,
      guessingCorrect: 0,
    },
    bookBookmarks: [],
    bookMarginNotes: {},
    bookTextSize: 'base',
    chapterRatings: {},
    bookInlineChoices: {},
    evidenceBoards: {},
    opponentMemory: {
      opponentResponses: {},
      patternCounts: {},
      overconfidentMisses: 0,
      totalMisses: 0,
      cleanFirstTrySolves: 0,
    },
    secondOrderReflections: {},
    planDecisions: [],
  };
}

export function recordPrologueBeatProgress(
  state: GameSaveState,
  beatIndex: number,
  unlocksChronicleIds?: string[]
): GameSaveState {
  const safeIndex = Math.max(0, Math.round(beatIndex));
  const mergedChronicles =
    unlocksChronicleIds && unlocksChronicleIds.length > 0
      ? Array.from(new Set([...(state.unlockedChronicleIds ?? []), ...unlocksChronicleIds]))
      : state.unlockedChronicleIds ?? [];
  const sameIndex = state.prologueBeatIndex === safeIndex;
  const sameChronicles = mergedChronicles.length === (state.unlockedChronicleIds ?? []).length;
  if (sameIndex && sameChronicles) {
    return state;
  }
  return {
    ...state,
    prologueBeatIndex: safeIndex,
    unlockedChronicleIds: mergedChronicles,
    lastSavedAt: Date.now(),
  };
}

export function completePrologueEncounter(
  state: GameSaveState,
  puzzle: PuzzleSpec
): {
  nextState: GameSaveState;
  grantedRewards: { xp: number; ip: number; kp: number; ep: number };
} {
  const doneIds = state.completedStoryEncounterIds ?? [];
  if (doneIds.includes(puzzle.id)) {
    return {
      nextState: state,
      grantedRewards: { xp: 0, ip: 0, kp: 0, ep: 0 },
    };
  }
  const res = awardProgressionResources(state, puzzle.rewards);
  const storyId = puzzle.narrative?.storyEventId;
  const nextStoryEvents =
    storyId && !res.nextState.unlockedStoryEvents.includes(storyId)
      ? [...res.nextState.unlockedStoryEvents, storyId]
      : res.nextState.unlockedStoryEvents;
  const nextState: GameSaveState = {
    ...res.nextState,
    completedStoryEncounterIds: [...doneIds, puzzle.id],
    unlockedStoryEvents: nextStoryEvents,
    lastSavedAt: Date.now(),
  };
  return {
    nextState,
    grantedRewards: {
      xp: puzzle.rewards.xp,
      ip: puzzle.rewards.ip,
      kp: puzzle.rewards.kp,
      ep: puzzle.rewards.ep ?? 0,
    },
  };
}

export function completePrologue(state: GameSaveState): GameSaveState {
  const mergedChronicles = Array.from(
    new Set([...(state.unlockedChronicleIds ?? []), ...PROLOGUE_CHRONICLE_BASE_IDS])
  );
  return {
    ...state,
    prologueCompleted: true,
    unlockedChronicleIds: mergedChronicles,
    lastSavedAt: Date.now(),
  };
}

export function completeTutorialStage(
  state: GameSaveState,
  stage: TutorialStageSpec,
  metrics: {
    attempts: number;
    hintsUsed: number;
    maxHintLevel: HintLevel;
    timeSeconds: number;
    confidenceRated?: number;
  }
): {
  nextState: GameSaveState;
  levelUps: LevelUpEvent[];
  completedQuests: QuestDefinition[];
  grantedRewards: { xp: number; ip: number; kp: number; ep: number };
} {
  const completedStages = state.completedTutorialStageNumbers ?? [];
  const alreadyClearedStage =
    completedStages.includes(stage.stageNumber) ||
    state.tutorialCompleted ||
    state.tutorialStageIndex >= stage.stageNumber;

  const mergedChronicles = Array.from(
    new Set([
      ...(state.unlockedChronicleIds ?? []),
      ...PROLOGUE_CHRONICLE_BASE_IDS,
      ...stage.unlocksChronicleIds,
    ])
  );

  // Prevent reward farming or duplicate history/story events on replay or revisit
  if (alreadyClearedStage) {
    const nextCompletedStages = completedStages.includes(stage.stageNumber)
      ? completedStages
      : [...completedStages, stage.stageNumber].sort((a, b) => a - b);
    return {
      nextState: {
        ...state,
        completedTutorialStageNumbers: nextCompletedStages,
        unlockedChronicleIds: mergedChronicles,
      },
      levelUps: [],
      completedQuests: [],
      grantedRewards: { xp: 0, ip: 0, kp: 0, ep: 0 },
    };
  }

  const res = recordPuzzleSolve(state, stage.puzzle, {
    nodeId: `tut_node_${stage.stageNumber}`,
    attempts: metrics.attempts,
    hintsUsed: metrics.hintsUsed,
    maxHintLevel: metrics.maxHintLevel,
    timeSeconds: metrics.timeSeconds,
    confidenceRated: metrics.confidenceRated,
  });

  const nextCompletedStages = [...completedStages, stage.stageNumber].sort((a, b) => a - b);
  const nextStageIdx = Math.min(6, Math.max(res.nextState.tutorialStageIndex, stage.stageNumber));

  const storyId = stage.triggersStoryEvent?.id ?? stage.puzzle.narrative?.storyEventId;
  const nextStoryEvents =
    storyId && !res.nextState.unlockedStoryEvents.includes(storyId)
      ? [...res.nextState.unlockedStoryEvents, storyId]
      : res.nextState.unlockedStoryEvents;

  const nextState: GameSaveState = {
    ...res.nextState,
    prologueCompleted: true,
    tutorialStageIndex: nextStageIdx,
    completedTutorialStageNumbers: nextCompletedStages,
    tutorialCompleted: res.nextState.tutorialCompleted || stage.stageNumber >= 6,
    unlockedChronicleIds: mergedChronicles,
    unlockedStoryEvents: nextStoryEvents,
    lastSavedAt: Date.now(),
  };

  return {
    nextState,
    levelUps: res.levelUps,
    completedQuests: res.completedQuests,
    grantedRewards: res.grantedRewards,
  };
}

export interface LevelUpEvent {
  newLevel: number;
  milestoneTitle?: string;
  milestoneBonus?: string;
}

export function awardProgressionResources(
  state: GameSaveState,
  rewards: { xp: number; ip: number; kp: number; ep?: number }
): { nextState: GameSaveState; levelUps: LevelUpEvent[] } {
  let xp = state.xp + rewards.xp;
  let ip = state.ip + rewards.ip;
  let kp = state.kp + rewards.kp;
  let ep = state.ep + (rewards.ep ?? 0);
  let tubLevel = state.tubLevel;
  const levelUps: LevelUpEvent[] = [];

  while (xp >= getXpForNextTubLevel(tubLevel)) {
    xp -= getXpForNextTubLevel(tubLevel);
    tubLevel += 1;
    // Meaningful reward every level (+8 IP base) plus milestone bonuses at 2, 5, 10...
    ip += 8;
    const milestone = getMilestoneForLevel(tubLevel);
    if (milestone) {
      if (tubLevel === 2) {
        ip += 15;
      } else if (tubLevel === 5) {
        ip += 30;
        kp += 15;
        ep += 1;
      } else if (tubLevel % 10 === 0) {
        ip += 65;
        kp += 30;
        ep += 2;
      } else if (tubLevel % 5 === 0) {
        ip += 35;
        ep += 1;
      }
      levelUps.push({
        newLevel: tubLevel,
        milestoneTitle: milestone.title,
        milestoneBonus: milestone.rewardText,
      });
    } else {
      levelUps.push({ newLevel: tubLevel });
    }
  }

  return {
    nextState: {
      ...state,
      tubLevel,
      xp,
      ip,
      kp,
      ep,
      lastSavedAt: Date.now(),
    },
    levelUps,
  };
}

export function upgradePrimaryAttribute(
  state: GameSaveState,
  attributeId: PrimaryAttributeId
): { ok: boolean; nextState: GameSaveState; message: string } {
  const attr = state.attributes[attributeId];
  if (!attr) {
    return { ok: false, nextState: state, message: 'Unknown attribute.' };
  }
  const cost = getAttributeUpgradeCost(attr.level);
  if (state.ip < cost) {
    return {
      ok: false,
      nextState: state,
      message: `Requires ${cost} IP (currently ${state.ip} IP).`,
    };
  }
  const nextLevel = attr.level + 1;
  const nextState: GameSaveState = {
    ...state,
    ip: state.ip - cost,
    attributes: {
      ...state.attributes,
      [attributeId]: {
        ...attr,
        level: nextLevel,
        xp: attr.xp + 25,
      },
    },
    lastSavedAt: Date.now(),
  };

  const evaluated = evaluateQuests(nextState);
  return {
    ok: true,
    nextState: evaluated.nextState,
    message: `Upgraded to Level ${nextLevel}.`,
  };
}

export function canUnlockOrUpgradeAbility(
  state: GameSaveState,
  abilityId: string
): { allowed: boolean; reason?: string; costIP: number; costEP: number } {
  const def = COGNITIVE_ABILITIES.find((a) => a.id === abilityId);
  if (!def) return { allowed: false, reason: 'Ability not found.', costIP: 0, costEP: 0 };

  const currentRank = state.abilities[abilityId] ?? 0;
  if (currentRank >= def.maxRank) {
    return { allowed: false, reason: 'Maximum rank reached.', costIP: 0, costEP: 0 };
  }

  const costIP = def.costPerRankIP * (currentRank + 1);
  const costEP = currentRank === 0 ? def.epRequired ?? 0 : 0;

  const primaryLevel = state.attributes[def.primaryAttribute]?.level ?? 1;
  const reqLevel = def.minAttributeLevel + currentRank;
  if (primaryLevel < reqLevel) {
    return {
      allowed: false,
      reason: `Requires ${def.primaryAttribute.replace('_', ' ')} Lv ${reqLevel}.`,
      costIP,
      costEP,
    };
  }

  if (def.secondaryRequirements) {
    for (const [secId, minLvl] of Object.entries(def.secondaryRequirements)) {
      const actual = state.attributes[secId as PrimaryAttributeId]?.level ?? 1;
      if (actual < (minLvl ?? 1)) {
        return {
          allowed: false,
          reason: `Requires ${secId.replace('_', ' ')} Lv ${minLvl}.`,
          costIP,
          costEP,
        };
      }
    }
  }

  if (state.ip < costIP) {
    return { allowed: false, reason: `Needs ${costIP} IP.`, costIP, costEP };
  }
  if (state.ep < costEP) {
    return { allowed: false, reason: `Needs ${costEP} EP.`, costIP, costEP };
  }

  return { allowed: true, costIP, costEP };
}

export function unlockOrUpgradeAbility(
  state: GameSaveState,
  abilityId: string
): { ok: boolean; nextState: GameSaveState; message: string } {
  const check = canUnlockOrUpgradeAbility(state, abilityId);
  if (!check.allowed) {
    return { ok: false, nextState: state, message: check.reason ?? 'Locked.' };
  }
  const nextRank = (state.abilities[abilityId] ?? 0) + 1;
  const nextState: GameSaveState = {
    ...state,
    ip: state.ip - check.costIP,
    ep: state.ep - check.costEP,
    abilities: {
      ...state.abilities,
      [abilityId]: nextRank,
    },
    lastSavedAt: Date.now(),
  };
  const evaluated = evaluateQuests(nextState);
  return {
    ok: true,
    nextState: evaluated.nextState,
    message: `Ability advanced to Rank ${nextRank}.`,
  };
}

export function computeSolutionEfficiency(params: {
  attempts: number;
  hintsUsed: number;
  maxHintLevel: HintLevel;
  timeSeconds: number;
  adaptabilityBufferPct?: number;
}): number {
  const attemptPenalty = Math.max(0, params.attempts - 1) * 16;
  const hintPenalty = params.hintsUsed * 8 + params.maxHintLevel * 3;
  const bufferScale = 1 - Math.min(0.25, Math.max(0, (params.adaptabilityBufferPct ?? 0) / 100));
  const cushionedPenalty = (attemptPenalty + hintPenalty) * bufferScale;
  // Do NOT penalize thoughtful deep reasoning time—only mild drift above 240s
  const timePenalty = params.timeSeconds > 240 ? Math.min(12, Math.floor((params.timeSeconds - 240) / 30)) : 0;
  return Math.max(15, Math.min(100, Math.round(100 - cushionedPenalty - timePenalty)));
}

export function computeAdaptiveDifficultyDelta(
  currentOffset: number,
  record: PerformanceRecord
): number {
  let delta = 0;
  if (record.solved && record.attempts === 1 && record.hintsUsed === 0) {
    delta = 4;
  } else if (record.solved && record.efficiencyScore >= 75) {
    delta = 2;
  } else if (!record.solved || record.attempts >= 4 || record.maxHintLevel >= 3) {
    delta = -4;
  }
  return Math.max(-15, Math.min(25, currentOffset + delta));
}

export function recordMistakePattern(state: GameSaveState, trapId: string): GameSaveState {
  if (!trapId) return state;
  return {
    ...state,
    mistakePatterns: {
      ...state.mistakePatterns,
      [trapId]: (state.mistakePatterns[trapId] ?? 0) + 1,
    },
    lastSavedAt: Date.now(),
  };
}

export function recordPuzzleSolve(
  state: GameSaveState,
  puzzle: PuzzleSpec,
  metrics: {
    nodeId?: string;
    attempts: number;
    hintsUsed: number;
    maxHintLevel: HintLevel;
    timeSeconds: number;
    confidenceRated?: number;
    confidenceTag?: ConfidenceTag;
    submittedAnswer?: string;
    isBoss?: boolean;
  }
): {
  nextState: GameSaveState;
  levelUps: LevelUpEvent[];
  completedQuests: QuestDefinition[];
  grantedRewards: { xp: number; ip: number; kp: number; ep: number };
} {
  const alreadyCompletedNode = metrics.nodeId
    ? state.completedNodeIds.includes(metrics.nodeId)
    : false;
  const bookCount = state.unlockedBookIds?.length ?? state.unlockedArchiveIds.length;
  const secBonuses = getSecondaryGameplayBonuses(
    state.attributes,
    bookCount,
    state.transcendenceRank,
    state.abilities
  );
  const modeConfig = getModeDifficultyConfig(puzzle, metrics.isBoss);

  const applyAdaptBuffer = puzzle.stageNumber >= 2 || metrics.isBoss;
  const efficiencyScore = computeSolutionEfficiency({
    ...metrics,
    adaptabilityBufferPct: applyAdaptBuffer ? secBonuses.adaptabilityEfficiencyBufferPct : 0,
  });

  const perfRecord: PerformanceRecord = {
    timestamp: Date.now(),
    puzzleId: puzzle.id,
    category: puzzle.category,
    difficultyScore: puzzle.difficultyScore,
    solved: true,
    attempts: metrics.attempts,
    hintsUsed: metrics.hintsUsed,
    maxHintLevel: metrics.maxHintLevel,
    timeSeconds: metrics.timeSeconds,
    efficiencyScore,
    confidenceRated: metrics.confidenceRated,
    confidenceTag: metrics.confidenceTag,
  };

  const effBonus =
    metrics.attempts === 1 && (state.attributes.processing_efficiency?.level ?? 1) >= 5 ? 1.15 : 1;
  const systemsScale =
    puzzle.category === 'hybrid' || metrics.isBoss
      ? 1 + secBonuses.systemsCascadeBonusPct / 100
      : 1;
  const transBonus = 1 + state.transcendenceRank * 0.1;

  const replayScale = alreadyCompletedNode && !puzzle.isProcedural ? 0.25 : 1;
  const grantedRewards = {
    xp: Math.max(5, Math.round(puzzle.rewards.xp * replayScale * transBonus)),
    ip: Math.max(3, Math.round(puzzle.rewards.ip * replayScale * effBonus * systemsScale * transBonus)),
    kp: Math.max(2, Math.round(puzzle.rewards.kp * replayScale * systemsScale)),
    ep: !alreadyCompletedNode ? puzzle.rewards.ep ?? 0 : 0,
  };

  const { nextState: resourcedState, levelUps } = awardProgressionResources(state, grantedRewards);
  const confidenceUpdated = recordConfidenceOnSolve(resourcedState, metrics.confidenceTag, metrics.attempts);

  const nextCompletedNodes =
    metrics.nodeId && !alreadyCompletedNode
      ? [...confidenceUpdated.completedNodeIds, metrics.nodeId]
      : confidenceUpdated.completedNodeIds;

  const storyEventId = puzzle.narrative?.storyEventId;
  const nextStoryEvents =
    storyEventId && !confidenceUpdated.unlockedStoryEvents.includes(storyEventId)
      ? [...confidenceUpdated.unlockedStoryEvents, storyEventId]
      : confidenceUpdated.unlockedStoryEvents;

  const nextOffset = state.settings.adaptiveDifficultyEnabled
    ? computeAdaptiveDifficultyDelta(state.adaptiveDifficultyOffset, perfRecord)
    : state.adaptiveDifficultyOffset;

  const currentClarity =
    typeof confidenceUpdated.clarity === 'number' ? confidenceUpdated.clarity : modeConfig.clarityMax;
  const nextClarity = Math.min(modeConfig.clarityMax, currentClarity + modeConfig.claritySolveRecover);

  const planEntry: PlanDecisionEntry | null =
    metrics.submittedAnswer &&
    (puzzle.workspaceMode === 'commit_plan' || puzzle.interactionType === 'rubric_synthesis' || metrics.isBoss)
      ? {
          id: `plan_${Date.now()}_${puzzle.id}`,
          puzzleId: puzzle.id,
          puzzleTitle: puzzle.title,
          timestamp: Date.now(),
          submittedPlan: metrics.submittedAnswer.slice(0, 220),
          outcome: metrics.attempts === 1 ? 'passed' : 'revised',
          lessonNote: puzzle.postSolvePrompt?.takeaway,
        }
      : null;

  const updatedState: GameSaveState = {
    ...confidenceUpdated,
    clarity: nextClarity,
    clarityMax: modeConfig.clarityMax,
    completedNodeIds: nextCompletedNodes,
    unlockedStoryEvents: nextStoryEvents,
    performanceHistory: [...confidenceUpdated.performanceHistory, perfRecord].slice(-240),
    adaptiveDifficultyOffset: nextOffset,
    proceduralSolvedCount: confidenceUpdated.proceduralSolvedCount + (puzzle.isProcedural ? 1 : 0),
    planDecisions: planEntry
      ? [...(confidenceUpdated.planDecisions ?? []), planEntry].slice(-40)
      : confidenceUpdated.planDecisions ?? [],
  };

  const questEval = evaluateQuests(updatedState);
  return {
    nextState: questEval.nextState,
    levelUps: [...levelUps, ...questEval.levelUps],
    completedQuests: questEval.newlyCompleted,
    grantedRewards,
  };
}

export function completeBossPhase(
  state: GameSaveState,
  bossId: string,
  nodeId: string | undefined,
  phaseNumber: number
): {
  nextState: GameSaveState;
  bossDefeated: boolean;
  unlockedStageNumber?: number;
  levelUps: LevelUpEvent[];
  completedQuests: QuestDefinition[];
} {
  const boss = BOSS_ENCOUNTERS[bossId];
  if (!boss) {
    return {
      nextState: state,
      bossDefeated: false,
      levelUps: [],
      completedQuests: [],
    };
  }

  const totalPhases = boss.phases.length;
  const bossDefeated = phaseNumber >= totalPhases;

  let workingState: GameSaveState = {
    ...state,
    bossPhaseProgress: {
      ...state.bossPhaseProgress,
      [bossId]: Math.max(state.bossPhaseProgress[bossId] ?? 0, phaseNumber),
    },
  };

  let allLevelUps: LevelUpEvent[] = [];
  let unlockedStageNumber: number | undefined;

  if (bossDefeated) {
    const firstKill = !workingState.defeatedBossIds.includes(bossId);
    if (firstKill) {
      const res = awardProgressionResources(workingState, boss.rewards);
      workingState = res.nextState;
      allLevelUps = res.levelUps;
      const nextUnlockedIds =
        boss.rewards.unlocksArchiveId &&
        !workingState.unlockedArchiveIds.includes(boss.rewards.unlocksArchiveId)
          ? [...workingState.unlockedArchiveIds, boss.rewards.unlocksArchiveId]
          : workingState.unlockedArchiveIds;
      workingState = {
        ...workingState,
        defeatedBossIds: [...workingState.defeatedBossIds, bossId],
        unlockedStage: Math.max(workingState.unlockedStage, Math.min(7, boss.stageNumber + 1)),
        unlockedArchiveIds: nextUnlockedIds,
        unlockedBookIds: nextUnlockedIds,
      };
      unlockedStageNumber = boss.stageNumber + 1;
    }
    if (nodeId && !workingState.completedNodeIds.includes(nodeId)) {
      workingState = {
        ...workingState,
        completedNodeIds: [...workingState.completedNodeIds, nodeId],
      };
    }
  }

  const questEval = evaluateQuests(workingState);
  return {
    nextState: questEval.nextState,
    bossDefeated,
    unlockedStageNumber,
    levelUps: [...allLevelUps, ...questEval.levelUps],
    completedQuests: questEval.newlyCompleted,
  };
}

export function recordDiscovery(
  state: GameSaveState,
  discoveryId: string
): { ok: boolean; nextState: GameSaveState; completedQuests: QuestDefinition[] } {
  if (state.discoveredItemIds.includes(discoveryId)) {
    return { ok: false, nextState: state, completedQuests: [] };
  }
  let targetItem = null;
  for (const stage of MULTIVERSE_STAGES) {
    for (const region of stage.regions) {
      const found = region.discoveries.find((d) => d.id === discoveryId);
      if (found) targetItem = found;
    }
  }
  if (!targetItem) {
    return { ok: false, nextState: state, completedQuests: [] };
  }

  const res = awardProgressionResources(state, {
    xp: 35,
    ip: targetItem.ipReward,
    kp: targetItem.kpReward,
  });

  const nextUnlockedIds =
    targetItem.archiveUnlockId &&
    !res.nextState.unlockedArchiveIds.includes(targetItem.archiveUnlockId)
      ? [...res.nextState.unlockedArchiveIds, targetItem.archiveUnlockId]
      : res.nextState.unlockedArchiveIds;

  const nextState: GameSaveState = {
    ...res.nextState,
    discoveredItemIds: [...res.nextState.discoveredItemIds, discoveryId],
    unlockedArchiveIds: nextUnlockedIds,
    unlockedBookIds: nextUnlockedIds,
  };

  const questEval = evaluateQuests(nextState);
  return {
    ok: true,
    nextState: questEval.nextState,
    completedQuests: questEval.newlyCompleted,
  };
}

export function unlockBookFolio(
  state: GameSaveState,
  folioId: string
): { ok: boolean; nextState: GameSaveState; message: string } {
  if (state.unlockedArchiveIds.includes(folioId) || state.unlockedBookIds?.includes(folioId)) {
    return { ok: false, nextState: state, message: 'Already recorded in Book.' };
  }
  const entry = KNOWLEDGE_ARCHIVE.find((e) => e.id === folioId);
  if (!entry) return { ok: false, nextState: state, message: 'Folio not found.' };

  if (state.kp < entry.costKP) {
    return { ok: false, nextState: state, message: `Requires ${entry.costKP} KP.` };
  }

  const mergedIds = Array.from(new Set([...state.unlockedArchiveIds, ...(state.unlockedBookIds ?? []), folioId]));
  const working: GameSaveState = {
    ...state,
    kp: state.kp - entry.costKP,
    unlockedArchiveIds: mergedIds,
    unlockedBookIds: mergedIds,
    lastSavedAt: Date.now(),
  };

  const questEval = evaluateQuests(working);
  return {
    ok: true,
    nextState: questEval.nextState,
    message: `Recorded "${entry.title}" in the Book.`,
  };
}

/** Backwards-compatible alias */
export const unlockArchiveEntry = unlockBookFolio;

export function saveEvidenceBoard(
  state: GameSaveState,
  board: EvidenceBoardState
): GameSaveState {
  return {
    ...state,
    evidenceBoards: {
      ...(state.evidenceBoards ?? {}),
      [board.puzzleId]: board,
    },
    lastSavedAt: Date.now(),
  };
}

export function saveSecondOrderReflection(
  state: GameSaveState,
  puzzleId: string,
  puzzleTitle: string,
  whyItWorks: string,
  patternToWatch: string
): GameSaveState {
  return {
    ...state,
    secondOrderReflections: {
      ...(state.secondOrderReflections ?? {}),
      [puzzleId]: {
        puzzleId,
        puzzleTitle,
        timestamp: Date.now(),
        whyItWorks: whyItWorks.trim(),
        patternToWatch: patternToWatch.trim(),
      },
    },
    lastSavedAt: Date.now(),
  };
}

export function toggleBookBookmark(state: GameSaveState, chapterId: string): GameSaveState {
  const current = state.bookBookmarks ?? [];
  const next = current.includes(chapterId)
    ? current.filter((id) => id !== chapterId)
    : [...current, chapterId];
  return {
    ...state,
    bookBookmarks: next,
    lastSavedAt: Date.now(),
  };
}

export function setBookMarginStance(
  state: GameSaveState,
  claimId: string,
  stance: MarginStance,
  note?: string
): GameSaveState {
  return {
    ...state,
    bookMarginNotes: {
      ...(state.bookMarginNotes ?? {}),
      [claimId]: {
        claimId,
        stance,
        note: note?.trim(),
        markedAt: Date.now(),
      },
    },
    lastSavedAt: Date.now(),
  };
}

export function setBookTextSize(state: GameSaveState, size: BookTextSize): GameSaveState {
  return {
    ...state,
    bookTextSize: size,
    lastSavedAt: Date.now(),
  };
}

export function setBookChapterRating(
  state: GameSaveState,
  chapterId: string,
  rating: number
): GameSaveState {
  const clamped = Math.max(1, Math.min(5, Math.round(rating)));
  return {
    ...state,
    chapterRatings: {
      ...(state.chapterRatings ?? {}),
      [chapterId]: clamped,
    },
    lastSavedAt: Date.now(),
  };
}

export function setBookInlineChoice(
  state: GameSaveState,
  choiceId: string,
  optionId: string
): GameSaveState {
  return {
    ...state,
    bookInlineChoices: {
      ...(state.bookInlineChoices ?? {}),
      [choiceId]: optionId,
    },
    lastSavedAt: Date.now(),
  };
}

export function elevateTranscendence(state: GameSaveState): {
  ok: boolean;
  nextState: GameSaveState;
  message: string;
} {
  const costEP = 2 + state.transcendenceRank;
  if (state.ep < costEP) {
    return { ok: false, nextState: state, message: `Requires ${costEP} Evolution Points.` };
  }
  const nextRank = state.transcendenceRank + 1;
  return {
    ok: true,
    nextState: {
      ...state,
      ep: state.ep - costEP,
      transcendenceRank: nextRank,
      lastSavedAt: Date.now(),
    },
    message: `Transcendence Rank ${nextRank} achieved.`,
  };
}

export function evaluateQuests(state: GameSaveState): {
  nextState: GameSaveState;
  newlyCompleted: QuestDefinition[];
  levelUps: LevelUpEvent[];
} {
  let workingState = { ...state };
  const newlyCompleted: QuestDefinition[] = [];
  let levelUps: LevelUpEvent[] = [];

  for (const q of QUEST_CATALOG) {
    if (workingState.completedQuestIds.includes(q.id)) continue;

    let met = false;
    switch (q.objectiveType) {
      case 'boss_defeat':
        met = q.targetMeta ? workingState.defeatedBossIds.includes(q.targetMeta) : false;
        break;
      case 'upgrade_attribute': {
        const attrLevel = q.targetMeta
          ? workingState.attributes[q.targetMeta as PrimaryAttributeId]?.level ?? 1
          : 1;
        const hasDecomposition =
          q.id === 'q_cog_analytical' ? (workingState.abilities['decomposition'] ?? 0) >= 1 : true;
        met = attrLevel >= q.targetValue && hasDecomposition;
        break;
      }
      case 'unlock_ability': {
        const totalRanks = Object.values(workingState.abilities).reduce((a, b) => a + b, 0);
        met = totalRanks >= q.targetValue;
        break;
      }
      case 'discover_count':
        met = workingState.discoveredItemIds.length >= q.targetValue;
        break;
      case 'unlock_archive_count':
        met = workingState.unlockedArchiveIds.length >= q.targetValue;
        break;
      case 'no_hint_solve': {
        const unassisted = workingState.performanceHistory.filter(
          (r) => r.solved && r.hintsUsed === 0
        ).length;
        met = unassisted >= q.targetValue;
        break;
      }
      case 'solve_count':
        met = workingState.performanceHistory.filter((r) => r.solved).length >= q.targetValue;
        break;
      case 'solve_stage':
        met = workingState.unlockedStage > q.targetValue;
        break;
      case 'story_event':
        met = q.targetMeta ? workingState.unlockedStoryEvents.includes(q.targetMeta) : false;
        break;
    }

    if (met) {
      newlyCompleted.push(q);
      workingState = {
        ...workingState,
        completedQuestIds: [...workingState.completedQuestIds, q.id],
      };
      const res = awardProgressionResources(workingState, q.rewards);
      workingState = res.nextState;
      levelUps = [...levelUps, ...res.levelUps];
    }
  }

  return { nextState: workingState, newlyCompleted, levelUps };
}

export function getQuestProgress(state: GameSaveState, q: QuestDefinition): { current: number; target: number } {
  if (state.completedQuestIds.includes(q.id)) {
    return { current: q.targetValue, target: q.targetValue };
  }
  switch (q.objectiveType) {
    case 'boss_defeat':
      return {
        current: q.targetMeta && state.defeatedBossIds.includes(q.targetMeta) ? 1 : 0,
        target: 1,
      };
    case 'story_event':
      return {
        current: q.targetMeta && state.unlockedStoryEvents.includes(q.targetMeta) ? 1 : 0,
        target: 1,
      };
    case 'upgrade_attribute':
      return {
        current: Math.min(
          q.targetValue,
          q.targetMeta ? state.attributes[q.targetMeta as PrimaryAttributeId]?.level ?? 1 : 1
        ),
        target: q.targetValue,
      };
    case 'unlock_ability':
      return {
        current: Math.min(
          q.targetValue,
          Object.values(state.abilities).reduce((a, b) => a + b, 0)
        ),
        target: q.targetValue,
      };
    case 'discover_count':
      return { current: Math.min(q.targetValue, state.discoveredItemIds.length), target: q.targetValue };
    case 'unlock_archive_count':
      return { current: Math.min(q.targetValue, state.unlockedArchiveIds.length), target: q.targetValue };
    case 'no_hint_solve':
      return {
        current: Math.min(
          q.targetValue,
          state.performanceHistory.filter((r) => r.solved && r.hintsUsed === 0).length
        ),
        target: q.targetValue,
      };
    case 'solve_count':
      return {
        current: Math.min(
          q.targetValue,
          state.performanceHistory.filter((r) => r.solved).length
        ),
        target: q.targetValue,
      };
    default:
      return { current: 0, target: q.targetValue };
  }
}

export interface CategoryStatSummary {
  category: PuzzleCategory;
  solvedCount: number;
  avgAttempts: number;
  avgEfficiency: number;
  avgHintsUsed: number;
}

export interface PlayerAnalyticsSummary {
  totalSolved: number;
  highestDifficultySolved: number;
  averageAttempts: number;
  averageHintsUsed: number;
  averageEfficiency: number;
  firstAttemptRate: number;
  bestCategory: CategoryStatSummary | null;
  weakestCategory: CategoryStatSummary | null;
  categoryBreakdown: CategoryStatSummary[];
  recommendedPracticeCategory: PuzzleCategory;
  growthCategory: PuzzleCategory;
  stretchCategory: PuzzleCategory;
  dominantTrap: { trapId: string; count: number } | null;
}

export function computePlayerAnalytics(state: GameSaveState): PlayerAnalyticsSummary {
  const solved = state.performanceHistory.filter((r) => r.solved);
  const totalSolved = solved.length;

  const trapEntries = Object.entries(state.mistakePatterns ?? {}).filter(([, count]) => count > 0);
  trapEntries.sort((a, b) => b[1] - a[1]);
  const dominantTrap =
    trapEntries.length > 0 ? { trapId: trapEntries[0][0], count: trapEntries[0][1] } : null;

  if (totalSolved === 0) {
    return {
      totalSolved: 0,
      highestDifficultySolved: 0,
      averageAttempts: 0,
      averageHintsUsed: 0,
      averageEfficiency: 0,
      firstAttemptRate: 0,
      bestCategory: null,
      weakestCategory: null,
      categoryBreakdown: [],
      recommendedPracticeCategory: 'mathematical',
      growthCategory: 'mathematical',
      stretchCategory: 'hybrid',
      dominantTrap,
    };
  }

  const highestDifficultySolved = Math.max(...solved.map((r) => r.difficultyScore));
  const averageAttempts = solved.reduce((a, b) => a + b.attempts, 0) / totalSolved;
  const averageHintsUsed = solved.reduce((a, b) => a + b.hintsUsed, 0) / totalSolved;
  const averageEfficiency = solved.reduce((a, b) => a + b.efficiencyScore, 0) / totalSolved;
  const firstAttemptRate = (solved.filter((r) => r.attempts === 1).length / totalSolved) * 100;

  const byCat = new Map<PuzzleCategory, PerformanceRecord[]>();
  for (const r of solved) {
    const arr = byCat.get(r.category) ?? [];
    arr.push(r);
    byCat.set(r.category, arr);
  }

  const categoryBreakdown: CategoryStatSummary[] = [];
  for (const [category, records] of byCat.entries()) {
    categoryBreakdown.push({
      category,
      solvedCount: records.length,
      avgAttempts: records.reduce((a, b) => a + b.attempts, 0) / records.length,
      avgEfficiency: records.reduce((a, b) => a + b.efficiencyScore, 0) / records.length,
      avgHintsUsed: records.reduce((a, b) => a + b.hintsUsed, 0) / records.length,
    });
  }

  categoryBreakdown.sort((a, b) => b.avgEfficiency - a.avgEfficiency);
  const bestCategory = categoryBreakdown[0] ?? null;
  const weakestCategory = categoryBreakdown[categoryBreakdown.length - 1] ?? null;

  const allCats: PuzzleCategory[] = [
    'mathematical',
    'formal_logic',
    'pattern',
    'spatial',
    'scientific',
    'linguistic',
    'strategic',
    'philosophical',
    'hybrid',
  ];
  const unplayedCat = allCats.find((c) => !byCat.has(c));
  const growthCategory = unplayedCat ?? weakestCategory?.category ?? 'hybrid';
  const stretchCategory = bestCategory?.category ?? 'hybrid';

  return {
    totalSolved,
    highestDifficultySolved,
    averageAttempts,
    averageHintsUsed,
    averageEfficiency,
    firstAttemptRate,
    bestCategory,
    weakestCategory,
    categoryBreakdown,
    recommendedPracticeCategory: growthCategory,
    growthCategory,
    stretchCategory,
    dominantTrap,
  };
}
