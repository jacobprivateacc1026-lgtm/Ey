import { COGNITIVE_ABILITIES, PRIMARY_ATTRIBUTES } from './attributes';
import { GameSaveState, PrimaryAttributeId } from './types';

export interface DailyInsight {
  dateKey: string;
  attributeId: PrimaryAttributeId;
  attributeName: string;
  attributeLevel: number;
  abilityName?: string;
  title: string;
  message: string;
  poolScope: 'developed' | 'foundational';
  subtext: string;
}

interface AttributeFragmentPool {
  titles: string[];
  observations: string[];
  mechanisms: string[];
  axioms: string[];
}

const FRAGMENT_POOLS: Record<PrimaryAttributeId, AttributeFragmentPool> = {
  analytical: {
    titles: [
      'The Fracture of Premises',
      'Ledger of Necessary Consequence',
      'Anatomy of the Implication',
    ],
    observations: [
      'A knot unties only along the seam where two claims contradict',
      'What appears monolithic fractures cleanly when divided by constraint',
      'Every tangled law conceals an ordered chain of dependencies',
    ],
    mechanisms: [
      'strip away ornamental wording until only irreducible clauses remain',
      'trace each conditional arrow backward from the impossibility it forbids',
      'isolate the single premise whose removal collapses the remaining structure',
    ],
    axioms: [
      'rigor never rushes toward an answer—it starves falsehood first.',
      'consistency holds scattered fragments into one legible ledger.',
      'clarity belongs to the mind willing to enumerate what cannot be true.',
    ],
  },
  abstract: {
    titles: [
      'Echoes Beneath the Symbol',
      'The Invariant Horizon',
      'Shadow of the Unseen Form',
    ],
    observations: [
      'Surface numerals borrow masks from local physics',
      'Across distant realities, only relations survive translation intact',
      'When axioms shift underfoot, notice what refuses to change',
    ],
    mechanisms: [
      'look past the notation and measure the symmetry preserving its shape',
      'lift the rule one level above the objects it pretends to govern',
      'replace familiar names with placeholders until the hidden structure speaks',
    ],
    axioms: [
      'two worlds with different laws often obey the same unnamed theorem.',
      'abstraction brings the observer closer to the spine of the system.',
      'whoever tracks the invariant carries one compass across unfamiliar rooms.',
    ],
  },
  working_memory: {
    titles: [
      'The Quiet Ledger',
      'Thread Across the Threshold',
      'Chambers of Retained Echo',
    ],
    observations: [
      'Half-solved truths evaporate in the pause between one phase and the next',
      'Complexity defeats the hurried mind not by depth, but by forgetting',
      'Three fragile constraints held simultaneously outweigh ten guessed conclusions',
    ],
    mechanisms: [
      'anchor each intermediate invariant before reaching for the next deduction',
      'pin the discarded branch beside the living one so neither masquerades as new',
      'carry the delta of the prior rule across the threshold into the altered law',
    ],
    axioms: [
      'memory is the quiet loom on which multi-step proofs are woven.',
      'a contradiction noticed four steps later was already born at step one.',
      'continuity of thought turns noise into an ordered corridor.',
    ],
  },
  pattern_recognition: {
    titles: [
      'The Broken Cadence',
      'Pulse Within the Noise',
      'Signature of the Generator',
    ],
    observations: [
      'A single discordant glyph reveals more than a hundred obedient terms',
      'Recursion leaves faint fingerprints wherever a rule repeats itself',
      'Apparent randomness is often a rhythm sampled at too narrow an interval',
    ],
    mechanisms: [
      'step back from adjacent terms and inspect the difference of their differences',
      'watch where symmetry hesitates—the rule hides inside the exception',
      'compare how each layer transforms the residue left behind by the previous cycle',
    ],
    axioms: [
      'every sequence remembers the rule that generated its first step.',
      'order whispers in repetition and confesses in anomalies.',
      'spotting an irregularity opens the door to the hidden generator.',
    ],
  },
  spatial: {
    titles: [
      'Parity of the Lattice',
      'Mirrors of Higher Axis',
      'Geometry of the Unfolded Plane',
    ],
    observations: [
      'A rotated figure preserves distances while trading left for right',
      'Flat projections conceal what touches behind the fold',
      'Every grid remembers the axis around which it turned',
    ],
    mechanisms: [
      'count active invariants before tracing a single vertex across the boundary',
      'rotate the vantage point in imagination rather than bending the lattice',
      'track corner-to-center parity where reflection mimics a quarter-turn',
    ],
    axioms: [
      'space keeps exact books; nothing vanishes across an orthogonal turn.',
      'dimension is simply the freedom a constrained figure has not yet used.',
      'symmetry narrows possibility long before calculation begins.',
    ],
  },
  linguistic: {
    titles: [
      'Edge of the Quantifier',
      'Grammar of Double Meaning',
      'The Unspoken Scope',
    ],
    observations: [
      'A claim in an unfamiliar dialect bends at the border of "all" and "some"',
      'Words disguise conditional traps behind polite symmetry',
      'Half of every paradox is forged inside a single careless connective',
    ],
    mechanisms: [
      'separate what a statement asserts from what a hasty reader assumes it implies',
      'test whether reversing "only if" fractures the speaker’s apparent promise',
      'check the date and sender before trusting a fluent phrase',
    ],
    axioms: [
      'precision begins the instant vague phrasing is refused.',
      'whoever controls quantifier scope controls the apparent impossibility.',
      'meaning hides in distinctions an ordinary reader treats as ornamental.',
    ],
  },
  creative: {
    titles: [
      'The Unmarked Passage',
      'Synthesis Beyond the Frame',
      'Hypothesis of the Third Way',
    ],
    observations: [
      'When two accepted models deadlock, a third sits quietly outside their quarrel',
      'Rules rarely forbid what the solver never thought to combine',
      'A locked room often awaits a tool borrowed from an adjacent craft',
    ],
    mechanisms: [
      'question the unstated habit everyone treated as physical law',
      'weld two distant principles together and see which contradiction dissolves',
      'ask what hidden degree of freedom was omitted from the brief',
    ],
    axioms: [
      'fresh perspective is structure viewed from an uncrowded angle.',
      'the wall of a puzzle is often habit rather than axiom.',
      'where deduction stalls, disciplined synthesis opens a side door.',
    ],
  },
  metacognition: {
    titles: [
      'Audit of the Observer',
      'Weight of Certainty',
      'Shadow of First Assumptions',
    ],
    observations: [
      'The fiercest obstacle in an unfamiliar room is the certainty carried from the last',
      'An unexamined premise feels indistinguishable from common sense',
      'False certainty closes inquiry faster than honest ignorance ever could',
    ],
    mechanisms: [
      'interrogate the intuition that arrived first—especially when it feels effortless',
      'weigh how much conviction rests on checked records versus familiarity',
      'pause after an error to name the broken assumption rather than guessing again',
    ],
    axioms: [
      'a mind that audits its own habits outgrows every trap it enters.',
      'calibration turns a mistake from defeat into bearing.',
      'disciplined doubt is the sharpest instrument in the Book.',
    ],
  },
  processing_efficiency: {
    titles: [
      'Pruning the Infinite Branch',
      'Economy of the Decisive Step',
      'Signal Through Redundancy',
    ],
    observations: [
      'Wide search spaces shrink once dead branches are ruled out deliberately',
      'Precision refuses to compute what symmetry already settled',
      'Ten blind trials burn Clarity that one clean bound would preserve',
    ],
    mechanisms: [
      'establish upper and lower boundaries before testing isolated candidates',
      'group symmetry-equivalent cases so one check resolves an entire row',
      'pick the observation that cleanly separates rival hypotheses',
    ],
    axioms: [
      'elegance is truth arriving without wasted ink.',
      'the cleanest proof notices what did not need checking.',
      'discipline compounds when every step narrows the horizon.',
    ],
  },
};

export function formatLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function hashStringFnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function getUnlockedInsightAttributePool(save: GameSaveState): {
  attributeIds: PrimaryAttributeId[];
  poolScope: 'developed' | 'foundational';
} {
  const developedSet = new Set<PrimaryAttributeId>();

  for (const attr of PRIMARY_ATTRIBUTES) {
    if ((save.attributes[attr.id]?.level ?? 1) >= 2) {
      developedSet.add(attr.id);
    }
  }

  for (const [abilityId, rank] of Object.entries(save.abilities)) {
    if (rank >= 1) {
      const def = COGNITIVE_ABILITIES.find((a) => a.id === abilityId);
      if (def) {
        developedSet.add(def.primaryAttribute);
      }
    }
  }

  if (developedSet.size > 0) {
    return {
      attributeIds: PRIMARY_ATTRIBUTES.map((a) => a.id).filter((id) => developedSet.has(id)),
      poolScope: 'developed',
    };
  }

  return {
    attributeIds: PRIMARY_ATTRIBUTES.map((a) => a.id),
    poolScope: 'foundational',
  };
}

export function generateDailyBookInsight(
  save: GameSaveState,
  date: Date = new Date()
): DailyInsight {
  const dateKey = formatLocalDateKey(date);
  const { attributeIds, poolScope } = getUnlockedInsightAttributePool(save);

  const dayHash = hashStringFnv1a(`tub-daily-insight::${dateKey}`);
  const attrIndex = dayHash % attributeIds.length;
  const attributeId = attributeIds[attrIndex];
  const attrMeta =
    PRIMARY_ATTRIBUTES.find((a) => a.id === attributeId) ?? PRIMARY_ATTRIBUTES[0];
  const attributeLevel = save.attributes[attributeId]?.level ?? 1;

  const unlockedAbility = COGNITIVE_ABILITIES.find(
    (ab) => ab.primaryAttribute === attributeId && (save.abilities[ab.id] ?? 0) >= 1
  );

  const pool = FRAGMENT_POOLS[attributeId];
  const h1 = hashStringFnv1a(`${dateKey}::${attributeId}::title`);
  const h2 = hashStringFnv1a(`${dateKey}::${attributeId}::obs`);
  const h3 = hashStringFnv1a(`${dateKey}::${attributeId}::mech`);
  const h4 = hashStringFnv1a(`${dateKey}::${attributeId}::ax`);

  const title = pool.titles[h1 % pool.titles.length];
  const observation = pool.observations[h2 % pool.observations.length];
  const mechanism = pool.mechanisms[h3 % pool.mechanisms.length];
  const axiom = pool.axioms[h4 % pool.axioms.length];

  const message = `${observation}; ${mechanism}, for ${axiom}`;

  const subtext =
    poolScope === 'developed'
      ? `Book Margin Note · Rotates daily across your ${attributeIds.length} developed ${
          attributeIds.length === 1 ? 'faculty' : 'faculties'
        }.`
      : 'Book Margin Note · Rotates daily across Jacob’s foundational faculties. Cultivate attributes to focus future notes.';

  return {
    dateKey,
    attributeId,
    attributeName: attrMeta.name,
    attributeLevel,
    abilityName: unlockedAbility?.name,
    title,
    message,
    poolScope,
    subtext,
  };
}

/** Backwards-compatible alias for unit tests */
export const generateDailyArchiveInsight = generateDailyBookInsight;
