import React, { useState, useCallback, useEffect } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { parsePensionDocument, previewExtractedData } from "./utils/pensionPdfParser";
import { analyzePatterns, detectProvider } from "./utils/PatternDetector";
import { autoMapHeaders } from "./utils/AutoMapper";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import "./UnifiedPensionUploaderStyles.css";

dayjs.extend(customParseFormat);

/**
 * UnifiedPensionUploader - Single upload modal for all pension file types
 *
 * Handles:
 * - CSV/Excel files (parsed directly)
 * - PDF/Image files (parsed directly)
 * - Auto-detects file type and processes immediately
 * - Routes directly to mapping review modal
 */

export default function UnifiedPensionUploader({ onFileParsed, onClose }) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState("");

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

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
        handleFileSelection(files[0]);
      }
    },
    []
  );

  const handleFileInputChange = useCallback((e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelection(files[0]);
    }
  }, []);

  const handleFileSelection = async (file) => {
    if (!file) return;

    setFileName(file.name);
    setFileSize(formatFileSize(file.size));

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("File size exceeds 10MB limit. Please upload a smaller file.");
      return;
    }

    // Validate file type
    const fileType = file.type;
    const fileNameLower = file.name.toLowerCase();

    // Check if it's PDF or image
    const isPdfOrImage =
      fileType === "application/pdf" ||
      fileType.startsWith("image/") ||
      fileNameLower.endsWith(".pdf") ||
      fileNameLower.endsWith(".jpg") ||
      fileNameLower.endsWith(".jpeg") ||
      fileNameLower.endsWith(".png") ||
      fileNameLower.endsWith(".heic");

    // Check if it's CSV or Excel
    const isCsvOrExcel =
      fileType === "text/csv" ||
      fileType === "application/vnd.ms-excel" ||
      fileType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      fileNameLower.endsWith(".csv") ||
      fileNameLower.endsWith(".xls") ||
      fileNameLower.endsWith(".xlsx");

    if (!isPdfOrImage && !isCsvOrExcel) {
      setError(
        "Unsupported file type. Please upload CSV, Excel, PDF, or image files (JPG, PNG)."
      );
      return;
    }

    // Clear any previous errors
    setError(null);
    setUploading(true);
    setProgress({ stage: "loading", message: "Starting...", percent: 0 });

    try {
      if (isPdfOrImage) {
        // Process PDF/Image file
        await handlePdfFile(file);
      } else {
        // Process CSV/Excel file
        await handleCsvFile(file);
      }
    } catch (err) {
      console.error("Error processing file:", err);
      setError(err.message || "Failed to process file. Please try again.");
      setUploading(false);
      setProgress(null);
    }
  };

  const handlePdfFile = async (file) => {
    console.log("Starting PDF/image parsing:", file.name);

    // Parse the document with progress tracking
    const parsedData = await parsePensionDocument(file, handleProgressUpdate);

    console.log("Parsing complete:", parsedData);

    // Check if any data was extracted
    if (!parsedData.rows || parsedData.rows.length === 0) {
      throw new Error(
        "No payment data found in the document. Please check that your file contains a pension statement with payment dates and amounts."
      );
    }

    // Check data quality
    if (parsedData.quality < 30) {
      throw new Error(
        `Data quality is too low (${parsedData.quality}%). The document may be unclear or in an unsupported format. Please try a clearer scan or different file.`
      );
    }

    // Convert dates from YYYY-MM-DD back to original format for display
    const originalFormat = parsedData.originalDateFormat || "DD/MM/YYYY";

    const transformedData = parsedData.rows.map((row) => {
      const paidDate = row.paidDate || row.date;
      const dueDate = row.dueDate;

      const convertedPaidDate = paidDate
        ? dayjs(paidDate, "YYYY-MM-DD", true).format(originalFormat)
        : "";
      const convertedDueDate = dueDate
        ? dayjs(dueDate, "YYYY-MM-DD", true).format(originalFormat)
        : "";

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

    const headers = [
      "description",
      "dueDate",
      "paidDate",
      "memberAmount",
      "taxRelief",
      "employerAmount",
      "totalAmount",
      "provider",
    ];

    setUploading(false);
    setProgress(null);

    // Pass data to parent
    if (onFileParsed) {
      onFileParsed({
        rawData: transformedData,
        headers,
        initialMapping: {
          date: "paidDate",
          amount: "totalAmount",
          provider: "provider",
          description: "description",
          dateFormat: originalFormat,
        },
        fileName: file.name,
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
        },
      });
    }
  };

  const handleCsvFile = async (file) => {
    console.log("Starting CSV/Excel parsing:", file.name);

    setProgress({ stage: "parsing", message: "Parsing file...", percent: 30 });

    const extension = file.name.split(".").pop().toLowerCase();

    if (extension === "csv") {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        complete: (results) => {
          processCsvExcelData(results.data, file.name);
        },
        error: (error) => {
          console.error("CSV parse error:", error);
          setError(`Error parsing CSV: ${error.message}`);
          setUploading(false);
          setProgress(null);
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
          processCsvExcelData(parsedData, file.name);
        } catch (error) {
          console.error("Excel parse error:", error);
          setError(`Error parsing Excel file: ${error.message}`);
          setUploading(false);
          setProgress(null);
        }
      };
      reader.onerror = () => {
        setError("Error reading Excel file.");
        setUploading(false);
        setProgress(null);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const processCsvExcelData = (data, fileName) => {
    if (!Array.isArray(data) || data.length === 0) {
      setError("File appears empty or improperly formatted.");
      setUploading(false);
      setProgress(null);
      return;
    }

    try {
      setProgress({ stage: "analyzing", message: "Analyzing data...", percent: 70 });

      // Get headers from first row
      const headers = Object.keys(data[0]);
      const sample = data.slice(0, 20);

      // Detect provider from filename and headers
      let providerInfo = detectProvider(fileName, headers);

      // Auto-map headers for pensions context
      const autoMapping = autoMapHeaders(headers, "pensions", sample, null);

      // If provider column is mapped, extract provider name from data (same as PDF logic)
      if (autoMapping.mapping.provider) {
        const providerColumn = autoMapping.mapping.provider;
        const providerValues = data
          .map((row) => row[providerColumn])
          .filter(Boolean)
          .map((val) => String(val).trim());

        // Get the most common provider name
        if (providerValues.length > 0) {
          const providerCounts = {};
          providerValues.forEach((provider) => {
            providerCounts[provider] = (providerCounts[provider] || 0) + 1;
          });

          // Find the provider with the highest count
          let mostCommonProvider = providerValues[0];
          let maxCount = 0;
          for (const [provider, count] of Object.entries(providerCounts)) {
            if (count > maxCount) {
              maxCount = count;
              mostCommonProvider = provider;
            }
          }

          // Update providerInfo with data from column
          providerInfo = {
            provider: mostCommonProvider,
            confidence: Math.min(100, (maxCount / providerValues.length) * 100),
            requiresConfirmation: false,
            source: "data-column",
          };
        }
      }

      // Detect date format and frequency if date field is mapped
      let patternInfo = null;
      let originalDateFormat = "DD/MM/YYYY"; // Default for UK

      if (autoMapping.mapping.date) {
        const dateColumn = autoMapping.mapping.date;
        const dateValues = data.map((row) => row[dateColumn]).filter(Boolean);
        patternInfo = analyzePatterns(dateValues);

        // Use the detected date format (same as PDF logic)
        if (patternInfo && patternInfo.dateFormat) {
          originalDateFormat = patternInfo.dateFormat;
        }
      }

      setUploading(false);
      setProgress(null);

      // Pass data to parent with detection results
      if (onFileParsed) {
        onFileParsed({
          rawData: data,
          headers,
          initialMapping: {
            ...autoMapping.mapping,
            dateFormat: originalDateFormat, // Add dateFormat to mapping (same as PDF)
          },
          fileName,
          detectedProvider: {
            name: providerInfo.provider || providerInfo.name || "Unknown Provider",
            confidence: providerInfo.confidence,
            requiresConfirmation: providerInfo.requiresConfirmation || false,
            source: providerInfo.source || "filename",
          },
          suggestions: autoMapping.suggestions,
          confidenceScores: autoMapping.confidenceScores,
          aiMetadata: {
            mappingConfidence: autoMapping.overallConfidence,
            dateFormatConfidence: patternInfo?.formatConfidence || 0,
            dateFormat: originalDateFormat, // Use originalDateFormat (same as PDF)
            frequency: patternInfo?.frequency || "unknown",
            frequencyLabel: patternInfo?.frequencyLabel || "Unknown",
            source: "csv-parser",
          },
        });
      }
    } catch (err) {
      console.error("Error processing CSV/Excel data:", err);
      setError(err.message || "Failed to process file. Please try again.");
      setUploading(false);
      setProgress(null);
    }
  };

  return (
    <div
      className="unified-upload-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose && onClose()}
    >
      <div className="unified-upload-modal">
        {/* Close Button */}
        {onClose && (
          <button onClick={onClose} className="unified-upload-close">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        <div className="unified-upload-content">
          {/* Header */}
          <div className="unified-upload-header">
            <h2 className="unified-upload-title">Upload Pension Data</h2>
            <p className="unified-upload-subtitle">
              Upload a pension statement to begin analysis.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="unified-upload-error">
              <span>⚠️</span>
              <p>{error}</p>
            </div>
          )}

          {/* Drop Zone */}
          <div
            className={`unified-upload-dropzone ${dragActive ? "dragging" : ""} ${
              uploading ? "uploading" : ""
            }`}
            onClick={() =>
              !uploading && document.getElementById("unified-file-input").click()
            }
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              id="unified-file-input"
              type="file"
              accept=".csv,.xls,.xlsx,.pdf,image/*"
              style={{ display: "none" }}
              onChange={handleFileInputChange}
              disabled={uploading}
            />

            {uploading ? (
              // Uploading State
              <div className="unified-upload-processing">
                <div className="unified-upload-spinner"></div>
                <p className="unified-upload-processing-text">
                  {progress?.message || "Processing..."}
                </p>
                {fileName && (
                  <p className="unified-upload-filename">
                    {fileName} ({fileSize})
                  </p>
                )}
              </div>
            ) : (
              // Default State
              <>
                {/* Upload Icon */}
                <div className="unified-upload-icon">
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 15V3M12 3L8 7M12 3L16 7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M2 17L2 19C2 20.1046 2.89543 21 4 21L20 21C21.1046 21 22 20.1046 22 19V17"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                {/* Drop Zone Text */}
                <p className="unified-upload-dropzone-text">
                  Drag & drop file here, or{" "}
                  <span className="unified-upload-browse">click</span> to upload
                </p>
              </>
            )}
          </div>

          {/* File Info */}
          <div className="unified-upload-info">
            <p className="unified-upload-formats">
              Supported formats: csv, xls, xlsx, pdf, jpg, png
            </p>
            <p className="unified-upload-filesize">Max filesize 10MB</p>
            <p className="unified-upload-auto">
              We'll automatically match fields and contribution data
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
