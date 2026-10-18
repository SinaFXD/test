import type { BankConfig } from '../types';
import { FED_SERIES } from './series';

export const FED: BankConfig = {
  id: 'fed',
  name: { fa: 'فدرال رزرو آمریکا', en: 'U.S. Federal Reserve' },
  currency: 'USD',
  inflationTarget: 2,
  elb: 0.125,
  series: FED_SERIES,
  calendarUrl: 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm',
};

export { FED_SERIES, fredSeriesUrl, type FedSeriesKey } from './series';
