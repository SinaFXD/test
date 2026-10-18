import { FED_SERIES } from '../../banks/fed/series';
import { useFmt } from '../../hooks/useFmt';
import { useNow } from '../../hooks/useNow';
import { useT } from '../../i18n';
import { fmtRelative, fomcDecisionTime } from '../../i18n/format';
import { isStale } from '../../data/staleness';
import { useData } from '../../state/data';
import { usePrefs } from '../../state/prefs';
import { useView } from '../../state/view';
import { BookIcon, ClockIcon, DbIcon, MoonIcon, SunIcon, WarnIcon } from '../icons';
import { Popover } from '../Popover';

function FomcCountdown() {
  const t = useT();
  const f = useFmt();
  const now = useNow(30_000);
  const meetings = useData((s) => s.data?.fomc.meetings) ?? [];
  const next = meetings.find((m) => fomcDecisionTime(m.date) > now.getTime());
  if (!next) return <span className="chip text-muted">{t.fomcNone}</span>;
  const ms = fomcDecisionTime(next.date) - now.getTime();
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  const sameDay = new Date(now).toISOString().slice(0, 10) === next.date;
  return (
    <div
      className="chip gap-1.5 border-line-strong bg-bg-2/60 py-1 text-xs"
      title={`${f.jalali(next.date)}${next.sep ? ` · ${t.sepMeeting}` : ''}`}
    >
      <ClockIcon size={14} className="text-accent-text" />
      <span className="text-muted">{t.nextFomc}:</span>
      <span className="font-semibold">{f.date(next.date, true)}</span>
      {next.sep && (
        <span aria-label={t.sepMeeting} className="text-sep">
          ★
        </span>
      )}
      <span className="num font-semibold text-accent-text" aria-live="off">
        {sameDay ? t.fomcToday : f.digits(t.countdown(String(days), String(hours), String(mins)))}
      </span>
    </div>
  );
}

function UpdatedBadge() {
  const t = useT();
  const f = useFmt();
  const now = useNow(60_000);
  const data = useData((s) => s.data);
  const lang = usePrefs((s) => s.lang);
  if (!data) return null;
  const staleCount = FED_SERIES.filter((s) => {
    const d = data.series[s.key];
    return d && isStale(d, now);
  }).length;
  return (
    <Popover
      label={t.asOfList}
      triggerClassName="chip gap-1.5 border-line-strong bg-bg-2/60 py-1 text-xs hover:bg-panel-hover"
      trigger={
        <>
          {staleCount > 0 && <WarnIcon size={14} className="text-warn" />}
          <span>{f.digits(t.updatedAgo(fmtRelative(data.generatedAt, lang, now)))}</span>
          {staleCount > 0 && (
            <span className="text-warn">
              · {f.digits(String(staleCount))} {t.stale}
            </span>
          )}
        </>
      }
    >
      <h3 className="mb-2 text-sm font-semibold">{t.asOfList}</h3>
      <ul className="max-h-72 space-y-1 overflow-auto text-xs">
        {FED_SERIES.filter((s) => s.kind === 'observed').map((s) => {
          const d = data.series[s.key];
          return (
            <li key={s.key} className="flex items-center justify-between gap-3">
              <span className="font-mono text-muted">{s.id}</span>
              <span className="num" title={d ? f.jalali(d.lastObservationDate) : undefined}>
                {d ? f.date(d.lastObservationDate, true) : t.unavailable}
                {d && isStale(d, now) && <span className="ms-1 text-warn">({t.stale})</span>}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 border-t border-line pt-2 text-xs text-muted">
        {t.lastUpdated}: {f.date(data.generatedAt.slice(0, 10))} · {t.sourceAttribution}
      </p>
    </Popover>
  );
}

export function Header() {
  const t = useT();
  const lang = usePrefs((s) => s.lang);
  const theme = usePrefs((s) => s.theme);
  const setPrefs = usePrefs((s) => s.set);
  const setView = useView((s) => s.set);
  const iconBtn = 'btn size-9 px-0 sm:size-auto sm:px-3';

  return (
    <header className="glass flex flex-col gap-3 px-3 py-3 sm:px-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <img
            src={`${import.meta.env.BASE_URL}favicon.svg`}
            alt=""
            width={36}
            height={36}
            className="shrink-0 rounded-lg"
          />
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold sm:text-lg">{t.appName}</h1>
            <p className="hidden truncate text-xs text-muted sm:block">{t.tagline}</p>
          </div>
        </div>
        <nav className="flex shrink-0 items-center gap-1.5" aria-label={t.appName}>
          <button
            type="button"
            className={iconBtn}
            onClick={() => setView({ learnOpen: true })}
            aria-label={t.menuLearn}
          >
            <BookIcon />
            <span className="hidden sm:inline">{t.menuLearn}</span>
          </button>
          <button
            type="button"
            className={iconBtn}
            onClick={() => setView({ sourcesOpen: true })}
            aria-label={t.menuSources}
          >
            <DbIcon />
            <span className="hidden md:inline">{t.menuSources}</span>
          </button>
          <button
            type="button"
            className="btn px-2.5"
            lang={lang === 'fa' ? 'en' : 'fa'}
            aria-label={t.langToggleLabel}
            onClick={() => setPrefs({ lang: lang === 'fa' ? 'en' : 'fa' })}
          >
            {t.langToggle}
          </button>
          <button
            type="button"
            className="btn size-9 px-0"
            aria-label={theme === 'dark' ? t.themeToLight : t.themeToDark}
            title={theme === 'dark' ? t.themeToLight : t.themeToDark}
            onClick={() => setPrefs({ theme: theme === 'dark' ? 'light' : 'dark' })}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
        </nav>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <FomcCountdown />
        <UpdatedBadge />
      </div>
    </header>
  );
}
