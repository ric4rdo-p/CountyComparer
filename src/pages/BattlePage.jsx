import { useState } from 'react';
import { getWinner, getOverallWinner } from '../utils/metrics.js';

const CLAY_MONO = 'oklch(0.6 0.13 40)';
const SAGE_MONO = 'oklch(0.45 0.06 240)';

function Crest({ name, mono }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="grid h-14 w-14 place-items-center rounded-full border-2 border-foreground font-display text-xl text-background flex-shrink-0"
        style={{ background: mono }}
      >
        {name?.[0] ?? '?'}
      </div>
      <div>
        <div className="font-display text-[10px] uppercase tracking-[0.25em] text-foreground/60">
          County
        </div>
        <div className="font-serif text-2xl leading-tight">{name ?? '—'}</div>
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <li className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-2 py-4 md:gap-6 md:px-4">
      <div className="flex justify-end">
        <div className="h-8 w-24 rounded bg-foreground/10 animate-pulse" />
      </div>
      <div className="min-w-[120px] text-center md:min-w-[180px]">
        <div className="mx-auto h-3 w-28 rounded bg-foreground/10 animate-pulse" />
      </div>
      <div className="flex justify-start">
        <div className="h-8 w-24 rounded bg-foreground/10 animate-pulse" />
      </div>
    </li>
  );
}

function MetricRow({ metric, countyA, countyB }) {
  const a = countyA?.[metric.key];
  const b = countyB?.[metric.key];
  const winner = countyA && countyB ? getWinner(metric, countyA, countyB) : null;

  const isNeutral = metric.higherIsBetter === null;
  const isOneSided = countyA && countyB && (a != null) !== (b != null);
  const isTie = !isOneSided && !isNeutral && winner === 'tie';
  const leftWins = !isOneSided && !isNeutral && winner === 'A';
  const rightWins = !isOneSided && !isNeutral && winner === 'B';

  const oneSidedCounty = isOneSided
    ? (a != null ? countyA.name : countyB.name)
    : null;

  const leftValueClass = isOneSided
    ? 'text-foreground/30'
    : isNeutral
      ? 'text-clay'
      : leftWins ? 'text-foreground' : 'text-foreground/40';

  const rightValueClass = isOneSided
    ? 'text-foreground/30'
    : isNeutral
      ? 'text-clay'
      : rightWins ? 'text-foreground' : 'text-foreground/40';

  return (
    <li className={`grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-2 py-4 md:gap-6 md:px-4 ${isOneSided ? 'bg-foreground/5' : isNeutral ? 'bg-clay/5' : ''}`}>
      {/* Left value (County A) */}
      <div className={`text-right ${leftValueClass}`}>
        <div className={`font-serif text-2xl md:text-3xl ${leftWins ? 'decoration-sage decoration-[3px] underline underline-offset-[6px]' : ''}`}>
          {a != null ? metric.format(a) : '—'}
        </div>
        {leftWins && (
          <div className="mt-1 inline-block rounded-sm bg-sage px-1.5 py-0.5 font-display text-[9px] uppercase tracking-widest text-background">
            Winner
          </div>
        )}
        {isTie && a != null && (
          <div className="mt-1 inline-block rounded-sm bg-foreground/40 px-1.5 py-0.5 font-display text-[9px] uppercase tracking-widest text-background">
            Tie
          </div>
        )}
        {isNeutral && a != null && (
          <div className="mt-1 inline-block rounded-sm bg-clay px-1.5 py-0.5 font-display text-[9px] uppercase tracking-widest text-background">
            Neutral
          </div>
        )}
      </div>

      {/* Label */}
      <div className="min-w-[120px] text-center md:min-w-[180px]">
        <div className={`font-display text-[10px] uppercase tracking-[0.25em] ${isOneSided ? 'text-foreground/40' : 'text-foreground/70'}`}>
          {metric.label}
        </div>
        {metric.description && (
          <div className="mt-1 text-[11px] text-foreground/60 font-medium leading-snug max-w-[170px] mx-auto">
            {metric.description}
          </div>
        )}
        <div className="mt-1 text-[10px] text-foreground/30">{metric.source}</div>
        {isOneSided && (
          <div className="mt-1 font-display text-[9px] uppercase tracking-widest text-foreground/40 italic">
            Only available for {oneSidedCounty} · not counted
          </div>
        )}
      </div>

      {/* Right value (County B) */}
      <div className={`text-left ${rightValueClass}`}>
        <div className={`font-serif text-2xl md:text-3xl ${rightWins ? 'decoration-sage decoration-[3px] underline underline-offset-[6px]' : ''}`}>
          {b != null ? metric.format(b) : '—'}
        </div>
        {rightWins && (
          <div className="mt-1 inline-block rounded-sm bg-sage px-1.5 py-0.5 font-display text-[9px] uppercase tracking-widest text-background">
            Winner
          </div>
        )}
        {isTie && b != null && (
          <div className="mt-1 inline-block rounded-sm bg-foreground/40 px-1.5 py-0.5 font-display text-[9px] uppercase tracking-widest text-background">
            Tie
          </div>
        )}
        {isNeutral && b != null && (
          <div className="mt-1 inline-block rounded-sm bg-clay px-1.5 py-0.5 font-display text-[9px] uppercase tracking-widest text-background">
            Neutral
          </div>
        )}
      </div>
    </li>
  );
}

export default function BattlePage({
  dataA, dataB, loadingA, loadingB,
  activeMetrics,
  onVerdict, onBack,
}) {
  const groups = ['All', ...new Set((activeMetrics || []).map(m => m.group))];
  const [activeTab, setActiveTab] = useState('All');

  const overall = dataA && dataB && activeMetrics?.length
    ? getOverallWinner(dataA, dataB, activeMetrics)
    : null;
  const leftScore = overall?.scoreA ?? 0;
  const rightScore = overall?.scoreB ?? 0;

  const nameA = dataA?.name ?? '—';
  const nameB = dataB?.name ?? '—';

  const metrics = activeMetrics || [];
  const visibleMetrics = activeTab === 'All'
    ? metrics
    : metrics.filter(m => m.group === activeTab);

  const isLoading = loadingA || loadingB;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 pb-28 md:py-12">
      {/* Scoreboard */}
      <section className="rounded-sm border-2 border-foreground bg-paper p-5 shadow-[6px_6px_0_0_var(--color-foreground)] md:p-7">
        <div className="mb-3 flex items-center justify-between font-display text-[10px] uppercase tracking-[0.3em] text-foreground/60">
          <span>★ Round 1 of 1 ★</span>
          <span>Live Scoreboard</span>
        </div>
        <div className="flex flex-col items-stretch gap-4 md:flex-row md:items-center md:justify-between">
          <Crest name={nameA} mono={CLAY_MONO} />
          <div className="flex items-center justify-center gap-4 font-display">
            <span className={`text-5xl md:text-6xl ${overall?.winner === 'A' ? 'text-clay' : overall?.winner === 'B' ? 'text-foreground' : 'text-foreground/50'}`}>{leftScore}</span>
            <span className="text-2xl text-foreground/40">–</span>
            <span className={`text-5xl md:text-6xl ${overall?.winner === 'B' ? 'text-clay' : overall?.winner === 'A' ? 'text-foreground' : 'text-foreground/50'}`}>{rightScore}</span>
          </div>
          <div className="flex justify-end">
            <Crest name={nameB} mono={SAGE_MONO} />
          </div>
        </div>
      </section>

      {/* Group tabs */}
      <div className="mt-6 flex flex-wrap gap-1 border-b border-foreground/30">
        {groups.map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={
              'px-4 py-2 font-display text-[11px] uppercase tracking-[0.2em] transition-colors ' +
              (activeTab === t
                ? 'border-b-2 border-clay text-foreground'
                : 'text-foreground/50 hover:text-foreground')
            }
          >
            {t}
          </button>
        ))}
      </div>

      {/* Back link */}
      <div className="mt-3 mb-1">
        <button
          onClick={onBack}
          className="font-display text-[10px] uppercase tracking-[0.25em] text-foreground/50 hover:text-foreground transition-colors"
        >
          ← Change metrics
        </button>
      </div>

      {/* Metrics table */}
      <section className="mt-2 overflow-hidden rounded-sm">
        <ul className="divide-y divide-foreground/15">
          {isLoading
            ? Array.from({ length: metrics.length || 6 }).map((_, i) => <SkeletonRow key={i} />)
            : visibleMetrics.map(m => (
                <MetricRow key={m.key} metric={m} countyA={dataA} countyB={dataB} />
              ))
          }
        </ul>
      </section>

      {/* Legend */}
      <div className="mt-4 mb-8 md:mb-16 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-sm border border-foreground/15 bg-paper px-4 py-3">
        <span className="font-display text-[9px] uppercase tracking-[0.25em] text-foreground/40">Legend</span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block rounded-sm bg-sage px-1.5 py-0.5 font-display text-[9px] uppercase tracking-widest text-background">Winner</span>
          <span className="text-[11px] text-foreground/50">This county scored better on a directional metric</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block rounded-sm bg-foreground/40 px-1.5 py-0.5 font-display text-[9px] uppercase tracking-widest text-background">Tie</span>
          <span className="text-[11px] text-foreground/50">Both counties scored exactly the same on this metric</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block rounded-sm bg-clay px-1.5 py-0.5 font-display text-[9px] uppercase tracking-widest text-background">Neutral</span>
          <span className="text-[11px] text-foreground/50">No winner — there's no objectively better direction for this stat (e.g. demographics, industry mix)</span>
        </span>
      </div>

      {/* Sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-foreground bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <span className="font-display text-[11px] uppercase tracking-[0.25em] text-foreground/70">
            {overall
              ? `Final tally · ${nameA} ${leftScore} · ${nameB} ${rightScore}`
              : 'Loading scores…'
            }
          </span>
          <button
            onClick={onVerdict}
            disabled={!dataA || !dataB}
            className="inline-flex items-center gap-2 rounded-sm border-2 border-foreground bg-clay px-5 py-2.5 font-display text-xs uppercase tracking-[0.2em] text-primary-foreground shadow-[3px_3px_0_0_var(--color-foreground)] disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[5px_5px_0_0_var(--color-foreground)] transition-shadow"
          >
            See the Verdict <span>→</span>
          </button>
        </div>
      </div>
    </main>
  );
}
