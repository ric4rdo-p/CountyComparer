import { useState, useRef } from 'react';
import { PRESETS } from '../utils/presets.js';

const AGGREGATIONS = [
  { value: 'sum',     label: 'Sum (add all rows)' },
  { value: 'count',   label: 'Count (number of rows)' },
  { value: 'average', label: 'Average' },
  { value: 'max',     label: 'Max' },
  { value: 'min',     label: 'Min' },
];

const HIB_OPTIONS = [
  { value: 'true', label: 'Yes — higher wins' },
  { value: 'false', label: 'No — lower wins' },
  { value: 'null', label: 'Neutral — no winner' },
];

function parseNumeric(raw) {
  // Strip currency symbols, percent signs, spaces, then parse
  const cleaned = String(raw).replace(/[$%£€\s]/g, '').replace(/,/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function aggregateValues(values, method) {
  const nums = values.filter(v => v != null);
  if (!nums.length) return null;
  switch (method) {
    case 'sum':     return nums.reduce((a, b) => a + b, 0);
    case 'count':   return nums.length;
    case 'average': return nums.reduce((a, b) => a + b, 0) / nums.length;
    case 'max':     return Math.max(...nums);
    case 'min':     return Math.min(...nums);
    default:        return nums[0];
  }
}

function splitCSVLine(line) {
  const fields = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        // escaped quote ("") → literal quote
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = false;
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { fields.push(cur.trim()); cur = ''; }
      else { cur += ch; }
    }
  }
  fields.push(cur.trim());
  return fields;
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row.');
  const headers = splitCSVLine(lines[0]);
  if (headers.length < 2) throw new Error('CSV must have at least two columns.');
  const rows = lines.slice(1).map(line => {
    const cols = splitCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = cols[i] ?? ''; });
    return obj;
  }).filter(r => Object.values(r).some(v => v !== ''));
  if (rows.length === 0) throw new Error('No valid data rows found.');
  return { headers, rows };
}

function DragHandle() {
  return (
    <span className="cursor-grab text-foreground/30 select-none pr-2 text-base leading-none" aria-hidden="true">
      ≡
    </span>
  );
}

function InfoCard({ queryNote, source }) {
  const endpoint = queryNote?.endpoint ?? (source === 'Custom (CSV)' ? 'User-uploaded CSV' : source);
  const query = queryNote?.query ?? '—';
  return (
    <div className="mt-2 rounded-sm border border-foreground/20 bg-background px-3 py-2.5 space-y-1.5 text-left">
      <div>
        <div className="font-display text-[9px] uppercase tracking-[0.25em] text-foreground/40 mb-0.5">Endpoint</div>
        <div className="font-mono text-[10px] text-foreground/70 break-all">{endpoint}</div>
      </div>
      <div>
        <div className="font-display text-[9px] uppercase tracking-[0.25em] text-foreground/40 mb-0.5">Query</div>
        <div className="font-mono text-[10px] text-foreground/70 break-all">{query}</div>
      </div>
    </div>
  );
}

export default function MetricsPage({
  metricMode, setMetricMode,
  activeMetricKeys, setActiveMetricKeys,
  customMetrics, setCustomMetrics,
  allMetrics,
  onStart, onBack,
}) {
  const effectiveKeys = activeMetricKeys ?? (PRESETS[metricMode] || []);
  const activeMetrics = effectiveKeys.map(k => allMetrics.find(m => m.key === k)).filter(Boolean);
  const availableMetrics = allMetrics.filter(m => !effectiveKeys.includes(m.key));

  // Drag state
  const dragIndexRef = useRef(null);
  const [dragOver, setDragOver] = useState(null);

  // Info popup state
  const [openInfoKey, setOpenInfoKey] = useState(null);
  function toggleInfo(e, key) {
    e.stopPropagation();
    setOpenInfoKey(prev => prev === key ? null : key);
  }

  // Collapsed groups in available panel (all start closed)
  const [openGroups, setOpenGroups] = useState(new Set());
  function toggleGroup(group) {
    setOpenGroups(prev => {
      const next = new Set(prev);
      next.has(group) ? next.delete(group) : next.add(group);
      return next;
    });
  }
  function addAllInGroup(group, metrics) {
    const newKeys = metrics.map(m => m.key).filter(k => !effectiveKeys.includes(k));
    if (!newKeys.length) return;
    setActiveMetricKeys([...effectiveKeys, ...newKeys]);
    if (metricMode !== 'custom') setMetricMode('custom');
  }

  // CSV upload state
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvParsed, setCsvParsed] = useState(null);
  const [parseError, setParseError] = useState('');
  const [metricName, setMetricName] = useState('');
  const [countyCol, setCountyCol] = useState('');
  const [valueCol, setValueCol] = useState('');
  const [aggregation, setAggregation] = useState('sum');
  const [hibRaw, setHibRaw] = useState('true');

  function handleModeClick(mode) {
    if (mode === 'custom') {
      if (metricMode !== 'custom' && activeMetricKeys === null) {
        setActiveMetricKeys([...(PRESETS.professional || [])]);
      }
      setMetricMode('custom');
    } else {
      setMetricMode(mode);
      setActiveMetricKeys(null);
    }
  }

  function removeMetric(key) {
    const next = effectiveKeys.filter(k => k !== key);
    setActiveMetricKeys(next);
    if (metricMode !== 'custom') setMetricMode('custom');
  }

  function addMetric(key) {
    setActiveMetricKeys([...effectiveKeys, key]);
    if (metricMode !== 'custom') setMetricMode('custom');
  }

  // Drag handlers
  function onDragStart(i) { dragIndexRef.current = i; }
  function onDragOverItem(e, i) { e.preventDefault(); setDragOver(i); }
  function onDrop(e, i) {
    e.preventDefault();
    const from = dragIndexRef.current;
    if (from == null || from === i) { setDragOver(null); return; }
    const arr = [...effectiveKeys];
    const [item] = arr.splice(from, 1);
    arr.splice(i, 0, item);
    setActiveMetricKeys(arr);
    if (metricMode !== 'custom') setMetricMode('custom');
    dragIndexRef.current = null;
    setDragOver(null);
  }
  function onDragEnd() { dragIndexRef.current = null; setDragOver(null); }

  // CSV handling
  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = parseCSV(ev.target.result);
        setCsvParsed(parsed);
        setParseError('');
        // Auto-select first column as county, second as value
        setCountyCol(parsed.headers[0]);
        setValueCol(parsed.headers[1]);
      } catch (err) {
        setCsvParsed(null);
        setParseError(err.message);
        setCountyCol('');
        setValueCol('');
      }
    };
    reader.readAsText(file);
  }

  function buildAggregatedMap(rows, cCol, vCol, agg) {
    // Group raw numeric values by normalized county key
    const groups = new Map();
    for (const row of rows) {
      const rawCounty = (row[cCol] ?? '').trim();
      if (!rawCounty) continue;
      const normalized = rawCounty.toUpperCase()
        .replace(/, TEXAS$/, '')
        .replace(/ COUNTY$/, '')
        .trim();
      const val = parseNumeric(row[vCol]);
      if (!groups.has(normalized)) groups.set(normalized, []);
      if (val != null) groups.get(normalized).push(val);
    }
    // Aggregate each group
    const result = new Map();
    for (const [county, vals] of groups) {
      const agged = aggregateValues(vals, agg);
      if (agged != null) result.set(county, agged);
    }
    return result;
  }

  function getPreview() {
    if (!csvParsed || !countyCol || !valueCol) return [];
    const agged = buildAggregatedMap(csvParsed.rows, countyCol, valueCol, aggregation);
    return [...agged.entries()].slice(0, 5).map(([county, value]) => ({ county, value }));
  }

  function addCustomMetric() {
    if (!csvParsed || !metricName.trim() || !countyCol || !valueCol) return;
    const csvData = buildAggregatedMap(csvParsed.rows, countyCol, valueCol, aggregation);
    const hib = hibRaw === 'null' ? null : hibRaw === 'true';
    const key = `custom_${Date.now()}`;
    const newMetric = {
      key,
      label: metricName.trim(),
      shortLabel: metricName.trim().slice(0, 14),
      format: v => v.toLocaleString(undefined, { maximumFractionDigits: 2 }),
      higherIsBetter: hib,
      source: 'Custom (CSV)',
      group: 'Custom',
      csvData,
    };
    setCustomMetrics(prev => [...prev, newMetric]);
    setActiveMetricKeys([...effectiveKeys, key]);
    setMetricMode('custom');
    // Reset form
    setCsvParsed(null);
    setParseError('');
    setMetricName('');
    setCountyCol('');
    setValueCol('');
    setAggregation('sum');
    setHibRaw('true');
    setCsvOpen(false);
  }

  const preview = getPreview();
  const canAdd = csvParsed && metricName.trim() && countyCol && valueCol && countyCol !== valueCol;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 pb-28 md:py-12">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="font-display text-[10px] uppercase tracking-[0.4em] text-foreground/60">
          ★ Configure Your Battle ★
        </div>
        <h1 className="mt-2 font-display text-4xl text-foreground md:text-5xl">
          Pick Your Metrics
        </h1>
      </div>

      {/* Mode selector */}
      <div className="mb-6 flex justify-center">
        <div className="inline-flex rounded-sm border-2 border-foreground bg-paper p-1 shadow-[3px_3px_0_0_var(--color-foreground)]">
          {[
            { k: 'fun', label: 'Fun 🤠' },
            { k: 'professional', label: 'Professional 📊' },
            { k: 'custom', label: 'Custom 🔧' },
          ].map(m => (
            <button
              key={m.k}
              onClick={() => handleModeClick(m.k)}
              className={
                'rounded-sm px-4 py-1.5 font-display text-[11px] uppercase tracking-[0.2em] transition-colors ' +
                (metricMode === m.k
                  ? 'bg-foreground text-background'
                  : 'text-foreground/70 hover:text-foreground')
              }
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Active metrics (left) */}
        <section className="rounded-sm border-2 border-foreground bg-paper p-5 shadow-[4px_4px_0_0_var(--color-foreground)]">
          <div className="mb-3 font-display text-[10px] uppercase tracking-[0.3em] text-foreground/60">
            ★ Battle Metrics ({activeMetrics.length})
          </div>
          {activeMetrics.length === 0 && (
            <p className="py-4 text-center font-serif italic text-foreground/40 text-sm">
              No metrics selected — add from the pool →
            </p>
          )}
          <ul className="space-y-1.5">
            {activeMetrics.map((m, i) => (
              <li
                key={m.key}
                draggable
                onDragStart={() => onDragStart(i)}
                onDragOver={e => onDragOverItem(e, i)}
                onDrop={e => onDrop(e, i)}
                onDragEnd={onDragEnd}
                className={
                  'flex items-start gap-2 rounded-sm border border-foreground/20 bg-card px-3 py-3 transition-colors ' +
                  (dragOver === i ? 'border-clay bg-clay/10' : '')
                }
              >
                <DragHandle />
                <div className="min-w-0 flex-1">
                  <div className="font-display text-[11px] uppercase tracking-[0.2em] text-foreground leading-tight">
                    {m.label}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="text-[10px] text-foreground/40">{m.group} · {m.source}</span>
                    {m.higherIsBetter === null && (
                      <span className="inline-block rounded-sm bg-clay px-1.5 py-0.5 font-display text-[9px] uppercase tracking-widest text-background">Neutral</span>
                    )}
                  </div>
                  {m.description && (
                    <div className="text-[11px] text-foreground/60 leading-snug mt-1">
                      {m.description}
                    </div>
                  )}
                  {openInfoKey === m.key && <InfoCard queryNote={m.queryNote} source={m.source} />}
                </div>
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <button
                    onClick={e => toggleInfo(e, m.key)}
                    className={`w-6 h-6 flex items-center justify-center rounded-full text-[10px] border transition-colors ${openInfoKey === m.key ? 'border-foreground/50 text-foreground bg-foreground/10' : 'border-foreground/20 text-foreground/40 hover:border-foreground/50 hover:text-foreground'}`}
                    aria-label="Data source info"
                  >
                    ℹ
                  </button>
                  <button
                    onClick={() => removeMetric(m.key)}
                    className="w-8 h-8 flex items-center justify-center rounded-sm text-lg font-bold text-foreground/40 hover:bg-foreground/10 hover:text-foreground transition-colors"
                    aria-label={`Remove ${m.label}`}
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-3 text-[10px] text-foreground/30 font-display uppercase tracking-widest">
            Drag to reorder · × to remove
          </div>
        </section>

        {/* Available metrics (right) — grouped by category */}
        <section className="rounded-sm border-2 border-foreground bg-paper shadow-[4px_4px_0_0_var(--color-foreground)] flex flex-col">
          <div className="px-5 pt-5 pb-3 font-display text-[10px] uppercase tracking-[0.3em] text-foreground/60">
            ★ Available Metrics ({availableMetrics.length})
          </div>
          {availableMetrics.length === 0 && (
            <p className="px-5 pb-5 text-center font-serif italic text-foreground/40 text-sm">
              All metrics are in the battle!
            </p>
          )}
          <div className="overflow-y-auto max-h-[600px] px-5 pb-5 space-y-1">
            {Object.entries(
              availableMetrics.reduce((acc, m) => {
                if (!acc[m.group]) acc[m.group] = [];
                acc[m.group].push(m);
                return acc;
              }, {})
            ).map(([group, metrics]) => {
              const isOpen = openGroups.has(group);
              return (
                <div key={group} className="rounded-sm border border-foreground/20 overflow-hidden">
                  {/* Group header row */}
                  <div className="flex items-center bg-foreground/5">
                    <button
                      onClick={() => toggleGroup(group)}
                      className="flex flex-1 items-center gap-2 px-3 py-2.5 text-left"
                    >
                      <span className="font-display text-[10px] text-foreground/40 w-3 leading-none">
                        {isOpen ? '▾' : '▸'}
                      </span>
                      <span className="font-display text-[11px] uppercase tracking-[0.25em] text-foreground/70">
                        {group}
                      </span>
                      <span className="font-display text-[10px] text-foreground/35">
                        ({metrics.length})
                      </span>
                    </button>
                    <button
                      onClick={() => addAllInGroup(group, metrics)}
                      className="px-3 py-2.5 font-display text-[10px] uppercase tracking-[0.2em] text-foreground/50 hover:text-clay transition-colors whitespace-nowrap"
                    >
                      + Add All
                    </button>
                  </div>

                  {/* Metrics list — shown when open */}
                  {isOpen && (
                    <ul className="divide-y divide-foreground/10 border-t border-foreground/15">
                      {metrics.map(m => (
                        <li key={m.key}>
                          <div className="flex items-start gap-2 px-3 py-3">
                            <button
                              onClick={() => addMetric(m.key)}
                              className="group min-w-0 flex-1 text-left"
                            >
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <div className="font-display text-[11px] uppercase tracking-[0.2em] text-foreground leading-tight group-hover:text-clay transition-colors">
                                  {m.label}
                                </div>
                                {m.higherIsBetter === null && (
                                  <span className="inline-block rounded-sm bg-clay px-1.5 py-0.5 font-display text-[9px] uppercase tracking-widest text-background">Neutral</span>
                                )}
                              </div>
                              {m.description && (
                                <div className="text-[11px] text-foreground/60 leading-snug mt-1">
                                  {m.description}
                                </div>
                              )}
                              {openInfoKey === m.key && <InfoCard queryNote={m.queryNote} source={m.source} />}
                            </button>
                            <div className="flex flex-col items-center gap-1 flex-shrink-0">
                              <button
                                onClick={e => toggleInfo(e, m.key)}
                                className={`w-6 h-6 flex items-center justify-center rounded-full text-[10px] border transition-colors ${openInfoKey === m.key ? 'border-foreground/50 text-foreground bg-foreground/10' : 'border-foreground/20 text-foreground/40 hover:border-foreground/50 hover:text-foreground'}`}
                                aria-label="Data source info"
                              >
                                ℹ
                              </button>
                              <button
                                onClick={() => addMetric(m.key)}
                                className="w-8 h-8 flex items-center justify-center rounded-sm text-lg font-bold bg-foreground/10 text-foreground/50 hover:bg-clay hover:text-background transition-colors"
                                aria-label={`Add ${m.label}`}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* CSV Upload panel */}
      <div className="mt-6 mb-8 md:mb-16 rounded-sm border-2 border-foreground/40 bg-paper">
        <button
          onClick={() => setCsvOpen(o => !o)}
          className="flex w-full items-center justify-between px-5 py-3.5"
        >
          <span className="font-display text-[11px] uppercase tracking-[0.25em] text-foreground/70">
            + Add Custom Metric (CSV Upload)
          </span>
          <span className="font-display text-foreground/40">{csvOpen ? '▲' : '▼'}</span>
        </button>

        {csvOpen && (
          <div className="border-t border-foreground/20 px-5 py-5 space-y-5">

            {/* Step 1: Upload */}
            <div>
              <div className="mb-2 font-display text-[10px] uppercase tracking-[0.3em] text-foreground/50">
                Step 1 · Upload CSV
              </div>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFile}
                className="block w-full text-sm text-foreground/70 file:mr-3 file:rounded-sm file:border file:border-foreground/40 file:bg-paper file:px-3 file:py-1 file:font-display file:text-[10px] file:uppercase file:tracking-widest file:text-foreground/70 hover:file:text-foreground"
              />
              {parseError && (
                <p className="mt-1.5 text-[11px] text-destructive">{parseError}</p>
              )}
            </div>

            {/* Raw preview table + column selectors — shown after upload */}
            {csvParsed && (
              <>
                {/* Step 2: Raw data preview */}
                <div>
                  <div className="mb-2 font-display text-[10px] uppercase tracking-[0.3em] text-foreground/50">
                    Step 2 · Select Columns
                  </div>
                  <div className="overflow-x-auto rounded-sm border border-foreground/20">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-foreground/20 bg-foreground/5">
                          {csvParsed.headers.map(h => (
                            <th key={h} className="px-3 py-2 font-display text-[10px] uppercase tracking-widest text-foreground/60 whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvParsed.rows.slice(0, 5).map((row, i) => (
                          <tr key={i} className="border-b border-foreground/10 last:border-0">
                            {csvParsed.headers.map(h => (
                              <td
                                key={h}
                                className={
                                  'px-3 py-2 font-serif whitespace-nowrap ' +
                                  (h === countyCol ? 'text-clay font-semibold' :
                                   h === valueCol  ? 'text-sage font-semibold' :
                                   'text-foreground/50')
                                }
                              >
                                {row[h]}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {csvParsed.rows.length > 5 && (
                    <p className="mt-1 text-[10px] text-foreground/40 font-display uppercase tracking-widest">
                      Showing 5 of {csvParsed.rows.length} rows
                    </p>
                  )}
                </div>

                {/* Column selectors + aggregation */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-display text-[10px] uppercase tracking-[0.25em] text-clay mb-1.5">
                      County Column
                    </label>
                    <select
                      value={countyCol}
                      onChange={e => setCountyCol(e.target.value)}
                      className="w-full rounded-sm border-2 border-clay bg-paper px-3 py-2 font-serif text-foreground focus:outline-none"
                    >
                      {csvParsed.headers.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-display text-[10px] uppercase tracking-[0.25em] text-sage mb-1.5">
                      Value Column
                    </label>
                    <select
                      value={valueCol}
                      onChange={e => setValueCol(e.target.value)}
                      className="w-full rounded-sm border-2 border-sage bg-paper px-3 py-2 font-serif text-foreground focus:outline-none"
                    >
                      {csvParsed.headers.filter(h => h !== countyCol).map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-display text-[10px] uppercase tracking-[0.25em] text-foreground/60 mb-1.5">
                    How to combine multiple rows per county
                  </label>
                  <select
                    value={aggregation}
                    onChange={e => setAggregation(e.target.value)}
                    className="w-full rounded-sm border border-foreground/30 bg-paper px-3 py-2 font-serif text-foreground focus:outline-none focus:border-foreground"
                  >
                    {AGGREGATIONS.map(a => (
                      <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                  </select>
                </div>

                {/* Aggregated preview */}
                {preview.length > 0 && (
                  <div>
                    <div className="mb-2 font-display text-[10px] uppercase tracking-[0.3em] text-foreground/50">
                      Preview (aggregated by county)
                    </div>
                    <ul className="space-y-1">
                      {preview.map((r, i) => (
                        <li key={i} className="flex items-center justify-between rounded-sm border border-foreground/15 bg-card px-3 py-2">
                          <span className="font-display text-[11px] uppercase tracking-widest text-clay">{r.county}</span>
                          <span className="font-serif text-base text-foreground">
                            {r.value != null
                              ? r.value.toLocaleString(undefined, { maximumFractionDigits: 2 })
                              : '—'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Step 3: Metric details */}
                <div>
                  <div className="mb-3 font-display text-[10px] uppercase tracking-[0.3em] text-foreground/50">
                    Step 3 · Name & Direction
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="block font-display text-[10px] uppercase tracking-[0.25em] text-foreground/60 mb-1.5">
                        Metric Name
                      </label>
                      <input
                        type="text"
                        value={metricName}
                        onChange={e => setMetricName(e.target.value)}
                        placeholder="e.g. Taco Trucks per Capita"
                        className="w-full rounded-sm border border-foreground/30 bg-transparent px-3 py-2 font-serif text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-foreground"
                      />
                    </div>
                    <div>
                      <label className="block font-display text-[10px] uppercase tracking-[0.25em] text-foreground/60 mb-1.5">
                        Winner Direction
                      </label>
                      <select
                        value={hibRaw}
                        onChange={e => setHibRaw(e.target.value)}
                        className="w-full rounded-sm border border-foreground/30 bg-paper px-3 py-2 font-serif text-foreground focus:outline-none focus:border-foreground"
                      >
                        {HIB_OPTIONS.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <button
                  onClick={addCustomMetric}
                  disabled={!canAdd}
                  className="rounded-sm border-2 border-foreground bg-clay px-5 py-2.5 font-display text-[11px] uppercase tracking-[0.2em] text-primary-foreground shadow-[3px_3px_0_0_var(--color-foreground)] disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[5px_5px_0_0_var(--color-foreground)] transition-shadow"
                >
                  Add to Metrics →
                </button>
              </>
            )}

            {!csvParsed && !parseError && (
              <div className="rounded-sm border border-dashed border-foreground/20 px-4 py-6 text-center font-serif italic text-foreground/30 text-sm">
                Upload a CSV file to get started
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer nav */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-foreground bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <button
            onClick={onBack}
            className="font-display text-[11px] uppercase tracking-[0.25em] text-foreground/70 hover:text-foreground transition-colors"
          >
            ← Counties
          </button>
          <span className="font-display text-[11px] uppercase tracking-[0.25em] text-foreground/50">
            {activeMetrics.length} metric{activeMetrics.length !== 1 ? 's' : ''} selected
          </span>
          <button
            onClick={onStart}
            disabled={activeMetrics.length === 0}
            className="inline-flex items-center gap-2 rounded-sm border-2 border-foreground bg-clay px-5 py-2.5 font-display text-xs uppercase tracking-[0.2em] text-primary-foreground shadow-[3px_3px_0_0_var(--color-foreground)] disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[5px_5px_0_0_var(--color-foreground)] transition-shadow"
          >
            Start the Battle <span>→</span>
          </button>
        </div>
      </div>
    </main>
  );
}
