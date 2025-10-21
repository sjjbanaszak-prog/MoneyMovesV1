import React, { useState } from 'react';
import './DebtInputFormStyles.css';
import { validateDebt } from './utils/debtUtils';

const DebtInputForm = ({ onAddDebt, onCancel }) => {
  const [formData, setFormData] = useState({
    debtName: '',
    debtType: 'Credit Card',
    balance: '',
    interestRate: '',
    minimumPayment: '',
    currentPayment: ''
  });

  const [errors, setErrors] = useState([]);
  const [showErrors, setShowErrors] = useState(false);

  const debtTypes = [
    'Credit Card',
    'Personal Loan',
    'Car Finance',
    'Overdraft',
    'Store Card',
    'Buy Now Pay Later',
    'Other'
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setShowErrors(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Convert string inputs to numbers
    const debt = {
      debtName: formData.debtName,
      debtType: formData.debtType,
      balance: parseFloat(formData.balance) || 0,
      interestRate: parseFloat(formData.interestRate) || 0,
      minimumPayment: parseFloat(formData.minimumPayment) || 0,
      currentPayment: parseFloat(formData.currentPayment) || parseFloat(formData.minimumPayment) || 0,
      originalBalance: parseFloat(formData.balance) || 0,
      createdAt: new Date().toISOString()
    };

    // Validate
    const validation = validateDebt(debt);

    if (!validation.valid) {
      setErrors(validation.errors);
      setShowErrors(true);
      return;
    }

    // Submit
    onAddDebt(debt);

    // Reset form
    setFormData({
      debtName: '',
      debtType: 'Credit Card',
      balance: '',
      interestRate: '',
      minimumPayment: '',
      currentPayment: ''
    });
    setErrors([]);
    setShowErrors(false);
  };

  return (
    <div className="debt-input-form">
      <h3>Add Debt</h3>

      {showErrors && errors.length > 0 && (
        <div className="debt-form-errors">
          <strong>Please fix the following errors:</strong>
          <ul>
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="debtName">Debt Name *</label>
            <input
              type="text"
              id="debtName"
              name="debtName"
              value={formData.debtName}
              onChange={handleChange}
              placeholder="e.g., Barclaycard Visa"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="debtType">Debt Type</label>
            <select
              id="debtType"
              name="debtType"
              value={formData.debtType}
              onChange={handleChange}
            >
              {debtTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="balance">Outstanding Balance (£) *</label>
            <input
              type="number"
              id="balance"
              name="balance"
              value={formData.balance}
              onChange={handleChange}
              placeholder="5000"
              step="0.01"
              min="0"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="interestRate">Interest Rate (APR %) *</label>
            <input
              type="number"
              id="interestRate"
              name="interestRate"
              value={formData.interestRate}
              onChange={handleChange}
              placeholder="18.9"
              step="0.1"
              min="0"
              max="100"
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="minimumPayment">Minimum Payment (£/month) *</label>
            <input
              type="number"
              id="minimumPayment"
              name="minimumPayment"
              value={formData.minimumPayment}
              onChange={handleChange}
              placeholder="150"
              step="0.01"
              min="0"
              required
            />
            <small className="field-hint">
              Check your statement for minimum payment amount
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="currentPayment">Current Payment (£/month)</label>
            <input
              type="number"
              id="currentPayment"
              name="currentPayment"
              value={formData.currentPayment}
              onChange={handleChange}
              placeholder={formData.minimumPayment || '150'}
              step="0.01"
              min="0"
            />
            <small className="field-hint">
              Leave blank to use minimum payment
            </small>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary">
            Add Debt
          </button>
          {onCancel && (
            <button type="button" className="btn-secondary" onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default DebtInputForm;
