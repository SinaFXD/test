import { useEffect } from 'react';
import { ControlsPanel } from './components/controls/ControlsPanel';
import { Banner } from './components/layout/Banner';
import { MobileControls } from './components/layout/BottomSheet';
import { Footer } from './components/layout/Footer';
import { Header } from './components/layout/Header';
import { Toast } from './components/layout/Toast';
import { DataTable } from './components/results/DataTable';
import { KpiStrip } from './components/results/KpiStrip';
import { MarketImpact } from './components/results/MarketImpact';
import { PolicyChart } from './components/results/PolicyChart';
import { SmallMultiples } from './components/results/SmallMultiples';
import { Summary } from './components/results/Summary';
import { TimeScrubber } from './components/results/TimeScrubber';
import { Transmission } from './components/results/Transmission';
import { useIsDesktop } from './hooks/useMediaQuery';
import { usePlayDriver } from './hooks/usePlay';
import { useT } from './i18n';
import { useData } from './state/data';
import { applyDocumentPrefs, usePrefs } from './state/prefs';
import { startSimulationDriver } from './state/sim';

function LoadingSkeleton() {
  const t = useT();
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-4">
      <span className="sr-only">{t.loading}</span>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="skeleton h-24" />
        ))}
      </div>
      <div className="skeleton h-80" />
    </div>
  );
}

export default function App() {
  const t = useT();
  const lang = usePrefs((s) => s.lang);
  const theme = usePrefs((s) => s.theme);
  const status = useData((s) => s.status);
  const load = useData((s) => s.load);
  const isDesktop = useIsDesktop();

  useEffect(() => applyDocumentPrefs({ lang, theme }), [lang, theme]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (status === 'ready') startSimulationDriver();
  }, [status]);
  usePlayDriver();

  return (
    <div className="mx-auto max-w-[1920px] space-y-4 px-3 py-3 sm:px-5">
      <a
        href="#results"
        className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-[80] focus:rounded-lg focus:bg-scenario focus:px-3 focus:py-2 focus:text-on-accent"
      >
        {t.skipToContent}
      </a>
      <Header />
      <Banner />
      {status === 'loading' && <LoadingSkeleton />}
      {status === 'error' && (
        <div role="alert" className="glass p-6 text-center">
          <h2 className="font-bold">{t.errorTitle}</h2>
          <p className="text-muted">{t.errorBody}</p>
        </div>
      )}
      {status === 'ready' && <KpiStrip />}
      {status === 'ready' && (
        <div className="items-start gap-4 lg:grid lg:grid-cols-[minmax(320px,360px)_minmax(0,1fr)] xl:grid-cols-[380px_minmax(0,1fr)]">
          {isDesktop && (
            <aside
              className="glass sticky top-3 max-h-[calc(100dvh-1.5rem)] overflow-y-auto p-4"
              aria-label={t.controlsTitle}
            >
              <ControlsPanel />
            </aside>
          )}
          <main id="results" tabIndex={-1} className="min-w-0 space-y-4 outline-none">
            <Summary />
            <PolicyChart />
            <TimeScrubber />
            <Transmission />
            <SmallMultiples />
            <MarketImpact />
            <DataTable />
          </main>
        </div>
      )}
      <Footer />
      {!isDesktop && status === 'ready' && <MobileControls />}
      <Toast />
    </div>
  );
}
