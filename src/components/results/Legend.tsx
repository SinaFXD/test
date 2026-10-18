export type Swatch = 'solid' | 'dashed' | 'dotted' | 'dot' | 'band' | 'thin';

export interface LegendItem {
  label: string;
  color: string;
  swatch: Swatch;
  opacity?: number;
}

function Mark({ color, swatch, opacity = 1 }: Omit<LegendItem, 'label'>) {
  if (swatch === 'dot')
    return (
      <span
        className="inline-block size-2.5 rounded-full ring-2 ring-panel-solid"
        style={{ background: color, opacity }}
      />
    );
  if (swatch === 'band')
    return (
      <span
        className="inline-block h-2.5 w-4 rounded-sm"
        style={{ background: color, opacity: 0.25 }}
      />
    );
  const style = swatch === 'solid' ? 'solid' : swatch === 'thin' ? 'solid' : swatch;
  return (
    <span
      className="inline-block w-5"
      style={{ borderTop: `${swatch === 'thin' ? 1.5 : 2}px ${style} ${color}`, opacity }}
    />
  );
}

/** HTML legend (identity never by color alone: every item has a line style + label). */
export function Legend({ items, className = '' }: { items: LegendItem[]; className?: string }) {
  return (
    <ul className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted ${className}`}>
      {items.map((it) => (
        <li key={it.label} className="inline-flex items-center gap-1.5">
          <Mark color={it.color} swatch={it.swatch} opacity={it.opacity} />
          <span>{it.label}</span>
        </li>
      ))}
    </ul>
  );
}
