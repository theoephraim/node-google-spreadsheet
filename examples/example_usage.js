var GoogleSpreadsheet = require("../index.js");

// only need to set the key once
// auth can optionally be created and passed in as well
var testsheet = new GoogleSpreadsheet( "0Araic6gTol6SdGtyUVAzQmVLM0lxUWlBMkNraWVubUE");


// If the spreadsheet is "published to web" then without authentication you can still get spreadsheet info and read rows - no editing
// usually you probably wont need to call getInfo and can just read from sheets directly
testsheet.getInfo( function(err, ss_info){
	if (err) console.log( err );

	console.log( ss_info.title + ' is loaded' );

	// you can use the worksheet objects to add or read rows
	ss_info.worksheets[0].getRows( function(err, rows){
		console.log( ss_info.worksheets[0].title + ' has '+rows.length + 'rows' );
	});
});



// if auth is set, you can edit. you read the rows while authenticated in order to get the edit feed URLs from google
testsheet.setAuth( 'youremail@gmail.com', '*PASSWORD*', function(err){
	if (err) console.log(err);

	console.log(' GOOGLE AUTH SUCCESS!' );

	// you can also add and read rows by just indicating the worksheet id (starts at 1)
	testsheet.addRow( 1, { 
		testdate: ( new Date() ).toString('yyyy-MM-dd'),
		testnum: 0
	})
	
	testsheet.getRows( 2, function(err, rows){
		if (err) console.log( err );

		// to edit row data, just edit the data and call save()
		rows[0].testnum++;
		rows[0].save();

		// you can also delete rows by calling .del()
		// rows[3].del();
	});

})