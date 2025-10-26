import React, { useState, useCallback, useEffect } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { detectBank } from "./utils/columnDetection";
import { detectDateFormat, stripTimeFromDates } from "./utils/detectDateFormat";
import { parseSavingsDocument } from "./utils/savingsPdfParser";
import "./UnifiedPensionUploaderStyles.css";

dayjs.extend(customParseFormat);

/**
 * UnifiedSavingsUploader - Single upload modal for all savings file types
 *
 * Handles:
 * - CSV/Excel files (parsed directly)
 * - Auto-detects file type and processes immediately
 * - Routes directly to mapping review modal
 */

export default function UnifiedSavingsUploader({ onFileParsed, onClose }) {
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

    // Check if it's PDF or TXT
    const isPdfOrTxt =
      fileType === "application/pdf" ||
      fileType === "text/plain" ||
      fileNameLower.endsWith(".pdf") ||
      fileNameLower.endsWith(".txt");

    // Check if it's CSV or Excel
    const isCsvOrExcel =
      fileType === "text/csv" ||
      fileType === "application/vnd.ms-excel" ||
      fileType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      fileNameLower.endsWith(".csv") ||
      fileNameLower.endsWith(".xls") ||
      fileNameLower.endsWith(".xlsx");

    if (!isPdfOrTxt && !isCsvOrExcel) {
      setError(
        "Unsupported file type. Please upload CSV, Excel, PDF, or TXT files."
      );
      return;
    }

    // Clear any previous errors
    setError(null);
    setUploading(true);
    setProgress({ stage: "loading", message: "Starting...", percent: 0 });

    try {
      if (isPdfOrTxt) {
        // Process PDF/TXT file
        await handlePdfOrTxtFile(file);
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

  const handleProgressUpdate = useCallback((progressInfo) => {
    setProgress(progressInfo);
  }, []);

  const handlePdfOrTxtFile = async (file) => {
    console.log("Starting PDF/TXT parsing:", file.name);

    // Check if this is a PDF file
    const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';

    if (isPdf) {
      // Use PDF parser
      return await handlePdfFile(file);
    }

    // Handle TXT file
    setProgress({ stage: "parsing", message: "Reading file...", percent: 30 });

    const reader = new FileReader();

    return new Promise((resolve, reject) => {
      reader.onload = async (e) => {
        try {
          const text = e.target.result;

          // Parse the text content into rows
          const lines = text.split('\n').map(line => line.trim());

          if (lines.length === 0) {
            throw new Error("File appears to be empty.");
          }

          setProgress({ stage: "analyzing", message: "Parsing transactions...", percent: 60 });

          let parsedData = [];

          // Check if this is a Santander-style format (key: value pairs)
          const hasSantanderFormat = lines.some(line =>
            line.match(/^(Date|Description|Amount|Balance):/i)
          );

          if (hasSantanderFormat) {
            console.log("Detected Santander key-value format");

            // Parse Santander format: each transaction is multiple lines with "Field: Value" format
            let currentTransaction = {};

            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];

              // Skip empty lines and header lines
              if (!line || line.startsWith('From:') || line.startsWith('Account:')) {
                continue;
              }

              // Extract field and value using regex
              const match = line.match(/^([^:]+):\s*(.*)$/);

              if (match) {
                const field = match[1].trim();
                const value = match[2].trim();

                // Clean up special characters (like the � character)
                const cleanValue = value.replace(/[^\x20-\x7E\d.,\-\/]/g, '').trim();

                if (field.toLowerCase() === 'date') {
                  // If we already have a date, save previous transaction and start new one
                  if (currentTransaction.Date) {
                    if (Object.keys(currentTransaction).length > 0) {
                      parsedData.push({...currentTransaction});
                    }
                    currentTransaction = {};
                  }
                  currentTransaction.Date = cleanValue;
                } else if (field.toLowerCase() === 'description') {
                  currentTransaction.Description = cleanValue;
                } else if (field.toLowerCase() === 'amount') {
                  currentTransaction.Amount = cleanValue;
                } else if (field.toLowerCase() === 'balance') {
                  currentTransaction.Balance = cleanValue;
                }
              }
            }

            // Don't forget to add the last transaction
            if (Object.keys(currentTransaction).length > 0) {
              parsedData.push(currentTransaction);
            }

            console.log(`Parsed ${parsedData.length} Santander transactions`);

            // Calculate Type and Amount based on balance changes for TXT files
            for (let i = 0; i < parsedData.length; i++) {
              const current = parsedData[i];
              const previous = i > 0 ? parsedData[i - 1] : null;

              // Parse balance values
              const currentBalance = parseFloat(current.Balance?.replace(/,/g, '').replace('£', '').replace('-', '') || '0');
              const previousBalance = previous ? parseFloat(previous.Balance?.replace(/,/g, '').replace('£', '').replace('-', '') || '0') : currentBalance;

              // Calculate the change in balance
              const balanceChange = currentBalance - previousBalance;

              // Determine transaction type and amount
              if (balanceChange > 0) {
                // Balance increased = Credit (money in)
                current.Type = 'Credit';
                current.Amount = balanceChange.toFixed(2);
              } else if (balanceChange < 0) {
                // Balance decreased = Debit (money out)
                current.Type = 'Debit';
                current.Amount = Math.abs(balanceChange).toFixed(2);
              } else {
                // No change or first transaction
                const amount = parseFloat(current.Amount?.replace(/,/g, '').replace('£', '').replace('-', '') || '0');
                if (amount > 0) {
                  current.Type = 'Debit';
                  current.Amount = amount.toFixed(2);
                } else if (amount < 0) {
                  current.Type = 'Credit';
                  current.Amount = Math.abs(amount).toFixed(2);
                } else {
                  current.Type = 'Unknown';
                  current.Amount = '0.00';
                }
              }
            }
          } else {
            // Try to detect if this is a tab-separated or comma-separated format
            const firstLine = lines[0];
            const hasTabs = firstLine.includes('\t');
            const hasCommas = firstLine.includes(',');

            if (hasTabs) {
              // Tab-separated format
              parsedData = lines.filter(line => line !== '').map(line => {
                const parts = line.split('\t').map(p => p.trim());

                // Try to identify columns based on content patterns
                const row = {};
                parts.forEach((value, idx) => {
                  // Look for date patterns
                  if (value.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
                    if (!row.Date) {
                      row.Date = value;
                    } else if (!row['Transaction Date']) {
                      row['Transaction Date'] = value;
                    }
                  }
                  // Look for monetary values
                  else if (value.match(/^-?[\d,]+\.\d{2}$/)) {
                    if (!row.Amount) {
                      row.Amount = value;
                    } else if (!row.Balance) {
                      row.Balance = value;
                    }
                  }
                  // Everything else is description
                  else if (value && value.length > 0) {
                    if (!row.Description) {
                      row.Description = value;
                    } else {
                      row.Description += ' ' + value;
                    }
                  }
                });

                return row;
              });
            } else if (hasCommas) {
              // Comma-separated format - parse with PapaParse
              Papa.parse(text, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                  parsedData = results.data;
                },
                error: (error) => {
                  reject(new Error(`Error parsing CSV: ${error.message}`));
                },
              });
            } else {
              // Unstructured text - try to extract key information
              throw new Error(
                "Unable to detect file structure. Please upload a CSV or structured statement file."
              );
            }
          }

          // Filter out rows with no data
          parsedData = parsedData.filter(row =>
            Object.values(row).some(val => val && val.toString().trim() !== '')
          );

          if (parsedData.length === 0) {
            throw new Error("No transaction data found in file.");
          }

          setProgress({ stage: "analyzing", message: "Analyzing data...", percent: 90 });

          // Get headers from first row
          const headers = Object.keys(parsedData[0]);

          // Simple auto-mapping for savings accounts
          const autoMapping = {
            date: null,
            balance: null,
            amount: null,
            description: null,
          };

          // Map common savings column names
          headers.forEach((header) => {
            const headerLower = header.toLowerCase().trim();

            // Date detection
            if (!autoMapping.date && (
              headerLower.includes('date') ||
              headerLower === 'transaction date' ||
              headerLower === 'txn date' ||
              headerLower === 'paid date'
            )) {
              autoMapping.date = header;
            }

            // Balance detection
            if (!autoMapping.balance && (
              headerLower === 'balance' ||
              headerLower === 'running balance' ||
              headerLower === 'account balance'
            )) {
              autoMapping.balance = header;
            }

            // Amount detection
            if (!autoMapping.amount && (
              headerLower === 'amount' ||
              headerLower === 'value' ||
              headerLower === 'money in' ||
              headerLower === 'money out' ||
              headerLower === 'credit' ||
              headerLower === 'debit'
            )) {
              autoMapping.amount = header;
            }

            // Description detection
            if (!autoMapping.description && (
              headerLower === 'description' ||
              headerLower === 'details' ||
              headerLower === 'narrative' ||
              headerLower === 'transaction details'
            )) {
              autoMapping.description = header;
            }
          });

          // Detect bank from filename
          const detectedBank = detectBank(parsedData, autoMapping, file.name);

          // Detect date format
          let dateFormat = "DD/MM/YYYY"; // Default for UK
          if (autoMapping.date) {
            const dateValues = parsedData.slice(0, 10).map((row) => row[autoMapping.date]).filter(Boolean);
            const detected = detectDateFormat(dateValues);
            if (detected) {
              dateFormat = detected;
            }
          }

          // Calculate confidence scores for Santander TXT format
          const isSantanderFormat = detectedBank && detectedBank.toLowerCase().includes('santander');
          const dateConfidence = autoMapping.date ? (isSantanderFormat ? 98 : 90) : 50;
          const balanceConfidence = autoMapping.balance ? (isSantanderFormat ? 98 : 90) : 50;
          const amountConfidence = autoMapping.amount ? (isSantanderFormat ? 95 : 85) : 50;
          const descriptionConfidence = autoMapping.description ? (isSantanderFormat ? 95 : 85) : 50;
          const overallConfidence = Math.round((dateConfidence + balanceConfidence + amountConfidence + descriptionConfidence) / 4);

          setUploading(false);
          setProgress(null);

          // Pass data to parent with confidence scores
          if (onFileParsed) {
            onFileParsed(parsedData, file.name, {
              initialMapping: {
                ...autoMapping,
                dateFormat,
              },
              detectedBank,
              confidenceScores: {
                date: dateConfidence,
                balance: balanceConfidence,
                amount: amountConfidence,
                description: descriptionConfidence,
                overall: overallConfidence
              },
              aiMetadata: {
                mappingConfidence: overallConfidence / 100,
                dateFormatConfidence: 0.98,
                source: "txt-parser",
                extractionMethod: isSantanderFormat ? "santander-key-value" : "generic-txt",
                dataQuality: overallConfidence
              }
            });
          }

          resolve();
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error("Error reading file."));
      };

      reader.readAsText(file);
    });
  };

  const handlePdfFile = async (file) => {
    console.log("Starting PDF parsing:", file.name);

    try {
      // Parse the PDF using the savings PDF parser
      const parsedData = await parseSavingsDocument(file, handleProgressUpdate);

      console.log("PDF parsing complete:", parsedData);

      // Check if any data was extracted
      if (!parsedData.rows || parsedData.rows.length === 0) {
        throw new Error(
          "No transaction data found in the PDF. Please check that your file contains a bank statement with transaction details."
        );
      }

      // Check data quality
      if (parsedData.quality < 30) {
        throw new Error(
          `Data quality is too low (${parsedData.quality}%). The document may be unclear or in an unsupported format. Please try a clearer scan or different file.`
        );
      }

      // Convert parsed data to expected format
      const transformedData = parsedData.rows.map(row => ({
        Date: row.Date || '',
        Description: row.Description || '',
        'Money In': row.MoneyIn || '',
        'Money Out': row.MoneyOut || '',
        Balance: row.Balance || '',
        Type: row.Type || '',
        Amount: row.Amount || ''
      }));

      // Create auto-mapping
      const autoMapping = {
        date: 'Date',
        description: 'Description',
        amount: null, // Will be determined from Money In/Out
        balance: 'Balance'
      };

      // Detect date format
      const dateFormat = parsedData.originalDateFormat || "DD/MM/YYYY";

      setUploading(false);
      setProgress(null);

      // Calculate confidence scores for each field
      const dateConfidence = parsedData.quality;
      const balanceConfidence = parsedData.stats.hasBalance ? parsedData.quality : 50;
      const amountConfidence = (parsedData.stats.hasMoneyIn || parsedData.stats.hasMoneyOut) ? parsedData.quality : 50;
      const descriptionConfidence = parsedData.quality;

      // Pass data to parent with confidence metrics
      if (onFileParsed) {
        onFileParsed(transformedData, file.name, {
          initialMapping: {
            ...autoMapping,
            dateFormat,
          },
          detectedBank: parsedData.detectedBank || "Unknown Bank",
          confidenceScores: {
            date: dateConfidence,
            balance: balanceConfidence,
            amount: amountConfidence,
            description: descriptionConfidence,
            overall: parsedData.quality
          },
          aiMetadata: {
            mappingConfidence: parsedData.quality / 100,
            dateFormatConfidence: 1.0,
            source: "pdf-parser",
            extractionMethod: "santander-table",
            dataQuality: parsedData.quality,
            stats: parsedData.stats
          }
        });
      }
    } catch (error) {
      console.error("PDF parsing error:", error);
      setError(error.message || "Failed to parse PDF. Please try again.");
      setUploading(false);
      setProgress(null);
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

      // Simple auto-mapping for savings accounts
      const autoMapping = {
        date: null,
        balance: null,
        amount: null,
        description: null,
      };

      // Map common savings column names
      headers.forEach((header) => {
        const headerLower = header.toLowerCase().trim();

        // Date detection (including Trading212's "Time" column)
        if (!autoMapping.date && (
          headerLower.includes('date') ||
          headerLower === 'transaction date' ||
          headerLower === 'txn date' ||
          headerLower === 'paid date' ||
          headerLower === 'time'  // Trading212 uses "Time" for date+time
        )) {
          autoMapping.date = header;
        }

        // Balance detection
        if (!autoMapping.balance && (
          headerLower === 'balance' ||
          headerLower === 'running balance' ||
          headerLower === 'account balance'
        )) {
          autoMapping.balance = header;
        }

        // Amount detection (including Trading212's "Total" column)
        if (!autoMapping.amount && (
          headerLower === 'amount' ||
          headerLower === 'value' ||
          headerLower === 'money in' ||
          headerLower === 'money out' ||
          headerLower === 'credit' ||
          headerLower === 'debit' ||
          headerLower === 'total'  // Trading212 uses "Total" for amount
        )) {
          autoMapping.amount = header;
        }

        // Description detection (including Trading212's "Action" and "Notes")
        if (!autoMapping.description && (
          headerLower === 'description' ||
          headerLower === 'details' ||
          headerLower === 'narrative' ||
          headerLower === 'transaction details' ||
          headerLower === 'action' ||  // Trading212 uses "Action" for transaction type
          headerLower === 'notes'      // Trading212 also has "Notes"
        )) {
          autoMapping.description = header;
        }
      });

      // Detect bank from filename and headers
      const detectedBank = detectBank(data, autoMapping, fileName);

      // Detect date format
      let dateFormat = "DD/MM/YYYY"; // Default for UK
      let processedData = data;

      if (autoMapping.date) {
        const dateValues = data.slice(0, 10).map((row) => row[autoMapping.date]).filter(Boolean);
        const detected = detectDateFormat(dateValues);
        if (detected) {
          dateFormat = detected;

          // Strip time component if detected in date format
          const strippedResult = stripTimeFromDates(data, autoMapping.date, detected);
          processedData = strippedResult.data;
          dateFormat = strippedResult.dateFormat;
        }
      }

      // Calculate confidence scores based on field detection
      const dateConfidence = autoMapping.date ? 95 : 50;
      const balanceConfidence = autoMapping.balance ? 95 : 50;
      const amountConfidence = autoMapping.amount ? 95 : 50;
      const descriptionConfidence = autoMapping.description ? 90 : 50;
      const overallConfidence = Math.round((dateConfidence + balanceConfidence + amountConfidence + descriptionConfidence) / 4);

      setUploading(false);
      setProgress(null);

      // Pass data to parent with confidence scores (use processedData with stripped times)
      if (onFileParsed) {
        onFileParsed(processedData, fileName, {
          initialMapping: {
            ...autoMapping,
            dateFormat,
          },
          detectedBank,
          confidenceScores: {
            date: dateConfidence,
            balance: balanceConfidence,
            amount: amountConfidence,
            description: descriptionConfidence,
            overall: overallConfidence
          },
          aiMetadata: {
            mappingConfidence: overallConfidence / 100,
            dateFormatConfidence: dateFormat !== "DD/MM/YYYY" ? 0.95 : 0.90,
            source: "csv-parser",
            extractionMethod: "column-headers",
            dataQuality: overallConfidence
          }
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
            <h2 className="unified-upload-title">Upload Saving Data</h2>
            <p className="unified-upload-subtitle">
              Upload a bank statement to begin analysis
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
              !uploading && document.getElementById("unified-savings-file-input").click()
            }
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              id="unified-savings-file-input"
              type="file"
              accept=".csv,.xls,.xlsx,.pdf,.txt"
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
              Supported formats: csv, xls, xlsx, pdf, txt
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
