import React, { useState, useEffect } from 'react';
import './DebtManagerStyles.css';
import DebtInputForm from '../modules/DebtInputForm';
import DebtListV2 from '../modules/DebtListV2';
import StrategySelector from '../modules/StrategySelector';
import ProgressSummaryCard from '../modules/ProgressSummaryCard';
import RepaymentTimelineChart from '../modules/RepaymentTimelineChart';
import StrategyComparisonChart from '../modules/StrategyComparisonChart';
import DebtAdvisorPanel from '../modules/DebtAdvisorPanel';
import EditDebtModal from '../modules/EditDebtModal';
import UnifiedDebtUploader from '../modules/UnifiedDebtUploader';
import DebtMappingReviewModal from '../modules/DebtMappingReviewModal';
import DebtSpendingAnalyzer from '../modules/DebtSpendingAnalyzer';
import {
  calculateSnowballStrategy,
  calculateAvalancheStrategy,
  compareStrategies,
  calculateProgress
} from '../modules/utils/debtUtils';
import { useAuth } from '../contexts/AuthContext';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

// Enable custom format parsing
dayjs.extend(customParseFormat);

// Helper function to parse dates in various formats
const parseTransactionDate = (dateStr) => {
  if (!dateStr) return dayjs();

  // Try common date formats
  const formats = [
    'DD/MM/YYYY',
    'DD/MM/YY',
    'YYYY-MM-DD',
    'MM/DD/YYYY',
    'MM/DD/YY',
    'DD MMM YYYY',
    'DD-MM-YYYY',
    'DD-MM-YY'
  ];

  for (const format of formats) {
    const parsed = dayjs(dateStr, format, true);
    if (parsed.isValid()) {
      return parsed;
    }
  }

  // Fallback to dayjs default parsing
  return dayjs(dateStr);
};

const DebtManager = () => {
  const [debts, setDebts] = useState([]);
  const [strategy, setStrategy] = useState('avalanche');
  const [monthlyBudget, setMonthlyBudget] = useState(0);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [strategyResult, setStrategyResult] = useState(null);
  const [progress, setProgress] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingDebt, setEditingDebt] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [uploadData, setUploadData] = useState(null);

  // Calculate total minimums
  const totalMinimums = debts.reduce((sum, debt) => sum + debt.minimumPayment, 0);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  // Load data from Firestore on mount
  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, 'userDebts', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log('Loaded debt data from Firestore:', data);

          setDebts(data.debts || []);
          setStrategy(data.selectedStrategy || 'avalanche');
          setMonthlyBudget(data.monthlyBudget || 0);
        }
      } catch (error) {
        console.error('Error loading debt data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Save data to Firestore (debounced)
  useEffect(() => {
    if (!user || loading) return;

    const saveData = async () => {
      try {
        setSaving(true);
        const docRef = doc(db, 'userDebts', user.uid);

        // Get existing document to preserve createdAt
        const docSnap = await getDoc(docRef);
        const existingData = docSnap.exists() ? docSnap.data() : {};

        await setDoc(docRef, {
          userId: user.uid,
          debts: debts,
          selectedStrategy: strategy,
          monthlyBudget: monthlyBudget,
          preferences: {
            showComparison: true,
            notificationsEnabled: false,
            currency: 'GBP'
          },
          updatedAt: new Date().toISOString(),
          createdAt: existingData.createdAt || new Date().toISOString()
        }, { merge: true });

        console.log('Saved debt data to Firestore');
      } catch (error) {
        console.error('Error saving debt data:', error);
      } finally {
        setSaving(false);
      }
    };

    // Debounce saves by 1 second
    const timeoutId = setTimeout(saveData, 1000);
    return () => clearTimeout(timeoutId);
  }, [debts, strategy, monthlyBudget, user, loading]);

  // Recalculate strategy when debts, strategy, or budget changes
  useEffect(() => {
    if (debts.length === 0 || monthlyBudget === 0) {
      setStrategyResult(null);
      setProgress(null);
      setComparison(null);
      return;
    }

    // Calculate selected strategy
    let result;
    if (strategy === 'snowball') {
      result = calculateSnowballStrategy(debts, monthlyBudget);
    } else if (strategy === 'avalanche') {
      result = calculateAvalancheStrategy(debts, monthlyBudget);
    }

    setStrategyResult(result);

    // Calculate comparison between both strategies
    const comparisonResult = compareStrategies(debts, monthlyBudget);
    setComparison(comparisonResult);

    // Calculate progress
    const progressStats = calculateProgress(debts);
    setProgress(progressStats);
  }, [debts, strategy, monthlyBudget]);

  // Set default monthly budget when debts change
  useEffect(() => {
    if (debts.length > 0 && monthlyBudget === 0) {
      // Default to 20% more than minimums
      const defaultBudget = Math.ceil(totalMinimums * 1.2);
      setMonthlyBudget(defaultBudget);
    }
  }, [debts, totalMinimums, monthlyBudget]);

  const handleAddDebt = (debt) => {
    setDebts(prev => [...prev, debt]);
    setShowAddForm(false);
  };

  const handleDeleteDebt = (index) => {
    if (window.confirm('Are you sure you want to delete this debt?')) {
      setDebts(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleEditDebt = (index, updatedDebt) => {
    // If updatedDebt is provided, save the changes (called from inline editing)
    if (updatedDebt !== undefined) {
      setDebts(prev => prev.map((debt, i) => i === index ? updatedDebt : debt));
      return;
    }

    // Otherwise, open the modal for editing (called from edit button)
    setEditingDebt(debts[index]);
    setEditingIndex(index);
  };

  const handleSaveEdit = (updatedDebt, index) => {
    setDebts(prev => prev.map((debt, i) => i === index ? updatedDebt : debt));
    setEditingDebt(null);
    setEditingIndex(null);
  };

  const handleCancelEdit = () => {
    setEditingDebt(null);
    setEditingIndex(null);
  };

  const handleUploadStatement = () => {
    setShowUploader(true);
  };

  const handleFileParsed = (parsedData) => {
    console.log('File parsed:', parsedData);
    setUploadData(parsedData);
    setShowUploader(false);
    setShowMappingModal(true);
  };

  const handleConfirmMapping = (mappingInfo) => {
    console.log('Mapping confirmed:', mappingInfo);

    try {
      const { mapping, debtName, debtType, startingBalance, interestRate, minimumPayment } = mappingInfo;

      // Process transactions from uploaded data
      const rawTransactions = uploadData.rawData || [];

      console.log('Raw transactions from parser:', rawTransactions);
      console.log('Mapping:', mapping);

      // Store transactions in the format needed for display
      // Use the mapping to extract the correct fields from the raw data
      const transactions = rawTransactions.map(row => {
        // Extract values using the mapping keys
        const dateValue = row[mapping.date] || '';
        const amountValue = row[mapping.amount] || 0;
        const descriptionValue = row[mapping.description] || '';

        return {
          transactionDate: dateValue,
          description: descriptionValue,
          amount: typeof amountValue === 'string' ? parseFloat(amountValue.replace(/[£,]/g, '')) || 0 : amountValue,
          creditor: debtName
        };
      });

      // Check if a debt with this name already exists
      const existingDebtIndex = debts.findIndex(debt => debt.debtName === debtName);

      if (existingDebtIndex !== -1) {
        // Debt exists - merge transactions and update balance
        console.log(`Merging transactions for existing debt: ${debtName}`);

        const existingDebt = debts[existingDebtIndex];
        const existingTransactions = existingDebt.transactions || [];

        // Create unique transaction IDs for deduplication
        const createTransactionId = (txn) => {
          const date = txn.transactionDate || '';
          const amount = txn.amount || 0;
          const description = txn.description || '';
          return `${date}_${amount}_${description}`.toLowerCase().trim();
        };

        // Build Set of existing transaction IDs
        const existingIds = new Set(
          existingTransactions.map(txn => createTransactionId(txn))
        );

        // Filter out duplicate transactions from new data
        const uniqueNewTransactions = transactions.filter(txn => {
          const txnId = createTransactionId(txn);
          return !existingIds.has(txnId);
        });

        console.log(`Found ${uniqueNewTransactions.length} new transactions out of ${transactions.length} total`);

        if (uniqueNewTransactions.length === 0) {
          alert(`No new transactions found. All ${transactions.length} transactions already exist in ${debtName}.`);
          setShowMappingModal(false);
          setUploadData(null);
          return;
        }

        // Merge transactions (new transactions added to existing)
        const mergedTransactions = [...existingTransactions, ...uniqueNewTransactions];

        // Sort transactions by date descending (newest first)
        mergedTransactions.sort((a, b) => {
          const dateA = parseTransactionDate(a.transactionDate);
          const dateB = parseTransactionDate(b.transactionDate);
          return dateB.diff(dateA);
        });

        // Recalculate current balance by applying all merged transactions to original balance
        let currentBalance = existingDebt.originalBalance || startingBalance;
        mergedTransactions.forEach(txn => {
          currentBalance += txn.amount; // amount is already signed (negative for payments)
        });

        // Update the existing debt with merged data
        const updatedDebt = {
          ...existingDebt,
          balance: Math.abs(currentBalance),
          transactions: mergedTransactions,
          transactionCount: mergedTransactions.length,
          // Keep original metadata but update last modified info
          lastUpdated: new Date().toISOString(),
          lastFileName: uploadData.fileName,
        };

        // Replace the existing debt in the array
        setDebts(prev => {
          const updated = [...prev];
          updated[existingDebtIndex] = updatedDebt;
          return updated;
        });

        alert(`Successfully added ${uniqueNewTransactions.length} new transaction${uniqueNewTransactions.length !== 1 ? 's' : ''} to ${debtName}`);

        console.log('Debt updated successfully:', updatedDebt);
      } else {
        // New debt - create new entry
        console.log(`Creating new debt: ${debtName}`);

        // Sort transactions by date descending (newest first)
        transactions.sort((a, b) => {
          const dateA = parseTransactionDate(a.transactionDate);
          const dateB = parseTransactionDate(b.transactionDate);
          return dateB.diff(dateA);
        });

        // Calculate current balance by applying all transactions to starting balance
        let currentBalance = startingBalance;
        transactions.forEach(txn => {
          currentBalance += txn.amount; // amount is already signed (negative for payments)
        });

        const newDebt = {
          debtName: debtName,
          debtType: debtType,
          balance: Math.abs(currentBalance),
          originalBalance: Math.abs(startingBalance), // Use starting balance as original
          interestRate: interestRate,
          minimumPayment: minimumPayment || Math.max(25, Math.abs(currentBalance) * 0.02), // 2% or £25 minimum
          currentPayment: minimumPayment || Math.max(25, Math.abs(currentBalance) * 0.02),
          createdAt: new Date().toISOString(),
          uploadedFrom: uploadData.fileName,
          transactionCount: transactions.length,
          transactions: transactions, // Store transaction history (already sorted)
        };

        // Add to debts
        setDebts(prev => [...prev, newDebt]);

        console.log('Debt added successfully:', newDebt);
      }

      // Close modal and reset
      setShowMappingModal(false);
      setUploadData(null);

    } catch (error) {
      console.error('Error processing debt upload:', error);
      alert('Failed to process uploaded statement. Please try again.');
    }
  };

  const handleCancelMapping = () => {
    setShowMappingModal(false);
    setUploadData(null);
  };

  // Show loading state
  if (loading) {
    return (
      <div className="debt-manager">
        <div className="debt-manager-loading">
          <div className="loading-spinner"></div>
          <p>Loading your debt data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="debt-manager">
      {/* Saving Indicator */}
      {saving && (
        <div className="saving-indicator">
          <div className="saving-spinner"></div>
          <span>Saving...</span>
        </div>
      )}

      {/* Edit Debt Modal */}
      {editingDebt && (
        <EditDebtModal
          debt={editingDebt}
          debtIndex={editingIndex}
          onSave={handleSaveEdit}
          onCancel={handleCancelEdit}
        />
      )}

      {/* Upload Debt Statement Modal */}
      {showUploader && (
        <UnifiedDebtUploader
          onFileParsed={handleFileParsed}
          onClose={() => setShowUploader(false)}
        />
      )}

      {/* Debt Mapping Review Modal */}
      {showMappingModal && uploadData && (
        <DebtMappingReviewModal
          data={uploadData.rawData}
          headers={uploadData.headers}
          initialMapping={uploadData.initialMapping}
          fileName={uploadData.fileName}
          totalRows={uploadData.rawData?.length || 0}
          detectedCreditor={uploadData.detectedCreditor}
          startingBalance={uploadData.startingBalance}
          interestRate={uploadData.interestRate}
          confidenceScores={uploadData.confidenceScores}
          aiMetadata={uploadData.aiMetadata}
          existingDebts={debts}
          onConfirm={handleConfirmMapping}
          onCancel={handleCancelMapping}
        />
      )}

      {/* Add Debt Form */}
      {showAddForm && (
        <DebtInputForm
          onAddDebt={handleAddDebt}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Show content if debts exist */}
      {debts.length > 0 ? (
        <>
          {/* Debt List */}
          <DebtListV2
            debts={debts}
            onEditDebt={handleEditDebt}
            onDeleteDebt={handleDeleteDebt}
            onAddDebt={() => setShowAddForm(true)}
            onUploadStatement={handleUploadStatement}
          />

          {/* Debt Spending Analyzer */}
          <DebtSpendingAnalyzer
            debts={debts}
            timeframe="month"
          />

          {/* Strategy Selector */}
          <StrategySelector
            selectedStrategy={strategy}
            monthlyBudget={monthlyBudget}
            onStrategyChange={setStrategy}
            onBudgetChange={setMonthlyBudget}
            totalMinimums={totalMinimums}
          />

          {/* Progress Summary */}
          <ProgressSummaryCard
            strategyResult={strategyResult}
            progress={progress}
          />

          {/* Repayment Timeline Chart */}
          {strategyResult && !strategyResult.error && (
            <RepaymentTimelineChart
              strategyResult={strategyResult}
              debts={debts}
            />
          )}

          {/* Strategy Comparison */}
          {comparison && !comparison.snowball.error && !comparison.avalanche.error && (
            <StrategyComparisonChart comparison={comparison} />
          )}

          {/* Debt Advisor Insights */}
          <DebtAdvisorPanel
            debts={debts}
            strategyResult={strategyResult}
            comparison={comparison}
          />
        </>
      ) : (
        /* Welcome State */
        <div className="debt-manager-welcome">
          <div className="welcome-content">
            <div className="welcome-icon">💳</div>
            <h2>Welcome to Debt Manager</h2>
            <p>
              Start by adding your debts to see personalized repayment strategies
              and find out when you'll be debt-free.
            </p>
            <div className="welcome-features">
              <div className="feature">
                <span className="feature-icon">⚡</span>
                <div>
                  <strong>Snowball Strategy</strong>
                  <p>Quick wins by paying off smallest debts first</p>
                </div>
              </div>
              <div className="feature">
                <span className="feature-icon">💰</span>
                <div>
                  <strong>Avalanche Strategy</strong>
                  <p>Save maximum interest by targeting highest rates</p>
                </div>
              </div>
              <div className="feature">
                <span className="feature-icon">📈</span>
                <div>
                  <strong>Track Progress</strong>
                  <p>See your debt-free date and total interest saved</p>
                </div>
              </div>
            </div>
            <button
              className="btn-get-started"
              onClick={() => setShowAddForm(true)}
            >
              Get Started
            </button>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="debt-manager-footer">
        <p>
          💡 <strong>Tip:</strong> The Avalanche method typically saves the most money in interest,
          while the Snowball method provides quicker psychological wins.
        </p>
      </div>
    </div>
  );
};

export default DebtManager;
