import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUserDocuments, penceToPounds } from '../utils/firestore';
import ModuleCard from '../components/dashboard/ModuleCard';

const Dashboard = () => {
  const { currentUser } = useAuth();
  const [debtsData, setDebtsData] = useState({ totalDebt: 0, monthlyPayment: 0 });
  const [savingsData, setSavingsData] = useState({ totalSavings: 0, accountCount: 0 });
  const [pensionData, setPensionData] = useState({ totalValue: 0, providerCount: 0 });
  const [loading, setLoading] = useState(true);

  // Fetch debts and savings data
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;

      try {
        setLoading(true);

        // Fetch debts
        const userDebts = await getUserDocuments('user_debts', currentUser.uid);
        const activeDebts = userDebts.filter(debt => !debt.isCleared);
        const totalDebt = activeDebts.reduce((sum, debt) => sum + debt.currentBalance, 0);
        const monthlyPayment = activeDebts.reduce((sum, debt) => sum + debt.currentPayment, 0);
        setDebtsData({ totalDebt, monthlyPayment });

        // Fetch savings accounts
        const userSavings = await getUserDocuments('user_savings_accounts', currentUser.uid);
        const totalSavings = userSavings.reduce((sum, account) => sum + account.currentBalance, 0);
        setSavingsData({ totalSavings, accountCount: userSavings.length });

        // Fetch pension accounts
        const userPensions = await getUserDocuments('user_pension_accounts', currentUser.uid);
        const totalValue = userPensions.reduce((sum, account) => sum + (account.currentValue || 0), 0);
        setPensionData({ totalValue, providerCount: userPensions.length });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

  const modules = [
    {
      title: 'Debt Manager',
      description: 'Track debts, compare repayment strategies, and visualize your path to being debt-free.',
      icon: '💳',
      path: '/debt-manager',
      comingSoon: false,
      stats: [
        {
          label: 'Total Debt',
          value: loading ? '...' : penceToPounds(debtsData.totalDebt),
          color: debtsData.totalDebt > 0 ? 'text-danger-700' : 'text-gray-900'
        },
        {
          label: 'Monthly Payment',
          value: loading ? '...' : penceToPounds(debtsData.monthlyPayment),
          color: 'text-gray-900'
        },
      ],
    },
    {
      title: 'Pension Builder',
      description: 'Track pension pots, monitor UK annual allowance, and plan for retirement.',
      icon: '🏦',
      path: '/pension-builder',
      comingSoon: false,
      stats: [
        {
          label: 'Pension Value',
          value: loading ? '...' : penceToPounds(pensionData.totalValue),
          color: pensionData.totalValue > 0 ? 'text-success-700' : 'text-gray-900'
        },
        {
          label: 'Providers',
          value: loading ? '...' : pensionData.providerCount.toString(),
          color: 'text-gray-900'
        },
      ],
    },
    {
      title: 'Savings Tracker',
      description: 'Monitor your savings accounts, ISAs, and progress towards your financial goals.',
      icon: '💰',
      path: '/savings-tracker',
      comingSoon: false,
      stats: [
        {
          label: 'Total Savings',
          value: loading ? '...' : penceToPounds(savingsData.totalSavings),
          color: savingsData.totalSavings > 0 ? 'text-success-700' : 'text-gray-900'
        },
        {
          label: 'Accounts',
          value: loading ? '...' : savingsData.accountCount.toString(),
          color: 'text-gray-900'
        },
      ],
    },
    {
      title: 'Investment Analyzer',
      description: 'Analyze investment performance, diversification, and risk across your portfolio.',
      icon: '📈',
      path: '/investment-analyzer',
      comingSoon: true,
    },
    {
      title: 'Mortgage Calculator',
      description: 'Compare mortgage options, calculate repayments, and explore overpayment scenarios.',
      icon: '🏠',
      path: '/mortgage-calculator',
      comingSoon: true,
    },
    {
      title: 'Financial Education',
      description: 'Learn about UK personal finance, tax strategies, and smart money management.',
      icon: '📚',
      path: '/education',
      comingSoon: true,
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {currentUser?.displayName || 'there'}!
        </h1>
        <p className="text-gray-600">
          Manage your finances and make smarter money decisions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((module) => (
          <ModuleCard key={module.title} {...module} />
        ))}
      </div>

      <div className="mt-12 card bg-primary-50 border-primary-200">
        <div className="flex items-start">
          <div className="text-3xl mr-4">💡</div>
          <div>
            <h3 className="text-lg font-bold text-primary-900 mb-2">Getting Started</h3>
            <p className="text-primary-800 text-sm mb-4">
              Start by adding your debts in the Debt Manager to see personalized repayment strategies
              and understand how different approaches can save you money and time.
            </p>
            <ul className="space-y-2 text-sm text-primary-800">
              <li className="flex items-center">
                <span className="mr-2">✓</span>
                <span>Add all your outstanding debts (credit cards, loans, overdrafts)</span>
              </li>
              <li className="flex items-center">
                <span className="mr-2">✓</span>
                <span>Compare Snowball vs Avalanche repayment strategies</span>
              </li>
              <li className="flex items-center">
                <span className="mr-2">✓</span>
                <span>See projected debt-free dates and total interest savings</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
