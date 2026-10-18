import { useId, useMemo } from 'react';
import { isolateSigned, persianize, useT } from '../../i18n';
import { STORIES } from '../../i18n/history';
import type { HistoryPresetId } from '../../model/presets';
import { usePrefs } from '../../state/prefs';

/** What really happened in a historical preset's episode (lazy chunk). */
export default function PresetStory({ id }: { id: HistoryPresetId }) {
  const t = useT();
  const uid = useId();
  const lang = usePrefs((s) => s.lang);
  const pd = usePrefs((s) => s.persianDigits);
  const fix = useMemo(
    () =>
      lang !== 'fa'
        ? (s: string) => s
        : pd
          ? (s: string) => persianize(isolateSigned(s))
          : isolateSigned,
    [lang, pd],
  );
  const { labels, stories } = STORIES[lang === 'fa' ? 'fa' : 'en'];
  const story = stories[id];
  const rows = [
    [labels.happened, story.happened],
    [labels.fed, story.fed],
    [labels.after, story.after],
  ] as const;
  return (
    <article
      aria-live="polite"
      aria-labelledby={uid}
      className="space-y-2 rounded-xl border border-line bg-bg-2/60 p-3 text-xs leading-relaxed"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-x-2">
        <h4 id={uid} className="text-sm font-bold">
          {t.presetsHistory[id].name}
        </h4>
        <span className="text-muted">{fix(story.period)}</span>
      </header>
      <dl className="space-y-2">
        {rows.map(([label, text]) => (
          <div key={label}>
            <dt className="font-semibold">{label}</dt>
            <dd className="text-muted">{fix(text)}</dd>
          </div>
        ))}
      </dl>
      <p className="border-t border-line pt-2 text-muted">{fix(labels.caveat)}</p>
    </article>
  );
}
