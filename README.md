[![build status](https://secure.travis-ci.org/samcday/node-google-spreadsheets.png)](http://travis-ci.org/samcday/node-google-spreadsheets)
# NodeJS Google Spreadsheets Data API `v0.1.0`

A simple Node.js library to read data from a Google Spreadsheet.

## Installation

	npm install google-spreadsheets

## Quick Example
	var GoogleSpreadsheets = require("google-spreadsheets");
	
	GoogleSpreadsheets({
		key: "<spreadsheet key>"
	}, function(err, spreadsheet) {
		spreadsheet.worksheets[0].cells({
			range: "R1C1:R5C5"
		}, function(err, cells) {
			// Cells will contain a 2 dimensional array with all cell data in the
			// range requested.
		});
	});
	
## API

*GoogleSpreadsheets = module.exports = function(opts, callback);*

Loads a `Spreadsheet` from the API. `opts` may contain the following:

	- `key`: *(required)* spreadsheet key
	- `auth`: *(optional)* authentication key from Google ClientLogin


*GoogleSpreadsheets.rows = function(opts, callback);*

Loads a set of rows for a specific Spreadsheet from the API. Note that this call is direct, you must supply all auth, spreadsheet and worksheet information.

`opts`:
	- `key`: *(required)* spreadsheet key
	- `worksheet`: *(required)* worksheet id. Can be a numeric index (starting from 1), or the proper string identifier for a worksheet.
	- `start`: *(optional)* starting index for returned results
	- `num`: *(optional)* number of results to return 
	- `auth`: *(optional)* authentication key from Google ClientLogin


*GoogleSpreadsheets.cells = function(opts, callback);*

Loads a group of cells for a specific Spreadsheet from the API. Note that this call is direct, you must supply all auth, spreadsheet and worksheet information.

`opts`:
	- `key`: *(required)* spreadsheet key
	- `worksheet`: *(required)* worksheet id. Can be a numeric index (starting from 1), or the proper string identifier for a worksheet.
	- `range`: *(optional)* A range (in the format of R1C1) of cells to retrieve. e.g R15C2:R37C8. Range is inclusive.
	- `auth`: *(optional)* authentication key from Google ClientLogin

*Spreadsheet*

Object returned from `GoogleSpreadsheets()` call. This object has the following properties:
	- `title`: title of Spreadsheet
	- `updated`: date Spreadsheet was last updated.
	- `author`: object containing `name` and `email` of author of Spreadsheet.
	- `worksheets`: Array of Worksheets contained in this spreadsheet.

*Worksheet*

Represents a single worksheet contained in a Spreadsheet. Obtain this via `Spreadsheet.worksheets`.

Worksheet has the following properties:
	- `rowCount`: number of rows in worksheet.
	- `colCount`: number of columns in worksheet.
	- `Worksheet.rows(opts, cb)`: convenience method to call `Spreadsheets.rows`, just pass in `start` and `num` - will automatically pass spreadsheet key, worksheet id, and auth info (if applicable) 
	- `Worksheet.cols(opts, cb)`: convenience method to call `Spreadsheets.cols`, will automatically pass spreadsheet key, worksheet id, and auth info (if applicable). opts can contain `range`, etc.
	
## A note on authentication

The Google Spreadsheets Data API reference and developers guide is a little ambiguous
 about how you access a "published" public Spreadsheet.

If you wish to work with a Google Spreadsheet without authenticating, not only 
must the Spreadsheet in question be visible to the web, but it must also have 
been explicitly published using the "Share" button in the top right corner of 
the Google Spreadsheets GUI.

Generally, you'll find alot of public spreadsheets may not have had this 
treatment, so your best bet is to just authenticate a Google account and 
access the API in that manner.

This library supports authenticated calls, when it is provided an authentication 
key from Google ClientLogin. The actualy authentication is not handled by this 
library. I would recommend the [googleclientlogin](https://github.com/Ajnasz/GoogleClientLogin)

### Authentication example (using googleclientlogin):
	var GoogleClientLogin = require("googleclientlogin").GoogleClientLogin;

	var googleAuth = new GoogleClientLogin({
	  email: '<email>',
	  password: '<password>',
	  service: 'spreadsheets',
	  accountType: GoogleClientLogin.accountTypes.google
	});
	
	googleAuth.on(GoogleClientLogin.events.login, function(){
		GoogleSpreadsheets({
			key: "<key>",
			auth: googleAuth.getAuthId()
		}, function(err, spreadsheet) {
			spreadsheet.worksheets[0].cells({
				range: "R1C1:R5C6"
			}, function(err, cells) {
				// bleh!
			});
		});
	});

	googleAuth.login();

## Further possibilities for this library
	- Edit functionality
	- Sorting/filtering on row listing
	- Filtering on cell listing.

## Links
	- <http://code.google.com/apis/spreadsheets/>
	- <https://github.com/Ajnasz/GoogleClientLogin>
