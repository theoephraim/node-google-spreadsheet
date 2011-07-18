var request = require("request");
var xml2js = require("xml2js");
var http = require("http");
var querystring = require("querystring");

var FEED_URL = "https://spreadsheets.google.com/feeds/";

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

		var parser = new xml2js.Parser();
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

		cb(null, new Spreadsheet(opts.key, data));
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

	getFeed(["list", opts.key, opts.worksheet], opts.auth, query, function(err, data) {
		if(err) {
			return cb(err);
		}

		var rows = [];
		var entries = data.entry;
		if(!Array.isArray(entries)) {
			entries = [entries];
		}
		
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
		"return-empty": "true"
	};
	if(opts.range) {
		query["range"] = opts.range;
	}

	getFeed(["cells", opts.key, opts.worksheet], opts.auth, query, function(err, data) {
		if(err) {
			return cb(err);
		}

		
	});
};

var Spreadsheet = function(key, data) {
	this.key = key;
	this.title = data.title["#"];
	this.updated = data.updated;
	this.author = data.author;

	this.worksheets = [];
	var worksheets = data.entry;
	if(!Array.isArray(worksheets)) {
		worksheets = [worksheets];
	}
	
	worksheets.forEach(function(worksheetData) {
		this.worksheets.push(new Worksheet(worksheetData));
	}, this);
};

var Worksheet = function(data) {
	this.rowCount = data["gs:rowCount"];
	this.colCount = data["gs:colCount"];
	this.title = data.title["#"];
};

var Row = function(data) {
	Object.keys(data).forEach(function(key) {
		if(key.substring(0, 4) === "gsx:") {
			this[key.substring(4)] = data[key];
		}
	}, this);
};