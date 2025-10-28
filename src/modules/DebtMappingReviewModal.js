import React, { useState, useEffect } from 'react';
import './DebtMappingReviewModalStyles.css';

/**
 * DebtMappingReviewModal - Column mapping and review for debt statement uploads
 *
 * Features:
 * - Map columns: Date, Amount, Balance, Description
 * - Debt Type dropdown (Credit Card, Personal Loan, etc.)
 * - Starting Balance field (auto-populated from statement)
 * - Interest Rate field (auto-populated if detected)
 * - Creditor name input
 * - Data preview table
 * - Confidence scoring display
 */

export default function DebtMappingReviewModal({
  data,
  headers,
  initialMapping,
  fileName,
  totalRows,
  detectedCreditor,
  startingBalance: detectedStartingBalance,
  interestRate: detectedInterestRate,
  confidenceScores,
  aiMetadata,
  onConfirm,
  onCancel,
}) {
  const [mapping, setMapping] = useState(initialMapping || {
    date: '',
    amount: '',
    balance: '',
    description: '',
    debtType: 'Credit Card',
    dateFormat: 'DD/MM/YYYY',
  });

  const [debtName, setDebtName] = useState(detectedCreditor?.name || '');
  const [startingBalance, setStartingBalance] = useState(detectedStartingBalance || '');
  const [interestRate, setInterestRate] = useState(detectedInterestRate || '');
  const [minimumPayment, setMinimumPayment] = useState('');

  const debtTypes = [
    'Credit Card',
    'Personal Loan',
    'Car Finance',
    'Overdraft',
    'Store Card',
    'Buy Now Pay Later',
    'Other'
  ];

  const dateFormats = [
    { label: 'DD/MM/YYYY (31/12/2025)', value: 'DD/MM/YYYY' },
    { label: 'MM/DD/YYYY (12/31/2025)', value: 'MM/DD/YYYY' },
    { label: 'YYYY-MM-DD (2025-12-31)', value: 'YYYY-MM-DD' },
    { label: 'DD MMM YYYY (31 Dec 2025)', value: 'DD MMM YYYY' },
  ];

  // Update initial values when props change
  useEffect(() => {
    if (initialMapping) {
      setMapping(prev => ({ ...prev, ...initialMapping }));
    }
  }, [initialMapping]);

  useEffect(() => {
    if (detectedCreditor) {
      setDebtName(detectedCreditor.name);
    }
  }, [detectedCreditor]);

  useEffect(() => {
    if (detectedStartingBalance) {
      setStartingBalance(detectedStartingBalance);
    }
  }, [detectedStartingBalance]);

  useEffect(() => {
    if (detectedInterestRate) {
      setInterestRate(detectedInterestRate);
    }
  }, [detectedInterestRate]);

  const handleMappingChange = (field, value) => {
    setMapping(prev => ({ ...prev, [field]: value }));
  };

  const handleConfirm = () => {
    // Validation
    if (!debtName.trim()) {
      alert('Please enter a creditor name');
      return;
    }

    if (!mapping.date) {
      alert('Please map the Date column');
      return;
    }

    if (!mapping.amount) {
      alert('Please map the Amount column');
      return;
    }

    if (!startingBalance && !mapping.balance) {
      alert('Please provide either a Starting Balance or map the Balance column');
      return;
    }

    if (!interestRate) {
      alert('Please enter the Interest Rate (APR)');
      return;
    }

    // Call onConfirm with mapping and metadata
    onConfirm({
      mapping,
      debtName,
      debtType: mapping.debtType,
      startingBalance: parseFloat(startingBalance) || 0,
      interestRate: parseFloat(interestRate) || 0,
      minimumPayment: parseFloat(minimumPayment) || 0,
    });
  };

  // Get preview data (first 5 rows)
  const previewData = data.slice(0, 5);

  // Calculate confidence score
  const overallConfidence = confidenceScores
    ? Math.round(
        (Object.values(confidenceScores).reduce((sum, score) => sum + score, 0) /
          Object.keys(confidenceScores).length) *
          100
      )
    : 0;

  return (
    <div className="debt-mapper-overlay" onClick={onCancel}>
      <div className="debt-mapper-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="debt-mapper-header">
          <div>
            <h2>Review Debt Statement Upload</h2>
            <p className="debt-mapper-filename">
              {fileName} • {totalRows} transaction{totalRows !== 1 ? 's' : ''}
            </p>
          </div>
          <button className="debt-mapper-close" onClick={onCancel}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="debt-mapper-body">
          {/* Confidence Score (if available) */}
          {confidenceScores && (
            <div className={`debt-mapper-confidence ${overallConfidence >= 80 ? 'high' : overallConfidence >= 60 ? 'medium' : 'low'}`}>
              <div className="confidence-icon">
                {overallConfidence >= 80 ? '✓' : overallConfidence >= 60 ? '!' : '⚠'}
              </div>
              <div className="confidence-text">
                <strong>Mapping Confidence: {overallConfidence}%</strong>
                <p>
                  {overallConfidence >= 80
                    ? 'High confidence - Review and confirm'
                    : overallConfidence >= 60
                    ? 'Medium confidence - Please verify mappings'
                    : 'Low confidence - Please check all mappings carefully'}
                </p>
              </div>
            </div>
          )}

          {/* Debt Information Section */}
          <div className="debt-mapper-section">
            <h3>Debt Information</h3>
            <div className="debt-mapper-grid">
              <div className="form-group">
                <label>
                  Creditor Name *
                  {detectedCreditor && (
                    <span className="detected-badge">Auto-detected</span>
                  )}
                </label>
                <input
                  type="text"
                  value={debtName}
                  onChange={(e) => setDebtName(e.target.value)}
                  placeholder="e.g., American Express"
                  className="debt-mapper-input"
                />
              </div>

              <div className="form-group">
                <label>Debt Type *</label>
                <select
                  value={mapping.debtType}
                  onChange={(e) => handleMappingChange('debtType', e.target.value)}
                  className="debt-mapper-select"
                >
                  {debtTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>
                  Starting Balance
                  {detectedStartingBalance && (
                    <span className="detected-badge">Auto-detected</span>
                  )}
                </label>
                <div className="input-with-prefix">
                  <span className="input-prefix">£</span>
                  <input
                    type="number"
                    step="0.01"
                    value={startingBalance}
                    onChange={(e) => setStartingBalance(e.target.value)}
                    placeholder="0.00"
                    className="debt-mapper-input with-prefix"
                  />
                </div>
                <p className="field-help">Balance before these transactions</p>
              </div>

              <div className="form-group">
                <label>
                  Interest Rate (APR) * %
                  {detectedInterestRate && (
                    <span className="detected-badge">Auto-detected</span>
                  )}
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  placeholder="0.0"
                  className="debt-mapper-input"
                />
              </div>

              <div className="form-group">
                <label>Minimum Payment (Optional)</label>
                <div className="input-with-prefix">
                  <span className="input-prefix">£</span>
                  <input
                    type="number"
                    step="0.01"
                    value={minimumPayment}
                    onChange={(e) => setMinimumPayment(e.target.value)}
                    placeholder="0.00"
                    className="debt-mapper-input with-prefix"
                  />
                </div>
                <p className="field-help">Monthly minimum payment</p>
              </div>
            </div>
          </div>

          {/* Column Mapping Section */}
          <div className="debt-mapper-section">
            <h3>Map Statement Columns</h3>
            <div className="debt-mapper-grid">
              <div className="form-group">
                <label>
                  Date Column *
                  {confidenceScores?.date > 0.7 && (
                    <span className="confidence-badge high">
                      {Math.round(confidenceScores.date * 100)}%
                    </span>
                  )}
                </label>
                <select
                  value={mapping.date}
                  onChange={(e) => handleMappingChange('date', e.target.value)}
                  className="debt-mapper-select"
                >
                  <option value="">-- Select Date Column --</option>
                  {headers.map(header => (
                    <option key={header} value={header}>{header}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Date Format</label>
                <select
                  value={mapping.dateFormat}
                  onChange={(e) => handleMappingChange('dateFormat', e.target.value)}
                  className="debt-mapper-select"
                >
                  {dateFormats.map(format => (
                    <option key={format.value} value={format.value}>
                      {format.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>
                  Amount Column *
                  {confidenceScores?.amount > 0.7 && (
                    <span className="confidence-badge high">
                      {Math.round(confidenceScores.amount * 100)}%
                    </span>
                  )}
                </label>
                <select
                  value={mapping.amount}
                  onChange={(e) => handleMappingChange('amount', e.target.value)}
                  className="debt-mapper-select"
                >
                  <option value="">-- Select Amount Column --</option>
                  {headers.map(header => (
                    <option key={header} value={header}>{header}</option>
                  ))}
                </select>
                <p className="field-help">Payments should show as negative or "CR"</p>
              </div>

              <div className="form-group">
                <label>Balance Column (Optional)</label>
                <select
                  value={mapping.balance}
                  onChange={(e) => handleMappingChange('balance', e.target.value)}
                  className="debt-mapper-select"
                >
                  <option value="">-- Select Balance Column --</option>
                  {headers.map(header => (
                    <option key={header} value={header}>{header}</option>
                  ))}
                </select>
              </div>

              <div className="form-group full-width">
                <label>Description Column (Optional)</label>
                <select
                  value={mapping.description}
                  onChange={(e) => handleMappingChange('description', e.target.value)}
                  className="debt-mapper-select"
                >
                  <option value="">-- Select Description Column --</option>
                  {headers.map(header => (
                    <option key={header} value={header}>{header}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Preview Table */}
          <div className="debt-mapper-section">
            <h3>Data Preview (First 5 Rows)</h3>
            <div className="debt-mapper-preview">
              <table className="preview-table">
                <thead>
                  <tr>
                    {headers.map(header => (
                      <th key={header}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, index) => (
                    <tr key={index}>
                      {headers.map(header => (
                        <td key={header}>{row[header] || '-'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="debt-mapper-footer">
          <button className="debt-mapper-btn secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="debt-mapper-btn primary" onClick={handleConfirm}>
            Confirm & Add Debt
          </button>
        </div>
      </div>
    </div>
  );
}
