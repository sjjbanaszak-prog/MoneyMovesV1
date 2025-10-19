import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import "./styles/SharedStyles.css"; // Import shared styles globally
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Login from "./components/auth/Login";
import Register from "./components/auth/Register";
import ForgotPassword from "./components/auth/ForgotPassword";
import Navbar from "./components/Navbar";
import PensionBuilderNEW from "./pages/PensionBuilderNEW";
import PensionStatus from "./pages/PensionPots";
import MortgageCalcNEW from "./pages/MortgageCalcNEW";
import LandingPage from "./pages/LandingPage";
import SavingsTracker from "./pages/SavingsTracker";
import Trading212Dashboard from "./pages/Trading212Dashboard";
import AccountSettings from "./pages/AccountSettings";

const App = () => {
  // Shared state for both PensionStatus and PensionBuilder
  const [entries, setEntries] = useState([]);
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 1024;
    }
    return false;
  });

  const total = entries.reduce((sum, e) => sum + (parseFloat(e.value) || 0), 0);

  // Handle screen resize to adjust layout
  useEffect(() => {
    const checkScreenSize = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
    };

    checkScreenSize(); // Check on mount
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Dynamic styles based on screen size
  const mainContentStyles = {
    display: "flex",
    minHeight: "100vh",
  };

  const contentStyles = {
    flex: 1,
    padding: isDesktop ? "1rem" : "1rem",
    paddingTop: isDesktop ? "1rem" : "80px", // Account for fixed mobile navbar
    // Remove paddingLeft for desktop - let CSS handle sidebar offset
  };

  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Protected Routes */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <div style={mainContentStyles}>
                  <Navbar />
                  <div style={contentStyles}>
                    <Routes>
                      <Route path="/" element={<LandingPage />} />
                      <Route
                        path="/PensionPots"
                        element={
                          <PensionStatus entries={entries} setEntries={setEntries} />
                        }
                      />
                      <Route
                        path="/PensionBuilderNEW"
                        element={<PensionBuilderNEW currentPot={total} />}
                      />
                      <Route path="/MortgageCalcNEW" element={<MortgageCalcNEW />} />
                      {/* Redirect old mortgage route to new one */}
                      <Route path="/MortgageCalc" element={<Navigate to="/MortgageCalcNEW" replace />} />
                      <Route path="/SavingsTracker" element={<SavingsTracker />} />
                      <Route
                        path="/Trading212Dashboard"
                        element={<Trading212Dashboard />}
                      />
                      <Route path="/account-settings" element={<AccountSettings />} />
                    </Routes>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
};

export default App;
