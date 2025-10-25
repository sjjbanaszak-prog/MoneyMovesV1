import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);
import { parseNumber } from "./parseNumber";

export function parseToSeries(uploads, selectedIndexes = null) {
  const combined = {};

  uploads.forEach((upload, index) => {
    if (selectedIndexes && !selectedIndexes.includes(index)) return;

    const { rawData, mapping, accountName, dateFormat } = upload;

    rawData.forEach((row) => {
      const rawDate = row[mapping.date];
      const parsed = dayjs(rawDate, dateFormat, true);
      if (!parsed.isValid()) return;

      const date = parsed.format("YYYY-MM-DD");
      const balance = parseNumber(row[mapping.balance]);

      if (!combined[date]) combined[date] = { date, total: 0 };
      combined[date][accountName] = balance;
      combined[date].total += balance;
    });
  });

  return Object.values(combined).sort((a, b) => a.date.localeCompare(b.date));
}
