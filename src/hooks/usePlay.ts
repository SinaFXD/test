import { useEffect } from 'react';
import { useSim } from '../state/sim';
import { useView } from '../state/view';

const STEP_MS = 450;

/** Drives Play: reveals one quarter per tick and moves the scrubber with it. */
export function usePlayDriver(): void {
  const playing = useView((s) => s.playing);
  const horizon = useSim((s) => s.result?.horizon ?? 0);
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      const { playQuarter, set } = useView.getState();
      const next = (playQuarter ?? -1) + 1;
      if (next > horizon) {
        set({ playing: false, playQuarter: null });
        return;
      }
      set({ playQuarter: next, scrubQuarter: next });
    }, STEP_MS);
    return () => clearInterval(id);
  }, [playing, horizon]);
}

export function togglePlay(): void {
  const { playing, set } = useView.getState();
  if (playing) set({ playing: false, playQuarter: null });
  else set({ playing: true, playQuarter: 0, scrubQuarter: 0 });
}
