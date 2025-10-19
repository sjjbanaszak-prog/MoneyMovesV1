import React, { useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import "./PensionUploaderStyles.css";
import { parsePensionContributions } from "./utils/pensionContributionParser";

import PensionColumnMapper from "./PensionColumnMapper";
import { autoDetectPensionColumns } from "./utils/pensionColumnDetection";
import { detectDateFormat } from "./utils/detectDateFormat";

export default function PensionUploader({ onFileParsed }) {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [rawData, setRawData] = useState([]);
  const [initialMapping, setInitialMapping] = useState(null);
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState("");

  const handleUploadClick = () => {
    setShowUploadModal(true);
  };

  const hideUploadModal = () => {
    setShowUploadModal(false);
    setFileName("");
    setFileSize("");
  };

  const hideMappingModal = () => {
    setShowMappingModal(false);
    setRawData([]);
    setInitialMapping(null);
  };

  const handleFileUpload = (file) => {
    if (!file) return;

    setFileName(file.name);
    setFileSize(formatFileSize(file.size));

    const extension = file.name.split(".").pop().toLowerCase();

    const processParsedData = (data) => {
      if (!Array.isArray(data) || data.length === 0) {
        console.error("Parsed data is empty or not an array:", data);
        alert("File appears empty or improperly formatted.");
        return;
      }

      const sample = data.slice(0, 10);
      const guessedMapping = autoDetectPensionColumns(sample);
      const sampleDates = sample
        .map((row) => row[guessedMapping.date])
        .filter(Boolean);
      const guessedDateFormat = detectDateFormat(sampleDates);

      setRawData(data);
      setInitialMapping({ ...guessedMapping, dateFormat: guessedDateFormat });

      // Immediately show mapping modal
      setShowUploadModal(false);
      setShowMappingModal(true);
    };

    if (extension === "csv") {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          processParsedData(results.data);
        },
      });
    } else if (extension === "xls" || extension === "xlsx") {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const parsedData = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        processParsedData(parsedData);
      };
      reader.readAsArrayBuffer(file);
    } else {
      console.error("Unsupported file type:", file.name);
      alert("Unsupported file type. Please upload a CSV or Excel file.");
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleConfirm = ({ mapping, dateFormat, rawData: mappedRawData }) => {
    console.log("PensionUploader handleConfirm called with:", {
      mapping,
      dateFormat,
    });

    if (!mapping?.date || !mapping?.amount || !mapping?.provider) {
      console.warn("Missing column mappings:", mapping);
      alert(
        "Please ensure all required fields are mapped: Date, Provider, Amount."
      );
      return;
    }

    const dataToProcess = mappedRawData || rawData;
    if (!Array.isArray(dataToProcess) || dataToProcess.length === 0) {
      console.error("Raw data is missing or invalid:", dataToProcess);
      alert("No data available to parse. Please re-upload the file.");
      return;
    }

    console.log("Processing data with parser...");
    try {
      const { yearlyTotals, providerData } = parsePensionContributions({
        rawData: dataToProcess,
        mapping,
        dateFormat,
      });

      console.log("Parser results:", { yearlyTotals, providerData });

      setShowMappingModal(false);

      // Pass the parsed results to the parent component
      onFileParsed({
        yearlyTotals,
        providerData,
        rawData: dataToProcess,
        mapping,
        dateFormat,
      });
    } catch (error) {
      console.error("Error parsing pension data:", error);
      alert(
        "Error processing your pension data. Please check the file format and try again."
      );
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add("dragover");
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove("dragover");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove("dragover");
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  return (
    <>
      <div className="file-uploader-container dark-mode">
        <label className="file-upload-label" onClick={handleUploadClick}>
          <span className="upload-icon">📄</span> Upload Pension Statement
        </label>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && hideUploadModal()}
        >
          <div className="upload-modal">
            <h2>Upload Pension Statement</h2>
            <div
              className="dropzone"
              onClick={() =>
                document.getElementById("pension-file-input").click()
              }
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="dropzone-content">
                <div className="upload-icon-large">📁</div>
                <div className="dropzone-text">
                  Drag and drop your file here
                </div>
                <div className="dropzone-subtext">or click to browse</div>
                <div className="dropzone-subtext">
                  Supports CSV, XLS, XLSX files
                </div>
              </div>
              <input
                id="pension-file-input"
                type="file"
                accept=".csv,.xls,.xlsx"
                style={{ display: "none" }}
                onChange={(e) => handleFileUpload(e.target.files[0])}
              />
            </div>
            <div className="modal-actions">
              <button className="cancel-button" onClick={hideUploadModal}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Column Mapping Modal */}
      {showMappingModal && initialMapping && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && hideMappingModal()}
        >
          <div className="mapping-modal-overlay">
            <PensionColumnMapper
              data={rawData}
              initialMapping={initialMapping}
              onConfirm={handleConfirm}
              onCancel={hideMappingModal}
              fileName={fileName}
              totalRows={rawData.length}
            />
          </div>
        </div>
      )}
    </>
  );
}
