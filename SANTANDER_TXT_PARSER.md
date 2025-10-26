# Santander TXT Statement Parser

## Overview
Implementation of specialized parsing for Santander bank statements exported as TXT files from PDF statements.

## Santander Statement Format

Santander statements use a **key-value format** where each transaction spans multiple lines:

```
Date: 23/10/2025
Description: TRANSFER TO EDGE CURRENT ACCOUNT
Amount: -12.92
Balance: 4000.00
```

### File Structure
- **Header**: Contains account period and account number
  ```
  From: 26/04/2020 to 26/10/2025
  Account: XXXX XXXX XXXX 9185
  ```
- **Transactions**: Each transaction is 4 lines with labeled fields
- **Special Characters**: May contain non-ASCII characters (�) that need cleaning

## Implementation

### Detection Logic
The parser automatically detects Santander format by checking for key field labels:
```javascript
const hasSantanderFormat = lines.some(line =>
  line.match(/^(Date|Description|Amount|Balance):/i)
);
```

### Parsing Algorithm
1. **Line-by-line processing**: Iterate through all lines
2. **Pattern matching**: Use regex to extract field-value pairs: `/^([^:]+):\s*(.*)$/`
3. **Transaction grouping**:
   - When a new `Date:` field is found, save the previous transaction
   - Start a new transaction object
4. **Character cleaning**: Remove non-ASCII characters using regex: `/[^\x20-\x7E\d.,\-\/]/g`

### Field Mapping
Santander fields map directly to standard savings columns:
- `Date:` → `Date` column
- `Description:` → `Description` column
- `Amount:` → `Amount` column (negative for debits, positive for credits)
- `Balance:` → `Balance` column (running balance after transaction)

### Code Location
`/src/modules/UnifiedSavingsUploader.js` - lines 157-211 (Santander format detection and parsing)

## Usage

### User Workflow
1. User clicks "Upload Savings Statement"
2. User selects Santander TXT file (exported from PDF)
3. Parser automatically detects Santander format
4. Transactions are extracted and displayed in column mapper
5. User confirms field mappings (Date, Amount, Balance, Description)
6. Data is saved to Firestore

### Supported Formats
- ✅ **TXT files** - Fully supported with automatic parsing
- ❌ **PDF files** - Not supported (requires PDF parsing library)
  - User receives helpful error message: "Please export your Santander statement as a TXT file instead"

## Testing

### Test File
`/Users/stephanbanaszak/Downloads/Statements09012993059185.txt`
- 79 transactions from 15/09/2023 to 23/10/2025
- Mix of interest payments and transfers
- Contains special characters that need cleaning

### Expected Output
Parsed data should contain:
```javascript
[
  {
    Date: "23/10/2025",
    Description: "TRANSFER TO EDGE CURRENT ACCOUNT",
    Amount: "-12.92",
    Balance: "4000.00"
  },
  // ... more transactions
]
```

## Date Format
- Format: `DD/MM/YYYY` (UK standard)
- Example: `23/10/2025`
- Auto-detected by `detectDateFormat` utility

## Bank Detection
- Filename pattern: Looks for "santander" in filename
- Content pattern: Looks for "santander" in transaction descriptions
- Account number pattern: `XXXX XXXX XXXX 9185`

## Future Improvements

### PDF Support
To support direct PDF uploads, we would need to:
1. Install PDF parsing library: `npm install pdfjs-dist` or `pdf-parse`
2. Extract text from PDF using library
3. Pass extracted text to existing Santander parser

Example implementation:
```javascript
import * as pdfjsLib from 'pdfjs-dist';

async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
  let text = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(item => item.str).join('\n') + '\n';
  }

  return text;
}
```

### Enhanced Transaction Categorization
- Auto-detect transaction types (Interest, Transfer In, Transfer Out)
- Apply color coding for different transaction types
- Calculate interest earned vs principal changes

### Multi-Bank Support
The parser architecture is designed to support multiple banks:
- Santander: Key-value format (implemented)
- Monzo: CSV with specific columns
- Barclays: OFX format
- HSBC: Multi-column CSV

## Error Handling

### Robust Parsing
- Skips empty lines and header lines
- Handles missing fields gracefully
- Cleans special characters automatically
- Validates minimum transaction requirements (Date + either Amount or Balance)

### User Feedback
- Clear progress indicators during parsing
- Specific error messages for unsupported formats
- Helpful guidance for PDF files
- Preview of parsed data before confirmation

## Integration

### Data Flow
1. `UnifiedSavingsUploader.js` - File upload and parsing
2. `SavingsColumnMapper.js` - Field mapping confirmation
3. `SavingsTracker.js` - Data storage and visualization
4. Firestore: `savingsAccounts/{userId}` collection

### Auto-Mapping
The parsed Santander data uses standard field names that are automatically detected:
- Date → date column
- Amount → amount column
- Balance → balance column
- Description → description column

User rarely needs to adjust mappings for Santander files.

## Known Limitations

1. **PDF files not supported** - User must export to TXT first
2. **Special characters** - Some unicode characters are stripped during cleaning
3. **Account detection** - Relies on filename or content mentions of "santander"
4. **Date format** - Assumes DD/MM/YYYY format (UK standard)

## Related Files

- `/src/modules/UnifiedSavingsUploader.js` - Main parser implementation
- `/src/modules/SavingsColumnMapper.js` - Field mapping UI
- `/src/modules/utils/columnDetection.js` - Bank and field detection
- `/src/modules/utils/detectDateFormat.js` - Date format detection
- `/src/pages/SavingsTracker.js` - Parent component integration

---

**Last Updated**: October 2025
**Status**: Production Ready (TXT files only)
