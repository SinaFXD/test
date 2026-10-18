import { usePrefs, type Lang } from '../state/prefs';
import { en } from './en';
import { fa, type Messages } from './fa';

export const MESSAGES: Record<Lang, Messages> = { fa, en };

export function useT(): Messages {
  return MESSAGES[usePrefs((s) => s.lang)];
}

export type { Messages };
