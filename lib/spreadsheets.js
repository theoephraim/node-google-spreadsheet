var request = require("request");
var xml2js = require("xml2js");
var http = require("http");
var querystring = require("querystring");

var FEED_URL = "https://spreadsheets.google.com/feeds/";

var forceArray = function(val) {
	if(Array.isArray(val)) {
		return val;
	}
	
	return [val];
};

var getFeed = function(params, auth, query, cb) {
	var headers = {};
	var visibility = "public";
	var projection = "values";

	if(auth) {
		headers.Authorization = "GoogleLogin auth=" + auth;
		visibility = "private";
		projection = "full";
	}
	params.push(visibility, projection);

	var url = FEED_URL + params.join("/");
	if(query) {
		url += "?" + querystring.stringify(query);
	}

	request.get({
		url: url,
		headers: headers
	}, function(err, response, body) {
		if(response.statusCode === 401) {
			cb(new Error("Invalid authorization key."));
		}

		if(response.statusCode >= 400) {
			cb(new Error("HTTP error " + response.statusCode + ": " + http.STATUS_CODES[response.statusCode]));
		}

		var parser = new xml2js.Parser(xml2js.defaults["0.1"]);
		parser.on("end", function(result) {
			cb(null, result);
		});

		parser.on("error", function(err) {
			cb(err);
		});

		parser.parseString(body);
	});
};

var Spreadsheets = module.exports = function(opts, cb) {
	if(!opts) {
		throw new Error("Invalid arguments.");
	}
	if(!opts.key) {
		throw new Error("Spreadsheet key not provided.");
	}

	getFeed(["worksheets", opts.key], opts.auth, null, function(err, data) {
		if(err) {
			return cb(err);
		}

		cb(null, new Spreadsheet(opts.key, opts.auth, data));
	});
};

Spreadsheets.rows = function(opts, cb) {
	if(!opts) {
		throw new Error("Invalid arguments.");
	}
	if(!opts.key) {
		throw new Error("Spreadsheet key not provided.");
	}
	if(!opts.worksheet) {
		throw new Error("Worksheet not specified.");
	}

	var query = {};
	if(opts.start) {
		query["start-index"] = opts.start;
	}
	if(opts.num) {
		query["max-results"] = opts.num;
	}
	if(opts.orderby) {
		query["orderby"] = opts.orderby;
	}
	if(opts.reverse) {
		query["reverse"] = opts.reverse;
	}

	getFeed(["list", opts.key, opts.worksheet], opts.auth, query, function(err, data) {
		if(err) {
			return cb(err);
		}

		var rows = [];
		var entries = forceArray(data.entry);
		
		entries.forEach(function(entry) {
			rows.push(new Row(entry));
		});
		
		cb(null, rows);
	});
};

Spreadsheets.cells = function(opts, cb) {
	if(!opts) {
		throw new Error("Invalid arguments.");
	}
	if(!opts.key) {
		throw new Error("Spreadsheet key not provided.");
	}
	if(!opts.worksheet) {
		throw new Error("Worksheet not specified.");
	}

	var query = {
	};
	if(opts.range) {
		query["range"] = opts.range;
	}
	if (opts.maxRow) {
		query["max-row"] = opts.maxRow;
	}
	if (opts.minRow) {
		query["min-row"] = opts.minRow;
	}
	if (opts.maxCol) {
		query["max-col"] = opts.maxCol;
	}
	if (opts.minCol) {
		query["min-col"] = opts.minCol;
	}

	getFeed(["cells", opts.key, opts.worksheet], opts.auth, query, function(err, data) {
		if(err) {
			return cb(err);
		}

		cb(null, new Cells(data));
	});
};

var Spreadsheet = function(key, auth, data) {
	this.key = key;
	this.auth = auth;
	this.title = data.title["#"];
	this.updated = data.updated;
	this.author = data.author;

	this.worksheets = [];
	var worksheets = forceArray(data.entry);

	worksheets.forEach(function(worksheetData) {
		this.worksheets.push(new Worksheet(this, worksheetData));
	}, this);
};

var Worksheet = function(spreadsheet, data) {
	// This should be okay, unless Google decided to change their URL scheme...
	this.id = data.id.substring(data.id.lastIndexOf("/") + 1);
	this.spreadsheet = spreadsheet;
	this.rowCount = data["gs:rowCount"];
	this.colCount = data["gs:colCount"];
	this.title = data.title["#"];
};

Worksheet.prototype.rows = function(opts, cb) {
	opts = opts || {};
	Spreadsheets.rows({
		key: this.spreadsheet.key,
		auth: this.spreadsheet.auth,
		worksheet: this.id,
		start: opts.start,
		num: opts.num,
		orderby: opts.orderby,
		reverse: opts.reverse
	}, cb);
};

Worksheet.prototype.cells = function(opts, cb) {
	opts = opts || {};
	Spreadsheets.cells({
		key: this.spreadsheet.key,
		auth: this.spreadsheet.auth,
		worksheet: this.id,
		range: opts.range,
		maxRow: opts.maxRow,
		minRow: opts.minRow,
		maxCol: opts.maxCol,
		minCol: opts.minCol
	}, cb);
};

var Row = function(data) {
	Object.keys(data).forEach(function(key) {
		var val;
		val = data[key];
		if(key.substring(0, 4) === "gsx:") {
			if(typeof val === 'object' && Object.keys(val).length === 0) {
				val = null;
			}
			if (key == "gsx:") {
				this[key.substring(0, 3)] = val;
			} else {
				this[key.substring(4)] = val;
			}
		} else {
			if (key == "id") {
				this[key] = val;
			} else if (val['#']) {
				this[key] = val['#'];
			}
		}
	}, this);
};

var Cells = function(data) {
	// Populate the cell data into an array grid.
	this.cells = {};
	
	var entries = forceArray(data.entry);
	var cell, row, col;
	entries.forEach(function(entry) {
		cell = entry["gs:cell"];
		row = cell["@"].row;
		col = cell["@"].col;
		
		if(!this.cells[row]) {
			this.cells[row] = {};
		}
		
		this.cells[row][col] = {
			row: row,
			col: col,
			inputValue: cell["@"]["inputValue"] || "",
			value: cell["#"] || ""
		};
	}, this);
};
