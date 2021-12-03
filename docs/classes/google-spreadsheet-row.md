_Class Reference_

# GoogleSpreadsheetRow

> **This class represents an individual row in a spreadsheet, plus header row info**
  <br>
  Provides methods to read/write the values, save updates, and delete the row


**Disclaimer** - Google's previous v3 API had "row-based" interactions built in, but it is no longer supported in their current v4 version. This module tries to recreate this interface as much as possible, but it's not perfect, because google no long supports it natively.

## Initialization

You do not initialize rows directly. Instead you can load rows from a sheet. For example, with a sheet that looks like:

name|email
---|---
Larry Page|larry@google.com
Sergey Brin|sergey@google.com

```javascript
const doc = new GoogleSpreadsheet('<YOUR-DOC-ID>');
await doc.loadInfo(); // loads sheets
const sheet = doc.sheetsByIndex[0]; // the first sheet

const rows = await sheet.getRows();
console.log(rows.length); // 2
console.log(rows[0].name); // 'Larry Page'
console.log(rows[0].email); // 'larry@google.com'

// make updates
rows[1].email = 'sergey@abc.xyz';
await rows[1].save(); // save changes

// add new row, returns a GoogleSpreadsheetRow object
const sundar = await sheet.addRow({ name: 'Sundar Pichai', email: 'sundar@abc.xyz' });
```

## Properties

### Row Location
Google uses both row/column indices and A1-style notation, available as **read-only** props:

Property|Type|Description
---|---|---
`rowNumber`|Number<br>_int >= 1_|A1 row number in the sheet of this row
`a1Range`|String|Full A1 range of this row, including the sheet name<br>_Ex: "sheet1!A5:D5"_

### Row Values

Property keys are determined by the header row of the sheet, and each row will have a property getter/setter available for each column. For example, for a sheet that looks like:

name|email|lastContacted|status
---|---|---|---
Larry Page|larry@google.com|2020-01-02|active
...

Each row would have props of `name`, `email`, `lastContacted`, `status`

You can update these values by simply setting values for those props.

#### Formulas

The row-based interface is designed to much simpler than using cells. It therefore only returns values, and you cannot access the underlying formula, formatting info, or notes - which you can using the cells-based interface.

That said, you can set a formula in a property and after saving the row, it will return the value the formula resolved to. However if you were to make other updates and NOT re-set the formula into the cell, the cell will lose the formula and will be overwritten with the value.

```javascript
const row = await doc.addRow({ col1: '=ASDF' });
console.log(row.col1); // logs 'ASDF', the cell does actually contain the formula
await row.save(); // cell will now contain the value "ASDF", not the formula
```

!> Be careful - it is not recommended to use formulas with the row based interface if you are planning on ever updating row values. If you are only inserting rows and reading data, you should be ok.


## Methods

#### `save(options)` (async) :id=fn-save
> Save any updates made to row values

Param|Type|Required|Description
---|---|---|---
`options`|Object|-|Options object
`options.raw`|Boolean|-|Store raw values instead of converting as if typed into the sheets UI<br>_see [ValueInputOption](https://developers.google.com/sheets/api/reference/rest/v4/ValueInputOption)_

- ✨ **Side effects** - updates are saved and everything re-fetched from google


#### `delete()` (async) :id=fn-delete
> Delete this row

- ✨ **Side effects** - Row is removed from the sheet

_also available as `row.del()`_

