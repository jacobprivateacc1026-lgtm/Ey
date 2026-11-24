import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Compass,
  GitBranch,
  LineChart,
  ScrollText,
  Settings,
  User,
} from 'lucide-react';
import { AbilityTree } from './components/AbilityTree';
import { CharacterPanel } from './components/CharacterPanel';
import { KnowledgeArchive } from './components/KnowledgeArchive';
import { MultiverseMap } from './components/MultiverseMap';
import { ProfileStats } from './components/ProfileStats';
import { PuzzleChamber } from './components/PuzzleChamber';
import { QuestLog } from './components/QuestLog';
import { SettingsModal } from './components/SettingsModal';
import { StoryPrologue } from './components/StoryPrologue';
import { TitleScreen } from './components/TitleScreen';
import { TutorialExpedition } from './components/TutorialExpedition';
import {
  playSfx,
  stopAmbientSoundscape,
  syncAmbientSoundscape,
} from './engine/audio';
import { BOSS_ENCOUNTERS, getPuzzleById } from './engine/multiverseData';
import { TUTORIAL_STAGES } from './engine/prologueAndTutorialData';
import {
  completeBossPhase,
  completePrologue,
  completePrologueEncounter,
  completeTutorialStage,
  createNewSaveState,
  elevateTranscendence,
  recordDiscovery,
  recordMistakePattern,
  recordPrologueBeatProgress,
  recordPuzzleSolve,
  unlockArchiveEntry,
  unlockOrUpgradeAbility,
  upgradePrimaryAttribute,
} from './engine/progression';
import { generateProceduralPuzzle } from './engine/puzzleGenerator';
import {
  clearSavedGame,
  hasSavedGameSync,
  loadSaveAsync,
  loadSaveSync,
  persistSave,
} from './engine/storage';
import {
  BossEncounter,
  GameSaveState,
  HintLevel,
  PrimaryAttributeId,
  PrologueBeat,
  PuzzleCategory,
  PuzzleSpec,
  UniverseNode,
} from './engine/types';

type ActiveTab = 'multiverse' | 'character' | 'abilities' | 'archive' | 'quests' | 'profile';

interface ActiveEncounter {
  puzzle: PuzzleSpec;
  nodeId?: string;
  boss?: BossEncounter;
  bossPhaseIndex?: number;
}

export default function App() {
  const [save, setSave] = useState<GameSaveState>(() => loadSaveSync() ?? createNewSaveState());
  const [hasExistingSave, setHasExistingSave] = useState<boolean>(() => hasSavedGameSync());
  const [screenMode, setScreenMode] = useState<'title' | 'prologue' | 'tutorial' | 'playing'>(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('autostart=1')) {
      return 'playing';
    }
    return 'title';
  });
  const [replayStoryMode, setReplayStoryMode] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('multiverse');
  const [activeEncounter, setActiveEncounter] = useState<ActiveEncounter | null>(null);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  const latestSaveRef = useRef<GameSaveState>(save);
  const hasMutatedSaveRef = useRef<boolean>(false);

  // Sync game state attribute on document.body
  useEffect(() => {
    document.body.dataset.state = screenMode === 'title' ? 'title' : 'playing';
  }, [screenMode]);

  // Hydrate IndexedDB save asynchronously on mount (ignoring if player already started/mutated a save)
  useEffect(() => {
    let mounted = true;
    loadSaveAsync().then((loaded) => {
      if (mounted && loaded && !hasMutatedSaveRef.current) {
        latestSaveRef.current = loaded;
        setSave(loaded);
        setHasExistingSave(true);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const commitSave = useCallback((next: GameSaveState, immediate = false) => {
    hasMutatedSaveRef.current = true;
    latestSaveRef.current = next;
    setSave(next);
    setHasExistingSave(true);
    void persistSave(next, immediate);
  }, []);

  const updateSave = useCallback((updater: (prev: GameSaveState) => GameSaveState, immediate = false) => {
    hasMutatedSaveRef.current = true;
    const next = updater(latestSaveRef.current);
    if (next === latestSaveRef.current) return;
    latestSaveRef.current = next;
    setSave(next);
    setHasExistingSave(true);
    void persistSave(next, immediate);
  }, []);

  const notify = useCallback((msg: string) => {
    setBannerNotice(msg);
  }, []);

  useEffect(() => {
    if (!bannerNotice) return;
    const t = setTimeout(() => setBannerNotice(null), 5000);
    return () => clearTimeout(t);
  }, [bannerNotice]);

  // Subtle procedural cosmic drone synced to active stage (including Stage 0 Prologue & Tutorial)
  const currentStageForAudio =
    screenMode === 'prologue' || screenMode === 'tutorial'
      ? 0
      : activeEncounter?.puzzle.stageNumber ?? save.activeUniverseStage;
  const ambientShouldPlay =
    screenMode !== 'title' &&
    !showSettings &&
    save.settings.audioEnabled &&
    save.settings.ambientMusicEnabled;

  useEffect(() => {
    syncAmbientSoundscape(ambientShouldPlay, currentStageForAudio);
  }, [ambientShouldPlay, currentStageForAudio]);

  useEffect(() => {
    return () => {
      stopAmbientSoundscape();
    };
  }, []);

  const handleContinue = useCallback(() => {
    const current = latestSaveRef.current;
    playSfx('click', current.settings.audioEnabled);
    setReplayStoryMode(false);
    if (!current.prologueCompleted) {
      setScreenMode('prologue');
    } else if (!current.tutorialCompleted) {
      setScreenMode('tutorial');
    } else {
      setScreenMode('playing');
    }
  }, []);

  const handleNewGame = useCallback(() => {
    const fresh = createNewSaveState();
    playSfx('upgrade', fresh.settings.audioEnabled);
    commitSave(fresh, true);
    setActiveEncounter(null);
    setActiveTab('multiverse');
    setReplayStoryMode(false);
    setScreenMode('prologue');
  }, [commitSave]);

  const handlePrologueBeatViewed = useCallback(
    (beatIndex: number, beat: PrologueBeat) => {
      if (replayStoryMode) return;
      updateSave(
        (prev) => recordPrologueBeatProgress(prev, beatIndex, beat.unlocksChronicleIds),
        false
      );
    },
    [replayStoryMode, updateSave]
  );

  const handleCompleteStoryEncounter = useCallback(
    (puzzle: PuzzleSpec) => {
      const current = latestSaveRef.current;
      const res = completePrologueEncounter(current, puzzle);
      if (
        res.grantedRewards.xp > 0 ||
        res.grantedRewards.ip > 0 ||
        res.grantedRewards.kp > 0
      ) {
        playSfx('solve', res.nextState.settings.audioEnabled);
        commitSave(res.nextState, true);
      }
      return res.grantedRewards;
    },
    [commitSave]
  );

  const handleCompletePrologue = useCallback(() => {
    const current = latestSaveRef.current;
    playSfx('discovery', current.settings.audioEnabled);
    const updated = completePrologue(current);
    commitSave(updated, true);
    setReplayStoryMode(false);
    setScreenMode('tutorial');
  }, [commitSave]);

  const handleSolveTutorialStage = useCallback(
    (
      stageIndex: number,
      metrics: {
        attempts: number;
        hintsUsed: number;
        maxHintLevel: HintLevel;
        timeSeconds: number;
      }
    ) => {
      const stage = TUTORIAL_STAGES[stageIndex];
      if (!stage) return { xp: 0, ip: 0, kp: 0, ep: 0 };
      const res = completeTutorialStage(latestSaveRef.current, stage, metrics);
      playSfx(stage.stageNumber === 6 ? 'boss' : 'solve', res.nextState.settings.audioEnabled);
      commitSave(res.nextState, true);
      return res.grantedRewards;
    },
    [commitSave]
  );

  const handleCompleteTutorialExpedition = useCallback(() => {
    playSfx('upgrade', latestSaveRef.current.settings.audioEnabled);
    setReplayStoryMode(false);
    setActiveEncounter(null);
    setActiveTab('multiverse');
    setScreenMode('playing');
    notify('Threshold Archive cleared · Stage I: The Foundational Universe awaits.');
  }, [notify]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [screenMode, activeTab, activeEncounter?.puzzle.id]);

  const handleReplayPrologue = useCallback(() => {
    playSfx('click', latestSaveRef.current.settings.audioEnabled);
    setActiveEncounter(null);
    setReplayStoryMode(true);
    setScreenMode('prologue');
  }, []);

  const handleReplayTutorial = useCallback(() => {
    playSfx('click', latestSaveRef.current.settings.audioEnabled);
    setActiveEncounter(null);
    setReplayStoryMode(true);
    setScreenMode('tutorial');
  }, []);

  const handleOpenNode = useCallback(
    (node: UniverseNode) => {
      playSfx('click', save.settings.audioEnabled);
      if (node.kind === 'boss' && node.bossId) {
        const boss = BOSS_ENCOUNTERS[node.bossId];
        if (!boss) return;
        const savedPhase = save.bossPhaseProgress[boss.id] ?? 0;
        const phaseIndex = savedPhase >= boss.phases.length ? 0 : savedPhase;
        setActiveEncounter({
          puzzle: boss.phases[phaseIndex].puzzle,
          nodeId: node.id,
          boss,
          bossPhaseIndex: phaseIndex,
        });
        return;
      }

      if (node.kind === 'procedural_rift' && node.proceduralCategory) {
        const targetDiff = Math.min(
          95,
          Math.max(18, node.stageNumber * 15 + 10 + save.adaptiveDifficultyOffset)
        );
        const seed = Date.now() % 100000;
        const proc = generateProceduralPuzzle(
          node.proceduralCategory,
          targetDiff,
          seed,
          new Set(),
          node.stageNumber
        );
        setActiveEncounter({ puzzle: proc, nodeId: node.id });
        return;
      }

      if (node.puzzleId) {
        const puz = getPuzzleById(node.puzzleId);
        if (puz) {
          setActiveEncounter({ puzzle: puz, nodeId: node.id });
        }
      }
    },
    [save.settings.audioEnabled, save.bossPhaseProgress, save.adaptiveDifficultyOffset]
  );

  const handleLaunchProcedural = useCallback(
    (category: PuzzleCategory, difficultyScore: number) => {
      playSfx('click', save.settings.audioEnabled);
      const seed = Math.floor(Date.now() % 1000000);
      const puz = generateProceduralPuzzle(
        category,
        difficultyScore,
        seed,
        new Set(),
        Math.min(6, save.unlockedStage)
      );
      setActiveEncounter({ puzzle: puz });
    },
    [save.settings.audioEnabled, save.unlockedStage]
  );

  const handleSolveSuccess = useCallback(
    (metrics: {
      attempts: number;
      hintsUsed: number;
      maxHintLevel: HintLevel;
      timeSeconds: number;
      confidenceRated?: number;
    }) => {
      if (!activeEncounter) return;
      const res = recordPuzzleSolve(latestSaveRef.current, activeEncounter.puzzle, {
        nodeId: activeEncounter.boss ? undefined : activeEncounter.nodeId,
        isBoss: Boolean(activeEncounter.boss),
        ...metrics,
      });
      let nextState = res.nextState;
      const messages: string[] = [];

      if (activeEncounter.boss) {
        const phaseNum = (activeEncounter.bossPhaseIndex ?? 0) + 1;
        const bossRes = completeBossPhase(
          nextState,
          activeEncounter.boss.id,
          activeEncounter.nodeId,
          phaseNum
        );
        nextState = bossRes.nextState;
        if (bossRes.bossDefeated) {
          playSfx('boss', nextState.settings.audioEnabled);
          messages.push(`${activeEncounter.boss.name} overcome!`);
          if (bossRes.unlockedStageNumber && bossRes.unlockedStageNumber <= 6) {
            messages.push(`Stage ${bossRes.unlockedStageNumber} unlocked in the Multiverse Atlas.`);
          }
        } else {
          playSfx('solve', nextState.settings.audioEnabled);
        }
        if (bossRes.completedQuests.length > 0) {
          messages.push(
            `Quest Completed: ${bossRes.completedQuests.map((q) => q.title).join(', ')}`
          );
        }
      } else {
        playSfx('solve', nextState.settings.audioEnabled);
      }

      if (res.levelUps.length > 0) {
        const latest = res.levelUps[res.levelUps.length - 1];
        messages.push(
          latest.milestoneTitle
            ? `TUB reached Level ${latest.newLevel}: ${latest.milestoneTitle}`
            : `TUB reached Level ${latest.newLevel}`
        );
      }
      if (res.completedQuests.length > 0) {
        messages.push(`Quest Completed: ${res.completedQuests.map((q) => q.title).join(', ')}`);
      }

      commitSave(nextState, true);
      if (messages.length > 0) {
        notify(messages.join(' · '));
      }
    },
    [activeEncounter, commitSave, notify]
  );

  const handleAdvanceBossPhase = useCallback(() => {
    if (!activeEncounter?.boss) return;
    const nextIdx = (activeEncounter.bossPhaseIndex ?? 0) + 1;
    const nextPhase = activeEncounter.boss.phases[nextIdx];
    if (!nextPhase) return;
    playSfx('click', save.settings.audioEnabled);
    setActiveEncounter({
      ...activeEncounter,
      puzzle: nextPhase.puzzle,
      bossPhaseIndex: nextIdx,
    });
  }, [activeEncounter, save.settings.audioEnabled]);

  const handleSpendHintIP = useCallback(
    (costIP: number, isFreePulse: boolean) => {
      playSfx('hint', save.settings.audioEnabled);
      updateSave((prev) => ({
        ...prev,
        ip: Math.max(0, prev.ip - costIP),
        freeHintLastUsedAt: isFreePulse ? Date.now() : prev.freeHintLastUsedAt,
      }));
    },
    [save.settings.audioEnabled, updateSave]
  );

  const handleSaveNotes = useCallback(
    (puzzleId: string, notes: string) => {
      updateSave((prev) => {
        if ((prev.puzzleNotes[puzzleId] ?? '') === notes) return prev;
        return {
          ...prev,
          puzzleNotes: {
            ...prev.puzzleNotes,
            [puzzleId]: notes,
          },
        };
      });
    },
    [updateSave]
  );

  const handleRecordMistake = useCallback(
    (trapId: string) => {
      playSfx('error', save.settings.audioEnabled);
      updateSave((prev) => recordMistakePattern(prev, trapId));
    },
    [save.settings.audioEnabled, updateSave]
  );

  const handleUpgradeAttr = useCallback(
    (attrId: PrimaryAttributeId) => {
      const current = latestSaveRef.current;
      const res = upgradePrimaryAttribute(current, attrId);
      if (res.ok) {
        playSfx('upgrade', current.settings.audioEnabled);
        commitSave(res.nextState, true);
      } else {
        playSfx('error', current.settings.audioEnabled);
      }
      return { ok: res.ok, message: res.message };
    },
    [commitSave]
  );

  const handleUnlockAbility = useCallback(
    (abilityId: string) => {
      const current = latestSaveRef.current;
      const res = unlockOrUpgradeAbility(current, abilityId);
      if (res.ok) {
        playSfx('upgrade', current.settings.audioEnabled);
        commitSave(res.nextState, true);
      } else {
        playSfx('error', current.settings.audioEnabled);
      }
      return { ok: res.ok, message: res.message };
    },
    [commitSave]
  );

  const handleDiscoverItem = useCallback(
    (discoveryId: string) => {
      const current = latestSaveRef.current;
      const res = recordDiscovery(current, discoveryId);
      if (res.ok) {
        playSfx('discovery', current.settings.audioEnabled);
        commitSave(res.nextState, true);
        notify(
          res.completedQuests.length > 0
            ? `Discovery recorded · Quest Completed: ${res.completedQuests.map((q) => q.title).join(', ')}`
            : 'Discovery recorded in TUB Knowledge Matrix.'
        );
      }
    },
    [commitSave, notify]
  );

  const handleUnlockArchive = useCallback(
    (archiveId: string) => {
      const current = latestSaveRef.current;
      const res = unlockArchiveEntry(current, archiveId);
      if (res.ok) {
        playSfx('upgrade', current.settings.audioEnabled);
        commitSave(res.nextState, true);
      } else {
        playSfx('error', current.settings.audioEnabled);
      }
      return { ok: res.ok, message: res.message };
    },
    [commitSave]
  );

  const handleElevateTranscendence = useCallback(() => {
    const current = latestSaveRef.current;
    const res = elevateTranscendence(current);
    if (res.ok) {
      playSfx('boss', current.settings.audioEnabled);
      commitSave(res.nextState, true);
    } else {
      playSfx('error', current.settings.audioEnabled);
    }
    return { ok: res.ok, message: res.message };
  }, [commitSave]);

  const handleSelectStage = useCallback(
    (stageNumber: number) => {
      updateSave((prev) => ({ ...prev, activeUniverseStage: stageNumber }));
    },
    [updateSave]
  );

  if (screenMode === 'title') {
    return (
      <TitleScreen
        hasSave={hasExistingSave}
        savedLevel={save.tubLevel}
        savedStage={Math.min(6, save.unlockedStage)}
        audioEnabled={save.settings.audioEnabled}
        onContinue={handleContinue}
        onNewGame={handleNewGame}
        onToggleAudio={() =>
          updateSave((prev) => ({
            ...prev,
            settings: { ...prev.settings, audioEnabled: !prev.settings.audioEnabled },
          }))
        }
      />
    );
  }

  if (screenMode === 'prologue') {
    return (
      <StoryPrologue
        key={replayStoryMode ? 'prologue-replay' : 'prologue-campaign'}
        initialBeatIndex={replayStoryMode ? 0 : save.prologueBeatIndex}
        isReplay={replayStoryMode}
        completedStoryEncounterIds={save.completedStoryEncounterIds ?? []}
        onBeatViewed={handlePrologueBeatViewed}
        onCompleteStoryEncounter={handleCompleteStoryEncounter}
        onCompleteToTutorial={handleCompletePrologue}
        onReturnToAtlas={() => {
          setReplayStoryMode(false);
          setScreenMode('playing');
        }}
      />
    );
  }

  if (screenMode === 'tutorial') {
    return (
      <TutorialExpedition
        key={replayStoryMode ? 'tutorial-replay' : 'tutorial-campaign'}
        save={save}
        initialStageIndex={replayStoryMode ? 0 : Math.min(5, save.tutorialStageIndex)}
        isReplay={replayStoryMode || save.tutorialCompleted}
        onSpendHintIP={handleSpendHintIP}
        onSolveTutorialStage={handleSolveTutorialStage}
        onUpgradeAttribute={handleUpgradeAttr}
        onCompleteExpedition={handleCompleteTutorialExpedition}
        onReturnToAtlas={() => {
          setReplayStoryMode(false);
          setScreenMode('playing');
        }}
      />
    );
  }

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'multiverse', label: 'Multiverse', icon: <Compass className="w-4 h-4" /> },
    { id: 'character', label: 'TUB', icon: <User className="w-4 h-4" /> },
    { id: 'abilities', label: 'Abilities', icon: <GitBranch className="w-4 h-4" /> },
    { id: 'archive', label: 'Archive', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'quests', label: 'Quests', icon: <ScrollText className="w-4 h-4" /> },
    { id: 'profile', label: 'Profile', icon: <LineChart className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#06080E] text-slate-100 flex flex-col pb-20 md:pb-6">
      {/* Clean 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 border-b border-slate-800/90 bg-[#06080E]/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Title */}
          <button
            type="button"
            aria-label="TUB — Return to Title Screen"
            onClick={() => {
              setActiveEncounter(null);
              setScreenMode('title');
            }}
            className="font-display text-base sm:text-lg font-semibold tracking-tight text-white hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0"
          >
            TUB
          </button>

          {/* Zone 2: Concise single-line navigation links */}
          <nav className="hidden md:flex items-center gap-6" aria-label="Main game views">
            {navItems.map((item) => {
              const active = !activeEncounter && activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    playSfx('click', save.settings.audioEnabled);
                    setActiveEncounter(null);
                    setActiveTab(item.id);
                  }}
                  className={`text-sm font-medium whitespace-nowrap shrink-0 py-1 border-b-2 ${
                    active
                      ? 'text-cyan-300 border-cyan-400'
                      : 'text-slate-400 border-transparent hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Single primary utility action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              aria-label="Open Settings"
              className="min-h-[40px] px-3.5 py-1.5 rounded-lg border border-slate-800 bg-[#0B101D] hover:border-slate-600 text-xs font-medium text-slate-200 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Settings className="w-3.5 h-3.5" />
              Settings
            </button>
          </div>
        </div>
      </header>

      {/* Live Resource Strip inside Workspace (below header, not cluttering top bar) */}
      <div className="border-b border-slate-900 bg-[#080B14]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-300 tabular-nums">
          <div>
            Level <span className="text-white font-semibold">{save.tubLevel}</span> ·{' '}
            <span className="text-cyan-300">{save.ip} IP</span> ·{' '}
            <span className="text-violet-300">{save.kp} KP</span> ·{' '}
            <span className="text-amber-300">{save.ep} EP</span>
          </div>
          {bannerNotice && (
            <div role="status" className="text-emerald-300 font-sans font-medium">
              {bannerNotice}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {activeEncounter ? (
          <PuzzleChamber
            puzzle={activeEncounter.puzzle}
            save={save}
            boss={activeEncounter.boss}
            bossPhaseIndex={activeEncounter.bossPhaseIndex}
            onBack={() => setActiveEncounter(null)}
            onSaveNotes={handleSaveNotes}
            onSpendHintIP={handleSpendHintIP}
            onSolveSuccess={handleSolveSuccess}
            onRecordMistake={handleRecordMistake}
            onAdvanceBossPhase={handleAdvanceBossPhase}
          />
        ) : activeTab === 'multiverse' ? (
          <MultiverseMap
            save={save}
            onSelectStage={handleSelectStage}
            onOpenNode={handleOpenNode}
            onLaunchEndgameProcedural={handleLaunchProcedural}
            onDiscoverItem={handleDiscoverItem}
          />
        ) : activeTab === 'character' ? (
          <CharacterPanel
            save={save}
            onUpgradeAttribute={handleUpgradeAttr}
            onElevateTranscendence={handleElevateTranscendence}
          />
        ) : activeTab === 'abilities' ? (
          <AbilityTree save={save} onUnlockAbility={handleUnlockAbility} />
        ) : activeTab === 'archive' ? (
          <KnowledgeArchive
            save={save}
            onUnlockArchive={handleUnlockArchive}
            onReplayPrologue={handleReplayPrologue}
            onReplayTutorial={handleReplayTutorial}
          />
        ) : activeTab === 'quests' ? (
          <QuestLog save={save} />
        ) : (
          <ProfileStats save={save} />
        )}
      </main>

      {/* Mobile Bottom Thumb-Zone Navigation Bar (compact height <= 56px) */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-800 bg-[#06080E]/95 grid grid-cols-6 h-14"
      >
        {navItems.map((item) => {
          const active = !activeEncounter && activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                playSfx('click', save.settings.audioEnabled);
                setActiveEncounter(null);
                setActiveTab(item.id);
              }}
              className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
                active ? 'text-cyan-300' : 'text-slate-400'
              }`}
            >
              {item.icon}
              <span className="truncate max-w-full px-1">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {showSettings && (
        <SettingsModal
          save={save}
          onClose={() => setShowSettings(false)}
          onUpdateSettings={(patch) =>
            commitSave({
              ...save,
              settings: { ...save.settings, ...patch },
            })
          }
          onImportSave={(imported) => {
            commitSave(imported, true);
            setActiveEncounter(null);
            setReplayStoryMode(false);
            if (!imported.prologueCompleted) {
              setShowSettings(false);
              setScreenMode('prologue');
            } else if (!imported.tutorialCompleted) {
              setShowSettings(false);
              setScreenMode('tutorial');
            }
          }}
          onResetSave={() => {
            void clearSavedGame();
            const fresh = createNewSaveState();
            commitSave(fresh, true);
            setActiveEncounter(null);
            setActiveTab('multiverse');
            setReplayStoryMode(false);
            setShowSettings(false);
            setScreenMode('prologue');
          }}
          onReplayPrologue={handleReplayPrologue}
          onReplayTutorial={handleReplayTutorial}
        />
      )}
    </div>
  );
}

