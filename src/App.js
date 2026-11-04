import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import "./styles/SharedStyles.css";
import { AuthProvider } from "./contexts/AuthContext";
import { UserPlanProvider } from "./contexts/UserPlanContext";
import { DemoModeProvider } from "./contexts/DemoModeContext";
import { ReportProblemProvider } from "./contexts/ReportProblemContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import ReportProblemModal from "./components/ReportProblemModal";
import { Analytics } from "@vercel/analytics/react";
import Login from "./components/auth/Login";
import Register from "./components/auth/Register";
import ForgotPassword from "./components/auth/ForgotPassword";
import MobileApp from "./mobile/MobileApp";
import PrivacyPolicyPage from "./mobile/settings/PrivacyPolicyPage";
import TermsOfUsePage from "./mobile/settings/TermsOfUsePage";

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <UserPlanProvider>
          <DemoModeProvider>
            <ReportProblemProvider>
              <Routes>
                {/* Public auth routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />

                {/* Public legal pages (readable before signing up) */}
                <Route path="/privacy" element={<PrivacyPolicyPage />} />
                <Route path="/terms" element={<TermsOfUsePage />} />

                {/* Mobile app */}
                <Route
                  path="/mobile/*"
                  element={
                    <ProtectedRoute>
                      <MobileApp />
                    </ProtectedRoute>
                  }
                />

                {/* All other routes → mobile dashboard */}
                <Route
                  path="*"
                  element={
                    <ProtectedRoute>
                      <Navigate to="/mobile/dashboard" replace />
                    </ProtectedRoute>
                  }
                />
              </Routes>
              <ReportProblemModal />
              <Analytics />
            </ReportProblemProvider>
          </DemoModeProvider>
        </UserPlanProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
