var GoogleSpreadsheet = require("../index.js");

var testsheet = new GoogleSpreadsheet("SPREADSHEET_KEY");

testsheet.setAuth('youremail@gmail.com', 'YOURPASSWORD', function (err) {
	if (err) console.log(err);

	testsheet.editCell(1, 6, 3, 'Edited value');

	testsheet.getCells(1, {minRow: 2, maxRow: 3, minCol: 2, maxCol: 3}, function (err, cells) {
		if (err) console.log(err);

		cells[0].setValue("Set value", function (err, result) {
			console.log(err);
			console.log(result);
		});

		cells[1].del();

		cells[2].value = 'Change + save';
		cells[2].save();
	});

});


