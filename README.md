# Simple Google Spreadsheet Access (node.js)

[![NPM version](https://badge.fury.io/js/google-spreadsheet.png)](http://badge.fury.io/js/google-spreadsheet)

A simple Node.js library to read and manipulate data in Google Spreadsheets.

Works without authentication for read-only sheets or with auth for adding/editing/deleting data.
Supports both list-based and cell-based feeds.

## Installation

[![NPM Info](https://nodei.co/npm/google-spreadsheet.png?downloads=true&downloadRank=true&stars=true)](https://www.npmjs.org/package/google-spreadsheet)

## Basic Usage

``` javascript
var GoogleSpreadsheet = require("google-spreadsheet");

// spreadsheet key is the long id in the sheets URL
var my_sheet = new GoogleSpreadsheet('<spreadsheet key>');

// Without auth -- read only
// IMPORTANT: See note below on how to make a sheet public-readable!
// # is worksheet id - IDs start at 1
my_sheet.getRows( 1, function(err, row_data){
	console.log( 'pulled in '+row_data.length + ' rows');
});

// With auth -- read + write
// see below for authentication instructions
var creds = require('./google-generated-creds.json');
// OR, if you cannot save the file locally (like on heroku)
var creds = {
  client_email: 'yourserviceaccountemailhere@google.com',
  private_key: 'your long private key stuff here'
}

my_sheet.useServiceAccountAuth(creds, function(err){
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

	// column names are set by google and are based
  // on the header row (first row) of your sheet
	my_sheet.addRow( 2, { colname: 'col value'} );

	my_sheet.getRows( 2, {
		start: 100,			 // start index
		num: 100,			   // number of rows to pull
		orderby: 'name'  // column to order results by
	}, function(err, row_data){
		// do something...
	});
})
```

## Authentication

IMPORTANT: Google recently deprecated their ClientLogin (username+password)
access, so things are slightly more complicated now. Older versions of this
module supported it, so just be aware that things changed.

### Unauthenticated access (read-only access on public docs)

By default, this module makes unauthenticated requests and can therefore
only access spreadsheets that are "public".

The Google Spreadsheets Data API reference and developers guide is a little
ambiguous about how you access a "published" public Spreadsheet.

If you wish to work with a Google Spreadsheet without authenticating, not only
must the Spreadsheet in question be visible to the web, but it must also have
been explicitly published using "File > Publish to the web" menu option in
the google spreadsheets GUI.

Many seemingly "public" sheets have not also been "published" so this may
cause some confusion.


### Service Account (recommended method)

This is a 2-legged oauth method and designed to be "an account that belongs to your application instead of to an individual end user".
Use this for an app that needs to access a set of documents that you have full access to.
([read more](https://developers.google.com/identity/protocols/OAuth2ServiceAccount))

__Setup Instructions__

1. Go to the [Google Developers Console](https://console.developers.google.com/project)
2. Select your project or create a new one (and then select it)
3. Enable the Drive API for your project
  - In the sidebar on the left, expand __APIs & auth__ > __APIs__
  - Search for "drive"
  - Click on "Drive API"
  - click the blue "Enable API" button
4. Create a service account for your project
  - In the sidebar on the left, expand __APIs & auth__ > __Credentials__
  - Click "Create new Client ID" button
  - select the "Service account" option
  - click "Create Client ID" button to continue
  - when the dialog appears click "Okay, got it"
  - your JSON key file is generated and downloaded to your machine (__it is the only copy!__)
  - note your service account's email address (also available in the JSON key file)
5. Share the doc (or docs) with your service account using the email noted above


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



#### `GoogleSpreadsheet.useServiceAccountAuth(account_info, callback)`

Uses a service account email and public/private key to create a token to use to authenticated requests.
Normally you would just pass in the require of the json file that google generates for you when you create a service account.

See the "Authentication" section for more info.

If you are using heroku or another environment where you cannot save a local file, you may just pass in an object with
- `client_email` -- your service account's email address
- `private_key` -- the private key found in the JSON file

Internally, this uses a JWT client to generate a new auth token for your service account that is valid for 1 hour. The token will be automatically regenerated when it expires.


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



#### `GoogleSpreadsheet.getRows(worksheet_id, options, callback)`

Get an array of row objects from the sheet.

- `worksheet_id` - the index of the sheet to read from (index starts at 1)
- `options` (optional)
  - `start-index` - start reading from row #
  - `max-results` - max # of rows to read at once
  - `orderby` - column key to order by
  - `reverse` - reverse results
  - `query` - send a structured query for rows ([more info](https://developers.google.com/google-apps/spreadsheets/#sending_a_structured_query_for_rows))
- `callback(err, rows)` - will be called with an array of row objects (see below)



#### `GoogleSpreadsheet.addRow(worksheet_id, new_row, callback)`

Add a single row to the sheet.

- `worksheet_id` - the index of the sheet to add to (index starts at 1)
- `new_row` - key-value object to add - keys must match the header row on your sheet
- `callback(err)` - callback called after row is added



#### `GoogleSpreadsheet.getCells(options, callback)`

Get an array of cell objects.

- `options` (optional)
  - `min-row` - row range min (uses #s visible on the left)
  - `max-row` - row range max
  - `min-col` - column range min (uses numbers, not letters!)
  - `max-col` - column range max
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

### `SpreadsheetWorksheet.addRow(new_row, callback)`
See above.

----------------------------------

### `SpreadsheetRow`
Represents a single row from a sheet.

You can treat the row as a normal javascript object. Object keys will be from the header row of your sheet, however the google API mangles the names a bit to make them simpler. It's easiest if you just use all lowercase keys to begin with.

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
