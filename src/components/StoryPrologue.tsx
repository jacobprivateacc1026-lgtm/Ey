import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Compass,
  FileText,
  Sparkles,
} from 'lucide-react';
import {
  PROLOGUE_BEATS,
  THRESHOLD_AWAKENING_BEAT,
} from '../engine/prologueAndTutorialData';
import { verifyPuzzleAnswer } from '../engine/puzzleGenerator';
import {
  PrologueBeat,
  PrologueChapterId,
  PrologueDialogueLine,
  PuzzleSpec,
  StrictVerdict,
} from '../engine/types';
import { CharacterPortrait } from './CharacterPortrait';

interface StoryPrologueProps {
  initialBeatIndex?: number;
  isReplay?: boolean;
  completedStoryEncounterIds?: string[];
  onBeatViewed?: (beatIndex: number, beat: PrologueBeat) => void;
  onCompleteStoryEncounter?: (
    puzzle: PuzzleSpec
  ) => { xp: number; ip: number; kp: number; ep: number } | void;
  onCompleteToTutorial: () => void;
  onReturnToAtlas?: () => void;
}

const ALL_BEATS: PrologueBeat[] = [...PROLOGUE_BEATS, THRESHOLD_AWAKENING_BEAT];

const CHAPTER_MARKERS: { id: PrologueChapterId; label: string; firstIndex: number }[] = [
  { id: 'prologue_jacob', label: 'Prologue · Jacob', firstIndex: 0 },
  { id: 'chapter_1_humanity', label: '1 · Humanity', firstIndex: 3 },
  { id: 'chapter_2_decision', label: '2 · Decision', firstIndex: 5 },
  { id: 'chapter_3_beyond', label: '3 · Beyond', firstIndex: 7 },
  { id: 'chapter_4_multiverse', label: '4 · Multiverse', firstIndex: 9 },
  { id: 'part_2_threshold', label: 'II · Beginning', firstIndex: 10 },
];

const THEME_ACCENT: Record<
  PrologueBeat['visualTheme'],
  { tag: string; quoteBorder: string; quoteBg: string; quoteText: string; scrimGlow: string }
> = {
  warm: {
    tag: 'text-amber-300',
    quoteBorder: 'border-amber-400/40',
    quoteBg: 'bg-[#0E111B]/90',
    quoteText: 'text-amber-200',
    scrimGlow: 'rgba(245, 158, 11, 0.08)',
  },
  imperial: {
    tag: 'text-sky-300',
    quoteBorder: 'border-sky-400/40',
    quoteBg: 'bg-[#0A1120]/90',
    quoteText: 'text-sky-200',
    scrimGlow: 'rgba(56, 189, 248, 0.08)',
  },
  extinction: {
    tag: 'text-rose-300',
    quoteBorder: 'border-rose-400/40',
    quoteBg: 'bg-[#120B12]/90',
    quoteText: 'text-rose-200',
    scrimGlow: 'rgba(244, 63, 94, 0.08)',
  },
  monolith: {
    tag: 'text-violet-300',
    quoteBorder: 'border-violet-400/40',
    quoteBg: 'bg-[#0E0C1D]/90',
    quoteText: 'text-violet-200',
    scrimGlow: 'rgba(167, 139, 250, 0.09)',
  },
  multiverse: {
    tag: 'text-cyan-300',
    quoteBorder: 'border-cyan-400/40',
    quoteBg: 'bg-[#091220]/90',
    quoteText: 'text-cyan-200',
    scrimGlow: 'rgba(34, 211, 238, 0.08)',
  },
  threshold: {
    tag: 'text-emerald-300',
    quoteBorder: 'border-cyan-400/50',
    quoteBg: 'bg-[#081523]/92',
    quoteText: 'text-cyan-200',
    scrimGlow: 'rgba(16, 185, 129, 0.09)',
  },
};

function renderDialogueLines(dialogue: PrologueDialogueLine[]) {
  return (
    <div className="divide-y divide-slate-800/80 border-t border-b border-slate-800/80">
      {dialogue.map((line, idx) => (
        <div key={idx} className="py-3.5 flex items-start gap-3.5">
          <CharacterPortrait portraitKey={line.portraitKey} speakerName={line.speaker} size="md" />
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs font-mono">
              <span className="font-semibold text-white">{line.speaker}</span>
              {line.role && <span className="text-slate-400">· {line.role}</span>}
            </div>
            {line.stageDirection && (
              <div className="text-xs italic text-slate-400">{line.stageDirection}</div>
            )}
            <p className="text-sm text-slate-100 leading-relaxed">{line.line}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

interface EncounterDeskProps {
  puzzle: PuzzleSpec;
  alreadySolved: boolean;
  onSolved: (puzzle: PuzzleSpec) => { xp: number; ip: number; kp: number; ep: number } | void;
}

const StoryEncounterDesk: React.FC<EncounterDeskProps> = ({
  puzzle,
  alreadySolved,
  onSolved,
}) => {
  const [input, setInput] = useState<string>('');
  const [solvedNow, setSolvedNow] = useState<boolean>(false);
  const [rewardNotice, setRewardNotice] = useState<string | null>(null);
  const [verdictFeedback, setVerdictFeedback] = useState<{
    ok: boolean;
    verdict?: StrictVerdict;
    text: string;
    weakness?: string;
  } | null>(null);

  useEffect(() => {
    setInput('');
    setSolvedNow(false);
    setRewardNotice(null);
    setVerdictFeedback(null);
  }, [puzzle.id]);

  const isSolved = alreadySolved || solvedNow;

  const handleCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSolved) return;

    const res = verifyPuzzleAnswer(puzzle, input);
    if (res.correct) {
      setSolvedNow(true);
      setVerdictFeedback({
        ok: true,
        verdict: res.verdict,
        text: res.feedback,
      });
      const granted = onSolved(puzzle);
      if (granted && (granted.xp > 0 || granted.ip > 0 || granted.kp > 0)) {
        setRewardNotice(`+${granted.xp} XP · +${granted.ip} IP · +${granted.kp} KP`);
      }
    } else {
      setVerdictFeedback({
        ok: false,
        verdict: res.verdict,
        text: res.feedback,
        weakness: res.weaknessDiagnosis,
      });
    }
  };

  const verdictTone =
    verdictFeedback?.verdict === 'Not yet (weakness found)'
      ? 'border-amber-500/45 bg-amber-500/10 text-amber-100'
      : verdictFeedback?.ok
        ? 'border-emerald-500/45 bg-emerald-500/10 text-emerald-100'
        : 'border-rose-500/45 bg-rose-500/10 text-rose-100';

  return (
    <section
      data-testid={`story-encounter-${puzzle.id}`}
      className="rounded-xl border border-cyan-500/35 bg-[#080D19]/95 p-4 sm:p-5 space-y-3.5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
        <div className="text-[11px] font-mono uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          Field Encounter · {puzzle.title}
        </div>
        <span className="text-[11px] font-mono text-amber-300 tabular-nums">
          +{puzzle.rewards.ip} IP · +{puzzle.rewards.kp} KP
        </span>
      </div>

      <p className="text-xs font-medium text-cyan-200 leading-relaxed">{puzzle.objective}</p>
      <p className="text-xs sm:text-[13px] text-slate-200 leading-relaxed whitespace-pre-line">
        {puzzle.promptBody}
      </p>

      {!isSolved ? (
        <form onSubmit={handleCheck} className="space-y-3 pt-1">
          {puzzle.interactionType === 'multiple_choice' && puzzle.options ? (
            <div className="space-y-2" role="radiogroup" aria-label={puzzle.title}>
              {puzzle.options.map((opt) => {
                const active = input === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setInput(opt.id)}
                    className={`w-full min-h-[44px] px-3 py-2 rounded-lg border text-left transition-colors ${
                      active
                        ? 'border-cyan-400 bg-cyan-500/15 text-white'
                        : 'border-slate-800 bg-[#06080E] text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className="text-xs font-medium">{opt.label}</div>
                    {opt.detail && (
                      <div className="text-[11px] text-slate-400 mt-0.5">{opt.detail}</div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : puzzle.interactionType === 'rubric_synthesis' ? (
            <div className="space-y-1.5">
              <textarea
                rows={3}
                data-testid={`story-encounter-input-${puzzle.id}`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Write 2-3 clear sentences naming the contradiction, unilateral power, and erased futures..."
                className="w-full rounded-lg border border-slate-700 bg-[#06080E] p-3 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
              />
              {puzzle.rubricCriteria && (
                <div className="text-[11px] text-slate-400">
                  Evaluated points: {puzzle.rubricCriteria.map((c) => c.label).join(' · ')}
                </div>
              )}
            </div>
          ) : (
            <input
              type="text"
              data-testid={`story-encounter-input-${puzzle.id}`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter verified value..."
              className="w-full min-h-[44px] rounded-lg border border-slate-700 bg-[#06080E] px-3.5 text-sm font-mono text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
            />
          )}

          {verdictFeedback && (
            <div
              role="status"
              data-testid={`story-encounter-feedback-${puzzle.id}`}
              className={`rounded-lg border px-3 py-2.5 text-xs space-y-1 animate-panel-reveal ${verdictTone}`}
            >
              <div className="font-mono font-semibold flex items-center gap-1.5">
                {verdictFeedback.ok ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>{verdictFeedback.verdict ?? (verdictFeedback.ok ? 'Accepted' : 'Check Reasoning')}</span>
              </div>
              <p className="leading-relaxed">{verdictFeedback.text}</p>
              {verdictFeedback.weakness && !verdictFeedback.ok && (
                <p className="text-[11px] opacity-90">{verdictFeedback.weakness}</p>
              )}
            </div>
          )}

          <div className="flex items-center justify-end">
            <button
              type="submit"
              data-testid={`story-encounter-submit-${puzzle.id}`}
              disabled={!input.trim()}
              className="min-h-[40px] px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap"
            >
              Verify Finding
            </button>
          </div>
        </form>
      ) : (
        <div
          data-testid={`story-encounter-solved-${puzzle.id}`}
          className="border-t border-emerald-500/30 pt-3 space-y-1.5 animate-panel-reveal"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-emerald-300">
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Recorded in Expedition Ledger
            </span>
            {rewardNotice && <span className="text-amber-300 tabular-nums">{rewardNotice}</span>}
          </div>
          <p className="text-xs text-slate-200 leading-relaxed">{puzzle.explanation}</p>
        </div>
      )}
    </section>
  );
};

export const StoryPrologue: React.FC<StoryPrologueProps> = ({
  initialBeatIndex = 0,
  isReplay = false,
  completedStoryEncounterIds = [],
  onBeatViewed,
  onCompleteStoryEncounter,
  onCompleteToTutorial,
  onReturnToAtlas,
}) => {
  const safeInitial = Math.max(0, Math.min(ALL_BEATS.length - 1, initialBeatIndex));
  const [beatIndex, setBeatIndex] = useState<number>(safeInitial);
  const [selectedPromptChoice, setSelectedPromptChoice] = useState<Record<string, string>>({});

  useEffect(() => {
    setBeatIndex(Math.max(0, Math.min(ALL_BEATS.length - 1, initialBeatIndex)));
  }, [initialBeatIndex]);

  const beat = ALL_BEATS[beatIndex] ?? ALL_BEATS[0];
  const isFinalThreshold = beatIndex === ALL_BEATS.length - 1;
  const thresholdIndex = ALL_BEATS.length - 1;
  const themeStyle = THEME_ACCENT[beat.visualTheme] ?? THEME_ACCENT.warm;
  const composition = beat.sceneComposition ?? 'cinematic';

  useEffect(() => {
    onBeatViewed?.(beatIndex, beat);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [beatIndex, beat, onBeatViewed]);

  const goNext = useCallback(() => {
    setBeatIndex((prev) => Math.min(ALL_BEATS.length - 1, prev + 1));
  }, []);

  const goPrev = useCallback(() => {
    setBeatIndex((prev) => Math.max(0, prev - 1));
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = document.activeElement?.tagName;
      if (tag === 'BUTTON' || tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        if (isFinalThreshold) {
          if (isReplay && onReturnToAtlas) {
            onReturnToAtlas();
          } else {
            onCompleteToTutorial();
          }
        } else {
          goNext();
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goNext, goPrev, isFinalThreshold, isReplay, onCompleteToTutorial, onReturnToAtlas]);

  const progressLabel = useMemo(
    () => `Scene ${beatIndex + 1} of ${ALL_BEATS.length}`,
    [beatIndex]
  );

  const activeChoiceId = selectedPromptChoice[beat.id];
  const activeChoiceObj = beat.interactivePrompt?.choices.find((c) => c.id === activeChoiceId);

  const handleEncounterSolved = useCallback(
    (puzzle: PuzzleSpec) => onCompleteStoryEncounter?.(puzzle),
    [onCompleteStoryEncounter]
  );

  const interactiveReflectionBlock = beat.interactivePrompt ? (
    <section className="border-t border-cyan-500/30 pt-3.5 space-y-2.5 max-w-[66ch]">
      <div className="text-xs font-semibold text-cyan-200">{beat.interactivePrompt.question}</div>
      <div className="flex flex-wrap gap-2">
        {beat.interactivePrompt.choices.map((ch) => {
          const active = activeChoiceId === ch.id;
          return (
            <button
              key={ch.id}
              type="button"
              onClick={() =>
                setSelectedPromptChoice((prev) => ({ ...prev, [beat.id]: ch.id }))
              }
              className={`min-h-[40px] px-3.5 py-1.5 rounded-lg border text-xs font-medium text-left transition-colors ${
                active
                  ? 'border-cyan-400 bg-cyan-500/15 text-white'
                  : 'border-slate-700 bg-[#0B101D] text-slate-300 hover:border-slate-500 hover:text-white'
              }`}
            >
              {ch.label}
            </button>
          );
        })}
      </div>
      {activeChoiceObj && (
        <p className="text-xs text-slate-200 leading-relaxed pt-1 border-t border-slate-800/80 animate-panel-reveal">
          {activeChoiceObj.response}
        </p>
      )}
    </section>
  ) : null;

  return (
    <div
      data-testid="story-prologue"
      data-composition={composition}
      className="relative min-h-screen w-full overflow-x-hidden bg-[#06080E] text-slate-100 flex flex-col justify-between"
    >
      {/* Atmospheric Scene Illustration with Measured Scrim */}
      <div className="fixed inset-0 pointer-events-none">
        <img
          key={beat.imagePath}
          src={beat.imagePath}
          alt={beat.imageAlt}
          referrerPolicy="no-referrer"
          className={`h-full w-full object-cover object-center transition-opacity duration-500 ${
            composition === 'broadsheet' ? 'opacity-25' : 'opacity-55'
          }`}
        />
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 78% 30%, ${themeStyle.scrimGlow}, transparent 55%), linear-gradient(95deg, rgba(6,8,14,0.97) 0%, rgba(6,8,14,0.9) 56%, rgba(6,8,14,0.62) 100%)`,
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(6,8,14,0.78) 0%, rgba(6,8,14,0.18) 38%, rgba(6,8,14,0.94) 100%)',
          }}
        />
      </div>

      {/* Top Chapter Progress Strip */}
      <header className="relative z-10 border-b border-slate-800/80 bg-[#06080E]/88">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs font-mono text-slate-300">
            <BookOpen className="w-4 h-4 text-amber-300 shrink-0" />
            <span className="uppercase tracking-[0.14em] text-amber-200/90">
              Chronicle Prologue
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400 tabular-nums" data-testid="prologue-scene-counter">
              {progressLabel}
            </span>
          </div>

          <nav aria-label="Prologue Chapters" className="hidden lg:flex items-center gap-4">
            {CHAPTER_MARKERS.map((ch) => {
              const active = beat.chapterId === ch.id;
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => setBeatIndex(ch.firstIndex)}
                  className={`text-xs font-medium py-1 border-b-2 transition-colors whitespace-nowrap ${
                    active
                      ? 'text-cyan-300 border-cyan-400'
                      : 'text-slate-400 border-transparent hover:text-white'
                  }`}
                >
                  {ch.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2.5">
            {isReplay && onReturnToAtlas ? (
              <button
                type="button"
                onClick={onReturnToAtlas}
                className="min-h-[40px] px-3.5 py-1.5 rounded-lg border border-slate-700 bg-[#0B101D]/90 hover:border-slate-500 text-xs font-medium text-slate-200 whitespace-nowrap"
              >
                Return to Atlas
              </button>
            ) : !isFinalThreshold ? (
              <button
                type="button"
                data-testid="prologue-skip-btn"
                onClick={() => setBeatIndex(thresholdIndex)}
                className="min-h-[40px] px-3.5 py-1.5 rounded-lg border border-slate-700 bg-[#0B101D]/90 hover:border-slate-500 text-xs font-medium text-slate-300 hover:text-white whitespace-nowrap"
              >
                Skip to Threshold
              </button>
            ) : null}
          </div>
        </div>
      </header>

      {/* Main Narrative Beat Content — 4 Distinct Compositions */}
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-4 sm:py-5 flex items-center">
        {composition === 'broadsheet' && (
          <article
            key={beat.id}
            className="w-full rounded-xl border border-[#C9BFA9]/50 bg-[#F4EFE4] text-[#1A1815] shadow-2xl overflow-hidden animate-panel-reveal"
          >
            {/* Archival Masthead */}
            <div className="px-5 sm:px-8 py-4 border-b border-[#C9BFA9] flex flex-wrap items-baseline justify-between gap-2 bg-[#ECE5D5]">
              <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#5C4932]">
                {beat.chapterTag} · {beat.chapterTitle}
              </div>
              <div className="text-[11px] font-mono text-[#6B5B47]">
                Preserved Archival Folio
              </div>
            </div>

            <div className="p-5 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-7 space-y-4">
                <header className="space-y-1.5 border-b border-[#D6CEBC] pb-4">
                  <h1 className="font-display text-2xl sm:text-4xl font-semibold tracking-tight text-[#14120F] leading-[1.12]">
                    {beat.title}
                  </h1>
                  {beat.subtitle && (
                    <p className="text-sm sm:text-base text-[#463F36] leading-relaxed">
                      {beat.subtitle}
                    </p>
                  )}
                </header>

                <div className="space-y-3 text-sm sm:text-[15px] text-[#221F1A] leading-relaxed whitespace-pre-line">
                  {beat.paragraphs.map((para, idx) => (
                    <p key={idx}>{para}</p>
                  ))}
                </div>

                {beat.calloutQuote && (
                  <blockquote className="border-t border-b border-[#B8AA92] py-3.5 my-2">
                    <p className="font-display text-base sm:text-lg font-semibold text-[#181512] leading-snug">
                      {beat.calloutQuote}
                    </p>
                  </blockquote>
                )}

                {beat.reflectionNote && (
                  <p className="text-xs font-mono text-[#5B5246] pt-1">{beat.reflectionNote}</p>
                )}
              </div>

              <div className="lg:col-span-5 space-y-4">
                <figure className="overflow-hidden rounded-lg border border-[#C9BFA9] bg-[#14120F]">
                  <img
                    src={beat.imagePath}
                    alt={beat.imageAlt}
                    referrerPolicy="no-referrer"
                    className="w-full h-48 sm:h-56 object-cover object-center"
                  />
                  <figcaption className="px-3 py-2 text-[11px] font-mono text-[#DCD4C4] bg-[#1C1915]">
                    {beat.imageAlt}
                  </figcaption>
                </figure>

                {beat.historicalRecord && (
                  <aside className="rounded-lg border border-[#BDB199] bg-[#FAF7F0] p-4 space-y-2">
                    <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-[#6D471F]">
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      {beat.historicalRecord.title}
                    </div>
                    <p className="text-xs font-mono text-[#26221C] leading-relaxed">
                      {beat.historicalRecord.body}
                    </p>
                    {beat.historicalRecord.provenanceNote && (
                      <div className="text-[11px] font-mono text-[#6B5B47] border-t border-[#DED6C5] pt-1.5">
                        Source: {beat.historicalRecord.provenanceNote}
                      </div>
                    )}
                  </aside>
                )}
              </div>
            </div>
          </article>
        )}

        {composition === 'confrontation' && (
          <article
            key={beat.id}
            className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-panel-reveal"
          >
            <div className="lg:col-span-7 space-y-4">
              <div className="space-y-1.5">
                <div className={`text-xs font-mono uppercase tracking-[0.16em] ${themeStyle.tag}`}>
                  {beat.chapterTag} · {beat.chapterTitle}
                </div>
                <h1 className="font-display text-2xl sm:text-4xl font-semibold tracking-tight text-white leading-[1.12]">
                  {beat.title}
                </h1>
                {beat.subtitle && (
                  <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-[65ch]">
                    {beat.subtitle}
                  </p>
                )}
              </div>

              <div className="space-y-2.5 text-sm sm:text-[15px] text-slate-200 leading-relaxed max-w-[66ch] whitespace-pre-line">
                {beat.paragraphs.map((para, idx) => (
                  <p key={idx}>{para}</p>
                ))}
              </div>

              {beat.dialogue && beat.dialogue.length > 0 && renderDialogueLines(beat.dialogue)}

              {beat.calloutQuote && (
                <blockquote className="pt-2">
                  <p className={`font-display text-base sm:text-lg font-semibold leading-snug ${themeStyle.quoteText}`}>
                    {beat.calloutQuote}
                  </p>
                </blockquote>
              )}

              {beat.reflectionNote && (
                <p className="text-xs sm:text-sm text-slate-400 font-mono max-w-[66ch]">
                  {beat.reflectionNote}
                </p>
              )}
            </div>

            <div className="lg:col-span-5 space-y-4">
              <figure className="overflow-hidden rounded-xl border border-slate-800 bg-[#080C16]">
                <img
                  src={beat.imagePath}
                  alt={beat.imageAlt}
                  referrerPolicy="no-referrer"
                  className="w-full h-44 sm:h-52 object-cover object-center"
                />
                <figcaption className="px-3.5 py-2 text-[11px] font-mono text-slate-400 border-t border-slate-800/80">
                  {beat.imageAlt}
                </figcaption>
              </figure>

              {beat.encounterPuzzle && (
                <StoryEncounterDesk
                  puzzle={beat.encounterPuzzle}
                  alreadySolved={completedStoryEncounterIds.includes(beat.encounterPuzzle.id)}
                  onSolved={handleEncounterSolved}
                />
              )}
            </div>
          </article>
        )}

        {composition === 'investigation' && (
          <article
            key={beat.id}
            className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-panel-reveal"
          >
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-start gap-4">
                {beat.portraitKey && (
                  <CharacterPortrait
                    portraitKey={beat.portraitKey}
                    speakerName={beat.dialogue?.[0]?.speaker ?? beat.title}
                    size="md"
                  />
                )}
                <div className="space-y-1">
                  <div className={`text-xs font-mono uppercase tracking-[0.16em] ${themeStyle.tag}`}>
                    {beat.chapterTag} · {beat.chapterTitle}
                  </div>
                  <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-white leading-[1.15]">
                    {beat.title}
                  </h1>
                  {beat.subtitle && (
                    <p className="text-sm text-slate-300 leading-relaxed">{beat.subtitle}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2.5 text-sm sm:text-[15px] text-slate-200 leading-relaxed max-w-[66ch] whitespace-pre-line">
                {beat.paragraphs.map((para, idx) => (
                  <p key={idx}>{para}</p>
                ))}
              </div>

              {beat.dialogue && beat.dialogue.length > 0 && renderDialogueLines(beat.dialogue)}
              {interactiveReflectionBlock}

              {beat.reflectionNote && (
                <p className="text-xs sm:text-sm text-slate-400 font-mono max-w-[66ch]">
                  {beat.reflectionNote}
                </p>
              )}
            </div>

            <div className="lg:col-span-5 space-y-4">
              <figure className="overflow-hidden rounded-xl border border-slate-800 bg-[#080C16]">
                <img
                  src={beat.imagePath}
                  alt={beat.imageAlt}
                  referrerPolicy="no-referrer"
                  className="w-full h-40 sm:h-48 object-cover object-center"
                />
              </figure>

              {beat.encounterPuzzle && (
                <StoryEncounterDesk
                  puzzle={beat.encounterPuzzle}
                  alreadySolved={completedStoryEncounterIds.includes(beat.encounterPuzzle.id)}
                  onSolved={handleEncounterSolved}
                />
              )}
            </div>
          </article>
        )}

        {composition === 'cinematic' && (
          <article
            key={beat.id}
            className="w-full grid grid-cols-1 lg:grid-cols-12 gap-7 items-center animate-panel-reveal"
          >
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-start gap-4">
                {beat.portraitKey && (
                  <CharacterPortrait
                    portraitKey={beat.portraitKey}
                    speakerName={beat.dialogue?.[0]?.speaker ?? beat.title}
                    size="md"
                  />
                )}
                <div className="space-y-1">
                  <div className={`text-xs font-mono uppercase tracking-[0.16em] ${themeStyle.tag}`}>
                    {beat.chapterTag} · {beat.chapterTitle}
                  </div>
                  <h1 className="font-display text-2xl sm:text-4xl font-semibold tracking-tight text-white text-balance leading-[1.12]">
                    {beat.title}
                  </h1>
                  {beat.subtitle && (
                    <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-[65ch]">
                      {beat.subtitle}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2.5 text-sm sm:text-[15px] text-slate-200 leading-relaxed max-w-[66ch] whitespace-pre-line">
                {beat.paragraphs.map((para, idx) => (
                  <p key={idx}>{para}</p>
                ))}
              </div>

              {beat.dialogue && beat.dialogue.length > 0 && renderDialogueLines(beat.dialogue)}
              {interactiveReflectionBlock}

              {beat.calloutQuote && (
                <blockquote
                  className={`rounded-lg border px-4 py-3.5 max-w-[66ch] ${themeStyle.quoteBorder} ${themeStyle.quoteBg}`}
                >
                  <p
                    className={`font-display text-base sm:text-lg font-semibold tracking-tight leading-snug ${themeStyle.quoteText}`}
                  >
                    {beat.calloutQuote}
                  </p>
                </blockquote>
              )}

              {beat.reflectionNote && (
                <p className="text-xs sm:text-sm text-slate-400 font-mono max-w-[66ch]">
                  {beat.reflectionNote}
                </p>
              )}
            </div>

            <div className="lg:col-span-5">
              <figure className="overflow-hidden rounded-xl border border-slate-800/90 bg-[#080C16] shadow-2xl">
                <img
                  src={beat.imagePath}
                  alt={beat.imageAlt}
                  referrerPolicy="no-referrer"
                  className="w-full h-56 sm:h-72 lg:h-80 object-cover object-center"
                />
                <figcaption className="px-4 py-2.5 text-xs font-mono text-slate-400 border-t border-slate-800/80">
                  {beat.imageAlt}
                </figcaption>
              </figure>
            </div>
          </article>
        )}
      </main>

      {/* Bottom Controls */}
      <footer className="relative z-10 border-t border-slate-800/80 bg-[#06080E]/92">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 flex-wrap">
            {ALL_BEATS.map((b, idx) => (
              <button
                key={b.id}
                type="button"
                aria-label={`Jump to scene ${idx + 1}: ${b.title}`}
                onClick={() => setBeatIndex(idx)}
                className={`h-2 rounded-full transition-all ${
                  idx === beatIndex
                    ? 'w-7 bg-cyan-400'
                    : idx < beatIndex
                      ? 'w-2.5 bg-slate-500 hover:bg-slate-300'
                      : 'w-2.5 bg-slate-700 hover:bg-slate-500'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            {beatIndex > 0 && (
              <button
                type="button"
                data-testid="prologue-prev-btn"
                onClick={goPrev}
                className="min-h-[44px] px-4 py-2 rounded-lg border border-slate-700 bg-[#0B101D] hover:border-slate-500 text-sm font-medium text-slate-200 inline-flex items-center gap-2 whitespace-nowrap"
              >
                <ArrowLeft className="w-4 h-4" />
                Previous
              </button>
            )}

            {!isFinalThreshold ? (
              <button
                type="button"
                data-testid="prologue-next-btn"
                onClick={goNext}
                className="min-h-[44px] px-6 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : isReplay && onReturnToAtlas ? (
              <>
                <button
                  type="button"
                  onClick={onCompleteToTutorial}
                  className="min-h-[44px] px-5 py-2 rounded-lg border border-slate-700 bg-[#0B101D] hover:border-cyan-500/50 text-sm font-medium text-slate-200 inline-flex items-center gap-2 whitespace-nowrap"
                >
                  Replay Tutorial
                </button>
                <button
                  type="button"
                  data-testid="prologue-finish-btn"
                  onClick={onReturnToAtlas}
                  className="min-h-[44px] px-6 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap"
                >
                  <Compass className="w-4 h-4" />
                  Return to Atlas
                </button>
              </>
            ) : (
              <button
                type="button"
                data-testid="prologue-finish-btn"
                onClick={onCompleteToTutorial}
                className="min-h-[44px] px-6 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap"
              >
                Enter First Expedition
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};
