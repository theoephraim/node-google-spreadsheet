# NodeJS Google Spreadsheets Data API

[![NPM version](https://badge.fury.io/js/google-spreadsheet.png)](http://badge.fury.io/js/google-spreadsheet)

A simple Node.js library to read and manipulate data in a Google Spreadsheet.

Works without authentication for read-only sheets or with auth for adding/editing/deleting data.
Supports both list-based and cell-based feeds.

## Installation

```
npm install google-spreadsheet
```


## Basic Usage

``` javascript
var GoogleSpreadsheet = require("google-spreadsheet");

// spreadsheet key is the long id in the sheets URL
var my_sheet = new GoogleSpreadsheet('<spreadsheet key>');

// Without auth -- read only
// IMPORTANT: See note below on how to make a sheet public-readable!
// # is worksheet id - IDs start at 1
my_sheet.getRows( 1, function(err, row_data){
	console.log( 'pulled in '+row_data.length + ' rows ')
})

// Set auth to be able to edit/add/delete
my_sheet.setAuth('<google email/username>','<google pass>', function(err){

	// getInfo returns info about the sheet and an array or "worksheet" objects
	my_sheet.getInfo( function( err, sheet_info ){
		console.log( sheet_info.title + ' is loaded' );
		// use worksheet object if you want to stop using the # in your calls

		var sheet1 = sheet_info.worksheets[0];
		sheet1.getRows( function( err, rows ){
			rows[0].colname = 'new val';
			rows[0].save();	//async and takes a callback
			rows[0].del();  //async and takes a callback
		});
	});

	// column names are set by google based on the header row of your sheet
	my_sheet.addRow( 2, { colname: 'col value'} );

	my_sheet.getRows( 2, {
		start: 100,			 // start index
		num: 100			   // number of rows to pull
		orderby: 'name'  // column to order results by
	}, function(err, row_data){
		// do something...
	});
})
```

## A note on authentication

The Google Spreadsheets Data API reference and developers guide is a little ambiguous about how you access a "published" public Spreadsheet.

If you wish to work with a Google Spreadsheet without authenticating, not only
must the Spreadsheet in question be visible to the web, but it must also have
been explicitly published using "File > Publish to the web" menu option in the google spreadsheets GUI.

Generally, you'll find a lot of public spreadsheets may not have had this
treatment, so your best bet is to just authenticate a Google account and
access the API in that manner.

This library uses [googleclientlogin](https://github.com/Ajnasz/GoogleClientLogin)
internally to provide basic authentication. Optionally you can pass in an auth token
that you have created already (using googleclientlogin or something else).


## API

### `GoogleSpreadsheet`

The main class that represents an entire spreadsheet.


#### `new GoogleSpreadsheet(sheet_id, [auth], [options])`

Create a new google spreadsheet object.

- `sheet_id` -- the ID of the spreadsheet (from its URL)
- `auth` - (optional) an existing auth token
- `options` - (optional)
  - `visibility` - defaults to `public` if anonymous
  - `projection` - defaults to `values` if anonymous



#### `GoogleSpreadsheet.setAuth(username, password, callback)`

Creates an auth token using a username and password. It will be used for all future requests. Internally uses [googleclientlogin](https://github.com/Ajnasz/GoogleClientLogin). Remember NEVER to save your google credentials in version control!



#### `GoogleSpreadsheet.setAuthToken(id)`

Use an already created auth token for all future requets.



#### `GoogleSpreadsheet.getInfo(callback)`

Get information about the spreadsheet. Calls callback passing an object that contains:

- `title` - the title of the document
- `updated` - last updated timestamp
- `author` - auth info in an object
  - `name` - author name
  - `email` - author email
- `worksheets` - an array of `SpreadsheetWorksheet` objects (see below)



#### `GoogleSpreadsheet.getRows(worksheet_id, options, query, callback)`

- `worksheet_id` - the index of the sheet to read from (index starts at 1)
- `options` (optional)
  - `start-index` - start reading from row #
  - `max-results` - max # of rows to read at once
  - `orderby` - column key to order by
  - `reverse` - reverse results
  - `query` - send a structured query for rows ([more info](https://developers.google.com/google-apps/spreadsheets/#sending_a_structured_query_for_rows))
- `callback(err, rows)` - will be called with an array of row objects



#### `GoogleSpreadsheet.addRow(worksheet_id, data, callback)`

Add a row to the spreadsheet.

- `worksheet_id` - the index of the sheet to add to (index starts at 1)
- `data` - key-value object to add - keys should match the header row on your sheet
- `callback(err)



#### `GoogleSpreadsheet.getCells(options, callback)`

Get an array of cell objects.

- `options` (optional)
  - `min-row` + `max-row` - row range (uses #s visible on the left)
  - `min-col` + `max-col` - column range (uses numbers, not letters!)
  - `return-empty` - include empty cells (boolean)


----------------------------------

### `SpreadsheetWorksheet`

Represents a single "sheet" from the spreadsheet. These are the different tabs/pages visible at the bottom of the Google Sheets interface.

This is a really just a wrapper to call the same functions on the spreadsheet without needing to include the worksheet id.

__Properties:__
- `id` - the ID of the sheet
- `title` - the title (visible on the tabs in google's interface)
- `rowCount` - number of rows
- `colCount` - number of columns

### `SpreadsheetWorksheet.getRows(options, callback)`
See above.

### `SpreadsheetWorksheet.getCells(options, callback)`
See above.

### `SpreadsheetWorksheet.addRow(data, callback)`
See above.

----------------------------------

### `SpreadsheetRow`
Represents a single row from a sheet.

You can treat the row as a normal javascript object. Keys will be from the header row of your sheet, however the google API mangles the names a bit to make them simpler. It's easiest if you just use all lowercase keys to begin with.

#### `SpreadsheetRow.save( callback )`
Saves any changes made to the row's values.

#### `SpreadsheetRow.del( callback )`
Deletes the row from the sheet.

----------------------------------

### `SpreadsheetCell`
Represents a single cell from the sheet.

#### `SpreadsheetCell.setValue(val, callback)`
Set the value of the cell and save it.

#### `SpreadsheetCell.del(callback)`
Clear the cell -- internally just calls `.setValue('', callback)`


----------------------------------

## Further possibilities & to-do

- batch requests for cell based updates
- modifying worksheet/spreadsheet properties
- getting list of available spreadsheets for an authenticated user

## Links

- <https://developers.google.com/google-apps/spreadsheets/>
- <https://github.com/Ajnasz/GoogleClientLogin>


## Thanks
This is a fairly major rewrite of code by [samcday](https://github.com/samcday). original version [here](https://github.com/samcday/node-google-spreadsheets)
Also big thanks fo GoogleClientLogin for dealing with authentication.


## License
node-google-spreadsheets is free and unencumbered public domain software. For more information, see the accompanying UNLICENSE file.
