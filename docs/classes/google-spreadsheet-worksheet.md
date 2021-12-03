_Class Reference_

# GoogleSpreadsheetWorksheet

> **This class represents an individual worksheet/sheet in a spreadsheet doc - [Sheets](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/sheets)**
  <br>
  Provides methods to interact with sheet metadata and acts as the gateway to interacting the data it contains

?> Google's v4 api refers to these as "**sheets**" but we prefer their v3 api terminology of "**worksheets**" as the distinction from "spreadsheets" is more clear.

## Initialization

You do not initialize worksheets directly. Instead you can load the sheets from a doc. For example:

```javascript
const doc = new GoogleSpreadsheet('<YOUR-DOC-ID>');
await doc.loadInfo(); // loads sheets

const newSheet = await doc.addSheet(); // adds a new sheet
const firstSheet = doc.sheetsByIndex[0]; // in the order they appear on the sheets UI
const otherSheet = doc.sheetsById[123]; // accessible via ID if you already know it
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
`headerRowIndex`|Number|-|Optionally set custom header row index, if headers are not in first row<br>NOTE - not zero-indexed

- ✨ **Side effects** - `sheet.headerValues` is populated

#### `setHeaderRow(headerValues, headerRowIndex)` (async) :id=fn-setHeaderRow
> Set the header row (usually first) of the sheet

Param|Type|Required|Description
---|---|---|---
`headerValues`|[String]|✅|Array of strings to set as cell values in first row
`headerRowIndex`|Number|-|Optionally set custom header row index, if headers are not in first row<br>NOTE - not zero-indexed

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
`options.limit`|Number<br>_int > 0_|-|Max number of rows to fetch

- ↩️ **Returns** - [[GoogleSpreadsheetRow](classes/google-spreadsheet-row)] (in a promise)

!> The older version of this module allowed you to filter and order the rows as you fetched them, but this is no longer supported by google


### Working With Cells

The cell-based interface lets you load and update individual cells in a sheeet, including things like the formula and formatting within those cells. It is more feature rich, but tends to be more awkward to use for many simple use cases.

#### `loadCells(filters)` (async) :id=fn-loadCells
> Fetch cells from google

You can filter the cells you want to fetch in several ways. See [Data Filters](https://developers.google.com/sheets/api/reference/rest/v4/DataFilter) for more info. Strings are treated as A1 ranges, objects are detected to be a [GridRange](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#GridRange) with sheetId not required.

**NOTE - if using an API key (read-only access), only A1 ranges are supported**

```javascript
await sheet.loadCells(); // no filter - will load ALL cells in the sheet
await sheet.loadCells('B2:D5'); // A1 range
await sheet.loadCells({ // GridRange object
  startRowIndex: 5, endRowIndex: 100, startColumnIndex:0, endColumnIndex: 200
});
await sheet.loadCells({ startRowIndex: 50 }); // not all props required
await sheet.loadCells(['B2:D5', 'B50:D55']); // can pass an array of filters
```

Param|Type|Required|Description
---|---|---|---
`filters`|*|-|Can be a single filter or array of filters

- ✨ **Side effects** - cells are loaded in the doc, `cellStats` is updated


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
`mergeType`|String (enum)<br>[MergeType](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#MergeType)|-|defaults to MERGE_ALL

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
| `inheritFromBefore` | Boolean<br>_default true_ | - | If true, tells the API to give the new columns or rows the same properties as the prior row or column<br>NOTE - defaults to false if inserting in first row/column  |

- ✨ **Side effects** - new row(s) or column(s) are inserted into the sheet
- 🚨 **Warning** - Does not update cached rows/cells, so be sure to reload rows/cells before trying to make any updates to sheet contents


### Developer Metadata

#### `createDeveloperMetadata(metadataKey, metadataValue, visibility, metadataId)` (async) :id=fn-createSheetDeveloperMetadata
> Add a new developer metadata object to the sheet

Param|Type|Required|Description
---|---|---|---
`metadataKey`|String|✅|The metadata key
`metadataValue`|String|✅|Data associated with the metadata's key
`visibility`|String|-|Limits the visibility selected developer metadata<br>_One of (PROJECT or DOCUMENT) - defaults to unspecified_
`metadataId`|Integer|-|Spreadsheet-scoped unique ID that identifies the metadata<br>_autogenerated by google if empty_


### Other

#### `clear()` (async) :id=fn-clear
> Clear all data/cells in the sheet

- ✨ **Side Effects -** clears the entire sheet, resets local cache

#### `delete()` (async) :id=fn-delete
> Delete this sheet

- ✨ **Side Effects -** sheet is deleted and removed from `doc.sheetsById` and `doc.sheetsByIndex`

_also available as `sheet.del()`_

#### `copyToSpreadsheet(destinationSpreadsheetId)` (async) :id=fn-copyToSpreadsheet
> Copy this sheet to another document

Param|Type|Required|Description
---|---|---|---
`destinationSpreadsheetId`|String|✅|ID of another spreadsheet document

- ✨ **Side Effects -** sheet is copied to the other doc

?> The authentication method being used must have access to the destination document as well

