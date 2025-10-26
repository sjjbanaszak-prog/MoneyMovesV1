import * as pdfjsLib from 'pdfjs-dist';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// Configuration
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

// UK bank identifiers
const BANK_IDENTIFIERS = {
  'Santander': ['santander', 'abbey national'],
  'Barclays': ['barclays'],
  'HSBC': ['hsbc', 'first direct'],
  'Lloyds': ['lloyds', 'halifax', 'bank of scotland'],
  'NatWest': ['natwest', 'royal bank of scotland', 'rbs'],
  'Monzo': ['monzo'],
  'Starling': ['starling'],
  'Nationwide': ['nationwide'],
  'TSB': ['tsb']
};

/**
 * Main parser function for savings account PDF statements
 * @param {File} file - The uploaded PDF file
 * @param {Function} onProgress - Optional progress callback
 * @returns {Promise<Object>} - Parsed data with quality metrics
 */
export async function parseSavingsDocument(file, onProgress = null) {
  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`);
  }

  const fileType = file.type;

  console.log('Parsing savings file:', file.name, 'Type:', fileType, 'Size:', (file.size / 1024 / 1024).toFixed(2), 'MB');

  if (fileType === 'application/pdf') {
    return await parseSavingsPDF(file, onProgress);
  } else {
    throw new Error('Unsupported file type. Please upload a PDF file.');
  }
}

/**
 * Parse savings PDF statements (Santander format)
 */
async function parseSavingsPDF(file, onProgress) {
  try {
    if (onProgress) onProgress({ stage: 'loading', message: 'Loading PDF...', percent: 10 });

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    console.log(`PDF loaded: ${pdf.numPages} pages`);

    let allText = '';
    let allTextLines = [];

    // Extract text from each page with positioning
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

      // Group text items by their Y position (same line)
      const lineMap = {};
      textContent.items.forEach(item => {
        const y = Math.round(item.transform[5]); // Y position
        if (!lineMap[y]) {
          lineMap[y] = [];
        }
        lineMap[y].push({
          text: item.str,
          x: item.transform[4] // X position
        });
      });

      // Sort lines by Y position (top to bottom)
      const sortedYs = Object.keys(lineMap).sort((a, b) => b - a);

      sortedYs.forEach(y => {
        // Sort items in each line by X position (left to right)
        const items = lineMap[y].sort((a, b) => a.x - b.x);
        const lineText = items.map(i => i.text).join(' ');
        allTextLines.push(lineText);
        allText += lineText + '\n';
      });
    }

    console.log('Text extraction complete');
    console.log('Sample extracted text:', allText.substring(0, 500));

    if (onProgress) onProgress({ stage: 'parsing', message: 'Analyzing transactions...', percent: 60 });

    // Detect bank from text
    const detectedBank = detectBank(allText, file.name);
    console.log('Detected bank:', detectedBank);

    // Parse transactions based on detected format
    const parsedData = parseSantanderFormat(allTextLines, allText);

    if (onProgress) onProgress({ stage: 'validating', message: 'Validating data...', percent: 90 });

    // Calculate quality score
    const quality = calculateQuality(parsedData.rows, allText);

    console.log(`Parsing complete: ${parsedData.rows.length} transactions, ${quality}% quality`);

    return {
      rows: parsedData.rows,
      quality,
      originalDateFormat: parsedData.dateFormat,
      detectedBank,
      stats: {
        totalRows: parsedData.rows.length,
        dateFormat: parsedData.dateFormat,
        hasBalance: parsedData.rows.every(r => r.Balance),
        hasMoneyIn: parsedData.rows.some(r => r.MoneyIn),
        hasMoneyOut: parsedData.rows.some(r => r.MoneyOut)
      }
    };

  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error(`Failed to parse PDF: ${error.message}`);
  }
}

/**
 * Parse Santander-style table format
 * Expected columns: Date | Description | Money In | Money Out | Balance
 */
function parseSantanderFormat(lines, fullText) {
  const transactions = [];
  let dateFormat = 'DD/MM/YYYY';

  console.log('Parsing Santander format from', lines.length, 'lines');

  // Find the header line to establish column positions
  let headerLineIndex = -1;
  for (let i = 0; i < Math.min(20, lines.length); i++) {
    const line = lines[i].toLowerCase();
    if (line.includes('date') && line.includes('description') && line.includes('balance')) {
      headerLineIndex = i;
      console.log('Found header at line', i, ':', lines[i]);
      break;
    }
  }

  if (headerLineIndex === -1) {
    console.warn('Could not find header line, attempting pattern-based parsing');
  }

  // Pattern-based parsing for Santander statements
  // Look for date patterns and group subsequent lines
  const datePattern = /^(\d{1,2}\/\d{1,2}\/\d{4})/;
  const moneyPattern = /£\s*([\d,]+\.\d{2})/g;

  let currentTransaction = null;

  for (let i = headerLineIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line || line.length < 5) continue;

    // Check if line starts with a date
    const dateMatch = line.match(datePattern);

    if (dateMatch) {
      // Save previous transaction if exists
      if (currentTransaction && currentTransaction.Date) {
        transactions.push(currentTransaction);
      }

      // Start new transaction
      const date = dateMatch[1];

      // Extract the rest of the line after date
      const restOfLine = line.substring(dateMatch[0].length).trim();

      // Find all money amounts in the line
      const moneyMatches = [...restOfLine.matchAll(moneyPattern)];

      // Extract description (everything before the first money amount)
      let description = restOfLine;
      let moneyIn = '';
      let moneyOut = '';
      let balance = '';

      if (moneyMatches.length > 0) {
        // Description is before the first money amount
        const firstMoneyIndex = restOfLine.indexOf(moneyMatches[0][0]);
        description = restOfLine.substring(0, firstMoneyIndex).trim();

        // Extract money amounts
        const amounts = moneyMatches.map(m => m[1]);

        if (amounts.length === 2) {
          // Could be: MoneyIn + Balance, MoneyOut + Balance, or Amount + Balance
          // Check the description for clues
          if (description.toLowerCase().includes('interest') ||
              description.toLowerCase().includes('paid in') ||
              description.toLowerCase().includes('from')) {
            moneyIn = amounts[0];
            balance = amounts[1];
          } else {
            moneyOut = amounts[0];
            balance = amounts[1];
          }
        } else if (amounts.length === 1) {
          // Just balance
          balance = amounts[0];
        } else if (amounts.length >= 3) {
          // Money In, Money Out, Balance
          moneyIn = amounts[0] || '';
          moneyOut = amounts[1] || '';
          balance = amounts[2] || '';
        }
      }

      currentTransaction = {
        Date: date,
        Description: description,
        MoneyIn: moneyIn,
        MoneyOut: moneyOut,
        Balance: balance
      };
    } else if (currentTransaction) {
      // Continuation of description from previous line
      currentTransaction.Description += ' ' + line;
    }
  }

  // Don't forget the last transaction
  if (currentTransaction && currentTransaction.Date) {
    transactions.push(currentTransaction);
  }

  console.log(`Extracted ${transactions.length} transactions`);

  // Log sample transactions
  if (transactions.length > 0) {
    console.log('Sample transaction:', JSON.stringify(transactions[0], null, 2));
  }

  // Clean up descriptions
  transactions.forEach(t => {
    // Remove money amounts from description if they leaked in
    t.Description = t.Description.replace(/£\s*[\d,]+\.\d{2}/g, '').trim();
    // Remove excessive whitespace
    t.Description = t.Description.replace(/\s+/g, ' ').trim();
  });

  // Calculate Type and Amount based on balance changes
  for (let i = 0; i < transactions.length; i++) {
    const current = transactions[i];
    const previous = i > 0 ? transactions[i - 1] : null;

    // Parse balance values
    const currentBalance = parseFloat(current.Balance?.replace(/,/g, '') || '0');
    const previousBalance = previous ? parseFloat(previous.Balance?.replace(/,/g, '') || '0') : currentBalance;

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
      // No change
      current.Type = 'Unknown';
      current.Amount = '0.00';
    }

    // If MoneyIn/MoneyOut exist, use those to verify Type
    if (current.MoneyIn && parseFloat(current.MoneyIn.replace(/,/g, '')) > 0) {
      current.Type = 'Credit';
      current.Amount = current.MoneyIn.replace(/,/g, '');
    } else if (current.MoneyOut && parseFloat(current.MoneyOut.replace(/,/g, '')) > 0) {
      current.Type = 'Debit';
      current.Amount = current.MoneyOut.replace(/,/g, '');
    }
  }

  return {
    rows: transactions,
    dateFormat
  };
}

/**
 * Detect bank from document text
 */
function detectBank(text, fileName) {
  const textLower = text.toLowerCase();
  const fileNameLower = fileName.toLowerCase();

  for (const [bank, identifiers] of Object.entries(BANK_IDENTIFIERS)) {
    for (const identifier of identifiers) {
      if (textLower.includes(identifier) || fileNameLower.includes(identifier)) {
        console.log(`Detected bank: ${bank} (matched: ${identifier})`);
        return bank;
      }
    }
  }

  return 'Unknown Bank';
}

/**
 * Calculate data quality score
 */
function calculateQuality(rows, fullText) {
  let score = 0;
  let maxScore = 0;

  // Check if we have any rows
  maxScore += 30;
  if (rows.length > 0) score += 30;

  // Check if dates are valid
  maxScore += 20;
  const validDates = rows.filter(row => {
    if (!row.Date) return false;
    const parsed = dayjs(row.Date, ['DD/MM/YYYY', 'D/M/YYYY', 'DD-MM-YYYY'], true);
    return parsed.isValid();
  });
  score += (validDates.length / Math.max(rows.length, 1)) * 20;

  // Check if descriptions are present
  maxScore += 15;
  const withDescriptions = rows.filter(row => row.Description && row.Description.length > 3);
  score += (withDescriptions.length / Math.max(rows.length, 1)) * 15;

  // Check if balances are present
  maxScore += 20;
  const withBalances = rows.filter(row => row.Balance && row.Balance.length > 0);
  score += (withBalances.length / Math.max(rows.length, 1)) * 20;

  // Check if we have either Money In or Money Out
  maxScore += 15;
  const withAmounts = rows.filter(row =>
    (row.MoneyIn && row.MoneyIn.length > 0) ||
    (row.MoneyOut && row.MoneyOut.length > 0)
  );
  score += (withAmounts.length / Math.max(rows.length, 1)) * 15;

  const finalScore = Math.round((score / maxScore) * 100);
  console.log(`Quality score: ${finalScore}% (${score}/${maxScore})`);

  return finalScore;
}

export { detectBank, calculateQuality };
