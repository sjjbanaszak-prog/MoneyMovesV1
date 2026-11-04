import { problemReportExpiry } from './problemReports';

describe('problemReportExpiry', () => {
  test('is 12 months after the report date', () => {
    expect(problemReportExpiry(new Date(2026, 10, 4))).toEqual(new Date(2027, 10, 4));
  });

  test('does not change the date passed in', () => {
    const from = new Date(2026, 0, 15);
    problemReportExpiry(from);
    expect(from).toEqual(new Date(2026, 0, 15));
  });
});
