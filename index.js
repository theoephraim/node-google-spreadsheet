var async = require("async");
var request = require("request");
var xml2js = require("xml2js");
var http = require("http");
var querystring = require("querystring");
var _ = require('lodash');
var GoogleAuth = require("google-auth-library");
var chalk = require('chalk');

var GOOGLE_FEED_URL = "https://spreadsheets.google.com/feeds/";
var GOOGLE_AUTH_SCOPE = ["https://spreadsheets.google.com/feeds"];

var REQUIRE_AUTH_MESSAGE = 'You must authenticate to modify sheet data';

// SHOW DEPRECATION WARNING
console.log(chalk.red.bold("WARNING! You must upgrade to the latest version of google-spreadsheet!"));
console.log(chalk.red("Google's deprecation date for the v3 sheets API is March 3rd 2020"));
console.log(chalk.red("Bad news - this version of this module will stop working on that date :("));
console.log(chalk.red("Good news - the new version of the module uses the newer v4 api :)"));
console.log(chalk.red("However, there are breaking changes, so please see the docs site"));
console.log(chalk.green("https://theoephraim.github.io/node-google-spreadsheet"));

// The main class that represents a single sheet
// this is the main module.exports
var GoogleSpreadsheet = function( ss_key, auth_id, options ){
  var self = this;
  var google_auth = null;
  var visibility = 'public';
  var projection = 'values';

  var auth_mode = 'anonymous';

  var auth_client = new GoogleAuth();
  var jwt_client;

  options = options || {};



  if ( !ss_key ) {
    throw new Error("Spreadsheet key not provided.");
  }

  // auth_id may be null
  setAuthAndDependencies(auth_id);

  // Authentication Methods

  this.setAuthToken = function( auth_id ) {
    if (auth_mode == 'anonymous') auth_mode = 'token';
    setAuthAndDependencies(auth_id);
  }

  // deprecated username/password login method
  // leaving it here to help notify users why it doesn't work
  this.setAuth = function( username, password, cb ){
    return cb(new Error('Google has officially deprecated ClientLogin. Please upgrade this module and see the readme for more instrucations'))
  }

  this.useServiceAccountAuth = function( creds, cb ){
    if (typeof creds == 'string') {
      try {
        creds = require(creds);
      } catch (err) {
        return cb(err);
      }
    }
    jwt_client = new auth_client.JWT(creds.client_email, null, creds.private_key, GOOGLE_AUTH_SCOPE, null);
    renewJwtAuth(cb);
  }

  function renewJwtAuth(cb) {
    auth_mode = 'jwt';
    jwt_client.authorize(function (err, token) {
      if (err) return cb(err);
      self.setAuthToken({
        type: token.token_type,
        value: token.access_token,
        expires: token.expiry_date
      });
      cb()
    });
  }

  this.isAuthActive = function() {
    return !!google_auth;
  }


  function setAuthAndDependencies( auth ) {
    google_auth = auth;
    if (!options.visibility){
      visibility = google_auth ? 'private' : 'public';
    }
    if (!options.projection){
      projection = google_auth ? 'full' : 'values';
    }
  }

  // This method is used internally to make all requests
  this.makeFeedRequest = function( url_params, method, query_or_data, cb ){
    var url;
    var headers = {};
    if (!cb ) cb = function(){};
    if ( typeof(url_params) == 'string' ) {
      // used for edit / delete requests
      url = url_params;
    } else if ( Array.isArray( url_params )){
      //used for get and post requets
      url_params.push( visibility, projection );
      url = GOOGLE_FEED_URL + url_params.join("/");
    }

    async.series({
      auth: function(step) {
        if (auth_mode != 'jwt') return step();
        // check if jwt token is expired
        if (google_auth && google_auth.expires > +new Date()) return step();
        renewJwtAuth(step);
      },
      request: function(result, step) {
        if ( google_auth ) {
          if (google_auth.type === 'Bearer') {
            headers['Authorization'] = 'Bearer ' + google_auth.value;
          } else {
            headers['Authorization'] = "GoogleLogin auth=" + google_auth;
          }
        }

        headers['Gdata-Version'] = '3.0';

        if ( method == 'POST' || method == 'PUT' ) {
          headers['content-type'] = 'application/atom+xml';
        }

        if (method == 'PUT' || method == 'POST' && url.indexOf('/batch') != -1) {
          headers['If-Match'] = '*';
        }

        if ( method == 'GET' && query_or_data ) {
          var query = "?" + querystring.stringify( query_or_data );
          // replacements are needed for using structured queries on getRows
          query = query.replace(/%3E/g,'>');
          query = query.replace(/%3D/g,'=');
          query = query.replace(/%3C/g,'<');
          url += query;
        }

        request( {
          url: url,
          method: method,
          headers: headers,
          gzip: options.gzip !== undefined ? options.gzip : true,
          body: method == 'POST' || method == 'PUT' ? query_or_data : null
        }, function(err, response, body){
          if (err) {
            return cb( err );
          } else if( response.statusCode === 401 ) {
            return cb( new Error("Invalid authorization key."));
          } else if ( response.statusCode >= 400 ) {
            var message = _.isObject(body) ? JSON.stringify(body) : body.replace(/&quot;/g, '"');
            return cb( new Error("HTTP error "+response.statusCode+" ("+http.STATUS_CODES[response.statusCode])+") - "+message);
          } else if ( response.statusCode === 200 && response.headers['content-type'].indexOf('text/html') >= 0 ) {
            return cb( new Error("Sheet is private. Use authentication or make public. (see https://github.com/theoephraim/node-google-spreadsheet#a-note-on-authentication for details)"));
          }


          if ( body ){
            var xml_parser = new xml2js.Parser({
              // options carried over from older version of xml2js
              // might want to update how the code works, but for now this is fine
              explicitArray: false,
              explicitRoot: false
            });
            xml_parser.parseString(body, function(err, result){
              if ( err ) {
                xml_parser = null;
                body = null;
                return cb( err );
              }
              if(cb.length == 3) {
                cb( null, result, body );
              }else{
                body = null;
                cb( null, result );
              }
            });
          } else {
            if ( err ) cb( err );
            else cb( null, true );
          }
        })
      }
    });
  }



  // public API methods
  this.getInfo = function( cb ){
    self.makeFeedRequest( ["worksheets", ss_key], 'GET', null, function(err, data) {
      if ( err ) return cb( err );
      if (data===true) {
        return cb(new Error('No response to getInfo call'))
      }
      var ss_data = {
        id: data.id,
        title: data.title,
        updated: data.updated,
        author: data.author,
        worksheets: []
      }
      var worksheets = forceArray(data.entry);
      worksheets.forEach( function( ws_data ) {
        ss_data.worksheets.push( new SpreadsheetWorksheet( self, ws_data ) );
      });
      self.info = ss_data;
      self.worksheets = ss_data.worksheets;
      cb( null, ss_data );
    });
  }

  // NOTE: worksheet IDs start at 1

  this.addWorksheet = function( opts, cb ) {
    // make opts optional
    if (typeof opts == 'function'){
      cb = opts;
      opts = {};
    }

    cb = cb || _.noop;

    if (!this.isAuthActive()) return cb(new Error(REQUIRE_AUTH_MESSAGE));

    var defaults = {
      title: 'Worksheet '+(+new Date()),  // need a unique title
      rowCount: 50,
      colCount: 20
    };

    opts = _.extend({}, defaults, opts);

    // if column headers are set, make sure the sheet is big enough for them
    if (opts.headers && opts.headers.length > opts.colCount) {
      opts.colCount = opts.headers.length;
    }

    var data_xml = '<entry xmlns="http://www.w3.org/2005/Atom" xmlns:gs="http://schemas.google.com/spreadsheets/2006"><title>' +
        opts.title +
      '</title><gs:rowCount>' +
        opts.rowCount +
      '</gs:rowCount><gs:colCount>' +
        opts.colCount +
      '</gs:colCount></entry>';

    self.makeFeedRequest( ["worksheets", ss_key], 'POST', data_xml, function(err, data) {
      if ( err ) return cb( err );

      var sheet = new SpreadsheetWorksheet( self, data );
      self.worksheets = self.worksheets || [];
      self.worksheets.push(sheet);
      sheet.setHeaderRow(opts.headers, function(err) {
        cb(err, sheet);
      })
    });
  }

  this.removeWorksheet = function ( sheet_id, cb ){
    if (!this.isAuthActive()) return cb(new Error(REQUIRE_AUTH_MESSAGE));
    if (sheet_id instanceof SpreadsheetWorksheet) return sheet_id.del(cb);
    self.makeFeedRequest( GOOGLE_FEED_URL + "worksheets/" + ss_key + "/private/full/" + sheet_id, 'DELETE', null, cb );
  }

  this.getRows = function( worksheet_id, opts, cb ){
    // the first row is used as titles/keys and is not included

    // opts is optional
    if ( typeof( opts ) == 'function' ){
      cb = opts;
      opts = {};
    }


    var query  = {}

    if ( opts.offset ) query["start-index"] = opts.offset;
    else if ( opts.start ) query["start-index"] = opts.start;

    if ( opts.limit ) query["max-results"] = opts.limit;
    else if ( opts.num ) query["max-results"] = opts.num;

    if ( opts.orderby ) query["orderby"] = opts.orderby;
    if ( opts.reverse ) query["reverse"] = 'true';
    if ( opts.query ) query['sq'] = opts.query;

    self.makeFeedRequest( ["list", ss_key, worksheet_id], 'GET', query, function(err, data, xml) {
      if ( err ) return cb( err );
      if (data===true) {
        return cb(new Error('No response to getRows call'))
      }

      // gets the raw xml for each entry -- this is passed to the row object so we can do updates on it later

      var entries_xml = xml.match(/<entry[^>]*>([\s\S]*?)<\/entry>/g);


      // need to add the properties from the feed to the xml for the entries
      var feed_props = _.clone(data.$);
      delete feed_props['gd:etag'];
      var feed_props_str = _.reduce(feed_props, function(str, val, key){
        return str+key+'=\''+val+'\' ';
      }, '');
      entries_xml = _.map(entries_xml, function(xml){
        return xml.replace('<entry ', '<entry '+feed_props_str);
      });

      var rows = [];
      var entries = forceArray( data.entry );
      var i=0;
      entries.forEach( function( row_data ) {
        rows.push( new SpreadsheetRow( self, row_data, entries_xml[ i++ ] ) );
      });
      cb(null, rows);
    });
  }

  this.addRow = function( worksheet_id, data, cb ){
    var data_xml = '<entry xmlns="http://www.w3.org/2005/Atom" xmlns:gsx="http://schemas.google.com/spreadsheets/2006/extended">' + "\n";
    Object.keys(data).forEach(function(key) {
      if (key != 'id' && key != 'title' && key != 'content' && key != '_links'){
        data_xml += '<gsx:'+ xmlSafeColumnName(key) + '>' + xmlSafeValue(data[key]) + '</gsx:'+ xmlSafeColumnName(key) + '>' + "\n"
      }
    });
    data_xml += '</entry>';
    self.makeFeedRequest( ["list", ss_key, worksheet_id], 'POST', data_xml, function(err, data, new_xml) {
      if (err) return cb(err);
      var entries_xml = new_xml.match(/<entry[^>]*>([\s\S]*?)<\/entry>/g);
      var row = new SpreadsheetRow(self, data, entries_xml[0]);
      cb(null, row);
    });
  }

  this.getCells = function (worksheet_id, opts, cb) {
    // opts is optional
    if (typeof( opts ) == 'function') {
      cb = opts;
      opts = {};
    }

    // Supported options are:
    // min-row, max-row, min-col, max-col, return-empty
    var query = _.assign({}, opts);


    self.makeFeedRequest(["cells", ss_key, worksheet_id], 'GET', query, function (err, data) {
      if (err) return cb(err);
      if (data===true) {
        return cb(new Error('No response to getCells call'))
      }

      var cells = [];
      var entries = forceArray(data['entry']);
      data = null;
      while(entries.length > 0) {
        cells.push( new SpreadsheetCell( self, ss_key, worksheet_id, entries.shift() ) );
      }

      cb( null, cells );
    });
  }
};

// Classes
var SpreadsheetWorksheet = function( spreadsheet, data ){
  var self = this;
  var links;

  self.url = data.id;
  self.id = data.id.substring( data.id.lastIndexOf("/") + 1 );
  self.title = data.title;
  self.rowCount = parseInt(data['gs:rowCount']);
  self.colCount = parseInt(data['gs:colCount']);

  self['_links'] = [];
  links = forceArray( data.link );
  links.forEach( function( link ){
    self['_links'][ link['$']['rel'] ] = link['$']['href'];
  });
  self['_links']['cells'] = self['_links']['http://schemas.google.com/spreadsheets/2006#cellsfeed'];
  self['_links']['bulkcells'] = self['_links']['cells']+'/batch';

  function _setInfo(opts, cb) {
    cb = cb || _.noop;
    var xml = ''
      + '<entry xmlns="http://www.w3.org/2005/Atom" xmlns:gs="http://schemas.google.com/spreadsheets/2006">'
      + '<title>'+(opts.title || self.title)+'</title>'
      + '<gs:rowCount>'+(opts.rowCount || self.rowCount)+'</gs:rowCount>'
      + '<gs:colCount>'+(opts.colCount || self.colCount)+'</gs:colCount>'
      + '</entry>';
    spreadsheet.makeFeedRequest(self['_links']['edit'], 'PUT', xml, function(err, response) {
      if (err) return cb(err);
      self.title = response.title;
      self.rowCount = parseInt(response['gs:rowCount']);
      self.colCount = parseInt(response['gs:colCount']);
      cb();
    });
  }

  this.resize = _setInfo;
  this.setTitle = function(title, cb) {
    _setInfo({title: title}, cb);
  }


  // just a convenience method to clear the whole sheet
  // resizes to 1 cell, clears the cell, and puts it back
  this.clear = function(cb) {
    var cols = self.colCount;
    var rows = self.colCount;
    self.resize({rowCount: 1, colCount: 1}, function(err) {
      if (err) return cb(err);
      self.getCells(function(err, cells) {
        cells[0].setValue(null, function(err) {
          if (err) return cb(err);
          self.resize({rowCount: rows, colCount: cols}, cb);
        });
      })
    });
  }

  this.getRows = function(opts, cb){
    spreadsheet.getRows(self.id, opts, cb);
  }
  this.getCells = function(opts, cb) {
    spreadsheet.getCells(self.id, opts, cb);
  }
  this.addRow = function(data, cb){
    spreadsheet.addRow(self.id, data, cb);
  }
  this.bulkUpdateCells = function(cells, cb) {
    if ( !cb ) cb = function(){};

    var entries = cells.map(function (cell, i) {
      cell._needsSave = false;
      return "<entry>\n        <batch:id>" + cell.batchId + "</batch:id>\n        <batch:operation type=\"update\"/>\n        <id>" + self['_links']['cells']+'/'+cell.batchId + "</id>\n        <link rel=\"edit\" type=\"application/atom+xml\"\n          href=\"" + cell.getEdit() + "\"/>\n        <gs:cell row=\"" + cell.row + "\" col=\"" + cell.col + "\" inputValue=\"" + cell.valueForSave + "\"/>\n      </entry>";
    });
    var data_xml = "<feed xmlns=\"http://www.w3.org/2005/Atom\"\n      xmlns:batch=\"http://schemas.google.com/gdata/batch\"\n      xmlns:gs=\"http://schemas.google.com/spreadsheets/2006\">\n      <id>" + self['_links']['cells'] + "</id>\n      " + entries.join("\n") + "\n    </feed>";

    spreadsheet.makeFeedRequest(self['_links']['bulkcells'], 'POST', data_xml, function(err, data) {
      if (err) return cb(err);

      // update all the cells
      var cells_by_batch_id = _.keyBy(cells, 'batchId');
      if (data.entry && data.entry.length) data.entry.forEach(function(cell_data) {
        cells_by_batch_id[cell_data['batch:id']].updateValuesFromResponseData(cell_data);
      });
      cb();
    });
  }
  this.del = function(cb){
    spreadsheet.makeFeedRequest(self['_links']['edit'], 'DELETE', null, cb);
  }

  this.setHeaderRow = function(values, cb) {
    if ( !cb ) cb = function(){};
    if (!values) return cb();
    if (values.length > self.colCount){
      return cb(new Error('Sheet is not large enough to fit '+values.length+' columns. Resize the sheet first.'));
    }
    self.getCells({
      'min-row': 1,
      'max-row': 1,
      'min-col': 1,
      'max-col': self.colCount,
      'return-empty': true
    }, function(err, cells) {
      if (err) return cb(err);
      _.each(cells, function(cell) {
        cell.value = values[cell.col-1] ? values[cell.col-1] : '';
      });
      self.bulkUpdateCells(cells, cb);
    });
  }
}

var SpreadsheetRow = function( spreadsheet, data, xml ){
  var self = this;
  self['_xml'] = xml;
  Object.keys(data).forEach(function(key) {
    var val = data[key];
    if(key.substring(0, 4) === "gsx:") {
      if(typeof val === 'object' && Object.keys(val).length === 0) {
        val = null;
      }
      if (key == "gsx:") {
        self[key.substring(0, 3)] = val;
      } else {
        self[key.substring(4)] = val;
      }
    } else {
      if (key == "id") {
        self[key] = val;
      } else if (val['_']) {
        self[key] = val['_'];
      } else if ( key == 'link' ){
        self['_links'] = [];
        val = forceArray( val );
        val.forEach( function( link ){
          self['_links'][ link['$']['rel'] ] = link['$']['href'];
        });
      }
    }
  }, this);

  self.save = function( cb ){
    /*
    API for edits is very strict with the XML it accepts
    So we just do a find replace on the original XML.
    It's dumb, but I couldnt get any JSON->XML conversion to work reliably
    */

    var data_xml = self['_xml'];
    // probably should make this part more robust?
    data_xml = data_xml.replace('<entry>', "<entry xmlns='http://www.w3.org/2005/Atom' xmlns:gsx='http://schemas.google.com/spreadsheets/2006/extended'>");
      Object.keys( self ).forEach( function(key) {
        if (key.substr(0,1) != '_' && typeof( self[key] == 'string') ){
          data_xml = data_xml.replace( new RegExp('<gsx:'+xmlSafeColumnName(key)+">([\\s\\S]*?)</gsx:"+xmlSafeColumnName(key)+'>'), '<gsx:'+xmlSafeColumnName(key)+'>'+ xmlSafeValue(self[key]) +'</gsx:'+xmlSafeColumnName(key)+'>');
        }
    });
    spreadsheet.makeFeedRequest( self['_links']['edit'], 'PUT', data_xml, cb );
  }
  self.del = function( cb ){
    spreadsheet.makeFeedRequest( self['_links']['edit'], 'DELETE', null, cb );
  }
}

function SpreadsheetCell(spreadsheet, ss_key, worksheet_id, data){
  var links;
  this.spreadsheet = spreadsheet;
  this.row = parseInt(data['gs:cell']['$']['row']);
  this.col = parseInt(data['gs:cell']['$']['col']);
  this.batchId = 'R'+this.row+'C'+this.col;
  if(data['id'] == "https://spreadsheets.google.com/feeds/cells/" + ss_key + "/" + worksheet_id + '/' + this.batchId) {
    this.ws_id = worksheet_id;
    this.ss = ss_key;
  }else{
    this.id = data['id'];
  }

  this['_links'] = [];
  links = forceArray( data.link );
  for (var i = 0; i < links.length; i++) {
    var link = links[i];
    if(link['$']['rel'] == "self" && link['$']['href'] == this.getSelf()) continue;
    if(link['$']['rel'] == "edit" && link['$']['href'] == this.getEdit()) continue;
    this['_links'][ link['$']['rel'] ] = link['$']['href'];
  }
  if(this['_links'].length == 0) delete this['_links'];

  this.updateValuesFromResponseData(data);

  return this;
}

SpreadsheetCell.prototype.getId = function() {
  if(!!this.id) {
    return this.id;
  } else {
    return "https://spreadsheets.google.com/feeds/cells/" + this.ss + "/" + this.ws_id + '/' + this.batchId;
  }
}

SpreadsheetCell.prototype.getEdit = function() {
  if(!!this['_links'] && !!this['_links']['edit']) {
    return this['_links']['edit'];
  } else {
    return this.getId().replace(this.batchId, "private/full/" + this.batchId);
  }
}

SpreadsheetCell.prototype.getSelf = function() {
  if(!!this['_links'] && !!this['_links']['edit']) {
    return this['_links']['edit'];
  } else {
    return this.getId().replace(this.batchId, "private/full/" + this.batchId);
  }
}

SpreadsheetCell.prototype.updateValuesFromResponseData = function(_data) {
  // formula value
  var input_val = _data['gs:cell']['$']['inputValue'];
  // inputValue can be undefined so substr throws an error
  // still unsure how this situation happens
  if (input_val && input_val.substr(0,1) === '='){
    this._formula = input_val;
  } else {
    this._formula = undefined;
  }

  // numeric values
  if (_data['gs:cell']['$']['numericValue'] !== undefined) {
    this._numericValue = parseFloat(_data['gs:cell']['$']['numericValue']);
  } else {
    this._numericValue = undefined;
  }

  // the main "value" - its always a string
  this._value = _data['gs:cell']['_'] || '';
}

SpreadsheetCell.prototype.setValue = function(new_value, cb) {
  this.value = new_value;
  this.save(cb);
};

SpreadsheetCell.prototype._clearValue = function() {
  this._formula = undefined;
  this._numericValue = undefined;
  this._value = '';
}

Object.defineProperty(SpreadsheetCell.prototype, "value", {
  get: function(){
    return this._value;
  },
  set: function(val){
    if (!val) return this._clearValue();

    var numeric_val = parseFloat(val);
    if (!isNaN(numeric_val)){
      this._numericValue = numeric_val;
      this._value = val.toString();
    } else {
      this._numericValue = undefined;
      this._value = val;
    }

    if (typeof val == 'string' && val.substr(0,1) === '=') {
      // use the getter to clear the value
      this.formula = val;
    } else {
      this._formula = undefined;
    }
  }
});

Object.defineProperty(SpreadsheetCell.prototype, "formula", {
  get: function() {
    return this._formula;
  },
  set: function(val){
    if (!val) return this._clearValue();

    if (val.substr(0,1) !== '=') {
      throw new Error('Formulas must start with "="');
    }
    this._numericValue = undefined;
    this._value = '*SAVE TO GET NEW VALUE*';
    this._formula = val;
  }
});

Object.defineProperty(SpreadsheetCell.prototype, "numericValue", {
  get: function() {
    return this._numericValue;
  },
  set: function(val) {
    if (val === undefined || val === null) return this._clearValue();

    if (isNaN(parseFloat(val)) || !isFinite(val)) {
      throw new Error('Invalid numeric value assignment');
    }

    this._value = val.toString();
    this._numericValue = parseFloat(val);
    this._formula = undefined;
  }
});

Object.defineProperty(SpreadsheetCell.prototype, "valueForSave", {
  get: function() {
    return xmlSafeValue(this._formula || this._value);
  }
});

SpreadsheetCell.prototype.save = function(cb) {
  if ( !cb ) cb = function(){};
  this._needsSave = false;

  var data_xml =
    '<entry><id>'+this.getId()+'</id>'+
    '<link rel="edit" type="application/atom+xml" href="'+this.getId()+'"/>'+
    '<gs:cell row="'+this.row+'" col="'+this.col+'" inputValue="'+this.valueForSave+'"/></entry>'

  data_xml = data_xml.replace('<entry>', "<entry xmlns='http://www.w3.org/2005/Atom' xmlns:gs='http://schemas.google.com/spreadsheets/2006'>");

  var self = this;

  this.spreadsheet.makeFeedRequest( this.getEdit(), 'PUT', data_xml, function(err, response) {
    if (err) return cb(err);
    self.updateValuesFromResponseData(response);
    cb();
  });
}

SpreadsheetCell.prototype.del = function(cb) {
  this.setValue('', cb);
}

GoogleSpreadsheet.SpreadsheetCell = SpreadsheetCell;

module.exports = GoogleSpreadsheet;

//utils
var forceArray = function(val) {
  if ( Array.isArray( val ) ) return val;
  if ( !val ) return [];
  return [ val ];
}
var xmlSafeValue = function(val){
  if ( val == null ) return '';
  return String(val).replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/\n/g,'&#10;')
      .replace(/\r/g,'&#13;');
}
var xmlSafeColumnName = function(val){
  if (!val) return '';
  return String(val).replace(/[\s_]+/g, '')
      .toLowerCase();
}
