import React, { useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import "./FileUploaderStyles.css";

export default function FileUploader({ onDataParsed }) {
  const [showUploadModal, setShowUploadModal] = useState(false);
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

      // Close the upload modal and pass data to parent
      setShowUploadModal(false);
      onDataParsed(data);
    };

    if (extension === "csv") {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          processParsedData(results.data);
        },
        error: (error) => {
          console.error("Error parsing CSV:", error);
          alert("Error parsing CSV file. Please check the file format.");
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
          const parsedData = XLSX.utils.sheet_to_json(sheet, { defval: "" });
          processParsedData(parsedData);
        } catch (error) {
          console.error("Error parsing Excel file:", error);
          alert("Error parsing Excel file. Please check the file format.");
        }
      };
      reader.onerror = () => {
        alert("Error reading file. Please try again.");
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
          <span className="upload-icon">📄</span> Upload Savings Statement
        </label>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && hideUploadModal()}
        >
          <div className="upload-modal">
            <h2>Upload Bank Statement</h2>
            <div
              className="dropzone"
              onClick={() => document.getElementById("bank-file-input").click()}
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
                id="bank-file-input"
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
    </>
  );
}
