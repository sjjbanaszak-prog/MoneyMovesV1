import React, { useMemo } from "react";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { parseNumber } from "./utils/parseNumber";
import "./ISALISAUtilization.css";

dayjs.extend(customParseFormat);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

// UK ISA allowances for financial year 2025-26
const TOTAL_ISA_ALLOWANCE = 20000;
const LISA_ALLOWANCE = 4000;

// Helper function to format currency to 2 decimal places
const formatCurrency = (amount) => {
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Helper function to get the current UK financial year
const getCurrentFinancialYear = () => {
  const now = dayjs();
  const currentYear = now.year();
  const apriFifth = dayjs(`${currentYear}-04-05`);

  if (now.isBefore(apriFifth)) {
    // We're in the period Jan-Apr 4th, so financial year started previous calendar year
    return {
      start: dayjs(`${currentYear - 1}-04-05`),
      end: dayjs(`${currentYear}-04-04`),
      label: `${currentYear - 1}/${currentYear.toString().slice(2)}`,
    };
  } else {
    // We're after Apr 5th, so financial year started this calendar year
    return {
      start: dayjs(`${currentYear}-04-05`),
      end: dayjs(`${currentYear + 1}-04-04`),
      label: `${currentYear}/${(currentYear + 1).toString().slice(2)}`,
    };
  }
};

export default function ISALISAUtilization({ uploads }) {
  const isaLisaAccounts = uploads.filter(
    (upload) => upload.accountType === "ISA" || upload.accountType === "LISA"
  );

  const utilization = useMemo(() => {
    if (isaLisaAccounts.length === 0) return { groups: [], totalUtilized: 0 };

    const currentFY = getCurrentFinancialYear();

    // Group accounts by type and calculate deposits for each account
    const accountData = isaLisaAccounts.map((upload) => {
      const { rawData, mapping, dateFormat, accountName, accountType, bank } =
        upload;

      // Filter transactions within current financial year
      const fyTransactions = rawData.filter((row) => {
        const rowDate = dayjs(row[mapping.date], dateFormat, true);
        return (
          rowDate.isValid() &&
          rowDate.isSameOrAfter(currentFY.start) &&
          rowDate.isSameOrBefore(currentFY.end)
        );
      });

      let utilized = 0;
      let interestEarned = 0;
      let depositCount = 0;
      let firstDeposit = null;
      let lastDeposit = null;
      let currentBalance = 0;

      if (fyTransactions.length > 0) {
        // Sort transactions by date
        const sortedTransactions = fyTransactions.sort((a, b) =>
          dayjs(a[mapping.date], dateFormat, true).diff(
            dayjs(b[mapping.date], dateFormat, true)
          )
        );

        // Calculate deposits (credits) during financial year, excluding interest
        const allCredits = sortedTransactions.filter((row) => {
          const credit = parseNumber(row[mapping.credit]);
          return credit > 0;
        });

        // Filter out interest payments (common terms used in bank statements)
        const interestKeywords = [
          "interest",
          "int",
          "credit interest",
          "account interest",
          "savings interest",
          "interest credit",
          "annual interest",
          "monthly interest",
          "quarterly interest",
          "bonus interest",
          "regular saver interest",
          "isa interest",
          "interest on cash",
          "dividend adjustment",
        ];

        const deposits = allCredits.filter((row) => {
          const description = (row[mapping.description] || "").toLowerCase();
          return !interestKeywords.some((keyword) =>
            description.includes(keyword)
          );
        });

        const interestPayments = allCredits.filter((row) => {
          const description = (row[mapping.description] || "").toLowerCase();
          return interestKeywords.some((keyword) =>
            description.includes(keyword)
          );
        });

        utilized = deposits.reduce((sum, row) => {
          return sum + parseNumber(row[mapping.credit]);
        }, 0);

        interestEarned = interestPayments.reduce((sum, row) => {
          return sum + parseNumber(row[mapping.credit]);
        }, 0);

        depositCount = deposits.length;

        if (deposits.length > 0) {
          firstDeposit = dayjs(deposits[0][mapping.date], dateFormat, true);
          lastDeposit = dayjs(
            deposits[deposits.length - 1][mapping.date],
            dateFormat,
            true
          );
        }

        // Get current balance (most recent transaction)
        const mostRecentTransaction =
          sortedTransactions[sortedTransactions.length - 1];
        currentBalance = parseNumber(mostRecentTransaction[mapping.balance]);
      }

      return {
        accountName,
        accountType,
        bank,
        utilized,
        interestEarned,
        depositCount,
        firstDeposit,
        lastDeposit,
        currentBalance,
      };
    });

    // Group by account type
    const isaAccounts = accountData.filter((acc) => acc.accountType === "ISA");
    const lisaAccounts = accountData.filter(
      (acc) => acc.accountType === "LISA"
    );

    // Calculate totals
    const totalISAUtilized = isaAccounts.reduce(
      (sum, acc) => sum + acc.utilized,
      0
    );
    const totalLISAUtilized = lisaAccounts.reduce(
      (sum, acc) => sum + acc.utilized,
      0
    );
    const totalUtilized = totalISAUtilized + totalLISAUtilized;

    // Calculate total interest earned
    const totalISAInterest = isaAccounts.reduce(
      (sum, acc) => sum + acc.interestEarned,
      0
    );
    const totalLISAInterest = lisaAccounts.reduce(
      (sum, acc) => sum + acc.interestEarned,
      0
    );
    const totalInterestEarned = totalISAInterest + totalLISAInterest;

    // Check for over-contributions
    const lisaOverContribution = Math.max(
      0,
      totalLISAUtilized - LISA_ALLOWANCE
    );
    const totalOverContribution = Math.max(
      0,
      totalUtilized - TOTAL_ISA_ALLOWANCE
    );
    const isLisaOverContributed = lisaOverContribution > 0;
    const isTotalOverContributed = totalOverContribution > 0;

    // Calculate remaining allowances (LISA comes out of total ISA allowance)
    const remainingLISA = LISA_ALLOWANCE - totalLISAUtilized;
    const usedFromTotalAllowance = totalUtilized;
    const remainingTotal = TOTAL_ISA_ALLOWANCE - usedFromTotalAllowance;

    const groups = [];

    if (lisaAccounts.length > 0) {
      const lisaPercentage = (totalLISAUtilized / LISA_ALLOWANCE) * 100;

      // If total ISA limit is reached and there are LISA deposits, remaining LISA should be 0
      const effectiveRemainingLISA =
        totalUtilized >= TOTAL_ISA_ALLOWANCE && totalLISAUtilized > 0
          ? 0
          : remainingLISA;

      // Check if LISA is blocked due to total ISA limit being reached
      const isLisaBlocked =
        totalUtilized >= TOTAL_ISA_ALLOWANCE &&
        totalLISAUtilized > 0 &&
        remainingLISA > 0;

      groups.push({
        type: "LISA",
        accounts: lisaAccounts,
        totalUtilized: totalLISAUtilized,
        totalInterest: totalLISAInterest,
        allowance: LISA_ALLOWANCE,
        remaining: effectiveRemainingLISA,
        percentage: lisaPercentage,
        isOverContributed: isLisaOverContributed,
        overContribution: lisaOverContribution,
        isBlocked: isLisaBlocked,
        blockedAmount: isLisaBlocked ? remainingLISA : 0,
      });
    }

    if (isaAccounts.length > 0) {
      // ISA allowance is the remaining total allowance after LISA contributions
      const effectiveLisaUsed = Math.min(totalLISAUtilized, LISA_ALLOWANCE);
      const isaAllowance = Math.max(0, TOTAL_ISA_ALLOWANCE - effectiveLisaUsed);
      const isaRemaining = isaAllowance - totalISAUtilized;
      const isaPercentage =
        isaAllowance > 0 ? (totalISAUtilized / isaAllowance) * 100 : 0;
      const isIsaOverContributed = totalISAUtilized > isaAllowance;

      groups.push({
        type: "ISA",
        accounts: isaAccounts,
        totalUtilized: totalISAUtilized,
        totalInterest: totalISAInterest,
        allowance: isaAllowance,
        remaining: isaRemaining,
        percentage: isaPercentage,
        isOverContributed: isIsaOverContributed,
        overContribution: Math.max(0, totalISAUtilized - isaAllowance),
      });
    }

    return {
      groups,
      totalUtilized: usedFromTotalAllowance,
      totalInterestEarned,
      remainingTotal,
      totalAllowance: TOTAL_ISA_ALLOWANCE,
      isTotalOverContributed,
      totalOverContribution,
    };
  }, [isaLisaAccounts]);

  if (utilization.groups.length === 0) return null;

  const currentFY = getCurrentFinancialYear();

  // Helper function to get countdown message
  const getCountdownMessage = () => {
    const daysRemaining = currentFY.end.diff(dayjs(), "day") + 1;

    if (utilization.isTotalOverContributed) {
      return `You have exceeded your annual ISA allowance by £${formatCurrency(
        utilization.totalOverContribution
      )}. This may result in tax implications and penalties. Contact HMRC or a financial advisor to assist with this issue.`;
    } else if (utilization.totalUtilized >= TOTAL_ISA_ALLOWANCE) {
      return `You have reached your maximum annual ISA allowance of £${formatCurrency(
        TOTAL_ISA_ALLOWANCE
      )} for FY ${
        currentFY.label
      }. Do not deposit any more funds into ISA or LISA accounts this financial year.`;
    } else if (daysRemaining > 0) {
      return `${daysRemaining} days remaining to maximize your ISA contributions for FY ${currentFY.label}`;
    } else {
      return `Financial year ${currentFY.label} has ended`;
    }
  };

  return (
    <div className="isa-lisa-wrapper dark-mode">
      <div className="utilization-header">
        <h3 className="utilization-title">ISA/LISA Utilization</h3>
        <div className="financial-year">FY {currentFY.label}</div>
      </div>

      <div className="total-allowance-overview">
        <div className="total-used">
          <span className="total-label">Total Used:</span>
          <span
            className={`total-amount ${
              utilization.isTotalOverContributed ? "over-contributed" : ""
            }`}
          >
            £{formatCurrency(utilization.totalUtilized)} / £
            {formatCurrency(utilization.totalAllowance)}
          </span>
        </div>
        <div className="progress-container">
          <div className="progress-bar">
            <div
              className={`progress-fill ${
                utilization.isTotalOverContributed
                  ? "over-contributed"
                  : "total"
              }`}
              style={{
                width: `${Math.min(
                  (utilization.totalUtilized / utilization.totalAllowance) *
                    100,
                  100
                )}%`,
              }}
            />
          </div>
          <div
            className={`progress-label ${
              utilization.remainingTotal < 0 ? "negative-remaining" : ""
            }`}
          >
            {utilization.remainingTotal >= 0
              ? `£${formatCurrency(
                  utilization.remainingTotal
                )} remaining of total allowance`
              : `£${formatCurrency(
                  Math.abs(utilization.remainingTotal)
                )} over annual allowance limit`}
          </div>
        </div>
        <div
          className={`fy-countdown ${
            utilization.isTotalOverContributed
              ? "over-contributed-warning"
              : utilization.totalUtilized >= TOTAL_ISA_ALLOWANCE
              ? "limit-reached-warning"
              : ""
          }`}
        >
          {getCountdownMessage()}
        </div>
      </div>

      {utilization.totalInterestEarned > 0 && (
        <div className="interest-overview-card">
          <div className="interest-header">
            <h4 className="interest-title">
              Interest Earned This Financial Year
            </h4>
            <div className="interest-amount">
              £{formatCurrency(utilization.totalInterestEarned)}
            </div>
          </div>

          <div className="interest-breakdown">
            {utilization.groups.map(
              (group) =>
                group.totalInterest > 0 && (
                  <div key={group.type} className="interest-group">
                    <div className="interest-group-header">
                      <span className="interest-group-type">
                        {group.type} Interest:
                      </span>
                      <span className="interest-group-amount">
                        £{formatCurrency(group.totalInterest)}
                      </span>
                    </div>
                    <div className="interest-accounts-list">
                      {group.accounts
                        .filter((acc) => acc.interestEarned > 0)
                        .map((account, idx) => {
                          // Calculate interest rate as percentage of current balance
                          const interestRate =
                            account.currentBalance > 0
                              ? (account.interestEarned /
                                  account.currentBalance) *
                                100
                              : 0;

                          return (
                            <div key={idx} className="interest-account-item">
                              <div className="interest-account-details">
                                <span className="interest-account-name">
                                  {account.accountName}
                                </span>
                                <span className="interest-account-bank">
                                  ({account.bank})
                                </span>
                              </div>
                              <div className="interest-account-stats">
                                <span className="interest-earned">
                                  £{formatCurrency(account.interestEarned)}
                                </span>
                                {interestRate > 0 && (
                                  <span className="interest-rate">
                                    ({interestRate.toFixed(2)}%)
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )
            )}
          </div>
        </div>
      )}

      <div className="utilization-grid">
        {utilization.groups.map((group) => (
          <div
            key={group.type}
            className={`utilization-card ${
              group.isOverContributed ? "over-contributed-card" : ""
            }`}
          >
            <div className="card-header">
              <div className="account-info">
                <div className="group-type-title">{group.type} Accounts</div>
                <div
                  className={`account-type-badge ${
                    group.isOverContributed ? "over-contributed-badge" : ""
                  }`}
                >
                  {group.type}
                  {group.isOverContributed && " - OVER LIMIT"}
                </div>
              </div>
              <div
                className={`utilization-amount ${
                  group.isOverContributed ? "over-contributed" : ""
                }`}
              >
                £{formatCurrency(group.totalUtilized)}
              </div>
            </div>

            <div className="progress-container">
              <div className="progress-bar">
                <div
                  className={`progress-fill ${
                    group.isOverContributed
                      ? "over-contributed"
                      : group.type.toLowerCase()
                  }`}
                  style={{ width: `${Math.min(group.percentage, 100)}%` }}
                />
                {group.isBlocked && group.blockedAmount > 0 && (
                  <div
                    className="progress-fill blocked"
                    style={{
                      width: `${
                        (group.blockedAmount / group.allowance) * 100
                      }%`,
                    }}
                  />
                )}
              </div>
              <div className="progress-label">
                {group.percentage.toFixed(1)}% of £
                {formatCurrency(group.allowance)} {group.type} allowance
                {group.isOverContributed &&
                  ` (£${formatCurrency(group.overContribution)} over limit)`}
                {group.isBlocked &&
                  ` (£${formatCurrency(
                    group.blockedAmount
                  )} lost as full ISA limit reached)`}
              </div>
            </div>

            <div className="accounts-list">
              {group.accounts.map((account, idx) => (
                <div key={idx} className="account-item">
                  <div className="account-details">
                    <span className="account-name">{account.accountName}</span>
                    <span className="account-bank">({account.bank})</span>
                  </div>
                  <div className="account-balances">
                    <div className="balance-item">
                      <span className="balance-label">Current:</span>
                      <span className="balance-value">
                        £{formatCurrency(account.currentBalance)}
                      </span>
                    </div>
                    <div className="balance-item">
                      <span className="balance-label">Deposited FY:</span>
                      <span className="balance-value">
                        £{formatCurrency(account.utilized)}
                      </span>
                    </div>
                    {account.interestEarned > 0 && (
                      <div className="balance-item">
                        <span className="balance-label">Interest FY:</span>
                        <span className="balance-value interest-earned">
                          £{formatCurrency(account.interestEarned)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="utilization-stats">
              <div className="stat-row">
                <span className="stat-label">Remaining {group.type}:</span>
                <span
                  className={`stat-value ${
                    group.remaining < 0 ? "negative-remaining" : ""
                  }`}
                >
                  {group.remaining >= 0
                    ? `£${formatCurrency(group.remaining)}`
                    : `-£${formatCurrency(Math.abs(group.remaining))}`}
                </span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Total deposits:</span>
                <span className="stat-value">
                  {group.accounts.reduce(
                    (sum, acc) => sum + acc.depositCount,
                    0
                  )}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
