import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);

export class DataValidator {
  constructor(data, mapping, dateFormat) {
    this.data = data;
    this.mapping = mapping;
    this.dateFormat = dateFormat;
    this.issues = [];
  }

  validate() {
    this.validateDates();
    this.validateNumericFields();
    this.validateDataConsistency();
    this.validateBalanceProgression();

    return {
      isValid: this.issues.length === 0,
      issues: this.issues,
      cleanedData: this.getCleanedData(),
    };
  }

  validateDates() {
    if (!this.mapping.date) {
      this.issues.push({
        type: "error",
        field: "date",
        message: "No date column mapped",
      });
      return;
    }

    const dateField = this.mapping.date;
    let validDates = 0;
    let invalidDates = 0;

    this.data.forEach((row, index) => {
      const dateValue = row[dateField];
      if (!dateValue) {
        this.issues.push({
          type: "warning",
          field: "date",
          row: index + 1,
          message: `Missing date value at row ${index + 1}`,
        });
        return;
      }

      const parsed = dayjs(dateValue, this.dateFormat, true);
      if (!parsed.isValid()) {
        invalidDates++;
        this.issues.push({
          type: "error",
          field: "date",
          row: index + 1,
          message: `Invalid date "${dateValue}" at row ${index + 1}`,
        });
      } else {
        validDates++;
      }
    });

    if (invalidDates > validDates * 0.1) {
      this.issues.push({
        type: "error",
        field: "date",
        message: `Too many invalid dates (${invalidDates}/${this.data.length})`,
      });
    }
  }

  validateNumericFields() {
    const numericFields = ["balance", "debit", "credit", "amount"];

    numericFields.forEach((field) => {
      if (!this.mapping[field]) return;

      const fieldName = this.mapping[field];
      let validNumbers = 0;
      let invalidNumbers = 0;

      this.data.forEach((row, index) => {
        const value = row[fieldName];
        if (value === "" || value == null) return;

        const parsed = this.parseNumber(value);
        if (isNaN(parsed)) {
          invalidNumbers++;
          this.issues.push({
            type: "warning",
            field: field,
            row: index + 1,
            message: `Invalid ${field} value "${value}" at row ${index + 1}`,
          });
        } else {
          validNumbers++;
        }
      });

      if (invalidNumbers > 0 && invalidNumbers > validNumbers * 0.05) {
        this.issues.push({
          type: "warning",
          field: field,
          message: `${field} field has ${invalidNumbers} invalid values`,
        });
      }
    });
  }

  validateDataConsistency() {
    const hasBalance =
      this.mapping.balance &&
      this.data.some(
        (row) =>
          row[this.mapping.balance] != null && row[this.mapping.balance] !== ""
      );

    const hasDebitCredit =
      (this.mapping.debit || this.mapping.credit) &&
      this.data.some(
        (row) =>
          (this.mapping.debit &&
            row[this.mapping.debit] != null &&
            row[this.mapping.debit] !== "") ||
          (this.mapping.credit &&
            row[this.mapping.credit] != null &&
            row[this.mapping.credit] !== "")
      );

    if (!hasBalance && !hasDebitCredit) {
      this.issues.push({
        type: "error",
        field: "structure",
        message: "No balance or transaction amount data found",
      });
    }
  }

  validateBalanceProgression() {
    if (!this.mapping.balance || !this.mapping.date) return;

    const sortedRows = this.data
      .filter((row) => {
        const date = dayjs(row[this.mapping.date], this.dateFormat, true);
        const balance = this.parseNumber(row[this.mapping.balance]);
        return date.isValid() && !isNaN(balance);
      })
      .sort((a, b) => {
        const dateA = dayjs(a[this.mapping.date], this.dateFormat, true);
        const dateB = dayjs(b[this.mapping.date], this.dateFormat, true);
        return dateA.diff(dateB);
      });

    if (sortedRows.length < 2) return;

    for (let i = 1; i < sortedRows.length; i++) {
      const prevBalance = this.parseNumber(
        sortedRows[i - 1][this.mapping.balance]
      );
      const currBalance = this.parseNumber(sortedRows[i][this.mapping.balance]);
      const change = Math.abs(currBalance - prevBalance);

      if (change > 100000) {
        const currDate = sortedRows[i][this.mapping.date];
        this.issues.push({
          type: "warning",
          field: "balance",
          message: `Large balance change (£${change.toLocaleString()}) on ${currDate}`,
        });
      }
    }
  }

  parseNumber(value) {
    if (typeof value === "number") return value;
    if (typeof value !== "string" || value === "") return NaN;

    const cleaned = value.replace(/[£$,\s]/g, "");

    if (cleaned.startsWith("(") && cleaned.endsWith(")")) {
      return -parseFloat(cleaned.slice(1, -1));
    }

    return parseFloat(cleaned);
  }

  getCleanedData() {
    return this.data.filter((row) => {
      if (this.mapping.date) {
        const date = dayjs(row[this.mapping.date], this.dateFormat, true);
        if (!date.isValid()) return false;
      }
      return true;
    });
  }
}

export function calculateDataQualityScore(data, mapping, dateFormat) {
  const validator = new DataValidator(data, mapping, dateFormat);
  const result = validator.validate();

  let score = 100;

  result.issues.forEach((issue) => {
    if (issue.type === "error") {
      score -= 20;
    } else if (issue.type === "warning") {
      score -= 5;
    }
  });

  return {
    score: Math.max(0, score),
    issues: result.issues,
    recommendations: generateRecommendations(result.issues),
  };
}

function generateRecommendations(issues) {
  const recommendations = [];

  const hasDateIssues = issues.some((i) => i.field === "date");
  const hasNumericIssues = issues.some((i) =>
    ["balance", "debit", "credit"].includes(i.field)
  );

  if (hasDateIssues) {
    recommendations.push(
      "Consider checking the date format or cleaning date values"
    );
  }

  if (hasNumericIssues) {
    recommendations.push("Review numeric fields for proper formatting");
  }

  if (issues.length > 10) {
    recommendations.push(
      "This file may need significant cleanup before processing"
    );
  }

  return recommendations;
}
