import { ageFromDob } from './pensionDates';

describe('ageFromDob', () => {
  const today = new Date(2026, 10, 5); // 5 Nov 2026

  test('counts whole years, before and after this year’s birthday', () => {
    expect(ageFromDob('1988-11-05', today)).toBe(38); // birthday today
    expect(ageFromDob('1988-11-06', today)).toBe(37); // birthday tomorrow
    expect(ageFromDob('1988-03-01', today)).toBe(38);
  });

  test('returns null for missing, invalid or future dates', () => {
    expect(ageFromDob('', today)).toBeNull();
    expect(ageFromDob('not a date', today)).toBeNull();
    expect(ageFromDob('2030-01-01', today)).toBeNull();
  });
});
