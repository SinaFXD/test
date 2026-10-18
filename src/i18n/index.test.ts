import { fa } from './fa';
import { isolateSigned, persianize } from './index';

describe('Persian copy', () => {
  it('uses Latin digits in source (Persian digits are a user setting)', () => {
    expect(JSON.stringify(fa)).not.toMatch(/[۰-۹]/);
  });

  it('isolates signed numbers and percentages so they render correctly in RTL', () => {
    expect(isolateSigned('فدرال عقاب +100')).toBe('فدرال عقاب ⁦+100⁩');
    expect(isolateSigned('شوک نفتی +40%')).toBe('شوک نفتی ⁦+40%⁩');
    expect(isolateSigned('کاهش −150')).toBe('کاهش ⁦−150⁩');
    expect(isolateSigned('⁦+80 bp⁩')).toBe('⁦+80 bp⁩');
    expect(isolateSigned('سال 2027')).toBe('سال 2027');
  });

  it('converts standalone digits but leaves IDs alone', () => {
    expect(persianize('هدف 2%')).toBe('هدف ۲%');
    expect(persianize('GDPC1 و 5y5y')).toBe('GDPC1 و 5y5y');
  });
});
