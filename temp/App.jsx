import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import DashboardLayout from './components/layout/DashboardLayout';

// Auth pages
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ForgotPassword from './components/auth/ForgotPassword';

// Dashboard pages
import Dashboard from './pages/Dashboard';
import DebtManager from './pages/DebtManager';
import SavingsTracker from './pages/SavingsTracker';
import PensionBuilder from './pages/PensionBuilder';
import AccountSettings from './pages/AccountSettings';

function App() {
  return (
    <Router>
      <AuthProvider>
        <ThemeProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* Protected routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="debt-manager" element={<DebtManager />} />
              <Route path="savings-tracker" element={<SavingsTracker />} />
              <Route path="pension-builder" element={<PensionBuilder />} />
              <Route path="account-settings" element={<AccountSettings />} />
              <Route path="investment-analyzer" element={<ComingSoon module="Investment Analyzer" />} />
              <Route path="education" element={<ComingSoon module="Financial Education" />} />
            </Route>

            {/* 404 route */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </ThemeProvider>
      </AuthProvider>
    </Router>
  );
}

// Placeholder component for coming soon modules
const ComingSoon = ({ module }) => (
  <div>
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">{module}</h1>
    </div>
    <div className="card">
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🚧</div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Coming Soon</h3>
        <p className="text-gray-600">
          The {module} module is currently under development.
        </p>
      </div>
    </div>
  </div>
);

export default App;
