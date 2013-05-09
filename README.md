# NodeJS Google Spreadsheets Data API

[![NPM version](https://badge.fury.io/js/google-spreadsheet.png)](http://badge.fury.io/js/google-spreadsheet)

A simple Node.js library to read and manipulate data in a Google Spreadsheet.

Works without authentication for read-only sheets or with auth for adding/editing/deleting data. Currently only supports list-based feeds (dealing with rows) as it seems more useful, but will probably add in cell-based feeds eventually.


## Installation

```
npm install google-spreadsheet
```


## Basic Usage

``` javascript
var GoogleSpreadsheet = require("google-spreadsheet");

var my_sheet = new GoogleSpreadsheet('<spreadsheet key>');

// without auth -- read only
// # is worksheet id - IDs start at 1
my_sheet.getRows( 1, function(err, row_data){
	console.log( 'pulled in '+row_data.length + ' rows ')
})

// set auth to be able to edit/add/delete
my_sheet.setAuth('<google email/username>','<google pass>', function(err){
	my_sheet.getInfo( function( err, sheet_info ){
		console.log( sheet_info.title + ' is loaded' );
		// use worksheet object if you want to forget about ids
		sheet_info.worksheets[0].getRows( function( err, rows ){
			rows[0].colname = 'new val';
			rows[0].save();
			rows[0].del();
		}
	}

	// column names are set by google based on the first row of your sheet
	my_sheet.addRow( 2, { colname: 'col value'} );

	my_sheet.getRows( 2, {
		start: 100,			// start index
		num: 100			// number of rows to pull
	}, function(err, row_data){
		// do something...
	});
})
```


## A note on authentication

The Google Spreadsheets Data API reference and developers guide is a little ambiguous about how you access a "published" public Spreadsheet.

If you wish to work with a Google Spreadsheet without authenticating, not only 
must the Spreadsheet in question be visible to the web, but it must also have 
been explicitly published using the "Share" button in the top right corner of 
the Google Spreadsheets GUI.

Generally, you'll find alot of public spreadsheets may not have had this 
treatment, so your best bet is to just authenticate a Google account and 
access the API in that manner.

This library uses [googleclientlogin](https://github.com/Ajnasz/GoogleClientLogin) to provide simple authentication. Optionally you can pass in an auth token that you have created already (using googleclientlogin or whatever else)


## Further possibilities for this library

- Adding cell-based feeds (was in the original package)
- adding query capabilities for list-feeds
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
