import React, { memo, useMemo } from 'react';
import { PRIMARY_ATTRIBUTES } from '../engine/attributes';
import { computePlayerAnalytics } from '../engine/progression';
import { GameSaveState } from '../engine/types';

interface ProfileStatsProps {
  save: GameSaveState;
}

const TRAP_LABELS: Record<string, { name: string; guidance: string }> = {
  magnitude_underestimate: {
    name: 'Magnitude Underestimation',
    guidance: 'Verify higher-order growth terms (quadratic/recursive) before locking linear extrapolations.',
  },
  magnitude_overshoot: {
    name: 'Magnitude Overshoot',
    guidance: 'Check conservation bounds and modular base weights so projections stay within constraints.',
  },
  conservation_mismatch: {
    name: 'Spatial Conservation Mismatch',
    guidance: 'Audit active cell counts before checking rotational or reflection alignment.',
  },
  partial_synthesis: {
    name: 'Incomplete Synthesis Coverage',
    guidance: 'Ensure conceptual explanations explicitly address every listed rubric criterion.',
  },
  assumption_trap: {
    name: 'Implicit Assumption Trap',
    guidance: 'Re-read governing rules for non-classical axioms (non-reflexive frames, partial paradoxes, or witness filtering).',
  },
};

export const ProfileStats: React.FC<ProfileStatsProps> = memo(({ save }) => {
  const analytics = useMemo(
    () => computePlayerAnalytics(save),
    [save.performanceHistory, save.mistakePatterns]
  );

  // Radar chart geometry for 9 primary attributes
  const radarW = 440;
  const radarH = 300;
  const cx = radarW / 2;
  const cy = radarH / 2;
  const maxR = 86;

  const { radarPoints, polygonStr } = useMemo(() => {
    const maxAttrScale = Math.max(
      6,
      ...PRIMARY_ATTRIBUTES.map((a) => save.attributes[a.id]?.level ?? 1)
    );
    const pts = PRIMARY_ATTRIBUTES.map((attr, idx) => {
      const angle = (Math.PI * 2 * idx) / PRIMARY_ATTRIBUTES.length - Math.PI / 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const lvl = save.attributes[attr.id]?.level ?? 1;
      const r = (lvl / maxAttrScale) * maxR;
      const anchor: 'start' | 'end' | 'middle' =
        cos > 0.25 ? 'start' : cos < -0.25 ? 'end' : 'middle';
      return {
        label: attr.shortName,
        lvl,
        anchor,
        x: cx + cos * r,
        y: cy + sin * r,
        lx: cx + cos * (maxR + 14),
        ly: cy + sin * (maxR + 14),
        ax: cx + cos * maxR,
        ay: cy + sin * maxR,
      };
    });
    return {
      radarPoints: pts,
      polygonStr: pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '),
    };
  }, [save.attributes, cx, cy]);

  // Time-series chart of efficiency over recent solves
  const history = useMemo(() => save.performanceHistory.slice(-16), [save.performanceHistory]);
  const chartW = 460;
  const chartH = 160;
  const padX = 28;
  const padY = 20;

  const { linePoints, polylineStr } = useMemo(() => {
    const pts = history.map((rec, idx) => {
      const x =
        history.length <= 1
          ? chartW / 2
          : padX + (idx / (history.length - 1)) * (chartW - padX * 2);
      const y = chartH - padY - (rec.efficiencyScore / 100) * (chartH - padY * 2);
      return { x, y, rec };
    });
    return {
      linePoints: pts,
      polylineStr: pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '),
    };
  }, [history]);

  const sortedTraps = useMemo(
    () =>
      Object.entries(save.mistakePatterns ?? {})
        .filter(([, count]) => count > 0)
        .sort((a, b) => b[1] - a[1]),
    [save.mistakePatterns]
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-white">
            Cognitive Profile & Analytics
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Separates invested attribute upgrades from demonstrated puzzle-solving efficiency across disciplines.
          </p>
        </div>
        <div className="text-xs font-mono text-slate-400 tabular-nums">
          Level {save.tubLevel} · Universes Cleared {save.defeatedBossIds.length}/6
        </div>
      </div>

      {/* Explicit epistemic disclaimer required by prompt */}
      <div className="rounded-lg border border-slate-800 bg-[#090D18] px-4 py-3 text-xs text-slate-400">
        Note: Numerical attributes and efficiency indices represent game progression and problem-solving heuristics within TUB: The Infinite Possibility—they are not real-world clinical IQ measurements.
      </div>

      {/* Top KPI Strip */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Solved Puzzles', val: String(analytics.totalSolved) },
          { label: 'First-Attempt', val: `${Math.round(analytics.firstAttemptRate)}%` },
          { label: 'Avg Attempts', val: analytics.averageAttempts.toFixed(2) },
          { label: 'Avg Hints Used', val: analytics.averageHintsUsed.toFixed(2) },
          { label: 'Peak Complexity', val: `${analytics.highestDifficultySolved}/100` },
          { label: 'Mean Efficiency', val: `${Math.round(analytics.averageEfficiency)}%` },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border border-slate-800 bg-[#0B101D] p-4 space-y-1"
          >
            <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
              {kpi.label}
            </div>
            <div className="text-2xl font-mono font-semibold text-white tabular-nums">
              {kpi.val}
            </div>
          </div>
        ))}
      </section>

      {/* Visual Telemetry: Attribute Radar vs Efficiency Timeline */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-5 rounded-xl border border-slate-800 bg-[#0B101D] p-5 flex flex-col items-center justify-between">
          <div className="w-full">
            <h2 className="font-display text-base font-semibold text-white">
              Invested Attribute Balance
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Relative upgrade profile across all 9 cognitive attributes.
            </p>
          </div>

          <svg viewBox={`0 0 ${radarW} ${radarH}`} className="w-full max-w-[360px] my-2">
            {[0.33, 0.66, 1].map((scale) => (
              <circle
                key={scale}
                cx={cx}
                cy={cy}
                r={maxR * scale}
                fill="none"
                stroke="#1E293B"
                strokeWidth="1"
              />
            ))}
            {radarPoints.map((p, i) => (
              <g key={i}>
                <line x1={cx} y1={cy} x2={p.ax} y2={p.ay} stroke="#1E293B" strokeWidth="1" />
                <text
                  x={p.lx}
                  y={p.ly}
                  textAnchor={p.anchor}
                  dominantBaseline="middle"
                  className="fill-slate-300 text-[10px] font-mono"
                >
                  {p.label} ({p.lvl})
                </text>
              </g>
            ))}
            <polygon
              points={polygonStr}
              fill="rgba(6, 182, 212, 0.2)"
              stroke="#22D3EE"
              strokeWidth="2"
            />
          </svg>
        </div>

        <div className="lg:col-span-7 rounded-xl border border-slate-800 bg-[#0B101D] p-5 flex flex-col justify-between space-y-4">
          <div>
            <h2 className="font-display text-base font-semibold text-white">
              Demonstrated Solution Efficiency Over Time
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Tracks actual accuracy and hint independence across solved puzzles (independent of attribute upgrades).
            </p>
          </div>

          {history.length === 0 ? (
            <div className="h-44 rounded-lg border border-slate-800 bg-[#06080E] flex items-center justify-center text-xs text-slate-500">
              Solve at least one puzzle to plot historical reasoning efficiency.
            </div>
          ) : (
            <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-44 rounded-lg border border-slate-800 bg-[#06080E]">
              {[25, 50, 75, 100].map((val) => {
                const y = chartH - padY - (val / 100) * (chartH - padY * 2);
                return (
                  <g key={val}>
                    <line x1={padX} y1={y} x2={chartW - padX} y2={y} stroke="#1E293B" strokeWidth="1" />
                    <text x={6} y={y + 3} className="fill-slate-500 text-[9px] font-mono">
                      {val}
                    </text>
                  </g>
                );
              })}
              {linePoints.length > 1 && (
                <polyline
                  fill="none"
                  stroke="#A78BFA"
                  strokeWidth="2"
                  points={polylineStr}
                />
              )}
              {linePoints.map((pt, i) => (
                <circle key={i} cx={pt.x} cy={pt.y} r="3.5" fill="#22D3EE" />
              ))}
            </svg>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
            <div className="rounded-lg border border-slate-800 bg-[#06080E] p-3">
              <span className="text-slate-400">Strongest Demonstrated Category</span>
              <div className="text-sm font-medium text-emerald-300 mt-1 capitalize">
                {analytics.bestCategory
                  ? `${analytics.bestCategory.category.replace('_', ' ')} (${Math.round(analytics.bestCategory.avgEfficiency)}%)`
                  : 'Pending data'}
              </div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-[#06080E] p-3">
              <span className="text-slate-400">Growth Opportunity Category</span>
              <div className="text-sm font-medium text-amber-300 mt-1 capitalize">
                {analytics.weakestCategory
                  ? `${analytics.weakestCategory.category.replace('_', ' ')} (${Math.round(analytics.weakestCategory.avgEfficiency)}%)`
                  : 'Pending data'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Breakdown Table */}
      {analytics.categoryBreakdown.length > 0 && (
        <section className="rounded-xl border border-slate-800 bg-[#0B101D] p-5 space-y-3">
          <h2 className="font-display text-base font-semibold text-white">
            Category Performance Breakdown
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono">
                  <th className="py-2 pr-4">Category</th>
                  <th className="py-2 pr-4">Solved</th>
                  <th className="py-2 pr-4">Avg Attempts</th>
                  <th className="py-2 pr-4">Avg Hints</th>
                  <th className="py-2">Efficiency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 tabular-nums font-mono">
                {analytics.categoryBreakdown.map((row) => (
                  <tr key={row.category} className="text-slate-200">
                    <td className="py-2.5 pr-4 font-sans capitalize">
                      {row.category.replace('_', ' ')}
                    </td>
                    <td className="py-2.5 pr-4">{row.solvedCount}</td>
                    <td className="py-2.5 pr-4">{row.avgAttempts.toFixed(2)}</td>
                    <td className="py-2.5 pr-4">{row.avgHintsUsed.toFixed(2)}</td>
                    <td className="py-2.5 text-cyan-300">{Math.round(row.avgEfficiency)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Reasoning Traps & Metacognitive Diagnostics */}
      <section className="rounded-xl border border-slate-800 bg-[#0B101D] p-5 space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-base font-semibold text-white">
            Recurring Reasoning Traps & Diagnostic Calibration
          </h2>
          <span className="text-xs font-mono text-slate-400 capitalize">
            Growth Target: {analytics.growthCategory.replace('_', ' ')} · Stretch Peak: {analytics.stretchCategory.replace('_', ' ')}
          </span>
        </div>
        {sortedTraps.length === 0 ? (
          <p className="text-xs text-slate-400">
            No recurring failure signatures recorded yet. Incorrect attempts across chambers will be categorized here to reveal habitual assumptions.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sortedTraps.map(([trapId, count]) => {
              const meta = TRAP_LABELS[trapId] ?? {
                name: trapId.replace('_', ' '),
                guidance: 'Review governing constraints carefully before locking a candidate answer.',
              };
              return (
                <div
                  key={trapId}
                  className="rounded-lg border border-slate-800 bg-[#06080E] p-3.5 space-y-1"
                >
                  <div className="flex items-center justify-between text-xs font-medium text-amber-300">
                    <span className="capitalize">{meta.name}</span>
                    <span className="font-mono tabular-nums text-slate-400">{count}× observed</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{meta.guidance}</p>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
});
