import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { detectDateFormat } from './detectDateFormat';

dayjs.extend(customParseFormat);

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// Configuration
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

// UK credit providers and lenders
const CREDITORS = [
  'american express', 'amex', 'barclaycard', 'barclays', 'lloyds', 'halifax',
  'hsbc', 'natwest', 'nationwide', 'santander', 'tesco bank', 'mbna',
  'capital one', 'newday', 'aqua', 'vanquis', 'monzo', 'starling', 'revolut',
  'virgin money', 'john lewis', 'argos', 'm&s bank', 'sainsburys bank'
];

/**
 * Main parser function for debt statements (PDF/Images)
 * @param {File} file - The uploaded file
 * @param {Function} onProgress - Optional progress callback
 * @returns {Promise<Object>} - Parsed data with validation
 */
export async function parseDebtDocument(file, onProgress = null) {
  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`);
  }

  const fileType = file.type;

  console.log('Parsing debt statement:', file.name, 'Type:', fileType, 'Size:', (file.size / 1024 / 1024).toFixed(2), 'MB');

  // Handle different file types
  if (fileType === 'application/pdf') {
    return await parseDebtPDF(file, onProgress);
  } else if (fileType.startsWith('image/')) {
    return await parseDebtImage(file, onProgress);
  } else {
    throw new Error('Unsupported file type. Please upload a PDF or image file (JPG, PNG, HEIC).');
  }
}

/**
 * Parse digital PDF debt statements
 */
async function parseDebtPDF(file, onProgress) {
  try {
    if (onProgress) onProgress({ stage: 'loading', message: 'Loading statement...', percent: 10 });

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    console.log(`PDF loaded: ${pdf.numPages} pages`);

    let allTextItems = [];
    let allText = '';

    // Extract text items with positioning from each page
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

      // Store items with positioning data
      textContent.items.forEach(item => {
        allTextItems.push({
          text: item.str,
          x: item.transform[4],
          y: item.transform[5],
          pageNum: pageNum
        });
        allText += item.str + ' ';
      });

      allText += '\n';
    }

    console.log('Extracted text length:', allText.length);
    console.log('Total text items with positioning:', allTextItems.length);

    // If text extraction yields very little content, the PDF might be scanned
    if (allText.trim().length < 100) {
      console.log('PDF appears to be scanned, using OCR...');
      return await parseScannedDebtPDF(file, onProgress);
    }

    if (onProgress) onProgress({ stage: 'parsing', message: 'Analyzing statement...', percent: 60 });

    // Detect creditor from document
    const detectedCreditor = detectCreditorFromDocument(allText);

    if (onProgress) onProgress({ stage: 'parsing', message: 'Extracting transactions...', percent: 80 });

    // Parse using table structure with positioning data
    const parsedData = parseDebtStatementText(allText, detectedCreditor, allTextItems);

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
async function parseScannedDebtPDF(file, onProgress) {
  try {
    if (onProgress) onProgress({ stage: 'ocr-setup', message: 'Preparing OCR...', percent: 10 });

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let allText = '';

    for (let pageNum = 1; pageNum <= Math.min(pdf.numPages, 5); pageNum++) { // Limit to first 5 pages for performance
      if (onProgress) {
        onProgress({
          stage: 'ocr',
          message: `Performing OCR on page ${pageNum}... This may take a minute.`,
          percent: 10 + (pageNum / Math.min(pdf.numPages, 5)) * 70
        });
      }

      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2.0 });

      // Render page to canvas
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: context, viewport }).promise;

      // Perform OCR
      const { data: { text } } = await Tesseract.recognize(
        canvas.toDataURL(),
        'eng',
        {
          logger: m => console.log(m)
        }
      );

      allText += text + '\n';
    }

    console.log('OCR extraction complete, text length:', allText.length);

    if (onProgress) onProgress({ stage: 'parsing', message: 'Analyzing statement...', percent: 85 });

    const detectedCreditor = detectCreditorFromDocument(allText);
    const parsedData = parseDebtStatementText(allText, detectedCreditor);

    if (onProgress) onProgress({ stage: 'complete', message: 'Processing complete!', percent: 100 });

    return parsedData;

  } catch (error) {
    console.error('Error performing OCR:', error);
    throw new Error('OCR failed. Please try a clearer scan or a different file.');
  }
}

/**
 * Parse images using OCR
 */
async function parseDebtImage(file, onProgress) {
  try {
    if (onProgress) onProgress({ stage: 'ocr', message: 'Performing OCR on image... This may take a minute.', percent: 10 });

    const { data: { text } } = await Tesseract.recognize(
      file,
      'eng',
      {
        logger: m => {
          if (m.status === 'recognizing text') {
            const percent = Math.round(m.progress * 70) + 10;
            if (onProgress) onProgress({ stage: 'ocr', message: 'Performing OCR...', percent });
          }
        }
      }
    );

    console.log('OCR complete, text length:', text.length);

    if (onProgress) onProgress({ stage: 'parsing', message: 'Analyzing statement...', percent: 85 });

    const detectedCreditor = detectCreditorFromDocument(text);
    const parsedData = parseDebtStatementText(text, detectedCreditor);

    if (onProgress) onProgress({ stage: 'complete', message: 'Processing complete!', percent: 100 });

    return parsedData;

  } catch (error) {
    console.error('Error performing OCR:', error);
    throw new Error('OCR failed. Please try a clearer image or a different file.');
  }
}

/**
 * Detect creditor name from document text
 */
function detectCreditorFromDocument(text) {
  const textLower = text.toLowerCase();

  for (const creditor of CREDITORS) {
    if (textLower.includes(creditor)) {
      // Capitalize first letter of each word
      return creditor
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
  }

  return 'Unknown Creditor';
}

/**
 * Parse extracted text into structured transaction data using table structure
 */
function parseDebtStatementText(text, creditor, textItems = []) {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);

  const transactions = [];
  let startingBalance = null;
  let closingBalance = null;
  let interestRate = null;
  let hasCredits = false;

  console.log('Processing text with', lines.length, 'lines and', textItems.length, 'positioned items');

  // Extract starting/closing balance from specific patterns
  const balancePatterns = [
    /previous\s+closing\s+balance[:\s]+£?\s*([\d,]+\.?\d*)/i,
    /opening\s+balance[:\s]+£?\s*([\d,]+\.?\d*)/i,
    /balance\s+b\/f[:\s]+£?\s*([\d,]+\.?\d*)/i,
    /closing\s+balance[:\s]+£?\s*([\d,]+\.?\d*)/i,
    /new\s+balance[:\s]+£?\s*([\d,]+\.?\d*)/i,
  ];

  for (const line of lines) {
    for (const pattern of balancePatterns) {
      const match = line.match(pattern);
      if (match) {
        const value = parseFloat(match[1].replace(/,/g, ''));
        if (pattern.source.includes('previous') || pattern.source.includes('opening') || pattern.source.includes('b/f')) {
          startingBalance = value;
          console.log('Found starting balance:', value);
        } else {
          closingBalance = value;
          console.log('Found closing balance:', value);
        }
      }
    }

    // Extract interest rate (look for APR percentages)
    const rateMatch = line.match(/(\d+\.?\d*)\s*%/);
    if (rateMatch && !interestRate) {
      const rate = parseFloat(rateMatch[1]);
      // Only consider reasonable interest rates (0.1% - 50%)
      if (rate >= 0.1 && rate <= 50) {
        interestRate = rate;
        console.log('Found interest rate:', rate);
      }
    }
  }

  // Parse table structure if positioning data is available
  if (textItems.length > 0) {
    console.log('Parsing table structure using positioning data...');
    const tableTransactions = parseTableStructure(textItems, creditor);
    transactions.push(...tableTransactions);

    // Check for credits
    hasCredits = transactions.some(t => t.amount < 0);

    console.log(`Extracted ${transactions.length} transactions from table structure`);
  }

  // Fallback: Try text pattern matching if no transactions found
  if (transactions.length === 0) {
    console.log('No table structure found, trying text pattern matching...');
    const patternTransactions = parseTransactionPatterns(text, creditor);
    transactions.push(...patternTransactions);
    hasCredits = transactions.some(t => t.amount < 0);
    console.log(`Extracted ${transactions.length} transactions from pattern matching`);
  }

  // Calculate quality score
  const quality = calculateQuality(transactions, startingBalance, interestRate);

  return {
    rows: transactions,
    startingBalance,
    closingBalance,
    interestRate,
    hasCredits,
    quality,
    originalDateFormat: 'DD MMM YYYY',
    stats: {
      totalTransactions: transactions.length,
      creditsFound: transactions.filter(t => t.amount < 0).length,
      debitsFound: transactions.filter(t => t.amount > 0).length,
      pagesProcessed: 'multiple',
    }
  };
}

/**
 * Parse table structure from positioned text items
 */
function parseTableStructure(textItems, creditor) {
  console.log('=== parseTableStructure called ===');
  console.log(`Total text items: ${textItems.length}`);
  console.log('First 20 text items:', textItems.slice(0, 20).map(item => ({
    text: item.text,
    x: item.x?.toFixed(2),
    y: item.y?.toFixed(2),
    page: item.pageNum
  })));

  const transactions = [];

  // Expected column headers
  const expectedHeaders = {
    transactionDate: /transaction\s*date/i,
    processDate: /process\s*date/i,
    description: /transaction\s*details|description/i,
    foreignSpend: /foreign\s*spend/i,
    amount: /amount|£/i
  };

  console.log('Looking for headers matching:', Object.keys(expectedHeaders));

  // Group items by page
  const pageGroups = {};
  textItems.forEach(item => {
    if (!pageGroups[item.pageNum]) {
      pageGroups[item.pageNum] = [];
    }
    pageGroups[item.pageNum].push(item);
  });

  console.log('Pages found:', Object.keys(pageGroups).join(', '));

  // Process each page
  Object.keys(pageGroups).forEach(pageNum => {
    const items = pageGroups[pageNum];

    // Group items into rows by Y-coordinate (increased tolerance for better grouping)
    const rows = groupIntoRows(items, 8);

    console.log(`\n=== PAGE ${pageNum} ===`);
    console.log(`Found ${rows.length} rows`);
    console.log(`Sample of first 15 rows:`, rows.slice(0, 15).map((row, idx) =>
      `${idx}: ${row.map(item => item.text).join(' ')}`
    ).join('\n'));

    // Find header row - headers may span multiple rows
    let headerRow = null;
    let headerRowIndex = -1;
    let columnPositions = null;
    let amountRow = null;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowText = row.map(item => item.text.toLowerCase()).join(' ');

      // Check for American Express specific headers
      const hasTransactionDate = /transaction\s+date/i.test(rowText);
      const hasProcessDate = /process\s+date/i.test(rowText);
      const hasTransactionDetails = /transaction\s+details/i.test(rowText);
      const hasAmount = /amount\s*£/i.test(rowText);

      // Log potential header rows
      if (hasTransactionDate || hasProcessDate || hasAmount) {
        console.log(`\nRow ${i} analysis:`, rowText.substring(0, 150));
        console.log(`  Transaction Date: ${hasTransactionDate}`);
        console.log(`  Process Date: ${hasProcessDate}`);
        console.log(`  Transaction Details: ${hasTransactionDetails}`);
        console.log(`  Amount £: ${hasAmount}`);
      }

      // Check if this row has the main headers (Transaction Date, Process Date, Transaction Details)
      if (hasTransactionDate && hasProcessDate && hasTransactionDetails) {
        // Check if the NEXT row has "Amount £"
        if (i + 1 < rows.length) {
          const nextRow = rows[i + 1];
          const nextRowText = nextRow.map(item => item.text.toLowerCase()).join(' ');
          const nextHasAmount = /amount\s*£/i.test(nextRowText);

          if (nextHasAmount) {
            // Headers span two rows!
            console.log(`\n✓✓✓ FOUND SPLIT HEADER ROWS at indices ${i} and ${i + 1} ✓✓✓`);
            console.log(`First header row: "${rowText}"`);
            console.log(`Second header row (Amount): "${nextRowText}"`);

            // Combine both rows for column detection
            headerRow = row;
            amountRow = nextRow;
            headerRowIndex = i;
            columnPositions = identifyColumnPositionsFromSplitHeaders(row, nextRow, expectedHeaders);
            console.log(`Column positions:`, JSON.stringify(columnPositions, null, 2));
            break;
          }
        }
      }

      // Also check for single-row headers (fallback)
      if (hasTransactionDate && hasProcessDate && hasAmount) {
        headerRow = row;
        headerRowIndex = i;
        columnPositions = identifyColumnPositions(row, expectedHeaders);
        console.log(`\n✓✓✓ FOUND SINGLE HEADER ROW at index ${i} ✓✓✓`);
        console.log(`Full header text: "${rowText}"`);
        console.log(`Column positions:`, JSON.stringify(columnPositions, null, 2));
        break;
      }
    }

    if (!headerRow || !columnPositions) {
      console.log(`❌ No complete header row found on page ${pageNum}`);
      return;
    }

    // Start extracting from the row after the amount row (if headers were split)
    const dataStartIndex = amountRow ? headerRowIndex + 2 : headerRowIndex + 1;

    // Extract transactions from rows after header
    let extractedCount = 0;
    let skippedCount = 0;

    console.log(`\nStarting transaction extraction from row ${dataStartIndex}`);

    for (let i = dataStartIndex; i < rows.length; i++) {
      const row = rows[i];

      // Skip rows that look like headers or section breaks
      const rowText = row.map(item => item.text.toLowerCase()).join(' ');
      if (/transaction\s*date|amount|rates\s*of|how\s*you\s*can/i.test(rowText)) {
        skippedCount++;
        continue;
      }

      try {
        // Check next row for CR indicator
        const nextRow = i + 1 < rows.length ? rows[i + 1] : null;
        const nextRowText = nextRow ? nextRow.map(item => item.text.toLowerCase()).join(' ').trim() : '';
        const isCROnNextRow = nextRowText === 'cr';

        const transaction = extractTransactionFromRow(row, columnPositions, creditor, isCROnNextRow);
        if (transaction) {
          transactions.push(transaction);
          extractedCount++;
          console.log(`✓ Extracted transaction ${extractedCount}:`, transaction);

          // Skip next row if it was just "CR"
          if (isCROnNextRow) {
            i++; // Skip the CR row
            skippedCount++;
          }
        } else {
          // Log why transaction wasn't extracted
          if (row.length > 0) {
            console.log(`✗ Failed to extract from row ${i}:`, rowText.substring(0, 100));
          }
        }
      } catch (error) {
        console.warn('Error extracting transaction from row:', error);
      }
    }

    console.log(`Page ${pageNum} summary: ${extractedCount} transactions extracted, ${skippedCount} rows skipped`);
  });

  return transactions;
}

/**
 * Group text items into rows by Y-coordinate
 */
function groupIntoRows(items, tolerance = 3) {
  const rows = [];
  const sortedItems = [...items].sort((a, b) => b.y - a.y); // Sort by Y descending

  sortedItems.forEach(item => {
    // Find existing row within tolerance
    let foundRow = null;
    for (const row of rows) {
      if (Math.abs(row[0].y - item.y) <= tolerance) {
        foundRow = row;
        break;
      }
    }

    if (foundRow) {
      foundRow.push(item);
    } else {
      rows.push([item]);
    }
  });

  // Sort items within each row by X-coordinate
  rows.forEach(row => row.sort((a, b) => a.x - b.x));

  return rows;
}

/**
 * Identify column positions from split header rows
 * (American Express format where headers span two rows)
 */
function identifyColumnPositionsFromSplitHeaders(firstRow, amountRow, expectedHeaders) {
  const positions = {
    transactionDate: null,
    processDate: null,
    description: null,
    amount: null
  };

  console.log('\n--- Column Detection (Split Headers) ---');
  console.log('First row items:', firstRow.map((item, idx) => `[${idx}] x:${item.x.toFixed(1)} "${item.text}"`).join(', '));
  console.log('Amount row items:', amountRow.map((item, idx) => `[${idx}] x:${item.x.toFixed(1)} "${item.text}"`).join(', '));

  // Find "Transaction Date" column (look for "Transaction" text)
  const txnDateIdx = firstRow.findIndex(item => /transaction/i.test(item.text));
  if (txnDateIdx !== -1) {
    positions.transactionDate = { index: txnDateIdx, x: firstRow[txnDateIdx].x };
    console.log(`Found Transaction Date at x: ${firstRow[txnDateIdx].x.toFixed(1)}`);
  }

  // Find "Process Date" column
  const processIdx = firstRow.findIndex(item => /process/i.test(item.text));
  if (processIdx !== -1) {
    positions.processDate = { index: processIdx, x: firstRow[processIdx].x };
    console.log(`Found Process Date at x: ${firstRow[processIdx].x.toFixed(1)}`);
  }

  // Find "Transaction Details" column
  const detailsIdx = firstRow.findIndex(item => /details/i.test(item.text));
  if (detailsIdx !== -1) {
    positions.description = { index: detailsIdx, x: firstRow[detailsIdx].x };
    console.log(`Found Transaction Details at x: ${firstRow[detailsIdx].x.toFixed(1)}`);
  }

  // Find "Amount £" column from the second row
  const amountIdx = amountRow.findIndex(item => /amount|£/i.test(item.text));
  if (amountIdx !== -1) {
    positions.amount = { index: amountIdx, x: amountRow[amountIdx].x };
    console.log(`Found Amount £ at x: ${amountRow[amountIdx].x.toFixed(1)}`);
  }

  console.log('Final positions:', positions);

  return positions;
}

/**
 * Identify column positions from header row
 */
function identifyColumnPositions(headerRow, expectedHeaders) {
  const positions = {
    transactionDate: null,
    processDate: null,
    description: null,
    amount: null
  };

  // Build a combined text representation with positions
  const rowText = headerRow.map(item => item.text.toLowerCase()).join(' ');

  console.log('\n--- Column Detection ---');
  console.log('Header row items:', headerRow.map((item, idx) => `[${idx}] x:${item.x.toFixed(1)} "${item.text}"`).join(', '));

  // Find column positions by looking for specific text patterns
  // For American Express: "Transaction Date", "Process Date", "Transaction Details", "Amount £"

  // Find "Transaction Date" column
  const txnDateIdx = headerRow.findIndex(item => /transaction/i.test(item.text));
  if (txnDateIdx !== -1) {
    // Find next item that says "Date"
    const dateIdx = headerRow.findIndex((item, idx) => idx > txnDateIdx && /date/i.test(item.text));
    if (dateIdx !== -1) {
      positions.transactionDate = { index: txnDateIdx, x: headerRow[txnDateIdx].x };
      console.log(`Found Transaction Date at index ${txnDateIdx}, x: ${headerRow[txnDateIdx].x}`);
    }
  }

  // Find "Process Date" column
  const processIdx = headerRow.findIndex(item => /process/i.test(item.text));
  if (processIdx !== -1) {
    positions.processDate = { index: processIdx, x: headerRow[processIdx].x };
    console.log(`Found Process Date at index ${processIdx}, x: ${headerRow[processIdx].x}`);
  }

  // Find "Transaction Details" column
  const detailsIdx = headerRow.findIndex(item => /details/i.test(item.text));
  if (detailsIdx !== -1) {
    positions.description = { index: detailsIdx, x: headerRow[detailsIdx].x };
    console.log(`Found Transaction Details at index ${detailsIdx}, x: ${headerRow[detailsIdx].x}`);
  }

  // Find "Amount" column (look for item containing £ or "amount")
  const amountIdx = headerRow.findIndex(item => /amount|£/i.test(item.text));
  if (amountIdx !== -1) {
    positions.amount = { index: amountIdx, x: headerRow[amountIdx].x };
    console.log(`Found Amount at index ${amountIdx}, x: ${headerRow[amountIdx].x}`);
  }

  console.log('Final positions:', positions);

  return positions;
}

/**
 * Extract transaction from a table row
 */
function extractTransactionFromRow(row, columnPositions, creditor, isCROnNextRow = false) {
  if (!columnPositions.transactionDate || !columnPositions.amount) {
    console.log('Missing required column positions');
    return null;
  }

  // Group row items by column based on X-position
  const columns = {
    transactionDate: [],
    processDate: [],
    description: [],
    amount: []
  };

  const xTolerance = 50; // Increased tolerance for column matching (was 30)

  row.forEach(item => {
    // Match to closest column
    let closestColumn = null;
    let minDistance = Infinity;

    Object.entries(columnPositions).forEach(([colName, pos]) => {
      if (pos && pos.x) {
        const distance = Math.abs(item.x - pos.x);
        if (distance < minDistance && distance < xTolerance) {
          minDistance = distance;
          closestColumn = colName;
        }
      }
    });

    if (closestColumn) {
      columns[closestColumn].push(item.text);
    } else {
      // If no close match, add to description (usually the widest column)
      columns.description.push(item.text);
    }
  });

  // Parse transaction date
  const dateStr = columns.transactionDate.join(' ').trim();
  if (!dateStr) {
    console.log('No date found in columns:', columns);
    return null;
  }

  // Parse date (format: "Sep 8" or similar)
  const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const dateMatch = dateStr.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})/i);

  if (!dateMatch) return null;

  const monthIndex = monthNames.indexOf(dateMatch[1].toLowerCase());
  const day = parseInt(dateMatch[2]);
  const year = monthIndex >= 9 ? 2024 : 2025; // Sep-Dec = 2024, Jan+ = 2025
  const transactionDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  // Parse amount
  const amountStr = columns.amount.join(' ').trim();
  if (!amountStr) return null;

  // Check for CR (credit) indicator in amount string OR on next row
  const isCRInAmount = /CR/i.test(amountStr);
  const isCR = isCRInAmount || isCROnNextRow;

  // Extract numeric value
  let amount = parseFloat(amountStr.replace(/[£,CR\s]/gi, ''));
  if (isNaN(amount)) return null;

  // Negate if credit (payment) - credits reduce debt
  if (isCR) {
    amount = -amount;
  }

  // Build description
  const description = columns.description.join(' ').trim();
  if (!description || description.length < 2) return null;

  return {
    transactionDate,
    description,
    amount,
    creditor
  };
}

/**
 * Fallback: Parse transactions using text patterns
 */
function parseTransactionPatterns(text, creditor) {
  const transactions = [];
  const lines = text.split('\n');
  const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

  // Generic pattern: Date followed by description and amount
  const genericPattern = /(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{4}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(.+?)\s+(£?[\d,]+\.?\d{2})\s*(cr)?/gi;
  const fullText = lines.join(' ');

  let match;
  while ((match = genericPattern.exec(fullText)) !== null) {
    const [, dateStr, description, amountStr, crIndicator] = match;

    // Parse date
    const parsedDate = dayjs(dateStr, ['DD MMM YYYY', 'DD/MM/YYYY', 'MM/DD/YYYY'], true);
    if (!parsedDate.isValid()) continue;

    // Parse amount
    let amount = parseFloat(amountStr.replace(/[£,]/g, ''));

    const isCredit = crIndicator?.toLowerCase() === 'cr' ||
                     /payment\s+received|thank\s+you/i.test(description);

    if (isCredit) {
      amount = -amount;
    }

    transactions.push({
      transactionDate: parsedDate.format('YYYY-MM-DD'),
      description: description.trim(),
      amount: amount,
      creditor: creditor,
    });
  }

  return transactions;
}

/**
 * Calculate data quality score
 */
function calculateQuality(transactions, startingBalance, interestRate) {
  let score = 0;

  // Transactions found
  if (transactions.length > 0) score += 40;
  if (transactions.length >= 5) score += 10;
  if (transactions.length >= 10) score += 10;

  // Starting balance found
  if (startingBalance !== null) score += 20;

  // Interest rate found
  if (interestRate !== null) score += 10;

  // Date validity
  const validDates = transactions.filter(t => t.transactionDate).length;
  if (validDates === transactions.length && transactions.length > 0) score += 10;

  return Math.min(100, score);
}
