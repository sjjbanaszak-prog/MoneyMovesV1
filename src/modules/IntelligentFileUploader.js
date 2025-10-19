import React, { useState, useCallback } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { auth } from "../firebase";
import {
  analyzePatterns,
  detectProvider,
} from "./utils/PatternDetector";
import { autoMapHeaders } from "./utils/AutoMapper";
import { getContextSchema } from "./utils/ContextSchemas";
import {
  getTemplate,
  findBestMatchingTemplate,
} from "./utils/TemplateTrainer";
import "./IntelligentFileUploaderStyles.css";

/**
 * IntelligentFileUploader - Context-aware file upload modal
 *
 * Simple, single-screen uploader that:
 * - Handles CSV/Excel file upload
 * - Detects provider, date format, and suggests mappings
 * - Calls onFileParsed with results for parent to handle mapping review
 */

export default function IntelligentFileUploader({
  context = "pensions",
  onFileParsed,
  onClose,
}) {
  const currentUser = auth.currentUser;
  const schema = getContextSchema(context);

  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);

  const formatFileSize = useCallback((bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }, []);

  const processParsedData = useCallback(
    async (data, fileName) => {
      if (!Array.isArray(data) || data.length === 0) {
        setError("File appears empty or improperly formatted.");
        setUploading(false);
        return;
      }

      try {
        // Get headers from first row
        const headers = Object.keys(data[0]);
        const sample = data.slice(0, 20);

        // Detect provider from filename and headers
        const providerInfo = detectProvider(fileName, headers);

        // Try to load existing template
        let template = null;
        if (currentUser && providerInfo.provider !== "Unknown") {
          template = await getTemplate(
            currentUser.uid,
            providerInfo.provider,
            context
          );
        }

        // If no provider match, try header-based template matching
        if (!template && currentUser) {
          template = await findBestMatchingTemplate(
            currentUser.uid,
            context,
            headers
          );
        }

        // Auto-map headers
        const autoMapping = autoMapHeaders(headers, context, sample, template);

        // Detect date format and frequency if date field is mapped
        let patternInfo = null;
        if (autoMapping.mapping.date) {
          const dateColumn = autoMapping.mapping.date;
          const dateValues = data.map((row) => row[dateColumn]).filter(Boolean);
          patternInfo = analyzePatterns(dateValues);
        }

        setUploading(false);

        // Pass data to parent with detection results
        if (onFileParsed) {
          onFileParsed({
            rawData: data,
            headers,
            initialMapping: { ...autoMapping.mapping, dateFormat: patternInfo?.dateFormat },
            fileName,
            detectedProvider: {
              name: providerInfo.provider,
              confidence: providerInfo.confidence,
              requiresConfirmation: providerInfo.confidence < 80,
            },
            suggestions: autoMapping.suggestions,
            confidenceScores: autoMapping.confidenceScores,
            aiMetadata: {
              mappingConfidence: autoMapping.overallConfidence,
              dateFormatConfidence: patternInfo?.formatConfidence || 0,
              frequency: patternInfo?.frequency,
              frequencyLabel: patternInfo?.frequencyLabel,
              source: template ? "learned" : "heuristic",
              learnedFromPreviousUploads: Boolean(template),
            },
          });
        }
      } catch (err) {
        console.error("Error processing file:", err);
        setError(err.message || "Failed to process file");
        setUploading(false);
      }
    },
    [context, currentUser, onFileParsed]
  );

  const handleFileUpload = useCallback(
    (file) => {
      if (!file) return;

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("File size exceeds 5MB limit. Please upload a smaller file.");
        return;
      }

      setFileName(file.name);
      setFileSize(formatFileSize(file.size));
      setUploading(true);
      setError(null);

      const extension = file.name.split(".").pop().toLowerCase();

      if (extension === "csv") {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: false,
          complete: (results) => {
            processParsedData(results.data, file.name);
          },
          error: (error) => {
            console.error("CSV parse error:", error);
            setError(`Error parsing CSV: ${error.message}`);
            setUploading(false);
          },
        });
      } else if (extension === "xls" || extension === "xlsx") {
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const data = new Uint8Array(evt.target.result);
            const workbook = XLSX.read(data, { type: "array" });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const parsedData = XLSX.utils.sheet_to_json(sheet, {
              defval: "",
              raw: false,
            });
            processParsedData(parsedData, file.name);
          } catch (error) {
            console.error("Excel parse error:", error);
            setError(`Error parsing Excel file: ${error.message}`);
            setUploading(false);
          }
        };
        reader.onerror = () => {
          setError("Error reading Excel file.");
          setUploading(false);
        };
        reader.readAsArrayBuffer(file);
      } else {
        setError("Unsupported file type. Please upload a CSV or Excel file.");
        setUploading(false);
      }
    },
    [formatFileSize, processParsedData]
  );

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragActive(false);
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileUpload(files[0]);
      }
    },
    [handleFileUpload]
  );

  const handleFileInputChange = useCallback(
    (e) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFileUpload(files[0]);
      }
    },
    [handleFileUpload]
  );

  return (
    <div
      className="upload-modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose && onClose()}
    >
      <div className="upload-modal-container">
        <div className="upload-modal-content">
          {/* Header */}
          <div className="upload-modal-header">
            <div>
              <h2 className="upload-modal-title">Upload {schema.label} Data</h2>
              <p className="upload-modal-subtitle">
                {schema.description} - AI will detect columns automatically
              </p>
            </div>
            {onClose && (
              <button onClick={onClose} className="upload-modal-close">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="upload-error-banner">
              <span>⚠️</span>
              <p>{error}</p>
            </div>
          )}

          {/* Drop Zone */}
          <div
            className={`upload-dropzone ${dragActive ? "dragging" : ""} ${uploading ? "uploading" : ""}`}
            onClick={() => !uploading && document.getElementById("intelligent-file-input").click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              id="intelligent-file-input"
              type="file"
              accept=".csv,.xls,.xlsx"
              style={{ display: "none" }}
              onChange={handleFileInputChange}
            />

            {uploading ? (
              <div className="upload-processing">
                <div className="upload-spinner"></div>
                <div>
                  <p className="upload-processing-title">Processing file...</p>
                  <p className="upload-processing-subtitle">
                    AI is analyzing the structure
                  </p>
                </div>
                {fileName && (
                  <p className="upload-processing-filename">
                    {fileName} ({fileSize})
                  </p>
                )}
              </div>
            ) : (
              <div className="upload-dropzone-content">
                <div className="upload-dropzone-icon">📁</div>
                <div>
                  <p className="upload-dropzone-title">
                    Drag and drop your file here
                  </p>
                  <p className="upload-dropzone-subtitle">or click to browse</p>
                </div>
                <div className="upload-dropzone-formats">
                  Supports CSV, XLS, XLSX files (max 5MB)
                </div>
              </div>
            )}
          </div>

          {/* Features Info */}
          <div className="upload-features-grid">
            <div className="upload-feature-card">
              <div className="upload-feature-icon">🔍</div>
              <p className="upload-feature-title">Auto-Detection</p>
              <p className="upload-feature-description">
                Automatically identifies columns and provider
              </p>
            </div>
            <div className="upload-feature-card">
              <div className="upload-feature-icon">🧠</div>
              <p className="upload-feature-title">Smart Learning</p>
              <p className="upload-feature-description">
                Improves accuracy with each upload
              </p>
            </div>
            <div className="upload-feature-card">
              <div className="upload-feature-icon">✅</div>
              <p className="upload-feature-title">Easy Review</p>
              <p className="upload-feature-description">
                Confirm or adjust detected mappings
              </p>
            </div>
          </div>

          {/* Cancel Button */}
          {onClose && !uploading && (
            <div className="upload-modal-actions">
              <button onClick={onClose} className="upload-cancel-button">
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
