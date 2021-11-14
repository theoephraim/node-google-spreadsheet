_Class Reference_

# GoogleSpreadsheetCell

> **This class represents an individual cell in a spreadsheet - [Cells](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/cells)**
  <br>
  Provides methods to read/write the value, formatted value, formula, and cell formatting

## Initialization

You do not initialize cells directly. Instead you can load a range of cells in a worksheet and access them by their A1 style address (ex: "B5") or row/column indices. For example:

```javascript
const doc = new GoogleSpreadsheet('<YOUR-DOC-ID>');
await doc.loadInfo(); // loads sheets
const sheet = doc.sheetsByIndex[0]; // the first sheet
await sheet.loadCells('A1:D5');
const cellA1 = sheet.getCell(0, 0);
const cellC3 = sheet.getCellByA1('C3');
```

## Saving updates

Changes are made locally by just setting props of the cell, but you must save your changes back to google. Usually you will make changes to multiple cells and then call `sheet.saveUpdatedCells()` to save all unsaved changes at once.

Certain properties affect others and new values need to be saved back to google in order to be able to read again. For example, when setting a formula in a cell, we cannot read the value until we save back to google since we do not want to try to recreate the formula logic, and we may not have all the data required even if we could.

```javascript
// continuing from above example ^^
cellA1.note = 'This is cell A1';
cellA1.value = 123.45;
cellA1.textFormat = { bold: true };
cellC3.formula = '=A1';
console.log(cellC3.value); // this will throw an error
await sheet.saveUpdatedCells(); // saves both cells in one API call
console.log(cellC3.value); // 123.45
```

## Properties

### Cell Location
Google uses both row/column indices and A1-style notation, available as **read-only** props:

Property|Type|Description
---|---|---
`rowIndex`|Number<br>_int >= 0_|Row in the sheet this cell is in<br>_first row is 0_
`columnIndex`|Number<br>_int >= 0_|Column in the sheet this cell is in
`a1Row`|Number<br>_int >= 1_|Row number used in A1 addresses<br>_This matches what you see in the UI_
`a1Column`|String|Column letter used in the sheet<br>_starts at A, goes up to Z, then AA..._
`a1Address`|String|Full A1 address of the cell<br>_for example "B5"_

### Cell Value(s)

A cell can contain several layers of information. For example, the cell can contain a formula, which resolves to a value, which is displayed with some formatting applied, plus an additional note. The following props expose this info while simplifiying the inner workings a bit.

Property|Type|Writeable|Description
---|---|---|---
`value`|*|✅|This is the full value in the cell. If there is a formula in the cell, this will be the value the formula resolves to
`valueType`|String|-|The type of the value, using google's terminology<br>_One of `boolValue`, `stringValue`, `numberValue`, `errorValue`_
`formattedValue`|*|-|The value in the cell with [formatting rules](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/cells#numberformat) applied<br>_Ex: value is `123.456`, formattedValue is `$123.46`_
`formula`|String|✅|The formula in the cell (if there is one)
`formulaError`|Error|-|An error with some details if the formula is invalid
`note`|String|✅|The note attached to the cell
`hyperlink`|String<br>_url_|-|URL of the cell's link if it has a`=HYPERLINK` formula<br>_ex: `=HYPERLINK("http://google.com", "google")`_

### Cell Formatting

Formatting related info is returned by google as two nested [CellFormat](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/cells#CellFormat) objects. These are available as **read-only** props:

Property|Type|Description
---|---|---
`userEnteredFormat`|Object<br>[CellFormat](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/cells#CellFormat)|The format the user entered for the cell
`effectiveFormat`|Object<br>[CellFormat](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/cells#CellFormat)|the "effective format" being used by the cell<br>_This includes the results of applying any conditional formatting and, if the cell contains a formula, the computed number format. If the effective format is the default format, effective format will not be written._

However, to make reading and updating format easier, this class provides the follow **read/write** properties that reach into the `userEnteredFormat`. There is also a `clearAllFormatting()` method that will clear all format settings.

Property|Type|Description
---|---|---
`numberFormat`|Object<br>[NumberFormat](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/cells#NumberFormat)|A format describing how number values should be represented to the user.
`backgroundColor`|Object<br>[Color](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#Color)|The background color of the cell.
`borders`|Object<br>[Borders](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/cells#Borders)|The borders of the cell.
`padding`|Object<br>[Padding](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/cells#Padding)|The padding of the cell.
`horizontalAlignment`|String (enum)<br>[HorizonalAlign](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#HorizontalAlign)|The horizontal alignment of the value in the cell.
`verticalAlignment`|String (enum)<br>[VerticalAlign](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/cells#VerticalAlign)|The vertical alignment of the value in the cell.
`wrapStrategy`|String (enum)<br>[WrapStrategy](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/cells#WrapStrategy)|The wrap strategy for the value in the cell.
`textDirection`|String (enum)<br>[TextDirection](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/cells#TextDirection)|The direction of the text in the cell.
`textFormat`|Object<br>[TextFormat](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#TextFormat)|The format of the text in the cell (unless overridden by a format run).
`hyperlinkDisplayType`|String<br>[HyperlinkDisplayType](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/cells#HyperlinkDisplayType)|How a hyperlink, if it exists, should be displayed in the cell.
`textRotation`|Object<br>[TextRotation](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/cells#TextRotation)|The rotation applied to text in a cell


## Methods

#### `clearAllFormatting()` :id=fn-clearAllFormatting
> Reset all cell formatting to default/nothing

**This is still only a local change which must still be saved**

- ✨ **Side effects** - all user entered format settings are cleared (locally)


#### `discardUnsavedChanges()` :id=fn-discardUnsavedChanges
> Discard all unsaved changes - includes value, notes, and formatting

- ✨ **Side effects** - cell will no longer be considered "dirty" and unsaved changes are discarded

#### `save()` (async) :id=fn-save
> Save this individual cell

- ✨ **Side effects** - updates are saved and everything re-fetched from google

?> Usually makes more sense to use `sheet.saveUpdatedCells()` to save many cell updates at once

