import { ERROR_PATTERN_MAP } from './metacognition';
import { GameSaveState, PuzzleSpec } from './types';

export interface OpponentDialogueCue {
  speaker: string;
  role: string;
  line: string;
  tacticalStance: string;
}

const OPPONENT_BY_STAGE: Record<number, { speaker: string; role: string }> = {
  0: { speaker: 'Ilya', role: 'Threshold Ledger Keeper' },
  1: { speaker: 'The Axiom Sentinel', role: 'Euclidean Arbiter' },
  2: { speaker: 'The Stochastic Weaver', role: 'Loomwright Guardian' },
  3: { speaker: 'The Infinite Recursor', role: 'Citadel Architect' },
  4: { speaker: 'The Paradox Architect', role: 'Modal Adjudicator' },
  5: { speaker: 'The Forgotten Observer', role: 'Boundary Watcher' },
  6: { speaker: 'The Convergence Voice', role: 'Threshold Sovereign' },
};

export function getAdaptiveOpponentCue(
  save: GameSaveState,
  puzzle: PuzzleSpec,
  localAttempts: number = 0
): OpponentDialogueCue {
  const stage = puzzle.id.startsWith('tut_') || puzzle.id.startsWith('enc_') ? 0 : puzzle.stageNumber;
  const identity = OPPONENT_BY_STAGE[stage] ?? OPPONENT_BY_STAGE[1];
  const mem = save.opponentMemory ?? {
    opponentResponses: {},
    patternCounts: {},
    overconfidentMisses: 0,
    totalMisses: 0,
    cleanFirstTrySolves: 0,
  };

  // Find dominant error pattern remembered by opponents
  const patternEntries = Object.entries(mem.patternCounts ?? {}).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
  const topPatternId = patternEntries[0]?.[0] as keyof typeof ERROR_PATTERN_MAP | undefined;
  const topPatternCount = patternEntries[0]?.[1] ?? 0;

  if (localAttempts >= 2) {
    return {
      speaker: identity.speaker,
      role: identity.role,
      tacticalStance: 'Pressing repeated blind spots',
      line:
        stage === 0
          ? `"Twice at the same hinge, Jacob," Ilya says without looking up from his tally. "Stop answering the surface sentence and test what each slip actually rules out."`
          : `"You are repeating the rhythm rather than changing the frame, Jacob. Which premise did you accept out of habit?"`,
    };
  }

  if (mem.overconfidentMisses >= 2) {
    return {
      speaker: identity.speaker,
      role: identity.role,
      tacticalStance: 'Baiting premature certainty',
      line:
        stage === 0
          ? `Ilya taps your previous 'Sure' mark in red slate. "Confidence outran your ledger twice already, Jacob. I built this bench to catch a mind that signs before checking."`
          : `"Your archive carries marks stamped 'Sure' that fractured on contact, Jacob. This chamber lays two plausible decoys precisely for hurried certainty."`,
    };
  }

  if (topPatternId && topPatternCount >= 2) {
    const meta = ERROR_PATTERN_MAP[topPatternId];
    switch (topPatternId) {
      case 'obvious_reading':
        return {
          speaker: identity.speaker,
          role: identity.role,
          tacticalStance: 'Decoy surface structure',
          line: `"The first pattern your eye lands on here is deliberate bait, Jacob. Your ledger already shows how often an '${meta.shortLabel.toLowerCase()}' turns a clean room into a trap."`,
        };
      case 'unreliable_source':
        return {
          speaker: identity.speaker,
          role: identity.role,
          tacticalStance: 'Conflicting testimony',
          line: `"One witness in this room sounds composed and entirely wrong, Jacob. Remember the last time you trusted an unverified source without cross-checking its date."`,
        };
      case 'ignored_detail':
        return {
          speaker: identity.speaker,
          role: identity.role,
          tacticalStance: 'Hidden boundary qualifier',
          line: `"Nothing here is decorative, Jacob—not the unit, not the stamp, not the clause you skimmed past last chamber."`,
        };
      case 'assumed_untested':
        return {
          speaker: identity.speaker,
          role: identity.role,
          tacticalStance: 'Broken prior law',
          line: `"Leave your Stage I reflexes at the door, Jacob. The rule you are treating as obvious was never granted in this room."`,
        };
      case 'ignored_opponent':
        return {
          speaker: identity.speaker,
          role: identity.role,
          tacticalStance: 'Counter-move active',
          line: `"Every move you make shifts what I defend next, Jacob. Plan for the board after my reply, not the board sitting still."`,
        };
      case 'guessed':
        return {
          speaker: identity.speaker,
          role: identity.role,
          tacticalStance: 'Audit pressure',
          line: `"Guesses leave ink in the margin here, Jacob. Trace two sources together before touching the lock."`,
        };
    }
  }

  if (mem.cleanFirstTrySolves >= 3) {
    return {
      speaker: identity.speaker,
      role: identity.role,
      tacticalStance: 'Escalated restraint',
      line:
        stage === 0
          ? `Ilya narrows his eyes, flipping a fresh leaf of the Book. "You have been clean on first passes, Jacob. Good—then I don't need to soften the wording here."`
          : `"Clean ledger so far, Jacob. Let us see whether your precision holds once two rules pull in opposite directions."`,
    };
  }

  return {
    speaker: identity.speaker,
    role: identity.role,
    tacticalStance: 'Observing opening approach',
    line:
      stage === 0
        ? `Ilya lays the exhibits out flat—no markings, no emphasis. "Read every piece on the wood, Jacob. Tell me what actually holds."`
        : `"Every piece on this table is legible, Jacob. Only your ordering of what to trust decides whether the lock yields."`,
  };
}
