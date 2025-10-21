import React, { useState, useEffect } from 'react';
import './DebtManagerStyles.css';
import DebtInputForm from '../modules/DebtInputForm';
import DebtList from '../modules/DebtList';
import StrategySelector from '../modules/StrategySelector';
import ProgressSummaryCard from '../modules/ProgressSummaryCard';
import RepaymentTimelineChart from '../modules/RepaymentTimelineChart';
import StrategyComparisonChart from '../modules/StrategyComparisonChart';
import DebtAdvisorPanel from '../modules/DebtAdvisorPanel';
import EditDebtModal from '../modules/EditDebtModal';
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

const DebtManager = () => {
  const [debts, setDebts] = useState([]);
  const [strategy, setStrategy] = useState('avalanche');
  const [monthlyBudget, setMonthlyBudget] = useState(0);
  const [showAddForm, setShowAddForm] = useState(false);
  const [strategyResult, setStrategyResult] = useState(null);
  const [progress, setProgress] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingDebt, setEditingDebt] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);

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

  const handleEditDebt = (index) => {
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

      {/* Header */}
      <div className="debt-manager-header">
        <div className="header-content">
          <h1>Debt Manager</h1>
          <p className="header-subtitle">
            Take control of your debts with smart repayment strategies
          </p>
        </div>
        <button
          className="btn-add-debt"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? '✕ Cancel' : '+ Add Debt'}
        </button>
      </div>

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
          <DebtList
            debts={debts}
            onEditDebt={handleEditDebt}
            onDeleteDebt={handleDeleteDebt}
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
