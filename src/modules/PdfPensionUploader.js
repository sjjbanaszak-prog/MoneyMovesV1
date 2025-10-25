import React, { useState, useCallback } from "react";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { parsePensionDocument, previewExtractedData } from "./utils/pensionPdfParser";
import "./IntelligentFileUploaderStyles.css";

dayjs.extend(customParseFormat);

/**
 * PdfPensionUploader - PDF/Image upload modal for pension statements
 *
 * Handles:
 * - Digital PDFs (text extraction)
 * - Scanned PDFs (OCR)
 * - Images/Photos (OCR)
 *
 * Matches IntelligentFileUploader design and workflow
 */

export default function PdfPensionUploader({ onFileParsed, onClose }) {
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(null);

  const formatFileSize = useCallback((bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }, []);

  const handleProgressUpdate = useCallback((progressInfo) => {
    setProgress(progressInfo);
  }, []);

  const handleFileUpload = useCallback(
    async (file) => {
      if (!file) return;

      // Validate file size (max 10MB for PDFs/images)
      if (file.size > 10 * 1024 * 1024) {
        setError("File size exceeds 10MB limit. Please upload a smaller file.");
        return;
      }

      // Validate file type
      const validTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/heic"];
      const validExtensions = /\.(pdf|jpg|jpeg|png|heic)$/i;

      if (!validTypes.includes(file.type) && !validExtensions.test(file.name)) {
        setError("Unsupported file type. Please upload a PDF or image file (JPG, PNG, HEIC).");
        return;
      }

      setFileName(file.name);
      setFileSize(formatFileSize(file.size));
      setUploading(true);
      setError(null);
      setProgress({ stage: "loading", message: "Starting...", percent: 0 });

      try {
        console.log("Starting PDF/image parsing:", file.name);

        // Parse the document with progress tracking
        const parsedData = await parsePensionDocument(file, handleProgressUpdate);

        console.log("Parsing complete:", parsedData);

        // Check if any data was extracted
        if (!parsedData.rows || parsedData.rows.length === 0) {
          setError(
            "No payment data found in the document. Please check that your file contains a pension statement with payment dates and amounts."
          );
          setUploading(false);
          setProgress(null);
          return;
        }

        // Check data quality
        if (parsedData.quality < 30) {
          setError(
            `Data quality is too low (${parsedData.quality}%). The document may be unclear or in an unsupported format. Please try a clearer scan or different file.`
          );
          setUploading(false);
          setProgress(null);
          return;
        }

        // Generate preview
        const preview = previewExtractedData(parsedData);

        setUploading(false);
        setProgress(null);

        // Transform to match expected format for MappingReviewModal
        // The parser returns dates normalized to YYYY-MM-DD, but we need to convert them back
        // to the original format for display to the user
        const originalFormat = parsedData.originalDateFormat || 'DD/MM/YYYY';
        console.log('📅 Original format detected:', originalFormat);
        console.log('📅 Sample row before conversion:', parsedData.rows[0]);

        const transformedData = parsedData.rows.map((row, index) => {
          // Convert dates from YYYY-MM-DD back to original format for user display
          const paidDate = row.paidDate || row.date;
          const dueDate = row.dueDate;

          const convertedPaidDate = paidDate ? dayjs(paidDate, 'YYYY-MM-DD', true).format(originalFormat) : "";
          const convertedDueDate = dueDate ? dayjs(dueDate, 'YYYY-MM-DD', true).format(originalFormat) : "";

          if (index === 0) {
            console.log('📅 Converting first row:');
            console.log('  - paidDate input:', paidDate);
            console.log('  - paidDate output:', convertedPaidDate);
            console.log('  - dueDate input:', dueDate);
            console.log('  - dueDate output:', convertedDueDate);
          }

          return {
            description: row.description,
            dueDate: convertedDueDate,
            paidDate: convertedPaidDate,
            memberAmount: row.memberAmount || "",
            taxRelief: row.taxRelief || "",
            employerAmount: row.employerAmount || "",
            totalAmount: row.totalAmount || row.amount,
            provider: row.provider,
          };
        });

        console.log('📅 Transformed data sample:', transformedData[0]);

        const headers = ["description", "dueDate", "paidDate", "memberAmount", "taxRelief", "employerAmount", "totalAmount", "provider"];

        // Pass data to parent with detection results
        if (onFileParsed) {
          onFileParsed({
            rawData: transformedData,
            headers,
            initialMapping: {
              date: "paidDate",
              amount: "totalAmount",
              provider: "provider",
              description: "description",
              dateFormat: originalFormat, // Show user the original format they uploaded
            },
            fileName,
            detectedProvider: {
              name: parsedData.rows[0]?.provider || "Unknown Provider",
              confidence: parsedData.quality,
              requiresConfirmation: parsedData.quality < 80,
            },
            suggestions: {
              date: { confidence: 1.0, source: "parser" },
              amount: { confidence: 1.0, source: "parser" },
              provider: { confidence: parsedData.quality / 100, source: "parser" },
              description: { confidence: 1.0, source: "parser" },
            },
            confidenceScores: {
              date: 1.0,
              amount: 1.0,
              provider: parsedData.quality / 100,
              description: 1.0,
            },
            aiMetadata: {
              mappingConfidence: parsedData.quality / 100,
              dateFormatConfidence: 1.0,
              frequency: "monthly",
              frequencyLabel: "Monthly",
              source: "pdf-parser",
              extractionMethod: parsedData.stats ? "enhanced" : "basic",
              dataQuality: parsedData.quality,
              stats: parsedData.stats,
              preview,
            },
          });
        }
      } catch (err) {
        console.error("Error parsing PDF/image:", err);
        setError(err.message || "Failed to process file. Please try again.");
        setUploading(false);
        setProgress(null);
      }
    },
    [formatFileSize, handleProgressUpdate, onFileParsed, fileName]
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

  // Determine progress message
  const getProgressMessage = () => {
    if (!progress) return null;

    const { stage, message, percent } = progress;

    let icon = "⏳";
    if (stage === "complete") icon = "✓";
    else if (stage.includes("ocr")) icon = "👁️";
    else if (stage === "parsing") icon = "🔍";

    return (
      <div className="upload-processing">
        <div className="upload-spinner"></div>
        <div>
          <p className="upload-processing-title">
            {icon} {message}
          </p>
          {stage.includes("ocr") && (
            <p className="upload-processing-subtitle" style={{ color: "#f59e0b" }}>
              OCR in progress - this may take 30-60 seconds
            </p>
          )}
          {percent > 0 && (
            <div style={{ width: "200px", margin: "12px auto 0" }}>
              <div
                style={{
                  width: "100%",
                  height: "4px",
                  background: "rgba(99, 102, 241, 0.2)",
                  borderRadius: "2px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${percent}%`,
                    height: "100%",
                    background: "#6366f1",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
              <p
                className="upload-processing-subtitle"
                style={{ marginTop: "4px", fontSize: "0.75rem" }}
              >
                {Math.round(percent)}%
              </p>
            </div>
          )}
        </div>
        {fileName && (
          <p className="upload-processing-filename">
            {fileName} ({fileSize})
          </p>
        )}
      </div>
    );
  };

  return (
    <div
      className="upload-modal-overlay"
      onClick={(e) => e.target === e.currentTarget && !uploading && onClose && onClose()}
    >
      <div className="upload-modal-container">
        <div className="upload-modal-content">
          {/* Header */}
          <div className="upload-modal-header">
            <div>
              <h2 className="upload-modal-title">Upload Pension Statement</h2>
              <p className="upload-modal-subtitle">
                PDF, scanned document, or photo - AI will extract payment data automatically
              </p>
            </div>
            {onClose && !uploading && (
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
            onClick={() => !uploading && document.getElementById("pdf-file-input").click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              id="pdf-file-input"
              type="file"
              accept=".pdf,image/*"
              style={{ display: "none" }}
              onChange={handleFileInputChange}
            />

            {uploading ? (
              getProgressMessage()
            ) : (
              <div className="upload-dropzone-content">
                <div className="upload-dropzone-icon">📄</div>
                <div>
                  <p className="upload-dropzone-title">
                    Drag and drop your pension statement here
                  </p>
                  <p className="upload-dropzone-subtitle">or click to browse</p>
                </div>
                <div className="upload-dropzone-formats">
                  Supports PDF, JPG, PNG, HEIC files (max 10MB)
                </div>
              </div>
            )}
          </div>

          {/* Features Info */}
          <div className="upload-features-grid">
            <div className="upload-feature-card">
              <div className="upload-feature-icon">📱</div>
              <p className="upload-feature-title">Digital & Scanned</p>
              <p className="upload-feature-description">
                Works with digital PDFs and scanned documents
              </p>
            </div>
            <div className="upload-feature-card">
              <div className="upload-feature-icon">📸</div>
              <p className="upload-feature-title">Photo Support</p>
              <p className="upload-feature-description">
                Take a photo of your statement with your phone
              </p>
            </div>
            <div className="upload-feature-card">
              <div className="upload-feature-icon">🤖</div>
              <p className="upload-feature-title">AI Extraction</p>
              <p className="upload-feature-description">
                Automatically finds dates, amounts, and providers
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
