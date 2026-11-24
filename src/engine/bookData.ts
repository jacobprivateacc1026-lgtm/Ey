import {
  BookChapter,
  BookMarginClaim,
  GameSaveState,
  MarginStance,
} from './types';

export const BOOK_CHAPTERS: BookChapter[] = [
  {
    id: 'bk_ch0_viaduct',
    order: 0,
    actLabel: 'Part I · Chapter 0',
    title: 'Before the Name',
    subtitle: 'Meridian Viaduct & Jacob’s First Ledger',
    readMinutes: 4,
    leadParagraph:
      'In Meridian, rain gathered in the copper drainage channels along the upper viaduct long before anyone looked up to see why the ballast had shifted. Jacob kept a small cloth-bound field book in his coat pocket—not to write speeches, but to catch every discrepancy between what contractors stamped on paper and what the masonry actually bore.',
    paragraphs: [
      'Before any title followed him across worlds, Jacob learned one quiet habit from structural work: steel does not care whose name sits at the bottom of a clean ledger. A flawed assumption behaves the same way inside an equation, a city charter, or a peace treaty—it waits silently beneath ordinary traffic until the load crosses the wrong joint.',
      'Mara Solis used to tell him that his stubbornness around unverified claims would make enemies in the Directorate. She was right. Yet watching three inspectors sign identical forms after reading only the summary page convinced him that ordinary error rarely looked monstrous. It looked polite, brisk, and finished.',
    ],
    documentInsert: {
      id: 'doc_viaduct_log_44',
      title: 'Viaduct Telemetry Strip #44 — North Span',
      provenance: 'Recovered by Jacob Mercer · Shift Three',
      body: 'Summary Stamp: "Normal harmonic load." Raw Strain Trace: 11 discrete pulse spikes logged between 02:14 and 02:19. Dampener housing inspection box left blank by Shift Two.',
    },
    inlineChoice: {
      id: 'bk_choice_ch0_lesson',
      prompt: 'When you look back at Meridian’s civic collapse, what failed first in Jacob’s eyes?',
      options: [
        {
          id: 'habit_summary',
          label: 'People mistook a neat summary stamp for verified ground reality.',
          response:
            'Jacob underlined that line twice in wet ink: once a system rewards clean summaries over physical checks, every subsequent ledger inherits the lie.',
        },
        {
          id: 'speed_pressure',
          label: 'Schedule pressure penalized anyone who paused to inspect raw measurements.',
          response:
            'Truth takes inspection time. Any institution that treats careful verification as delay slowly blinds itself.',
        },
      ],
    },
    marginClaims: [
      {
        id: 'claim_ch0_viaduct_dampener',
        statement:
          'Senior Directorate engineers honestly checked the North Span dampeners and were merely surprised by an unpredicted tremor.',
        truthStatus: 'flawed',
        evaluationNote:
          'Telemetry Strip #44 shows the dampener inspection box left blank while the summary stamp was pre-signed—convenience, not surprise, broke the margin.',
        unlockStageRequired: 1,
      },
      {
        id: 'claim_ch0_jacob_intent',
        statement:
          'Jacob’s early reforms sought to build systems resilient against human error rather than erase human agency.',
        truthStatus: 'verified',
        evaluationNote:
          'Confirmed across Part I chapters: Jacob initially worked to strengthen civic accountability before the later rupture.',
        unlockStageRequired: 1,
      },
    ],
    rereadMutations: [
      {
        id: 'mut_ch0_post_stage2',
        unlockStageRequired: 2,
        heading: 'Jacob’s Later Margin Note (After Stage I)',
        addition:
          'Looking back from beyond the Threshold: the blank box on Telemetry Strip #44 was not different in kind from the Euclidians leaving their boundary axiom untested. Every collapse begins where verification turns ceremonial.',
      },
    ],
    isUnlocked: () => true,
  },
  {
    id: 'bk_ch1_accord',
    order: 1,
    actLabel: 'Part I · Chapter 1',
    title: 'The Repeated Pattern',
    subtitle: 'Councils, Rivalries & Fractured Treaties',
    readMinutes: 4,
    leadParagraph:
      'Every time Jacob helped stitch together one crumbling corridor of civilization, two fresh factions found a cleaner vocabulary for tearing the adjoining sector apart. The treaties failed not because the drafters lacked cleverness, but because every signatory kept a private exit clause.',
    paragraphs: [
      'Around the Heliopause table, envoys praised restraint in public broadcasts while slipping unilateral veto clauses into annex footnotes. Soren Kael argued that survival required decisive centralization; Mara countered that any single uncheckable hand would eventually turn inward.',
      'Jacob listened to both and watched the pattern settle like soot on glass. Brilliant people could justify anything once they were frightened enough—and fear always arrived ahead of wisdom.',
    ],
    documentInsert: {
      id: 'doc_heliopause_annex',
      title: 'Heliopause Escrow Draft · Annex C',
      provenance: 'Archival Folio · Meridian Council Archive',
      body: '"Each signatory retains unilateral override of shared reserves if regional stability is deemed compromised within six hours of notice." Notice channel: courier seal only, unmonitored after midnight.',
    },
    inlineChoice: {
      id: 'bk_choice_ch1_trust',
      prompt: 'Reading Annex C beside the public speeches, how should Jacob interpret the councilors?',
      options: [
        {
          id: 'incentives_over_words',
          label: 'Judge the treaty by what the escape clause permits when fear peaks, not by its preamble.',
          response:
            'Jacob noted in the margin: "Preamble is theater; Annex C is the real constitution."',
        },
        {
          id: 'mutual_fear',
          label: 'Each faction wrote the clause defensively expecting the other to strike first.',
          response:
            'Even mutual fear builds the same trap—each side prepares an asymmetric knife under the table while shaking hands above it.',
        },
      ],
    },
    marginClaims: [
      {
        id: 'claim_ch1_soren_neutral',
        statement:
          'Councilor Soren Kael opposed centralization strictly out of loyalty to local assemblies.',
        truthStatus: 'flawed',
        evaluationNote:
          'Council records confirm Kael pushed for centralized tribunal authority whenever crises favored his coalition.',
        unlockStageRequired: 1,
      },
    ],
    rereadMutations: [
      {
        id: 'mut_ch1_vaelori',
        requiredStoryEvent: 'story_vaelori_mystery_solved',
        heading: 'Cross-Reference · Vaelori Ruins (Stage II)',
        addition:
          'The Vaelori Choir left behind intact bronze latches, not siege scars—proving not every vanished people destroyed themselves by war. Some chose silence when their instruments disagreed.',
      },
    ],
    isUnlocked: (save) => save.prologueBeatIndex >= 3 || save.prologueCompleted || save.unlockedStage >= 2,
  },
  {
    id: 'bk_ch2_decree',
    order: 2,
    actLabel: 'Part I · Chapter 2',
    title: 'Decree Omega-Zero',
    subtitle: 'The Contradiction That Split the Sky',
    readMinutes: 5,
    leadParagraph:
      'When Jacob concluded that humanity would never outgrow its cycle while left inside the same fragile incentives, he crossed from steward into arbiter. Decree Omega-Zero did not come from hatred—it came from an exhaustion so complete that certainty felt cleaner than patience.',
    paragraphs: [
      'In the Tribunal chamber, Mara did not plead with him using sentiment. She held up his own earlier standard: a ruler who claims unilateral authority without consent, erasing every living chance for change, simply installs himself at the summit of the tyranny he swore to end.',
      'Jacob signed anyway. Afterward, standing in an empty world where no argument remained to oppose him, the contradiction waited beside him like a cold shadow.',
    ],
    documentInsert: {
      id: 'doc_decree_omega_0',
      title: 'Decree Ω-0 (Fragment Recovered by Threshold Keepers)',
      provenance: 'Primary Seal · Pre-Threshold Earth',
      body: '"To preserve possibility from endless self-annihilation, the current iteration is closed under single judgment. No secondary appeal remains open." — Signed: J. Mercer.',
    },
    inlineChoice: {
      id: 'bk_choice_ch2_verdict',
      prompt: 'Standing beside the empty lectern after the Decree, what flaw did Jacob refuse to face until too late?',
      options: [
        {
          id: 'arbiter_trap',
          label: 'Eliminating possibility in the name of protecting it destroys the very thing worth saving.',
          response:
            'That single contradiction followed him out of Meridian and became the weight he now has to earn back across unfamiliar realities.',
        },
        {
          id: 'closed_feedback',
          label: 'By silencing every critic, he destroyed the only instrument capable of correcting him.',
          response:
            'An unopposed mind mistakes its own fatigue for proof.',
        },
      ],
    },
    marginClaims: [
      {
        id: 'claim_ch2_consent',
        statement:
          'Decree Omega-Zero held broad silent approval from Meridian’s outer districts before signature.',
        truthStatus: 'flawed',
        evaluationNote:
          'False. Tribunal transcripts confirm the Decree was executed unilaterally without public assembly or consent.',
        unlockStageRequired: 1,
      },
      {
        id: 'claim_ch2_burden',
        statement:
          'The entity known later as TUB carries Jacob’s unresolved moral and epistemic burden into the Threshold.',
        truthStatus: 'verified',
        evaluationNote:
          'Verified across Threshold dialogues: Ilya holds Jacob personally accountable to the lessons of his own past.',
        unlockStageRequired: 1,
      },
    ],
    rereadMutations: [
      {
        id: 'mut_ch2_post_tutorial',
        requiredStoryEvent: 'story_threshold_awakening',
        heading: 'Threshold Ledger Note (Post-Tutorial)',
        addition:
          'Ilya refused to accept Jacob’s old name or title at face value. At the wooden bench, every claim—even Jacob’s remorse—must pass evidence and verification.',
      },
    ],
    isUnlocked: (save) => save.prologueBeatIndex >= 5 || save.prologueCompleted || save.unlockedStage >= 2,
  },
  {
    id: 'bk_ch3_threshold',
    order: 3,
    actLabel: 'Part II · The Threshold',
    title: 'Ilya’s Bench',
    subtitle: 'How Jacob Relearns Inquiry From Scratch',
    readMinutes: 4,
    leadParagraph:
      'Beyond the silence of a finished world, there are no crowns waiting—only a scarred oak table, brass calipers, and a Ledger Keeper named Ilya who treats grand titles as clerical clutter. Across six deliberate trials, Jacob must strip away reflex and earn the discipline to navigate realities that refuse Earth’s habits.',
    paragraphs: [
      'Ilya does not teach formulas to memorize. He places real exhibits alongside believable decoys, lets an argument hang silently in the room, and watches whether Jacob slows down enough to verify what stands up to scrutiny.',
      'To walk into the Foundational Universe and beyond as TUB—not as an infallible tyrant, but as a mind genuinely equal to the infinite—Jacob has to prove he can catch his own certainty before it blinds him.',
    ],
    documentInsert: {
      id: 'doc_ilya_ledger_rule',
      title: 'Threshold Ledger Rule I',
      provenance: 'Ilya’s Desk · Unbound Leaf',
      body: '"No mark enters the ledger on reputation alone. An overconfident certainty costs more Clarity than honest doubt; a named mistake teaches twice as fast as a lucky guess."',
    },
    marginClaims: [
      {
        id: 'claim_ch3_ilya_rival',
        statement:
          'Ilya plans to seize the title of TUB for himself once Jacob completes the sixth Threshold trial.',
        truthStatus: 'flawed',
        evaluationNote:
          'False. Ilya is the Threshold’s Ledger Keeper and examiner—Jacob remains the sole traveler crossing into the multiverse.',
        unlockStageRequired: 1,
      },
      {
        id: 'claim_ch3_rules_shift',
        statement:
          'Physical and logical laws learned in Stage I remain unconditionally reliable in Stage II and Stage IV.',
        truthStatus: 'flawed',
        evaluationNote:
          'Refuted once entering Stage II & IV: path weights become history-dependent and non-reflexive modal rules break classical expectations.',
        unlockStageRequired: 2,
      },
    ],
    rereadMutations: [
      {
        id: 'mut_ch3_boss1',
        requiredBossDefeat: 'boss_axiom_sentinel',
        heading: 'After the Axiom Sentinel (Stage I Cleared)',
        addition:
          'The Sentinel’s defeat confirmed what Ilya hinted at the wooden bench: invariance survives transition, while surface numbers mutate across boundaries.',
      },
    ],
    isUnlocked: (save) => save.prologueCompleted || save.tutorialStageIndex >= 1 || save.unlockedStage >= 1,
  },
  {
    id: 'bk_ch4_multiverse',
    order: 4,
    actLabel: 'Part III · The Multiverse',
    title: 'Atlas of Realities & The Vaelori',
    subtitle: 'Notes From Six Escalating Cosmos',
    readMinutes: 5,
    leadParagraph:
      'Beyond the Euclidean Spire lie six canonical realities, each governed by its own geometry, causal memory, and epistemic limits. Along the fractured coast of Stage II, silent senary obelisks mark where the Vaelori Choir vanished without a single mark of war.',
    paragraphs: [
      'What makes a traveler dangerous to themselves across unfamiliar worlds is rarely lack of cleverness. It is carrying an unexamined rule from yesterday’s cosmos into today’s—treating non-decimal weights as errors, ignoring conditional framing, or forgetting that an opponent adapts.',
      'This Book grows with every seal you break, every margin claim you test, and every blind spot you confront in your Personal Notebook.',
    ],
    marginClaims: [
      {
        id: 'claim_ch4_vaelori_war',
        statement:
          'The Vaelori vanished under sudden military siege while their aqueducts remained flooded.',
        truthStatus: 'flawed',
        evaluationNote:
          'Refuted by the Drained Conduit Valve & Sanctuary Verdict: the Vaelori shut their aqueducts cleanly and withdrew deliberately.',
        unlockStageRequired: 2,
        requiredStoryEvent: 'story_vaelori_mystery_solved',
      },
      {
        id: 'claim_ch4_incompleteness',
        statement:
          'No single rulebook written entirely inside a system can certify every truth about its own consistency.',
        truthStatus: 'verified',
        evaluationNote:
          'Confirmed at Stage V (Axiomless Expanse): ascending one meta-layer reveals boundaries invisible from inside.',
        unlockStageRequired: 5,
      },
    ],
    rereadMutations: [
      {
        id: 'mut_ch4_endgame',
        requiredBossDefeat: 'boss_architect_possibility',
        heading: 'Final Margin Entry · The Convergence',
        addition:
          'At Stage VI, Jacob stopped mistaking certainty for understanding. Every world remains open as long as a mind stays willing to audit its own premises.',
      },
    ],
    isUnlocked: (save) => save.tutorialCompleted || save.unlockedStage >= 1 || save.completedNodeIds.length > 0,
  },
];

export interface EvaluatedMarginClaim {
  claim: BookMarginClaim;
  playerStance?: MarginStance;
  isEvaluated: boolean;
  isCorrectStance?: boolean;
}

export function evaluateBookMarginClaim(
  claim: BookMarginClaim,
  save: GameSaveState
): EvaluatedMarginClaim {
  const playerStance = save.bookMarginNotes?.[claim.id]?.stance;
  const stageMet = save.unlockedStage >= claim.unlockStageRequired;
  const eventMet = !claim.requiredStoryEvent || save.unlockedStoryEvents.includes(claim.requiredStoryEvent);
  const bossMet = !claim.requiredBossDefeat || save.defeatedBossIds.includes(claim.requiredBossDefeat);
  const isEvaluated = stageMet && eventMet && bossMet && claim.truthStatus !== 'pending';

  let isCorrectStance: boolean | undefined;
  if (isEvaluated && playerStance) {
    isCorrectStance =
      (claim.truthStatus === 'verified' && playerStance === 'trusted') ||
      (claim.truthStatus === 'flawed' && playerStance === 'doubtful');
  }

  return {
    claim,
    playerStance,
    isEvaluated,
    isCorrectStance,
  };
}

export function isRereadMutationUnlocked(
  mut: { unlockStageRequired?: number; requiredBossDefeat?: string; requiredStoryEvent?: string },
  save: GameSaveState
): boolean {
  if (mut.unlockStageRequired && save.unlockedStage < mut.unlockStageRequired) return false;
  if (mut.requiredBossDefeat && !save.defeatedBossIds.includes(mut.requiredBossDefeat)) return false;
  if (mut.requiredStoryEvent && !save.unlockedStoryEvents.includes(mut.requiredStoryEvent)) return false;
  return true;
}
