import { create } from 'zustand';

export type ChartId = 'inflation' | 'unemployment' | 'gdpGrowth' | 'outputGap' | 'yields';

interface ViewStore {
  /** Quarter under the time scrubber (0 = today). */
  scrubQuarter: number;
  playing: boolean;
  /** While playing: last revealed quarter; null = show everything. */
  playQuarter: number | null;
  overlayWeek: boolean;
  overlayMonth: boolean;
  diffOnly: Partial<Record<ChartId, boolean>>;
  sheetOpen: boolean;
  learnOpen: boolean;
  sourcesOpen: boolean;
  toast: string | null;
  bannerDismissed: boolean;
  set: (patch: Partial<Omit<ViewStore, 'set' | 'toggleDiff' | 'showToast'>>) => void;
  toggleDiff: (id: ChartId) => void;
  showToast: (msg: string) => void;
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;

export const useView = create<ViewStore>((set, get) => ({
  scrubQuarter: 4,
  playing: false,
  playQuarter: null,
  overlayWeek: false,
  overlayMonth: false,
  diffOnly: {},
  sheetOpen: false,
  learnOpen: false,
  sourcesOpen: false,
  toast: null,
  bannerDismissed: false,
  set: (patch) => set(patch),
  toggleDiff: (id) => set({ diffOnly: { ...get().diffOnly, [id]: !get().diffOnly[id] } }),
  showToast: (msg) => {
    clearTimeout(toastTimer);
    set({ toast: msg });
    toastTimer = setTimeout(() => set({ toast: null }), 2400);
  },
}));
