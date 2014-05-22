var request = require("request");
var xml2js = require("xml2js");
var http = require("http");
var querystring = require("querystring");
var GoogleClientLogin = require('googleclientlogin').GoogleClientLogin;

var GOOGLE_FEED_URL = "https://spreadsheets.google.com/feeds/";

// NOTE: worksheet IDs start at 1

module.exports = function( ss_key, auth_id ){
  var self = this;
  var google_auth;

  var xml_parser = new xml2js.Parser({
    // options carried over from older version of xml2js -- might want to update how the code works, but for now this is fine
    explicitArray: false,
    explicitRoot: false,
  });

  if ( !ss_key ) {
    throw new Error("Spreadsheet key not provided.");
  }
  if ( auth_id ){
    google_auth = auth_id;
  }

  this.setAuth = function( username, password, cb ){
    var new_auth = new GoogleClientLogin({
      email: username,
      password: password,
      service: 'spreadsheets',
      accountType: GoogleClientLogin.accountTypes.google
    })
    new_auth.on(GoogleClientLogin.events.login, function(){
      google_auth = new_auth.getAuthId();
      cb( null, new_auth );
    })
    new_auth.on(GoogleClientLogin.events.error, function(err){
      cb( err );
    })
    new_auth.login();
  }

  this.getInfo = function( cb ){
    self.makeFeedRequest( ["worksheets", ss_key], 'GET', null, function(err, data, xml) {
      if ( err ) return cb( err );
      var ss_data = {
        title: data.title["_"],
        updated: data.updated,
        author: data.author,
        worksheets: []
      }
      var worksheets = forceArray(data.entry);
      worksheets.forEach( function( ws_data ) {
        ss_data.worksheets.push( new SpreadsheetWorksheet( self, ws_data ) );
      })
      cb( null, ss_data );
    });
  }
  this.getRows = function( worksheet_id, opts, query, cb ){
    // the first row is used as titles/keys and is not included

    // opts is optional
    if ( typeof( opts ) == 'function' ){
      cb = opts;
      opts = {};
      query = null;
    // so is query
    } else if ( typeof( query ) == 'function' ){
      cb = query;
      query = null;
    }

    if ( opts.start ) query["start-index"] = opts.start;
    if ( opts.num ) query["max-results"] = opts.num;
    if ( opts.orderby ) query["orderby"] = opts.orderby;
    if ( opts.reverse ) query["reverse"] = opts.reverse;

    self.makeFeedRequest( ["list", ss_key, worksheet_id], 'GET', query, function(err, data, xml) {
      if ( err ) return cb( err );

      // gets the raw xml for each entry -- this is passed to the row object so we can do updates on it later
      var entries_xml = xml.match(/<entry[^>]*>([\s\S]*?)<\/entry>/g);
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
    worksheet_id = parseInt(worksheet_id);
    if (typeof worksheet_id !== 'number' || worksheet_id < 0) {
      throw new Error('Valid worksheet not specified.');
    }

    var data_xml = '<entry xmlns="http://www.w3.org/2005/Atom" xmlns:gsx="http://schemas.google.com/spreadsheets/2006/extended">' + "\n";
      Object.keys(data).forEach(function(key) {
        if (key != 'id' && key != 'title' && key != 'content' && key != '_links'){
          data_xml += '<gsx:'+ xmlSafeColumnName(key) + '>' + xmlSafeValue(data[key]) + '</gsx:'+ xmlSafeColumnName(key) + '>' + "\n"
        }
    });
      data_xml += '</entry>';
    self.makeFeedRequest( ["list", ss_key, worksheet_id], 'POST', data_xml, cb );
  }
  this.getCells = function (worksheet_id, opts, cb) {
    // opts is optional
    if (typeof( opts ) == 'function') {
      cb = opts;
      opts = {};
    }

    var query = {};
    if (opts.minRow) query["min-row"] = opts.minRow;
    if (opts.maxRow) query["max-row"] = opts.maxRow;
    if (opts.minCol) query["min-col"] = opts.minCol;
    if (opts.maxCol) query["max-col"] = opts.maxCol;

    self.makeFeedRequest(["cells", ss_key, worksheet_id], 'GET', query, function (err, data, xml) {
      if (err) return cb(err);

      var cells = [];
      var entries = forceArray(data['entry']);
      var i = 0;
      entries.forEach(function( cell_data ){
        cells.push( new SpreadsheetCell( self, worksheet_id, cell_data ) );
      });

      cb( null, cells );
    });
  }

  this.makeFeedRequest = function( url_params, method, query_or_data, cb ){
    var url;
    var headers = {};
    if (!cb ) cb = function(){};
    if ( typeof(url_params) == 'string' ) {
      // used for edit / delete requests
      url = url_params;
    } else if ( Array.isArray( url_params )){
      //used for get and post requets
      var visibility = google_auth ? 'private' : 'public';
      var projection = google_auth ? 'full' : 'values';
      url_params.push( visibility, projection );
      url = GOOGLE_FEED_URL + url_params.join("/");
    }

    if ( google_auth ) {
      if (google_auth.type === 'Bearer') {
        headers['Authorization'] = 'Bearer ' + google_auth.value;
      } else {
        headers['Authorization'] = "GoogleLogin auth=" + google_auth;
      }
    }

    if ( method == 'POST' || method == 'PUT' ){
      headers['content-type'] = 'application/atom+xml';
    }

    if ( method == 'GET' && query_or_data ) {
      url += "?" + querystring.stringify( query_or_data );
    }    

    request( {
      url: url,
      method: method,
      headers: headers,
      body: method == 'POST' || method == 'PUT' ? query_or_data : null
    }, function(err, response, body){
      if (err) {
        return cb( err );
      } else if( response.statusCode === 401 ) {
        return cb( new Error("Invalid authorization key."));
      } else if ( response.statusCode >= 400 ) {
        // console.log( body );
        return cb( new Error("HTTP error " + response.statusCode + ": " + http.STATUS_CODES[response.statusCode]));
      }

      if ( body ){
        xml_parser.parseString(body, function(err, result){
          if ( err ) return cb( err );
          cb( null, result, body );
        });
      } else {
        if ( err ) cb( err );
        else cb( null, true );
      }

    })
  }
};

// Classes
var SpreadsheetWorksheet = function( spreadsheet, data ){
  var self = this;
  self.id = data.id.substring( data.id.lastIndexOf("/") + 1 );
  self.title = data.title["_"];
  self.rowCount = data['gs:rowCount'];
  self.colCount = data['gs:colCount'];

  this.getRows = function( opts, query, cb ){
    spreadsheet.getRows( self.id, opts, query, cb );
  }
  this.getCells = function (opts, cb) {
    spreadsheet.getCells( self.id, opts, cb );
  }
  this.addRow = function( data, cb ){
    spreadsheet.addRow( self.id, data, cb );
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

var SpreadsheetCell = function( spreadsheet, worksheet_id, data ){
  var self = this;

  self.id = data['id'];
  self.row = parseInt(data['gs:cell']['$']['row']);
  self.col = parseInt(data['gs:cell']['$']['col']);
  self.value = data['gs:cell']['_'];

  self['_links'] = [];
  links = forceArray( data.link );
  links.forEach( function( link ){
    self['_links'][ link['$']['rel'] ] = link['$']['href'];
  });

  self.setValue = function(new_value, cb) {
    self.value = new_value;
    self.save(cb);
  };

  self.save = function(cb) {
    new_value = xmlSafeValue(self.value);
    var edit_id = 'https://spreadsheets.google.com/feeds/cells/key/worksheetId/private/full/R'+self.row+'C'+self.col;
    var data_xml =
    '<entry><id>'+edit_id+'</id>'+
    '<link rel="edit" type="application/atom+xml" href="'+edit_id+'"/>'+
    '<gs:cell row="'+self.row+'" col="'+self.col+'" inputValue="'+new_value+'"/></entry>'

    data_xml = data_xml.replace('<entry>', "<entry xmlns='http://www.w3.org/2005/Atom' xmlns:gs='http://schemas.google.com/spreadsheets/2006'>");

    // console.log(self['_links']['edit']);
    // console.log(data_xml);

    spreadsheet.makeFeedRequest( self['_links']['edit'], 'PUT', data_xml, cb );
  }

  self.del = function(cb) {
    self.setValue('');
  }
}

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
        .replace(/"/g, '&quot;');
}
var xmlSafeColumnName = function(val){
    if (!val) return '';
    return String(val).replace(/\s+/g, '')
        .toLowerCase();
}
