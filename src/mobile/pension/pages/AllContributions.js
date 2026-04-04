import React, { useMemo } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { usePensionData, formatDate, parseDate, getTaxYearStart, taxYearLabel } from '../PensionDataContext';
import PensionDetailLayout from '../PensionDetailLayout';

function fmt(n) {
  return '£' + (n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtShort(n) { return '£' + Math.round(n || 0).toLocaleString('en-GB'); }

// Colour palette — cycles by FY order (most recent = emerald, etc.)
const FY_COLORS = ['#4edea3', '#adc6ff', '#ffb95f', '#f472b6', '#a78bfa', '#38bdf8'];

export default function AllContributions() {
  const { idx } = useParams();
  const { entries } = usePensionData();

  const entry = entries[Number(idx)];
  if (!entry) return <Navigate to="/mobile/pension" replace />;

  // Group paymentHistory by FY, sorted descending
  const groups = useMemo(() => {
    const map = {};
    (entry.paymentHistory || []).forEach(p => {
      if (!p.date) return;
      const fyStart = getTaxYearStart(p.date); // handles DD/MM/YYYY and ISO
      if (fyStart === null || fyStart === undefined) return; // skip unparseable dates
      if (!map[fyStart]) map[fyStart] = { fyStart, entries: [] };
      map[fyStart].entries.push(p);
    });

    // Sort entries within each group: most recent first
    Object.values(map).forEach(g => {
      g.entries.sort((a, b) => {
        const da = parseDate(a.date);
        const db = parseDate(b.date);
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return db - da; // descending (most recent first)
      });
    });

    // Sort groups: most recent FY first
    return Object.values(map).sort((a, b) => b.fyStart - a.fyStart);
  }, [entry.paymentHistory]);

  const totalContributions = (entry.deposits || 0);

  return (
    <PensionDetailLayout title="All Contributions" backTo={`/mobile/pension/provider/${idx}`}>
      <div style={{ padding: '16px' }}>

        {/* Summary strip */}
        <div className="animate-in stagger-1" style={{
          background: '#171f33',
          borderRadius: '14px',
          padding: '16px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <p style={{ fontSize: '12px', color: '#bbcabf', margin: '0 0 3px' }}>Total contributions</p>
            <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '22px', color: '#4edea3', margin: 0 }}>
              {fmtShort(totalContributions)}
            </p>
          </div>
          <Link to={`/mobile/pension/provider/${idx}/add`} style={{ textDecoration: 'none' }}>
            <button style={{
              background: 'rgba(78,222,163,0.12)',
              border: '1px solid rgba(78,222,163,0.25)',
              borderRadius: '10px',
              padding: '8px 14px',
              color: '#4edea3',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
              Add
            </button>
          </Link>
        </div>

        {groups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', background: '#171f33', borderRadius: '16px', color: '#64748b', fontSize: '14px' }}>
            No contribution history found.
          </div>
        ) : (
          groups.map((group, gi) => {
            const color    = FY_COLORS[gi % FY_COLORS.length];
            const rgbMap   = { '#4edea3': '78,222,163', '#adc6ff': '173,198,255', '#ffb95f': '255,185,95', '#f472b6': '244,114,182', '#a78bfa': '167,139,250', '#38bdf8': '56,189,248' };
            const rgb      = rgbMap[color] || '173,198,255';
            const fyTotal  = group.entries.reduce((s, p) => s + (p.amount || 0), 0);
            const label    = taxYearLabel(group.fyStart);

            return (
              <div key={group.fyStart} className={`animate-in stagger-${Math.min(gi + 2, 5)}`} style={{ marginBottom: '20px' }}>

                {/* FY header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
                    <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '14px', color: '#dae2fd', margin: 0 }}>
                      {label}
                    </h3>
                  </div>
                  <span style={{
                    background: `rgba(${rgb},0.1)`,
                    color,
                    borderRadius: '20px',
                    padding: '3px 10px',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}>
                    {fmtShort(fyTotal)}
                  </span>
                </div>

                {/* Entries */}
                <div style={{ background: '#171f33', borderRadius: '14px', overflow: 'hidden' }}>
                  {group.entries.map((p, ei) => (
                    <div
                      key={ei}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
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
                            savings
                          </span>
                        </div>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: '13px', color: '#dae2fd', margin: '0 0 2px' }}>
                            {p.description || 'Contribution'}
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
    </PensionDetailLayout>
  );
}
