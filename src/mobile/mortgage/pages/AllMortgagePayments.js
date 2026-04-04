import React, { useMemo } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useMortgageData } from '../MortgageDataContext';
import MortgageDetailLayout from '../MortgageDetailLayout';

function fmt(n) {
  return '£' + (n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtShort(n) { return '£' + Math.round(n || 0).toLocaleString('en-GB'); }

function parseDate(str) {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d) ? null : d;
}
function formatDate(str) {
  const d = parseDate(str);
  if (!d) return str || '–';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const YEAR_COLORS = ['#4edea3', '#adc6ff', '#ffb95f', '#f472b6', '#a78bfa', '#38bdf8'];
const RGB_MAP = {
  '#4edea3': '78,222,163', '#adc6ff': '173,198,255', '#ffb95f': '255,185,95',
  '#f472b6': '244,114,182', '#a78bfa': '167,139,250', '#38bdf8': '56,189,248',
};

export default function AllMortgagePayments() {
  const { idx } = useParams();
  const { mortgages } = useMortgageData();

  const mortgage = mortgages[Number(idx)];
  if (!mortgage) return <Navigate to="/mobile/mortgage" replace />;

  const totalPaid = (mortgage.paymentHistory || []).reduce((s, p) => s + (p.amount || 0), 0);

  // Group by calendar year, most recent first
  const groups = useMemo(() => {
    const map = {};
    (mortgage.paymentHistory || []).forEach(p => {
      if (!p.date) return;
      const d = parseDate(p.date);
      if (!d) return;
      const yr = d.getFullYear();
      if (!map[yr]) map[yr] = { year: yr, entries: [] };
      map[yr].entries.push(p);
    });

    Object.values(map).forEach(g => {
      g.entries.sort((a, b) => {
        const da = parseDate(a.date);
        const db = parseDate(b.date);
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return db - da;
      });
    });

    return Object.values(map).sort((a, b) => b.year - a.year);
  }, [mortgage.paymentHistory]);

  return (
    <MortgageDetailLayout title="All Payments" backTo={`/mobile/mortgage/${idx}`}>
      <div style={{ padding: '16px' }}>

        {/* Summary strip */}
        <div className="animate-in stagger-1" style={{
          background: '#171f33', borderRadius: '14px', padding: '16px',
          marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <p style={{ fontSize: '12px', color: '#bbcabf', margin: '0 0 3px' }}>Total paid</p>
            <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '22px', color: '#4edea3', margin: 0 }}>
              {fmtShort(totalPaid)}
            </p>
          </div>
          <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
            {(mortgage.paymentHistory || []).length} payments
          </p>
        </div>

        {groups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', background: '#171f33', borderRadius: '16px', color: '#64748b', fontSize: '14px' }}>
            No payment history found.
          </div>
        ) : (
          groups.map((group, gi) => {
            const color   = YEAR_COLORS[gi % YEAR_COLORS.length];
            const rgb     = RGB_MAP[color] || '173,198,255';
            const yrTotal = group.entries.reduce((s, p) => s + (p.amount || 0), 0);

            return (
              <div key={group.year} className={`animate-in stagger-${Math.min(gi + 2, 5)}`} style={{ marginBottom: '20px' }}>

                {/* Year header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
                    <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '14px', color: '#dae2fd', margin: 0 }}>
                      {group.year}
                    </h3>
                  </div>
                  <span style={{
                    background: `rgba(${rgb},0.1)`, color, borderRadius: '20px',
                    padding: '3px 10px', fontSize: '12px', fontWeight: 700,
                  }}>
                    {fmtShort(yrTotal)}
                  </span>
                </div>

                {/* Payment rows */}
                <div style={{ background: '#171f33', borderRadius: '14px', overflow: 'hidden' }}>
                  {group.entries.map((p, ei) => (
                    <div
                      key={ei}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '14px 16px',
                        borderBottom: ei < group.entries.length - 1 ? '1px solid rgba(173,198,255,0.06)' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                          background: `rgba(${rgb},0.08)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '16px', color }}>
                            home
                          </span>
                        </div>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: '13px', color: '#dae2fd', margin: '0 0 2px' }}>
                            {p.description || 'Monthly Payment'}
                          </p>
                          <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>
                            {formatDate(p.date)}
                          </p>
                        </div>
                      </div>
                      <p style={{ fontWeight: 700, fontSize: '14px', color: '#4edea3', margin: 0, flexShrink: 0, marginLeft: '12px' }}>
                        {fmt(p.amount)}
                      </p>
                    </div>
                  ))}
                </div>

              </div>
            );
          })
        )}

      </div>
    </MortgageDetailLayout>
  );
}
