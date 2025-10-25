// PensionPots.js
import React, { useState, useEffect, useCallback } from "react";
import dayjs from "dayjs";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import debounce from "lodash.debounce";
// import { Settings, X } from "lucide-react"; // ARCHIVED - customization UI removed
import "./PensionPotsStyles.css";
import "./SavingsTrackerStyles.css";
import PensionPotPie from "../modules/PensionPotPie";
import PensionAccountsTable from "../modules/PensionAccountsTable";
import PensionAccountsTableV2 from "../modules/PensionAccountsTableV2";
import IntelligentFileUploader from "../modules/IntelligentFileUploader";
import PdfPensionUploader from "../modules/PdfPensionUploader";
import MappingReviewModal from "../modules/MappingReviewModal";
import { processPensionUpload } from "../modules/utils/pensionDataProcessor";
import PensionMetricCards from "../modules/PensionMetricCards";
import PensionGrowthChart from "../modules/PensionGrowthChart";
// import PensionPeerComparison from "../modules/PensionPeerComparison"; // ARCHIVED
import AIFinancialAdvisory from "../modules/AIFinancialAdvisory";
import PensionAllowanceUtilization from "../modules/PensionAllowanceUtilization";

const DEFAULT_MODULE_ORDER = [
  "uploader",
  "ai-advisory",
  "overview",
  "accounts-table-v2",
  "allowance-utilization",
  "accounts-table",
  // "peer-comparison", // ARCHIVED
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
    description: "Pie Chart & Deposit History",
  },
  // "peer-comparison": { // ARCHIVED
  //   name: "Peer Comparison",
  //   description: "Compare to your age group",
  // },
  "accounts-table": {
    name: "Pension Accounts",
    description: "Detailed provider information",
  },
  "accounts-table-v2": {
    name: "Pension Accounts V2",
    description: "Clean table design (NEW)",
  },
  "allowance-utilization": {
    name: "Allowance Utilization",
    description: "Track annual allowance usage",
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
  const [showPdfUploadModal, setShowPdfUploadModal] = useState(false);
  const [showFileTypeSelector, setShowFileTypeSelector] = useState(false);
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

          // Get all current module IDs from MODULE_CONFIG
          const allModuleIds = Object.keys(MODULE_CONFIG);

          // Start with saved moduleOrder or default
          let moduleOrder = savedPreferences.moduleOrder || DEFAULT_MODULE_ORDER;

          // MIGRATION: Replace old "allowance-chart" with new "allowance-utilization"
          moduleOrder = moduleOrder.map(id =>
            id === "allowance-chart" ? "allowance-utilization" : id
          );

          // MIGRATION: Reorder modules to match new DEFAULT_MODULE_ORDER
          // New order: uploader, ai-advisory, overview, accounts-table-v2, allowance-utilization, accounts-table
          const tableV2Index = moduleOrder.indexOf("accounts-table-v2");
          const tableIndex = moduleOrder.indexOf("accounts-table");
          const allowanceIndex = moduleOrder.indexOf("allowance-utilization");

          // If all three modules exist and need reordering
          if (tableV2Index !== -1 && tableIndex !== -1 && allowanceIndex !== -1) {
            // Remove all three from their current positions
            moduleOrder = moduleOrder.filter(id =>
              id !== "accounts-table-v2" &&
              id !== "accounts-table" &&
              id !== "allowance-utilization"
            );

            // Find where to insert them (after "overview" if it exists, otherwise at the end)
            const overviewIndex = moduleOrder.indexOf("overview");
            const insertIndex = overviewIndex !== -1 ? overviewIndex + 1 : moduleOrder.length;

            // Insert in the new order: V2, then allowance, then original table
            moduleOrder.splice(insertIndex, 0, "accounts-table-v2", "allowance-utilization", "accounts-table");
          }

          console.log("After migration, moduleOrder:", moduleOrder);

          // Add any new modules that exist in MODULE_CONFIG but not in saved preferences
          const newModules = allModuleIds.filter(id => !moduleOrder.includes(id));
          if (newModules.length > 0) {
            console.log("Adding new modules to user preferences:", newModules);
            moduleOrder = [...moduleOrder, ...newModules];
          }

          // Ensure visibleModules includes all valid modules (including new ones)
          let visibleModules = savedPreferences.visibleModules || DEFAULT_VISIBLE_MODULES;

          // MIGRATION: Replace old "allowance-chart" with new "allowance-utilization" in visible modules
          visibleModules = visibleModules.map(id =>
            id === "allowance-chart" ? "allowance-utilization" : id
          );

          const newVisibleModules = allModuleIds.filter(id => !visibleModules.includes(id));
          if (newVisibleModules.length > 0) {
            console.log("Adding new modules to visible modules:", newVisibleModules);
            visibleModules = [...visibleModules, ...newVisibleModules];
          }

          setDashboardPreferences({
            ...savedPreferences, // Include any other saved preferences first
            moduleOrder, // Then override with migrated values
            visibleModules,
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
    setPensions((prev) => {
      const updatedPensions = prev.filter((p) => p.provider !== providerName);

      // Recalculate yearly totals from the remaining pensions
      const newYearlyTotals = {};
      updatedPensions.forEach((pension) => {
        if (pension.paymentHistory) {
          pension.paymentHistory.forEach((payment) => {
            const paymentDate = new Date(payment.date);
            const month = paymentDate.getMonth();
            const day = paymentDate.getDate();
            const year = paymentDate.getFullYear();

            // Calculate UK tax year (April 6 cutoff)
            const taxYear = (month > 3 || (month === 3 && day >= 6)) ? year : year - 1;

            newYearlyTotals[taxYear] = (newYearlyTotals[taxYear] || 0) + payment.amount;
          });
        }
      });

      setYearlyTotals(newYearlyTotals);
      return updatedPensions;
    });
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
          const paymentDate = new Date(payment.date);
          const month = paymentDate.getMonth();
          const day = paymentDate.getDate();
          const year = paymentDate.getFullYear();

          // Calculate UK tax year (April 6 cutoff)
          const taxYear = (month > 3 || (month === 3 && day >= 6)) ? year : year - 1;

          newYearlyTotals[taxYear] = (newYearlyTotals[taxYear] || 0) + payment.amount;
        });
      }
    });

    setYearlyTotals(newYearlyTotals);
  };

  // Step 1: Handle file parsed from IntelligentFileUploader or PdfPensionUploader
  const handleFileParsed = (parsedResult) => {
    // Store the upload result and show review modal
    setUploadResult(parsedResult);
    setShowUploadModal(false);
    setShowPdfUploadModal(false);
    setShowReviewModal(true);
  };

  // Step 2: Handle confirmed mapping from MappingReviewModal
  const handleMappingConfirmed = (confirmedResult) => {
    // Process the upload result using the pension data processor
    const { yearlyTotals: newYearlyTotals, providerData } =
      processPensionUpload(confirmedResult);

    // Get the current value from the confirmed result
    const userEnteredCurrentValue = confirmedResult.currentValue || 0;

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
              currentValue: userEnteredCurrentValue, // Use the value from the modal
            };
          } else {
            updatedPensions.push({
              ...newProvider,
              currentValue: userEnteredCurrentValue, // Use the value from the modal
            });
            setSelectedPensions((prev) => [...prev, newProvider.provider]);
          }
        });

        // Recalculate yearly totals from ALL pensions after merge
        const recalculatedYearlyTotals = {};
        updatedPensions.forEach((pension) => {
          if (pension.paymentHistory) {
            pension.paymentHistory.forEach((payment) => {
              const paymentDate = new Date(payment.date);
              const month = paymentDate.getMonth();
              const day = paymentDate.getDate();
              const year = paymentDate.getFullYear();

              // Calculate UK tax year (April 6 cutoff)
              const taxYear = (month > 3 || (month === 3 && day >= 6)) ? year : year - 1;

              recalculatedYearlyTotals[taxYear] = (recalculatedYearlyTotals[taxYear] || 0) + payment.amount;
            });
          }
        });

        setYearlyTotals(recalculatedYearlyTotals);
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
                  console.log("Upload button clicked, setting showFileTypeSelector to true");
                  setShowFileTypeSelector(true);
                }}
                className="upload-trigger-button"
              >
                <span className="upload-icon">📁</span>
                <div className="upload-trigger-content">
                  <h3 className="upload-trigger-title">Upload Pension Data</h3>
                  <p className="upload-trigger-description">
                    Import from CSV, Excel, PDF, or photo
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
              <div className="full-width-card growth-chart-container">
                <PensionGrowthChart
                  pensionAccounts={selectedPensionAccounts}
                  yearlyTotals={yearlyTotals}
                />
              </div>
            </div>
          );
        }
        return null;

      // case "peer-comparison": // ARCHIVED
      //   if (
      //     shouldShowModule(
      //       "peer-comparison",
      //       pensions.length > 0 &&
      //         pensionBuilderData &&
      //         pensionBuilderData.currentPot > 0
      //     )
      //   ) {
      //     return (
      //       <div className="full-width-card">
      //         <PensionPeerComparison pensionBuilderData={pensionBuilderData} />
      //       </div>
      //     );
      //   }
      //   return null;

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
                onUpdatePensions={handleUpdatePensions}
              />
            </div>
          );
        }
        return null;

      case "accounts-table-v2":
        if (shouldShowModule("accounts-table-v2", pensions.length > 0)) {
          return (
            <PensionAccountsTableV2
              pensions={pensions}
              selectedPensions={selectedPensions}
              onToggle={toggleSelectedPension}
              onRemove={removePension}
              onUpdateValue={updatePensionValue}
            />
          );
        }
        return null;

      case "allowance-utilization":
        console.log("allowance-utilization case hit!");
        console.log("yearlyTotals:", yearlyTotals);
        console.log("yearlyTotals keys length:", Object.keys(yearlyTotals).length);
        console.log("isModuleVisible:", isModuleVisible("allowance-utilization"));
        console.log("shouldShowModule result:", shouldShowModule(
          "allowance-utilization",
          Object.keys(yearlyTotals).length > 0
        ));

        if (
          shouldShowModule(
            "allowance-utilization",
            Object.keys(yearlyTotals).length > 0
          )
        ) {
          console.log("✅ RENDERING ALLOWANCE UTILIZATION");
          return (
            <div className="full-width-card">
              <PensionAllowanceUtilization yearlyTotals={yearlyTotals} />
            </div>
          );
        }
        console.log("❌ NOT RENDERING - condition failed");
        return null;

      default:
        return null;
    }
  };

  // Show loading state while fetching data
  if (isLoading) {
    return (
      <div className="savings-tracker-container">
        <div className="loading-state">
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="savings-tracker-container">
      {/* Settings button hidden for now - will be re-introduced later */}
      {/* <div className="dashboard-header">
        <button
          className="customize-dashboard-btn"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log("Customize button clicked!");
            setShowCustomizePanel(!showCustomizePanel);
          }}
          aria-label="Customize Dashboard"
        >
          <Settings size={20} />
        </button>
      </div> */}

      {/* ARCHIVED - Dashboard Customization Panel has been removed */}

      {/* Pension Metric Cards - Always displayed at the top when pensions exist */}
      {pensions.length > 0 && selectedPensions.length > 0 && (
        <PensionMetricCards
          pensionAccounts={pensions}
          selectedPensions={selectedPensions}
          yearlyTotals={yearlyTotals}
        />
      )}

      <div className="dashboard-modules">
        {console.log("Rendering modules with moduleOrder:", dashboardPreferences.moduleOrder)}
        {dashboardPreferences.moduleOrder.map((moduleId) => {
          console.log("Rendering module:", moduleId);
          return (
            <div
              key={moduleId}
              className="module-wrapper"
              // ARCHIVED - Drag and drop customization removed
              // className={`module-wrapper ${
              //   draggedModule === moduleId ? "dragging" : ""
              // } ${MODULE_CONFIG[moduleId]?.alwaysVisible ? "non-draggable" : ""}`}
              // draggable={!MODULE_CONFIG[moduleId]?.alwaysVisible}
              // onDragStart={(e) => handleDragStart(e, moduleId)}
              // onDragOver={handleDragOver}
              // onDrop={(e) => handleDrop(e, moduleId)}
              // onDragEnd={handleDragEnd}
            >
              {renderModule(moduleId)}
            </div>
          );
        })}
      </div>

      {pensions.length === 0 && !showUploadModal && !showPdfUploadModal && !showFileTypeSelector && !showReviewModal && (
        <div className="empty-state">
          <div className="empty-state-icon">💼</div>
          <h3>No pension data uploaded yet</h3>
          <p>
            Upload your first pension contribution file to start tracking your pension
            journey and unlock all dashboard features
          </p>
        </div>
      )}

      {/* File Type Selector Modal */}
      {showFileTypeSelector && (
        <div className="upload-modal-overlay">
          <div className="upload-modal-container" style={{ maxWidth: "600px" }}>
            <div className="upload-modal-content">
              <div className="upload-modal-header">
                <div>
                  <h2 className="upload-modal-title">Choose Upload Method</h2>
                  <p className="upload-modal-subtitle">
                    Select the type of file you want to upload
                  </p>
                </div>
                <button
                  onClick={() => setShowFileTypeSelector(false)}
                  className="upload-modal-close"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div style={{ display: "grid", gap: "16px" }}>
                <button
                  onClick={() => {
                    setShowFileTypeSelector(false);
                    setShowUploadModal(true);
                  }}
                  style={{
                    padding: "24px",
                    background: "rgba(99, 102, 241, 0.1)",
                    border: "2px solid rgba(99, 102, 241, 0.3)",
                    borderRadius: "12px",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(99, 102, 241, 0.15)";
                    e.currentTarget.style.borderColor = "#6366f1";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(99, 102, 241, 0.1)";
                    e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.3)";
                  }}
                >
                  <div style={{ fontSize: "2rem", marginBottom: "12px" }}>📊</div>
                  <h3 style={{ margin: "0 0 8px 0", color: "var(--text-primary)", fontSize: "1.125rem", fontWeight: 600 }}>
                    CSV or Excel File
                  </h3>
                  <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.9375rem" }}>
                    Upload structured data from spreadsheets (.csv, .xls, .xlsx)
                  </p>
                </button>

                <button
                  onClick={() => {
                    setShowFileTypeSelector(false);
                    setShowPdfUploadModal(true);
                  }}
                  style={{
                    padding: "24px",
                    background: "rgba(139, 92, 246, 0.1)",
                    border: "2px solid rgba(139, 92, 246, 0.3)",
                    borderRadius: "12px",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(139, 92, 246, 0.15)";
                    e.currentTarget.style.borderColor = "#8b5cf6";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(139, 92, 246, 0.1)";
                    e.currentTarget.style.borderColor = "rgba(139, 92, 246, 0.3)";
                  }}
                >
                  <div style={{ fontSize: "2rem", marginBottom: "12px" }}>📄</div>
                  <h3 style={{ margin: "0 0 8px 0", color: "var(--text-primary)", fontSize: "1.125rem", fontWeight: 600 }}>
                    PDF or Photo
                  </h3>
                  <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.9375rem" }}>
                    Upload pension statements as PDF files or photos (AI extraction)
                  </p>
                </button>
              </div>

              <div className="upload-modal-actions">
                <button
                  onClick={() => setShowFileTypeSelector(false)}
                  className="upload-cancel-button"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSV/Excel Upload Modal */}
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

      {/* PDF/Image Upload Modal */}
      {showPdfUploadModal && (
        <>
          {console.log("Rendering PdfPensionUploader modal")}
          <PdfPensionUploader
            onFileParsed={handleFileParsed}
            onClose={() => setShowPdfUploadModal(false)}
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
