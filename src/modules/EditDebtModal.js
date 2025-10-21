import React, { useState, useEffect } from 'react';
import './EditDebtModalStyles.css';
import { validateDebt } from './utils/debtUtils';

const EditDebtModal = ({ debt, debtIndex, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    debtName: '',
    balance: '',
    interestRate: '',
    minimumPayment: '',
    currentPayment: '',
    debtType: 'Credit Card'
  });

  const [errors, setErrors] = useState({});

  // Populate form with existing debt data
  useEffect(() => {
    if (debt) {
      setFormData({
        debtName: debt.debtName || '',
        balance: debt.balance || '',
        interestRate: debt.interestRate || '',
        minimumPayment: debt.minimumPayment || '',
        currentPayment: debt.currentPayment || debt.minimumPayment || '',
        debtType: debt.debtType || 'Credit Card'
      });
    }
  }, [debt]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const minimumPayment = parseFloat(formData.minimumPayment) || 0;
    const updatedDebt = {
      ...debt, // Preserve original fields like createdAt, originalBalance
      debtName: formData.debtName,
      balance: parseFloat(formData.balance) || 0,
      interestRate: parseFloat(formData.interestRate) || 0,
      minimumPayment: minimumPayment,
      currentPayment: parseFloat(formData.currentPayment) || minimumPayment,
      debtType: formData.debtType,
      updatedAt: new Date().toISOString()
    };

    // Validate the updated debt
    const validation = validateDebt(updatedDebt);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    onSave(updatedDebt, debtIndex);
  };

  return (
    <div className="edit-debt-modal-overlay" onClick={onCancel}>
      <div className="edit-debt-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit Debt</h3>
          <button className="btn-close" onClick={onCancel}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="edit-debt-form">
          {/* Debt Name */}
          <div className="form-group">
            <label htmlFor="debtName">Debt Name *</label>
            <input
              type="text"
              id="debtName"
              name="debtName"
              value={formData.debtName}
              onChange={handleChange}
              placeholder="e.g., Visa Credit Card, Car Loan"
              className={errors.debtName ? 'error' : ''}
            />
            {errors.debtName && <span className="error-message">{errors.debtName}</span>}
          </div>

          {/* Debt Type */}
          <div className="form-group">
            <label htmlFor="debtType">Debt Type *</label>
            <select
              id="debtType"
              name="debtType"
              value={formData.debtType}
              onChange={handleChange}
            >
              <option value="Credit Card">Credit Card</option>
              <option value="Personal Loan">Personal Loan</option>
              <option value="Car Loan">Car Loan</option>
              <option value="Student Loan">Student Loan</option>
              <option value="Mortgage">Mortgage</option>
              <option value="Medical Debt">Medical Debt</option>
              <option value="Payday Loan">Payday Loan</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Balance */}
          <div className="form-group">
            <label htmlFor="balance">Current Balance (£) *</label>
            <input
              type="number"
              id="balance"
              name="balance"
              value={formData.balance}
              onChange={handleChange}
              placeholder="5000"
              step="0.01"
              min="0"
              className={errors.balance ? 'error' : ''}
            />
            {errors.balance && <span className="error-message">{errors.balance}</span>}
          </div>

          {/* Interest Rate */}
          <div className="form-group">
            <label htmlFor="interestRate">Interest Rate (% APR) *</label>
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
              className={errors.interestRate ? 'error' : ''}
            />
            {errors.interestRate && <span className="error-message">{errors.interestRate}</span>}
          </div>

          {/* Minimum Payment */}
          <div className="form-group">
            <label htmlFor="minimumPayment">Minimum Monthly Payment (£) *</label>
            <input
              type="number"
              id="minimumPayment"
              name="minimumPayment"
              value={formData.minimumPayment}
              onChange={handleChange}
              placeholder="150"
              step="0.01"
              min="0"
              className={errors.minimumPayment ? 'error' : ''}
            />
            {errors.minimumPayment && <span className="error-message">{errors.minimumPayment}</span>}
          </div>

          {/* Current Payment */}
          <div className="form-group">
            <label htmlFor="currentPayment">Current Monthly Payment (£)</label>
            <input
              type="number"
              id="currentPayment"
              name="currentPayment"
              value={formData.currentPayment}
              onChange={handleChange}
              placeholder="200"
              step="0.01"
              min="0"
            />
            <small className="form-hint">
              If paying more than the minimum, enter the amount here
            </small>
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn-save">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditDebtModal;
