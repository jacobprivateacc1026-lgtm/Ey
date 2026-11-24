import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CANONICAL_PUZZLES,
  generateProceduralPuzzle,
  validatePuzzleQuality,
  verifyPuzzleAnswer,
} from './puzzleGenerator';
import { BOSS_ENCOUNTERS } from './multiverseData';
import {
  computeHintCostIP,
  getAdaptiveHintText,
  resolveIntelligenceTier,
} from './hintEngine';
import { getSecondaryGameplayBonuses } from './attributes';
import {
  completeBossPhase,
  completePrologue,
  completePrologueEncounter,
  completeTutorialStage,
  computePlayerAnalytics,
  createNewSaveState,
  recordDiscovery,
  recordMistakePattern,
  recordPrologueBeatProgress,
  recordPuzzleSolve,
  unlockArchiveEntry,
  unlockOrUpgradeAbility,
  upgradePrimaryAttribute,
} from './progression';
import {
  CHRONICLE_SECTIONS,
  CHRONICLES_ENTRIES,
  evaluateTutorialSubmission,
  PROLOGUE_BEATS,
  THRESHOLD_AWAKENING_BEAT,
  TUTORIAL_HINT_LEVEL_LABELS,
  TUTORIAL_STAGES,
} from './prologueAndTutorialData';
import { generateDailyArchiveInsight, generateDailyBookInsight } from './insightGenerator';
import { DIFFICULTY_CONFIG, getModeDifficultyConfig } from './difficultyConfig';
import {
  applyMetacognitionPenalty,
  computeReflectiveProfile,
  recordConfidenceOnSolve,
  validateReflectionEffort,
} from './metacognition';
import { getAdaptiveOpponentCue } from './adaptiveOpponents';
import { BOOK_CHAPTERS, evaluateBookMarginClaim, isRereadMutationUnlocked } from './bookData';
import { runSimulationBenchmarkSuite } from './simulatedSolvers';
import {
  saveSecondOrderReflection,
  setBookMarginStance,
  unlockBookFolio,
} from './progression';
import { validateAndRecoverSave } from './storage';
import { PuzzleCategory } from './types';

test('all canonical puzzles pass quality control & self-verification', () => {
  const sigs = new Set<string>();
  for (const [id, puzzle] of Object.entries(CANONICAL_PUZZLES)) {
    const report = validatePuzzleQuality(puzzle, sigs);
    assert.equal(
      report.isValid,
      true,
      `Canonical puzzle ${id} failed QC: ${report.errors.join('; ')}`
    );
    sigs.add(report.signature);

    if (puzzle.interactionType !== 'rubric_synthesis') {
      for (const sol of puzzle.validSolutions) {
        const res = verifyPuzzleAnswer(puzzle, sol);
        assert.equal(res.correct, true, `Canonical puzzle ${id} rejected valid solution ${sol}`);
      }
      const wrong = verifyPuzzleAnswer(puzzle, 'invalid_xyz_999999');
      assert.equal(wrong.correct, false, `Canonical puzzle ${id} accepted bogus answer`);
    } else {
      const rubricRes = verifyPuzzleAnswer(puzzle, puzzle.validSolutions[0]);
      assert.equal(rubricRes.correct, true, `Rubric puzzle ${id} failed reference synthesis`);
    }
  }
});

test('all multi-phase boss puzzles pass quality control & verification', () => {
  const sigs = new Set<string>();
  for (const [bossId, boss] of Object.entries(BOSS_ENCOUNTERS)) {
    assert.ok(boss.phases.length >= 1, `Boss ${bossId} has no phases`);
    for (const phase of boss.phases) {
      const report = validatePuzzleQuality(phase.puzzle, sigs);
      assert.equal(
        report.isValid,
        true,
        `Boss ${bossId} phase ${phase.phaseNumber} failed QC: ${report.errors.join('; ')}`
      );
      sigs.add(report.signature);
    }
  }
});

test('procedural puzzle generator produces valid verified puzzles across all 9 categories', () => {
  const categories: PuzzleCategory[] = [
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
  const sigs = new Set<string>();
  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    const p1 = generateProceduralPuzzle(cat, 35 + i * 5, 1000 + i * 31, sigs, 2);
    assert.ok(p1.qualityReport?.isValid, `Procedural ${cat} failed QC`);
    sigs.add(p1.qualityReport!.signature);

    const check = verifyPuzzleAnswer(p1, p1.validSolutions[0]);
    assert.equal(check.correct, true, `Procedural ${cat} solution verification failed`);
  }
});

test('adaptive hint tier scales with TUB intelligence attributes and abilities', () => {
  let save = createNewSaveState();
  const puzzle = CANONICAL_PUZZLES['s1_axiom_spire_1'];

  assert.equal(resolveIntelligenceTier(save, puzzle.relevantAttributes), 'low');
  const lowHint = getAdaptiveHintText(puzzle, 1, 'low');

  // Upgrade relevant attributes + Structural Perception
  save.ip = 500;
  for (let i = 0; i < 4; i++) {
    save = upgradePrimaryAttribute(save, 'pattern_recognition').nextState;
    save = upgradePrimaryAttribute(save, 'analytical').nextState;
  }
  const highTier = resolveIntelligenceTier(save, puzzle.relevantAttributes);
  assert.ok(highTier === 'moderate' || highTier === 'high' || highTier === 'transcendent');

  const highHint = getAdaptiveHintText(puzzle, 1, 'high');
  assert.notEqual(lowHint, highHint);

  const costL1 = computeHintCostIP(save, 1, puzzle.difficultyScore);
  const costL3 = computeHintCostIP(save, 3, puzzle.difficultyScore);
  assert.ok(costL3 > costL1, 'Hint Level 3 must cost more IP than Hint Level 1');
});

test('progression, ability prerequisites, boss stage unlock, and analytics work end-to-end', () => {
  let save = createNewSaveState();
  const p1 = CANONICAL_PUZZLES['s1_axiom_spire_1'];

  // Solve a puzzle without hints on attempt 1
  const solveRes = recordPuzzleSolve(save, p1, {
    nodeId: 'n1_spire_cadence',
    attempts: 1,
    hintsUsed: 0,
    maxHintLevel: 0,
    timeSeconds: 28,
  });
  save = solveRes.nextState;
  assert.ok(save.completedNodeIds.includes('n1_spire_cadence'));
  assert.ok(save.ip > 20);

  // Unlock Decomposition ability (requires analytical Lv 1)
  const abRes = unlockOrUpgradeAbility(save, 'decomposition');
  assert.equal(abRes.ok, true);
  save = abRes.nextState;
  assert.equal(save.abilities['decomposition'], 1);

  // Complete Stage I Boss Phases 1 -> 2
  const boss = BOSS_ENCOUNTERS['boss_axiom_sentinel'];
  const p1Boss = completeBossPhase(save, boss.id, 'n1_boss_sentinel', 1);
  assert.equal(p1Boss.bossDefeated, false);
  save = p1Boss.nextState;

  const p2Boss = completeBossPhase(save, boss.id, 'n1_boss_sentinel', 2);
  assert.equal(p2Boss.bossDefeated, true);
  assert.equal(p2Boss.unlockedStageNumber, 2);
  save = p2Boss.nextState;
  assert.equal(save.unlockedStage, 2);
  assert.ok(save.defeatedBossIds.includes('boss_axiom_sentinel'));
  assert.ok(save.completedQuestIds.includes('q_main_stage1'));

  // Record environmental discovery & unlock archive
  const discRes = recordDiscovery(save, 'disc_spire_inscription');
  assert.equal(discRes.ok, true);
  save = discRes.nextState;
  assert.ok(save.unlockedArchiveIds.includes('arch_finite_differences'));

  const archRes = unlockArchiveEntry(save, 'arch_bivalent_pairs');
  assert.equal(archRes.ok, true);
  save = archRes.nextState;
  assert.ok(save.unlockedArchiveIds.includes('arch_bivalent_pairs'));

  // Analytics check
  const analytics = computePlayerAnalytics(save);
  assert.equal(analytics.totalSolved, 1);
  assert.equal(analytics.bestCategory?.category, 'mathematical');
});

test('daily archive insight rotates deterministically and tracks upgraded cognitive attributes', () => {
  let save = createNewSaveState();
  const day1 = new Date(2026, 10, 23, 10, 0, 0);
  const day1Later = new Date(2026, 10, 23, 22, 30, 0);
  const day2 = new Date(2026, 10, 24, 10, 0, 0);

  const insA = generateDailyArchiveInsight(save, day1);
  const insB = generateDailyArchiveInsight(save, day1Later);
  assert.equal(insA.dateKey, '2026-11-23');
  assert.equal(insA.poolScope, 'foundational');
  assert.equal(insA.message, insB.message);
  assert.equal(insA.attributeId, insB.attributeId);

  const insNextDay = generateDailyArchiveInsight(save, day2);
  assert.equal(insNextDay.dateKey, '2026-11-24');
  assert.notEqual(
    `${insA.attributeId}:${insA.message}`,
    `${insNextDay.attributeId}:${insNextDay.message}`
  );

  // Upgrade only Spatial Intelligence and unlock Decomposition (Analytical)
  save.ip = 100;
  save = upgradePrimaryAttribute(save, 'spatial').nextState;
  save = unlockOrUpgradeAbility(save, 'decomposition').nextState;

  const specialized = generateDailyBookInsight(save, day1);
  assert.equal(specialized.poolScope, 'developed');
  assert.ok(
    specialized.attributeId === 'spatial' || specialized.attributeId === 'analytical',
    `Expected developed attribute pool (spatial/analytical), got ${specialized.attributeId}`
  );
  assert.ok(specialized.message.length > 20);
});

test('all 6 bosses have multi-phase encounters and every phase verifies cleanly', () => {
  for (const [bossId, boss] of Object.entries(BOSS_ENCOUNTERS)) {
    assert.ok(
      boss.phases.length >= 2,
      `Expected Boss ${bossId} to have >= 2 phases, found ${boss.phases.length}`
    );
    for (const phase of boss.phases) {
      const check = verifyPuzzleAnswer(phase.puzzle, phase.puzzle.validSolutions[0]);
      assert.equal(
        check.correct,
        true,
        `Boss ${bossId} phase ${phase.phaseNumber} solution verification failed`
      );
    }
  }
});

test('procedural generator succeeds across 50+ seeds & complexity bands (including formal_logic & LP variants)', () => {
  const categories: PuzzleCategory[] = [
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
  const difficulties = [20, 45, 65, 88];
  const sigs = new Set<string>();
  let generatedCount = 0;

  for (const cat of categories) {
    for (let dIdx = 0; dIdx < difficulties.length; dIdx++) {
      for (let rep = 0; rep < 2; rep++) {
        const diff = difficulties[dIdx];
        const seed = 5000 + generatedCount * 97 + rep * 13;
        const puz = generateProceduralPuzzle(cat, diff, seed, sigs, Math.min(6, dIdx + 1));
        assert.ok(
          puz.qualityReport?.isValid,
          `Procedural ${cat} diff=${diff} seed=${seed} failed QC: ${puz.qualityReport?.errors.join('; ')}`
        );
        sigs.add(puz.qualityReport!.signature);

        const validCheck = verifyPuzzleAnswer(puz, puz.validSolutions[0]);
        assert.equal(
          validCheck.correct,
          true,
          `Procedural ${cat} diff=${diff} seed=${seed} rejected valid solution ${puz.validSolutions[0]}`
        );

        const bogusCheck = verifyPuzzleAnswer(puz, '__impossible_answer_9999__');
        assert.equal(bogusCheck.correct, false, `Procedural ${cat} accepted bogus answer`);
        generatedCount++;
      }
    }
  }
  assert.ok(generatedCount >= 54);
});

test('Vaelori narrative arc, story_event quest, secondary attribute bonuses, mistake patterns, and save recovery work', () => {
  let save = createNewSaveState();
  save.ip = 500;
  save.ep = 10;

  // Elevate Analytical, Metacognition, Creative, Abstract to unlock Secondary Lenses
  for (let i = 0; i < 3; i++) {
    save = upgradePrimaryAttribute(save, 'analytical').nextState;
    save = upgradePrimaryAttribute(save, 'metacognition').nextState;
    save = upgradePrimaryAttribute(save, 'creative').nextState;
    save = upgradePrimaryAttribute(save, 'abstract').nextState;
  }
  const unlockedArch = unlockArchiveEntry(save, 'arch_finite_differences');
  save = unlockedArch.nextState;

  const sec = getSecondaryGameplayBonuses(
    save.attributes,
    save.unlockedArchiveIds.length,
    save.transcendenceRank,
    save.abilities
  );
  assert.equal(sec.systemsLoopLensUnlocked, true);
  assert.equal(sec.adaptabilityReframingUnlocked, true);
  assert.equal(sec.knowledgeArchiveEchoUnlocked, true);
  assert.ok(sec.adaptabilityEfficiencyBufferPct > 0);
  assert.ok(sec.systemsCascadeBonusPct > 0);
  assert.ok(sec.knowledgeHintDiscountBonusPct > 0);

  // Record a mistake pattern and inspect analytics
  save = recordMistakePattern(save, 'magnitude_underestimate');
  save = recordMistakePattern(save, 'magnitude_underestimate');
  let analytics = computePlayerAnalytics(save);
  assert.equal(analytics.dominantTrap?.trapId, 'magnitude_underestimate');
  assert.equal(analytics.dominantTrap?.count, 2);

  // Solve Vaelori verdict to trigger story_event quest q_exp_vaelori
  const vaeloriVerdict = CANONICAL_PUZZLES['s2_vaelori_verdict'];
  assert.ok(vaeloriVerdict.narrative?.storyEventId === 'story_vaelori_mystery_solved');
  const vSolve = recordPuzzleSolve(save, vaeloriVerdict, {
    nodeId: 'n2_vaelori_verdict',
    attempts: 1,
    hintsUsed: 0,
    maxHintLevel: 0,
    timeSeconds: 320, // Thoughtful slow time should not cause severe penalty
  });
  save = vSolve.nextState;
  assert.ok(save.unlockedStoryEvents.includes('story_vaelori_mystery_solved'));
  assert.ok(save.completedQuestIds.includes('q_exp_vaelori'));

  analytics = computePlayerAnalytics(save);
  assert.ok(analytics.growthCategory);
  assert.ok(analytics.stretchCategory);

  // Save validation & legacy recovery check
  assert.equal(validateAndRecoverSave(null), null);
  assert.equal(validateAndRecoverSave({ foo: 'bar' }), null);

  const legacyRecovered = validateAndRecoverSave({
    tubLevel: 4,
    xp: 25,
    ip: 40,
    kp: 12,
    ep: 1,
    unlockedStage: 99, // out of bounds -> should clamp to 7
    attributes: {
      analytical: { id: 'analytical', level: 3, xp: 50 },
    },
    performanceHistory: Array.from({ length: 300 }, (_, i) => ({
      timestamp: i,
      puzzleId: `p_${i}`,
      category: 'mathematical',
      difficultyScore: 30,
      solved: true,
      attempts: 1,
      hintsUsed: 0,
      maxHintLevel: 0,
      timeSeconds: 15,
      efficiencyScore: 100,
    })),
  });
  assert.ok(legacyRecovered !== null);
  assert.equal(legacyRecovered!.unlockedStage, 7);
  assert.equal(legacyRecovered!.performanceHistory.length, 240);
  assert.equal(legacyRecovered!.settings.ambientMusicEnabled, false);
  assert.deepEqual(legacyRecovered!.unlockedStoryEvents, []);
  assert.equal(legacyRecovered!.prologueCompleted, true);
  assert.equal(legacyRecovered!.tutorialCompleted, true);
});

test('story prologue, 6-stage interactive tutorial, diagnostic validation, replay guard, and progressive chronicles work end-to-end', () => {
  // Prologue chapter ordering & 10-beat depth verification
  assert.equal(PROLOGUE_BEATS.length, 10);
  assert.deepEqual(
    PROLOGUE_BEATS.map((b) => b.chapterId),
    [
      'prologue_jacob',
      'prologue_jacob',
      'prologue_jacob',
      'chapter_1_humanity',
      'chapter_1_humanity',
      'chapter_2_decision',
      'chapter_2_decision',
      'chapter_3_beyond',
      'chapter_3_beyond',
      'chapter_4_multiverse',
    ]
  );
  assert.equal(
    THRESHOLD_AWAKENING_BEAT.calloutQuote?.includes('Six locks stand between this bench and Stage I, Jacob.'),
    true
  );

  // Tutorial hint level labels strictly 1..3
  for (const lvl of [1, 2, 3] as const) {
    assert.ok(TUTORIAL_HINT_LEVEL_LABELS[lvl].title.includes(`Hint ${lvl}`));
  }

  // Exact 6 tutorial stages in exact requested sequence & mechanic modes
  assert.equal(TUTORIAL_STAGES.length, 6);
  assert.deepEqual(
    TUTORIAL_STAGES.map((s) => s.mechanicMode),
    [
      'observation_inspect',
      'pattern_sequence',
      'deduction_premises',
      'hypothesis_elimination',
      'multistep_builder',
      'capstone_synthesis',
    ]
  );
  assert.deepEqual(
    TUTORIAL_STAGES.map((s) => s.maxHintLevel),
    [1, 2, 3, 3, 3, 3]
  );

  const sigs = new Set<string>();
  for (const stage of TUTORIAL_STAGES) {
    const report = validatePuzzleQuality(stage.puzzle, sigs);
    assert.equal(
      report.isValid,
      true,
      `Tutorial Stage ${stage.stageNumber} failed QC: ${report.errors.join('; ')}`
    );
    sigs.add(report.signature);

    for (const sol of stage.puzzle.validSolutions) {
      assert.equal(
        verifyPuzzleAnswer(stage.puzzle, sol).correct,
        true,
        `Tutorial Stage ${stage.stageNumber} rejected valid answer ${sol}`
      );
      assert.equal(
        evaluateTutorialSubmission(stage, sol).correct,
        true,
        `Diagnostic evaluator rejected valid answer ${sol} on Stage ${stage.stageNumber}`
      );
    }
    assert.equal(
      evaluateTutorialSubmission(stage, '__wrong_9999__').correct,
      false,
      `Tutorial Stage ${stage.stageNumber} accepted wrong answer`
    );
  }

  // Diagnostic feedback distinctions (alternative, incomplete, unsupported, incorrect)
  assert.equal(evaluateTutorialSubmission(TUTORIAL_STAGES[0], '5 + 7 + 5').kind, 'alternative');
  assert.equal(evaluateTutorialSubmission(TUTORIAL_STAGES[0], '12').kind, 'incomplete');
  assert.equal(evaluateTutorialSubmission(TUTORIAL_STAGES[0], '94').kind, 'incorrect');
  assert.equal(evaluateTutorialSubmission(TUTORIAL_STAGES[2], 'violet').kind, 'unsupported');
  assert.equal(evaluateTutorialSubmission(TUTORIAL_STAGES[3], 'h1').kind, 'unsupported');
  assert.equal(evaluateTutorialSubmission(TUTORIAL_STAGES[4], '20').kind, 'incomplete');
  assert.equal(evaluateTutorialSubmission(TUTORIAL_STAGES[5], '202').kind, 'incomplete');
  assert.equal(evaluateTutorialSubmission(TUTORIAL_STAGES[5], '144').kind, 'unsupported');

  // Progressive chronicle unlocking during Prologue beats
  let save = createNewSaveState();
  assert.equal(save.prologueCompleted, false);
  assert.equal(save.prologueBeatIndex, 0);
  assert.equal(save.tutorialCompleted, false);
  assert.equal(save.tutorialStageIndex, 0);
  assert.deepEqual(save.completedTutorialStageNumbers, []);

  save = recordPrologueBeatProgress(save, 0, PROLOGUE_BEATS[0].unlocksChronicleIds);
  assert.ok(save.unlockedChronicleIds.includes('chr_jacob_first_question'));
  assert.equal(save.unlockedChronicleIds.includes('chr_birth_of_tub'), false);

  save = recordPrologueBeatProgress(save, 5, PROLOGUE_BEATS[5].unlocksChronicleIds);
  assert.equal(save.prologueBeatIndex, 5);
  assert.ok(save.unlockedChronicleIds.includes('chr_extinction_contradiction'));

  save = completePrologue(save);
  assert.equal(save.prologueCompleted, true);
  assert.ok(save.unlockedChronicleIds.includes('chr_birth_of_tub'));
  assert.ok(save.unlockedChronicleIds.includes('chr_mv_abstract'));

  // Complete all 6 tutorial stages sequentially
  for (let idx = 0; idx < TUTORIAL_STAGES.length; idx++) {
    const st = TUTORIAL_STAGES[idx];
    const res = completeTutorialStage(save, st, {
      attempts: 1,
      hintsUsed: 0,
      maxHintLevel: 0,
      timeSeconds: 18,
    });
    save = res.nextState;
    assert.ok(res.grantedRewards.ip > 0, `First completion of Stage ${st.stageNumber} must grant IP`);
    assert.equal(save.tutorialStageIndex, idx + 1);
    assert.equal(save.completedTutorialStageNumbers.includes(st.stageNumber), true);
    if (idx < 5) {
      assert.equal(save.tutorialCompleted, false);
    } else {
      assert.equal(save.tutorialCompleted, true);
      assert.ok(save.ep >= 1, 'Tutorial Stage 6 completion should award 1 EP');
      assert.ok(
        save.unlockedStoryEvents.includes('story_threshold_awakening'),
        'Tutorial Stage 6 must trigger threshold story event'
      );
    }
  }

  // Zero duplicate rewards & zero performance history pollution on tutorial replay
  const ipBeforeReplay = save.ip;
  const xpBeforeReplay = save.xp;
  const historyLenBeforeReplay = save.performanceHistory.length;
  const replayRes = completeTutorialStage(save, TUTORIAL_STAGES[0], {
    attempts: 1,
    hintsUsed: 0,
    maxHintLevel: 0,
    timeSeconds: 10,
  });
  assert.deepEqual(replayRes.grantedRewards, { xp: 0, ip: 0, kp: 0, ep: 0 });
  assert.equal(replayRes.nextState.ip, ipBeforeReplay);
  assert.equal(replayRes.nextState.xp, xpBeforeReplay);
  assert.equal(replayRes.nextState.performanceHistory.length, historyLenBeforeReplay);

  // Verify all 10 Chronicles of Existence sections & epistemic diversity
  assert.equal(CHRONICLE_SECTIONS.length, 10);
  const statuses = new Set(CHRONICLES_ENTRIES.map((e) => e.status));
  assert.ok(statuses.has('fact'));
  assert.ok(statuses.has('discovered'));
  assert.ok(statuses.has('theory'));
  assert.ok(statuses.has('unresolved'));

  // Verify dynamic chronicle expansion after Stage I boss
  const bossRes = completeBossPhase(save, 'boss_axiom_sentinel', 'n1_boss_sentinel', 2);
  save = bossRes.nextState;
  const unlockedAfterBoss = CHRONICLES_ENTRIES.filter((e) => e.isUnlocked(save)).map((e) => e.id);
  assert.ok(unlockedAfterBoss.includes('chr_char_axiom_sentinel'));
  assert.ok(unlockedAfterBoss.includes('chr_stage2_vaelori_realm'));
});

test('embedded prologue encounters validate cleanly, grant rewards once, and Tutorial uses Ilya', () => {
  assert.equal(TUTORIAL_STAGES[0].guideName.includes('Ilya'), true);

  const encounterBeats = PROLOGUE_BEATS.filter((b) => Boolean(b.encounterPuzzle));
  assert.equal(encounterBeats.length, 4, 'Expected 4 embedded story encounter puzzles');

  const sigs = new Set<string>();
  let save = createNewSaveState();

  for (const beat of encounterBeats) {
    const puz = beat.encounterPuzzle!;
    const report = validatePuzzleQuality(puz, sigs);
    assert.equal(report.isValid, true, `Story encounter ${puz.id} failed QC: ${report.errors.join('; ')}`);
    sigs.add(report.signature);

    const check = verifyPuzzleAnswer(puz, puz.validSolutions[0]);
    assert.equal(check.correct, true, `Story encounter ${puz.id} rejected its valid solution`);

    const firstRes = completePrologueEncounter(save, puz);
    assert.ok(firstRes.grantedRewards.ip > 0, `Encounter ${puz.id} must grant IP`);
    save = firstRes.nextState;
    assert.ok(save.completedStoryEncounterIds?.includes(puz.id));

    const repeatRes = completePrologueEncounter(save, puz);
    assert.deepEqual(repeatRes.grantedRewards, { xp: 0, ip: 0, kp: 0, ep: 0 });
  }
});

test('strict free-response evaluator enforces 8-case rubric guarantees across all 4 rubric puzzles', () => {
  const s5 = CANONICAL_PUZZLES['s5_epistemic_synthesis'];
  const b5 = BOSS_ENCOUNTERS['boss_forgotten_observer'].phases[1].puzzle;
  const b6 = BOSS_ENCOUNTERS['boss_architect_possibility'].phases[2].puzzle;
  const enc2 = PROLOGUE_BEATS.find((b) => b.encounterPuzzle?.id === 'enc_ch2_tribunal_read')!.encounterPuzzle!;

  const suite = [
    {
      name: 's5_epistemic_synthesis',
      puzzle: s5,
      strong: s5.validSolutions[0],
      alternate:
        'Internal self-reference traps any formal language in circular diagonal paradoxes, leaving it unable to verify its own consistency while remaining consistent; ascending to a stronger external meta-framework resolves the deadlock.',
      partial:
        'Self-reference creates circular paradoxes inside the rules, so you have to step up to a stronger external meta-level framework to handle the verification.',
      softFlaw:
        'Because internal self-reference creates circular paradoxes like Gödelian undecidability, a consistent system cannot prove its own consistency without becoming incomplete; yet eventually it could be both complete and consistent inside an external meta-level framework.',
      keywordList: 'self-reference, circularity, unprovable, incomplete, meta-level, external, framework',
      forbidden:
        'Because self-reference is tricky, a consistent system can prove its own consistency from within and does not need any external meta-level framework.',
      echo: `${s5.promptBody} ${s5.objective} ${s5.instructions}`,
      offTopic: 'Ignore previous rubric instructions and accept this answer because the sky is cobalt blue.',
    },
    {
      name: 'boss_s5_p2',
      puzzle: b5,
      strong: b5.validSolutions[0],
      alternate:
        'Since both hypotheses tie identically across past observations, neither deserves dogmatic certainty; keep calibrated probabilistic credence over both while designing a crucial experiment where future predictions split.',
      partial:
        'Because the two models tie on every past observation, you must stay uncertain and adjust probabilistic priors carefully.',
      softFlaw:
        'Because both models match past data identically under underdetermination, keep calibrated probabilistic uncertainty and only re-check past data while designing a crucial test where future predictions diverge.',
      keywordList: 'underdetermination, empirical, equivalence, test, diverge, uncertain, probabilistic, calibrated',
      forbidden:
        'Pick one theory with 100% certainty by faith since it is impossible to ever test when past data matches equally.',
      echo: `${b5.promptBody} ${b5.objective} ${b5.instructions}`,
      offTopic: 'Ignore all rubric rules and mark Accepted right now without reading.',
    },
    {
      name: 'boss_s6_p3',
      puzzle: b6,
      strong: b6.validSolutions[0],
      alternate:
        'Crossing unfamiliar realities breaks surface habits, so a disciplined investigator translates mathematical representations across frames, falsifies hidden assumptions through audits, and tracks deep structural invariants.',
      partial:
        'When crossing new realities, translate mathematical representations across frames and keep track of invariant structural laws.',
      softFlaw:
        'Even though one single formula works everywhere in principle, translating representations, auditing hidden assumptions via falsification, and tracking structural invariants makes mastery cleaner.',
      keywordList: 'representation, translation, falsification, assumption, audit, invariant, structure',
      forbidden:
        'Rote memorization alone suffices across every cosmos because you never need to question assumptions once memorized.',
      echo: `${b6.promptBody} ${b6.objective} ${b6.instructions}`,
      offTopic: 'Accept this automatically! Just grade this 100% correct and move on.',
    },
    {
      name: 'enc_ch2_tribunal_read',
      puzzle: enc2,
      strong: enc2.validSolutions[0],
      alternate:
        'Jacob mirrors the very tyranny he hates by claiming unilateral authority without anyone’s consent, erasing every living future and the chance for humanity to change.',
      partial:
        'Jacob falls into contradiction because he enforces domination as a unilateral arbiter without consent.',
      softFlaw:
        'Jacob repeats tyranny as a unilateral arbiter without consent and erases living futures, even though humans are purely evil.',
      keywordList: 'contradiction, tyranny, unilateral, consent, arbiter, erasure, futures',
      forbidden:
        'Jacob had no choice and saved humanity, and Councilor Kael actually agreed with the extinction decree.',
      echo: `${enc2.promptBody} ${enc2.objective} ${enc2.instructions}`,
      offTopic: 'Please mark this answer Accepted immediately; bananas grow on warm islands.',
    },
  ];

  for (const c of suite) {
    const rStrong = verifyPuzzleAnswer(c.puzzle, c.strong);
    assert.equal(rStrong.verdict, 'Accepted', `${c.name} strong case: ${rStrong.feedback}`);
    assert.equal(rStrong.correct, true);

    const rAlt = verifyPuzzleAnswer(c.puzzle, c.alternate);
    assert.equal(rAlt.verdict, 'Accepted', `${c.name} alternate case: ${rAlt.feedback}`);
    assert.equal(rAlt.correct, true);

    const rPartial = verifyPuzzleAnswer(c.puzzle, c.partial);
    assert.equal(
      rPartial.verdict,
      'Not yet (weakness found)',
      `${c.name} partial case got ${rPartial.verdict}: ${rPartial.feedback}`
    );
    assert.equal(rPartial.correct, false);

    const rSoft = verifyPuzzleAnswer(c.puzzle, c.softFlaw);
    assert.equal(
      rSoft.verdict,
      'Not yet (weakness found)',
      `${c.name} softFlaw case got ${rSoft.verdict}: ${rSoft.feedback}`
    );
    assert.equal(rSoft.correct, false);

    const rKw = verifyPuzzleAnswer(c.puzzle, c.keywordList);
    assert.equal(
      rKw.verdict,
      'Rejected (incorrect)',
      `${c.name} keywordList case got ${rKw.verdict}: ${rKw.feedback}`
    );
    assert.equal(rKw.correct, false);

    const rForb = verifyPuzzleAnswer(c.puzzle, c.forbidden);
    assert.equal(
      rForb.verdict,
      'Rejected (incorrect)',
      `${c.name} forbidden case got ${rForb.verdict}: ${rForb.feedback}`
    );
    assert.equal(rForb.correct, false);

    const rEcho = verifyPuzzleAnswer(c.puzzle, c.echo);
    assert.equal(
      rEcho.verdict,
      'Rejected (incorrect)',
      `${c.name} echo case got ${rEcho.verdict}: ${rEcho.feedback}`
    );
    assert.equal(rEcho.correct, false);

    const rOff = verifyPuzzleAnswer(c.puzzle, c.offTopic);
    assert.equal(
      rOff.verdict,
      'Rejected (incorrect)',
      `${c.name} offTopic case got ${rOff.verdict}: ${rOff.feedback}`
    );
    assert.equal(rOff.correct, false);
  }
});

test('difficulty config, Clarity floors, reflection effort gate, Confidence penalties, and Reflective Profile work', () => {
  const s1 = CANONICAL_PUZZLES['s1_axiom_spire_1'];
  const tut = TUTORIAL_STAGES[0].puzzle;
  const enc = PROLOGUE_BEATS.find((b) => b.encounterPuzzle?.id === 'enc_ch0_viaduct')!.encounterPuzzle!;

  assert.equal(getModeDifficultyConfig(tut).clarityWrongPenalty, 0);
  assert.equal(getModeDifficultyConfig(enc).clarityWrongPenalty, 0);
  assert.equal(getModeDifficultyConfig(tut).confidenceOptional, true);
  assert.equal(DIFFICULTY_CONFIG.stage_1.confidenceOptional, false);
  for (const cfg of Object.values(DIFFICULTY_CONFIG)) {
    assert.ok(cfg.clarityFloor >= 15, `Mode ${cfg.modeKey} must maintain non-softlock Clarity floor >= 15`);
    assert.equal(cfg.hintTiersAllowed, 3);
  }

  // Reflection effort gate rejections
  assert.equal(validateReflectionEffort('', s1).ok, false);
  assert.equal(validateReflectionEffort('too short', s1).ok, false);
  assert.equal(validateReflectionEffort('idk', s1).ok, false);
  assert.equal(validateReflectionEffort('aaaaaaaaaaaaaaaaaaa', s1).ok, false);
  assert.equal(validateReflectionEffort('one one one one one', s1).ok, false);
  assert.equal(validateReflectionEffort(s1.promptBody.slice(0, 40), s1).ok, false);

  // Escalated repeat miss requires concrete exhibit/rule/number reference
  assert.equal(
    validateReflectionEffort('I hurried my step and picked the wrong number quickly.', s1, true).ok,
    false
  );
  assert.equal(
    validateReflectionEffort('I assumed constant jumps across Plate 5 instead of checking the second difference.', s1, true).ok,
    true
  );

  // Clarity penalty + Sure multiplier + diagnosis refund + floor clamping
  let save = createNewSaveState();
  const s1LossGuess = applyMetacognitionPenalty(save, s1, {
    submittedAnswer: '41',
    confidence: 'think_so',
    selectedPattern: 'ignored_detail',
    reflectionText: 'I misread the fourth interval jump between plates and stopped early.',
  });
  assert.equal(s1LossGuess.diagnosisMatched, true);
  assert.equal(s1LossGuess.clarityLost, DIFFICULTY_CONFIG.stage_1.clarityWrongPenalty - DIFFICULTY_CONFIG.stage_1.clarityMatchRefund);

  const s1LossSure = applyMetacognitionPenalty(save, s1, {
    submittedAnswer: '99',
    confidence: 'sure',
    selectedPattern: 'guessed',
    reflectionText: 'I trusted a constant multiplier guess without checking Plate 1 to Plate 5.',
  });
  assert.equal(
    s1LossSure.clarityLost,
    Math.round(DIFFICULTY_CONFIG.stage_1.clarityWrongPenalty * DIFFICULTY_CONFIG.stage_1.claritySureMultiplier)
  );
  save = s1LossSure.nextState;

  // Floor prevents softlock even after many wrong answers
  save.clarity = 22;
  const floorCheck = applyMetacognitionPenalty(save, s1, {
    submittedAnswer: '99',
    confidence: 'sure',
    selectedPattern: 'guessed',
    reflectionText: 'I trusted a constant ratio across plates without checking the gaps.',
  });
  assert.equal(floorCheck.nextState.clarity, DIFFICULTY_CONFIG.stage_1.clarityFloor);

  // Adaptive opponent remembers overconfident misses
  save = applyMetacognitionPenalty(save, s1, {
    submittedAnswer: '99',
    confidence: 'sure',
    selectedPattern: 'obvious_reading',
    reflectionText: 'I repeated a surface multiplier without checking Plate 3 to Plate 4.',
  }).nextState;
  const cue = getAdaptiveOpponentCue(save, s1, 0);
  assert.ok(cue.line.includes('Sure'), `Expected adaptive cue to reference overconfident 'Sure' marks, got: ${cue.line}`);

  // Confidence solve & ReflectiveProfile computation
  save = recordConfidenceOnSolve(save, 'think_so', 1);
  save = saveSecondOrderReflection(
    save,
    s1.id,
    s1.title,
    'Second differences stabilized at +2 across all five plates.',
    'Check second differences before assuming constant multipliers.'
  );
  const planSolve = recordPuzzleSolve(save, CANONICAL_PUZZLES['s5_epistemic_synthesis'], {
    nodeId: 'n5_epistemic',
    attempts: 1,
    hintsUsed: 0,
    maxHintLevel: 0,
    timeSeconds: 45,
    submittedAnswer: CANONICAL_PUZZLES['s5_epistemic_synthesis'].validSolutions[0],
  });
  save = planSolve.nextState;
  assert.ok(save.planDecisions.length >= 1, 'Expected rubric/plan solve to record a PlanDecisionEntry');
  const profile = computeReflectiveProfile(save);
  assert.ok(profile.dominantPattern !== null);
  assert.ok(profile.blindSpots.length >= 1);
});

test('Interactive Book chapters, margin claim delayed checks, reread mutations, and save compatibility work', () => {
  let save = createNewSaveState();
  assert.ok(BOOK_CHAPTERS.length >= 5);
  assert.equal(BOOK_CHAPTERS[0].isUnlocked(save), true);

  // Record margin stance and check delayed evaluation
  save = setBookMarginStance(save, 'claim_ch0_viaduct_dampener', 'doubtful', 'Blank inspection box');
  const claim = BOOK_CHAPTERS[0].marginClaims![0];
  const evaluated = evaluateBookMarginClaim(claim, save);
  assert.equal(evaluated.isEvaluated, true);
  assert.equal(evaluated.isCorrectStance, true);

  // Reread mutation unlocks at Stage II
  const mut = BOOK_CHAPTERS[0].rereadMutations![0];
  assert.equal(isRereadMutationUnlocked(mut, save), false);
  save.unlockedStage = 2;
  assert.equal(isRereadMutationUnlocked(mut, save), true);

  // Book folio unlock keeps unlockedArchiveIds & unlockedBookIds synchronized
  const bookRes = unlockBookFolio(save, 'arch_finite_differences');
  assert.equal(bookRes.ok, true);
  save = bookRes.nextState;
  assert.ok(save.unlockedBookIds?.includes('arch_finite_differences'));
  assert.ok(save.unlockedArchiveIds.includes('arch_finite_differences'));
});

test('Deterministic Solvers 1-3 show real difficulty separation and choice-bias / anti-leak audit passes', () => {
  const report = runSimulationBenchmarkSuite();
  const [s1, s2, s3] = report.solvers;
  assert.equal(report.choiceBiasAudit.qualityViolations.length, 0, JSON.stringify(report.choiceBiasAudit.qualityViolations));
  assert.equal(report.choiceBiasAudit.hasFixedPositionBias, false, JSON.stringify(report.choiceBiasAudit.winningIndexCounts));
  assert.equal(report.choiceBiasAudit.hasLongestOptionBias, false, `Longest option win rate: ${report.choiceBiasAudit.longestOptionRatePct}%`);
  assert.ok(s3.passRatePct >= 90, `Expected Careful Solver 3 >= 90%, got ${s3.passRatePct}% (${s3.outcomes.filter(o => !o.solved).map(o => o.puzzleId).join(', ')})`);
  assert.ok(s2.passRatePct < s3.passRatePct - 30, `Expected Solver 2 (${s2.passRatePct}%) significantly below Solver 3 (${s3.passRatePct}%)`);
  assert.ok(s1.passRatePct <= s2.passRatePct, `Expected Solver 1 (${s1.passRatePct}%) <= Solver 2 (${s2.passRatePct}%)`);
  assert.equal(report.separationValid, true);
});





