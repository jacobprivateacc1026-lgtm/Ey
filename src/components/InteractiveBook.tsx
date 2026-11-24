import React, { memo, useMemo, useState } from 'react';
import {
  Bookmark,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileText,
  History,
  Lock,
  Menu,
  NotebookPen,
  Repeat,
  Star,
  X,
} from 'lucide-react';
import {
  BOOK_CHAPTERS,
  evaluateBookMarginClaim,
  isRereadMutationUnlocked,
} from '../engine/bookData';
import { generateDailyBookInsight } from '../engine/insightGenerator';
import { computeReflectiveProfile, ERROR_PATTERN_MAP } from '../engine/metacognition';
import { KNOWLEDGE_ARCHIVE } from '../engine/multiverseData';
import {
  CHRONICLE_SECTIONS,
  CHRONICLES_ENTRIES,
  TUTORIAL_STAGES,
} from '../engine/prologueAndTutorialData';
import { CANONICAL_PUZZLES } from '../engine/puzzleGenerator';
import {
  BookTextSize,
  ChronicleEpistemicStatus,
  ChronicleSectionId,
  GameSaveState,
  MarginStance,
} from '../engine/types';

interface InteractiveBookProps {
  save: GameSaveState;
  onUnlockBookFolio: (folioId: string) => { ok: boolean; message: string };
  onToggleBookmark: (chapterId: string) => void;
  onSetMarginStance: (claimId: string, stance: MarginStance, note?: string) => void;
  onSetTextSize: (size: BookTextSize) => void;
  onSetChapterRating: (chapterId: string, rating: number) => void;
  onSetInlineChoice: (choiceId: string, optionId: string) => void;
  onReplayPrologue?: () => void;
  onReplayTutorial?: () => void;
}

type BookSectionTab = 'chapters' | 'chronicles' | 'notebook' | 'plans' | 'folios';

const TEXT_SIZE_CLASS: Record<BookTextSize, string> = {
  sm: 'text-[15px] leading-[1.72]',
  base: 'text-[17px] leading-[1.78]',
  lg: 'text-[19px] leading-[1.82]',
};

const EPISTEMIC_LABEL: Record<
  ChronicleEpistemicStatus,
  { label: string; color: string }
> = {
  fact: { label: 'Established Fact', color: 'text-emerald-800' },
  discovered: { label: 'Field Evidence', color: 'text-sky-800' },
  theory: { label: 'Working Theory', color: 'text-indigo-800' },
  unresolved: { label: 'Unresolved Question', color: 'text-amber-800' },
};

export const InteractiveBook: React.FC<InteractiveBookProps> = memo(
  ({
    save,
    onUnlockBookFolio,
    onToggleBookmark,
    onSetMarginStance,
    onSetTextSize,
    onSetChapterRating,
    onSetInlineChoice,
    onReplayPrologue,
    onReplayTutorial,
  }) => {
    const [activeSection, setActiveSection] = useState<BookSectionTab>('chapters');
    const [selectedChapterId, setSelectedChapterId] = useState<string>(BOOK_CHAPTERS[0].id);
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState<boolean>(false);
    const [marginDrafts, setMarginDrafts] = useState<Record<string, string>>({});
    const [domainFilter, setDomainFilter] = useState<string>('All');
    const [folioStatus, setFolioStatus] = useState<string | null>(null);
    const [epistemicFilter, setEpistemicFilter] = useState<ChronicleEpistemicStatus | 'all'>('all');
    const [expandedChronicles, setExpandedChronicles] = useState<Record<ChronicleSectionId, boolean>>({
      sec_01_jacob: true,
      sec_02_extinction: true,
      sec_03_old_tub: false,
      sec_04_identity: false,
      sec_05_multiverse: false,
      sec_06_player: true,
      sec_07_universes: false,
      sec_08_civilizations: false,
      sec_09_solved: false,
      sec_10_unresolved: true,
    });

    const dailyInsight = useMemo(() => generateDailyBookInsight(save), [save]);
    const reflectiveProfile = useMemo(() => computeReflectiveProfile(save), [save]);
    const textSize: BookTextSize = save.bookTextSize ?? 'base';
    const unlockedIds = save.unlockedBookIds ?? save.unlockedArchiveIds;

    const currentChapter =
      BOOK_CHAPTERS.find((c) => c.id === selectedChapterId) ?? BOOK_CHAPTERS[0];
    const currentChapterUnlocked = currentChapter.isUnlocked(save);
    const isBookmarked = (save.bookBookmarks ?? []).includes(currentChapter.id);
    const currentRating = save.chapterRatings?.[currentChapter.id] ?? 0;

    const unlockedChroniclesCount = useMemo(
      () => CHRONICLES_ENTRIES.filter((entry) => entry.isUnlocked(save)).length,
      [save]
    );

    const chamberEvents = useMemo(() => {
      const events: {
        eventId: string;
        stageNumber: number;
        title: string;
        context: string;
        consequences: string;
      }[] = [];
      const allPuzzles = [
        ...TUTORIAL_STAGES.map((s) => s.puzzle),
        ...Object.values(CANONICAL_PUZZLES),
      ];
      for (const evtId of save.unlockedStoryEvents ?? []) {
        const puz = allPuzzles.find((p) => p.narrative?.storyEventId === evtId);
        if (puz?.narrative) {
          events.push({
            eventId: evtId,
            stageNumber: puz.stageNumber,
            title: puz.narrative.storyEventTitle ?? puz.title,
            context: puz.narrative.context,
            consequences: puz.narrative.consequences,
          });
        }
      }
      return events;
    }, [save.unlockedStoryEvents]);

    const domains = [
      'All',
      'Mathematics',
      'Logic',
      'Physics & Systems',
      'Civilizations',
      'Philosophy',
      'Metacognition',
    ];
    const filteredFolios =
      domainFilter === 'All'
        ? KNOWLEDGE_ARCHIVE
        : KNOWLEDGE_ARCHIVE.filter((e) => e.domain === domainFilter);

    const conf = save.confidenceStats ?? {
      sureTotal: 0,
      sureCorrect: 0,
      thinkSoTotal: 0,
      thinkSoCorrect: 0,
      guessingTotal: 0,
      guessingCorrect: 0,
    };

    const reflectionsList = useMemo(
      () =>
        Object.values(save.secondOrderReflections ?? {}).sort(
          (a, b) => b.timestamp - a.timestamp
        ),
      [save.secondOrderReflections]
    );

    const tocContent = (
      <div className="space-y-5">
        <div className="space-y-1.5 border-b border-[#D6CEBC] pb-3">
          <div className="text-[11px] font-mono uppercase tracking-[0.16em] text-[#7C2D12]">
            Table of Contents
          </div>
          <div className="text-xs text-[#57534E] font-mono tabular-nums">
            Chapters {BOOK_CHAPTERS.filter((c) => c.isUnlocked(save)).length}/{BOOK_CHAPTERS.length} ·
            Folios {unlockedIds.length}/{KNOWLEDGE_ARCHIVE.length}
          </div>
        </div>

        <nav className="space-y-1.5" aria-label="Book chapters">
          {BOOK_CHAPTERS.map((chap) => {
            const unlocked = chap.isUnlocked(save);
            const active = activeSection === 'chapters' && chap.id === currentChapter.id;
            const marked = (save.bookBookmarks ?? []).includes(chap.id);
            return (
              <button
                key={chap.id}
                type="button"
                disabled={!unlocked}
                onClick={() => {
                  setActiveSection('chapters');
                  setSelectedChapterId(chap.id);
                  setMobileDrawerOpen(false);
                }}
                className={`w-full min-h-[44px] px-3 py-2 rounded-lg text-left transition-colors flex items-start justify-between gap-2 ${
                  !unlocked
                    ? 'text-[#A8A29E] cursor-not-allowed'
                    : active
                      ? 'bg-[#ECE6D8] text-[#1C1917] font-semibold border border-[#C9BFA9]'
                      : 'text-[#44403C] hover:bg-[#F1ECE0]'
                }`}
              >
                <div className="min-w-0">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#78716C]">
                    {chap.actLabel}
                  </div>
                  <div className="text-sm truncate font-book">{chap.title}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0 mt-1">
                  {marked && <Bookmark className="w-3.5 h-3.5 text-[#9A3412] fill-[#9A3412]" />}
                  {!unlocked && <Lock className="w-3.5 h-3.5 text-[#A8A29E]" />}
                </div>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-[#D6CEBC] pt-3 space-y-1.5">
          <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-[#78716C]">
            Book Sections
          </div>
          {(
            [
              { id: 'chronicles', label: `Chronicles (${unlockedChroniclesCount}/${CHRONICLES_ENTRIES.length})` },
              { id: 'notebook', label: `Personal Notebook (${save.errorJournal?.length ?? 0})` },
              { id: 'plans', label: `Plan Replay (${save.planDecisions?.length ?? 0})` },
              { id: 'folios', label: `Research Folios (${save.kp} KP)` },
            ] as { id: BookSectionTab; label: string }[]
          ).map((sec) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => {
                setActiveSection(sec.id);
                setMobileDrawerOpen(false);
              }}
              className={`w-full min-h-[40px] px-3 py-1.5 rounded-lg text-left text-xs font-medium transition-colors ${
                activeSection === sec.id
                  ? 'bg-[#1C1917] text-[#FBF9F5]'
                  : 'text-[#44403C] hover:bg-[#EFEAE0]'
              }`}
            >
              {sec.label}
            </button>
          ))}
        </div>

        {(onReplayPrologue || onReplayTutorial) && (
          <div className="border-t border-[#D6CEBC] pt-3 space-y-2">
            {onReplayPrologue && (
              <button
                type="button"
                onClick={onReplayPrologue}
                className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-[#C9BFA9] bg-[#F7F4EE] hover:bg-[#ECE5D5] text-xs font-medium text-[#292524] inline-flex items-center gap-1.5"
              >
                <History className="w-3.5 h-3.5 text-[#7C2D12]" />
                Replay Prologue
              </button>
            )}
            {onReplayTutorial && (
              <button
                type="button"
                onClick={onReplayTutorial}
                className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-[#C9BFA9] bg-[#F7F4EE] hover:bg-[#ECE5D5] text-xs font-medium text-[#292524] inline-flex items-center gap-1.5"
              >
                <BookOpen className="w-3.5 h-3.5 text-[#7C2D12]" />
                Replay Threshold Tutorial
              </button>
            )}
          </div>
        )}
      </div>
    );

    return (
      <div
        data-testid="interactive-book"
        className="rounded-2xl border border-[#D6CEBC] bg-[#FBF9F5] text-[#1C1917] shadow-xl overflow-hidden"
      >
        {/* Warm Editorial Book Header Bar */}
        <header className="border-b border-[#DED6C5] bg-[#F7F4EE] px-4 sm:px-7 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Open Book Table of Contents"
              className="lg:hidden min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg border border-[#C9BFA9] bg-[#FBF9F5] text-[#1C1917]"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div>
              <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#7C2D12]">
                Jacob’s Living Manuscript
              </div>
              <h1 className="font-book text-xl sm:text-2xl font-semibold text-[#1C1917]">
                The Book of Infinite Possibility
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Section quick switcher */}
            <div className="hidden sm:flex items-center border border-[#D6CEBC] rounded-lg bg-[#FBF9F5] p-0.5 text-xs">
              {(
                [
                  ['chapters', 'Chapters'],
                  ['chronicles', 'Chronicles'],
                  ['notebook', 'Personal Notebook'],
                  ['plans', 'Plan Replay'],
                  ['folios', 'Folios'],
                ] as [BookSectionTab, string][]
              ).map(([tabId, label]) => (
                <button
                  key={tabId}
                  type="button"
                  onClick={() => setActiveSection(tabId)}
                  className={`min-h-[34px] px-3 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${
                    activeSection === tabId
                      ? 'bg-[#1C1917] text-[#FBF9F5]'
                      : 'text-[#57534E] hover:text-[#1C1917]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Text Size Selector (sm / base / lg) */}
            <div
              className="flex items-center border border-[#D6CEBC] rounded-lg bg-[#FBF9F5] p-0.5 text-xs font-mono"
              aria-label="Book text size"
            >
              {(['sm', 'base', 'lg'] as BookTextSize[]).map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => onSetTextSize(sz)}
                  className={`min-h-[34px] px-2.5 py-1 rounded transition-colors ${
                    textSize === sz
                      ? 'bg-[#7C2D12] text-[#FBF9F5] font-semibold'
                      : 'text-[#57534E] hover:text-[#1C1917]'
                  }`}
                >
                  {sz === 'sm' ? 'A−' : sz === 'base' ? 'A' : 'A+'}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Mobile TOC Slide-Over Drawer */}
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden bg-black/50 flex">
            <div className="w-80 max-w-[85vw] bg-[#FBF9F5] text-[#1C1917] h-full p-5 overflow-y-auto border-r border-[#D6CEBC]">
              <div className="flex justify-end mb-2">
                <button
                  type="button"
                  aria-label="Close Table of Contents"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg border border-[#D6CEBC]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {tocContent}
            </div>
            <button
              type="button"
              aria-label="Dismiss drawer"
              className="flex-1"
              onClick={() => setMobileDrawerOpen(false)}
            />
          </div>
        )}

        {/* 70/30 Desktop Book Spread */}
        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* Desktop Left TOC & Daily Margin Note Sidebar */}
          <aside className="hidden lg:block lg:col-span-4 border-r border-[#DED6C5] bg-[#F7F4EE] p-6 space-y-6">
            {tocContent}

            {/* Daily Margin Note */}
            <section
              aria-label="Daily Margin Note"
              className="rounded-xl border border-[#D6CEBC] bg-[#FBF9F5] p-4 space-y-2"
            >
              <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-[#7C2D12]">
                <span>
                  Daily Margin Note · {dailyInsight.attributeName} Lv {dailyInsight.attributeLevel}
                </span>
                <span className="text-[#78716C]">{dailyInsight.dateKey}</span>
              </div>
              <div className="font-book font-semibold text-sm text-[#1C1917]">
                {dailyInsight.title}
              </div>
              <p className="font-book text-xs text-[#292524] leading-relaxed italic">
                “{dailyInsight.message}”
              </p>
              <p className="text-[11px] text-[#57534E]">{dailyInsight.subtext}</p>
            </section>
          </aside>

          {/* Main Book Reading Surface (max-w-2xl editorial measure) */}
          <main className="lg:col-span-8 p-5 sm:p-8 lg:p-10">
            {/* Mobile compact Daily Margin Note */}
            <div className="lg:hidden mb-6 rounded-xl border border-[#D6CEBC] bg-[#F7F4EE] p-4 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono text-[#7C2D12]">
                <span>Daily Margin Note · {dailyInsight.attributeName}</span>
                <span>{dailyInsight.dateKey}</span>
              </div>
              <p className="font-book text-sm text-[#1C1917] italic">“{dailyInsight.message}”</p>
            </div>

            {activeSection === 'chapters' && (
              <article className="max-w-2xl mx-auto space-y-7">
                {!currentChapterUnlocked ? (
                  <div className="rounded-xl border border-[#D6CEBC] bg-[#F7F4EE] p-8 text-center space-y-2">
                    <Lock className="w-6 h-6 text-[#78716C] mx-auto" />
                    <h2 className="font-book text-xl font-semibold">Chapter Sealed</h2>
                    <p className="text-sm text-[#57534E]">
                      Advance further through Jacob’s Prologue, the Threshold Expedition, or Multiverse Stages to open this chapter.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Chapter Masthead */}
                    <header className="space-y-2.5 border-b border-[#D6CEBC] pb-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="text-xs font-mono uppercase tracking-[0.16em] text-[#7C2D12]">
                          {currentChapter.actLabel} · {currentChapter.readMinutes} min read
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onToggleBookmark(currentChapter.id)}
                            className={`min-h-[36px] px-3 py-1 rounded-md border text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
                              isBookmarked
                                ? 'border-[#9A3412] bg-[#9A3412] text-[#FBF9F5]'
                                : 'border-[#C9BFA9] bg-[#F7F4EE] text-[#292524] hover:bg-[#ECE5D5]'
                            }`}
                          >
                            <Bookmark className="w-3.5 h-3.5" />
                            {isBookmarked ? 'Bookmarked' : 'Bookmark'}
                          </button>
                        </div>
                      </div>

                      <h2 className="font-book text-2xl sm:text-4xl font-semibold text-[#1C1917] leading-tight">
                        {currentChapter.title}
                      </h2>
                      <p className="font-book text-base text-[#57534E] italic">
                        {currentChapter.subtitle}
                      </p>
                    </header>

                    {/* Editorial Body Prose */}
                    <div className={`font-book text-[#292524] space-y-4 ${TEXT_SIZE_CLASS[textSize]}`}>
                      <p className="font-medium text-[#1C1917]">{currentChapter.leadParagraph}</p>
                      {currentChapter.paragraphs.map((para, idx) => (
                        <p key={idx}>{para}</p>
                      ))}
                    </div>

                    {/* Broadsheet Primary Document Insert */}
                    {currentChapter.documentInsert && (
                      <aside className="rounded-xl border border-[#C9BFA9] bg-[#F7F4EE] p-5 space-y-2">
                        <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-[#7C2D12]">
                          <FileText className="w-3.5 h-3.5 shrink-0" />
                          {currentChapter.documentInsert.title}
                        </div>
                        <p className="text-xs sm:text-sm font-mono text-[#1C1917] leading-relaxed">
                          {currentChapter.documentInsert.body}
                        </p>
                        <div className="text-[11px] font-mono text-[#57534E] border-t border-[#DED6C5] pt-1.5">
                          Provenance: {currentChapter.documentInsert.provenance}
                        </div>
                      </aside>
                    )}

                    {/* Inline Reading Choice */}
                    {currentChapter.inlineChoice && (() => {
                      const choice = currentChapter.inlineChoice;
                      const pickedId = save.bookInlineChoices?.[choice.id];
                      const pickedObj = choice.options.find((o) => o.id === pickedId);
                      return (
                        <section className="rounded-xl border border-[#D6CEBC] bg-[#F7F4EE] p-5 space-y-3">
                          <div className="text-xs font-mono uppercase tracking-wider text-[#7C2D12]">
                            Reflective Margin Prompt
                          </div>
                          <p className="font-book text-sm sm:text-base font-medium text-[#1C1917]">
                            {choice.prompt}
                          </p>
                          <div className="space-y-2">
                            {choice.options.map((opt) => {
                              const active = pickedId === opt.id;
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => onSetInlineChoice(choice.id, opt.id)}
                                  className={`w-full min-h-[42px] px-3.5 py-2 rounded-lg border text-left text-xs sm:text-sm transition-colors ${
                                    active
                                      ? 'border-[#7C2D12] bg-[#1C1917] text-[#FBF9F5]'
                                      : 'border-[#D6CEBC] bg-[#FBF9F5] text-[#292524] hover:bg-[#EFEAE0]'
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                          {pickedObj && (
                            <p className="font-book text-xs sm:text-sm text-[#44403C] italic border-t border-[#DED6C5] pt-2.5">
                              {pickedObj.response}
                            </p>
                          )}
                        </section>
                      );
                    })()}

                    {/* Margin Claims & Delayed Evaluation */}
                    {currentChapter.marginClaims.length > 0 && (
                      <section className="space-y-3 border-t border-[#D6CEBC] pt-5">
                        <div className="text-xs font-mono uppercase tracking-wider text-[#7C2D12]">
                          Margin Claims · Mark Trusted or Doubtful
                        </div>
                        <p className="text-xs text-[#57534E]">
                          Tag claims in the margin now; as Jacob uncovers further evidence across stages, your judgment is checked against reality.
                        </p>
                        <div className="space-y-3">
                          {currentChapter.marginClaims.map((claim) => {
                            const evalRes = evaluateBookMarginClaim(claim, save);
                            const savedNote = save.bookMarginNotes?.[claim.id]?.note ?? '';
                            const draft = marginDrafts[claim.id] ?? savedNote;
                            return (
                              <div
                                key={claim.id}
                                className="rounded-xl border border-[#D6CEBC] bg-[#F7F4EE] p-4 space-y-2.5"
                              >
                                <p className="font-book text-sm text-[#1C1917] leading-relaxed">
                                  “{claim.statement}”
                                </p>

                                <div className="flex flex-wrap items-center gap-2">
                                  {(['trusted', 'doubtful'] as MarginStance[]).map((stance) => {
                                    const active = evalRes.playerStance === stance;
                                    return (
                                      <button
                                        key={stance}
                                        type="button"
                                        data-testid={`margin-${claim.id}-${stance}`}
                                        onClick={() =>
                                          onSetMarginStance(claim.id, stance, draft)
                                        }
                                        className={`min-h-[36px] px-3 py-1 rounded-md border text-xs font-mono capitalize transition-colors ${
                                          active
                                            ? stance === 'trusted'
                                              ? 'border-emerald-700 bg-emerald-800 text-white'
                                              : 'border-amber-800 bg-amber-800 text-white'
                                            : 'border-[#C9BFA9] bg-[#FBF9F5] text-[#292524] hover:bg-[#ECE5D5]'
                                        }`}
                                      >
                                        {stance}
                                      </button>
                                    );
                                  })}

                                  <input
                                    type="text"
                                    value={draft}
                                    onChange={(e) =>
                                      setMarginDrafts((prev) => ({
                                        ...prev,
                                        [claim.id]: e.target.value,
                                      }))
                                    }
                                    onBlur={() => {
                                      if (evalRes.playerStance) {
                                        onSetMarginStance(
                                          claim.id,
                                          evalRes.playerStance,
                                          draft
                                        );
                                      }
                                    }}
                                    placeholder="Optional margin note..."
                                    className="flex-1 min-w-[160px] min-h-[36px] rounded-md border border-[#D6CEBC] bg-[#FBF9F5] px-2.5 text-xs text-[#1C1917]"
                                  />
                                </div>

                                {evalRes.isEvaluated && evalRes.playerStance ? (
                                  <div
                                    className={`rounded-lg border px-3 py-2 text-xs ${
                                      evalRes.isCorrectStance
                                        ? 'border-emerald-700/35 bg-emerald-900/10 text-emerald-900'
                                        : 'border-rose-700/35 bg-rose-900/10 text-rose-900'
                                    }`}
                                  >
                                    <span className="font-mono font-semibold">
                                      {evalRes.isCorrectStance
                                        ? 'Verified Judgment'
                                        : 'Revised in Later Evidence'}
                                      :{' '}
                                    </span>
                                    {claim.evaluationNote}
                                  </div>
                                ) : (
                                  <div className="text-[11px] font-mono text-[#78716C]">
                                    Pending stage {claim.unlockStageRequired} verification.
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    )}

                    {/* Reread Mutations Unlocked by Later Stages */}
                    {currentChapter.rereadMutations.some((m) =>
                      isRereadMutationUnlocked(m, save)
                    ) && (
                      <section className="space-y-3 border-t border-[#D6CEBC] pt-5">
                        <div className="text-xs font-mono uppercase tracking-wider text-[#7C2D12]">
                          Later Margin Annotations (Unlocked Through Play)
                        </div>
                        {currentChapter.rereadMutations
                          .filter((m) => isRereadMutationUnlocked(m, save))
                          .map((mut) => (
                            <div
                              key={mut.id}
                              className="rounded-xl border border-[#C9BFA9] bg-[#F3EDE0] p-4 space-y-1"
                            >
                              <div className="text-xs font-mono font-semibold text-[#7C2D12]">
                                {mut.heading}
                              </div>
                              <p className="font-book text-sm text-[#292524] leading-relaxed">
                                {mut.addition}
                              </p>
                            </div>
                          ))}
                      </section>
                    )}

                    {/* 1–5 Chapter Rating */}
                    <footer className="border-t border-[#D6CEBC] pt-4 flex flex-wrap items-center justify-between gap-3">
                      <span className="text-xs font-mono text-[#57534E]">
                        Mark this chapter’s resonance (1–5):
                      </span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            aria-label={`Rate chapter ${star} out of 5`}
                            onClick={() => onSetChapterRating(currentChapter.id, star)}
                            className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-md hover:bg-[#EFEAE0]"
                          >
                            <Star
                              className={`w-4 h-4 ${
                                star <= currentRating
                                  ? 'text-[#9A3412] fill-[#9A3412]'
                                  : 'text-[#A8A29E]'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </footer>
                  </>
                )}
              </article>
            )}

            {activeSection === 'chronicles' && (
              <section className="max-w-2xl mx-auto space-y-6">
                <div className="space-y-1">
                  <div className="text-xs font-mono uppercase tracking-[0.16em] text-[#7C2D12]">
                    Living Ten-Part Record
                  </div>
                  <h2 className="font-book text-2xl sm:text-3xl font-semibold text-[#1C1917]">
                    Chronicles of Existence
                  </h2>
                  <p className="text-sm text-[#57534E]">
                    Separates established facts, field evidence, working theories, and unresolved questions uncovered across Jacob’s expedition.
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5 border border-[#D6CEBC] rounded-lg bg-[#F7F4EE] p-1 w-fit">
                  {(
                    [
                      ['all', 'All'],
                      ['fact', 'Fact'],
                      ['discovered', 'Evidence'],
                      ['theory', 'Theory'],
                      ['unresolved', 'Unresolved'],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setEpistemicFilter(key)}
                      className={`min-h-[34px] px-3 py-1 rounded text-xs font-medium ${
                        epistemicFilter === key
                          ? 'bg-[#1C1917] text-[#FBF9F5]'
                          : 'text-[#57534E] hover:text-[#1C1917]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="space-y-3">
                  {CHRONICLE_SECTIONS.map((sec) => {
                    const entries = CHRONICLES_ENTRIES.filter(
                      (e) =>
                        e.sectionId === sec.id &&
                        (epistemicFilter === 'all' || e.status === epistemicFilter)
                    );
                    const unlockedInSec = entries.filter((e) => e.isUnlocked(save));
                    const isOpen = expandedChronicles[sec.id];
                    return (
                      <div
                        key={sec.id}
                        className="rounded-xl border border-[#D6CEBC] bg-[#F7F4EE] overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedChronicles((prev) => ({
                              ...prev,
                              [sec.id]: !prev[sec.id],
                            }))
                          }
                          className="w-full px-4 py-3 flex items-center justify-between gap-2 text-left hover:bg-[#EFEAE0]"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {isOpen ? (
                              <ChevronDown className="w-4 h-4 text-[#7C2D12] shrink-0" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-[#78716C] shrink-0" />
                            )}
                            <div className="min-w-0">
                              <div className="font-book text-sm font-semibold text-[#1C1917] truncate">
                                {String(sec.order).padStart(2, '0')}. {sec.title}
                              </div>
                              <div className="text-xs text-[#57534E] truncate">{sec.subtitle}</div>
                            </div>
                          </div>
                          <span className="text-xs font-mono text-[#78716C] tabular-nums shrink-0">
                            {unlockedInSec.length}/{entries.length}
                          </span>
                        </button>

                        {isOpen && (
                          <div className="border-t border-[#DED6C5] bg-[#FBF9F5] p-4 space-y-3">
                            {entries.map((entry) => {
                              const unlocked = entry.isUnlocked(save);
                              const ep = EPISTEMIC_LABEL[entry.status];
                              return (
                                <div
                                  key={entry.id}
                                  className="rounded-lg border border-[#DED6C5] bg-[#F7F4EE] p-3.5 space-y-1.5"
                                >
                                  <div className="flex items-center justify-between text-[11px] font-mono">
                                    <span className={unlocked ? ep.color : 'text-[#A8A29E]'}>
                                      {ep.label} · {entry.sourceLabel}
                                    </span>
                                    {!unlocked && <Lock className="w-3 h-3 text-[#A8A29E]" />}
                                  </div>
                                  <h3 className="font-book text-sm font-semibold text-[#1C1917]">
                                    {unlocked ? entry.title : 'Sealed Fragment'}
                                  </h3>
                                  {unlocked ? (
                                    <>
                                      <p className="text-xs text-[#292524] leading-relaxed">
                                        {entry.summary}
                                      </p>
                                      <p className="text-xs text-[#57534E] leading-relaxed">
                                        {entry.detail}
                                      </p>
                                    </>
                                  ) : (
                                    <p className="text-xs text-[#78716C]">
                                      Uncover more expeditions or discoveries to reveal this record.
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {chamberEvents.length > 0 && (
                  <div className="border-t border-[#D6CEBC] pt-5 space-y-3">
                    <h3 className="font-book text-lg font-semibold">
                      Reconstructed Chamber Chronicles
                    </h3>
                    {chamberEvents.map((evt) => (
                      <div
                        key={evt.eventId}
                        className="rounded-lg border border-[#D6CEBC] bg-[#F7F4EE] p-4 space-y-1"
                      >
                        <div className="text-[11px] font-mono text-[#7C2D12]">
                          Stage {evt.stageNumber} · {evt.context}
                        </div>
                        <div className="font-book text-sm font-semibold">{evt.title}</div>
                        <p className="text-xs text-[#44403C] leading-relaxed">
                          {evt.consequences}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {activeSection === 'notebook' && (
              <section
                data-testid="personal-notebook"
                className="max-w-2xl mx-auto space-y-6"
              >
                <div className="space-y-1 border-b border-[#D6CEBC] pb-4">
                  <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.16em] text-[#7C2D12]">
                    <NotebookPen className="w-3.5 h-3.5" />
                    Personal Notebook &amp; Calibration
                  </div>
                  <h2 className="font-book text-2xl sm:text-3xl font-semibold">
                    Jacob’s Error Journal
                  </h2>
                  <p className="text-sm text-[#57534E]">
                    Tracks recurring reasoning slips, certainty calibration, and reflective observations (observational only—never alters puzzle difficulty or stats artificially).
                  </p>
                </div>

                {/* Reflective Profile Summary */}
                <div className="rounded-xl border border-[#C9BFA9] bg-[#F7F4EE] p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-[#7C2D12]">
                    <span>Reflective Habit Summary</span>
                    <span>Calibration: {reflectiveProfile.calibrationLabel}</span>
                  </div>
                  <p className="font-book text-sm text-[#1C1917] leading-relaxed">
                    {reflectiveProfile.summaryLine}
                  </p>
                  <p className="font-book text-xs text-[#44403C] italic border-t border-[#DED6C5] pt-2">
                    {reflectiveProfile.characterObservation}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                    <div>
                      <div className="font-mono text-[11px] uppercase text-[#57534E] mb-1">
                        Observed Strengths
                      </div>
                      <ul className="list-disc pl-4 space-y-1 text-[#292524]">
                        {reflectiveProfile.strengths.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="font-mono text-[11px] uppercase text-[#57534E] mb-1">
                        Blind Spots to Watch
                      </div>
                      <ul className="list-disc pl-4 space-y-1 text-[#292524]">
                        {reflectiveProfile.blindSpots.map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Confidence Calibration Breakdown */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { label: 'Marked "Sure"', ok: conf.sureCorrect, tot: conf.sureTotal },
                    { label: 'Marked "Think so"', ok: conf.thinkSoCorrect, tot: conf.thinkSoTotal },
                    { label: 'Marked "Guessing"', ok: conf.guessingCorrect, tot: conf.guessingTotal },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-xl border border-[#D6CEBC] bg-[#F7F4EE] p-3.5"
                    >
                      <div className="text-[11px] font-mono text-[#57534E]">{item.label}</div>
                      <div className="text-xl font-mono font-semibold text-[#1C1917] tabular-nums mt-1">
                        {item.tot > 0 ? `${Math.round((item.ok / item.tot) * 100)}%` : '—'}
                      </div>
                      <div className="text-[11px] font-mono text-[#78716C] tabular-nums">
                        {item.ok}/{item.tot} verified
                      </div>
                    </div>
                  ))}
                </div>

                {/* Chronological Error Journal Entries */}
                <div className="space-y-3">
                  <h3 className="font-book text-lg font-semibold">
                    Logged Self-Audits ({save.errorJournal?.length ?? 0})
                  </h3>
                  {!save.errorJournal || save.errorJournal.length === 0 ? (
                    <p className="text-sm text-[#57534E] italic font-book">
                      No errors logged yet. When a submission misses, your chosen diagnosis and reflection are preserved here for review.
                    </p>
                  ) : (
                    save.errorJournal
                      .slice()
                      .reverse()
                      .map((entry) => (
                        <div
                          key={entry.id}
                          className="rounded-xl border border-[#D6CEBC] bg-[#F7F4EE] p-4 space-y-2"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                            <span className="text-[#7C2D12] font-semibold">
                              {entry.puzzleTitle} · {entry.modeKey}
                            </span>
                            <span className="text-[#57534E] tabular-nums">
                              Clarity {entry.clarityDelta}
                              {entry.confidence ? ` · ${entry.confidence}` : ''}
                            </span>
                          </div>
                          <div className="text-xs text-[#44403C]">
                            Submitted: <span className="font-mono">“{entry.submittedAnswer}”</span> ·
                            Exploited:{' '}
                            <strong className="text-[#1C1917]">
                              {ERROR_PATTERN_MAP[entry.actualPattern]?.label ?? entry.actualPattern}
                            </strong>{' '}
                            ({entry.diagnosisMatched ? 'Diagnosis aligned' : 'Revised'})
                          </div>
                          <p className="font-book text-sm text-[#1C1917] italic">
                            “{entry.reflectionText}”
                          </p>
                        </div>
                      ))
                  )}
                </div>
              </section>
            )}

            {activeSection === 'plans' && (
              <section
                data-testid="plan-replay-section"
                className="max-w-2xl mx-auto space-y-6"
              >
                <div className="space-y-1 border-b border-[#D6CEBC] pb-4">
                  <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.16em] text-[#7C2D12]">
                    <Repeat className="w-3.5 h-3.5" />
                    Plan Replay &amp; Post-Solve Principles
                  </div>
                  <h2 className="font-book text-2xl sm:text-3xl font-semibold">
                    Committed Plans &amp; Second-Order Takeaways
                  </h2>
                  <p className="text-sm text-[#57534E]">
                    Inspect your strategic commitments, multi-step rubric syntheses, and post-solve reflections across realities.
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="font-book text-lg font-semibold">
                    Plan Decisions ({save.planDecisions?.length ?? 0})
                  </h3>
                  {!save.planDecisions || save.planDecisions.length === 0 ? (
                    <p className="text-sm text-[#57534E] italic font-book">
                      No strategic commitments or synthesis plans recorded yet.
                    </p>
                  ) : (
                    save.planDecisions
                      .slice()
                      .reverse()
                      .map((dec) => (
                        <div
                          key={dec.id}
                          className="rounded-xl border border-[#D6CEBC] bg-[#F7F4EE] p-4 space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="font-semibold text-[#1C1917]">
                              {dec.puzzleTitle}
                            </span>
                            <span
                              className={
                                dec.outcome === 'passed'
                                  ? 'text-emerald-800'
                                  : 'text-amber-800'
                              }
                            >
                              {dec.outcome === 'passed' ? 'First-Pass Commitment' : 'Revised Plan'}
                            </span>
                          </div>
                          <p className="text-xs text-[#292524] font-mono bg-[#FBF9F5] border border-[#DED6C5] rounded p-2.5">
                            {dec.submittedPlan}
                          </p>
                          {dec.lessonNote && (
                            <p className="font-book text-xs text-[#57534E]">
                              Principle: {dec.lessonNote}
                            </p>
                          )}
                        </div>
                      ))
                  )}
                </div>

                <div className="space-y-3 border-t border-[#D6CEBC] pt-5">
                  <h3 className="font-book text-lg font-semibold">
                    Second-Order Reflections ({reflectionsList.length})
                  </h3>
                  {reflectionsList.length === 0 ? (
                    <p className="text-sm text-[#57534E] italic font-book">
                      After solving a chamber, articulate why the solution works and what trap to watch next to store it here.
                    </p>
                  ) : (
                    reflectionsList.map((ref) => (
                      <div
                        key={ref.puzzleId}
                        className="rounded-xl border border-[#D6CEBC] bg-[#F7F4EE] p-4 space-y-1.5"
                      >
                        <div className="text-xs font-mono font-semibold text-[#7C2D12]">
                          {ref.puzzleTitle}
                        </div>
                        <p className="font-book text-sm text-[#1C1917]">
                          <strong className="font-sans text-xs uppercase tracking-wider text-[#57534E] mr-1.5">
                            Why it works:
                          </strong>
                          {ref.whyItWorks}
                        </p>
                        {ref.patternToWatch && (
                          <p className="font-book text-xs text-[#44403C]">
                            <strong className="font-sans text-[11px] uppercase tracking-wider text-[#57534E] mr-1.5">
                              Watch for:
                            </strong>
                            {ref.patternToWatch}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </section>
            )}

            {activeSection === 'folios' && (
              <section className="max-w-2xl mx-auto space-y-5">
                <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-[#D6CEBC] pb-4">
                  <div>
                    <div className="text-xs font-mono uppercase tracking-[0.16em] text-[#7C2D12]">
                      Knowledge Research Folios
                    </div>
                    <h2 className="font-book text-2xl sm:text-3xl font-semibold">
                      Foundational Reference Folios
                    </h2>
                  </div>
                  <div className="text-xs font-mono text-[#7C2D12] tabular-nums">
                    {unlockedIds.length}/{KNOWLEDGE_ARCHIVE.length} Unlocked · {save.kp} KP
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {domains.map((dom) => (
                    <button
                      key={dom}
                      type="button"
                      onClick={() => setDomainFilter(dom)}
                      className={`min-h-[34px] px-3 py-1 rounded-md border text-xs font-medium ${
                        domainFilter === dom
                          ? 'border-[#1C1917] bg-[#1C1917] text-[#FBF9F5]'
                          : 'border-[#D6CEBC] bg-[#F7F4EE] text-[#44403C] hover:bg-[#EFEAE0]'
                      }`}
                    >
                      {dom}
                    </button>
                  ))}
                </div>

                {folioStatus && (
                  <div
                    role="status"
                    className="rounded-lg border border-[#7C2D12]/40 bg-[#F3EDE0] px-3.5 py-2 text-xs text-[#1C1917]"
                  >
                    {folioStatus}
                  </div>
                )}

                <div className="space-y-4">
                  {filteredFolios.map((entry) => {
                    const unlocked = unlockedIds.includes(entry.id);
                    const affordable = save.kp >= entry.costKP;
                    return (
                      <article
                        key={entry.id}
                        className="rounded-xl border border-[#D6CEBC] bg-[#F7F4EE] p-5 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-xs font-mono text-[#78716C]">
                              {entry.domain} · Stage {entry.stageFound}
                            </div>
                            <h3 className="font-book text-lg font-semibold text-[#1C1917] mt-0.5">
                              {entry.title}
                            </h3>
                          </div>
                          {unlocked ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-1" />
                          ) : (
                            <Lock className="w-4 h-4 text-[#A8A29E] shrink-0 mt-1" />
                          )}
                        </div>

                        {unlocked ? (
                          <div className="space-y-2.5">
                            <p className="font-book text-sm text-[#292524] leading-relaxed">
                              {entry.content}
                            </p>
                            <div className="rounded-lg border border-[#D6CEBC] bg-[#FBF9F5] p-3 text-xs text-[#7C2D12]">
                              <strong>Key Principle:</strong> {entry.keyInsight}
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-xs text-[#57534E] leading-relaxed">
                              {entry.summary}
                            </p>
                            <button
                              type="button"
                              disabled={!affordable}
                              onClick={() => {
                                const res = onUnlockBookFolio(entry.id);
                                setFolioStatus(res.message);
                              }}
                              className={`min-h-[40px] px-4 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-2 transition-colors tabular-nums ${
                                affordable
                                  ? 'bg-[#1C1917] hover:bg-[#7C2D12] text-[#FBF9F5]'
                                  : 'border border-[#D6CEBC] bg-[#FBF9F5] text-[#A8A29E] cursor-not-allowed'
                              }`}
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                              Unlock Folio ({entry.costKP} KP)
                            </button>
                          </>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            )}
          </main>
        </div>
      </div>
    );
  }
);
