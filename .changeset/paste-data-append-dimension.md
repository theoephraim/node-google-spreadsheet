---
"google-spreadsheet": minor
---

Add comprehensive data manipulation and convenience methods to GoogleSpreadsheetWorksheet:

**Data Manipulation Methods:**
- pasteData: Insert delimited data at a coordinate
- appendDimension: Append rows or columns to sheet
- textToColumns: Split delimited text into columns
- deleteRange: Delete cells and shift remaining
- deleteDimension: Delete rows or columns
- moveDimension: Move rows or columns
- sortRange: Sort data by columns
- trimWhitespace: Remove leading/trailing spaces
- deleteDuplicates: Remove duplicate rows
- copyPaste: Copy and paste ranges
- cutPaste: Cut and paste ranges
- autoFill: Fill cells with patterns
- repeatCell: Repeat cell data across range
- appendCells: Append cell data to sheet
- findReplace: Find and replace text
- randomizeRange: Randomize row order

**Convenience Wrapper Methods (auto-fill sheetId):**
- addNamedRange: Create named ranges in worksheet
- updateNamedRange: Update existing named ranges
- deleteNamedRange: Delete named ranges
- setBasicFilter: Set basic filter on sheet
- clearBasicFilter: Clear basic filter from sheet
- updateBorders: Update cell borders in range
