import { fa } from './fa';

describe('Persian copy', () => {
  it('uses Latin digits in source (Persian digits are a user setting)', () => {
    expect(JSON.stringify(fa)).not.toMatch(/[۰-۹]/);
  });
});
