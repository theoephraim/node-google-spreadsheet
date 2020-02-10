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

The row-based interface is provided as a simplified way to deal with sheets that are being used like a database (first row is column headers). In some situations it is much easier, but it comes with many limitations, so beware.

#### `loadHeaderRow()` (async) :id=fn-loadHeaderRow
> Loads the header row (first row) of the sheet
_usually do not need to call this directly_
- :sparkles: **Side effects** - `sheet.headerValues` is populated

#### `setHeaderRow(headerValues)` (async) :id=fn-setHeaderRow
> Set the header row (first row) of the sheet

Param|Type|Required|Description
---|---|---|---
`headerValues`|[String]|✅|Array of strings to set as cell values in first row

- :sparkles: **Side effects** - first row of the sheet is filled, `sheet.headerValues` is populated

#### `addRow(values)` (async) :id=fn-addRow
> Append a new row to the sheet

Param|Type|Required|Description
---|---|---|---
`values`|Object|✅|Object of cell values, keys are based on the header row

- :leftwards_arrow_with_hook: **Returns** - [GoogleSpreadsheetRow](classes/google-spreadsheet-row) (in a promise)
- :sparkles: **Side effects** - row is added to the sheet

#### `getRows(options)` (async) :id=fn-getRows
> Fetch rows from the sheet

Param|Type|Required|Description
---|---|---|---
`options`|Object|-|Options object
`options.offset`|Number<br>_int >= 0_|-|How many rows to skip from the top
`options.limit`|Number<br>_int > 0_|-|Max number of rows to fetch

- :leftwards_arrow_with_hook: **Returns** - [[GoogleSpreadsheetRow](classes/google-spreadsheet-row)] (in a promise)
- :sparkles: **Side effects** - row is added to the sheet

!> The older version of this module allowed you to filter and order the rows as you fetched them, but this is no longer supported by google


### Working With Cells

#### `loadCells(filters)` (async) :id=fn-loadCells
> Fetch cells from google

You can filter the cells you want to fetch in several ways.

See [Data Filters](https://developers.google.com/sheets/api/reference/rest/v4/DataFilter) for more info. Strings are treated as A1 ranges, objects are detected to be a [GridRange](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#GridRange) with sheetId not required.

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

- :sparkles: **Side effects** - cells are loaded in the doc, `cellStats` is updated


#### `getCell(rowIndex, columnIndex)` :id=fn-getCell
> retrieve a cell from the cache based on A1 address

Param|Type|Required|Description
---|---|---|---
`rowIndex`|Number<br>_int >= 0_|✅|Row of the cell
`columnIndex`|Number<br>_int >= 0_|✅|Column of the cell to retrieve

- :leftwards_arrow_with_hook: **Returns** - [GoogleSpreadsheetCell](classes/google-spreadsheet-cell)


#### `getCellByA1(a1Address)` :id=fn-getCellByA1
> retrieve a cell from the cache based on A1 address

Param|Type|Required|Description
---|---|---|---
`a1Address`|String|✅|Address of the cell<br>_ex: "B5"_

- :leftwards_arrow_with_hook: **Returns** - [GoogleSpreadsheetCell](classes/google-spreadsheet-cell)


#### `saveUpdatedCells()` (async) :id=fn-saveUpdatedCells
> saves all cells that have unsaved changes

- :sparkles: **Side effects** - cells are saved, data refreshed from google

#### `saveCells(cells)` (async) :id=fn-saveCells
> saves all cells that have unsaved changes

Param|Type|Required|Description
---|---|---|---
`cells`|[[GoogleSpreadsheetCell](classes/google-spreadsheet-cell)]|✅|Array of cells to save

- :sparkles: **Side effects** - cells are saved, data refreshed from google

?> Easier to just use `sheet.saveUpdatedCells`


#### `resetLocalCache(dataOnly)` :id=fn-resetLocalCache
> Reset local cache of properties and cell data

Param|Type|Required|Description
---|---|---|---
`dataOnly`|Boolean|-|If true, only affects data, not properties

- :sparkles: **Side effects** - cache is emptied so props and cells must be re-fetched



### Updating Sheet Properties

#### `updateProperties(props)` (async) :id=fn-updateProperties
> Update basic sheet properties

For example: `await sheet.updateProperties({ title: 'New sheet title' });`<br>
See [basic sheet properties](#basic-sheet-properties) above for props documentation.

- :sparkles: **Side Effects -** props are updated

#### `resize(props)` (async) :id=fn-resize
> Update grid properties / dimensions

Just a shorcut for `(props) => sheet.updateProperties({ gridProperties: props })`<br>
Example: `await sheet.resize({ rowCount: 1000, columnCount: 20 });`

- :sparkles: **Side Effects -** grid properties / dimensions are updated

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

- :sparkles: **Side effects** - sheet is updated


### Other

#### `clear()` (async) :id=fn-clear
> Clear all data/cells in the sheet

- :sparkles: **Side Effects -** clears the entire sheet, resets local cache

#### `delete()` (async) :id=fn-delete
> Delete this sheet

- :sparkles: **Side Effects -** sheet is deleted and removed from `doc.sheetsById` and `doc.sheetsByIndex`

_also available as `sheet.del()`_

#### `copyToSpreadsheet(destinationSpreadsheetId)` (async) :id=fn-copyToSpreadsheet
> Copy this sheet to another document

Param|Type|Required|Description
---|---|---|---
`destinationSpreadsheetId`|String|✅|ID of another spreadsheet document

- :sparkles: **Side Effects -** sheet is copied to the other doc

?> The authentication method being used must have access to the destination document as well

