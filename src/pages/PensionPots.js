// PensionPots.js
import React, { useState, useEffect, useCallback } from "react";
import dayjs from "dayjs";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import debounce from "lodash.debounce";
import { Settings, X } from "lucide-react";
import "./PensionPotsStyles.css";
import "./SavingsTrackerStyles.css";
import PensionPotPie from "../modules/PensionPotPie";
import PensionAccountsTable from "../modules/PensionAccountsTable";
import IntelligentFileUploader from "../modules/IntelligentFileUploader";
import MappingReviewModal from "../modules/MappingReviewModal";
import { processPensionUpload } from "../modules/utils/pensionDataProcessor";
import PensionAllowanceChart from "../modules/PensionAllowanceChart";
import PensionPerformanceCards from "../modules/PensionPerformanceCards";
import PensionGrowthChart from "../modules/PensionGrowthChart";
import PensionPeerComparison from "../modules/PensionPeerComparison";
import AIFinancialAdvisory from "../modules/AIFinancialAdvisory";

const DEFAULT_MODULE_ORDER = [
  "uploader",
  "ai-advisory",
  "overview",
  "growth-chart",
  "peer-comparison",
  "accounts-table",
  "allowance-chart",
];

const DEFAULT_VISIBLE_MODULES = [...DEFAULT_MODULE_ORDER];

const MODULE_CONFIG = {
  uploader: {
    name: "File Uploader",
    alwaysVisible: true,
    description: "Upload pension contribution files",
  },
  "ai-advisory": {
    name: "AI Financial Advisory",
    description: "Personalized pension insights",
  },
  overview: {
    name: "Overview",
    description: "Pie Chart & Performance Cards",
  },
  "growth-chart": {
    name: "Growth Over Time",
    description: "Pension growth visualization",
  },
  "peer-comparison": {
    name: "Peer Comparison",
    description: "Compare to your age group",
  },
  "accounts-table": {
    name: "Pension Accounts",
    description: "Detailed provider information",
  },
  "allowance-chart": {
    name: "Annual Allowance",
    description: "Track allowance usage",
  },
};

export default function PensionPots() {
  const [pensions, setPensions] = useState([]);
  const [selectedPensions, setSelectedPensions] = useState([]);
  const [yearlyTotals, setYearlyTotals] = useState({});
  const [user, setUser] = useState(null);
  const [pensionBuilderData, setPensionBuilderData] = useState(null);
  const [showCustomizePanel, setShowCustomizePanel] = useState(false);
  const [draggedModule, setDraggedModule] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Dashboard customization state
  const [dashboardPreferences, setDashboardPreferences] = useState({
    moduleOrder: DEFAULT_MODULE_ORDER,
    visibleModules: DEFAULT_VISIBLE_MODULES,
  });

  const [userPreferences, setUserPreferences] = useState({
    showAIAdvisory: true,
    aiAdvisoryExpanded: false,
  });

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Load pension pots data
        const docRef = doc(db, "pensionPots", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setPensions(data.pensions || []);
          setSelectedPensions(data.selectedPensions || []);
          setYearlyTotals(data.yearlyTotals || {});
        }

        // Load pension builder data
        const pensionBuilderRef = doc(db, "pensionScenarios", user.uid);
        const pensionBuilderSnap = await getDoc(pensionBuilderRef);
        if (pensionBuilderSnap.exists()) {
          setPensionBuilderData(pensionBuilderSnap.data());
        }

        // Load user preferences
        const preferencesRef = doc(db, "userPreferences", user.uid);
        const preferencesSnap = await getDoc(preferencesRef);
        if (preferencesSnap.exists()) {
          setUserPreferences((prev) => ({
            ...prev,
            ...preferencesSnap.data(),
          }));
        }

        // Load dashboard preferences - THIS IS THE KEY PART
        const dashboardPrefRef = doc(db, "dashboardPreferences", user.uid);
        const dashboardPrefSnap = await getDoc(dashboardPrefRef);
        if (dashboardPrefSnap.exists()) {
          const savedPreferences = dashboardPrefSnap.data();

          // Ensure we have valid moduleOrder and visibleModules
          const validModuleOrder = savedPreferences.moduleOrder?.every((id) =>
            Object.keys(MODULE_CONFIG).includes(id)
          )
            ? savedPreferences.moduleOrder
            : DEFAULT_MODULE_ORDER;

          const validVisibleModules =
            savedPreferences.visibleModules?.filter((id) =>
              Object.keys(MODULE_CONFIG).includes(id)
            ) || DEFAULT_VISIBLE_MODULES;

          setDashboardPreferences({
            moduleOrder: validModuleOrder,
            visibleModules: validVisibleModules,
            ...savedPreferences, // Include any other saved preferences
          });
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const debouncedSave = useCallback(
    debounce(async (userId, pensions, selectedPensions, yearlyTotals) => {
      if (!userId) return;
      const docRef = doc(db, "pensionPots", userId);
      try {
        await setDoc(docRef, { pensions, selectedPensions, yearlyTotals });
      } catch (err) {
        console.error("Error saving pensions to Firestore:", err);
      }
    }, 1000),
    []
  );

  const debouncedSaveDashboardPreferences = useCallback(
    debounce(async (userId, preferences) => {
      if (!userId) return;
      const docRef = doc(db, "dashboardPreferences", userId);
      try {
        await setDoc(docRef, preferences);
        console.log("Dashboard preferences saved successfully");
      } catch (err) {
        console.error("Error saving dashboard preferences:", err);
      }
    }, 500), // Reduced debounce time for better UX
    []
  );

  const debouncedSaveUserPreferences = useCallback(
    debounce(async (userId, preferences) => {
      if (!userId) return;
      const docRef = doc(db, "userPreferences", userId);
      try {
        await setDoc(docRef, preferences);
      } catch (err) {
        console.error("Error saving user preferences:", err);
      }
    }, 1000),
    []
  );

  useEffect(() => {
    if (user && !isLoading) {
      debouncedSave(user.uid, pensions, selectedPensions, yearlyTotals);
    }
  }, [
    pensions,
    selectedPensions,
    yearlyTotals,
    user,
    isLoading,
    debouncedSave,
  ]);

  useEffect(() => {
    if (user && !isLoading) {
      debouncedSaveDashboardPreferences(user.uid, dashboardPreferences);
    }
  }, [
    dashboardPreferences,
    user,
    isLoading,
    debouncedSaveDashboardPreferences,
  ]);

  useEffect(() => {
    if (user && !isLoading) {
      debouncedSaveUserPreferences(user.uid, userPreferences);
    }
  }, [userPreferences, user, isLoading, debouncedSaveUserPreferences]);

  const toggleAIAdvisory = () => {
    setUserPreferences((prev) => ({
      ...prev,
      aiAdvisoryExpanded: !prev.aiAdvisoryExpanded,
    }));
  };

  const toggleSelectedPension = (providerName) => {
    setSelectedPensions((prev) =>
      prev.includes(providerName)
        ? prev.filter((p) => p !== providerName)
        : [...prev, providerName]
    );
  };

  const removePension = (providerName) => {
    setPensions((prev) => prev.filter((p) => p.provider !== providerName));
    setSelectedPensions((prev) => prev.filter((p) => p !== providerName));
  };

  const updatePensionValue = (providerName, newValue, newDate) => {
    setPensions((prev) =>
      prev.map((p) =>
        p.provider === providerName
          ? { ...p, currentValue: Number(newValue), latestUpdate: newDate }
          : p
      )
    );
  };

  const handleUpdatePensions = (updatedPensions) => {
    setPensions(updatedPensions);

    // Recalculate yearly totals from the updated pensions
    const newYearlyTotals = {};
    updatedPensions.forEach((pension) => {
      if (pension.paymentHistory) {
        pension.paymentHistory.forEach((payment) => {
          const year = new Date(payment.date).getFullYear().toString();
          newYearlyTotals[year] = (newYearlyTotals[year] || 0) + payment.amount;
        });
      }
    });

    setYearlyTotals(newYearlyTotals);
  };

  // Step 1: Handle file parsed from IntelligentFileUploader
  const handleFileParsed = (parsedResult) => {
    // Store the upload result and show review modal
    setUploadResult(parsedResult);
    setShowUploadModal(false);
    setShowReviewModal(true);
  };

  // Step 2: Handle confirmed mapping from MappingReviewModal
  const handleMappingConfirmed = (confirmedResult) => {
    // Process the upload result using the pension data processor
    const { yearlyTotals: newYearlyTotals, providerData } =
      processPensionUpload(confirmedResult);

    // Update yearly totals
    setYearlyTotals((prevTotals) => ({
      ...prevTotals,
      ...newYearlyTotals,
    }));

    // Update pension providers
    if (providerData && Array.isArray(providerData)) {
      setPensions((prevPensions) => {
        const updatedPensions = [...prevPensions];

        providerData.forEach((newProvider) => {
          const existingIndex = updatedPensions.findIndex(
            (account) => account.provider === newProvider.provider
          );

          if (existingIndex >= 0) {
            const existing = updatedPensions[existingIndex];

            // Merge payment histories
            const combinedPaymentHistory = [
              ...(existing.paymentHistory || []),
              ...(newProvider.paymentHistory || []),
            ].sort((a, b) => a.date.localeCompare(b.date));

            updatedPensions[existingIndex] = {
              ...existing,
              paymentHistory: combinedPaymentHistory,
              firstPayment:
                existing.firstPayment &&
                existing.firstPayment < newProvider.firstPayment
                  ? existing.firstPayment
                  : newProvider.firstPayment,
              lastPayment:
                existing.lastPayment &&
                existing.lastPayment > newProvider.lastPayment
                  ? existing.lastPayment
                  : newProvider.lastPayment,
              deposits: (existing.deposits || 0) + newProvider.deposits,
              latestUpdate: newProvider.latestUpdate,
              currentValue: existing.currentValue || 0,
            };
          } else {
            updatedPensions.push({
              ...newProvider,
              currentValue: 0,
            });
            setSelectedPensions((prev) => [...prev, newProvider.provider]);
          }
        });

        return updatedPensions;
      });
    }

    // Close the review modal and clear upload result
    setShowReviewModal(false);
    setUploadResult(null);
  };

  // Handle review modal cancel
  const handleReviewCancel = () => {
    setShowReviewModal(false);
    setUploadResult(null);
    // Optionally reopen upload modal to let user upload again
    setShowUploadModal(true);
  };

  const toggleModuleVisibility = (moduleId) => {
    if (MODULE_CONFIG[moduleId]?.alwaysVisible) return;

    setDashboardPreferences((prev) => ({
      ...prev,
      visibleModules: prev.visibleModules.includes(moduleId)
        ? prev.visibleModules.filter((id) => id !== moduleId)
        : [...prev.visibleModules, moduleId],
    }));
  };

  const handleDragStart = (e, moduleId) => {
    if (MODULE_CONFIG[moduleId]?.alwaysVisible) {
      e.preventDefault();
      return;
    }
    setDraggedModule(moduleId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", moduleId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnd = () => {
    setDraggedModule(null);
  };

  const handleDrop = (e, targetModuleId) => {
    e.preventDefault();

    const draggedModuleId =
      e.dataTransfer.getData("text/plain") || draggedModule;

    if (draggedModuleId && draggedModuleId !== targetModuleId) {
      setDashboardPreferences((prev) => {
        const newOrder = [...prev.moduleOrder];
        const draggedIndex = newOrder.indexOf(draggedModuleId);
        const targetIndex = newOrder.indexOf(targetModuleId);

        if (draggedIndex === -1 || targetIndex === -1) return prev;

        // Remove dragged item and insert at target position
        newOrder.splice(draggedIndex, 1);
        newOrder.splice(targetIndex, 0, draggedModuleId);

        return {
          ...prev,
          moduleOrder: newOrder,
        };
      });
    }

    setDraggedModule(null);
  };

  const resetDashboard = () => {
    setDashboardPreferences({
      moduleOrder: DEFAULT_MODULE_ORDER,
      visibleModules: DEFAULT_VISIBLE_MODULES,
    });
  };

  const selectedPensionAccounts = pensions.filter(({ provider }) =>
    selectedPensions.includes(provider)
  );

  const isModuleVisible = (moduleId) => {
    return dashboardPreferences.visibleModules.includes(moduleId);
  };

  const shouldShowModule = (moduleId, condition = true) => {
    return isModuleVisible(moduleId) && condition;
  };

  const renderModule = (moduleId) => {
    switch (moduleId) {
      case "uploader":
        return (
          <div className="full-width-card">
            <div className="file-uploader-container dark-mode">
              <button
                onClick={() => {
                  console.log("Upload button clicked, setting showUploadModal to true");
                  setShowUploadModal(true);
                }}
                className="upload-trigger-button"
              >
                <span className="upload-icon">📁</span>
                <div className="upload-trigger-content">
                  <h3 className="upload-trigger-title">Upload Pension Data</h3>
                  <p className="upload-trigger-description">
                    Import contributions from CSV or Excel files
                  </p>
                </div>
              </button>
            </div>
          </div>
        );

      case "ai-advisory":
        if (
          shouldShowModule(
            "ai-advisory",
            userPreferences.showAIAdvisory &&
              (selectedPensionAccounts.length > 0 ||
                Object.keys(yearlyTotals).length > 0)
          )
        ) {
          return (
            <AIFinancialAdvisory
              pensionAccounts={selectedPensionAccounts}
              yearlyTotals={yearlyTotals}
              pensionBuilderData={pensionBuilderData}
              isExpanded={userPreferences.aiAdvisoryExpanded}
              onToggleExpanded={toggleAIAdvisory}
              key={`ai-${selectedPensions.join("-")}-${
                Object.keys(yearlyTotals).length
              }`}
            />
          );
        }
        return null;

      case "overview":
        if (
          shouldShowModule(
            "overview",
            selectedPensionAccounts.length > 0 &&
              Object.keys(yearlyTotals).length > 0
          )
        ) {
          return (
            <div className="pension-overview-grid">
              <div className="full-width-card pie-chart-container">
                <PensionPotPie pensionAccounts={selectedPensionAccounts} />
              </div>
              <div className="full-width-card performance-card-container">
                <PensionPerformanceCards
                  pensionAccounts={pensions}
                  selectedPensions={selectedPensions}
                  yearlyTotals={yearlyTotals}
                />
              </div>
            </div>
          );
        }
        return null;

      case "growth-chart":
        if (isModuleVisible("growth-chart")) {
          return (
            <div className="full-width-card">
              <PensionGrowthChart
                pensionAccounts={selectedPensionAccounts}
                yearlyTotals={yearlyTotals}
              />
            </div>
          );
        }
        return null;

      case "peer-comparison":
        if (
          shouldShowModule(
            "peer-comparison",
            pensionBuilderData && pensionBuilderData.currentPot > 0
          )
        ) {
          return (
            <div className="full-width-card">
              <PensionPeerComparison pensionBuilderData={pensionBuilderData} />
            </div>
          );
        }
        return null;

      case "accounts-table":
        if (shouldShowModule("accounts-table", pensions.length > 0)) {
          return (
            <div className="full-width-card">
              <PensionAccountsTable
                pensions={pensions}
                selectedPensions={selectedPensions}
                onToggle={toggleSelectedPension}
                onRemove={removePension}
                onUpdateValue={updatePensionValue}
              />
            </div>
          );
        }
        return null;

      case "allowance-chart":
        if (
          shouldShowModule(
            "allowance-chart",
            Object.keys(yearlyTotals).length > 0
          )
        ) {
          return (
            <div className="full-width-card">
              <PensionAllowanceChart yearlyTotals={yearlyTotals} />
            </div>
          );
        }
        return null;

      default:
        return null;
    }
  };

  // Show loading state while fetching data
  if (isLoading) {
    return (
      <div className="savings-tracker-container">
        <div className="dashboard-header">
          <h1 className="tracker-title">Pension Dashboard</h1>
        </div>
        <div className="loading-state">
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="savings-tracker-container">
      <div className="dashboard-header">
        <h1 className="tracker-title">Pension Dashboard</h1>
        <button
          className="customize-dashboard-btn"
          onClick={() => setShowCustomizePanel(!showCustomizePanel)}
          aria-label="Customize Dashboard"
        >
          <Settings size={20} />
        </button>
      </div>

      {showCustomizePanel && (
        <div className="customize-panel">
          <div className="panel-header">
            <h3 className="panel-title">Configure Your Dashboard</h3>
            <button
              className="close-panel-btn"
              onClick={() => setShowCustomizePanel(false)}
            >
              <X size={20} />
            </button>
          </div>

          <p className="panel-description">
            Toggle modules on/off and drag to reorder them. Changes are saved
            automatically.
          </p>

          <div className="module-toggles-grid">
            {dashboardPreferences.moduleOrder.map((moduleId) => {
              const config = MODULE_CONFIG[moduleId];
              const isVisible =
                dashboardPreferences.visibleModules.includes(moduleId);

              return (
                <div
                  key={moduleId}
                  className={`module-toggle-card ${isVisible ? "active" : ""} ${
                    config.alwaysVisible ? "always-visible" : ""
                  }`}
                  onClick={() => toggleModuleVisibility(moduleId)}
                >
                  <div className="module-toggle-info">
                    <span className="module-emoji">{config.icon}</span>
                    <div>
                      <div className="module-toggle-name">{config.name}</div>
                      <div className="module-toggle-desc">
                        {config.description}
                      </div>
                    </div>
                  </div>
                  <div
                    className={`toggle-switch ${isVisible ? "on" : "off"} ${
                      config.alwaysVisible ? "disabled" : ""
                    }`}
                  >
                    <div className="toggle-slider"></div>
                  </div>
                </div>
              );
            })}
          </div>

          <button className="reset-dashboard-btn" onClick={resetDashboard}>
            Reset to Default Layout
          </button>
        </div>
      )}

      <div className="dashboard-modules">
        {dashboardPreferences.moduleOrder.map((moduleId) => (
          <div
            key={moduleId}
            className={`module-wrapper ${
              draggedModule === moduleId ? "dragging" : ""
            } ${MODULE_CONFIG[moduleId]?.alwaysVisible ? "non-draggable" : ""}`}
            draggable={!MODULE_CONFIG[moduleId]?.alwaysVisible}
            onDragStart={(e) => handleDragStart(e, moduleId)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, moduleId)}
            onDragEnd={handleDragEnd}
          >
            {renderModule(moduleId)}
          </div>
        ))}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <>
          {console.log("Rendering IntelligentFileUploader modal")}
          <IntelligentFileUploader
            context="pensions"
            onFileParsed={handleFileParsed}
            onClose={() => setShowUploadModal(false)}
          />
        </>
      )}

      {/* Mapping Review Modal */}
      {showReviewModal && uploadResult && (
        <>
          {console.log("Rendering MappingReviewModal")}
          <MappingReviewModal
            uploadResult={uploadResult}
            context="pensions"
            onConfirm={handleMappingConfirmed}
            onCancel={handleReviewCancel}
          />
        </>
      )}
    </div>
  );
}
