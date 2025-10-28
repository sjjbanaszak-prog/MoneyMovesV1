import React, { useState, useCallback, useEffect } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { parseDebtDocument } from "./utils/debtPdfParser";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import "./UnifiedPensionUploaderStyles.css";

dayjs.extend(customParseFormat);

/**
 * UnifiedDebtUploader - Single upload modal for debt statement files
 *
 * Handles:
 * - CSV/Excel files (bank statements, credit card statements)
 * - PDF/Image files (scanned statements)
 * - Auto-detects file type and processes immediately
 * - Routes directly to mapping review modal
 * - Handles CR (Credit) notation for payments
 * - Extracts starting balance from statements
 */

export default function UnifiedDebtUploader({ onFileParsed, onClose }) {
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
    console.log("Starting PDF/image parsing for debt statement:", file.name);

    // Parse the document with progress tracking
    const parsedData = await parseDebtDocument(file, handleProgressUpdate);

    console.log("Parsing complete:", parsedData);

    // Check if any data was extracted
    if (!parsedData.rows || parsedData.rows.length === 0) {
      throw new Error(
        "No transaction data found in the document. Please check that your file contains a statement with dates and amounts."
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
      const transactionDate = row.transactionDate || row.date;

      const convertedDate = transactionDate
        ? dayjs(transactionDate, "YYYY-MM-DD", true).format(originalFormat)
        : "";

      return {
        date: convertedDate,
        description: row.description || "",
        amount: row.amount || "",
        balance: row.balance || "",
        creditor: row.creditor || "",
      };
    });

    const headers = [
      "date",
      "description",
      "amount",
      "balance",
      "creditor",
    ];

    setUploading(false);
    setProgress(null);

    // Pass data to parent
    if (onFileParsed) {
      onFileParsed({
        rawData: transformedData,
        headers,
        initialMapping: {
          date: "date",
          amount: "amount",
          balance: "balance",
          description: "description",
          debtType: "Credit Card",
          dateFormat: originalFormat,
        },
        fileName: file.name,
        detectedCreditor: {
          name: parsedData.rows[0]?.creditor || "Unknown Creditor",
          confidence: parsedData.quality,
          requiresConfirmation: parsedData.quality < 80,
        },
        startingBalance: parsedData.startingBalance || null,
        interestRate: parsedData.interestRate || null,
        suggestions: {
          date: { confidence: 1.0, source: "parser" },
          amount: { confidence: 1.0, source: "parser" },
          balance: { confidence: parsedData.quality / 100, source: "parser" },
          debtType: { confidence: parsedData.quality / 100, source: "parser" },
          description: { confidence: 1.0, source: "parser" },
        },
        confidenceScores: {
          date: 1.0,
          amount: 1.0,
          balance: parsedData.quality / 100,
          debtType: parsedData.quality / 100,
          description: 1.0,
        },
        aiMetadata: {
          mappingConfidence: parsedData.quality / 100,
          dateFormatConfidence: 1.0,
          source: "pdf-parser",
          extractionMethod: parsedData.stats ? "enhanced" : "basic",
          dataQuality: parsedData.quality,
          stats: parsedData.stats,
          hasCredits: parsedData.hasCredits || false,
        },
      });
    }
  };

  const handleCsvFile = async (file) => {
    console.log("Starting CSV/Excel parsing for debt statement:", file.name);

    setProgress({ stage: "parsing", message: "Reading file...", percent: 20 });

    const fileType = file.type;
    const fileNameLower = file.name.toLowerCase();

    // Check if it's Excel
    const isExcel =
      fileType === "application/vnd.ms-excel" ||
      fileType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      fileNameLower.endsWith(".xls") ||
      fileNameLower.endsWith(".xlsx");

    if (isExcel) {
      // Parse Excel file
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const csvData = XLSX.utils.sheet_to_csv(worksheet);

      // Parse CSV data
      Papa.parse(csvData, {
        complete: (results) => {
          processParsedData(results.data, file.name);
        },
        error: (error) => {
          throw new Error(`Failed to parse Excel file: ${error.message}`);
        },
      });
    } else {
      // Parse CSV file
      Papa.parse(file, {
        complete: (results) => {
          processParsedData(results.data, file.name);
        },
        error: (error) => {
          throw new Error(`Failed to parse CSV file: ${error.message}`);
        },
      });
    }
  };

  const processParsedData = (data, fileName) => {
    console.log("Processing parsed CSV data:", data);

    if (!data || data.length === 0) {
      throw new Error("File appears to be empty. Please upload a valid statement file.");
    }

    // Extract headers (first row)
    const headers = data[0].filter((h) => h && h.trim() !== "");

    // Extract data rows (skip header)
    const rawData = data.slice(1).filter((row) => {
      return row.some((cell) => cell && cell.trim() !== "");
    });

    if (rawData.length === 0) {
      throw new Error("No transaction data found in the file.");
    }

    // Convert array rows to objects
    const transformedData = rawData.map((row) => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || "";
      });
      return obj;
    });

    setUploading(false);
    setProgress(null);

    // Attempt to auto-detect columns
    const dateColumn = headers.find(h =>
      /date|when|posted|transaction/i.test(h)
    );
    const amountColumn = headers.find(h =>
      /amount|debit|charge|value|spend/i.test(h)
    );
    const balanceColumn = headers.find(h =>
      /balance|outstanding/i.test(h)
    );
    const descriptionColumn = headers.find(h =>
      /description|merchant|payee|detail|reference|memo/i.test(h)
    );

    // Pass data to parent
    if (onFileParsed) {
      onFileParsed({
        rawData: transformedData,
        headers,
        initialMapping: {
          date: dateColumn || "",
          amount: amountColumn || "",
          balance: balanceColumn || "",
          description: descriptionColumn || "",
          debtType: "",
          dateFormat: "DD/MM/YYYY", // UK default
        },
        fileName: fileName,
        detectedCreditor: null,
        startingBalance: null,
        interestRate: null,
        suggestions: {
          date: { confidence: dateColumn ? 0.8 : 0, source: "auto-detect" },
          amount: { confidence: amountColumn ? 0.8 : 0, source: "auto-detect" },
          balance: { confidence: balanceColumn ? 0.6 : 0, source: "auto-detect" },
          description: { confidence: descriptionColumn ? 0.8 : 0, source: "auto-detect" },
        },
        confidenceScores: {
          date: dateColumn ? 0.8 : 0,
          amount: amountColumn ? 0.8 : 0,
          balance: balanceColumn ? 0.6 : 0,
          description: descriptionColumn ? 0.8 : 0,
        },
        aiMetadata: {
          mappingConfidence: 0.7,
          dateFormatConfidence: 0.6,
          source: "csv-parser",
          extractionMethod: "csv",
          dataQuality: 85,
        },
      });
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
            <h2 className="unified-upload-title">Upload Debt Statement</h2>
            <p className="unified-upload-subtitle">
              Upload a debt statement to begin analysis.
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
              !uploading && document.getElementById("debt-file-input").click()
            }
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              id="debt-file-input"
              type="file"
              accept=".csv,.xls,.xlsx,.pdf,.jpg,.jpeg,.png,.heic"
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
              We'll automatically match fields and transaction data
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
