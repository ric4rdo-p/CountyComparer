import { useState, useEffect, useCallback, useMemo } from 'react';
import { getAllTexasCounties } from './api/census.js';
import { getCountyDataSafe } from './api/county.js';
import { METRICS } from './utils/metrics.js';
import { PRESETS } from './utils/presets.js';
import { normalizeCountyName } from '../shared/helpers.js';
import PickerPage from './pages/PickerPage.jsx';
import MetricsPage from './pages/MetricsPage.jsx';
import BattlePage from './pages/BattlePage.jsx';
import SummaryPage from './pages/SummaryPage.jsx';

const PAGES = ['picker', 'metrics', 'battle', 'summary'];

function Nav({ page, setPage }) {
  const items = [
    { key: 'picker',  label: '01 · Pick' },
    { key: 'metrics', label: '02 · Metrics' },
    { key: 'battle',  label: '03 · Battle' },
    { key: 'summary', label: '04 · Verdict' },
  ];

  return (
    <div className="sticky top-0 z-50 w-full border-b border-foreground/20 bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5">
        <span className="font-display text-xs tracking-widest text-foreground/70">
          ★ TX COUNTY BATTLE ★
        </span>
        <nav className="flex items-center gap-1 text-[11px] uppercase tracking-widest">
          {items.map(it => (
            <button
              key={it.key}
              onClick={() => setPage(it.key)}
              className={
                'rounded px-2.5 py-1 transition-colors ' +
                (page === it.key
                  ? 'bg-foreground text-background'
                  : 'text-foreground/60 hover:text-foreground')
              }
            >
              {it.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

function syncUrl(a, b, page) {
  const params = new URLSearchParams();
  if (a) params.set('a', a);
  if (b) params.set('b', b);
  if (page) params.set('page', page);
  window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
}

function enrichCountyData(data, customs) {
  if (!data) return data;
  const result = { ...data };
  for (const m of customs) {
    const key = normalizeCountyName(data.name);
    result[m.key] = m.csvData.get(key) ?? null;
  }
  return result;
}

export default function App() {
  const [page, setPageRaw] = useState('picker');
  const [counties, setCounties] = useState([]);
  const [countiesLoading, setCountiesLoading] = useState(true);
  const [countiesError, setCountiesError] = useState('');

  const [countyAFips, setCountyAFipsRaw] = useState('');
  const [countyBFips, setCountyBFipsRaw] = useState('');
  const [dataA, setDataA] = useState(null);
  const [dataB, setDataB] = useState(null);
  const [loadingA, setLoadingA] = useState(false);
  const [loadingB, setLoadingB] = useState(false);

  const [metricMode, setMetricMode] = useState('fun');
  const [activeMetricKeys, setActiveMetricKeys] = useState(null);
  const [customMetrics, setCustomMetrics] = useState([]);

  // Read URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const a = params.get('a');
    const b = params.get('b');
    const p = params.get('page');
    if (a) setCountyAFipsRaw(a);
    if (b) setCountyBFipsRaw(b);
    if (p && PAGES.includes(p)) setPageRaw(p);
  }, []);

  // Fetch county list
  useEffect(() => {
    getAllTexasCounties()
      .then(setCounties)
      .catch(e => setCountiesError(e.message))
      .finally(() => setCountiesLoading(false));
  }, []);

  // Fetch county A data
  useEffect(() => {
    if (!countyAFips) { setDataA(null); return; }
    setLoadingA(true);
    setDataA(null);
    getCountyDataSafe(countyAFips)
      .then(setDataA)
      .catch(console.error)
      .finally(() => setLoadingA(false));
  }, [countyAFips]);

  // Fetch county B data
  useEffect(() => {
    if (!countyBFips) { setDataB(null); return; }
    setLoadingB(true);
    setDataB(null);
    getCountyDataSafe(countyBFips)
      .then(setDataB)
      .catch(console.error)
      .finally(() => setLoadingB(false));
  }, [countyBFips]);

  const setPage = useCallback((p) => {
    setPageRaw(p);
    syncUrl(countyAFips, countyBFips, p);
  }, [countyAFips, countyBFips]);

  const setCountyAFips = useCallback((fips) => {
    setCountyAFipsRaw(fips);
    syncUrl(fips, countyBFips, page);
  }, [countyBFips, page]);

  const setCountyBFips = useCallback((fips) => {
    setCountyBFipsRaw(fips);
    syncUrl(countyAFips, fips, page);
  }, [countyAFips, page]);

  const csvMetrics = useMemo(() => [...customMetrics], [customMetrics]);
  const allMetrics = useMemo(() => [...METRICS, ...csvMetrics], [csvMetrics]);

  const effectiveKeys = useMemo(
    () => activeMetricKeys ?? (PRESETS[metricMode] || []),
    [activeMetricKeys, metricMode]
  );

  const activeMetricObjects = useMemo(
    () => effectiveKeys.map(k => allMetrics.find(m => m.key === k)).filter(Boolean),
    [effectiveKeys, allMetrics]
  );

  const enrichedDataA = useMemo(() => enrichCountyData(dataA, csvMetrics), [dataA, csvMetrics]);
  const enrichedDataB = useMemo(() => enrichCountyData(dataB, csvMetrics), [dataB, csvMetrics]);

  if (countiesError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="rounded-sm border-2 border-foreground bg-paper p-8 max-w-md text-center shadow-[6px_6px_0_0_var(--color-foreground)]">
          <div className="font-display text-xs uppercase tracking-widest text-foreground/60 mb-3">⚠ Error</div>
          <h2 className="font-serif text-2xl text-foreground mb-2">Failed to load county data</h2>
          <p className="text-sm text-foreground/60">{countiesError}</p>
          <p className="font-display text-[10px] uppercase tracking-widest text-foreground/40 mt-3">
            Check VITE_CENSUS_API_KEY in .env
          </p>
        </div>
      </div>
    );
  }

  const sharedProps = {
    counties,
    countyAFips,
    countyBFips,
    setCountyAFips,
    setCountyBFips,
    dataA: enrichedDataA,
    dataB: enrichedDataB,
    loadingA: loadingA || countiesLoading,
    loadingB: loadingB || countiesLoading,
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Nav page={page} setPage={setPage} />
      <div className="flex-1">
        {page === 'picker' && (
          <PickerPage
            {...sharedProps}
            loadingCounties={countiesLoading}
            onStart={() => setPage('metrics')}
          />
        )}
        {page === 'metrics' && (
          <MetricsPage
            metricMode={metricMode}
            setMetricMode={setMetricMode}
            activeMetricKeys={activeMetricKeys}
            setActiveMetricKeys={setActiveMetricKeys}
            customMetrics={customMetrics}
            setCustomMetrics={setCustomMetrics}
            allMetrics={allMetrics}
            onStart={() => setPage('battle')}
            onBack={() => setPage('picker')}
          />
        )}
        {page === 'battle' && (
          <BattlePage
            {...sharedProps}
            activeMetrics={activeMetricObjects}
            onVerdict={() => setPage('summary')}
            onBack={() => setPage('metrics')}
          />
        )}
        {page === 'summary' && (
          <SummaryPage
            dataA={enrichedDataA}
            dataB={enrichedDataB}
            activeMetrics={activeMetricObjects}
            onBack={() => setPage('picker')}
          />
        )}
      </div>
    </div>
  );
}
