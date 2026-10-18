import { useT } from '../i18n';
import { Popover } from './Popover';

/** Inline glossary tooltips for the key terms (full glossary lives in the Learn drawer). */
export function GlossaryChips() {
  const t = useT();
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <span className="text-muted">{t.glossaryInline}:</span>
      {t.glossary.slice(0, 6).map((g) => (
        <Popover
          key={g.term}
          label={g.term}
          triggerClassName="rounded-full border border-dashed border-line-strong px-2 py-0.5 text-muted hover:text-fg"
          trigger={g.term}
          panelClassName="!start-0 !end-auto text-sm"
        >
          <p className="font-semibold">{g.term}</p>
          <p className="mt-1 leading-relaxed text-muted">{g.def}</p>
        </Popover>
      ))}
    </div>
  );
}
