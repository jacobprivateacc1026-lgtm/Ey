import React, { useMemo, useState } from 'react';
import { Link2, Pin, Plus, Trash2 } from 'lucide-react';
import {
  EvidenceBoardState,
  EvidenceLink,
  EvidencePin,
  EvidenceRelation,
  GameSaveState,
  PuzzleSpec,
} from '../engine/types';

interface EvidenceBoardProps {
  puzzle: PuzzleSpec;
  save: GameSaveState;
  onSaveBoard: (board: EvidenceBoardState) => void;
}

const RELATION_LABEL: Record<EvidenceRelation, string> = {
  supports: 'supports',
  contradicts: 'contradicts',
  tests: 'tests against',
};

export const EvidenceBoard: React.FC<EvidenceBoardProps> = ({
  puzzle,
  save,
  onSaveBoard,
}) => {
  const initialBoard: EvidenceBoardState = save.evidenceBoards?.[puzzle.id] ?? {
    puzzleId: puzzle.id,
    pins: [],
    links: [],
    hypothesisDraft: '',
  };

  const [fromPinId, setFromPinId] = useState<string>('');
  const [toPinId, setToPinId] = useState<string>('');
  const [relation, setRelation] = useState<EvidenceRelation>('contradicts');
  const [customLabel, setCustomLabel] = useState<string>('');

  const wmLevel = save.attributes.working_memory?.level ?? 1;
  const workspaceRank = save.abilities['mental_workspace'] ?? 0;
  const pinCapacity = 4 + wmLevel + workspaceRank * 2;

  const availableSources = useMemo(() => {
    const list: { sourceId: string; label: string; excerpt: string }[] = [];
    puzzle.sceneObjects?.forEach((o) =>
      list.push({
        sourceId: `obj:${o.id}`,
        label: o.label,
        excerpt: `${o.locationNote}: ${o.observation}`,
      })
    );
    puzzle.documents?.forEach((d) =>
      list.push({
        sourceId: `doc:${d.id}`,
        label: d.title,
        excerpt: `${d.source} — ${d.excerpt}`,
      })
    );
    puzzle.visualData?.premises?.forEach((p, idx) =>
      list.push({
        sourceId: `prem:${idx}`,
        label: `Statement ${idx + 1}`,
        excerpt: p,
      })
    );
    return list;
  }, [puzzle.sceneObjects, puzzle.documents, puzzle.visualData?.premises]);

  const pinSource = (src: { sourceId: string; label: string; excerpt: string }) => {
    if (initialBoard.pins.some((p) => p.sourceId === src.sourceId)) return;
    if (initialBoard.pins.length >= pinCapacity) return;
    const nextPin: EvidencePin = {
      id: `pin_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      sourceId: src.sourceId,
      label: src.label,
      excerpt: src.excerpt,
    };
    onSaveBoard({
      ...initialBoard,
      pins: [...initialBoard.pins, nextPin],
    });
  };

  const addCustomPin = () => {
    const clean = customLabel.trim();
    if (!clean || initialBoard.pins.length >= pinCapacity) return;
    const nextPin: EvidencePin = {
      id: `pin_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      sourceId: `note:${Date.now()}`,
      label: clean.slice(0, 48),
      excerpt: clean,
    };
    setCustomLabel('');
    onSaveBoard({
      ...initialBoard,
      pins: [...initialBoard.pins, nextPin],
    });
  };

  const removePin = (pinId: string) => {
    onSaveBoard({
      ...initialBoard,
      pins: initialBoard.pins.filter((p) => p.id !== pinId),
      links: initialBoard.links.filter((l) => l.fromPinId !== pinId && l.toPinId !== pinId),
    });
  };

  const createLink = () => {
    if (!fromPinId || !toPinId || fromPinId === toPinId) return;
    const exists = initialBoard.links.some(
      (l) => l.fromPinId === fromPinId && l.toPinId === toPinId && l.relation === relation
    );
    if (exists) return;
    const link: EvidenceLink = {
      id: `lnk_${Date.now()}`,
      fromPinId,
      toPinId,
      relation,
    };
    onSaveBoard({
      ...initialBoard,
      links: [...initialBoard.links, link],
    });
  };

  return (
    <section
      data-testid="evidence-board"
      className="rounded-xl border border-slate-800 bg-[#0B101D] p-4 sm:p-5 space-y-4"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Pin className="w-4 h-4 text-cyan-400" />
          <h2 className="font-display text-sm font-semibold text-white">
            Evidence Board
          </h2>
        </div>
        <span className="text-[11px] font-mono text-slate-400 tabular-nums">
          {initialBoard.pins.length}/{pinCapacity} Pinned
        </span>
      </div>

      {/* Source Quick-Pin Strip (neutral unhighlighted exhibits) */}
      {availableSources.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[11px] font-mono text-slate-400">
            Pin exhibits or statements to compare side by side:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {availableSources.map((src) => {
              const alreadyPinned = initialBoard.pins.some((p) => p.sourceId === src.sourceId);
              return (
                <button
                  key={src.sourceId}
                  type="button"
                  disabled={alreadyPinned || initialBoard.pins.length >= pinCapacity}
                  onClick={() => pinSource(src)}
                  className={`min-h-[34px] px-2.5 py-1 rounded border text-[11px] inline-flex items-center gap-1 transition-colors ${
                    alreadyPinned
                      ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200'
                      : 'border-slate-800 bg-[#06080E] text-slate-300 hover:border-slate-600 disabled:opacity-45'
                  }`}
                >
                  <Plus className="w-3 h-3" />
                  {src.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Custom Claim Pin */}
      <div className="flex gap-2">
        <input
          type="text"
          value={customLabel}
          onChange={(e) => setCustomLabel(e.target.value)}
          placeholder="Add observation or premise note to pin..."
          className="flex-1 min-h-[38px] rounded-md border border-slate-800 bg-[#06080E] px-3 text-xs text-white placeholder:text-slate-500"
        />
        <button
          type="button"
          onClick={addCustomPin}
          disabled={!customLabel.trim() || initialBoard.pins.length >= pinCapacity}
          className="min-h-[38px] px-3 rounded-md border border-slate-700 bg-[#090E1A] hover:border-cyan-500/50 disabled:opacity-40 text-xs text-slate-200"
        >
          Pin Note
        </button>
      </div>

      {/* Pinned Cards */}
      {initialBoard.pins.length > 0 && (
        <div className="space-y-2">
          {initialBoard.pins.map((pin) => (
            <div
              key={pin.id}
              className="rounded-lg border border-slate-800 bg-[#06080E] p-2.5 flex items-start justify-between gap-2"
            >
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white">{pin.label}</div>
                <div className="text-[11px] text-slate-400 leading-snug mt-0.5">
                  {pin.excerpt}
                </div>
              </div>
              <button
                type="button"
                aria-label={`Unpin ${pin.label}`}
                onClick={() => removePin(pin.id)}
                className="min-h-[32px] min-w-[32px] inline-flex items-center justify-center text-slate-500 hover:text-rose-300"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Link Builder */}
      {initialBoard.pins.length >= 2 && (
        <div className="border-t border-slate-800/80 pt-3 space-y-2">
          <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5 text-cyan-400" />
            Link Pinned Claims
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <select
              value={fromPinId}
              onChange={(e) => setFromPinId(e.target.value)}
              aria-label="Source claim"
              className="min-h-[38px] rounded border border-slate-800 bg-[#06080E] px-2 text-xs text-slate-200"
            >
              <option value="">First claim...</option>
              {initialBoard.pins.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>

            <select
              value={relation}
              onChange={(e) => setRelation(e.target.value as EvidenceRelation)}
              aria-label="Relationship type"
              className="min-h-[38px] rounded border border-slate-800 bg-[#06080E] px-2 text-xs text-cyan-200"
            >
              <option value="contradicts">contradicts</option>
              <option value="supports">supports</option>
              <option value="tests">tests against</option>
            </select>

            <select
              value={toPinId}
              onChange={(e) => setToPinId(e.target.value)}
              aria-label="Target claim"
              className="min-h-[38px] rounded border border-slate-800 bg-[#06080E] px-2 text-xs text-slate-200"
            >
              <option value="">Second claim...</option>
              {initialBoard.pins.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={createLink}
              disabled={!fromPinId || !toPinId || fromPinId === toPinId}
              className="min-h-[38px] px-3 rounded bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 disabled:opacity-40 text-xs font-medium text-white transition-colors"
            >
              Link
            </button>
          </div>

          {initialBoard.links.length > 0 && (
            <ul className="space-y-1 pt-1">
              {initialBoard.links.map((lnk) => {
                const a = initialBoard.pins.find((p) => p.id === lnk.fromPinId);
                const b = initialBoard.pins.find((p) => p.id === lnk.toPinId);
                if (!a || !b) return null;
                return (
                  <li
                    key={lnk.id}
                    className="flex items-center justify-between gap-2 rounded border border-slate-800/80 bg-[#06080E] px-2.5 py-1.5 text-[11px] text-slate-300"
                  >
                    <span>
                      <strong className="text-white">{a.label}</strong>{' '}
                      <span className="font-mono text-amber-300">{RELATION_LABEL[lnk.relation]}</span>{' '}
                      <strong className="text-white">{b.label}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onSaveBoard({
                          ...initialBoard,
                          links: initialBoard.links.filter((l) => l.id !== lnk.id),
                        })
                      }
                      className="text-slate-500 hover:text-rose-300"
                    >
                      Remove
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* Working Hypothesis Draft */}
      <label className="block space-y-1 border-t border-slate-800/80 pt-3">
        <span className="text-[11px] font-mono text-slate-400">
          Working Hypothesis (saved locally per chamber)
        </span>
        <textarea
          rows={2}
          value={initialBoard.hypothesisDraft}
          onChange={(e) =>
            onSaveBoard({
              ...initialBoard,
              hypothesisDraft: e.target.value,
            })
          }
          placeholder="State the rule or explanation you are testing right now..."
          className="w-full rounded-lg border border-slate-800 bg-[#06080E] p-2.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400"
        />
      </label>
    </section>
  );
};
