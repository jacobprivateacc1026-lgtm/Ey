export type PuzzleCategory =
  | 'mathematical'
  | 'formal_logic'
  | 'pattern'
  | 'spatial'
  | 'scientific'
  | 'linguistic'
  | 'strategic'
  | 'philosophical'
  | 'hybrid';

export type PrimaryAttributeId =
  | 'analytical'
  | 'abstract'
  | 'working_memory'
  | 'pattern_recognition'
  | 'spatial'
  | 'linguistic'
  | 'creative'
  | 'metacognition'
  | 'processing_efficiency';

export type SecondaryAttributeId =
  | 'knowledge'
  | 'adaptability'
  | 'cognitive_endurance'
  | 'insight'
  | 'perceptual_awareness'
  | 'systems_thinking';

export type HintLevel = 0 | 1 | 2 | 3;

export type IntelligenceTier = 'low' | 'moderate' | 'high' | 'transcendent';

export type DifficultyBand =
  | 'Foundational'
  | 'Intermediate'
  | 'Advanced'
  | 'Expert'
  | 'Extremely Advanced'
  | 'Endgame';

export type GameModeKey =
  | 'prologue'
  | 'tutorial'
  | 'stage_1'
  | 'stage_2'
  | 'stage_3'
  | 'stage_4'
  | 'stage_5'
  | 'stage_6'
  | 'boss'
  | 'procedural';

export type ConfidenceTag = 'sure' | 'think_so' | 'guessing';

export type ErrorPatternId =
  | 'assumed_untested'
  | 'ignored_detail'
  | 'unreliable_source'
  | 'obvious_reading'
  | 'ignored_opponent'
  | 'guessed';

export interface ErrorPatternMeta {
  id: ErrorPatternId;
  label: string;
  shortLabel: string;
  description: string;
}

export type PuzzleInteractionType =
  | 'numeric_input'
  | 'text_input'
  | 'multiple_choice'
  | 'spatial_grid'
  | 'multi_select'
  | 'rubric_synthesis';

export interface SpatialCell {
  row: number;
  col: number;
  active: boolean;
  symbol?: string;
}

export interface SpatialGridConfig {
  size: number;
  targetPattern: number[][];
  initialGrid: number[][];
  ruleSummary: string;
  allowRotation?: boolean;
}

export interface RubricCriterion {
  id: string;
  label: string;
  keywords: string[];
  weight: number;
}

export interface HintTierVariants {
  low: string;
  moderate: string;
  high: string;
  transcendent: string;
}

export interface PuzzleQualityReport {
  isValid: boolean;
  signature: string;
  estimatedDifficulty: number;
  checks: {
    hasObjective: boolean;
    hasConsistentRules: boolean;
    solutionVerified: boolean;
    hintsConsistent: boolean;
    noDuplicateSignature: boolean;
  };
  errors: string[];
}

export interface NarrativeClue {
  id: string;
  title: string;
  source: string;
  body: string;
}

export interface InspectableSceneItem {
  id: string;
  label: string;
  locationNote: string;
  observation: string;
  /** Non-leading category label (e.g. "Hardware", "Inscription", "Record") */
  kindTag: string;
}

export interface DocumentExhibit {
  id: string;
  title: string;
  source: string;
  reliabilityNote: string;
  excerpt: string;
}

export interface PostSolveReflectionSpec {
  question: string;
  patternPrompt: string;
  takeaway: string;
}

export interface PuzzleNarrative {
  context: string;
  intro: string;
  investigationClues?: NarrativeClue[];
  consequences: string;
  storyEventId?: string;
  storyEventTitle?: string;
  linkedArchiveIds?: string[];
  linkedDiscoveryIds?: string[];
}

export type WorkspaceMode =
  | 'war_table'
  | 'tactical_shift'
  | 'commit_plan'
  | 'cat_mouse'
  | 'social_reading'
  | 'rule_shift';

export type SceneCompositionMode =
  | 'cinematic'
  | 'confrontation'
  | 'broadsheet'
  | 'investigation';

export type StrictVerdict =
  | 'Accepted'
  | 'Not yet (weakness found)'
  | 'Rejected (incorrect)';

export interface StrictRubricCriterionSpec {
  id: string;
  label: string;
  stems: string[];
  requiredPolarity: 'affirm' | 'negate' | 'any';
  negatedStems?: string[];
  missingHint: string;
  minClauseWords?: number;
}

export interface StrictRubricSpec {
  criteria: StrictRubricCriterionSpec[];
  forbiddenClaims: { pattern: string; reason: string }[];
  contradictionPairs?: {
    affirmPattern: string;
    negatePattern: string;
    reason: string;
  }[];
  softFlaws?: { pattern: string; reason: string }[];
  causalBridgeGroups?: string[][];
  weakBridgeReason?: string;
}

export interface WorkspaceMetadata {
  mode: WorkspaceMode;
  headline: string;
  leftColumnTitle?: string;
  leftItems?: string[];
  rightColumnTitle?: string;
  rightItems?: string[];
  rows?: { label: string; primary: string; secondary: string; note?: string }[];
  tacticalNote?: string;
}

export interface PuzzleOption {
  id: string;
  label: string;
  detail?: string;
  exploitedPattern?: ErrorPatternId;
}

export interface PuzzleSpec {
  id: string;
  title: string;
  universeId: string;
  regionId: string;
  stageNumber: number;
  modeKey?: GameModeKey;
  category: PuzzleCategory;
  difficulty: DifficultyBand;
  difficultyScore: number; // 1 - 100
  relevantAttributes: PrimaryAttributeId[];
  interactionType: PuzzleInteractionType;
  objective: string;
  instructions: string;
  rules: string[];
  promptBody: string;
  sceneObjects?: InspectableSceneItem[];
  documents?: DocumentExhibit[];
  narrative?: PuzzleNarrative;
  visualData?: {
    sequence?: (number | string)[];
    matrix?: (number | string)[][];
    premises?: string[];
    equations?: string[];
    spatialGrid?: SpatialGridConfig;
    diagramNodes?: { id: string; label: string; value?: string }[];
    diagramEdges?: { from: string; to: string; relation: string }[];
  };
  workspaceMode?: WorkspaceMode;
  workspaceData?: WorkspaceMetadata;
  options?: PuzzleOption[];
  validSolutions: string[]; // normalized strings or JSON serialized states
  multipleSolutionsNote?: string;
  rubricCriteria?: RubricCriterion[];
  strictRubricSpec?: StrictRubricSpec;
  explanation: string;
  postSolvePrompt?: PostSolveReflectionSpec;
  defaultErrorPattern?: ErrorPatternId;
  // Ability-unlocked interactive analytical scaffolding (never auto-solves or leaks answers)
  cognitiveTools: {
    decomposition: string[];
    dependencyMapping: string[];
    anomalyHighlight: string;
    symbolicTranslation: string;
    alternativeHypotheses: string[];
  };
  /** Strictly capped at 3 non-revealing character-delivered hint tiers */
  hints: Record<1 | 2 | 3, HintTierVariants>;
  hintSpeakers?: Partial<Record<1 | 2 | 3, string>>;
  rewards: {
    xp: number;
    ip: number;
    kp: number;
    ep?: number;
  };
  isProcedural?: boolean;
  seed?: number;
  qualityReport?: PuzzleQualityReport;
}

export interface BossPhase {
  phaseNumber: number;
  title: string;
  narrativeShift: string;
  newConstraint: string;
  puzzle: PuzzleSpec;
}

export interface BossEncounter {
  id: string;
  name: string;
  epithet: string;
  stageNumber: number;
  universeId: string;
  description: string;
  imagePath?: string;
  testedAttributes: PrimaryAttributeId[];
  phases: BossPhase[];
  rewards: {
    xp: number;
    ip: number;
    kp: number;
    ep: number;
    unlocksArchiveId?: string;
  };
}

export interface DiscoveryItem {
  id: string;
  title: string;
  type: 'inscription' | 'chamber' | 'artifact' | 'civilization_fragment';
  summary: string;
  detail: string;
  kpReward: number;
  ipReward: number;
  archiveUnlockId?: string;
}

export interface UniverseRegion {
  id: string;
  name: string;
  atmosphere: string;
  mechanicalRule: string;
  nodeIds: string[];
  discoveries: DiscoveryItem[];
  bossId?: string;
}

export interface UniverseNode {
  id: string;
  title: string;
  subtitle: string;
  stageNumber: number;
  regionId: string;
  kind: 'puzzle' | 'environmental' | 'boss' | 'procedural_rift';
  puzzleId?: string;
  bossId?: string;
  proceduralCategory?: PuzzleCategory;
  prerequisiteNodeIds: string[];
  position: { x: number; y: number }; // 0-100 percentage coords on map
}

export interface UniverseStage {
  stageNumber: number;
  id: string;
  name: string;
  difficultyLabel: DifficultyBand;
  themes: string[];
  physicalLaws: string;
  logicalFoundation: string;
  civilizationProfile: string;
  description: string;
  accentColor: 'cyan' | 'violet' | 'gold';
  bannerImage?: string;
  regions: UniverseRegion[];
  nodes: UniverseNode[];
}

export interface PrimaryAttributeState {
  id: PrimaryAttributeId;
  level: number;
  xp: number;
}

export interface CognitiveAbilityDefinition {
  id: string;
  name: string;
  primaryAttribute: PrimaryAttributeId;
  secondaryRequirements?: Partial<Record<PrimaryAttributeId, number>>;
  minAttributeLevel: number;
  maxRank: number;
  costPerRankIP: number;
  epRequired?: number;
  summary: string;
  inPuzzleEffect: string;
  surfaceName?: string;
  toolKey?:
    | keyof PuzzleSpec['cognitiveTools']
    | 'logical_verification'
    | 'mental_workspace'
    | 'confidence_calibration'
    | 'error_detection';
}

export interface KnowledgeEntry {
  id: string;
  title: string;
  domain:
    | 'Mathematics'
    | 'Logic'
    | 'Physics & Systems'
    | 'Civilizations'
    | 'Philosophy'
    | 'Metacognition';
  stageFound: number;
  costKP: number;
  summary: string;
  content: string;
  keyInsight: string;
}

export type QuestCategory =
  | 'Main'
  | 'Cognitive'
  | 'Exploration'
  | 'Research'
  | 'Challenge'
  | 'Hidden';

export interface QuestDefinition {
  id: string;
  title: string;
  category: QuestCategory;
  description: string;
  objectiveType:
    | 'solve_count'
    | 'solve_stage'
    | 'upgrade_attribute'
    | 'discover_count'
    | 'unlock_archive_count'
    | 'no_hint_solve'
    | 'boss_defeat'
    | 'unlock_ability'
    | 'story_event';
  targetValue: number;
  targetMeta?: string;
  rewards: {
    xp: number;
    ip: number;
    kp: number;
    ep?: number;
  };
}

export interface PerformanceRecord {
  timestamp: number;
  puzzleId: string;
  category: PuzzleCategory;
  difficultyScore: number;
  solved: boolean;
  attempts: number;
  hintsUsed: number;
  maxHintLevel: number;
  timeSeconds: number;
  efficiencyScore: number; // 0 - 100
  confidenceRated?: number; // 0 - 100
  confidenceTag?: ConfidenceTag;
}

export interface ErrorJournalEntry {
  id: string;
  timestamp: number;
  puzzleId: string;
  puzzleTitle: string;
  modeKey: GameModeKey;
  submittedAnswer: string;
  confidence?: ConfidenceTag;
  selectedPattern: ErrorPatternId;
  actualPattern: ErrorPatternId;
  diagnosisMatched: boolean;
  reflectionText: string;
  clarityDelta: number;
  evidenceCited?: string;
}

export interface ConfidenceStats {
  sureTotal: number;
  sureCorrect: number;
  thinkSoTotal: number;
  thinkSoCorrect: number;
  guessingTotal: number;
  guessingCorrect: number;
}

export interface EvidencePin {
  id: string;
  sourceId: string;
  label: string;
  excerpt: string;
}

export type EvidenceRelation = 'supports' | 'contradicts' | 'tests';

export interface EvidenceLink {
  id: string;
  fromPinId: string;
  toPinId: string;
  relation: EvidenceRelation;
  note?: string;
}

export interface EvidenceBoardState {
  puzzleId: string;
  pins: EvidencePin[];
  links: EvidenceLink[];
  hypothesisDraft: string;
}

export type MarginStance = 'trusted' | 'doubtful';

export interface BookMarginNote {
  claimId: string;
  stance: MarginStance;
  note?: string;
  markedAt: number;
}

export type BookTextSize = 'sm' | 'base' | 'lg';

export interface OpponentMemoryState {
  opponentResponses: Record<string, number>;
  patternCounts: Partial<Record<ErrorPatternId, number>>;
  overconfidentMisses: number;
  totalMisses: number;
  cleanFirstTrySolves: number;
  lastMissPuzzleTitle?: string;
  lastMissPattern?: ErrorPatternId;
}

export interface PlanDecisionEntry {
  id: string;
  puzzleId: string;
  puzzleTitle: string;
  timestamp: number;
  submittedPlan: string;
  outcome: 'passed' | 'revised';
  lessonNote?: string;
}

export interface SecondOrderReflectionEntry {
  puzzleId: string;
  puzzleTitle: string;
  timestamp: number;
  whyItWorks: string;
  patternToWatch: string;
}

export interface ReflectiveProfile {
  summaryLine: string;
  strengths: string[];
  blindSpots: string[];
  calibrationLabel: string;
  overconfidenceRatePct: number;
  dominantPattern: ErrorPatternMeta | null;
  characterObservation: string;
}

export interface SaveSettings {
  audioEnabled: boolean;
  ambientMusicEnabled: boolean;
  adaptiveDifficultyEnabled: boolean;
  freeHintCooldownMinutes: number;
  showConfidenceCalibration: boolean;
}

export interface GameSaveState {
  version: number;
  startedAt: number;
  lastSavedAt: number;
  tubLevel: number;
  xp: number;
  ip: number;
  kp: number;
  ep: number;
  clarity: number;
  clarityMax: number;
  transcendenceRank: number;
  attributes: Record<PrimaryAttributeId, PrimaryAttributeState>;
  abilities: Record<string, number>; // abilityId -> rank
  unlockedStage: number;
  completedNodeIds: string[];
  defeatedBossIds: string[];
  bossPhaseProgress: Record<string, number>;
  discoveredItemIds: string[];
  /** Retained for save compatibility; mirrors unlockedBookIds */
  unlockedArchiveIds: string[];
  unlockedBookIds: string[];
  unlockedStoryEvents: string[];
  completedQuestIds: string[];
  puzzleNotes: Record<string, string>;
  mistakePatterns: Record<string, number>;
  freeHintLastUsedAt: number;
  adaptiveDifficultyOffset: number; // -15 to +25
  performanceHistory: PerformanceRecord[];
  activeUniverseStage: number;
  settings: SaveSettings;
  proceduralSolvedCount: number;
  prologueCompleted: boolean;
  prologueBeatIndex: number;
  tutorialCompleted: boolean;
  tutorialStageIndex: number;
  completedTutorialStageNumbers: number[];
  unlockedChronicleIds: string[];
  completedStoryEncounterIds?: string[];
  errorJournal: ErrorJournalEntry[];
  confidenceStats: ConfidenceStats;
  bookBookmarks: string[];
  bookMarginNotes: Record<string, BookMarginNote>;
  bookTextSize: BookTextSize;
  chapterRatings: Record<string, number>;
  bookInlineChoices: Record<string, string>;
  evidenceBoards: Record<string, EvidenceBoardState>;
  opponentMemory: OpponentMemoryState;
  secondOrderReflections: Record<string, SecondOrderReflectionEntry>;
  planDecisions: PlanDecisionEntry[];
}

export type PrologueChapterId =
  | 'prologue_jacob'
  | 'chapter_1_humanity'
  | 'chapter_2_decision'
  | 'chapter_3_beyond'
  | 'chapter_4_multiverse'
  | 'part_2_threshold';

export interface PrologueDialogueLine {
  speaker: string;
  role?: string;
  portraitKey?: string;
  stageDirection?: string;
  line: string;
}

export interface PrologueInteractiveChoice {
  id: string;
  label: string;
  response: string;
}

export interface PrologueBeat {
  id: string;
  chapterId: PrologueChapterId;
  chapterTag: string;
  chapterTitle: string;
  title: string;
  subtitle?: string;
  sceneComposition?: SceneCompositionMode;
  portraitKey?: string;
  visualTheme: 'warm' | 'imperial' | 'extinction' | 'monolith' | 'multiverse' | 'threshold';
  imagePath: string;
  imageAlt: string;
  paragraphs: string[];
  dialogue?: PrologueDialogueLine[];
  historicalRecord?: {
    title: string;
    body: string;
    provenanceNote?: string;
  };
  interactivePrompt?: {
    question: string;
    choices: PrologueInteractiveChoice[];
  };
  encounterPuzzle?: PuzzleSpec;
  calloutQuote?: string;
  reflectionNote?: string;
  unlocksChronicleIds?: string[];
}

export type TutorialMechanicMode =
  | 'observation_inspect'
  | 'pattern_sequence'
  | 'deduction_premises'
  | 'hypothesis_elimination'
  | 'multistep_builder'
  | 'capstone_synthesis';

export interface TutorialInspectableItem {
  id: string;
  label: string;
  glyph: string;
  /** Neutral archive/object label—never indicates signal vs noise */
  categoryTag: string;
  shortPreview: string;
  inspectionDetail: string;
}

export type DiagnosticFeedbackKind =
  | 'incorrect'
  | 'incomplete'
  | 'unsupported'
  | 'alternative'
  | 'correct';

export interface TutorialDiagnosticRule {
  matchValues: string[];
  kind: Exclude<DiagnosticFeedbackKind, 'correct'>;
  headline: string;
  message: string;
  exploitedPattern?: ErrorPatternId;
}

export interface TutorialStageSpec {
  stageNumber: number;
  id: string;
  mechanicMode: TutorialMechanicMode;
  skillFocus: string;
  title: string;
  guideName: string;
  guidePortraitPath?: string;
  guideRole?: string;
  guideOpeningQuote: string;
  narrativeIntro: string;
  demonstrationTip: string;
  situationBrief: string;
  contextualGuidance: string;
  maxHintLevel: 1 | 2 | 3;
  freeFirstHintLabel?: string;
  teachAttributeUpgrade?: boolean;
  inspectables?: TutorialInspectableItem[];
  orderedSteps?: { id: string; label: string; transformDesc?: string }[];
  correctStepOrder?: string[];
  secondaryCheck?: {
    prompt: string;
    options: { id: string; label: string }[];
    validId: string;
    explanation: string;
  };
  diagnosticRules?: TutorialDiagnosticRule[];
  validAlternativeDisplayNote?: string;
  nextStageTransition: string;
  unlocksChronicleIds: string[];
  triggersStoryEvent?: {
    id: string;
    title: string;
  };
  puzzle: PuzzleSpec;
}

export type ChronicleSectionId =
  | 'sec_01_jacob'
  | 'sec_02_extinction'
  | 'sec_03_old_tub'
  | 'sec_04_identity'
  | 'sec_05_multiverse'
  | 'sec_06_player'
  | 'sec_07_universes'
  | 'sec_08_civilizations'
  | 'sec_09_solved'
  | 'sec_10_unresolved';

export type ChronicleEpistemicStatus = 'fact' | 'discovered' | 'theory' | 'unresolved';

export interface ChronicleSectionDefinition {
  id: ChronicleSectionId;
  order: number;
  title: string;
  subtitle: string;
}

export interface ChronicleEntry {
  id: string;
  sectionId: ChronicleSectionId;
  title: string;
  status: ChronicleEpistemicStatus;
  summary: string;
  detail: string;
  sourceLabel: string;
  isUnlocked: (save: GameSaveState) => boolean;
}

export interface BookDocumentInsert {
  id: string;
  title: string;
  provenance: string;
  body: string;
}

export interface BookInlineChoice {
  id: string;
  prompt: string;
  options: {
    id: string;
    label: string;
    response: string;
  }[];
}

export interface BookMarginClaim {
  id: string;
  statement: string;
  truthStatus: 'verified' | 'flawed' | 'pending';
  evaluationNote: string;
  unlockStageRequired: number;
  requiredStoryEvent?: string;
  requiredBossDefeat?: string;
}

export interface BookRereadMutation {
  id: string;
  unlockStageRequired?: number;
  requiredBossDefeat?: string;
  requiredStoryEvent?: string;
  heading: string;
  addition: string;
}

export interface BookChapter {
  id: string;
  order: number;
  actLabel: string;
  title: string;
  subtitle: string;
  readMinutes: number;
  leadParagraph: string;
  paragraphs: string[];
  documentInsert?: BookDocumentInsert;
  inlineChoice?: BookInlineChoice;
  marginClaims: BookMarginClaim[];
  rereadMutations: BookRereadMutation[];
  isUnlocked: (save: GameSaveState) => boolean;
}
