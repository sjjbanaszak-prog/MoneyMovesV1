import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SavingsLayout from '../SavingsLayout';
import SavingsHistoryCard from '../components/SavingsHistoryCard';
import { useSavingsData } from '../SavingsDataContext';
import { earliestSavingsMonth, savingsBalanceSeries } from '../utils/savingsHistory';
import { isaDepositsByTaxYear, cumulativeNetDeposits } from '../utils/savingsTransactions';
import { accountCategory, CATEGORY_COLORS } from '../utils/accountCategories';
import PremiumGate from '../../components/PremiumGate';
import AllowanceRow, { allowanceColor } from '../../components/AllowanceRow';
import DonutChart from '../../components/DonutChart';
import DualLineChart from '../../components/DualLineChart';

const COLOR_PALETTE = ['#4edea3', '#adc6ff', '#ffb95f', '#f472b6', '#a78bfa', '#38bdf8'];

function fmtShort(n) {
  const v = Math.round(n || 0);
  return (v < 0 ? '−' : '') + '£' + Math.abs(v).toLocaleString('en-GB');
}

function monthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** e.g. 2026 → "FY 26/27" (matches the pension allowance rows) */
function taxYearLabel(startYear) {
  return `FY ${String(startYear).slice(-2)}/${String(startYear + 1).slice(-2)}`;
}

// Annual ISA allowance (Cash, Stocks & Shares, Lifetime and Innovative Finance ISAs
// combined) for the tax year starting 6 April `fy`. Unused allowance can't be
// carried forward.
function isaAllowanceFor(fy) {
  if (fy >= 2017) return 20000;
  if (fy >= 2015) return 15240;
  if (fy === 2014) return 15000;
  return 11880;
}

const cardHeading = { fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '16px', color: '#dae2fd', margin: 0 };

export default function SavingsInsights() {
  const { accounts, metrics } = useSavingsData();
  const navigate = useNavigate();
  const [timeframe, setTimeframe] = useState('AT');
  const [showAllAllowance, setShowAllAllowance] = useState(false);

  // ── Account allocation ──────────────────────────────────────────────────────
  // A tree you can tap down through:
  //   Type:     category (Bonds / ISA / Savings / Current) → account type → accounts
  //   Provider: provider → accounts
  const [allocBy, setAllocBy]     = useState('type'); // 'type' | 'provider'
  const [drillPath, setDrillPath] = useState([]);     // keys from the top level down

  const allocationTree = useMemo(() => {
    const root = { key: 'all', name: 'total', value: 0, children: [] };
    const childOf = (node, key) => {
      let child = node.children.find(c => c.key === key);
      if (!child) { child = { key, name: key, value: 0, children: [] }; node.children.push(child); }
      return child;
    };
    accounts.forEach((a, idx) => {
      const value = a.currentBalance || 0;
      if (value <= 0) return;
      const path = allocBy === 'type'
        ? [accountCategory(a.accountType), a.accountType || 'Other']
        : [a.bank || a.provider || 'Other'];
      root.value += value;
      let node = root;
      path.forEach(key => { node = childOf(node, key); node.value += value; });
      node.children.push({ key: `account-${idx}`, idx, name: a.accountName || a.bank || '—', value });
    });
    const sortTree = node => {
      node.children.sort((x, y) => y.value - x.value);
      node.children.forEach(c => c.children && sortTree(c));
    };
    sortTree(root);
    return root;
  }, [accounts, allocBy]);

  // The node currently shown (walks drillPath; falls back to the top if data changed)
  const allocationNode = useMemo(() => {
    let node = allocationTree;
    for (const key of drillPath) {
      const next = node.children?.find(c => c.key === key);
      if (!next) return allocationTree;
      node = next;
    }
    return node;
  }, [allocationTree, drillPath]);
  const isDrilled = allocationNode !== allocationTree;

  const allocationItems = useMemo(() => {
    const total = allocationNode.value;
    // Top-level Type segments use the fixed category colours (matching the Overview pills)
    const useCategoryColors = allocBy === 'type' && allocationNode === allocationTree;
    return allocationNode.children.map((x, i) => ({
      ...x,
      color: (useCategoryColors && CATEGORY_COLORS[x.key]) || COLOR_PALETTE[i % COLOR_PALETTE.length],
      pct:   total > 0 ? Math.round((x.value / total) * 100) : 0,
    }));
  }, [allocationNode, allocationTree, allocBy]);

  function changeAllocBy(next) {
    setAllocBy(next);
    setDrillPath([]);
  }

  function selectAllocationItem(item) {
    if (item.children) setDrillPath(path => [...path, item.key]);   // group: drill in
    else navigate(`/mobile/savings/account/${item.idx}`);         // account: open it
  }

  // ── Growth history: total balance vs money paid in (deposits − withdrawals) ──
  const historyData = useMemo(() => {
    const firstKey = earliestSavingsMonth(accounts);
    if (!firstKey) return null;
    const nowKey = monthKey(new Date());
    const months = [];
    let [y, m] = firstKey.split('-').map(Number);
    while (`${y}-${String(m).padStart(2, '0')}` <= nowKey) {
      months.push(`${y}-${String(m).padStart(2, '0')}`);
      m++;
      if (m > 12) { m = 1; y++; }
    }
    if (months.length < 2) return null;

    const valueSeries   = savingsBalanceSeries(accounts, months, nowKey);
    const contribSeries = cumulativeNetDeposits(accounts, months);
    const labels = months.map(k => {
      const [yy, mm] = k.split('-').map(Number);
      return new Date(yy, mm - 1, 1).toLocaleString('en-GB', { month: 'short', year: '2-digit' });
    });
    return { valueSeries, contribSeries, labels };
  }, [accounts]);

  // Slice to the selected timeframe; the summary cards cover the same window.
  const displayData = useMemo(() => {
    if (!historyData) return null;
    const n = historyData.labels.length;
    const count = timeframe === 'AT' ? n : Math.min(timeframe === '5Y' ? 60 : 12, n);
    const slice = arr => arr.slice(n - count);

    // Baseline = the month before the window (nothing for All Time)
    const baseIdx      = n - count - 1;
    const startContrib = baseIdx >= 0 ? historyData.contribSeries[baseIdx] : 0;
    const startValue   = baseIdx >= 0 ? historyData.valueSeries[baseIdx]   : 0;
    const netDeposits  = historyData.contribSeries[n - 1] - startContrib;
    const total        = historyData.valueSeries[n - 1] - startValue;

    return {
      valueSeries:   slice(historyData.valueSeries),
      contribSeries: slice(historyData.contribSeries),
      labels:        slice(historyData.labels),
      summary: { netDeposits, growth: total - netDeposits, total },
    };
  }, [historyData, timeframe]);

  // ── ISA allowance by tax year (newest first) ────────────────────────────────
  const allAllowanceYears = useMemo(() => {
    const totals = isaDepositsByTaxYear(accounts);
    return Object.keys(totals).map(Number).sort((a, b) => b - a).map(fy => {
      const limit = isaAllowanceFor(fy);
      const used  = Math.round(totals[fy]);
      const pct   = Math.min(100, Math.round((used / limit) * 100));
      return { fy: taxYearLabel(fy), used, limit, pct, color: allowanceColor(pct) };
    });
  }, [accounts]);
  const allowanceYears = allAllowanceYears.slice(0, 4);

  return (
    <SavingsLayout>
      <PremiumGate
        featureName="Savings Insights"
        description="Deep-dive analytics on your savings growth, deposits, and ISA allowance."
      >
      <div style={{ padding: '0 0 16px' }}>

        {/* Header */}
        <div style={{ padding: '24px 20px 16px' }}>
          <p style={{ fontSize: '13px', color: '#bbcabf', marginBottom: '2px' }}>My Savings</p>
          <h1 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '26px', color: '#dae2fd', margin: 0 }}>
            Insights
          </h1>
        </div>

        {/* Account Allocation — by type or provider; tap a segment to drill down */}
        <div className="animate-in stagger-1 section-card" style={{ margin: '0 16px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '8px' }}>
            <h3 style={cardHeading}>Account Allocation</h3>
            <div style={{ display: 'flex', background: '#060e20', borderRadius: '8px', padding: '2px', gap: '2px', flexShrink: 0 }}>
              {[['type', 'Type'], ['provider', 'Provider']].map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => changeAllocBy(value)}
                  style={{
                    padding: '4px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                    background: allocBy === value ? '#4edea3' : 'transparent',
                    color: allocBy === value ? '#003824' : '#bbcabf',
                    fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '11px',
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                    transition: 'all 0.15s',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {allocationItems.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', padding: '16px 0', margin: 0 }}>No data available</p>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ flexShrink: 0 }}>
                <DonutChart
                  items={allocationItems}
                  totalValue={isDrilled ? allocationNode.value : metrics.totalBalance}
                  centerLabel={allocationNode.name}
                  onSelect={selectAllocationItem}
                  animationKey={`${allocBy}:${drillPath.join('/')}`}
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {allocationItems.map(item => {
                  // Groups drill in; accounts open their account page
                  return (
                    <button
                      key={item.key}
                      onClick={() => selectAllocationItem(item)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px',
                        width: '100%', background: 'none', border: 'none', padding: 0,
                        textAlign: 'left', cursor: 'pointer',
                      }}
                    >
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '13px', color: '#dae2fd', fontWeight: 600, margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
                        <p style={{ fontSize: '11px', color: '#bbcabf', margin: 0 }}>
                          {item.pct}% · {fmtShort(item.value)}
                        </p>
                      </div>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#3c4a42', flexShrink: 0 }}>chevron_right</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Back up one level — bottom right so the title never moves */}
          {isDrilled && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button
                onClick={() => setDrillPath(path => path.slice(0, -1))}
                aria-label="Back"
                style={{
                  background: 'rgba(173,198,255,0.08)', border: 'none', borderRadius: '50%',
                  width: '32px', height: '32px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0,
                }}
              >
                <span className="material-symbols-outlined" style={{ color: '#adc6ff', fontSize: '18px' }}>arrow_back</span>
              </button>
            </div>
          )}
        </div>

        {/* Growth History — balance vs net deposits */}
        <div className="animate-in stagger-2 section-card" style={{ margin: '0 16px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={cardHeading}>Growth History</h3>
            <div style={{ display: 'flex', background: '#060e20', borderRadius: '8px', padding: '2px', gap: '2px' }}>
              {['1Y', '5Y', 'AT'].map(tf => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  style={{
                    padding: '4px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                    background: timeframe === tf ? '#4edea3' : 'transparent',
                    color: timeframe === tf ? '#003824' : '#bbcabf',
                    fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '11px',
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                    transition: 'all 0.15s',
                  }}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {displayData ? (
            <>
              <DualLineChart
                valueSeries={displayData.valueSeries}
                contribSeries={displayData.contribSeries}
                labels={displayData.labels}
                valueLabel="Balance"
                contribLabel="Net deposits"
              />
              {/* Timeframe summary: net deposits + growth = total change in balance */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '12px' }}>
                {[
                  { label: 'Net Deposits', value: fmtShort(displayData.summary.netDeposits), color: '#adc6ff' },
                  {
                    label: 'Growth',
                    value: (displayData.summary.growth < 0 ? '−' : '+') + fmtShort(Math.abs(displayData.summary.growth)),
                    color: displayData.summary.growth < 0 ? '#ffb4ab' : '#4edea3',
                  },
                  { label: 'Total', value: fmtShort(displayData.summary.total), color: '#dae2fd' },
                ].map(c => (
                  <div key={c.label} style={{ padding: '10px 12px', background: 'rgba(173,198,255,0.04)', borderRadius: '10px', minWidth: 0, textAlign: 'center' }}>
                    <p style={{ fontSize: '10px', color: '#bbcabf', margin: '0 0 3px', lineHeight: 1.3 }}>{c.label}</p>
                    <p style={{ fontWeight: 700, fontSize: '14px', color: c.color, margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                      {c.value}
                    </p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', padding: '16px 0', margin: 0 }}>
              No history data available
            </p>
          )}
        </div>

        {/* ISA Allowance */}
        <div className="animate-in stagger-3 section-card" style={{ margin: '0 16px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={cardHeading}>ISA Allowance</h3>
            {allAllowanceYears.length > 4 && (
              <button
                onClick={() => setShowAllAllowance(true)}
                style={{ background: 'none', border: 'none', color: '#adc6ff', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                View All
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>arrow_forward</span>
              </button>
            )}
          </div>
          {allowanceYears.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', padding: '8px 0', margin: 0 }}>
              No ISA deposits found
            </p>
          ) : allowanceYears.map(yr => (
            <AllowanceRow key={yr.fy} yr={yr} />
          ))}
          <p style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.5, margin: '4px 0 0' }}>
            The £20,000 allowance covers all your ISAs each tax year and can't be carried forward.
            Interest and ISA transfers don't count towards it.
          </p>
        </div>

        {/* Savings History across all accounts — same card as each account page */}
        <SavingsHistoryCard
          accounts={accounts}
          className="animate-in stagger-4 section-card"
          style={{ margin: '0 16px 24px' }}
        />

        {/* ISA Allowance — full history modal */}
        {showAllAllowance && (
          <div
            onClick={() => setShowAllAllowance(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(0,0,0,0.6)',
              display: 'flex', alignItems: 'flex-end',
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%',
                maxHeight: '80vh',
                background: '#111827',
                borderRadius: '20px 20px 0 0',
                border: '1px solid rgba(173,198,255,0.1)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '20px 20px 16px',
                borderBottom: '1px solid rgba(173,198,255,0.08)',
                flexShrink: 0,
              }}>
                <h3 style={cardHeading}>ISA Allowance</h3>
                <button
                  onClick={() => setShowAllAllowance(false)}
                  style={{ background: 'none', border: 'none', color: '#adc6ff', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>close</span>
                </button>
              </div>
              <div style={{ overflowY: 'auto', padding: '16px 20px 32px' }}>
                {allAllowanceYears.map(yr => (
                  <AllowanceRow key={yr.fy} yr={yr} />
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
      </PremiumGate>
    </SavingsLayout>
  );
}
