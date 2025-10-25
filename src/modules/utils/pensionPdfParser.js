import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// Configuration
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

// Enhanced provider list for UK pension market
const PENSION_PROVIDERS = [
  'aviva',
  'royal london',
  'aegon',
  'scottish widows',
  'legal & general',
  'l&g',
  'nest',
  'peoples pension',
  "people's pension",
  'standard life',
  'phoenix',
  'prudential',
  'now pensions',
  'aon',
  'scottish friendly',
  'true potential',
  'quilter',
  'fidelity',
  'vanguard',
  'hargreaves lansdown',
  'hl sipp',
  'stakeholder',
  'workplace pension',
  'auto enrolment'
];

/**
 * Main parser function that handles PDFs, scans, and photographs
 * @param {File} file - The uploaded file
 * @param {Function} onProgress - Optional progress callback
 * @returns {Promise<Object>} - Parsed data with validation
 */
export async function parsePensionDocument(file, onProgress = null) {
  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`);
  }

  const fileType = file.type;

  console.log('Parsing file:', file.name, 'Type:', fileType, 'Size:', (file.size / 1024 / 1024).toFixed(2), 'MB');

  // Handle different file types
  if (fileType === 'application/pdf') {
    return await parsePDF(file, onProgress);
  } else if (fileType.startsWith('image/')) {
    return await parseImage(file, onProgress);
  } else {
    throw new Error('Unsupported file type. Please upload a PDF or image file (JPG, PNG, HEIC).');
  }
}

/**
 * Parse digital PDF files
 */
async function parsePDF(file, onProgress) {
  try {
    if (onProgress) onProgress({ stage: 'loading', message: 'Loading PDF...', percent: 10 });

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    console.log(`PDF loaded: ${pdf.numPages} pages`);

    let allText = '';

    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      if (onProgress) {
        onProgress({
          stage: 'extracting',
          message: `Extracting text from page ${pageNum} of ${pdf.numPages}...`,
          percent: 10 + (pageNum / pdf.numPages) * 40
        });
      }

      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Combine text items with positioning info
      const pageText = textContent.items
        .map(item => item.str)
        .join(' ');

      allText += pageText + '\n';
    }

    console.log('Extracted text length:', allText.length);

    // If text extraction yields very little content, the PDF might be scanned
    if (allText.trim().length < 100) {
      console.log('PDF appears to be scanned, using OCR...');
      return await parseScannedPDF(file, onProgress);
    }

    if (onProgress) onProgress({ stage: 'parsing', message: 'Analyzing document structure...', percent: 60 });

    // First, detect provider from full document
    const detectedProvider = detectProviderFromFullDocument(allText);

    if (onProgress) onProgress({ stage: 'parsing', message: 'Extracting payment data...', percent: 80 });

    // Parse the extracted text into structured data
    const parsedData = parseExtractedText(allText, detectedProvider);

    if (onProgress) onProgress({ stage: 'complete', message: 'Processing complete!', percent: 100 });

    return parsedData;

  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Failed to parse PDF. The file may be corrupted or password-protected.');
  }
}

/**
 * Parse scanned PDFs using OCR
 */
async function parseScannedPDF(file, onProgress) {
  try {
    if (onProgress) onProgress({ stage: 'ocr-setup', message: 'Preparing OCR...', percent: 10 });

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let allText = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      if (onProgress) {
        onProgress({
          stage: 'ocr',
          message: `Performing OCR on page ${pageNum} of ${pdf.numPages}... This may take a minute.`,
          percent: 10 + (pageNum / pdf.numPages) * 70
        });
      }

      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2.0 });

      // Create canvas to render PDF page
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;

      // Convert canvas to blob for OCR
      const blob = await new Promise(resolve => canvas.toBlob(resolve));

      // Perform OCR with progress tracking
      const { data: { text } } = await Tesseract.recognize(blob, 'eng', {
        logger: m => {
          if (m.status === 'recognizing text' && onProgress) {
            const ocrPercent = 10 + ((pageNum - 1) / pdf.numPages) * 70 + (m.progress * 70 / pdf.numPages);
            onProgress({
              stage: 'ocr',
              message: `OCR Page ${pageNum}/${pdf.numPages}: ${Math.round(m.progress * 100)}%`,
              percent: ocrPercent
            });
          }
        }
      });

      allText += text + '\n';
    }

    if (onProgress) onProgress({ stage: 'parsing', message: 'Analyzing OCR results...', percent: 85 });

    const detectedProvider = detectProviderFromFullDocument(allText);
    const parsedData = parseExtractedText(allText, detectedProvider);

    if (onProgress) onProgress({ stage: 'complete', message: 'Processing complete!', percent: 100 });

    return parsedData;

  } catch (error) {
    console.error('Error parsing scanned PDF:', error);
    throw new Error('Failed to process scanned PDF. The scan quality may be too low.');
  }
}

/**
 * Parse image files (photographs or scans) using OCR
 */
async function parseImage(file, onProgress) {
  try {
    if (onProgress) onProgress({ stage: 'ocr', message: 'Performing OCR on image...', percent: 10 });

    console.log('Performing OCR on image...');

    const { data: { text } } = await Tesseract.recognize(file, 'eng', {
      logger: m => {
        if (m.status === 'recognizing text' && onProgress) {
          onProgress({
            stage: 'ocr',
            message: `OCR Progress: ${Math.round(m.progress * 100)}%`,
            percent: 10 + m.progress * 70
          });
        }
      }
    });

    console.log('OCR completed, text length:', text.length);

    if (onProgress) onProgress({ stage: 'parsing', message: 'Analyzing document...', percent: 85 });

    const detectedProvider = detectProviderFromFullDocument(text);
    const parsedData = parseExtractedText(text, detectedProvider);

    if (onProgress) onProgress({ stage: 'complete', message: 'Processing complete!', percent: 100 });

    return parsedData;

  } catch (error) {
    console.error('Error parsing image:', error);
    throw new Error('Failed to process image. Please ensure the image is clear, well-lit, and in focus.');
  }
}

/**
 * Detect provider from entire document (better than line-by-line)
 */
function detectProviderFromFullDocument(text) {
  const textLower = text.toLowerCase();

  // Check for provider keywords in the full text
  for (const provider of PENSION_PROVIDERS) {
    if (textLower.includes(provider.toLowerCase())) {
      // Format provider name properly
      return provider.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
  }

  return null; // Will be marked as 'Unknown Provider' during row parsing
}

/**
 * Enhanced text parsing with better table detection
 */
function parseExtractedText(text, documentProvider) {
  console.log('Parsing extracted text...');

  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const rows = [];

  // Try to detect table structure first
  const tableData = detectTableStructure(lines);

  if (tableData.hasTable) {
    console.log('Table structure detected, using structured parsing');
    return parseTableData(tableData, documentProvider);
  }

  // Fallback to pattern-based extraction
  console.log('No clear table found, using pattern-based extraction');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Enhanced date pattern (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, DD-MM-YYYY)
    const dateMatch = line.match(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/);

    // Enhanced amount pattern (handles £, commas, spaces)
    const amountMatch = line.match(/£?\s*(\d{1,3}(?:[,\s]\d{3})*(?:\.\d{2})?)/);

    if (dateMatch && amountMatch) {
      // Clean amount (remove £, commas, spaces)
      const cleanAmount = amountMatch[1].replace(/[£,\s]/g, '');

      // Validate it's a reasonable pension contribution (£1 - £100,000)
      const numericAmount = parseFloat(cleanAmount);
      if (numericAmount >= 1 && numericAmount <= 100000) {
        const row = {
          date: dateMatch[1],
          amount: cleanAmount,
          provider: documentProvider || extractProviderFromContext(line, lines, i),
          rawText: line
        };

        rows.push(row);
      }
    }
  }

  console.log(`Extracted ${rows.length} potential payment rows`);

  // Validate and clean data
  return validateAndCleanData(rows, documentProvider);
}

/**
 * Detect if document has a table structure
 */
function detectTableStructure(lines) {
  let headerIndex = -1;
  let hasConsistentSpacing = false;
  let hasPipes = false;

  // Look for header row
  const datePatterns = ['date', 'payment date', 'transaction date', 'contrib date', 'contribution date'];
  const amountPatterns = ['amount', 'contribution', 'payment', 'value', 'gross', 'net'];

  for (let i = 0; i < Math.min(lines.length, 30); i++) {
    const lineLower = lines[i].toLowerCase();

    // Check for table header
    const hasDateColumn = datePatterns.some(pattern => lineLower.includes(pattern));
    const hasAmountColumn = amountPatterns.some(pattern => lineLower.includes(pattern));

    if (hasDateColumn && hasAmountColumn) {
      headerIndex = i;

      // Check if uses pipes or consistent spacing
      hasPipes = lines[i].includes('|');
      hasConsistentSpacing = /\s{3,}/.test(lines[i]);

      console.log('Found potential header at line', i, ':', lines[i]);
      break;
    }
  }

  return {
    hasTable: headerIndex >= 0,
    headerIndex,
    hasPipes,
    hasConsistentSpacing
  };
}

/**
 * Parse table-structured data
 */
function parseTableData(tableData, documentProvider) {
  // This is a placeholder for more sophisticated table parsing
  // For now, returns empty and falls back to pattern matching
  return { rows: [], quality: 'low' };
}

/**
 * Extract provider from line context (fallback if not found in full document)
 */
function extractProviderFromContext(line, allLines, currentIndex) {
  const lineLower = line.toLowerCase();

  // Check current line
  for (const provider of PENSION_PROVIDERS) {
    if (lineLower.includes(provider.toLowerCase())) {
      return provider.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
  }

  // Look in nearby lines (within 10 lines above)
  for (let i = Math.max(0, currentIndex - 10); i < currentIndex; i++) {
    const nearbyLine = allLines[i].toLowerCase();
    for (const provider of PENSION_PROVIDERS) {
      if (nearbyLine.includes(provider.toLowerCase())) {
        return provider.split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }
    }
  }

  return 'Unknown Provider';
}

/**
 * Validate and clean parsed data
 */
function validateAndCleanData(rows, documentProvider) {
  // Remove duplicates based on date + amount
  const uniqueRows = [];
  const seen = new Set();

  for (const row of rows) {
    const key = `${row.date}-${row.amount}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueRows.push(row);
    }
  }

  // Normalize dates
  const normalizedRows = uniqueRows.map(row => {
    const parsedDate = parseDate(row.date);
    return {
      ...row,
      date: parsedDate.formatted,
      dateOriginal: row.date,
      dateValid: parsedDate.valid,
      amount: parseFloat(row.amount),
      provider: row.provider || documentProvider || 'Unknown Provider'
    };
  });

  // Filter out invalid dates or amounts
  const validRows = normalizedRows.filter(row => row.dateValid && !isNaN(row.amount) && row.amount > 0);

  // Calculate data quality score
  const quality = calculateDataQuality(validRows, rows.length);

  return {
    rows: validRows,
    quality,
    stats: {
      totalExtracted: rows.length,
      duplicatesRemoved: rows.length - uniqueRows.length,
      invalidRemoved: normalizedRows.length - validRows.length,
      finalCount: validRows.length
    }
  };
}

/**
 * Parse date with multiple format attempts
 */
function parseDate(dateStr) {
  const formats = [
    'DD/MM/YYYY',
    'DD-MM-YYYY',
    'DD.MM.YYYY',
    'MM/DD/YYYY',
    'YYYY-MM-DD',
    'YYYY/MM/DD',
    'DD/MM/YY',
    'DD-MM-YY',
    'MM/DD/YY'
  ];

  for (const format of formats) {
    const parsed = dayjs(dateStr, format, true);
    if (parsed.isValid()) {
      return {
        formatted: parsed.format('YYYY-MM-DD'),
        valid: true,
        detectedFormat: format
      };
    }
  }

  return {
    formatted: dateStr,
    valid: false,
    detectedFormat: null
  };
}

/**
 * Calculate data quality score (0-100)
 */
function calculateDataQuality(validRows, totalRows) {
  if (totalRows === 0) return 0;

  const validityScore = (validRows.length / totalRows) * 100;

  // Check for provider detection
  const hasProvider = validRows.filter(r => r.provider !== 'Unknown Provider').length;
  const providerScore = (hasProvider / validRows.length) * 100;

  // Overall quality
  const overallQuality = (validityScore * 0.7) + (providerScore * 0.3);

  return Math.round(overallQuality);
}

/**
 * Preview function - useful for showing user what was extracted before finalizing
 */
export function previewExtractedData(parsedData) {
  const rows = parsedData.rows || [];

  return {
    totalRows: rows.length,
    sampleRows: rows.slice(0, 5),
    providers: [...new Set(rows.map(r => r.provider))],
    dateRange: rows.length > 0 ? {
      earliest: new Date(Math.min(...rows.map(r => new Date(r.date).getTime()))),
      latest: new Date(Math.max(...rows.map(r => new Date(r.date).getTime())))
    } : null,
    quality: parsedData.quality,
    stats: parsedData.stats
  };
}
