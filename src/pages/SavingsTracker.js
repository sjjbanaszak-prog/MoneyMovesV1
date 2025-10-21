import React, { useState, useEffect } from "react";
import FileUploader from "../modules/FileUploader";
import ColumnMapper from "../modules/ColumnMapper";
import SavingsChart from "../modules/SavingsChart";
import AccountsTable from "../modules/AccountsTable";
import MonthlyBalanceChangeChart from "../modules/MonthlyBalanceChangeChart";
import ISALISAUtilization from "../modules/ISALISAUtilization";
import PremiumBondsAnalysis from "../modules/PremiumBondsAnalysis";
import AISavingsAdvisory from "../modules/AISavingsAdvisory";
import {
  autoDetectColumns,
  detectAccountType,
  detectBank,
} from "../modules/utils/columnDetection";
import { detectDateFormat } from "../modules/utils/detectDateFormat";
import { accountTypeTransformers } from "../modules/utils/premiumBondsParser";
import { calculateDataQualityScore } from "../modules/utils/dataValidation";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import "./SavingsTrackerStyles.css";

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
  const [uploads, setUploads] = useState([]);
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [user, setUser] = useState(null);
  const [showColumnMapper, setShowColumnMapper] = useState(false);
  const [rawData, setRawData] = useState([]);
  const [initialMapping, setInitialMapping] = useState(null);
  const [fileName, setFileName] = useState("");
  const [processingFile, setProcessingFile] = useState(false);
  const [autoDetectionResults, setAutoDetectionResults] = useState(null);

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
      if (!user) return;
      try {
        const docRef = doc(db, "savingsTracker", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log("Fetched data from Firebase");
          setUploads(data.uploads || []);
          setSelectedAccounts(data.selectedAccounts || []);
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
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };
    fetchData();
  }, [user]);

  // Save function with undefined removal
  const saveToFirebase = async () => {
    if (!user) return;

    try {
      console.log("Saving to Firebase...");

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

    try {
      const preferencesRef = doc(db, "userPreferences", user.uid);
      await setDoc(preferencesRef, userPreferences);
    } catch (error) {
      console.error("Error saving preferences:", error);
    }
  };

  useEffect(() => {
    if (user) {
      saveToFirebase();
    }
  }, [uploads, selectedAccounts, user]);

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

  const handleFileParsed = async (parsedData, uploadedFileName) => {
    setProcessingFile(true);

    try {
      const suggestedMapping = autoDetectColumns(parsedData);
      const detectedBank = detectBank(
        parsedData,
        suggestedMapping,
        uploadedFileName
      );
      const detectedAccountType = detectAccountType(
        parsedData,
        suggestedMapping
      );
      const detectedDateFormat = suggestedMapping.date
        ? detectDateFormat(
            parsedData
              .slice(0, 10)
              .map((row) => row[suggestedMapping.date])
              .filter(Boolean)
          )
        : null;

      const autoDetection = {
        mapping: suggestedMapping,
        bank: detectedBank,
        accountType: detectedAccountType,
        dateFormat: detectedDateFormat,
        confidence: calculateConfidence(
          suggestedMapping,
          detectedBank,
          detectedAccountType
        ),
      };

      setRawData(parsedData);
      setInitialMapping({
        ...suggestedMapping,
        dateFormat: detectedDateFormat,
      });
      setFileName(uploadedFileName);
      setAutoDetectionResults(autoDetection);
      setShowColumnMapper(true);
    } catch (error) {
      console.error("Error processing file:", error);
      alert(
        "Error processing file. Please check the file format and try again."
      );
    } finally {
      setProcessingFile(false);
    }
  };

  const calculateConfidence = (mapping, bank, accountType) => {
    let score = 0;
    if (mapping.date) score += 25;
    if (mapping.balance || mapping.amount) score += 25;
    if (bank) score += 25;
    if (accountType) score += 25;
    return score;
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
        autoDetectionUsed: autoDetectionResults?.confidence > 75,
        dataQualityScore: qualityScore.score,
      };

      setUploads((prev) => {
        const existingNames = prev.map((u) => u.accountName);
        let finalAccountName = accountName;
        let counter = 1;

        while (existingNames.includes(finalAccountName)) {
          finalAccountName = `${accountName} (${counter})`;
          counter++;
        }

        upload.accountName = finalAccountName;
        const updated = [...prev, upload];

        setSelectedAccounts((prevSelected) => [
          ...prevSelected,
          finalAccountName,
        ]);

        return updated;
      });

      setShowColumnMapper(false);
      setRawData([]);
      setInitialMapping(null);
      setFileName("");
      setAutoDetectionResults(null);
    } catch (error) {
      console.error("Error confirming mapping:", error);
      alert("Error processing the upload. Please try again.");
    }
  };

  const handleCancelUpload = () => {
    setShowColumnMapper(false);
    setRawData([]);
    setInitialMapping(null);
    setFileName("");
    setAutoDetectionResults(null);
  };

  const handleAccountToggle = (accountName) => {
    setSelectedAccounts((prev) =>
      prev.includes(accountName)
        ? prev.filter((a) => a !== accountName)
        : [...prev, accountName]
    );
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

  const hasISAorLISA = uploads.some(
    (upload) => upload.accountType === "ISA" || upload.accountType === "LISA"
  );

  const hasPremiumBonds = uploads.some(
    (upload) => upload.accountType === "Premium Bonds"
  );

  return (
    <div className="savings-tracker-container">
      <div className="dashboard-header">
        <h1 className="tracker-title">Savings Tracker</h1>
      </div>

      <div className="full-width-card">
        <FileUploader onDataParsed={handleFileParsed} />
        {processingFile && (
          <div className="processing-indicator">
            <div className="spinner"></div>
            <span>Processing file and detecting account details...</span>
          </div>
        )}
      </div>

      {showColumnMapper && initialMapping && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && handleCancelUpload()}
        >
          <div className="mapping-modal-overlay">
            <ColumnMapper
              data={rawData}
              initialMapping={initialMapping}
              onConfirm={handleConfirmMapping}
              onCancel={handleCancelUpload}
              fileName={fileName}
              totalRows={rawData.length}
            />
          </div>
        </div>
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

          <div className="full-width-card">
            <SavingsChart
              uploads={uploads}
              selectedAccounts={selectedAccounts}
            />
          </div>

          <div className="full-width-card">
            <AccountsTable
              uploads={uploads}
              selectedAccounts={selectedAccounts}
              onToggle={handleAccountToggle}
              onRemove={handleRemoveAccount}
            />
          </div>

          {hasISAorLISA && (
            <div className="full-width-card">
              <ISALISAUtilization uploads={uploads} />
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
