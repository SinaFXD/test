import { useId } from 'react';
import { useFmt } from '../../hooks/useFmt';
import { useT } from '../../i18n';
import { SLIDERS, type NumericKey, type Tab } from '../../state/controls';
import { useData } from '../../state/data';
import { useScenario } from '../../state/scenario';
import { ChevronIcon } from '../icons';
import { ActionBar } from './ActionBar';
import { MarketOverride } from './MarketOverride';
import { Presets } from './Presets';
import { Segmented } from './Segmented';
import { Slider } from './Slider';

const TABS: Tab[] = ['rate', 'shock', 'custom'];

export function ControlsPanel({ idPrefix = 'ctl' }: { idPrefix?: string }) {
  const t = useT();
  const f = useFmt();
  const uid = useId();
  const s = useScenario();
  const dataRStar = useData((d) => d.data?.derived.rStar.value);
  const set = s.set;
  const fa = f.lang === 'fa';

  const num = (k: NumericKey, dp: number, signed = false) => f.num(s[k] as number, { dp, signed });
  const aria = (txt: string) => f.aria(txt);
  const bind = (k: NumericKey) => ({
    min: SLIDERS[k].min,
    max: SLIDERS[k].max,
    step: SLIDERS[k].step,
    onChange: (v: number) => set({ [k]: v }),
  });

  const rate = (
    <>
      <Slider
        label={t.policyChange}
        value={s.policyChangeBp}
        {...bind('policyChangeBp')}
        origin={0}
        display={`${num('policyChangeBp', 0, true)} ${fa ? t.bp : t.bpShort}`}
        ariaText={t.ariaBp(aria(f.num(s.policyChangeBp, { dp: 0, signed: true })))}
        help={t.policyChangeHelp}
      />
      <Slider
        label={t.hold}
        value={s.holdQuarters}
        {...bind('holdQuarters')}
        display={t.quarterUnit(num('holdQuarters', 0))}
        ariaText={t.ariaQuarters(aria(String(Math.round(s.holdQuarters))))}
        help={t.holdHelp}
        disabled={Math.round(s.policyChangeBp) === 0}
      />
    </>
  );

  const shock = (
    <>
      <Slider
        label={t.inflationShock}
        value={s.inflationShock}
        {...bind('inflationShock')}
        origin={0}
        display={`${num('inflationShock', 2, true)} ${t.ppShort}`}
        ariaText={t.ariaPp(aria(f.num(s.inflationShock, { dp: 2, signed: true })))}
        help={t.inflationShockHelp}
      />
      <Slider
        label={t.persistence}
        value={s.shockPersistence}
        {...bind('shockPersistence')}
        display={num('shockPersistence', 2)}
        ariaText={t.ariaPlain(aria(f.num(s.shockPersistence, { dp: 2 })))}
        help={t.persistenceHelp}
      />
    </>
  );

  const rStarValue = s.rStar ?? dataRStar ?? SLIDERS.rStar.def;

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-base font-bold">{t.controlsTitle}</h2>
        <p className="text-xs text-muted">{t.controlsHint}</p>
      </header>

      <Presets />

      <div>
        <div
          role="tablist"
          aria-label={t.controlsTitle}
          className="grid grid-cols-3 gap-1 rounded-xl border border-line bg-bg-2/60 p-1"
        >
          {TABS.map((tab) => {
            const active = s.tab === tab;
            return (
              <button
                key={tab}
                id={`${idPrefix}-${uid}-tab-${tab}`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={`${idPrefix}-${uid}-panel`}
                tabIndex={active ? 0 : -1}
                onClick={() => set({ tab })}
                onKeyDown={(e) => {
                  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
                  e.preventDefault();
                  const rtl = document.documentElement.dir === 'rtl';
                  const delta = (e.key === 'ArrowRight' ? 1 : -1) * (rtl ? -1 : 1);
                  const next = TABS[(TABS.indexOf(s.tab) + delta + TABS.length) % TABS.length]!;
                  set({ tab: next });
                  document.getElementById(`${idPrefix}-${uid}-tab-${next}`)?.focus();
                }}
                className={`rounded-lg px-1 py-2 text-xs font-semibold transition-colors sm:text-sm ${
                  active
                    ? 'bg-scenario text-on-accent shadow'
                    : 'text-muted hover:bg-panel-hover hover:text-fg'
                }`}
              >
                {t.tabs[tab]}
              </button>
            );
          })}
        </div>
        <div
          id={`${idPrefix}-${uid}-panel`}
          role="tabpanel"
          aria-labelledby={`${idPrefix}-${uid}-tab-${s.tab}`}
          className="mt-3 space-y-4"
        >
          <p className="text-xs leading-relaxed text-muted">{t.tabHints[s.tab]}</p>
          {s.tab !== 'shock' && rate}
          {s.tab !== 'rate' && shock}
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="text-sm font-medium">{t.baseline}</div>
        <Segmented
          label={t.baseline}
          value={s.baselineMode}
          onChange={(baselineMode) => set({ baselineMode })}
          options={[
            { value: 'market', label: t.baselineMarket },
            { value: 'rule', label: t.baselineRule },
          ]}
        />
        <p className="text-xs text-muted">{t.baselineHelp}</p>
      </div>

      <details className="group rounded-xl border border-line bg-bg-2/40 open:bg-bg-2/60">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold [&::-webkit-details-marker]:hidden">
          {t.advanced}
          <ChevronIcon className="transition-transform group-open:rotate-180" />
        </summary>
        <div className="space-y-4 px-3 pt-1 pb-3">
          <Slider
            label={t.phiPi}
            value={s.phiPi}
            {...bind('phiPi')}
            display={num('phiPi', 2)}
            ariaText={t.ariaPlain(aria(f.num(s.phiPi, { dp: 2 })))}
            ends={t.phiPiEnds}
            help={t.phiPiHelp}
          />
          <Slider
            label={t.lambda}
            value={s.lambda}
            {...bind('lambda')}
            display={num('lambda', 2)}
            ariaText={t.ariaPlain(aria(f.num(s.lambda, { dp: 2 })))}
            ends={t.lambdaEnds}
            help={t.lambdaHelp}
          />
          <div>
            <Slider
              label={t.rStar}
              value={rStarValue}
              {...bind('rStar')}
              display={f.rate(rStarValue)}
              ariaText={t.ariaPercent(aria(f.num(rStarValue, { dp: 2 })))}
              help={t.rStarHelp}
            />
            <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted">
              <span>{t.fromData(f.rate(dataRStar))}</span>
              {s.rStar !== null && (
                <button
                  type="button"
                  className="underline hover:text-fg"
                  onClick={() => set({ rStar: null })}
                >
                  {t.useData}
                </button>
              )}
            </div>
          </div>
          <Slider
            label={t.demandShock}
            value={s.demandShock}
            {...bind('demandShock')}
            origin={0}
            display={`${num('demandShock', 2, true)} ${t.ppShort}`}
            ariaText={t.ariaPp(aria(f.num(s.demandShock, { dp: 2, signed: true })))}
            help={t.demandShockHelp}
          />
          <Slider
            label={t.oilShock}
            value={s.oilShock}
            {...bind('oilShock')}
            origin={0}
            display={`${num('oilShock', 0, true)}%`}
            ariaText={t.ariaPercent(aria(f.num(s.oilShock, { dp: 0, signed: true })))}
            help={t.oilShockHelp}
          />
          <Slider
            label={t.horizon}
            value={s.horizon}
            {...bind('horizon')}
            display={t.quarterUnit(num('horizon', 0))}
            ariaText={t.ariaQuarters(aria(String(s.horizon)))}
            help={t.horizonHelp}
          />
          <MarketOverride />
        </div>
      </details>

      <ActionBar />
    </div>
  );
}
