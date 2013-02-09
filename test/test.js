var assert = require("assert");
var GoogleSpreadsheets = require("../lib/spreadsheets");
require("should");

describe("google-spreadsheets", function() {
	this.timeout(0);
	it("can load a spreadsheet", function(done) {
		GoogleSpreadsheets({
			key: "0ApDvWFF4RPZBdEFucnJya1hxVG9wZzhJQWZUWkpfekE"
		}, function(err, spreadsheet) {
			if(err) return done(err);
			spreadsheet.title.should.equal("Example Spreadsheet");
			spreadsheet.author.name.should.equal("sam.c.day");
			spreadsheet.author.email.should.equal("sam.c.day@gmail.com");
			done();
		});
	});
	it("can load spreadsheet cells", function(done) {
		GoogleSpreadsheets({
			key: "0ApDvWFF4RPZBdEFucnJya1hxVG9wZzhJQWZUWkpfekE"
		}, function(err, spreadsheet) {
			if(err) return done(err);
			spreadsheet.worksheets[0].cells({
				range: "R1C1:R1C2"
			}, function(err, result) {
				result.cells[1][1].value.should.equal("Hello,");
				result.cells[1][2].value.should.equal("World!");
				done();
			});
		});
	});
});