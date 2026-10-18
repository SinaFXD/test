import { create } from 'zustand';
import { loadLatest, type DataSource } from '../data/client';
import type { LatestData } from '../data/schema';

interface DataStore {
  status: 'loading' | 'ready' | 'error';
  data: LatestData | null;
  source: DataSource | null;
  error: string | null;
  load: () => Promise<void>;
}

export const useData = create<DataStore>((set) => ({
  status: 'loading',
  data: null,
  source: null,
  error: null,
  load: async () => {
    try {
      const { data, source, error } = await loadLatest();
      set({ status: 'ready', data, source, error: error ?? null });
    } catch (err) {
      set({ status: 'error', error: err instanceof Error ? err.message : String(err) });
    }
  },
}));
