import { useState, useRef } from 'react';
import { toPng } from 'html-to-image';
import { generateSummary } from '../api/claude.js';
import { getWinner, getOverallWinner } from '../utils/metrics.js';

function MetricPill({ metric, countyA, countyB, overall }) {
  const winner = getWinner(metric, countyA, countyB);
  const isNeutral = metric.higherIsBetter === null;
  const aWon = !isNeutral && winner === 'A';
  const bWon = !isNeutral && winner === 'B';
  const overallWinner = overall?.winner;

  const color = isNeutral || winner === 'tie' || winner === null
    ? '#999'
    : (overallWinner === 'A' && aWon) || (overallWinner === 'B' && bWon)
      ? '#b94a2c'
      : '#1a1a1a';

  return { label: metric.shortLabel, color };
}

function ShareCard({ countyA, countyB, scoreA, scoreB, overall, activeMetrics, report, showReport }) {
  const winnerName = overall?.winner === 'A' ? countyA?.name
    : overall?.winner === 'B' ? countyB?.name : null;
  const isTie = overall?.winner === 'tie';

  const metricsToShow = (activeMetrics || []).filter(m => {
    const a = countyA?.[m.key];
    const b = countyB?.[m.key];
    return a != null && b != null;
  });

  const RYE = '"Rye", serif';

  const metricEntries = metricsToShow.map(m => MetricPill({ metric: m, countyA, countyB, overall }));

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      aspectRatio: '1',
      background: 'oklch(0.92 0.04 80)',
      border: '2px solid #1a1a1a',
      boxShadow: '6px 6px 0 0 #1a1a1a',
      borderRadius: 2,
      overflow: 'hidden',
      boxSizing: 'border-box',
      fontFamily: RYE,
    }}>
      {/* Corner stars */}
      {[{top:8,left:8},{top:8,right:8},{bottom:8,left:8},{bottom:8,right:8}].map((pos, i) => (
        <span key={i} style={{ position: 'absolute', ...pos, color: '#b94a2c', fontSize: 12, fontFamily: RYE }}>★</span>
      ))}

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '100%',
        padding: '24px',
        textAlign: 'center',
        boxSizing: 'border-box',
      }}>
        {/* Header label */}
        <div style={{ fontSize: 9, letterSpacing: '0.4em', textTransform: 'uppercase', color: 'rgba(26,26,26,0.6)', fontFamily: RYE }}>
          ★ Official Verdict ★
        </div>

        {/* County names + winner */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ fontFamily: RYE, fontSize: 28, lineHeight: 1.1, color: '#1a1a1a' }}>
            {countyA?.name ?? '—'}
          </div>
          <div style={{ fontFamily: RYE, color: '#b94a2c', letterSpacing: '0.2em', textTransform: 'uppercase', fontSize: 10 }}>
            vs
          </div>
          <div style={{ fontFamily: RYE, fontSize: 28, lineHeight: 1.1, color: '#1a1a1a' }}>
            {countyB?.name ?? '—'}
          </div>
          {winnerName && (
            <div style={{ fontFamily: RYE, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#b94a2c', marginTop: 2 }}>
              {winnerName} Wins!
            </div>
          )}
          {isTie && (
            <div style={{ fontFamily: RYE, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888', marginTop: 2 }}>
              It's a Tie!
            </div>
          )}
        </div>

        {/* Score */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span style={{ fontFamily: RYE, fontSize: 56, color: overall?.winner === 'A' ? '#b94a2c' : '#1a1a1a', lineHeight: 1 }}>{scoreA}</span>
          <span style={{ fontFamily: RYE, fontSize: 24, color: 'rgba(26,26,26,0.3)' }}>–</span>
          <span style={{ fontFamily: RYE, fontSize: 56, color: overall?.winner === 'B' ? '#b94a2c' : '#1a1a1a', lineHeight: 1 }}>{scoreB}</span>
        </div>

        {/* Metric paragraph */}
        {metricEntries.length > 0 && (
          <div style={{ fontSize: 10, lineHeight: 1.6, maxWidth: '85%' }}>
            {metricEntries.map((e, i) => (
              <span key={i} style={{ color: e.color, fontFamily: RYE }}>
                {e.label}{i < metricEntries.length - 1 ? '  ' : ''}
              </span>
            ))}
          </div>
        )}

        {/* Optional report */}
        {showReport && report && (
          <div style={{
            fontSize: 9,
            color: '#555',
            lineHeight: 1.55,
            textAlign: 'center',
            maxWidth: '90%',
            borderTop: '1px dashed #ccc',
            paddingTop: 8,
            fontFamily: '"Work Sans", system-ui, sans-serif',
          }}>
            {report}
          </div>
        )}

        {/* Footer */}
        <div style={{ fontSize: 8, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'black', fontFamily: RYE }}>
          texascountybattle.com
        </div>
      </div>
    </div>
  );
}

export default function SummaryPage({ dataA, dataB, activeMetrics, onBack }) {
  const [tone, setTone] = useState('trash');
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showReportOnCard, setShowReportOnCard] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef(null);

  const overall = dataA && dataB && activeMetrics?.length
    ? getOverallWinner(dataA, dataB, activeMetrics)
    : dataA && dataB ? getOverallWinner(dataA, dataB) : null;
  const scoreA = overall?.scoreA ?? 0;
  const scoreB = overall?.scoreB ?? 0;
  const winnerName = overall?.winner === 'A' ? dataA?.name
    : overall?.winner === 'B' ? dataB?.name : null;

  const modeMap = { trash: 'trash-talk', pro: 'professional', plain: 'plain' };

  async function generate() {
    if (!dataA || !dataB) return;
    setLoading(true);
    setError('');
    setReport('');
    try {
      const text = await generateSummary(dataA, dataB, modeMap[tone], activeMetrics);
      setReport(text);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function downloadPng() {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2 });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${dataA?.name ?? 'county'}-vs-${dataB?.name ?? 'county'}.png`;
      a.click();
    } catch (e) {
      console.error('PNG export failed:', e);
    } finally {
      setDownloading(false);
    }
  }

  async function shareNative() {
    const text = `${dataA?.name} ${scoreA} – ${dataB?.name} ${scoreB}${winnerName ? `. ${winnerName} wins!` : ''} #TexasCountyBattle`;
    const url = `${window.location.origin}${window.location.pathname}?${new URLSearchParams(window.location.search)}`;

    if (navigator.share) {
      try {
        // Try to share the PNG file if supported
        if (cardRef.current && navigator.canShare) {
          const dataUrl = await toPng(cardRef.current, { pixelRatio: 2 });
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          const file = new File([blob], 'county-battle.png', { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: 'Texas County Battle', text, url });
            return;
          }
        }
        await navigator.share({ title: 'Texas County Battle', text, url });
      } catch (e) {
        if (e.name !== 'AbortError') console.error(e);
      }
    } else {
      // Fallback: open X/Twitter share
      const tweet = encodeURIComponent(`${text} ${url}`);
      window.open(`https://twitter.com/intent/tweet?text=${tweet}`, '_blank');
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 md:py-12">
      {/* Verdict header */}
      <div className="mb-8 text-center">
        <div className="font-display text-[10px] uppercase tracking-[0.4em] text-foreground/60">
          ★ The Verdict ★
        </div>
        <h1 className="mt-2 font-display text-4xl text-foreground md:text-5xl">
          {winnerName
            ? <>{winnerName} wins {scoreA > scoreB ? scoreA : scoreB}–{scoreA > scoreB ? scoreB : scoreA}</>
            : <>{dataA?.name ?? '—'} {scoreA} — {dataB?.name ?? '—'} {scoreB}</>
          }
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.1fr_1fr]">
        {/* Left: AI summary */}
        <section>
          {/* Tone toggle */}
          <div className="inline-flex rounded-sm border-2 border-foreground bg-paper p-1 shadow-[3px_3px_0_0_var(--color-foreground)]">
            {[
              { k: 'trash', label: 'Trash Talk 🤠' },
              { k: 'plain', label: 'Plain English 💬' },
              { k: 'pro',   label: 'Pro Report 📋' },
            ].map(t => (
              <button
                key={t.k}
                onClick={() => { setTone(t.k); setReport(''); setError(''); }}
                className={
                  'rounded-sm px-4 py-1.5 font-display text-[11px] uppercase tracking-[0.2em] transition-colors ' +
                  (tone === t.k
                    ? 'bg-foreground text-background'
                    : 'text-foreground/70 hover:text-foreground')
                }
              >
                {t.label}
              </button>
            ))}
          </div>

          <article className="mt-5 rounded-sm border border-foreground/40 bg-card p-6 md:p-8">
            <div className="mb-4 flex items-center justify-between border-b border-dashed border-foreground/30 pb-3">
              <span className="font-display text-[10px] uppercase tracking-[0.3em] text-foreground/60">
                Telegram · No. 0001
              </span>
              <span className="font-display text-[10px] uppercase tracking-[0.3em] text-foreground/60">
                {{ trash: 'Sportscaster', plain: 'Neighbor', pro: 'Analyst' }[tone]}
              </span>
            </div>

            {loading && (
              <div className="space-y-3">
                <div className="h-4 w-full rounded bg-foreground/10 animate-pulse" />
                <div className="h-4 w-5/6 rounded bg-foreground/10 animate-pulse" />
                <div className="h-4 w-4/6 rounded bg-foreground/10 animate-pulse" />
                <div className="h-4 w-5/6 rounded bg-foreground/10 animate-pulse" />
              </div>
            )}

            {error && !loading && (
              <p className="font-serif text-sm text-destructive">{error}</p>
            )}

            {report && !loading && (
              <p className="font-serif text-xl leading-snug text-foreground first-letter:float-left first-letter:mr-2 first-letter:font-display first-letter:text-6xl first-letter:leading-none first-letter:text-clay md:text-2xl">
                {report}
              </p>
            )}

            {!report && !loading && !error && (
              <p className="font-serif text-lg italic text-foreground/40">
                {dataA && dataB ? 'Click Generate to get the verdict…' : 'No county data available.'}
              </p>
            )}

            <div className="mt-6 flex items-center justify-between border-t border-dashed border-foreground/30 pt-3">
              <button
                onClick={generate}
                disabled={loading || !dataA || !dataB}
                className="font-display text-[10px] uppercase tracking-[0.25em] text-clay hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? '…' : report ? '↻ Regenerate' : '→ Generate'}
              </button>
              {report && (
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showReportOnCard}
                    onChange={e => setShowReportOnCard(e.target.checked)}
                    className="accent-clay"
                  />
                  <span className="font-display text-[10px] uppercase tracking-[0.2em] text-foreground/50">
                    Add to card
                  </span>
                </label>
              )}
            </div>
          </article>

          <div className="mt-6">
            <button
              onClick={onBack}
              className="font-display text-xs uppercase tracking-[0.25em] text-foreground/70 hover:text-foreground transition-colors"
            >
              ← Run another battle
            </button>
          </div>
        </section>

        {/* Right: share card */}
        <section>
          <div className="mb-3 font-display text-[10px] uppercase tracking-[0.3em] text-foreground/60">
            ★ Share Card Preview ★
          </div>

          <div ref={cardRef}>
            <ShareCard
              countyA={dataA}
              countyB={dataB}
              scoreA={scoreA}
              scoreB={scoreB}
              overall={overall}
              activeMetrics={activeMetrics}
              report={report}
              showReport={showReportOnCard}
            />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <button
              onClick={downloadPng}
              disabled={downloading || !dataA || !dataB}
              className="rounded-sm border-2 border-foreground bg-paper px-2 py-2.5 font-display text-[10px] uppercase tracking-[0.2em] shadow-[3px_3px_0_0_var(--color-foreground)] transition-transform hover:-translate-y-0.5 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {downloading ? '…' : 'Download PNG'}
            </button>
            <button
              onClick={shareNative}
              disabled={!dataA || !dataB}
              className="rounded-sm border-2 border-foreground bg-clay px-2 py-2.5 font-display text-[10px] uppercase tracking-[0.2em] text-background shadow-[3px_3px_0_0_var(--color-foreground)] transition-transform hover:-translate-y-0.5 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              Share ↗
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
