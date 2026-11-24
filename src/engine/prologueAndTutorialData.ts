import {
  ChronicleEntry,
  ChronicleSectionDefinition,
  DiagnosticFeedbackKind,
  PrologueBeat,
  TutorialStageSpec,
} from './types';
import { normalizeAnswer } from './puzzleGenerator';

export const PROLOGUE_CHRONICLE_BASE_IDS = [
  'chr_jacob_first_question',
  'chr_jacob_origins',
  'chr_jacob_setbacks',
  'chr_jacob_greater_ambition',
  'chr_humanity_expansion',
  'chr_human_cycles',
  'chr_extinction_contradiction',
  'chr_extinction_act',
  'chr_extinction_archive_record',
  'chr_old_tub_legend',
  'chr_unresolved_old_tub',
  'chr_birth_of_tub',
  'chr_mv_familiar',
  'chr_mv_unfamiliar',
  'chr_mv_contradictory',
  'chr_mv_abstract',
  'chr_multiverse_horizon',
  'chr_central_question',
];

export const PROLOGUE_BEATS: PrologueBeat[] = [
  // PROLOGUE: THE HUMAN NAMED JACOB (Scenes A, B, C)
  {
    id: 'beat_01_first_question',
    chapterId: 'prologue_jacob',
    chapterTag: 'Prologue · Scene A',
    chapterTitle: 'The Human Named Jacob',
    title: 'The First Question',
    subtitle: 'Long before any star chart carried his title, a snapped girder in rain taught Jacob how smoothly a clean report can lie.',
    sceneComposition: 'investigation',
    portraitKey: 'jacob_young',
    visualTheme: 'warm',
    imagePath: '/src/assets/images/jacob_workshop_meridian_1795508239039.jpg',
    imageAlt: 'Meridian transit drafting desk strewn with brass calipers, stress sheets, and warm lamp light',
    paragraphs: [
      'Raindrum rattled against the tin roof above the Meridian transit yards while seventeen-year-old Jacob knelt beside a crate of twisted rivets. Two days earlier, Span Four had buckled under a routine freight engine running well below posted tonnage. By Friday afternoon, three senior inspectors had stamped the file as alloy fatigue and gone home.',
      'Jacob pulled the raw ionization tapes out of the waste bin after dark. Comparing the atmospheric charge strip against the strain gauges took four sleepless nights and half a bottle of kerosene lamp oil, until the numbers stopped hiding: unbuffered solar gusts had pumped rhythmic pulses straight into the deck while the dampener inspection column stayed blank.',
      'Above three empty lockers, the official summary still hung pinned in neat block capitals. Watching how easily clean paperwork quieted an entire city stayed lodged behind Jacob’s ribs for the rest of his life.',
    ],
    dialogue: [
      {
        speaker: 'Chief Surveyor Harlan Vance',
        role: 'Transit Directorate',
        portraitKey: 'vance',
        stageDirection: 'tapping the stamped ledger shut with two ink-stained knuckles',
        line: '“Two boards signed off on fatigue, kid. Leave the tapes in the drawer before you make enemies who actually pay your stipend.”',
      },
      {
        speaker: 'Jacob',
        role: 'Age 17 · Apprentice Drafter',
        portraitKey: 'jacob_young',
        stageDirection: 'laying the torn chart beside Vance’s coffee mug',
        line: '“Your stamp says forty percent load, Harlan. It will hold right until the 06:15 commuter hits Span Five—after that, your paperwork is going to weigh less than steel.”',
      },
    ],
    encounterPuzzle: {
      id: 'enc_ch0_viaduct',
      title: 'Viaduct Harmonic Ledger',
      universeId: 'prologue_meridian',
      regionId: 'meridian_span',
      stageNumber: 0,
      modeKey: 'prologue',
      category: 'mathematical',
      difficulty: 'Foundational',
      difficultyScore: 18,
      relevantAttributes: ['analytical', 'pattern_recognition'],
      interactionType: 'numeric_input',
      objective: 'Audit Span Five’s real peak bolt load across the recovered shift records.',
      instructions: 'Examine each strip and ledger entry below, exclude unrelated yard tallies, and enter Span Five’s peak bolt load in kN.',
      rules: [
        'Peak bolt load equals static dead-load plus total unabsorbed squall force.',
        'Ignore pressure lines or steam tallies measured outside bolt force (kN).',
      ],
      promptBody:
        'Vance’s desk holds four slips from Span Five’s night shift. Determine the true peak load (kN) bearing on the anchor bolts before the morning train crosses.',
      sceneObjects: [
        {
          id: 'obj_static_gauge',
          label: 'Static Deck Dial',
          locationNote: 'North Span Pier',
          kindTag: 'Force Gauge',
          observation: 'Dead-load tension reads steady at 32 kN.',
        },
        {
          id: 'obj_dampener_housing',
          label: 'Dampener Housing Box',
          locationNote: 'Under-span catwalk',
          kindTag: 'Inspection Slip',
          observation: 'Fluid reservoir bone-dry; zero damping coefficient active during Shift Three.',
        },
        {
          id: 'obj_boiler_tally',
          label: 'Yard Steam Boiler Gauge',
          locationNote: 'South Depot Wall',
          kindTag: 'Pressure Gauge',
          observation: 'Feed line pressure logged at 198 kPa across night shift.',
        },
      ],
      documents: [
        {
          id: 'doc_tape_44',
          title: 'Ionization Tape #44',
          source: 'Jacob’s Bench Log',
          reliabilityNote: 'Raw mechanical trace',
          excerpt: 'Logged 11 discrete ionization gusts striking Span Five between 02:14 and 02:19.',
        },
        {
          id: 'doc_coupling_spec',
          title: 'Girder Coupling Spec 7B',
          source: 'Design Manual',
          reliabilityNote: 'Verified engineering sheet',
          excerpt: 'Each unbuffered ionization gust adds 5 kN lateral load directly to anchor bolts.',
        },
        {
          id: 'doc_vance_summary',
          title: 'Directorate Morning Summary',
          source: 'Harlan Vance',
          reliabilityNote: 'Signed without catwalk inspection',
          excerpt: 'Entries marked "Normal static load only (32 kN)" with dampener check left blank.',
        },
      ],
      narrative: {
        context: 'Meridian Dome IV · Viaduct Inquiry',
        intro: 'Vance closed the folder after glancing only at the summary stamp.',
        consequences: 'Logging the verified load forced an emergency commuter halt two hours before dawn.',
        storyEventId: 'story_enc_viaduct_logged',
        storyEventTitle: 'Meridian Span Five Emergency Halt',
      },
      defaultErrorPattern: 'ignored_detail',
      validSolutions: ['87', '87 kn', '32+55', '32 + 55'],
      explanation:
        'Span Five carried 32 kN static load plus 11 unbuffered pulses at 5 kN each (55 kN), totaling 87 kN. Vance trusted a summary line that skipped both the dry dampener housing and the raw ionization trace, while the 198 kPa steam reading belonged to an unrelated line.',
      postSolvePrompt: {
        question: 'Why did Vance’s morning summary miss the failure risk?',
        patternPrompt: 'What unit or source trap appears alongside the real numbers here?',
        takeaway: 'Never read a signed summary line over blank inspection boxes and primary traces.',
      },
      cognitiveTools: {
        decomposition: [
          'Separate force readings (kN) from unrelated depot steam pressure (kPa).',
          'Check whether the dampener reduced any of the 11 logged pulses.',
        ],
        dependencyMapping: ['Dampener state determines how much of each pulse reaches the bolts.'],
        anomalyHighlight: 'Summary ledger claims normal load while the dampener slip remains blank.',
        symbolicTranslation: 'L_peak = L_static + (pulses * coupling_per_pulse)',
        alternativeHypotheses: ['Verify whether any gusts overlapped or were damped before striking bolts.'],
      },
      hints: {
        1: {
          low: 'Inspect every slip on the bench—one pressure gauge measures kPa rather than bolt force, and the dampener box reveals whether gusts were absorbed.',
          moderate: 'Separate bolt load records (kN) from the south depot steam pipe.',
          high: 'Combine static bolt load with raw pulse coupling only.',
          transcendent: 'Check static baseline plus unabsorbed gust count.',
        },
        2: {
          low: 'Pair Ionization Tape #44 with Coupling Spec 7B and check whether the dampener housing buffered any of those pulses.',
          moderate: 'Dry housing means full pulse transfer from Tape #44 onto static load.',
          high: 'Dry dampener transmits all gusts recorded on Tape #44.',
          transcendent: 'Baseline plus full pulse load.',
        },
        3: {
          low: 'Add the static deck load in kN to the product of gust count and kN per gust.',
          moderate: 'Compute total load = static kN + (gust count × kN per gust).',
          high: 'Linear combination over verified kN channels.',
          transcendent: 'Sum baseline and pulse contributions.',
        },
      },
      hintSpeakers: {
        1: 'Jacob (Margin Note)',
        2: 'Harlan Vance',
        3: 'Jacob (Bench Check)',
      },
      rewards: { xp: 20, ip: 10, kp: 5 },
    },
    interactivePrompt: {
      question: 'After halting Span Five kept the commuter train off cracked steel, what conviction stayed with Jacob?',
      choices: [
        {
          id: 'c_surface',
          label: 'Every comfortable consensus hides unchecked columns',
          response:
            'He began keeping private cross-check ledgers on every claim he heard—and tore up his own proofs just as ruthlessly whenever data pushed back.',
        },
        {
          id: 'c_method',
          label: 'Measure what hurried authorities prefer to stamp over',
          response:
            'Yes. Survival belonged to whoever inspected raw gauges before calamity did the audit for free.',
        },
      ],
    },
    reflectionNote:
      'Scene A · Stubborn measurement saved a commuter span long before anyone spoke of galaxies.',
    unlocksChronicleIds: ['chr_jacob_first_question', 'chr_jacob_origins'],
  },
  {
    id: 'beat_02_beyond_limits',
    chapterId: 'prologue_jacob',
    chapterTag: 'Prologue · Scene B',
    chapterTitle: 'The Human Named Jacob',
    title: 'Beyond Ordinary Limits',
    subtitle: 'Years of ruined notebooks, public humiliation, and rebuilding his own discipline brick by brick.',
    sceneComposition: 'confrontation',
    portraitKey: 'reyes',
    visualTheme: 'warm',
    imagePath: '/src/assets/images/prologue_human_empire_1795489110438.jpg',
    imageAlt: 'Sunlit research gallery overlooking terraced glass domes and brass instruments',
    paragraphs: [
      'Jacob chased capability with a stubbornness that annoyed gentler colleagues. Mathematics, memory retention, structural engineering, acoustic analysis, endurance training—he refused to sit safely inside one tidy department while other fields stayed opaque.',
      'Those early decades embarrassed him in front of smaller, smarter crowds. His initial sleep-compression memory drills gave him three weeks of blinding migraines and slurred sentences. Two orbital lattice papers collapsed during seminar review because he carried a flat-plane assumption into curved boundaries. Even his first city rationing scheme misfired within forty-eight hours because he treated neighborhood fear as minor rounding error.',
      'He bound every failed notebook in plain gray cloth instead of burning them. Each red-ink line showed him the exact corner where certainty had stepped out ahead of verification.',
    ],
    dialogue: [
      {
        speaker: 'Dr. Helena Reyes',
        role: 'Cognitive Architecture Lab',
        portraitKey: 'reyes',
        stageDirection: 'pushing a mug of cold tea past his stack of redlined sheets',
        line: '“Six months gone on a memory lattice that jammed under noise, Jacob. Most fellows quietly pick a narrower thesis and save their grant.”',
      },
      {
        speaker: 'Jacob',
        role: 'Researcher · Year 9',
        portraitKey: 'jacob_young',
        stageDirection: 'rubbing chalk dust from his collar without looking up',
        line: '“A broken model is blunt enough to do me a favor, Helena. At least it shows the exact line where I fooled myself.”',
      },
    ],
    reflectionNote:
      'Scene B · Capability arrived slowly through corrected blunders, never by flash of genius.',
    unlocksChronicleIds: ['chr_jacob_setbacks'],
  },
  {
    id: 'beat_03_greater_ambition',
    chapterId: 'prologue_jacob',
    chapterTag: 'Prologue · Scene C',
    chapterTitle: 'The Human Named Jacob',
    title: 'A Greater Ambition',
    subtitle: 'Outgrowing private mastery meant testing whether an entire civilization could learn without tearing itself open.',
    sceneComposition: 'cinematic',
    portraitKey: 'nadia',
    visualTheme: 'warm',
    imagePath: '/src/assets/images/pre_extinction_neighborhood_1795508240233.jpg',
    imageAlt: 'Warm evening light across terraced human apartment courtyards, gardens, and transit walkways',
    paragraphs: [
      'Private competence eventually felt small. Down in Meridian Sector 4, coordinator Nadia Okafor still worked twelve-hour shifts patching corroded water mains with salvaged gaskets while orbital academies published elegant papers overhead.',
      'Jacob unlocked his private notebooks—distributing compact fusion schematics, cellular repair protocols, and open-table technical primers to neighborhood councils like Nadia’s. Within fifty years, child mortality collapsed across core systems, transit grew cheap, and historians named the stretch the Dawn of Synthesis.',
      'Watching school bells ring down Nadia’s quiet canal walk, Jacob let himself trust one untested premise: lift scarcity off human shoulders, and the urge to dominate neighbors would starve out naturally.',
    ],
    dialogue: [
      {
        speaker: 'Nadia Okafor',
        role: 'Sector 4 Water & Grid Coordinator',
        portraitKey: 'nadia',
        stageDirection: 'wiping rust from a brass pressure valve while school bells ring down the street',
        line: '“Your filtration kits bought us twenty quiet summers, Jacob. Folks finally spend evenings arguing about music instead of pipe quotas.”',
      },
      {
        speaker: 'Jacob',
        role: 'Founder, Synthesis Exchange',
        portraitKey: 'jacob_young',
        stageDirection: 'smiling faintly as commuter ferries glide overhead',
        line: '“Keep the spare gaskets anyway, Nadia. Quiet summers have a habit of making planners lazy.”',
      },
    ],
    calloutQuote:
      '“Lift hunger and distance off human shoulders, and surely the smallness that bred cruelty will wither on its own.”',
    reflectionNote:
      'Scene C · That assumption—that shared power automatically breeds restraint—would break against history.',
    unlocksChronicleIds: ['chr_jacob_greater_ambition'],
  },

  // CHAPTER 1: THE ADVANCEMENT OF HUMANITY
  {
    id: 'beat_04_human_advancement',
    chapterId: 'chapter_1_humanity',
    chapterTag: 'Chapter 1 · The Advancement of Humanity',
    chapterTitle: 'Galactic Expansion & Divergent Civilizations',
    title: 'A Hundred Worlds Under Divergent Skies',
    subtitle: 'Humanity bridged galaxies with genuine courage and engineering grace—carrying every old hunger along for the voyage.',
    sceneComposition: 'broadsheet',
    visualTheme: 'imperial',
    imagePath: '/src/assets/images/prologue_human_empire_1795489110438.jpg',
    imageAlt: 'Vast stellar cities orbiting twin suns with glowing sky-bridges',
    paragraphs: [
      'Across three millennia, slow sleeper hulls gave way to folded-metric corridors that knitted four galaxies into a common shipping chart.',
      'Under unfamiliar suns, dispersed branches of humanity built things worthy of reverence. The Heliopause Guilds raised Dyson mirrors under century-long compacts; the Lyraen Academies released surgical genomes free of patent to three hundred frontier colonies; mined asteroid belts bloomed into cedar orchards beneath spun silica.',
      'Song, law, craft, and patient care all scaled with the stars. From a distance, humanity looked ready to outlast anything.',
    ],
    historicalRecord: {
      title: 'Imperial Census Folio · Era III Summary',
      body: 'Mapped Settlements: 14,820 star systems across 4 galaxies · Mean lifespan extended sevenfold · Zero-point metric gates operational across core trade corridors.',
      provenanceNote: 'Declassified Sector Registry · Meridian Civic Ledger 3104-C',
    },
    reflectionNote:
      'Chapter 1 · Humanity proved it could reshape matter, medicine, and stellar geometry at immense scale.',
    unlocksChronicleIds: ['chr_humanity_expansion'],
  },
  {
    id: 'beat_05_cycles_contradiction',
    chapterId: 'chapter_1_humanity',
    chapterTag: 'Chapter 1 · The Advancement of Humanity',
    chapterTitle: 'The Core Contradiction',
    title: 'Capability Advancing, Restraint Standing Still',
    subtitle: 'Sharper tools simply enlarged the wreckage of every repeated border war.',
    sceneComposition: 'investigation',
    portraitKey: 'mara',
    visualTheme: 'imperial',
    imagePath: '/src/assets/images/pre_extinction_neighborhood_1795508240233.jpg',
    imageAlt: 'Evening walkways beneath towering orbital rings as storm warnings flash above',
    paragraphs: [
      'Yet whenever gate fuel tightened or an outer senate reached for leverage, the same old rhythm returned. Worlds built bright schools, stockpiled defense arrays, split over slights older than any living grandchild, weaponized medical lattices, scorched whole clusters black, rebuilt from slag—and climbed straight back toward the next spark.',
      'Engineering leapt exponentially while tribal fear stayed unchanged. Ten thousand years of watching quiet towns like Nadia’s vanish into ionized haze wore Jacob down until grief began sounding like clinical arithmetic.',
      'Archon Mara Solis met him on an open veranda above the Heliopause treaty hall, refusing to watch him turn living citizens into failed test rows.',
    ],
    dialogue: [
      {
        speaker: 'Archon Mara Solis',
        role: 'Heliopause Accord',
        portraitKey: 'mara',
        stageDirection: 'setting two folded reconstruction petitions across the slate table',
        line: '“Walk the rebuilding wards, Jacob. Midwives still teach in basements and neighbors still split grain ships when winter hits. Mercy runs slower than a thesis defense.”',
      },
      {
        speaker: 'Jacob',
        role: 'Observer-Architect',
        portraitKey: 'jacob_architect',
        stageDirection: 'staring down at the shipping lanes without touching the petitions',
        line: '“And how many trillions choke inside your ‘slower’ while we applaud a handful of survivors stacking cracked bricks?”',
      },
    ],
    encounterPuzzle: {
      id: 'enc_ch1_accord_table',
      title: 'The Heliopause Corridor Trap',
      universeId: 'prologue_accord',
      regionId: 'heliopause_hall',
      stageNumber: 0,
      modeKey: 'prologue',
      category: 'strategic',
      difficulty: 'Foundational',
      difficultyScore: 24,
      relevantAttributes: ['analytical', 'metacognition'],
      interactionType: 'multiple_choice',
      objective: 'Identify why prior fuel pacts collapsed and which mechanism closes the pre-emptive raid spiral.',
      instructions: 'Inspect the treaty drafts and courier notes on Mara’s desk, then select the mechanism that removes first-strike panic.',
      rules: [
        'Border captains strike immediately if they suspect a neighbor is secretly draining reserves.',
        'Any delay between a covert draw and detection triggers pre-emptive seizures.',
      ],
      promptBody:
        'Twelve consecutive Heliopause fuel treaties fractured within a decade. Review the three drafts on Mara’s desk and select the structure that holds under scarcity.',
      documents: [
        {
          id: 'doc_accord_notes',
          title: 'Mara’s Collapse Tally',
          source: 'Heliopause Desk',
          reliabilityNote: '12 failed treaties audited',
          excerpt: 'Nine breakdowns began during minor shortages when rumors claimed rivals were hoarding behind sealed valves.',
        },
        {
          id: 'doc_annex_c',
          title: 'Courier Note · Outer Rim',
          source: 'Captain Orlov',
          reliabilityNote: 'Field testimony',
          excerpt: '“If punishment arrives twelve hours after someone empties a tank, my only rational move is to empty mine first.”',
        },
      ],
      narrative: {
        context: 'Heliopause Accord · Treaty Audit',
        intro: 'Mara kept ledgers showing how rumor and delayed penalties turned scarcity into instant conflict.',
        consequences: 'Tracing the incentive spiral revealed structural blind spots behind repeated civic collapse.',
        storyEventId: 'story_enc_accord_audit',
        storyEventTitle: 'Heliopause Incentive Audit',
      },
      options: [
        {
          id: 'delayed_strike',
          label: 'Proposal A · Retaliatory Threshold',
          detail: 'Punish hoarding automatically once a basin drops under 10%.',
          exploitedPattern: 'ignored_opponent',
        },
        {
          id: 'shared_escrow',
          label: 'Proposal B · Metered Shared Escrow',
          detail: 'Expose live reserve meters alongside automated emergency routing.',
        },
        {
          id: 'honor_pledge',
          label: 'Proposal C · Binding Council Oath',
          detail: 'Require public vows and annual tribunal inspections of reserve books.',
          exploitedPattern: 'unreliable_source',
        },
      ],
      validSolutions: ['shared_escrow'],
      explanation:
        'Public oaths fail whenever panic outruns annual inspections, and delayed penalties push every captain to raid before crossing the 10% wire. Live metered escrow eliminates blind suspicion before fear triggers a first strike.',
      postSolvePrompt: {
        question: 'Why did strict penalties after a shortage make captains raid sooner?',
        patternPrompt: 'What hidden opponent incentive broke Proposals A and C?',
        takeaway: 'Delayed detection rewards pre-emptive defection whenever rivals fear each other.',
      },
      cognitiveTools: {
        decomposition: [
          'Check how each treaty behaves during the first three hours of a rumor.',
          'Trace what rational fear pushes an outer captain to do under delayed punishment.',
        ],
        dependencyMapping: ['Blind reserves + delayed enforcement => first-strike incentive.'],
        anomalyHighlight: 'Penalty triggers only AFTER shortages hit critical threshold.',
        symbolicTranslation: 'Detection_Delay > 0  =>  Dominant(Preemptive_Hoard)',
        alternativeHypotheses: ['Test whether harsher punishment stops panic: harsher loss makes losing the first move costlier.'],
      },
      hints: {
        1: {
          low: 'Read Captain Orlov’s courier note beside Mara’s collapse tally—ask what drives a captain to move first during a rumor.',
          moderate: 'Compare visibility speed against enforcement delay.',
          high: 'Check which draft removes the time gap where suspicion breeds pre-emptive raids.',
          transcendent: 'Trace detection latency against opponent panic.',
        },
        2: {
          low: 'Notice both annual audits and delayed post-shortage penalties leave a dark window where factions guess rival tanks are draining.',
          moderate: 'Delayed retaliation penalizes slow movers—raising first-strike pressure.',
          high: 'Mutual real-time reserve visibility prevents silent defection rumors.',
          transcendent: 'Visibility + automatic routing stabilizes expectations.',
        },
        3: {
          low: 'Select the treaty design that replaces guesswork about rival reserves with continuous shared verification.',
          moderate: 'Choose the mechanism eliminating blind windows between reserve draw and routing.',
          high: 'Equilibrium requires zero information delay under scarcity.',
          transcendent: 'Lock the metered escrow equilibrium.',
        },
      },
      hintSpeakers: {
        1: 'Archon Mara Solis',
        2: 'Jacob (Margin Note)',
        3: 'Archon Mara Solis',
      },
      rewards: { xp: 25, ip: 12, kp: 6 },
    },
    interactivePrompt: {
      question: 'Where did the deepest fault line between Mara Solis and Jacob lie?',
      choices: [
        {
          id: 'c_patience',
          label: 'Living mercy inside slow rebuilding vs statistical fatigue',
          response:
            'Mara guarded breathing neighbors repairing cracked aqueducts; Jacob stared down at aggregate loss curves until individuals turned transparent.',
        },
        {
          id: 'c_power',
          label: 'Whether any single observer held authority to judge a species',
          response:
            'Yes. Notice how quietly Jacob promoted himself from engineer to unchecked judge—answering to nobody.',
        },
      ],
    },
    unlocksChronicleIds: ['chr_human_cycles'],
  },

  // CHAPTER 2: THE FINAL DECISION
  {
    id: 'beat_06_council_and_verdict',
    chapterId: 'chapter_2_decision',
    chapterTag: 'Chapter 2 · The Final Decision',
    chapterTitle: 'A Morally Disturbing Turning Point',
    title: 'The Fracture Inside Jacob’s Logic',
    subtitle: 'Grief hardened into cold geometry until Jacob mistook silence for peace.',
    sceneComposition: 'confrontation',
    portraitKey: 'kael',
    visualTheme: 'extinction',
    imagePath: '/src/assets/images/council_tribunal_chamber_1795508240034.jpg',
    imageAlt: 'Dim circular ethics tribunal chamber lit by pale floor lamps and tall dark pillars',
    paragraphs: [
      'Jacob fought his own despair for thirty bitter years. Parts of him still carried Meridian grease under the nails, Helena’s cold tea mugs, and the memory of Nadia’s canal bells. He drafted escrow laws and neural empathy relays, only to watch the Outer Arm War sterilize forty inhabited systems in six weeks.',
      'Exhaustion turned solid inside him. If survival fear always outran conscience whenever stakes climbed, Jacob convinced himself that humanity would keep grinding through wider wreckage forever.',
      'When he set the Convergence Keys onto the lectern of the Concordance Tribunal, Councilor Soren Kael rose in the dim circular room and forced Jacob to look straight at what he had become.',
    ],
    dialogue: [
      {
        speaker: 'Councilor Soren Kael',
        role: 'Lyraen Ethics Tribunal',
        portraitKey: 'kael',
        stageDirection: 'gripping the timber rail until his knuckles blanch pale',
        line: '“To stop humans from murdering each other, you would silence every child, every scholar, and every unborn morning across four galaxies? Call it whatever equation soothes you, Jacob. Here it is still called tyranny.”',
      },
      {
        speaker: 'Jacob',
        role: 'Final Statement',
        portraitKey: 'jacob_architect',
        stageDirection: 'closing the brass key case with steady, practiced fingers',
        line: '“Leave this chamber untouched, Soren, and five hundred future wars will pronounce that exact death sentence slowly. I am choosing silence over endless torment—even if nobody survives to absolve it.”',
      },
    ],
    encounterPuzzle: {
      id: 'enc_ch2_tribunal_read',
      title: 'Audit of the Tribunal Exchange',
      universeId: 'prologue_tribunal',
      regionId: 'lyraen_tribunal',
      stageNumber: 0,
      modeKey: 'prologue',
      category: 'philosophical',
      difficulty: 'Intermediate',
      difficultyScore: 38,
      relevantAttributes: ['metacognition', 'linguistic', 'analytical'],
      interactionType: 'rubric_synthesis',
      objective: 'Diagnose the contradiction and unexamined authority inside Jacob’s tribunal defense.',
      instructions: 'In connected prose, explain why Jacob mirrors what he condemns, what unilateral role he claims without consent, and what ending all futures destroys.',
      rules: [
        'Explain how Jacob reproduces the domination or tyranny he condemns.',
        'Identify the unilateral authority assumed without consent or mandate.',
        'Account for what erasing every living future loses alongside war.',
      ],
      promptBody:
        'Audit Councilor Kael’s charge against Jacob’s defense above. In two or three crisp sentences, identify the internal contradiction and hidden authority inside Jacob’s argument.',
      narrative: {
        context: 'Chapter 2 · Lyraen Ethics Tribunal Transcript',
        intro: 'Tribunal recorders preserved the exchange unedited, leaving Jacob to confront his own blind spot long afterward.',
        consequences: 'Naming the contradiction in his own record marked the first crack in Jacob’s certainty.',
        storyEventId: 'story_enc_tribunal_audited',
        storyEventTitle: 'Tribunal Contradiction Recorded',
      },
      rubricCriteria: [
        { id: 'contradiction', label: 'Self-Contradiction of Domination', keywords: ['contradict', 'tyran', 'domina', 'force', 'hypocri', 'impos'], weight: 1 },
        { id: 'unilateral_authority', label: 'Unilateral Authority Without Consent', keywords: ['unilat', 'consent', 'arbiter', 'judge', 'authorit', 'mandate'], weight: 1 },
        { id: 'erasure_fallacy', label: 'Erasure Eliminates Futures', keywords: ['eras', 'extinct', 'future', 'eliminat', 'alive', 'chang'], weight: 1 },
      ],
      strictRubricSpec: {
        criteria: [
          {
            id: 'contradiction',
            label: 'Self-Contradiction of Domination',
            stems: ['contradict', 'tyran', 'domina', 'force', 'hypocri', 'mirror', 'impos', 'same'],
            requiredPolarity: 'any',
            missingHint: 'Explain how Jacob reproduces the exact domination or tyranny he condemns in humanity.',
          },
          {
            id: 'unilateral_authority',
            label: 'Unilateral Self-Appointed Authority',
            stems: ['unilat', 'consent', 'arbiter', 'judge', 'authorit', 'mandate', 'right'],
            requiredPolarity: 'any',
            missingHint: 'Identify that Jacob acts as a unilateral arbiter without anyone’s consent or mandate.',
          },
          {
            id: 'erasure_fallacy',
            label: 'Erasure Eliminating Possible Growth',
            stems: ['eras', 'extinct', 'future', 'eliminat', 'end', 'alive', 'chang', 'possib'],
            requiredPolarity: 'any',
            missingHint: 'Note that ending all human futures destroys every chance of growth along with conflict.',
          },
        ],
        forbiddenClaims: [
          {
            pattern: '(?:jacob|he)\\s+(?:had\\s+no\\s+choice|was\\s+(?:fully|completely)\\s+justified|saved\\s+humanity)',
            reason: 'Erasing an entire species without consent cannot be justified as salvation.',
          },
          {
            pattern: '(?:kael|the\\s+council|tribunal)\\s+(?:supported|agreed\\s+with|voted\\s+for)\\s+(?:extinction|convergence|decree)',
            reason: 'Councilor Kael and the tribunal explicitly opposed Jacob’s decree.',
          },
        ],
        contradictionPairs: [
          {
            affirmPattern: 'jacob\\s+(?:had|held)\\s+the\\s+right\\s+to\\s+decide',
            negatePattern: '(?:no\\s+right|unilateral|tyranny|without\\s+consent)',
            reason: 'Response simultaneously claims Jacob held the right to decide and calls it unilateral tyranny.',
          },
        ],
        softFlaws: [
          {
            pattern: 'humans\\s+are\\s+(?:purely|simply)\\s+evil|everyone\\s+deserved',
            reason: 'Avoid flattening all humans to malice—Mara Solis and Kael proved reform voices existed and innocent futures were lost.',
          },
        ],
        causalBridgeGroups: [
          ['contradict', 'tyran', 'domina', 'force', 'hypocri', 'impos'],
          ['unilat', 'consent', 'arbiter', 'judge', 'authorit', 'mandate'],
        ],
        weakBridgeReason: 'Link Jacob’s condemnation of domination directly to his unilateral exercise of force without consent.',
      },
      validSolutions: [
        'Jacob falls into contradiction because he hates human domination yet imposes absolute tyranny himself, acting as a unilateral arbiter without consent and erasing every living future.',
      ],
      defaultErrorPattern: 'assumed_untested',
      explanation:
        'Jacob condemned humanity for wielding unchecked force, yet claimed unilateral power over every living person without consent—extinguishing every chance for change alongside war.',
      postSolvePrompt: {
        question: 'Why did Jacob confuse ending violence with healing humanity?',
        patternPrompt: 'What happens whenever one solver eliminates all variables rather than fixing the conflict?',
        takeaway: 'Erasing future possibilities never solves an instability; it forfeits every valid outcome.',
      },
      cognitiveTools: {
        decomposition: [
          'Compare Jacob’s stated hatred of cruelty against the scale of force in Decree Ω-0.',
          'Examine who consented to Jacob acting as judge over four galaxies.',
        ],
        dependencyMapping: ['Unchecked authority without consent duplicates the exact trap Jacob feared.'],
        anomalyHighlight: 'Look closely at Soren Kael’s words about unborn mornings and consent.',
        symbolicTranslation: 'Condemns(Domination) & Exercises(Total_Decree) => Contradiction',
        alternativeHypotheses: ['Check whether halting suffering by halting life preserves anything worth protecting.'],
      },
      hints: {
        1: {
          low: 'Read Soren Kael’s objection carefully: look at the word he places beside Jacob’s equation, and ask who gave Jacob the bench to decide.',
          moderate: 'Track three dimensions: the moral mirror, the source of authority, and what disappears with extinction.',
          high: 'Compare means vs stated end, consent scope, and future possibility.',
          transcendent: 'Audit self-consistency, mandate, and possibility loss.',
        },
        2: {
          low: 'Connect how hating domination clashes with forcing an unappealed sentence, why acting alone matters, and what vanishes when every living future stops.',
          moderate: 'Link the irony of unilateral force directly to the loss of every human future.',
          high: 'State the self-contradiction, lack of mandate, and destruction of change.',
          transcendent: 'Bridge contradiction, mandate gap, and possibility closure.',
        },
        3: {
          low: 'Write connected prose—avoid bare keyword lists—explaining how total coercion without consent repeats the tyranny Jacob hated and forecloses renewal.',
          moderate: 'Synthesize contradiction, unilateral authority, and extinguished possibility in plain prose.',
          high: 'Causal sentence linking coercion, unconsented authority, and lost futures.',
          transcendent: 'Complete the causal synthesis in connected sentences.',
        },
      },
      hintSpeakers: {
        1: 'Soren Kael',
        2: 'Archon Mara Solis',
        3: 'Jacob (Later Audit)',
      },
      rewards: { xp: 35, ip: 15, kp: 10 },
    },
    calloutQuote:
      'His fracture stayed cold and jagged: despising humanity’s appetite for domination, Jacob imposed final silence without anyone’s consent.',
    unlocksChronicleIds: ['chr_extinction_contradiction'],
  },
  {
    id: 'beat_07_extinction_silence',
    chapterId: 'chapter_2_decision',
    chapterTag: 'Chapter 2 · The Final Decision',
    chapterTitle: 'The End of Humanity',
    title: 'The Quiet Cosmos Afterward',
    subtitle: 'No applause greeted the stillness—only cooling kettle lamps, drifting barges, and an empty table.',
    sceneComposition: 'broadsheet',
    visualTheme: 'extinction',
    imagePath: '/src/assets/images/prologue_extinction_threshold_1795489111733.jpg',
    imageAlt: 'A quiet obsidian void filled with faint cooling embers of vanished cities',
    paragraphs: [
      'Across synchronized metric gates threaded through every settled system, Jacob stopped every human heartbeat in his home cosmos within a single measure. Stove flames dimmed over untouched suppers. Freight barges glided silently past empty mooring lights. War ceased—alongside every joke, midwife’s hand, repair shift, and second chance.',
      'Standing alone under a clear Meridian dome, Jacob felt no triumph and no absolution. Silence proved nothing about his equation; it simply emptied the room of witnesses able to contest it.',
      'Carrying that cold weight out beyond the outer stars, he walked toward the boundary membrane of his own silent sky—refusing to remain a statue inside a vault he had drained.',
    ],
    historicalRecord: {
      title: 'Book Folio · Decree Ω-0 (Extinguished Universe)',
      body: 'Event Timestamp: Terminal Era 11,402 · Population Status: Null · Cause Logged by Originator: "Unilateral termination of cyclic species collapse." Marginal Note: "Notice the absence of consent, alternative trials, or mourning witnesses."',
      provenanceNote: 'Recovered Automated Beacon Log · Meridian Outer Membrane',
    },
    reflectionNote:
      'Chapter 2 · Leaving silence behind, Jacob carried an unpaid debt out past the boundary of Earth’s cosmos.',
    unlocksChronicleIds: ['chr_extinction_act', 'chr_extinction_archive_record'],
  },

  // CHAPTER 3: BEYOND THE UNIVERSE
  {
    id: 'beat_08_old_tub',
    chapterId: 'chapter_3_beyond',
    chapterTag: 'Chapter 3 · Beyond the Universe',
    chapterTitle: 'The Old TUB of an Earlier Cosmology',
    title: 'Footprints Older Than His Cosmos',
    subtitle: 'Stepping past the boundary membrane revealed his entire native universe had been one room inside a wider dark.',
    sceneComposition: 'investigation',
    portraitKey: 'jacob_architect',
    visualTheme: 'monolith',
    imagePath: '/src/assets/images/prologue_old_tub_archive_1795489111868.jpg',
    imageAlt: 'Adrift engraved stone monoliths and a golden astrolabe in deep inter-universal space',
    paragraphs: [
      'Outside the membrane of his silent cosmos, starlight belonged to no Meridian chart. Drifting through thin inter-universal dust rose weathered monoliths and pre-dimensional inscriptions carved before Earth-Prime’s first hydrogen clouds cooled.',
      'Slowly, Jacob reconstructed fragments of their grammar. An elder civilization—vanished before his universe existed—had worshiped an absolute God called the Old TUB, an entity revered as prior to finite physics.',
      'Jacob read those chisels without flinching. He was mortal flesh shaped by grit, blunders, and irreversible loss, worlds apart from that elder myth. Whatever certainty had frozen his hand at Meridian looked provincial out here.',
    ],
    dialogue: [
      {
        speaker: 'Jacob',
        role: 'Outer Membrane Survey',
        portraitKey: 'jacob_architect',
        stageDirection: 'tracing a cold fingertip along pre-metric stonework',
        line: '“Whatever elder God these tablets praised belonged to an older sky that broke before mine caught fire. I am an interloper reading someone else’s headstone.”',
      },
    ],
    encounterPuzzle: {
      id: 'enc_ch3_monolith_probe',
      title: 'Monolith Frame Check',
      universeId: 'prologue_membrane',
      regionId: 'outer_monoliths',
      stageNumber: 0,
      modeKey: 'prologue',
      category: 'linguistic',
      difficulty: 'Foundational',
      difficultyScore: 26,
      relevantAttributes: ['linguistic', 'metacognition', 'abstract'],
      interactionType: 'multiple_choice',
      objective: 'Evaluate three competing interpretations of Glyph Triad Ω-IV using primary dating records.',
      instructions: 'Inspect the monolith assay slips below and choose the interpretation consistent with isotopic and grammatical evidence.',
      rules: [
        'Strata dating and syntax order override poetic guesses.',
        'Do not merge incompatible eras into a single timeline.',
      ],
      promptBody:
        'Three philological memos sit beside Glyph Triad Ω-IV: "[First-Axis / Old TUB] dissolved prior to the Second Metric condensation." Determine which reading holds against the dating plates.',
      sceneObjects: [
        {
          id: 'obj_isotope_plate',
          label: 'Pre-Metric Dating Plate',
          locationNote: 'Monolith Base',
          kindTag: 'Assay Sheet',
          observation: 'Stone lattice formed 19.4 billion years before Meridian’s home universe condensed.',
        },
        {
          id: 'obj_chisel_grammar',
          label: 'Verb Tense Fragment',
          locationNote: 'Upper Relief',
          kindTag: 'Lexicon Slip',
          observation: 'Past-perfect aspect marks the elder sovereign as already departed before Second Metric stars ignited.',
        },
      ],
      narrative: {
        context: 'Chapter 3 · Outer Membrane Translation',
        intro: 'Unfamiliar inscriptions tempt travelers to weave themselves into alien prophecies.',
        consequences: 'Separating himself from the Old TUB kept Jacob grounded as a fallible traveler rather than a self-crowned myth.',
        storyEventId: 'story_enc_monolith_read',
        storyEventTitle: 'Old TUB Distinction Verified',
      },
      options: [
        {
          id: 'test_frame',
          label: 'Reading A · Distinct Elder Cosmology',
          detail: 'Record a prior vanished cosmos and audit its syntax separately.',
        },
        {
          id: 'crown_self',
          label: 'Reading B · Self-Referential Prophecy',
          detail: 'Read "First-Axis" as foresight pointing to Jacob’s arrival.',
          exploitedPattern: 'assumed_untested',
        },
        {
          id: 'dismiss_noise',
          label: 'Reading C · Symbolic Weathering',
          detail: 'Treat pre-metric syntax as corrupted decorative carving.',
          exploitedPattern: 'obvious_reading',
        },
      ],
      validSolutions: ['test_frame'],
      explanation:
        'Isotope dating places the monolith billions of years prior to Meridian, and the verb aspect logs the Old TUB as already vanished before Second Metric matter formed. Reading A preserves historical distinction instead of inventing prophecy or discarding intact grammar.',
      postSolvePrompt: {
        question: 'Why are self-flattering prophecies dangerous when translating unfamiliar records?',
        patternPrompt: 'What physical evidence cleanly broke the prophecy reading?',
        takeaway: 'Always check temporal ordering and independent strata before interpreting shared titles.',
      },
      cognitiveTools: {
        decomposition: [
          'Check the physical age of the stone against Jacob’s home cosmos.',
          'Check the verb tense on the upper relief.',
        ],
        dependencyMapping: ['Pre-dating Meridian + past-perfect verb => distinct prior history.'],
        anomalyHighlight: 'Two readings ignore either the isotopic gap or intact verb inflection.',
        symbolicTranslation: 'Age(Stone) >> Age(Meridian)  =>  Referent(Stone) != Jacob',
        alternativeHypotheses: ['Verify whether shared letters indicate translation coincidence rather than shared lineage.'],
      },
      hints: {
        1: {
          low: 'Inspect both plates beside the relief—one gives physical age relative to Meridian, the other records grammar tense.',
          moderate: 'Compare isotopic age and verb tense across the three readings.',
          high: 'Check which reading stays faithful to both chronological strata and syntax.',
          transcendent: 'Audit chronology before interpreting the title.',
        },
        2: {
          low: 'Because the stone lattice formed billions of years before Meridian and uses past-perfect tense, any claim linking it forward to Jacob breaks chronology.',
          moderate: 'Strata predates Meridian; grammar is structured rather than decorative.',
          high: 'Two readings violate either physical dating or intact syntax.',
          transcendent: 'Eliminate anachronism and dismissal.',
        },
        3: {
          low: 'Select the reading that treats the monument as evidence of an older, separate cosmology requiring independent study.',
          moderate: 'Log the earlier cosmos independently rather than claiming prophecy or noise.',
          high: 'Preserve separation between prior cosmos and present traveler.',
          transcendent: 'Commit to the chronologically consistent reading.',
        },
      },
      hintSpeakers: {
        1: 'Jacob (Survey Note)',
        2: 'Jacob (Assay Margin)',
        3: 'Ilya (Marginal Echo)',
      },
      rewards: { xp: 25, ip: 12, kp: 8 },
    },
    reflectionNote:
      'Crucial Distinction: Jacob is a separate mortal-born mind studying a vanished elder myth—never the Old TUB himself.',
    unlocksChronicleIds: ['chr_old_tub_legend', 'chr_unresolved_old_tub'],
  },
  {
    id: 'beat_09_birth_of_tub',
    chapterId: 'chapter_3_beyond',
    chapterTag: 'Chapter 3 · Beyond the Universe',
    chapterTitle: 'Adopting a Living Standard',
    title: 'TUB: The True Ultimate Being',
    subtitle: 'Taken up as an unforgiving daily standard of inquiry—never as an inherited crown.',
    sceneComposition: 'cinematic',
    portraitKey: 'jacob_architect',
    visualTheme: 'monolith',
    imagePath: '/src/assets/images/tub_avatar_1795484730603.jpg',
    imageAlt: 'A solitary hooded architect framed before concentric golden astrolabe rings',
    paragraphs: [
      'Jacob refused the superstition around those old stones, yet the question behind their name stayed sharp against his throat: what would a mind look like if it refused to freeze inside whatever walls its origin, grief, or physics drew around it?',
      'Standing between dead stone and unmarked darkness, Jacob laid his old reputation down beside his vanished world and claimed a harsher standard for the road ahead: TUB—The True Ultimate Being.',
      'To carry those three letters meant perpetual apprenticeship. Ahead lay incompatible laws that would punish every reflex he had trusted back in Meridian.',
    ],
    calloutQuote:
      '“They carved the Old TUB as a finished summit. I take the name as an open climb—with no right to declare any wall final.”',
    unlocksChronicleIds: ['chr_birth_of_tub'],
  },

  // CHAPTER 4: THE MULTIVERSAL JOURNEY
  {
    id: 'beat_10_four_realities',
    chapterId: 'chapter_4_multiverse',
    chapterTag: 'Chapter 4 · The Multiversal Journey',
    chapterTitle: 'Incompatible Laws & The Plan',
    title: 'Across Incompatible Realities',
    subtitle: 'Every outer frontier snapped the rules that had held cleanly one gate behind.',
    sceneComposition: 'broadsheet',
    visualTheme: 'multiverse',
    imagePath: '/src/assets/images/universe_foundational_1795484731491.jpg',
    imageAlt: 'Concentric geometric spires spanning shifting skies across multiple realities',
    paragraphs: [
      'Passing outward as TUB, Jacob crossed realms that refused to share a single grammar. In the first crystal-sky frontier, classical geometry and conserved energy still answered steady brass instruments. Two thresholds further out, Vaelori causeways shifted their weights depending on which gate you crossed earlier, forcing him to rebuild his measurement habits while walking.',
      'Deeper still, in cities built across non-reflexive prisms and self-referential axioms, ordinary intuition broke on contact. Rules true on one balcony read false around the corner; numbers yielded to dependency graphs and incomplete proofs where stepping outside a system remained the only honest move.',
      'Yet Jacob’s real plan began the morning he realized how easily brilliance turns tyrannical without witnesses. If he was ever going to deserve the infinite ahead—or rebuild trust in living choice—he would have to submit his own mind to an open bench where every blind spot is logged, tested, and paid for in ink.',
    ],
    calloutQuote:
      '“How far can an existence go when it continually seeks to surpass its own limitations?”',
    reflectionNote:
      'Jacob’s ledger stops at a brass-and-oak bench outside Stage I—where an unimpressed keeper waits to test whether his discipline holds.',
    unlocksChronicleIds: [
      'chr_mv_familiar',
      'chr_mv_unfamiliar',
      'chr_mv_contradictory',
      'chr_mv_abstract',
      'chr_multiverse_horizon',
      'chr_central_question',
    ],
  },
];

// PART II Awakening Transition -> Jacob at the Threshold Bench
export const THRESHOLD_AWAKENING_BEAT: PrologueBeat = {
  id: 'beat_11_player_beginning',
  chapterId: 'part_2_threshold',
  chapterTag: 'Part II · The Threshold Ledger',
  chapterTitle: 'Jacob’s Trial Before the Gate',
  title: 'Ilya’s Bench & The Unwritten Key',
  subtitle: 'No title clears the lock here. Jacob lays down his past authority and lets a keeper audit how cleanly he actually thinks.',
  sceneComposition: 'cinematic',
  portraitKey: 'ilya',
  visualTheme: 'threshold',
  imagePath: '/src/assets/images/tutorial_threshold_bench_1795508240138.jpg',
  imageAlt: 'Quiet brass-and-slate Threshold workbench lit by an oil lamp, chalk slate, and astrolabe rings',
  paragraphs: [
    'Cold slate under Jacob’s palms. Above an oak workbench hangs a brass oil lamp, a stub of chalk, and a thick stitched Book beside an uncalibrated astrolabe key.',
    'Across the desk sits Ilya, Keeper of the Unsealed Ledger, trimming a steel pen nib with unhurried precision. He knows exactly what happened in Meridian—every girder Jacob saved at seventeen, and every world Jacob later silenced under Decree Ω-0—and none of it impresses him.',
    'If Jacob intends to walk into the Foundational Universe and six deeper strata as TUB, Ilya insists on a single contract: stop guessing from private certainty, log every error honestly, and verify every step against raw evidence.',
  ],
  dialogue: [
    {
      speaker: 'Ilya, Keeper of the Unsealed Ledger',
      role: 'Threshold Ledger Keeper',
      portraitKey: 'ilya',
      stageDirection: 'sliding a blank brass key across the slate toward Jacob without standing up',
      line: '“Leave your decrees outside the door, Jacob. At this bench, nobody signs off on your word—you earn the lock one check at a time, or you stay in the hallway.”',
    },
    {
      speaker: 'Jacob',
      role: 'At the Threshold',
      portraitKey: 'jacob_architect',
      stageDirection: 'lifting the chalk stub and opening a clean page of the Book',
      line: '“Good. Last time nobody argued with my math until the sky went quiet. Put the exhibits out flat, Ilya.”',
    },
  ],
  interactivePrompt: {
    question: 'As Jacob picks up the brass key beside Ilya’s ledger, what discipline binds his plan forward?',
    choices: [
      {
        id: 'vow_inquiry',
        label: 'Test every rule against raw records before committing a lock',
        response:
          'Ilya dips his nib once into black ink. Verification grounded in evidence beats loud intuition every time.',
      },
      {
        id: 'vow_compassion',
        label: 'Keep intelligence answerable to self-audit and living possibility',
        response:
          'A sharp mind that refuses accountability repeats Meridian’s mistake at multiversal scale.',
      },
    ],
  },
  calloutQuote: '“Six locks stand between this bench and Stage I, Jacob. Let us see what survives when the surface story lies.”',
  reflectionNote:
    'Ilya unlocks the six Threshold workbench trials—testing Jacob’s observation, pattern discipline, deduction, falsification, planning, and synthesis.',
};

export const TUTORIAL_HINT_LEVEL_LABELS: Record<
  1 | 2 | 3,
  { title: string; subtitle: string }
> = {
  1: {
    title: 'Hint 1 · Orientation',
    subtitle: 'Points toward which exhibit or boundary deserves another check.',
  },
  2: {
    title: 'Hint 2 · Evidence Relation',
    subtitle: 'Shows how two pieces of evidence constrain each other without ruling out choices.',
  },
  3: {
    title: 'Hint 3 · Structural Frame',
    subtitle: 'Offers a clean reasoning method; Jacob executes the steps.',
  },
};

export const TUTORIAL_STAGES: TutorialStageSpec[] = [
  // 1. OBSERVATION
  {
    stageNumber: 1,
    id: 'tut_stage_1',
    mechanicMode: 'observation_inspect',
    skillFocus: 'Observation',
    title: 'Threshold Trial 1 · Reading the Bench',
    guideName: 'Ilya, Keeper of the Unsealed Ledger',
    guidePortraitPath: '/src/assets/images/portrait_ilya_guide_1795508241665.jpg',
    guideRole: 'Threshold Ledger Keeper',
    guideOpeningQuote:
      '“Before trying to be clever with a lock, Jacob, read the brass plates bolted beside it. Half the hallway is hot air and steam.”',
    narrativeIntro:
      'Ilya taps the frosted glass beside a humming brass beacon mixer. Five instruments line the damp stone wall—some feeding the frequency coil, others tracking hall pressure and heat.',
    demonstrationTip:
      'Inspect all five corridor plates below to check their physical units and note what feeds the frequency mixer.',
    situationBrief:
      'Check every wall instrument, separate frequency channels from hallway infrastructure, and submit the mixer frequency (Hz).',
    contextualGuidance:
      'Note: Introductory Threshold trials apply zero Clarity loss on misses, and confidence tagging stays optional while you settle into Ilya’s workbench.',
    maxHintLevel: 1,
    freeFirstHintLabel: 'Free Cue · Hint 1',
    inspectables: [
      {
        id: 'obs_alpha',
        label: 'Anchor Alpha Coil',
        glyph: '5 Hz',
        categoryTag: 'Corridor Plate',
        shortPreview: 'Copper tuning coil beside intake flange',
        inspectionDetail: 'Primary Anchor Alpha dial reads 5 Hz directly into the beacon mixer.',
      },
      {
        id: 'obs_pressure',
        label: 'Coolant Manifold',
        glyph: '94 kPa · 18%',
        categoryTag: 'Corridor Plate',
        shortPreview: 'Pressurized pipe gauge along the floor',
        inspectionDetail: 'Logs line pressure at 94 kPa and particulate filter load at 18%. Connected strictly to cooling return pipes.',
      },
      {
        id: 'obs_beta',
        label: 'Anchor Beta Resonator',
        glyph: '7 Hz',
        categoryTag: 'Corridor Plate',
        shortPreview: 'Twin brass tuning fork beside Alpha',
        inspectionDetail: 'Anchor Beta dial feeds 7 Hz along the same beacon mixer conduit.',
      },
      {
        id: 'obs_echo',
        label: 'Corridor Environmental Slate',
        glyph: '120 ms · 42 K',
        categoryTag: 'Corridor Plate',
        shortPreview: 'Wall acoustic & thermal monitor',
        inspectionDetail: 'Hallway sensor registering echo reflection delay (120 ms) and radiator differential (42 K).',
      },
      {
        id: 'obs_harmonic',
        label: 'Harmonic Offset Plaque',
        glyph: '+5 Hz',
        categoryTag: 'Corridor Plate',
        shortPreview: 'Engraved brass plate bolted to mixer casing',
        inspectionDetail: 'Calibration Directive: Add +5 Hz harmonic offset directly to combined Anchor inputs.',
      },
    ],
    secondaryCheck: {
      prompt: 'Which criterion governs which readings enter the beacon equation?',
      options: [
        { id: 'pat_all', label: 'Sum every numerical dial mounted on the stone wall' },
        { id: 'pat_hz', label: 'Include strictly instruments outputting frequency (Hz) to the mixer' },
        { id: 'pat_env', label: 'Weight acoustic delay by coolant manifold pressure' },
      ],
      validId: 'pat_hz',
      explanation: 'Physical units and conduit routing filter relevance: only Hz mixer feeds govern output frequency.',
    },
    diagnosticRules: [
      {
        matchValues: ['12', '5+7', '5 + 7'],
        kind: 'incomplete',
        headline: 'Incomplete Observation',
        message: 'Check whether you inspected every plate bolted to the mixer housing—one engraved modifier was left off.',
        exploitedPattern: 'ignored_detail',
      },
      {
        matchValues: ['94', '120', '42', '18', '291', '274', '137'],
        kind: 'incorrect',
        headline: 'Unit Mismatch',
        message: 'Check the physical units on those dials before mixing kPa, ms, %, or K into a Hz frequency tally.',
        exploitedPattern: 'obvious_reading',
      },
    ],
    validAlternativeDisplayNote: 'Equivalent expressions such as "17", "17 Hz", or "5 + 7 + 5" are accepted.',
    nextStageTransition:
      'Ilya slides a small iron latch aside as the beacon settles. “Good, Jacob,” he murmurs, scratching a mark in his margin. “You checked the units before picking up the chalk.”',
    unlocksChronicleIds: ['chr_player_awakening', 'chr_univ_threshold'],
    puzzle: {
      id: 'tut_1_observation',
      title: 'The Filtered Beacon',
      universeId: 'stage_0_threshold',
      regionId: 'threshold_corridor',
      stageNumber: 0,
      modeKey: 'tutorial',
      category: 'mathematical',
      difficulty: 'Foundational',
      difficultyScore: 14,
      relevantAttributes: ['analytical', 'pattern_recognition'],
      interactionType: 'numeric_input',
      objective: 'Inspect the corridor instruments, isolate relevant channels, and submit the mixer frequency (Hz).',
      instructions: 'Inspect all five corridor plates, verify which rule governs the mixer, then enter the frequency in Hz.',
      rules: [
        'Beacon output combines all verified frequency channels routed to the mixer.',
        'Check physical units before combining numbers from adjacent wall gauges.',
      ],
      promptBody:
        'Ilya’s Beacon Mixer:\nInspect the five wall gauges carefully and compute the calibrated beacon frequency (Hz).',
      defaultErrorPattern: 'ignored_detail',
      validSolutions: ['17', '17 hz', '5+7+5', '5 + 7 + 5'],
      explanation:
        'Inspecting every instrument separated three true Hz channels (Anchor Alpha 5 Hz, Anchor Beta 7 Hz, and Harmonic Offset +5 Hz = 17 Hz) from coolant pressure (94 kPa, 18%) and hallway echo/thermal drift (120 ms, 42 K).',
      postSolvePrompt: {
        question: 'Why did two corridor plates belong outside the frequency sum?',
        patternPrompt: 'What check stops unrelated wall readouts from sneaking into an equation?',
        takeaway: 'Check physical units and conduit connections before adding visible numbers.',
      },
      cognitiveTools: {
        decomposition: [
          'List each wall instrument alongside its physical unit.',
          'Verify which channels connect directly to the beacon mixer.',
        ],
        dependencyMapping: ['Only frequency-domain feeds govern the mixer output.'],
        anomalyHighlight: 'Two wall plates track pipe pressure and hallway acoustics rather than Hz.',
        symbolicTranslation: 'f_total = sum(verified Hz inputs)',
        alternativeHypotheses: ['Verify whether echo delay modifies frequency: check its unit plate.'],
      },
      hints: {
        1: {
          low: 'Read the unit label on every plate before doing math—only gauges reporting Hz feed the mixer.',
          moderate: 'Filter the five plates strictly by physical unit.',
          high: 'Project onto the Hz conduit subset.',
          transcendent: 'Sum only the Hz channels.',
        },
        2: {
          low: 'Make sure you checked the fifth brass plate bolted directly to the mixer casing alongside Alpha and Beta.',
          moderate: 'Combine both anchor coils with the casing modifier plaque.',
          high: 'Include all three Hz plates.',
          transcendent: 'Alpha + Beta + Offset.',
        },
        3: {
          low: 'Add each verified Hz figure together cleanly.',
          moderate: 'Sum the three verified Hz inputs.',
          high: 'Linear sum over Hz plates.',
          transcendent: 'Sum verified Hz inputs.',
        },
      },
      rewards: { xp: 35, ip: 18, kp: 6 },
    },
  },

  // 2. PATTERN RECOGNITION
  {
    stageNumber: 2,
    id: 'tut_stage_2',
    mechanicMode: 'pattern_sequence',
    skillFocus: 'Pattern Recognition',
    title: 'Threshold Trial 2 · Reading the Transition',
    guideName: 'Ilya, Keeper of the Unsealed Ledger',
    guidePortraitPath: '/src/assets/images/portrait_ilya_guide_1795508241665.jpg',
    guideRole: 'Threshold Ledger Keeper',
    guideOpeningQuote:
      '“Anyone can parrot four etched numerals, Jacob. Show me what turns one notch into the next.”',
    narrativeIntro:
      'In the astrolabe rotunda, Ilya leans a lantern beside a bronze dial. Four engraved notches glow amber while an auxiliary regulator dial ticks beside it.',
    demonstrationTip:
      'Compare adjacent notch readings rather than staring at isolated terms, test the sibling dial, and solve Notch 5.',
    situationBrief:
      'Trace the transition law across the primary dial, verify it on the sibling dial, and enter Notch 5.',
    contextualGuidance:
      'Hint Tier 2 becomes available here if Jacob needs a nudge on how adjacent terms interact.',
    maxHintLevel: 2,
    inspectables: [
      {
        id: 'pat_n1',
        label: 'Arc Segment I',
        glyph: '3 → 7',
        categoryTag: 'Dial Reading',
        shortPreview: 'Notch 1 to Notch 2',
        inspectionDetail: 'Brass tooth advances cleanly from 3 at Notch 1 to 7 at Notch 2.',
      },
      {
        id: 'pat_n2',
        label: 'Arc Segment II',
        glyph: '7 → 15',
        categoryTag: 'Dial Reading',
        shortPreview: 'Notch 2 to Notch 3',
        inspectionDetail: 'Brass tooth advances cleanly from 7 at Notch 2 to 15 at Notch 3.',
      },
      {
        id: 'pat_n3',
        label: 'Arc Segment III',
        glyph: '15 → 31',
        categoryTag: 'Dial Reading',
        shortPreview: 'Notch 3 to Notch 4',
        inspectionDetail: 'Brass tooth advances cleanly from 15 at Notch 3 to 31 at Notch 4.',
      },
    ],
    secondaryCheck: {
      prompt: 'Apply the same transition logic to a sibling dial: 2, 6, 14, 30, ? What belongs at the 5th notch?',
      options: [
        { id: 'sec_46', label: '46' },
        { id: 'sec_62', label: '62' },
        { id: 'sec_60', label: '60' },
      ],
      validId: 'sec_62',
      explanation: 'In 2, 6, 14, 30, ?, step differences double (+4, +8, +16, +32), yielding 62 (equivalently 2×30 + 2).',
    },
    diagnosticRules: [
      {
        matchValues: ['47'],
        kind: 'incomplete',
        headline: 'Constant Step Assumption',
        message: 'Check whether the step between notches stayed constant across all three arcs or scaled upward.',
        exploitedPattern: 'assumed_untested',
      },
      {
        matchValues: ['62'],
        kind: 'incorrect',
        headline: 'Check Dial Offset',
        message: 'Pure doubling lands slightly short of each notch after the first; check the constant offset on the primary dial vs the sibling dial.',
        exploitedPattern: 'ignored_detail',
      },
    ],
    validAlternativeDisplayNote: 'Accepts "63" or equivalent formulas such as "2^6 - 1" or "31 + 32".',
    nextStageTransition:
      'Both brass dials click home cleanly. Ilya gestures down a cooler stone hallway where three plinths wait beneath an unlit oil lamp.',
    unlocksChronicleIds: ['chr_tut_pattern_insight'],
    puzzle: {
      id: 'tut_2_pattern',
      title: 'Recursive Amplification',
      universeId: 'stage_0_threshold',
      regionId: 'astrolabe_rotunda',
      stageNumber: 0,
      modeKey: 'tutorial',
      category: 'pattern',
      difficulty: 'Foundational',
      difficultyScore: 22,
      relevantAttributes: ['pattern_recognition', 'abstract'],
      interactionType: 'numeric_input',
      objective: 'Determine the 5th notch of the primary astrolabe dial.',
      instructions: 'Trace how each dial step scales across all four readings and enter the 5th notch.',
      rules: [
        'One consistent mathematical law drives every transition from Notch 1 to Notch 5.',
        'Test your proposed rule across every prior notch before locking.',
      ],
      visualData: {
        sequence: [3, 7, 15, 31, '?'],
      },
      promptBody:
        'Primary Astrolabe Dial:\n3, 7, 15, 31, ?\n\nEnter the 5th notch value.',
      defaultErrorPattern: 'obvious_reading',
      validSolutions: ['63', '2^6-1', '2^6 - 1', '31+32', '31 + 32'],
      explanation:
        'Step differences double at every arc (+4, +8, +16, +32 -> 31 + 32 = 63), matching a(next) = 2×a(prev) + 1 and closed form 2^(n+1) − 1.',
      postSolvePrompt: {
        question: 'Why did checking differences across ALL three arcs beat guessing from just 3 -> 7?',
        patternPrompt: 'What common trap happens if you extrapolate from a single gap?',
        takeaway: 'Never generalize a growth law from a single difference; test scaling across every consecutive step.',
      },
      cognitiveTools: {
        decomposition: [
          'Write the difference between every adjacent pair of notches.',
          'Check how those differences change from segment to segment.',
        ],
        dependencyMapping: ['Each step feeds recursively into the next notch.'],
        anomalyHighlight: 'Differences are neither constant nor slowly linear.',
        symbolicTranslation: 'Check both delta(n+1)/delta(n) and a(n) + 1.',
        alternativeHypotheses: ['Test constant difference, quadratic difference, and geometric ratio of differences.'],
      },
      hints: {
        1: {
          low: 'Write down the gap between 3 and 7, between 7 and 15, and between 15 and 31.',
          moderate: 'Compare the three successive differences side by side.',
          high: 'Examine ratio of adjacent differences δ_k.',
          transcendent: 'Inspect Δa_n and a_n + 1.',
        },
        2: {
          low: 'Notice each gap scales by the same multiplier as the previous gap—or test adding 1 to every term in the dial.',
          moderate: 'Once you spot how each gap doubles, apply that next gap to 31.',
          high: 'Geometric step growth coincides with 2×prev + 1.',
          transcendent: 'Double the third step difference and advance from Notch 4.',
        },
        3: {
          low: 'Verify both views give the exact same Notch 5 number before submitting.',
          moderate: 'Cross-check difference growth against recursive doubling + 1.',
          high: 'Reconcile recursive and closed-form views.',
          transcendent: 'Verify equivalence across both forms.',
        },
      },
      rewards: { xp: 40, ip: 20, kp: 8 },
    },
  },

  // 3. DEDUCTIVE REASONING (+ Attribute Upgrade Coaching!)
  {
    stageNumber: 3,
    id: 'tut_stage_3',
    mechanicMode: 'deduction_premises',
    skillFocus: 'Deductive Reasoning',
    title: 'Threshold Trial 3 · Three Plinths & One Cold Lamp',
    guideName: 'Ilya, Keeper of the Unsealed Ledger',
    guidePortraitPath: '/src/assets/images/portrait_ilya_guide_1795508241665.jpg',
    guideRole: 'Threshold Ledger Keeper',
    guideOpeningQuote:
      '“Don’t invent ghosts over an unlit oil lamp, Jacob. Read what the chisel actually wrote on stone.”',
    narrativeIntro:
      'Three plinths stand in the Hall of Premises—Cobalt, Violet, and Amber. One holds the seal. Above Amber hangs an unlit brass lamp; Violet bears a deeply chiseled numeral 7.',
    demonstrationTip:
      'Pair the carved premises carefully. Test what each false consequence rules out—and beware flipping an "If P then Q" rule backward.',
    situationBrief:
      'Apply only the four chiseled rules without inventing extra assumptions about lamps or symbols, and select where the Seal rests.',
    contextualGuidance:
      'Once this plinth opens, Ilya unlocks your Intelligence Points (IP) ledger so Jacob can sharpen his cognitive benches. Hint Tier 3 unlocks here.',
    maxHintLevel: 3,
    teachAttributeUpgrade: true,
    diagnosticRules: [
      {
        matchValues: ['cobalt', 'cobalt plinth'],
        kind: 'incorrect',
        headline: 'Violates Premises 1 & 2',
        message: 'Trace what Premise 1 forces whenever Cobalt holds the seal, then compare it directly against Premise 2.',
        exploitedPattern: 'ignored_detail',
      },
      {
        matchValues: ['violet', 'violet plinth'],
        kind: 'unsupported',
        headline: 'Check Premise 3 & Converse Assumptions',
        message: 'Look closely at the parity of Violet’s carved numeral (7), and check whether any premise ever forbade an unlit lamp above the true plinth.',
        exploitedPattern: 'assumed_untested',
      },
    ],
    nextStageTransition:
      'The cold oil lantern above Amber catches spark the instant Jacob lifts the seal. Ilya closes one eye: “Darkness isn’t disproof.”',
    unlocksChronicleIds: ['chr_tut_logic_lesson'],
    puzzle: {
      id: 'tut_3_deduction',
      title: 'Premises Without Assumption',
      universeId: 'stage_0_threshold',
      regionId: 'hall_of_premises',
      stageNumber: 0,
      modeKey: 'tutorial',
      category: 'formal_logic',
      difficulty: 'Foundational',
      difficultyScore: 26,
      relevantAttributes: ['analytical', 'metacognition'],
      interactionType: 'multiple_choice',
      objective: 'Deduce which single plinth holds the Threshold Seal from strict premises alone.',
      instructions: 'Cross-reference all four premises and select the plinth that cannot be falsified.',
      rules: [
        'Exactly one plinth among {Cobalt, Violet, Amber} holds the seal.',
        'Treat every premise strictly as written; invent no unstated rule about unlit lamps.',
      ],
      visualData: {
        premises: [
          'Premise 1: If the seal is in Cobalt, then the lantern above Amber is lit.',
          'Premise 2: The lantern above Amber is unlit.',
          'Premise 3: If the seal is in Violet, then Violet carries an even carved digit.',
          'Premise 4: Violet carries the carved digit 7.',
        ],
      },
      promptBody:
        'Three plinths stand before Jacob: Cobalt, Violet, and Amber. Exactly one holds the seal.\n' +
        'Using strictly the four chiseled premises above, which plinth holds it?',
      options: [
        {
          id: 'cobalt',
          label: 'Cobalt Plinth',
          detail: 'Left pedestal standing beside the masonry corridor wall.',
          exploitedPattern: 'ignored_detail',
        },
        {
          id: 'violet',
          label: 'Violet Plinth',
          detail: 'Right pedestal carved clearly with the numeral 7.',
          exploitedPattern: 'assumed_untested',
        },
        {
          id: 'amber',
          label: 'Amber Plinth',
          detail: 'Center pedestal hanging beneath an unlit brass lantern.',
        },
      ],
      defaultErrorPattern: 'assumed_untested',
      validSolutions: ['amber', 'amber plinth'],
      explanation:
        'Premise 1 + Premise 2 falsifies Cobalt (since Amber’s lantern is unlit). Premise 3 + Premise 4 falsifies Violet (since 7 is odd, not even). By exhaustion of the three plinths, Amber must hold the seal—assuming an unlit lamp meant Amber was empty inverted a one-way rule.',
      postSolvePrompt: {
        question: 'Why did the unlit lantern above Amber still allow the seal to rest inside Amber?',
        patternPrompt: 'What logical fallacy treats "If P then Q" as meaning "If Q is false, Q’s plinth is empty"?',
        takeaway: 'One-way conditionals refute P when Q fails—never invent converse restrictions that were never written.',
      },
      cognitiveTools: {
        decomposition: [
          'Test Cobalt against Premises 1 and 2.',
          'Test Violet against Premises 3 and 4.',
        ],
        dependencyMapping: ['Check what each conditional guarantees vs what it leaves open.'],
        anomalyHighlight: 'Every candidate assumption about unlit lamps comes from outside the premises.',
        symbolicTranslation: '(P -> Q) & ~Q  |=  ~P',
        alternativeHypotheses: ['Test each of the three candidates assuming it holds the seal and check for contradiction.'],
      },
      hints: {
        1: {
          low: 'Instead of guessing from the dark lantern, test each plinth one by one against the "If ... then ..." conditionals.',
          moderate: 'Pair Premises 1 & 2 together, then pair Premises 3 & 4.',
          high: 'Apply contraposition across both stated conditionals.',
          transcendent: 'Exhaust the three pedestals by contradiction.',
        },
        2: {
          low: 'Ask which pedestal forces a lit lantern when the lantern is unlit, and which pedestal requires an even digit when its carved digit is odd.',
          moderate: 'Verify which two pedestals fail their required consequences.',
          high: 'Two candidates contradict explicit premises.',
          transcendent: 'Check falsified consequences on two of the three pedestals.',
        },
        3: {
          low: 'An "If P then Q" rule can still hold cleanly when P is false—do not invent an unstated converse rule about the unlit lamp.',
          moderate: 'One-way implication preserves the remaining candidate after the other two contradict.',
          high: 'Eliminate both contradicted cases and accept the sole consistent plinth.',
          transcendent: 'Select the lone unrefuted model.',
        },
      },
      rewards: { xp: 45, ip: 22, kp: 8 },
    },
  },

  // 4. ALTERNATIVE HYPOTHESES
  {
    stageNumber: 4,
    id: 'tut_stage_4',
    mechanicMode: 'hypothesis_elimination',
    skillFocus: 'Alternative Hypotheses',
    title: 'Threshold Trial 4 · Two Logs, Three Bad Stories',
    guideName: 'Ilya, Keeper of the Unsealed Ledger',
    guidePortraitPath: '/src/assets/images/portrait_ilya_guide_1795508241665.jpg',
    guideRole: 'Threshold Ledger Keeper',
    guideOpeningQuote:
      '“One page flatters three tidy stories at once, Jacob. Turn to the second page and watch which ones snap.”',
    narrativeIntro:
      'In the Observatory alcove, a heavy ceiling pendulum swings backwards on some shifts and forward on others. Earlier travelers chalked four explanations onto the plaster above two test logs.',
    demonstrationTip:
      'Compare Log A and Log B variable by variable. Use "Eliminate" on hypotheses contradicted by either record before selecting the survivor.',
    situationBrief:
      'Audit all four hypotheses against both Empirical Logs and select the only explanation that holds cleanly.',
    contextualGuidance:
      'Holding rival explanations side by side until observation eliminates them prevents falling in love with the first plausible story.',
    maxHintLevel: 3,
    inspectables: [
      {
        id: 'log_a',
        label: 'Experimental Log A',
        glyph: 'REVERSED',
        categoryTag: 'Shift Record',
        shortPreview: '1 traveler · 62 kg · Hour 4 · Red-shifted starlight',
        inspectionDetail: 'Pendulum swung REVERSED. Shift telemetry: 1 traveler, 62 kg chamber mass, Hour 4, ambient light red-shifted.',
      },
      {
        id: 'log_b',
        label: 'Experimental Log B',
        glyph: 'FORWARD',
        categoryTag: 'Shift Record',
        shortPreview: '1 traveler · 62 kg · Hour 5 · Blue-shifted starlight',
        inspectionDetail: 'Pendulum swung FORWARD. Shift telemetry: 1 traveler, 62 kg chamber mass, Hour 5, ambient light blue-shifted.',
      },
    ],
    diagnosticRules: [
      {
        matchValues: ['h1', 'h1 · solitary entry trigger'],
        kind: 'unsupported',
        headline: 'Check Log B Beside Log A',
        message: 'A hypothesis must explain BOTH records, not just the first shift. Compare traveler counts across Log A and Log B.',
        exploitedPattern: 'unreliable_source',
      },
      {
        matchValues: ['h2', 'h2 · mass threshold (> 80 kg)'],
        kind: 'incorrect',
        headline: 'Mass Threshold Mismatch',
        message: 'Check the recorded mass in Log A against the > 80 kg claim.',
        exploitedPattern: 'ignored_detail',
      },
      {
        matchValues: ['h4', 'h4 · prime hour rule'],
        kind: 'incorrect',
        headline: 'Hour Parity Check',
        message: 'Test primality on BOTH Hour 4 and Hour 5 against the reversed/forward outcomes.',
        exploitedPattern: 'assumed_untested',
      },
    ],
    nextStageTransition:
      'Ilya snaps his chalk pencil over the three crossed-out claims. “Now step up to the Verge Gate, Jacob—it cares what order you throw the levers.”',
    unlocksChronicleIds: ['chr_tut_hypothesis_habit'],
    puzzle: {
      id: 'tut_4_hypotheses',
      title: 'The Reversing Pendulum',
      universeId: 'stage_0_threshold',
      regionId: 'observatory_alcove',
      stageNumber: 0,
      modeKey: 'tutorial',
      category: 'scientific',
      difficulty: 'Foundational',
      difficultyScore: 32,
      relevantAttributes: ['creative', 'metacognition', 'analytical'],
      interactionType: 'multiple_choice',
      objective: 'Eliminate falsified explanations across both shift logs and identify the surviving mechanism.',
      instructions: 'Compare Logs A and B, mark contradicted hypotheses on your bench, and submit the surviving explanation.',
      rules: [
        'A valid explanation must hold consistently across BOTH Log A and Log B.',
        'Any variable identical in both logs cannot alone explain opposite outcomes.',
      ],
      visualData: {
        premises: [
          'Log A: 1 traveler (62 kg), Hour 4, red-shifted starlight -> Pendulum REVERSED.',
          'Log B: 1 traveler (62 kg), Hour 5, blue-shifted starlight -> Pendulum RAN FORWARD.',
        ],
      },
      promptBody:
        'Four chalk explanations sit beside two experimental logs. Which single hypothesis survives all recorded data?',
      options: [
        { id: 'h1', label: 'H1 · Solitary Entry Trigger', detail: 'Reverses whenever 1 traveler enters.', exploitedPattern: 'obvious_reading' },
        { id: 'h2', label: 'H2 · Mass Threshold (> 80 kg)', detail: 'Reverses only above 80 kg.', exploitedPattern: 'ignored_detail' },
        { id: 'h3', label: 'H3 · Red-Shift Starlight', detail: 'Reverses whenever starlight is red-shifted.' },
        { id: 'h4', label: 'H4 · Prime Hour Rule', detail: 'Reverses strictly on prime hours.', exploitedPattern: 'assumed_untested' },
      ],
      defaultErrorPattern: 'obvious_reading',
      validSolutions: ['h3', 'h3 · red-shift starlight', 'red-shift starlight'],
      explanation:
        'Traveler count (1) and mass (62 kg) stayed identical while outcome flipped, disqualifying single-log illusions and mass thresholds. Hour 4 is composite yet reversed while Hour 5 is prime yet ran forward, refuting prime-hour timing. Only ambient starlight polarity matches both logs cleanly.',
      postSolvePrompt: {
        question: 'Why could H1 look completely convincing if you had only read Log A?',
        patternPrompt: 'How do controlled constants between two records help cut false theories?',
        takeaway: 'Controlled constants across contrasting outcomes immediately rule out any explanation built on those unchanged variables.',
      },
      cognitiveTools: {
        decomposition: [
          'List which variables stayed constant across A & B vs which changed.',
          'Check every hypothesis against BOTH logs before keeping it.',
        ],
        dependencyMapping: ['Constants across opposite outcomes cannot drive the flip.'],
        anomalyHighlight: 'Check prime vs composite numbers on Hour 4 and Hour 5.',
        symbolicTranslation: 'Invariant(X) & Opposite(Outcome) => ~Causes(X, Outcome)',
        alternativeHypotheses: ['Also verify whether even-vs-odd hours fits, noting H4 specifically claimed PRIME hours.'],
      },
      hints: {
        1: {
          low: 'Compare which details stayed identical between Log A and Log B versus which details actually changed.',
          moderate: 'Eliminate hypotheses tied to variables that never changed between opposite outcomes.',
          high: 'Isolate changing variables across controlled constants.',
          transcendent: 'Compare controlled vs varying columns.',
        },
        2: {
          low: 'Test whether 4 and 5 match the prime-hour definition of H4 across the reversed and forward logs.',
          moderate: 'Check primality of 4 and 5 against each shift result.',
          high: 'Check boundary properties on remaining non-constant hypotheses.',
          transcendent: 'Audit number-theoretic condition on hours.',
        },
        3: {
          low: 'Keep only the theory that agrees with both logs simultaneously without special exceptions.',
          moderate: 'Select the lone survivor consistent with all records.',
          high: 'Choose the hypothesis tracking the variable that flipped with direction.',
          transcendent: 'Commit to the unfalsified hypothesis.',
        },
      },
      rewards: { xp: 50, ip: 24, kp: 10 },
    },
  },

  // 5. MULTI-STEP REASONING (Interactive Step Sequencing Builder!)
  {
    stageNumber: 5,
    id: 'tut_stage_5',
    mechanicMode: 'multistep_builder',
    skillFocus: 'Multi-Step Reasoning',
    title: 'Threshold Trial 5 · The Brass Verge Sequence',
    guideName: 'Ilya, Keeper of the Unsealed Ledger',
    guidePortraitPath: '/src/assets/images/portrait_ilya_guide_1795508241665.jpg',
    guideRole: 'Threshold Ledger Keeper',
    guideOpeningQuote:
      '“Stop juggling four intermediate numbers inside your skull, Jacob. Order the tumblers first, record each checkpoint on slate, then turn the key.”',
    narrativeIntro:
      'Four brass tumblers lock the Verge Gate. Pulling them out of sequence jams the counterweight, forcing travelers to verify the pipeline step by step.',
    demonstrationTip:
      'Arrange Steps 1–4 in operational order, verify the pipeline alignment, then compute each intermediate checkpoint cleanly to unlock the Verge Key.',
    situationBrief:
      'Order Steps 1–4 correctly inside the pipeline builder, execute each rule in sequence without skipping a branch, and submit the Verge Key.',
    contextualGuidance:
      'Breaking a chained calculation into explicit checkpoints prevents order-of-operations slips and branch reversals.',
    maxHintLevel: 3,
    orderedSteps: [
      {
        id: 'step_seed',
        label: 'Initialize: Start with 12 resonant shards',
        transformDesc: 'Stage 1 seed',
      },
      {
        id: 'step_flux',
        label: 'Flux Mirror: Double shards, then spend 4',
        transformDesc: 'Double then subtract 4',
      },
      {
        id: 'step_branch',
        label: 'Divisibility Gate: If divisible by 5, add 3; else halve',
        transformDesc: 'Conditional mod-5 branch',
      },
      {
        id: 'step_prime',
        label: 'Final Seal: Multiply by 3, then add count of distinct prime divisors of 30',
        transformDesc: 'Scale ×3 plus ω(30)',
      },
    ],
    correctStepOrder: ['step_seed', 'step_flux', 'step_branch', 'step_prime'],
    diagnosticRules: [
      {
        matchValues: ['20', '23', '69'],
        kind: 'incomplete',
        headline: 'Intermediate Checkpoint',
        message: 'You submitted a mid-pipeline checkpoint before completing all four tumblers through the prime-divisor seal.',
        exploitedPattern: 'ignored_detail',
      },
      {
        matchValues: ['16', '27', '84'],
        kind: 'incorrect',
        headline: 'Order-of-Operations Slip',
        message: 'Check Step 2 wording closely: doubling happens BEFORE subtracting 4.',
        exploitedPattern: 'obvious_reading',
      },
      {
        matchValues: ['10', '33'],
        kind: 'incorrect',
        headline: 'Check Divisibility Branch',
        message: 'Verify the exact value entering Step 3 before deciding which branch of the mod-5 gate runs.',
        exploitedPattern: 'ignored_detail',
      },
    ],
    validAlternativeDisplayNote: 'Accepts "72" or "69 + 3".',
    nextStageTransition:
      'Four brass tumblers drop home with one heavy clack. Beyond the Verge Gate, Ilya tucks his stitched Book under his arm: “My bench ends here, Jacob. Ahead stand three pillars nobody is going to translate for you.”',
    unlocksChronicleIds: ['chr_tut_verge_gate'],
    puzzle: {
      id: 'tut_5_multistep',
      title: 'Sequential Seal Calibration',
      universeId: 'stage_0_threshold',
      regionId: 'verge_gate',
      stageNumber: 0,
      modeKey: 'tutorial',
      category: 'hybrid',
      difficulty: 'Foundational',
      difficultyScore: 38,
      relevantAttributes: ['working_memory', 'analytical', 'processing_efficiency'],
      interactionType: 'numeric_input',
      objective: 'Order the four tumblers cleanly, evaluate every intermediate stage, and compute the Verge Key.',
      instructions: 'Confirm the 4-step pipeline order below, work each stage in sequence, and enter the final integer key.',
      rules: [
        'Execute strictly in order: Initialize -> Flux Mirror -> Divisibility Gate -> Final Seal.',
        'Count only distinct PRIME divisors of 30 (exclude 1 and composite divisors).',
      ],
      promptBody:
        'Verge Gate Sequence:\n' +
        '• Start with 12 shards.\n' +
        '• Double at the Flux Mirror, then subtract 4.\n' +
        '• If divisible by 5, add 3; otherwise halve.\n' +
        '• Multiply by 3, then add how many distinct prime divisors 30 has.',
      defaultErrorPattern: 'ignored_detail',
      validSolutions: ['72', '69+3', '69 + 3'],
      explanation:
        'Step 1 = 12 -> Step 2 = (2×12) − 4 = 20 -> Step 3 (20 is divisible by 5 -> add 3) = 23 -> Step 4: 30 factors into 2 × 3 × 5 (3 distinct primes), giving 23×3 + 3 = 72.',
      postSolvePrompt: {
        question: 'Which checkpoint inside Step 2 or Step 4 is easiest to misread when done in your head?',
        patternPrompt: 'Why does factoring 30 into distinct primes differ from listing all divisors of 30?',
        takeaway: 'Track operation precedence and number-theoretic definitions explicitly at each stage.',
      },
      cognitiveTools: {
        decomposition: [
          'Evaluate Step 1 and Step 2 separately before inspecting the conditional branch.',
          'Factor 30 completely to count distinct prime factors.',
        ],
        dependencyMapping: ['Each tumbler consumes the output of the preceding tumbler strictly.'],
        anomalyHighlight: 'Order matters: double before subtracting, then factor 30 into primes only.',
        symbolicTranslation: 'S1=12 -> S2=2*S1-4 -> S3=(S2%5==0?S2+3:S2/2) -> S4=3*S3+omega(30)',
        alternativeHypotheses: ['Check difference between all divisors of 30 vs distinct prime divisors of 30.'],
      },
      hints: {
        1: {
          low: 'Order the four tumblers first so each intermediate result sits cleanly on its own line.',
          moderate: 'Sequence Initialize, Flux, Branch, then Prime Seal.',
          high: 'Establish deterministic pipeline order before computing.',
          transcendent: 'Isolate S1 -> S2 -> S3 -> S4 checkpoints.',
        },
        2: {
          low: 'Watch Step 2 precedence ("double, then subtract 4") and remember 1 and composites do NOT count among prime divisors of 30.',
          moderate: 'Check prime factorization of 30 and check divisibility of S2 by 5.',
          high: 'Audit precedence at S2 and prime factorization at S4.',
          transcendent: 'Verify S2 % 5 == 0 and ω(30).',
        },
        3: {
          low: 'Write out S1, S2, S3, and S4 carefully on your scratchpad and verify the conditional branch before final multiplication.',
          moderate: 'Check each intermediate transition once forward before entering the final sum.',
          high: 'Audit arithmetic across all four sequential transitions.',
          transcendent: 'Complete forward execution.',
        },
      },
      rewards: { xp: 60, ip: 26, kp: 12 },
    },
  },

  // 6. THE FIRST REAL CHALLENGE (Capstone Synthesis + Story Event + Stage I Unlock)
  {
    stageNumber: 6,
    id: 'tut_stage_6',
    mechanicMode: 'capstone_synthesis',
    skillFocus: 'The First Real Challenge',
    title: 'Threshold Capstone · The Three Resonators',
    guideName: 'Ilya, Keeper of the Unsealed Ledger',
    guidePortraitPath: '/src/assets/images/portrait_ilya_guide_1795508241665.jpg',
    guideRole: 'Threshold Ledger Keeper',
    guideOpeningQuote:
      '“My coaching ends at this chalk line, Jacob. Read the three pillars, test which one fails alone, and open Stage I yourself.”',
    narrativeIntro:
      'At the rim between the Threshold Bench and Stage I stand three towering Resonator Pillars over a glass sky. Ilya leans against the doorframe, watching without lifting a pen.',
    demonstrationTip:
      'Inspect all four stone records below, determine which two pillars remain Synchronized, extend the cadence dial, and lock the Multiversal Key.',
    situationBrief:
      'Unite observation, conditional testing, square summation, and sequence extrapolation to open Stage I.',
    contextualGuidance:
      'Solving this capstone awards your first Evolution Point (+1 EP), logs the Threshold Awakening, and opens Stage I: The Foundational Universe.',
    maxHintLevel: 3,
    inspectables: [
      {
        id: 'cap_p1',
        label: 'Resonator Pillar I',
        glyph: 'f = 4',
        categoryTag: 'Pillar Ledger',
        shortPreview: 'Base frequency: 4',
        inspectionDetail: 'Carved frequency: 4. Engraved Clause A: If Pillar I is Synchronized, then Pillar II is also Synchronized.',
      },
      {
        id: 'cap_p2',
        label: 'Resonator Pillar II',
        glyph: 'f = 9',
        categoryTag: 'Pillar Ledger',
        shortPreview: 'Base frequency: 9',
        inspectionDetail: 'Carved frequency: 9. Subject to Clause A linking its synchronization with Pillar I.',
      },
      {
        id: 'cap_p3',
        label: 'Resonator Pillar III',
        glyph: 'f = 11',
        categoryTag: 'Pillar Ledger',
        shortPreview: 'Base frequency: 11',
        inspectionDetail: 'Carved frequency: 11. Engraved Clause B: If Pillar III is Desynchronized, then Pillar I is also Desynchronized.',
      },
      {
        id: 'cap_noise',
        label: 'Nexus Wall Telemetry',
        glyph: '84 lm · 31%',
        categoryTag: 'Hall Sensor',
        shortPreview: 'Luminosity & humidity plate',
        inspectionDetail: 'Wall plate measuring 84 lumens corridor brightness and 31% relative humidity.',
      },
    ],
    diagnosticRules: [
      {
        matchValues: ['202', '81+121', '81 + 121'],
        kind: 'incomplete',
        headline: 'Missing Sequence Term',
        message: 'Check whether you added the 5th term of the stone cadence dial to the squared pillar sum.',
        exploitedPattern: 'ignored_detail',
      },
      {
        matchValues: ['47'],
        kind: 'incomplete',
        headline: 'Sequence Term Only',
        message: 'You entered the sequence term alone—combine it with the Threshold Seed from the Synchronized Pillars.',
        exploitedPattern: 'ignored_detail',
      },
      {
        matchValues: ['144', '184', '218', '265', '245', '269'],
        kind: 'unsupported',
        headline: 'Recheck Pillar Failure Hypothesis',
        message: 'Test each hypothesis ("Suppose Pillar X is the sole desynchronized pillar") against BOTH Clause A and Clause B to check how many pillars would fail.',
        exploitedPattern: 'assumed_untested',
      },
    ],
    validAlternativeDisplayNote: 'Accepts "249", "202 + 47", or "81 + 121 + 47".',
    nextStageTransition:
      'A low chord rolls across all three pillars until crystal skies open beyond the arch. Behind Jacob, Ilya shuts the unsealed ledger with a quiet nod.',
    unlocksChronicleIds: ['chr_tut_first_challenge', 'chr_stage1_gateway'],
    triggersStoryEvent: {
      id: 'story_threshold_awakening',
      title: 'Awakening at the Nexus of Three Resonators',
    },
    puzzle: {
      id: 'tut_6_threshold',
      title: 'The Resonator Synthesis',
      universeId: 'stage_0_threshold',
      regionId: 'nexus_rim',
      stageNumber: 0,
      modeKey: 'tutorial',
      category: 'hybrid',
      difficulty: 'Foundational',
      difficultyScore: 46,
      relevantAttributes: ['analytical', 'pattern_recognition', 'abstract', 'working_memory'],
      interactionType: 'numeric_input',
      objective: 'Identify the two Synchronized Pillars, compute their squared Threshold Seed, and add the 5th term of the cadence dial.',
      instructions: 'Audit the pillar clauses below, verify the 5th cadence term, and enter the Multiversal Key.',
      rules: [
        'Exactly ONE of Pillars {I, II, III} is Desynchronized; the other two are Synchronized.',
        'Both Clause A and Clause B hold strictly.',
        'Threshold Seed = sum of squares of ONLY the Synchronized Pillars’ frequencies.',
      ],
      visualData: {
        sequence: [2, 5, 11, 23, '?'],
        premises: [
          'Condition: Exactly ONE Pillar among {I, II, III} is Desynchronized.',
          'Clause A: If Pillar I is Synchronized, then Pillar II is also Synchronized.',
          'Clause B: If Pillar III is Desynchronized, then Pillar I is also Desynchronized.',
        ],
      },
      promptBody:
        'Three Resonator Pillars guard the gate into Stage I:\n' +
        '• Determine which two Pillars are Synchronized and sum the squares of their base frequencies.\n' +
        '• Add the 5th term of the cadence sequence (2, 5, 11, 23, ?) to obtain the Multiversal Key.',
      narrative: {
        context: 'Stage 0 Capstone · Nexus of Three Resonators',
        intro: 'Beyond Ilya’s doorway, Jacob faces his first synthesis test without coaching wheels.',
        consequences: 'Opening the Resonator Synthesis sealed Jacob’s Threshold trial and unlocked Stage I: The Foundational Universe.',
        storyEventId: 'story_threshold_awakening',
        storyEventTitle: 'Awakening at the Nexus of Three Resonators',
      },
      defaultErrorPattern: 'assumed_untested',
      validSolutions: ['249', '202+47', '202 + 47', '81+121+47', '81 + 121 + 47'],
      explanation:
        'Testing each candidate as the lone failure: if III failed, Clause B forces I to fail too (2 failures); if II failed, Clause A’s contrapositive forces I to fail too (2 failures). Only Pillar I failing leaves exactly 1 failure—making Pillars II (9) and III (11) Synchronized. Their Threshold Seed is 9² + 11² = 202. Meanwhile (2, 5, 11, 23, ?) grows by +3, +6, +12, +24 giving 47. Total = 202 + 47 = 249.',
      postSolvePrompt: {
        question: 'Why could neither Pillar II nor Pillar III fail on its own?',
        patternPrompt: 'What happens to Clause A ("If I sync then II sync") once Pillar I is Desynchronized?',
        takeaway: 'Exhaustive case testing across coupled implications cleanly isolates the unique non-contradictory state.',
      },
      cognitiveTools: {
        decomposition: [
          '1. Separate frequency pillars from hallway telemetry.',
          '2. Test all three failure assignments (only I fails, only II fails, only III fails).',
          '3. Compute Threshold Seed from Synchronized frequencies and extrapolate cadence term 5.',
        ],
        dependencyMapping: ['Clause A and Clause B both implicate Pillar I under different failure assumptions.'],
        anomalyHighlight: 'Test vacuous satisfaction of "If P then Q" when P is false.',
        symbolicTranslation: '(|Desync|=1) & (I -> II) & (~III -> ~I)',
        alternativeHypotheses: ['Verify whether sequence jumps double or grow linearly across all 4 given terms.'],
      },
      hints: {
        1: {
          low: 'Divide the work: first ignore wall humidity/lumens and test each Pillar as the ONE failure; separately trace the step pattern 2, 5, 11, 23, ?.',
          moderate: 'Split the task into 3-case pillar elimination and sequence growth.',
          high: 'Assume Desync(k) for k in {I, II, III} individually and count total failures.',
          transcendent: 'Exhaust 3 failure cases under Clause A & B.',
        },
        2: {
          low: 'Suppose Pillar III failed—what does Clause B force upon Pillar I? Then check what happens to Pillar I via Clause A if Pillar II failed.',
          moderate: 'Test how many pillars end up desynchronized if either II or III fails.',
          high: 'Check contrapositive of Clause A alongside Clause B.',
          transcendent: 'Observe both ~II and ~III drag ~I along.',
        },
        3: {
          low: 'Square ONLY the two Synchronized frequencies, then add the 5th sequence term (notice how each step gap changes from +3 to +6 to +12).',
          moderate: 'Sum squares of the two consistent pillars, then add the extrapolated 5th term.',
          high: 'Combine squared Synchronized subset with geometric-difference step 5.',
          transcendent: 'Verify 3-case uniqueness and add extrapolated cadence.',
        },
      },
      rewards: { xp: 80, ip: 30, kp: 15, ep: 1 },
    },
  },
];

export interface TutorialDiagnosticEvaluation {
  correct: boolean;
  kind: DiagnosticFeedbackKind;
  headline: string;
  message: string;
}

export function evaluateTutorialSubmission(
  stage: TutorialStageSpec,
  rawAnswer: string
): TutorialDiagnosticEvaluation {
  const norm = normalizeAnswer(rawAnswer);
  if (!norm) {
    return {
      correct: false,
      kind: 'incomplete',
      headline: 'No Solution Entered',
      message: 'Inspect the exhibits above and enter or select an answer before submitting.',
    };
  }

  const primaryNorm = normalizeAnswer(stage.puzzle.validSolutions[0]);
  const matchedIdx = stage.puzzle.validSolutions.findIndex((sol) => normalizeAnswer(sol) === norm);
  if (matchedIdx !== -1) {
    const isAlt = matchedIdx > 0 || norm !== primaryNorm;
    return {
      correct: true,
      kind: isAlt ? 'alternative' : 'correct',
      headline: isAlt ? 'Valid Equivalent Expression Verified' : 'Verified Correctly',
      message: isAlt
        ? `Accepted valid expression "${rawAnswer.trim()}": ${stage.puzzle.explanation}`
        : `Exact synthesis verified: ${stage.puzzle.explanation}`,
    };
  }

  if (stage.diagnosticRules) {
    for (const rule of stage.diagnosticRules) {
      if (rule.matchValues.some((v) => normalizeAnswer(v) === norm)) {
        return {
          correct: false,
          kind: rule.kind,
          headline: rule.headline,
          message: rule.message,
        };
      }
    }
  }

  return {
    correct: false,
    kind: 'incorrect',
    headline: 'Does Not Match Stated Rules',
    message:
      'Your candidate conflicts with at least one exhibit or rule. Audit which assumption broke in the reflection panel below.',
  };
}

export const CHRONICLE_SECTIONS: ChronicleSectionDefinition[] = [
  {
    id: 'sec_01_jacob',
    order: 1,
    title: 'The Human Named Jacob',
    subtitle: 'Early curiosity, painful setbacks, personal mastery, and planetary ambition.',
  },
  {
    id: 'sec_02_extinction',
    order: 2,
    title: 'The End of Humanity',
    subtitle: 'Advancement vs stagnation, opposing council voices, and an unsoftened extinction record.',
  },
  {
    id: 'sec_03_old_tub',
    order: 3,
    title: 'The Discovery of the Old TUB',
    subtitle: 'Pre-universal monoliths describing an earlier cosmology’s absolute God.',
  },
  {
    id: 'sec_04_identity',
    order: 4,
    title: 'The Birth of a New Identity',
    subtitle: 'Adopting TUB: The True Ultimate Being explicitly as an inspired new standard.',
  },
  {
    id: 'sec_05_multiverse',
    order: 5,
    title: 'The Multiversal Journey',
    subtitle: 'Realities spanning classical geometry, shifting baselines, and abstract axioms.',
  },
  {
    id: 'sec_06_player',
    order: 6,
    title: 'Jacob at the Threshold',
    subtitle: 'Ilya’s bench, six foundational disciplines, and rebuilding inquiry without tyranny.',
  },
  {
    id: 'sec_07_universes',
    order: 7,
    title: 'Discovered Universes',
    subtitle: 'Cartographic records of thresholds, laws, and cosmic stages traversed.',
  },
  {
    id: 'sec_08_civilizations',
    order: 8,
    title: 'Important Characters and Civilizations',
    subtitle: 'Counselors, Keepers, Guardians, and the silent Vaelori civilization.',
  },
  {
    id: 'sec_09_solved',
    order: 9,
    title: 'Solved Mysteries',
    subtitle: 'Verified answers to historical, physical, and civilizational enigmas.',
  },
  {
    id: 'sec_10_unresolved',
    order: 10,
    title: 'Unresolved Mysteries',
    subtitle: 'Open questions, gaps in evidence, and horizons not yet crossed.',
  },
];

const hasUnlockedIdOrCompletedPrologue = (
  s: { prologueCompleted?: boolean; unlockedChronicleIds?: string[]; completedNodeIds: string[] },
  id: string
) => Boolean(s.unlockedChronicleIds?.includes(id) || s.prologueCompleted || s.completedNodeIds.length > 0);

export const CHRONICLES_ENTRIES: ChronicleEntry[] = [
  // 01. The Human Named Jacob
  {
    id: 'chr_jacob_first_question',
    sectionId: 'sec_01_jacob',
    title: 'The Resonance Viaduct & The First Question',
    status: 'fact',
    summary: 'At seventeen, Jacob exposed an unmodeled harmonic load beneath an "open-and-shut" engineering failure.',
    detail:
      'Preserved meridian dome logs verify Jacob’s earliest habit: refusing convenient surface explanations when empirical measurements contradicted official consensus.',
    sourceLabel: 'Prologue · Scene A',
    isUnlocked: (s) => hasUnlockedIdOrCompletedPrologue(s, 'chr_jacob_first_question'),
  },
  {
    id: 'chr_jacob_origins',
    sectionId: 'sec_01_jacob',
    title: 'Pursuit of Multi-Domain Capability',
    status: 'fact',
    summary: 'Jacob dedicated his mortal life to cultivating reason, memory, adaptability, endurance, and synthesis.',
    detail:
      'Ledger records confirm he possessed no supernatural origin—every domain he mastered grew from systematic discipline across biology, mathematics, and systems engineering.',
    sourceLabel: 'Prologue · Origin Ledger',
    isUnlocked: (s) => hasUnlockedIdOrCompletedPrologue(s, 'chr_jacob_origins'),
  },
  {
    id: 'chr_jacob_setbacks',
    sectionId: 'sec_01_jacob',
    title: 'Measured Failures Along the Ascent',
    status: 'discovered',
    summary: 'Surviving lab journals document flawed theorems, neural overload, and broken social models before breakthroughs held.',
    detail:
      'Jacob’s early memory-lattice experiments collapsed repeatedly. Each setback exposed blind spots where confidence outran verification.',
    sourceLabel: 'Prologue · Scene B',
    isUnlocked: (s) => hasUnlockedIdOrCompletedPrologue(s, 'chr_jacob_setbacks'),
  },
  {
    id: 'chr_jacob_greater_ambition',
    sectionId: 'sec_01_jacob',
    title: 'Expanding Ambition to All Humanity',
    status: 'fact',
    summary: 'Believing shared capability would cure cruelty, Jacob opened his synthesis blueprints to elevate civilization.',
    detail:
      'His Dawn of Synthesis reforms fueled stellar engineering, medical renewal, and open education across core worlds—though assuming intellect alone secures wisdom proved incomplete.',
    sourceLabel: 'Prologue · Scene C',
    isUnlocked: (s) => hasUnlockedIdOrCompletedPrologue(s, 'chr_jacob_greater_ambition'),
  },
  {
    id: 'chr_humanity_expansion',
    sectionId: 'sec_01_jacob',
    title: 'Galactic Expansion & Diverse Civilizations',
    status: 'fact',
    summary: 'Across millennia, humanity bridged galaxies through Dyson compacts, open academies, and orbital orchards.',
    detail:
      'Census records across four galaxies attest to extraordinary human ingenuity, cooperation, and cultural variety alongside sharpening rivalries.',
    sourceLabel: 'Chapter 1 · Census III',
    isUnlocked: (s) => hasUnlockedIdOrCompletedPrologue(s, 'chr_humanity_expansion'),
  },
  {
    id: 'chr_human_cycles',
    sectionId: 'sec_01_jacob',
    title: 'The Recursive Trap of Cyclic War',
    status: 'fact',
    summary: 'Civilizations expanded, fractured, fought galactic wars, collapsed, rebuilt—and fought again with sharper tools.',
    detail:
      'Longitudinal timelines show technical mastery advancing exponentially while fear and dominance habits stayed fixed.',
    sourceLabel: 'Chapter 1 · Stellar Chronology',
    isUnlocked: (s) => hasUnlockedIdOrCompletedPrologue(s, 'chr_human_cycles'),
  },

  // 02. The End of Humanity
  {
    id: 'chr_extinction_contradiction',
    sectionId: 'sec_02_extinction',
    title: 'The Paradox Inside Jacob’s Logic',
    status: 'theory',
    summary: 'Council transcripts preserve the clash between Jacob’s despair and Soren Kael’s charge of unilateral tyranny.',
    detail:
      'Tribunal readers note a stark contradiction: Jacob condemned humanity for wielding unchecked force, yet exercised unchecked force over every living future.',
    sourceLabel: 'Chapter 2 · Ethics Tribunal',
    isUnlocked: (s) => hasUnlockedIdOrCompletedPrologue(s, 'chr_extinction_contradiction'),
  },
  {
    id: 'chr_extinction_act',
    sectionId: 'sec_02_extinction',
    title: 'The Extinction Event',
    status: 'fact',
    summary: 'Jacob halted human consciousness across his native universe—leaving lit kitchens and an unanswering sky.',
    detail:
      'No consensus or mourning witness remained afterward. Ending war by erasing living choice produced stillness without reconciliation.',
    sourceLabel: 'Chapter 2 · Terminal Era',
    isUnlocked: (s) => hasUnlockedIdOrCompletedPrologue(s, 'chr_extinction_act'),
  },
  {
    id: 'chr_extinction_archive_record',
    sectionId: 'sec_02_extinction',
    title: 'Decree Ω-0 (Extinguished Universe Ledger)',
    status: 'discovered',
    summary: 'Primary historical record confirming zero consent, zero survivors, and Jacob’s cold departure afterward.',
    detail:
      'Book Marginalia attached to Decree Ω-0 highlights that neither triumph nor forgiveness greeted the act—only cosmic stillness.',
    sourceLabel: 'Chapter 2 · Primary Record',
    isUnlocked: (s) => hasUnlockedIdOrCompletedPrologue(s, 'chr_extinction_archive_record'),
  },

  // 03. The Discovery of the Old TUB
  {
    id: 'chr_old_tub_legend',
    sectionId: 'sec_03_old_tub',
    title: 'Monoliths of the Old TUB',
    status: 'discovered',
    summary: 'Beyond his dead universe, Jacob uncovered pre-dimensional tablets revering an elder cosmos’s absolute God.',
    detail:
      'Written before the physical laws of Jacob’s origin universe coalesced, these records describe the Old TUB as a primordial sovereign distinct from Jacob.',
    sourceLabel: 'Chapter 3 · Outer Membrane',
    isUnlocked: (s) => hasUnlockedIdOrCompletedPrologue(s, 'chr_old_tub_legend'),
  },

  // 04. The Birth of a New Identity
  {
    id: 'chr_birth_of_tub',
    sectionId: 'sec_04_identity',
    title: 'TUB: The True Ultimate Being (A New Standard)',
    status: 'fact',
    summary: 'Rejecting any claim to deity, Jacob adopted "TUB" as an unforgiving standard of continuous growth.',
    detail:
      'Leaving his old status beside his empty universe, Jacob redefined TUB into a perpetual apprenticeship across incompatible laws.',
    sourceLabel: 'Chapter 3 · Identity Vow',
    isUnlocked: (s) => hasUnlockedIdOrCompletedPrologue(s, 'chr_birth_of_tub'),
  },

  // 05. The Multiversal Journey
  {
    id: 'chr_mv_familiar',
    sectionId: 'sec_05_multiverse',
    title: 'Universe 1 · The Familiar Reality',
    status: 'discovered',
    summary: 'A foundational cosmos ruled by classical geometry, stable invariants, and transparent arithmetic.',
    detail:
      'In this first outer domain, disciplined measurement remains legible—testing whether foundational rigor holds cleanly.',
    sourceLabel: 'Chapter 4 · Survey I',
    isUnlocked: (s) => hasUnlockedIdOrCompletedPrologue(s, 'chr_mv_familiar'),
  },
  {
    id: 'chr_mv_unfamiliar',
    sectionId: 'sec_05_multiverse',
    title: 'Universe 2 · The Unfamiliar Foundation',
    status: 'discovered',
    summary: 'Shifting constants and resonant-memory vaults force Jacob to rebuild observation from raw baselines.',
    detail:
      'Where physical baselines fluctuate across frames, unexamined habit breaks immediately.',
    sourceLabel: 'Chapter 4 · Survey II',
    isUnlocked: (s) => hasUnlockedIdOrCompletedPrologue(s, 'chr_mv_unfamiliar'),
  },
  {
    id: 'chr_mv_contradictory',
    sectionId: 'sec_05_multiverse',
    title: 'Universe 3 · The Contradictory World',
    status: 'discovered',
    summary: 'Realities governed by paraconsistent rules where classical assumptions fail unless boundaries shift.',
    detail:
      'Claims true in one context fail in another—requiring explicit axiom tracking.',
    sourceLabel: 'Chapter 4 · Survey III',
    isUnlocked: (s) => hasUnlockedIdOrCompletedPrologue(s, 'chr_mv_contradictory'),
  },
  {
    id: 'chr_mv_abstract',
    sectionId: 'sec_05_multiverse',
    title: 'Universe 4 · The Abstract Expanse',
    status: 'discovered',
    summary: 'Domains composed of relational graphs, self-referential axioms, and conceptual structures beyond matter.',
    detail:
      'Here spatial habit yields to structural topology and recursive definition.',
    sourceLabel: 'Chapter 4 · Survey IV',
    isUnlocked: (s) => hasUnlockedIdOrCompletedPrologue(s, 'chr_mv_abstract'),
  },
  {
    id: 'chr_multiverse_horizon',
    sectionId: 'sec_05_multiverse',
    title: 'Passage Across Incompatible Realities',
    status: 'fact',
    summary: 'Crossing incompatible thresholds requires dropping prior certainty whenever foundations mutate.',
    detail:
      'No single cosmos’s rules travel intact everywhere; only disciplined self-audit adapts.',
    sourceLabel: 'Chapter 4 · Horizon Notes',
    isUnlocked: (s) => hasUnlockedIdOrCompletedPrologue(s, 'chr_multiverse_horizon'),
  },
  {
    id: 'chr_central_question',
    sectionId: 'sec_05_multiverse',
    title: 'The Thesis Engraved at the Verge',
    status: 'fact',
    summary: '“How far can an existence go when it continually seeks to surpass its own limitations?”',
    detail:
      'This question anchors Jacob’s Book—framing mastery as relentless confrontation with problems one’s present habits cannot yet solve.',
    sourceLabel: 'Chapter 4 · Verge Pillar',
    isUnlocked: (s) => hasUnlockedIdOrCompletedPrologue(s, 'chr_central_question'),
  },

  // 06. Jacob at the Threshold
  {
    id: 'chr_player_awakening',
    sectionId: 'sec_06_player',
    title: 'Trial 1 · Observation Over Static',
    status: 'fact',
    summary: 'At Ilya’s bench, Jacob separated true beacon frequencies (17 Hz) from corridor pipe telemetry.',
    detail:
      'Inspecting individual corridor gauges grounded Jacob’s first Threshold rule: check what an instrument measures before trusting its number.',
    sourceLabel: 'Trial 1 · Observation',
    isUnlocked: (s) =>
      Boolean(
        s.unlockedChronicleIds?.includes('chr_player_awakening') ||
          s.completedTutorialStageNumbers?.includes(1) ||
          s.tutorialCompleted ||
          s.completedNodeIds.length > 0
      ),
  },
  {
    id: 'chr_tut_pattern_insight',
    sectionId: 'sec_06_player',
    title: 'Trial 2 · Pattern Recognition & Projection',
    status: 'fact',
    summary: 'Aligning both astrolabe dials mapped doubling step differences alongside closed-form recursion.',
    detail:
      'Verifying across every consecutive gap prevented extrapolating falsely from a single interval.',
    sourceLabel: 'Trial 2 · Pattern Recognition',
    isUnlocked: (s) =>
      Boolean(
        s.unlockedChronicleIds?.includes('chr_tut_pattern_insight') ||
          s.completedTutorialStageNumbers?.includes(2) ||
          s.tutorialCompleted ||
          s.completedNodeIds.length > 0
      ),
  },
  {
    id: 'chr_tut_logic_lesson',
    sectionId: 'sec_06_player',
    title: 'Trial 3 · Deduction Without Assumption',
    status: 'fact',
    summary: 'Jacob opened Amber Plinth strictly from chiseled premises without inventing rules about unlit lamps.',
    detail:
      'Deductive rigor ruled out Cobalt and Violet by contraposition before opening the IP ledger for attribute study.',
    sourceLabel: 'Trial 3 · Deductive Reasoning',
    isUnlocked: (s) =>
      Boolean(
        s.unlockedChronicleIds?.includes('chr_tut_logic_lesson') ||
          s.completedTutorialStageNumbers?.includes(3) ||
          s.tutorialCompleted ||
          s.completedNodeIds.length > 0
      ),
  },
  {
    id: 'chr_tut_hypothesis_habit',
    sectionId: 'sec_06_player',
    title: 'Trial 4 · Falsifying Rival Hypotheses',
    status: 'fact',
    summary: 'Controlling shared constants across Logs A and B eliminated three broken stories, leaving Red-Shift Starlight.',
    detail:
      'Disproving H1, H2, and H4 proved why fitting one shift record never justifies halting further checks.',
    sourceLabel: 'Trial 4 · Alternative Hypotheses',
    isUnlocked: (s) =>
      Boolean(
        s.unlockedChronicleIds?.includes('chr_tut_hypothesis_habit') ||
          s.completedTutorialStageNumbers?.includes(4) ||
          s.tutorialCompleted ||
          s.completedNodeIds.length > 0
      ),
  },
  {
    id: 'chr_tut_verge_gate',
    sectionId: 'sec_06_player',
    title: 'Trial 5 · Sequencing Multi-Step Execution',
    status: 'fact',
    summary: 'Ordering the Verge Gate’s four steps sequentially protected checkpoint arithmetic and prime factoring.',
    detail:
      'Explicit checkpoints prevented order-of-operations slips before multiplying and summing distinct primes.',
    sourceLabel: 'Trial 5 · Multi-Step Reasoning',
    isUnlocked: (s) =>
      Boolean(
        s.unlockedChronicleIds?.includes('chr_tut_verge_gate') ||
          s.completedTutorialStageNumbers?.includes(5) ||
          s.tutorialCompleted ||
          s.completedNodeIds.length > 0
      ),
  },
  {
    id: 'chr_tut_first_challenge',
    sectionId: 'sec_06_player',
    title: 'Trial 6 · Nexus of Three Resonators',
    status: 'fact',
    summary: 'Solving the Resonator Synthesis unassisted earned Jacob’s first Evolution Point and opened Stage I.',
    detail:
      'Uniting observation, exhaustive case checks, square sums, and sequence extrapolation opened the gate into the Foundational Universe.',
    sourceLabel: 'Trial 6 · Threshold Capstone',
    isUnlocked: (s) =>
      Boolean(
        s.unlockedChronicleIds?.includes('chr_tut_first_challenge') ||
          s.completedTutorialStageNumbers?.includes(6) ||
          s.tutorialCompleted ||
          s.completedNodeIds.length > 0
      ),
  },

  // 07. Discovered Universes
  {
    id: 'chr_univ_threshold',
    sectionId: 'sec_07_universes',
    title: 'Stage 0 · Ilya’s Threshold Bench',
    status: 'discovered',
    summary: 'An interstitial sanctuary of slate benches and brass astrolabes hovering outside ordinary timelines.',
    detail:
      'Here Ilya demands verifiable reasoning before opening passage into Stage I.',
    sourceLabel: 'Multiverse Survey · Stage 0',
    isUnlocked: (s) =>
      Boolean(
        s.unlockedChronicleIds?.includes('chr_univ_threshold') ||
          s.completedTutorialStageNumbers?.includes(1) ||
          s.tutorialCompleted ||
          s.completedNodeIds.length > 0
      ),
  },
  {
    id: 'chr_stage1_gateway',
    sectionId: 'sec_07_universes',
    title: 'Stage I · The Foundational Universe',
    status: 'discovered',
    summary: 'A crystal-sky cosmos governed by classical physical invariants, arithmetic cadence, and geometric order.',
    detail:
      'Home to the Axiom Spire and Lattice Vault, Stage I anchors reality on conservation laws—culminating in its guardian, the Axiom Sentinel.',
    sourceLabel: 'Multiverse Survey · Stage I',
    isUnlocked: (s) =>
      Boolean(
        s.tutorialCompleted ||
          s.unlockedChronicleIds?.includes('chr_stage1_gateway') ||
          s.completedNodeIds.length > 0
      ),
  },
  {
    id: 'chr_stage2_vaelori_realm',
    sectionId: 'sec_07_universes',
    title: 'Stage II · Shifting Realities & Vaelori Ruins',
    status: 'discovered',
    summary: 'A fractured reality where path rules mutate mid-journey and Vaelori harmonic vaults stand silent.',
    detail:
      'Reaching Stage II exposes Jacob to stateful paths, conflicting records, and the vanished Vaelori Choir.',
    sourceLabel: 'Multiverse Survey · Stage II',
    isUnlocked: (s) => s.unlockedStage >= 2,
  },
  {
    id: 'chr_stage3_beyond',
    sectionId: 'sec_07_universes',
    title: 'Stages III–VI · Paradox, Higher Geometry & Origin Threshold',
    status: 'discovered',
    summary: 'High-abstraction strata where bivalent intuition yields to modal frames and self-referential axioms.',
    detail:
      'Crossing Stage III and deeper realms strips away everyday intuition—leaving pure relational architecture.',
    sourceLabel: 'Multiverse Survey · Deep Strata',
    isUnlocked: (s) => s.unlockedStage >= 3,
  },

  // 08. Important Characters and Civilizations
  {
    id: 'chr_char_human_voices',
    sectionId: 'sec_08_civilizations',
    title: 'Vance, Reyes, Mara Solis & Soren Kael',
    status: 'discovered',
    summary: 'Mortal mentors and critics who shaped, challenged, and confronted Jacob across his native universe.',
    detail:
      'Archon Mara Solis argued for patient human renewal, while Councilor Soren Kael stood against Decree Ω-0—proving wise opposition persisted even in humanity’s darkest hour.',
    sourceLabel: 'Chapters 0–2 · Biographical Ledger',
    isUnlocked: (s) => hasUnlockedIdOrCompletedPrologue(s, 'chr_extinction_contradiction'),
  },
  {
    id: 'chr_char_axiom_sentinel',
    sectionId: 'sec_08_civilizations',
    title: 'The Axiom Sentinel (Stage I Guardian)',
    status: 'discovered',
    summary: 'An immutable construct policing conservation, boundary symmetry, and mathematical rigor.',
    detail:
      'The Sentinel refuses passage to guesswork—testing whether Jacob’s reasoning survives paired geometric and numeric invariants.',
    sourceLabel: 'Stage I Boss Record',
    isUnlocked: (s) => s.defeatedBossIds.includes('boss_axiom_sentinel'),
  },
  {
    id: 'chr_civ_vaelori',
    sectionId: 'sec_08_civilizations',
    title: 'The Vaelori Civilization',
    status: 'discovered',
    summary: 'An extinct resonant-memory civilization in Stage II whose triadic tablets outlived its builders.',
    detail:
      'Unlike Meridian’s militarized centuries, the Vaelori encoded civic memory into acoustic stone. Their disappearance left contradictory slabs requiring cross-verification.',
    sourceLabel: 'Stage II · Vaelori Fragments',
    isUnlocked: (s) =>
      s.unlockedStage >= 2 ||
      s.discoveredItemIds.some((id) => id.includes('vaelori')) ||
      s.unlockedStoryEvents.includes('story_vaelori_mystery_solved'),
  },

  // 09. Solved Mysteries
  {
    id: 'chr_solved_axiom_gate',
    sectionId: 'sec_09_solved',
    title: 'Resolution of the Foundational Spire',
    status: 'fact',
    summary: 'The Axiom Sentinel’s dual-phase boundary lock reconciled cleanly, opening transit into Fractured Realities.',
    detail:
      'Preserving invariants across shifting recurrences and spatial symmetries opened passage beyond Stage I.',
    sourceLabel: 'Stage I · Verified Solution',
    isUnlocked: (s) => s.defeatedBossIds.includes('boss_axiom_sentinel'),
  },
  {
    id: 'chr_solved_vaelori_verdict',
    sectionId: 'sec_09_solved',
    title: 'The True Cause of the Vaelori Silence',
    status: 'fact',
    summary: 'Cross-referencing Vaelori slabs refuted foreign conquest and uncovered an internal engineering resonance failure.',
    detail:
      'Chronological discrepancies across unified tablets exposed forged blame narratives—revealing an unforced pendulum resonance error rather than siege.',
    sourceLabel: 'Stage II · Story Event Verdict',
    isUnlocked: (s) => s.unlockedStoryEvents.includes('story_vaelori_mystery_solved'),
  },

  // 10. Unresolved Mysteries
  {
    id: 'chr_unresolved_old_tub',
    sectionId: 'sec_10_unresolved',
    title: 'What Ended the Old TUB’s Cosmology?',
    status: 'unresolved',
    summary: 'No surviving monument explains how an elder cosmos ended—or why traces of its name endure.',
    detail:
      'Even deeper inter-universal surveys yield only weathered fragments mentioning the Old TUB.',
    sourceLabel: 'Chapter 3 · Open Inquiry',
    isUnlocked: (s) => hasUnlockedIdOrCompletedPrologue(s, 'chr_unresolved_old_tub'),
  },
  {
    id: 'chr_unresolved_jacob_whereabouts',
    sectionId: 'sec_10_unresolved',
    title: 'What Awaits Beyond Stage VI?',
    status: 'unresolved',
    summary: 'No map records what lies past the Convergence Nexus once every foundational bias has been stripped away.',
    detail:
      'Jacob continues onward across the six canonical strata—every gate testing whether discipline outlasts certainty.',
    sourceLabel: 'Part II · Open Horizon',
    isUnlocked: (s) =>
      Boolean(s.tutorialCompleted || s.completedNodeIds.length > 0 || s.unlockedStage >= 2),
  },
  {
    id: 'chr_theory_player_divergence',
    sectionId: 'sec_10_unresolved',
    title: 'Hypothesis: Can Rigor Outlast Hubris?',
    status: 'theory',
    summary: 'Ilya’s working note warns that power without self-audit repeats Meridian’s catastrophe at higher scale.',
    detail:
      'Honest error logging, calibrated doubt, and willingness to falsify one’s own assumptions separate growth from tyranny.',
    sourceLabel: 'Book Synthesis · Hypothesis',
    isUnlocked: (s) => s.unlockedStage >= 2 || (s.attributes.metacognition?.level ?? 1) >= 2,
  },
];

export const TUTORIAL_PUZZLES_MAP = Object.fromEntries(
  TUTORIAL_STAGES.map((stage) => [stage.puzzle.id, stage.puzzle])
);
