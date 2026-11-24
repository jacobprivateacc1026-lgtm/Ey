import React, { useEffect, useState } from 'react';
import { Check, Eye, GitCompareArrows, ListChecks, Scale, ShieldAlert } from 'lucide-react';
import { WorkspaceMetadata, WorkspaceMode } from '../engine/types';

interface ScdWorkspacesProps {
  workspace: WorkspaceMetadata;
}

const MODE_META: Record<
  WorkspaceMode,
  { badgeText: string; icon: React.ReactNode; accentText: string; accentBorder: string }
> = {
  war_table: {
    badgeText: 'Allocation & Constraint Table',
    icon: <Scale className="w-3.5 h-3.5" />,
    accentText: 'text-amber-300',
    accentBorder: 'border-amber-500/35',
  },
  tactical_shift: {
    badgeText: 'Comparative Framing Desk',
    icon: <GitCompareArrows className="w-3.5 h-3.5" />,
    accentText: 'text-cyan-300',
    accentBorder: 'border-cyan-500/35',
  },
  commit_plan: {
    badgeText: 'Sequential Lock Checklist',
    icon: <ListChecks className="w-3.5 h-3.5" />,
    accentText: 'text-emerald-300',
    accentBorder: 'border-emerald-500/35',
  },
  cat_mouse: {
    badgeText: 'Adversarial Trace Ledger',
    icon: <ShieldAlert className="w-3.5 h-3.5" />,
    accentText: 'text-rose-300',
    accentBorder: 'border-rose-500/35',
  },
  social_reading: {
    badgeText: 'Claim & Motive Audit',
    icon: <Eye className="w-3.5 h-3.5" />,
    accentText: 'text-violet-300',
    accentBorder: 'border-violet-500/35',
  },
  rule_shift: {
    badgeText: 'Invariant & Frame Shift',
    icon: <GitCompareArrows className="w-3.5 h-3.5" />,
    accentText: 'text-sky-300',
    accentBorder: 'border-sky-500/35',
  },
};

export const ScdWorkspaces: React.FC<ScdWorkspacesProps> = ({ workspace }) => {
  const [flaggedIndices, setFlaggedIndices] = useState<number[]>([]);
  const [checkedKeys, setCheckedKeys] = useState<string[]>([]);
  const [mobileSide, setMobileSide] = useState<'left' | 'right'>('left');

  useEffect(() => {
    setFlaggedIndices([]);
    setCheckedKeys([]);
    setMobileSide('left');
  }, [workspace.headline, workspace.mode]);

  const meta = MODE_META[workspace.mode] ?? MODE_META.war_table;

  const toggleFlag = (idx: number) => {
    setFlaggedIndices((prev) =>
      prev.includes(idx) ? prev.filter((x) => x !== idx) : [...prev, idx]
    );
  };

  const toggleKey = (key: string) => {
    setCheckedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const hasColumns =
    Boolean(workspace.leftItems?.length) || Boolean(workspace.rightItems?.length);
  const hasRows = Boolean(workspace.rows?.length);

  return (
    <section
      aria-label="Structural analysis bench"
      data-testid={`workspace-${workspace.mode}`}
      className={`rounded-lg border ${meta.accentBorder} bg-[#070B14] overflow-hidden`}
    >
      {/* Top Bench Strip */}
      <div className="px-4 py-2.5 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 bg-[#090E1B]">
        <div className={`inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider ${meta.accentText}`}>
          {meta.icon}
          <span>{meta.badgeText}</span>
        </div>
        <div className="text-xs font-medium text-slate-200">{workspace.headline}</div>
      </div>

      {/* Columnar Comparison View (tactical_shift, war_table columns, rule_shift columns) */}
      {hasColumns && (
        <div className="p-3.5 space-y-2.5">
          {/* Mobile toggle when both columns present */}
          {workspace.leftItems && workspace.rightItems && (
            <div className="sm:hidden grid grid-cols-2 border border-slate-800 rounded-md overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => setMobileSide('left')}
                className={`min-h-[40px] px-2.5 py-1.5 font-medium ${
                  mobileSide === 'left'
                    ? 'bg-cyan-500/15 text-cyan-200'
                    : 'bg-[#060912] text-slate-400'
                }`}
              >
                {workspace.leftColumnTitle ?? 'View A'}
              </button>
              <button
                type="button"
                onClick={() => setMobileSide('right')}
                className={`min-h-[40px] px-2.5 py-1.5 font-medium border-l border-slate-800 ${
                  mobileSide === 'right'
                    ? 'bg-amber-500/15 text-amber-200'
                    : 'bg-[#060912] text-slate-400'
                }`}
              >
                {workspace.rightColumnTitle ?? 'View B'}
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {workspace.leftItems && (
              <div
                className={`space-y-1.5 ${
                  workspace.rightItems && mobileSide !== 'left' ? 'hidden sm:block' : 'block'
                }`}
              >
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-800/80">
                  {workspace.leftColumnTitle ?? 'Baseline'}
                </div>
                <ul className="divide-y divide-slate-800/60">
                  {workspace.leftItems.map((item, idx) => {
                    const key = `L-${idx}`;
                    const checked = checkedKeys.includes(key);
                    return (
                      <li key={key}>
                        <button
                          type="button"
                          onClick={() => toggleKey(key)}
                          className={`w-full min-h-[40px] py-2 px-1 text-left text-xs flex items-start gap-2 transition-colors ${
                            checked ? 'text-cyan-200' : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          <span
                            className={`mt-0.5 w-4 h-4 rounded border shrink-0 inline-flex items-center justify-center ${
                              checked
                                ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300'
                                : 'border-slate-700 text-transparent'
                            }`}
                          >
                            <Check className="w-3 h-3" />
                          </span>
                          <span className="leading-relaxed">{item}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {workspace.rightItems && (
              <div
                className={`space-y-1.5 ${
                  workspace.leftItems && mobileSide !== 'right' ? 'hidden sm:block' : 'block'
                }`}
              >
                <div className="text-[11px] font-mono uppercase tracking-wider text-amber-300/90 pb-1 border-b border-slate-800/80">
                  {workspace.rightColumnTitle ?? 'Active Counter / Shift'}
                </div>
                <ul className="divide-y divide-slate-800/60">
                  {workspace.rightItems.map((item, idx) => {
                    const key = `R-${idx}`;
                    const checked = checkedKeys.includes(key);
                    return (
                      <li key={key}>
                        <button
                          type="button"
                          onClick={() => toggleKey(key)}
                          className={`w-full min-h-[40px] py-2 px-1 text-left text-xs flex items-start gap-2 transition-colors ${
                            checked ? 'text-amber-200' : 'text-slate-200 hover:text-white'
                          }`}
                        >
                          <span
                            className={`mt-0.5 w-4 h-4 rounded border shrink-0 inline-flex items-center justify-center ${
                              checked
                                ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                                : 'border-slate-700 text-transparent'
                            }`}
                          >
                            <Check className="w-3 h-3" />
                          </span>
                          <span className="leading-relaxed">{item}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Structured Comparison Rows (war_table, commit_plan, cat_mouse, social_reading, rule_shift) */}
      {hasRows && (
        <div className="divide-y divide-slate-800/70">
          {workspace.rows!.map((row, idx) => {
            const flagged = flaggedIndices.includes(idx);
            const actionLabel =
              workspace.mode === 'commit_plan'
                ? flagged
                  ? 'Locked'
                  : 'Verify Step'
                : workspace.mode === 'social_reading'
                  ? flagged
                    ? 'Audited'
                    : 'Flag Tension'
                  : flagged
                    ? 'Pinned'
                    : 'Focus';
            return (
              <div
                key={row.label}
                className={`px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors ${
                  flagged ? 'bg-cyan-500/5' : 'bg-transparent'
                }`}
              >
                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                    <span className="text-xs font-semibold text-white">{row.label}</span>
                    <span className="text-xs font-mono text-cyan-300 tabular-nums">
                      {row.primary}
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 leading-relaxed">{row.secondary}</div>
                  {row.note && (
                    <div className="text-[11px] font-mono text-amber-300/90">{row.note}</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => toggleFlag(idx)}
                  className={`min-h-[38px] px-3 py-1 rounded border text-[11px] font-mono whitespace-nowrap shrink-0 transition-colors ${
                    flagged
                      ? 'border-cyan-400/70 bg-cyan-500/15 text-cyan-200'
                      : 'border-slate-700 bg-[#0B101D] text-slate-300 hover:border-slate-500 hover:text-white'
                  }`}
                >
                  {actionLabel}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer Method Note */}
      {workspace.tacticalNote && (
        <div className="px-4 py-2 border-t border-slate-800/70 bg-[#060911] text-[11px] text-slate-400 leading-relaxed">
          {workspace.tacticalNote}
        </div>
      )}
    </section>
  );
};
