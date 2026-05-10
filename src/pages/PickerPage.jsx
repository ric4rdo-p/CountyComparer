import CountySelector from '../components/CountySelector.jsx';

const QUICK_PICK = ['Travis', 'Harris', 'Bexar', 'Dallas', 'Tarrant', 'El Paso'];

function Star() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M12 2l2.9 6.9L22 10l-5.5 4.7L18 22l-6-3.7L6 22l1.5-7.3L2 10l7.1-1.1z" />
    </svg>
  );
}

function PickerCard({ corner, accent, value, onChange, counties, loading }) {
  const quickPick = counties.filter(c => QUICK_PICK.includes(c.name.replace(' County', '')));

  return (
    <div className="relative flex-1 rounded-sm border-2 border-foreground bg-paper p-5 shadow-[6px_6px_0_0_var(--color-foreground)]">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-display text-[10px] uppercase tracking-[0.25em] text-foreground/70">
          {corner}
        </span>
        <span
          className="inline-block h-3 w-3 rounded-full"
          style={{ background: accent }}
          aria-hidden="true"
        />
      </div>
      <div className="border-t border-b border-dashed border-foreground/40 py-3">
        <CountySelector
          value={value}
          onChange={onChange}
          counties={counties}
          label="Pick your county…"
          inputClassName="w-full bg-transparent font-serif text-2xl text-foreground placeholder:text-foreground/40 focus:outline-none"
          dropdownClassName="bg-card border border-foreground/30 text-foreground"
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {loading
          ? <span className="font-display text-[10px] text-foreground/40 uppercase tracking-widest">Loading counties…</span>
          : quickPick.map(c => (
              <button
                key={c.fips}
                onClick={() => onChange(c.fips)}
                className="rounded-full border border-foreground/40 px-2.5 py-0.5 text-[11px] uppercase tracking-wider text-foreground/70 hover:bg-foreground hover:text-background transition-colors"
              >
                {c.name.replace(' County', '')}
              </button>
            ))
        }
      </div>
    </div>
  );
}

export default function PickerPage({
  counties, loadingCounties,
  countyAFips, countyBFips, setCountyAFips, setCountyBFips,
  onStart,
}) {
  const canStart = countyAFips && countyBFips;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 md:py-16">
      {/* Hero */}
      <section className="text-center">
        <div className="mb-6 flex items-center justify-center gap-3 text-clay">
          <span className="h-px w-12 bg-foreground/40" />
          <Star />
          <span className="font-display text-[10px] uppercase tracking-[0.4em] text-foreground/70">
            Established 2026 · Lone Star State
          </span>
          <Star />
          <span className="h-px w-12 bg-foreground/40" />
        </div>
        <h1 className="font-display text-5xl leading-[0.95] text-foreground md:text-7xl lg:text-8xl">
          TEXAS
          <br />
          <span className="text-clay">COUNTY</span>
          <br />
          BATTLE
        </h1>
        <div className="mx-auto mt-6 max-w-xl">
          <div className="double-rule pt-3">
            <p className="font-serif italic text-lg text-foreground/80 md:text-xl">
              254 counties. One showdown.
            </p>
          </div>
        </div>
      </section>

      {/* Picker */}
      <section className="mt-12 md:mt-16">
        <div className="flex flex-col items-stretch gap-4 md:flex-row md:items-start md:gap-6">
          <PickerCard
            corner="Red Corner"
            accent="oklch(0.6 0.13 40)"
            value={countyAFips}
            onChange={setCountyAFips}
            counties={counties}
            loading={loadingCounties}
          />
          <div className="flex justify-center md:pt-16">
            <div className="grid h-16 w-16 place-items-center rounded-full border-2 border-foreground bg-foreground font-display text-xl text-background shadow-[4px_4px_0_0_var(--color-clay)] md:h-20 md:w-20 md:text-2xl">
              VS
            </div>
          </div>
          <PickerCard
            corner="Blue Corner"
            accent="oklch(0.62 0.06 130)"
            value={countyBFips}
            onChange={setCountyBFips}
            counties={counties}
            loading={loadingCounties}
          />
        </div>

        <div className="mt-8 flex justify-center">
          <button
            onClick={onStart}
            disabled={!canStart}
            className="group inline-flex items-center gap-3 rounded-sm border-2 border-foreground bg-clay px-7 py-3.5 font-display text-sm uppercase tracking-[0.2em] text-primary-foreground shadow-[5px_5px_0_0_var(--color-foreground)] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_var(--color-foreground)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[5px_5px_0_0_var(--color-foreground)]"
          >
            Start the Battle
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </button>
        </div>
      </section>

      {/* What you'll see */}
      <section className="mt-20">
        <div className="mb-6 text-center">
          <h2 className="font-display text-xs uppercase tracking-[0.4em] text-foreground/60">
            ★ What you'll see ★
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            { k: 'Income', v: '$92k vs $71k', note: 'Median household income, Census ACS' },
            { k: 'Booze Revenue', v: '$487/person', note: 'Bar & restaurant alcohol revenue' },
            { k: 'Commute Time', v: '27 min', note: 'Mean travel time to work' },
          ].map(t => (
            <div key={t.k} className="rounded-sm border border-foreground/40 bg-card p-5">
              <div className="font-display text-[10px] uppercase tracking-widest text-foreground/60">
                {t.k}
              </div>
              <div className="mt-2 font-serif text-4xl text-foreground">{t.v}</div>
              <div className="mt-1 text-xs text-foreground/60">{t.note}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="mt-20 border-t border-foreground/30 pt-5 text-center font-display text-[10px] uppercase tracking-[0.3em] text-foreground/60">
        Built on Census Bureau ACS · Texas Open Data Portal · Real Numbers, Real Counties
      </footer>
    </main>
  );
}
