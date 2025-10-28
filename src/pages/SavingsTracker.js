import React, { useState, useEffect } from "react";
import UnifiedSavingsUploader from "../modules/UnifiedSavingsUploader";
import SavingsColumnMapperNew from "../modules/SavingsColumnMapperNew";
import SavingsChartV2 from "../modules/SavingsChartV2";
import SavingsPie from "../modules/SavingsPie";
import SavingsAccountsTable from "../modules/SavingsAccountsTable";
import SavingsMetricCards from "../modules/SavingsMetricCards";
import MonthlyBalanceChangeChart from "../modules/MonthlyBalanceChangeChart";
import ISAUtilizationChart from "../modules/ISAUtilizationChart";
import PremiumBondsAnalysis from "../modules/PremiumBondsAnalysis";
import AISavingsAdvisory from "../modules/AISavingsAdvisory";
import { accountTypeTransformers } from "../modules/utils/premiumBondsParser";
import { calculateDataQualityScore } from "../modules/utils/dataValidation";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import "./SavingsTrackerStyles.css";
import { useDemoMode } from "../contexts/DemoModeContext";
import DemoModeBanner from "../components/DemoModeBanner";

// Utility function to recursively remove undefined values from objects and arrays
const removeUndefined = (obj) => {
  if (Array.isArray(obj)) {
    return obj.map((item) => removeUndefined(item));
  } else if (obj !== null && typeof obj === "object") {
    return Object.entries(obj).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = removeUndefined(value);
      }
      return acc;
    }, {});
  }
  return obj;
};

export default function SavingsTracker() {
  const { isDemoMode, demoData } = useDemoMode();
  const [uploads, setUploads] = useState([]);
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [user, setUser] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showColumnMapper, setShowColumnMapper] = useState(false);
  const [rawData, setRawData] = useState([]);
  const [initialMapping, setInitialMapping] = useState(null);
  const [fileName, setFileName] = useState("");
  const [detectedBank, setDetectedBank] = useState("");
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
  const [confidenceScores, setConfidenceScores] = useState(null);
  const [aiMetadata, setAiMetadata] = useState(null);

  // User preferences for AI Advisory
  const [userPreferences, setUserPreferences] = useState({
    showAIAdvisory: true,
    aiAdvisoryExpanded: false,
    userAge: 35,
    monthlyIncome: 0,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setIsInitialLoadComplete(false);
        return;
      }
      try {
        // Demo mode: use demo data
        if (isDemoMode && demoData?.savingsTracker) {
          console.log("Loading demo savings data");
          setUploads(demoData.savingsTracker.uploads || []);
          setSelectedAccounts(demoData.savingsTracker.selectedAccounts || []);
          setIsInitialLoadComplete(true);
          return;
        }

        // Live mode: load from Firestore
        console.log("Loading data from Firebase for user:", user.uid);
        const docRef = doc(db, "savingsTracker", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log("Fetched data from Firebase:", data);
          setUploads(data.uploads || []);
          setSelectedAccounts(data.selectedAccounts || []);
        } else {
          console.log("No existing data found in Firebase");
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

        // Mark initial load as complete
        setIsInitialLoadComplete(true);
        console.log("Initial data load complete");
      } catch (error) {
        console.error("Error fetching user data:", error);
        setIsInitialLoadComplete(true); // Still mark as complete even on error
      }
    };
    fetchData();
  }, [user, isDemoMode, demoData]);

  // Save function with undefined removal
  const saveToFirebase = async () => {
    if (!user) {
      console.log("Save skipped: No user authenticated");
      return;
    }

    // Don't save to Firestore in demo mode
    if (isDemoMode) {
      console.log("Save skipped: Demo mode active");
      return;
    }

    if (!isInitialLoadComplete) {
      console.log("Save skipped: Initial data load not complete yet");
      return;
    }

    try {
      console.log("Saving to Firebase...", {
        uploadsCount: uploads.length,
        selectedAccountsCount: selectedAccounts.length,
      });

      // Remove all undefined values before saving
      const cleanedUploads = removeUndefined(uploads);
      const cleanedSelectedAccounts = removeUndefined(selectedAccounts);

      const docRef = doc(db, "savingsTracker", user.uid);
      await setDoc(docRef, {
        uploads: cleanedUploads,
        selectedAccounts: cleanedSelectedAccounts,
      });

      console.log("Successfully saved to Firebase");
    } catch (error) {
      console.error("Error saving:", error);
      alert(`Save failed: ${error.message}`);
    }
  };

  const saveUserPreferences = async () => {
    if (!user) return;

    // Don't save to Firestore in demo mode
    if (isDemoMode) return;

    try {
      const preferencesRef = doc(db, "userPreferences", user.uid);
      await setDoc(preferencesRef, userPreferences);
    } catch (error) {
      console.error("Error saving preferences:", error);
    }
  };

  useEffect(() => {
    if (user && isInitialLoadComplete) {
      saveToFirebase();
    }
  }, [uploads, selectedAccounts, user, isInitialLoadComplete]);

  useEffect(() => {
    if (user) {
      saveUserPreferences();
    }
  }, [userPreferences, user]);

  const toggleAIAdvisory = () => {
    setUserPreferences((prev) => ({
      ...prev,
      aiAdvisoryExpanded: !prev.aiAdvisoryExpanded,
    }));
  };

  const handleFileParsed = (parsedData, uploadedFileName, detectionResults) => {
    console.log("File parsed:", {
      rows: parsedData.length,
      fileName: uploadedFileName,
      detectionResults,
    });

    // Close upload modal and open column mapper
    setShowUploadModal(false);
    setRawData(parsedData);
    setFileName(uploadedFileName);
    setInitialMapping(detectionResults.initialMapping);
    setDetectedBank(detectionResults.detectedBank || "");
    setConfidenceScores(detectionResults.confidenceScores || null);
    setAiMetadata(detectionResults.aiMetadata || null);
    setShowColumnMapper(true);
  };


  const handleConfirmMapping = (
    updatedMapping,
    bank,
    accountName,
    accountType
  ) => {
    try {
      let processedData = rawData;

      if (accountTypeTransformers[accountType]) {
        processedData = accountTypeTransformers[accountType](
          rawData,
          updatedMapping
        );
      }

      const qualityScore = calculateDataQualityScore(
        processedData,
        updatedMapping,
        updatedMapping.dateFormat
      );

      // Check if an account with this exact name already exists
      const existingUploadIndex = uploads.findIndex(
        (u) => u.accountName === accountName
      );

      if (existingUploadIndex !== -1) {
        // Account exists - merge transactions
        console.log(`Merging transactions for existing account: ${accountName}`);

        const existingUpload = uploads[existingUploadIndex];
        const existingTransactions = existingUpload.rawData;
        const newTransactions = processedData;

        // Create unique transaction IDs for deduplication
        const createTransactionId = (row, mapping) => {
          const date = row[mapping.date] || "";
          const amount = row[mapping.amount] || row[mapping.balance] || "";
          const description = row[mapping.description] || "";
          return `${date}_${amount}_${description}`.toLowerCase().trim();
        };

        // Build Set of existing transaction IDs
        const existingIds = new Set(
          existingTransactions.map((row) =>
            createTransactionId(row, existingUpload.mapping)
          )
        );

        // Filter out duplicate transactions from new data
        const uniqueNewTransactions = newTransactions.filter((row) => {
          const txnId = createTransactionId(row, updatedMapping);
          return !existingIds.has(txnId);
        });

        console.log(`Found ${uniqueNewTransactions.length} new transactions out of ${newTransactions.length} total`);

        if (uniqueNewTransactions.length === 0) {
          alert(`No new transactions found. All ${newTransactions.length} transactions already exist in ${accountName}.`);
          setShowColumnMapper(false);
          setRawData([]);
          setInitialMapping(null);
          setFileName("");
          setDetectedBank("");
          return;
        }

        // Merge transactions (new transactions added to existing)
        const mergedTransactions = [...existingTransactions, ...uniqueNewTransactions];

        // Update the existing upload with merged data
        const updatedUpload = {
          ...existingUpload,
          rawData: mergedTransactions,
          // Keep original metadata but update last modified info
          lastUpdated: new Date().toISOString(),
          lastFileName: fileName,
        };

        // Replace the existing upload in the array
        setUploads((prev) => {
          const updated = [...prev];
          updated[existingUploadIndex] = updatedUpload;
          return updated;
        });

        alert(`Successfully added ${uniqueNewTransactions.length} new transaction${uniqueNewTransactions.length !== 1 ? 's' : ''} to ${accountName}`);

        setShowColumnMapper(false);
        setRawData([]);
        setInitialMapping(null);
        setFileName("");
        setDetectedBank("");
      } else {
        // New account - create new upload
        const upload = {
          rawData: processedData,
          mapping: updatedMapping,
          bank,
          accountName,
          accountType,
          confirmed: true,
          dateFormat: updatedMapping.dateFormat,
          uploadDate: new Date().toISOString(),
          fileName: fileName,
          dataQualityScore: qualityScore.score,
        };

        // Update both states at the same level (not nested) to prevent duplicate saves
        setUploads((prev) => [...prev, upload]);
        setSelectedAccounts((prev) => [...prev, accountName]);

        setShowColumnMapper(false);
        setRawData([]);
        setInitialMapping(null);
        setFileName("");
        setDetectedBank("");
      }
    } catch (error) {
      console.error("Error confirming mapping:", error);
      alert("Error processing the upload. Please try again.");
    }
  };

  const handleCancelUpload = () => {
    setShowColumnMapper(false);
    setShowUploadModal(false);
    setRawData([]);
    setInitialMapping(null);
    setFileName("");
    setDetectedBank("");
  };

  const handleAccountToggle = (accountName) => {
    setSelectedAccounts((prev) => {
      const isCurrentlySelected = prev.includes(accountName);

      // Prevent deselecting the last account
      if (isCurrentlySelected && prev.length === 1) {
        console.log("Cannot deselect the last savings account");
        return prev;
      }

      return isCurrentlySelected
        ? prev.filter((a) => a !== accountName)
        : [...prev, accountName];
    });
  };

  const handleRemoveAccount = (accountName) => {
    if (
      window.confirm(
        `Are you sure you want to remove ${accountName}? This action cannot be undone.`
      )
    ) {
      const updated = uploads.filter((u) => u.accountName !== accountName);
      setUploads(updated);
      setSelectedAccounts((prev) => prev.filter((a) => a !== accountName));
    }
  };

  const handleAddSavingData = () => {
    setShowUploadModal(true);
  };

  const hasISAorLISA = uploads.some(
    (upload) => upload.accountType === "ISA" || upload.accountType === "LISA"
  );

  const hasPremiumBonds = uploads.some(
    (upload) => upload.accountType === "Premium Bonds"
  );

  return (
    <div className="savings-tracker-container">
      {/* Demo Mode Banner */}
      {isDemoMode && <DemoModeBanner />}

      {/* Savings Metric Cards - Always displayed at the top when savings exist */}
      {uploads.length > 0 && selectedAccounts.length > 0 && (
        <SavingsMetricCards
          uploads={uploads}
          selectedAccounts={selectedAccounts}
        />
      )}

      {/* Savings Accounts Table V2 - Positioned after metrics cards */}
      {uploads.length > 0 && (
        <div className="full-width-card">
          <SavingsAccountsTable
            uploads={uploads}
            selectedAccounts={selectedAccounts}
            onToggle={handleAccountToggle}
            onRemove={handleRemoveAccount}
            onAddData={handleAddSavingData}
          />
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <UnifiedSavingsUploader
          onFileParsed={handleFileParsed}
          onClose={() => setShowUploadModal(false)}
        />
      )}

      {showColumnMapper && initialMapping && (
        <SavingsColumnMapperNew
          data={rawData}
          initialMapping={initialMapping}
          onConfirm={handleConfirmMapping}
          onCancel={handleCancelUpload}
          fileName={fileName}
          totalRows={rawData.length}
          detectedBank={detectedBank}
          confidenceScores={confidenceScores}
          aiMetadata={aiMetadata}
        />
      )}

      {uploads.length > 0 && (
        <>
          {/* AI Savings Advisory - positioned after file uploader, before charts */}
          {userPreferences.showAIAdvisory && (
            <div className="full-width-card">
              <AISavingsAdvisory
                uploads={uploads}
                selectedAccounts={selectedAccounts}
                userAge={userPreferences.userAge}
                monthlyIncome={userPreferences.monthlyIncome}
                isExpanded={userPreferences.aiAdvisoryExpanded}
                onToggleExpanded={toggleAIAdvisory}
              />
            </div>
          )}

          <div className="savings-overview-grid">
            <div className="full-width-card pie-chart-container">
              <SavingsPie
                uploads={uploads}
                selectedAccounts={selectedAccounts}
              />
            </div>
            <div className="full-width-card growth-chart-container">
              <SavingsChartV2
                uploads={uploads}
                selectedAccounts={selectedAccounts}
              />
            </div>
          </div>

          {hasISAorLISA && (
            <div className="full-width-card">
              <ISAUtilizationChart uploads={uploads} />
            </div>
          )}

          {hasPremiumBonds && (
            <div className="full-width-card">
              <PremiumBondsAnalysis
                uploads={uploads.filter(
                  (u) => u.accountType === "Premium Bonds"
                )}
              />
            </div>
          )}

          <div className="full-width-card">
            <MonthlyBalanceChangeChart
              uploads={uploads}
              selectedAccounts={selectedAccounts}
            />
          </div>
        </>
      )}

      {uploads.length === 0 && !showColumnMapper && (
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <h3>No accounts added yet</h3>
          <p>
            Upload your first bank statement to start tracking your savings
            journey
          </p>
        </div>
      )}
    </div>
  );
}
