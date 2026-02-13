_Class Reference_

# GoogleSpreadsheetWorksheet

> **This class represents an individual worksheet/sheet in a spreadsheet doc - [Sheets](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/sheets)**
  <br>
  Provides methods to interact with sheet metadata and acts as the gateway to interacting the data it contains

?> Google's v4 api refers to these as "**sheets**" but we prefer their v3 api terminology of "**worksheets**" as the distinction from "spreadsheets" is more clear.

## Initialization

You do not initialize worksheets directly. Instead you can load the sheets from a doc. For example:

```javascript
const doc = new GoogleSpreadsheet('<YOUR-DOC-ID>', auth);
await doc.loadInfo(); // loads sheets and other document metadata

const firstSheet = doc.sheetsByIndex[0]; // in the order they appear on the sheets UI
const sheet123 = doc.sheetsById[123]; // accessible via ID if you already know it

const newSheet = await doc.addSheet(); // adds a new sheet
```

## Properties

### Basic Sheet Properties

Basic properties about the sheet are available once the sheet is loaded from the `doc.loadInfo()` call. Much of this information is refreshed during various API interactions. These properties are not editable directly. Instead to update them, use the `sheet.updateProperties()` method

See [official google docs](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/sheets#sheetproperties) for more details.

Property|Type|Description
---|---|---
`sheetId`|String|Sheet ID<br>_set during creation, not editable_
`title`|String|The name of the sheet
`index`|Number<br>_int >= 0_|The index of the sheet within the spreadsheet
`sheetType`|String (enum)<br>[SheetType](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/sheets#SheetType)|The type of sheet<br>_set during creation, not editable_
`gridProperties`|Object<br>[GridProperties](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/sheets#GridProperties)|Additional properties of the sheet if this sheet is a grid
`hidden`|Boolean|True if the sheet is hidden in the UI, false if it's visible
`tabColor`|Object<br>[Color](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#Color)|The color of the tab in the UI
`rightToLeft`|Boolean|True if the sheet is an RTL sheet instead of an LTR sheet

?> Use [`sheet.updateProperties()`](#fn-updateProperties) to update these props


### Sheet Dimensions & Stats

Property|Type|Description
---|---|---
`rowCount`|Number<br>_int > 1_|Number of rows in the sheet
`columnCount`|Number<br>_int > 1_|Number of columns in the sheet
`cellStats`|Object|Stats about cells in the sheet
`cellStats.total`|Number<br>_int >= 0_|Total number of cells in the sheet<br>_should equal rowCount * columnCount_
`cellStats.loaded`|Number<br>_int >= 0_|Number of cells that are loaded locally
`cellStats.nonEmpty`|Number<br>_int >= 0_|Number of loaded cells that are not empty

?> Use [`sheet.resize()`](#fn-resize) to update the sheet dimensions


## Methods

### Working With Rows

The row-based interface is provided as a simplified way to deal with sheets that are being used like a database (first row is column headers). In some situations it is much simpler to use, but it comes with many limitations, so beware.

Also note that the row-based API and cell-based API are isolated from each other, meaning when you load a set of rows, the corresponding cells are not loaded as well. You usually want to use one or the other.

#### `loadHeaderRow(headerRowIndex)` (async) :id=fn-loadHeaderRow
> Loads the header row (usually first) of the sheet

Usually this is called automatically when loading rows via `getRows()` if the header row has not yet been loaded. However you should call this explicitly if you want to load a header row that is not the first row of the sheet.

Param|Type|Required|Description
---|---|---|---
`headerRowIndex`|Number<br>_int >= 1_|-|Optionally set custom header row index, if headers are not in first row<br>NOTE - not zero-indexed, 1 = first

- ✨ **Side effects** - `sheet.headerValues` is populated

#### `setHeaderRow(headerValues, headerRowIndex)` (async) :id=fn-setHeaderRow
> Set the header row (usually first) of the sheet

Param|Type|Required|Description
---|---|---|---
`headerValues`|[String]|✅|Array of strings to set as cell values in first row
`headerRowIndex`|Number<br>_int >= 1_|-|Optionally set custom header row index, if headers are not in first row<br>NOTE - not zero-indexed, 1 = first

- ✨ **Side effects** - header row of the sheet is filled, `sheet.headerValues` is populated

#### `addRow(rowValues, options)` (async) :id=fn-addRow
> Append a new row to the sheet

Param|Type|Required|Description
---|---|---|---
`rowValues`<br>_option 1_|Object|✅|Object of cell values, keys are based on the header row<br>_ex: `{ col1: 'val1', col2: 'val2', ... }`_
`rowValues`<br>_option 2_|Array|✅|Array of cell values in order from first column onwards<br>_ex: `['val1', 'val2', ...]`_
`options`|Object|-|Options object
`options.raw`|Boolean|-|Store raw values instead of converting as if typed into the sheets UI<br>_see [ValueInputOption](https://developers.google.com/sheets/api/reference/rest/v4/ValueInputOption)_
`options.insert`|Boolean|-|Insert new rows instead of overwriting empty rows and only adding if necessary<br>_see [InsertDataOption](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/append#InsertDataOption)_


- ↩️ **Returns** - [GoogleSpreadsheetRow](classes/google-spreadsheet-row) (in a promise)
- ✨ **Side effects** - row is added to the sheet


#### `addRows(arrayOfRowValues, options)` (async) :id=fn-addRows
> Append multiple new rows to the sheet at once

Param|Type|Required|Description
---|---|---|---
`arrayOfRowValues`|Array|✅|Array of rows values to append to the sheet<br>_see [`sheet.addRow()`](#fn-addRow) above for more info_
`options`|Object|-|Inserting options<br>_see [`sheet.addRow()`](#fn-addRow) above for more info_


- ↩️ **Returns** - [[GoogleSpreadsheetRow](classes/google-spreadsheet-row)] (in a promise)
- ✨ **Side effects** - rows are added to the sheet


#### `getRows(options)` (async) :id=fn-getRows
> Fetch rows from the sheet

Param|Type|Required|Description
---|---|---|---
`options`|Object|-|Options object
`options.offset`|Number<br>_int >= 0_|-|How many rows to skip from the top
`options.limit`|Number<br>_int >= 1_|-|Max number of rows to fetch

- ↩️ **Returns** - [[GoogleSpreadsheetRow](classes/google-spreadsheet-row)] (in a promise)

!> The older version of this module allowed you to filter and order the rows as you fetched them, but this is no longer supported by google


#### `clearRows(options)` (async) :id=fn-clearRows
> Clear rows in the sheet

By default, this will clear all rows and leave the header (and anything above it) intact, but you can pass in start and/or end to limit which rows are cleared.

Param|Type|Required|Description
---|---|---|---
`options`|Object|-|Options object
`options.start`|Number<br>_int >= 1_|-|A1 style row number of first row to clear<br>_defaults to first non-header row_
`options.end`|Number<br>_int >= 1_|-|A1 style row number of last row to clear<br>_defaults to last row_

- ✨ **Side effects** - rows in the sheet are emptied, loaded GoogleSpreadsheetRows in the cache have the data cleared


### Working With Cells

The cell-based interface lets you load and update individual cells in a sheeet, including things like the formula and formatting within those cells. It is more feature rich, but tends to be more awkward to use for many simple use cases.

#### `loadCells(filters)` (async) :id=fn-loadCells
> Fetch cells from google

!> This method does not return the cells it loads, instead they are kept in a local cache managed by the sheet. See methods below (`getCell` and `getCellByA1`) to access them.

You can filter the cells you want to fetch in several ways. See [Data Filters](https://developers.google.com/sheets/api/reference/rest/v4/DataFilter) for more info. Strings are treated as A1 ranges, objects are detected to be a [GridRange](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#GridRange) with sheetId not required.

```javascript
await sheet.loadCells(); // no filter - will load ALL cells in the sheet
await sheet.loadCells('B2:D5'); // A1 range
await sheet.loadCells({ // GridRange object
  startRowIndex: 5, endRowIndex: 100, startColumnIndex:0, endColumnIndex: 200
});
await sheet.loadCells({ startRowIndex: 50 }); // not all props required
await sheet.loadCells(['B2:D5', 'B50:D55']); // can pass an array of filters
```

!> If using an API key (read-only access), only A1 ranges are supported

Param|Type|Required|Description
---|---|---|---
`filters`|*|-|Can be a single filter or array of filters

- ✨ **Side effects** - cells are loaded into local cache, `cellStats` is updated


#### `getCell(rowIndex, columnIndex)` :id=fn-getCell
> retrieve a cell from the cache based on zero-indexed row/column

Param|Type|Required|Description
---|---|---|---
`rowIndex`|Number<br>_int >= 0_|✅|Row of the cell
`columnIndex`|Number<br>_int >= 0_|✅|Column of the cell to retrieve

- ↩️ **Returns** - [GoogleSpreadsheetCell](classes/google-spreadsheet-cell)


#### `getCellByA1(a1Address)` :id=fn-getCellByA1
> retrieve a cell from the cache based on A1 address

Param|Type|Required|Description
---|---|---|---
`a1Address`|String|✅|Address of the cell<br>_ex: "B5"_

- ↩️ **Returns** - [GoogleSpreadsheetCell](classes/google-spreadsheet-cell)


#### `saveUpdatedCells()` (async) :id=fn-saveUpdatedCells
> saves all cells in the sheet that have unsaved changes

!> NOTE - this method will only save changes made using the cell-based methods described here, not the row-based ones described above

- ✨ **Side effects** - cells are saved, data refreshed from google

#### `saveCells(cells)` (async) :id=fn-saveCells
> saves specific cells

Param|Type|Required|Description
---|---|---|---
`cells`|[[GoogleSpreadsheetCell](classes/google-spreadsheet-cell)]|✅|Array of cells to save

- 🚨 **Warning** - At least one cell must have something to save
- ✨ **Side effects** - cells are saved, data refreshed from google

?> Usually easier to just use `sheet.saveUpdatedCells`


#### `resetLocalCache(dataOnly)` :id=fn-resetLocalCache
> Reset local cache of properties and cell data

Param|Type|Required|Description
---|---|---|---
`dataOnly`|Boolean|-|If true, only affects data, not properties

- ✨ **Side effects** - cache is emptied so props and cells must be re-fetched

#### `mergeCells(range, mergeType)` (async) :id=fn-mergeCells
> merge cells together

Param|Type|Required|Description
---|---|---|---
`range`|Object<br>[GridRange](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#GridRange)|✅|Range of cells to merge, sheetId not required!
`mergeType`|String (enum)<br>[MergeType](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#MergeType)|-|_defaults to `MERGE_ALL`_

- 🚨 **Warning** - Reading values from merged cells other than the top-left one will show a null value

#### `unmergeCells(range)` (async) :id=fn-unmergeCells
> split merged cells

Param|Type|Required|Description
---|---|---|---
`range`|Object<br>[GridRange](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#GridRange)]|✅|Range of cells to unmerge, sheetId not required!

### Updating Sheet Properties

#### `updateProperties(props)` (async) :id=fn-updateProperties
> Update basic sheet properties

For example: `await sheet.updateProperties({ title: 'New sheet title' });`<br>
See [basic sheet properties](#basic-sheet-properties) above for props documentation.

- ✨ **Side Effects -** props are updated

#### `resize(props)` (async) :id=fn-resize
> Update grid properties / dimensions

Just a shorcut for `(props) => sheet.updateProperties({ gridProperties: props })`<br>
Example: `await sheet.resize({ rowCount: 1000, columnCount: 20 });`

- ✨ **Side Effects -** grid properties / dimensions are updated

_also available as `sheet.updateGridProperties()`_

#### `updateDimensionProperties(columnsOrRows, props, bounds)` (async) :id=fn-updateDimensionProperties
> Update sheet "dimension properties"

Param|Type|Required|Description
---|---|---|---
`columnsOrRows`|String (enum)<br>_"COLUMNS" or "ROWS"_|✅|Which dimension
`props`|Object<br>[DimensionProperties](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/sheets#DimensionProperties)|✅|properties to update
`bounds`|Object|-|
`bounds.startIndex`|Number<br>_int >= 0_|-|Start row/column
`bounds.endIndex`|Number<br>_int >= 0_|-|End row/column

- ✨ **Side effects** - sheet is updated

#### `insertDimension(columnsOrRows, range, inheritFromBefore)` (async) :id=fn-insertDimension

> Update sheet "dimension properties"

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `columnsOrRows` | String (enum)<br>_"COLUMNS" or "ROWS"_ | ✅ | Which dimension |
| `range` | Object | ✅ |
| `range.startIndex` | Number<br>_int >= 0_ | ✅ | Start row/column (inclusive) |
| `range.endIndex` | Number<br>_int >= 1_ | ✅ | End row/column (exclusive), must be greater than startIndex |
| `inheritFromBefore` | Boolean | - | If true, tells the API to give the new columns or rows the same properties as the prior row or column<br><br>_defaults to true, unless inserting in first row/column_ |

- ✨ **Side effects** - new row(s) or column(s) are inserted into the sheet
- 🚨 **Warning** - Does not update cached rows/cells, so be sure to reload rows/cells before trying to make any updates to sheet contents

#### `insertRange(range, shiftDimension)` (async) :id=fn-insertRange
> Insert empty cells in a range, shifting existing cells in the specified direction

Param|Type|Required|Description
---|---|---|---
`range`|Object<br>[GridRange](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#GridRange)|✅|The range to insert new cells into, sheetId not required
`shiftDimension`|String (enum)<br>_"COLUMNS" or "ROWS"_|✅|Which direction to shift existing cells - ROWS shifts down, COLUMNS shifts right

- ✨ **Side effects** - new empty cells are inserted and existing cells are shifted
- 🚨 **Warning** - Does not update cached rows/cells, so be sure to reload rows/cells before trying to make any updates to sheet contents

#### `deleteDimension(columnsOrRows, rangeIndexes)` (async) :id=fn-deleteDimension
> Delete rows or columns in a given range

Param|Type|Required|Description
---|---|---|---
`columnsOrRows`|String (enum)<br>_"COLUMNS" or "ROWS"_|✅|Which dimension to delete
`rangeIndexes`|Object|✅|
`rangeIndexes.startIndex`|Number<br>_int >= 0_|✅|Start row/column (inclusive)
`rangeIndexes.endIndex`|Number<br>_int >= 1_|✅|End row/column (exclusive), must be greater than startIndex

- ✨ **Side effects** - row(s) or column(s) are deleted from the sheet, cached rows and cells are automatically updated

#### `deleteRows(startIndex, endIndex)` (async) :id=fn-deleteRows
> Delete rows by index

Convenience wrapper around `deleteDimension` for deleting rows.

Param|Type|Required|Description
---|---|---|---
`startIndex`|Number<br>_int >= 0_|✅|Start row index (inclusive, 0-based)
`endIndex`|Number<br>_int >= 1_|✅|End row index (exclusive)

- ✨ **Side effects** - row(s) are deleted from the sheet, cached rows and cells are automatically updated

#### `deleteColumns(startIndex, endIndex)` (async) :id=fn-deleteColumns
> Delete columns by index

Convenience wrapper around `deleteDimension` for deleting columns.

Param|Type|Required|Description
---|---|---|---
`startIndex`|Number<br>_int >= 0_|✅|Start column index (inclusive, 0-based)
`endIndex`|Number<br>_int >= 1_|✅|End column index (exclusive)

- ✨ **Side effects** - column(s) are deleted from the sheet, cached cells are automatically updated

#### `autoResizeDimensions(columnsOrRows, rangeIndexes?)` (async) :id=fn-autoResizeDimensions
> Auto-resize rows or columns to fit their contents (equivalent to "Fit to data" in the UI)

Param|Type|Required|Description
---|---|---|---
`columnsOrRows`|String (enum)<br>_"COLUMNS" or "ROWS"_|✅|Which dimension to auto-resize
`rangeIndexes`|Object|-|Optional start/end indexes to limit which rows/columns are resized
`rangeIndexes.startIndex`|Number<br>_int >= 0_|-|Start row/column (inclusive)
`rangeIndexes.endIndex`|Number<br>_int >= 1_|-|End row/column (exclusive)

- ✨ **Side effects** - rows or columns are resized to fit their content

#### `pasteData(coordinate, data, delimiter, type)` (async) :id=fn-pasteData
> Inserts data into the spreadsheet starting at the specified coordinate

Param|Type|Required|Description
---|---|---|---
`coordinate`|Object<br>[GridCoordinate](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#GridCoordinate)|✅|The coordinate at which the data should start being inserted, sheetId not required
`coordinate.rowIndex`|Number<br>_int >= 0_|✅|The row index (0-based)
`coordinate.columnIndex`|Number<br>_int >= 0_|✅|The column index (0-based)
`data`|String|✅|The data to insert
`delimiter`|String|✅|The delimiter in the data (e.g., ',' for CSV, '\t' for TSV)
`type`|String (enum)<br>[PasteType](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#PasteType)|-|How the data should be pasted. _defaults to `PASTE_NORMAL`_

- ✨ **Side effects** - data is inserted into the sheet at the specified coordinate
- 🚨 **Warning** - Does not update cached rows/cells, so be sure to reload rows/cells before trying to access the newly pasted data

#### `appendDimension(dimension, length)` (async) :id=fn-appendDimension
> Appends rows or columns to the end of a sheet

Param|Type|Required|Description
---|---|---|---
`dimension`|String (enum)<br>_"COLUMNS" or "ROWS"_|✅|Whether rows or columns should be appended
`length`|Number<br>_int >= 1_|✅|The number of rows or columns to append

- ✨ **Side effects** - rows or columns are appended to the end of the sheet

#### `deleteDimension(dimension, rangeIndexes)` (async) :id=fn-deleteDimension
> Deletes rows or columns from a sheet

Param|Type|Required|Description
---|---|---|---
`dimension`|String (enum)<br>_"COLUMNS" or "ROWS"_|✅|Whether to delete rows or columns
`rangeIndexes`|Object|✅|
`rangeIndexes.startIndex`|Number<br>_int >= 0_|✅|Start row/column (inclusive)
`rangeIndexes.endIndex`|Number<br>_int >= 1_|✅|End row/column (exclusive)

- ✨ **Side effects** - rows or columns are deleted from the sheet
- 🚨 **Warning** - Does not update cached rows/cells, so be sure to reload rows/cells before accessing sheet contents

#### `moveDimension(dimension, source, destinationIndex)` (async) :id=fn-moveDimension
> Moves rows or columns to a different position within the sheet

Param|Type|Required|Description
---|---|---|---
`dimension`|String (enum)<br>_"COLUMNS" or "ROWS"_|✅|Whether to move rows or columns
`source`|Object|✅|
`source.startIndex`|Number<br>_int >= 0_|✅|Start row/column to move (inclusive)
`source.endIndex`|Number<br>_int >= 1_|✅|End row/column to move (exclusive)
`destinationIndex`|Number<br>_int >= 0_|✅|Where to move them (calculated before removal)

- ✨ **Side effects** - rows or columns are moved to a new position
- 🚨 **Warning** - Does not update cached rows/cells, so be sure to reload rows/cells before accessing sheet contents

#### `deleteRange(range, shiftDimension)` (async) :id=fn-deleteRange
> Deletes a range of cells and shifts remaining cells

Param|Type|Required|Description
---|---|---|---
`range`|Object<br>[GridRange](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#GridRange)|✅|The range of cells to delete, sheetId not required
`shiftDimension`|String (enum)<br>_"COLUMNS" or "ROWS"_|✅|How remaining cells should shift (ROWS = up, COLUMNS = left)

- ✨ **Side effects** - cells are deleted and remaining cells are shifted
- 🚨 **Warning** - Does not update cached rows/cells, so be sure to reload rows/cells before accessing sheet contents

#### `textToColumns(source, delimiterType, delimiter)` (async) :id=fn-textToColumns
> Splits a column of text into multiple columns based on a delimiter

Param|Type|Required|Description
---|---|---|---
`source`|Object<br>[GridRange](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#GridRange)|✅|The column to split (must span exactly one column), sheetId not required
`delimiterType`|String (enum)<br>[DelimiterType](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#DelimiterType)|✅|Type of delimiter (COMMA, SEMICOLON, PERIOD, SPACE, CUSTOM, AUTODETECT)
`delimiter`|String|-|Custom delimiter character (only used when delimiterType is CUSTOM)

- ✨ **Side effects** - text in cells is split into multiple columns
- 🚨 **Warning** - Does not update cached rows/cells, so be sure to reload rows/cells before accessing the split data

#### `sortRange(range, sortSpecs)` (async) :id=fn-sortRange
> Sorts data in rows based on sort order per column

Param|Type|Required|Description
---|---|---|---
`range`|Object<br>[GridRange](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#GridRange)|✅|The range to sort, sheetId not required
`sortSpecs`|Array of [SortSpec](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#sortspec)|✅|Sort specifications (later specs used when values are equal)
`sortSpecs[].dimensionIndex`|Number<br>_int >= 0_|✅|The column index to sort by
`sortSpecs[].sortOrder`|String (enum)|-|ASCENDING or DESCENDING (defaults to ASCENDING)

- ✨ **Side effects** - rows in the range are reordered based on sort criteria
- 🚨 **Warning** - Does not update cached rows/cells, so be sure to reload rows/cells before accessing sorted data

#### `trimWhitespace(range)` (async) :id=fn-trimWhitespace
> Trims whitespace from the start and end of each cell's text

Param|Type|Required|Description
---|---|---|---
`range`|Object<br>[GridRange](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#GridRange)|✅|The range whose cells to trim, sheetId not required

- ✨ **Side effects** - whitespace is removed from cell text
- 🚨 **Warning** - Does not update cached rows/cells, so be sure to reload rows/cells before accessing trimmed data

#### `deleteDuplicates(range, comparisonColumns)` (async) :id=fn-deleteDuplicates
> Removes duplicate rows from a range based on specified columns

Param|Type|Required|Description
---|---|---|---
`range`|Object<br>[GridRange](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#GridRange)|✅|The range to remove duplicates from, sheetId not required
`comparisonColumns`|Array of [DimensionRange](https://developers.google.com/sheets/api/reference/rest/v4/DimensionRange)|-|Columns to check for duplicates (if empty, all columns are used)

- ✨ **Side effects** - duplicate rows are removed (first occurrence is kept)
- 🚨 **Warning** - Does not update cached rows/cells, so be sure to reload rows/cells before accessing sheet contents

#### `copyPaste(source, destination, pasteType, pasteOrientation)` (async) :id=fn-copyPaste
> Copies data from a source range and pastes it to a destination range

Param|Type|Required|Description
---|---|---|---
`source`|Object<br>[GridRange](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#GridRange)|✅|The source range to copy from, sheetId not required
`destination`|Object<br>[GridRange](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#GridRange)|✅|The destination range to paste to, sheetId not required
`pasteType`|String (enum)<br>[PasteType](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#PasteType)|-|What kind of data to paste. _defaults to `PASTE_NORMAL`_
`pasteOrientation`|String (enum)|-|NORMAL or TRANSPOSE. _defaults to `NORMAL`_

- ✨ **Side effects** - data is copied to the destination range
- 🚨 **Warning** - Does not update cached rows/cells, so be sure to reload rows/cells before accessing pasted data

#### `cutPaste(source, destination, pasteType)` (async) :id=fn-cutPaste
> Cuts data from a source range and pastes it to a destination coordinate

Param|Type|Required|Description
---|---|---|---
`source`|Object<br>[GridRange](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#GridRange)|✅|The source range to cut from, sheetId not required
`destination`|Object<br>[GridCoordinate](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#GridCoordinate)|✅|The top-left coordinate where data should be pasted, sheetId not required
`destination.rowIndex`|Number<br>_int >= 0_|✅|The row index (0-based)
`destination.columnIndex`|Number<br>_int >= 0_|✅|The column index (0-based)
`pasteType`|String (enum)<br>[PasteType](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#PasteType)|-|What kind of data to paste. _defaults to `PASTE_NORMAL`_

- ✨ **Side effects** - data is moved from source to destination
- 🚨 **Warning** - Does not update cached rows/cells, so be sure to reload rows/cells before accessing moved data

#### `autoFill(rangeOrSource, useAlternateSeries)` (async) :id=fn-autoFill
> Auto-fills cells with data following a pattern (like dragging the fill handle)

Param|Type|Required|Description
---|---|---|---
`rangeOrSource`|Object ([GridRange](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#GridRange) or [SourceAndDestination](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#SourceAndDestination))|✅|Either a range (auto-detects source) or explicit source/destination spec, sheetId not required
`useAlternateSeries`|Boolean|-|Whether to generate data with the alternate series

- ✨ **Side effects** - cells are filled with pattern-based data
- 🚨 **Warning** - Does not update cached rows/cells, so be sure to reload rows/cells before accessing filled data

#### `repeatCell(range, cell, fields)` (async) :id=fn-repeatCell
> Updates all cells in a range with the same cell data

Param|Type|Required|Description
---|---|---|---
`range`|Object<br>[GridRange](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#GridRange)|✅|The range to update, sheetId not required
`cell`|Object<br>[CellData](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/cells#CellData)|✅|The cell data to repeat across the range
`fields`|String (FieldMask)|✅|Which fields to update (use "*" for all fields)

- ✨ **Side effects** - all cells in range are updated with the same data
- 🚨 **Warning** - Does not update cached rows/cells, so be sure to reload rows/cells before accessing updated data

#### `appendCells(rows, fields)` (async) :id=fn-appendCells
> Appends cells after the last row with data in a sheet

Param|Type|Required|Description
---|---|---|---
`rows`|Array of [RowData](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/cells#RowData)|✅|The row data to append
`fields`|String (FieldMask)|✅|Which fields to update (use "*" for all fields)

- ✨ **Side effects** - new rows are appended to the sheet
- 🚨 **Warning** - Does not update cached rows/cells, so be sure to reload rows/cells before accessing appended data

#### `findReplace(find, replacement, options, range)` (async) :id=fn-findReplace
> Finds and replaces text in cells

Param|Type|Required|Description
---|---|---|---
`find`|String|✅|The value to search for
`replacement`|String|✅|The value to use as replacement
`options`|Object|-|Search options
`options.matchCase`|Boolean|-|True if the search is case sensitive
`options.matchEntireCell`|Boolean|-|True if the find value should match the entire cell
`options.searchByRegex`|Boolean|-|True if the find value is a regex
`options.includeFormulas`|Boolean|-|True if the search should include cells with formulas
`range`|Object<br>[GridRange](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#GridRange)|-|Optional range to search in (defaults to entire sheet), sheetId not required

- ✨ **Side effects** - matching text is replaced in cells
- 🚨 **Warning** - Does not update cached rows/cells, so be sure to reload rows/cells before accessing modified data

#### `randomizeRange(range)` (async) :id=fn-randomizeRange
> Randomizes the order of rows in a range

Param|Type|Required|Description
---|---|---|---
`range`|Object<br>[GridRange](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#GridRange)|✅|The range to randomize, sheetId not required

- ✨ **Side effects** - rows in the range are shuffled randomly
- 🚨 **Warning** - Does not update cached rows/cells, so be sure to reload rows/cells before accessing randomized data

### Other

#### `clear(a1Range)` (async) :id=fn-clear
> Clear data/cells in the sheet

Defaults to clearing the entire sheet, or pass in a specific a1 range

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `a1Range` | String (A1 range) | - | Optional specific range within the sheet to clear |

- ✨ **Side Effects -** clears the sheet (entire sheet or specified range), resets local cache

#### `delete()` (async) :id=fn-delete
> Delete this sheet

- ✨ **Side Effects -** sheet is deleted and removed from `doc.sheetsById`, `doc.sheetsByIndex`, `doc.sheetsById`

_also available as `sheet.del()`_

#### `duplicate(options)` (async) :id=fn-duplicate
> Duplicate this sheet within this document

|Param|Type|Required|Description
|---|---|---|---
| `options` | Object | - |
| `options.title` | String | - | Name/title for new sheet, must be unique within the document<br>_defaults to something like "Copy of [sheet.title]" if not provided_ |
| `options.index` | Number<br>_int >= 0_ | - | Where to insert the new sheet (zero-indexed)<br>_defaults to 0 (first)_ |
| `options.id` | Number<br>_int >= 1_ | - | unique ID to use for new sheet<br>_defaults to new unique id generated by google_ |

- ↩️ **Returns** - [GoogleSpreadsheetRow](classes/google-spreadsheet-row) (in a promise)
- ✨ **Side Effects -** new sheet is creted, sheets in parent doc are updated (`sheetsByIndex`, `sheetsByTitle`, `sheetsById`)

#### `copyToSpreadsheet(destinationSpreadsheetId)` (async) :id=fn-copyToSpreadsheet
> Copy this sheet to a different document

Param|Type|Required|Description
---|---|---|---
`destinationSpreadsheetId`|String|✅|ID of another spreadsheet document

- ✨ **Side Effects -** sheet is copied to the other doc

?> The authentication method being used must have write access to the destination document as well


#### `setDataValidation(range, rule)` (async) :id=fn-setDataValidation
> Sets a data validation rule to every cell in the range

Param|Type|Required|Description
---|---|---|---
`range`|Object<br>[GridRange](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#GridRange)|✅|Range of cells to apply the rule to, sheetId not required!
`rule`|Object<br>[DataValidationRule](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/cells#DataValidationRule)<br>or `false`|✅|Object describing the validation rule<br/>Or `false` to unset the rule


### Protected Ranges

#### `protectedRanges` :id=prop-protectedRanges
> The list of protected ranges on this sheet, populated after calling `loadInfo()`

- ↩️ **Returns** - Array of [ProtectedRange](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/sheets#ProtectedRange) objects, or `null` if not yet loaded

#### `addProtectedRange(protectedRange)` (async) :id=fn-addProtectedRange
> Add a new protected range to the sheet

Param|Type|Required|Description
---|---|---|---
`protectedRange`|Object<br>[ProtectedRange](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/sheets#ProtectedRange)|✅|The protected range to add. Must include either `range` or `namedRangeId`. The `protectedRangeId` field is optional; if not set, an ID will be auto-generated.

- ↩️ **Returns** - response from the API including the created protected range

#### `updateProtectedRange(protectedRangeId, protectedRange)` (async) :id=fn-updateProtectedRange
> Update an existing protected range

Param|Type|Required|Description
---|---|---|---
`protectedRangeId`|Number|✅|ID of the protected range to update
`protectedRange`|Object<br>Partial [ProtectedRange](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/sheets#ProtectedRange)|✅|The properties to update (field mask is auto-generated)

- ↩️ **Returns** - response from the API including the updated protected range

#### `deleteProtectedRange(protectedRangeId)` (async) :id=fn-deleteProtectedRange
> Delete a protected range by ID

Param|Type|Required|Description
---|---|---|---
`protectedRangeId`|Number|✅|ID of the protected range to delete

### Named Ranges

#### `addNamedRange(name, range, namedRangeId)` (async) :id=fn-addNamedRange
> Create a new named range in this worksheet (convenience method that auto-fills sheetId)

Param|Type|Required|Description
---|---|---|---
`name`|String|✅|Name of the new named range
`range`|Object<br>[GridRange](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#GridRange)|✅|Range for the named range, sheetId not required
`namedRangeId`|String|-|Optional ID for the named range

- ↩️ **Returns** - response from the API including the created named range
- ✨ **Side effects** - named range is added to the document

#### `updateNamedRange(namedRangeId, namedRange, fields)` (async) :id=fn-updateNamedRange
> Update an existing named range

Param|Type|Required|Description
---|---|---|---
`namedRangeId`|String|✅|ID of the named range to update
`namedRange`|Object|-|Properties to update
`namedRange.name`|String|-|New name for the named range
`namedRange.range`|Object<br>[GridRange](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#GridRange)|-|New range, sheetId not required
`fields`|String (FieldMask)|✅|Which fields to update (e.g., "name", "range", or "*" for all)

- ↩️ **Returns** - response from the API
- ✨ **Side effects** - named range is updated

#### `deleteNamedRange(namedRangeId)` (async) :id=fn-deleteNamedRange
> Delete a named range (convenience wrapper)

Param|Type|Required|Description
---|---|---|---
`namedRangeId`|String|✅|ID of the named range to delete

- ✨ **Side effects** - named range is removed from the document

### Filters

#### `setBasicFilter(filter)` (async) :id=fn-setBasicFilter
> Sets the basic filter on this sheet

Param|Type|Required|Description
---|---|---|---
`filter`|Object|-|Basic filter configuration
`filter.range`|Object<br>[GridRange](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#GridRange)|-|Range to filter, sheetId not required
`filter.sortSpecs`|Array of [SortSpec](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#sortspec)|-|Sort specifications
`filter.filterSpecs`|Array|-|Filter specifications per column

- ✨ **Side effects** - basic filter is applied to the sheet

#### `clearBasicFilter()` (async) :id=fn-clearBasicFilter
> Clears the basic filter on this sheet

- ✨ **Side effects** - basic filter is removed from the sheet

### Formatting

#### `updateBorders(range, borders)` (async) :id=fn-updateBorders
> Updates borders for a range

Param|Type|Required|Description
---|---|---|---
`range`|Object<br>[GridRange](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#GridRange)|✅|The range whose borders should be updated, sheetId not required
`borders`|Object|-|Border styles
`borders.top`|Object<br>[Border](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#Border)|-|Top border style
`borders.bottom`|Object<br>[Border](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#Border)|-|Bottom border style
`borders.left`|Object<br>[Border](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#Border)|-|Left border style
`borders.right`|Object<br>[Border](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#Border)|-|Right border style
`borders.innerHorizontal`|Object<br>[Border](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#Border)|-|Inner horizontal border style
`borders.innerVertical`|Object<br>[Border](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#Border)|-|Inner vertical border style

- ✨ **Side effects** - borders are updated on the sheet


### Exports

See [Exports guide](guides/exports) for more info.

#### `downloadAsCSV(returnStreamInsteadOfBuffer)` (async) :id=fn-downloadAsCSV
> Export worksheet in CSV format

Param|Type|Required|Description
---|---|---|---
`returnStreamInsteadOfBuffer`|Boolean|-|Set to true to return a stream instead of a Buffer<br/>_See [Exports guide](guides/exports) for more details_

- ↩️ **Returns** - Buffer (or stream) containing CSV data


#### `downloadAsTSV(returnStreamInsteadOfBuffer)` (async) :id=fn-downloadAsTSV
> Export worksheet in TSV format

Param|Type|Required|Description
---|---|---|---
`returnStreamInsteadOfBuffer`|Boolean|-|Set to true to return a stream instead of a Buffer<br/>_See [Exports guide](guides/exports) for more details_

- ↩️ **Returns** - Buffer (or stream) containing TSV data


#### `downloadAsPDF(returnStreamInsteadOfBuffer)` (async) :id=fn-downloadAsPDF
> Export worksheet in PDF format

Param|Type|Required|Description
---|---|---|---
`returnStreamInsteadOfBuffer`|Boolean|-|Set to true to return a stream instead of a Buffer<br/>_See [Exports guide](guides/exports) for more details_

- ↩️ **Returns** - Buffer (or stream) containing PDF data


