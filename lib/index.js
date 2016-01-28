var http        = require("http");
var querystring = require("querystring");

var async      = require("async");
var forceArray = require('force-array')
var request    = require("request");
var xml2js     = require("xml2js");
var _          = require('lodash');
var GoogleAuth = require("google-auth-library");

var Cell      = require('./Cell')
var Row       = require('./Row')
var Worksheet = require('./Worksheet')
var utils     = require('./utils')

var xmlSafeColumnName = utils.xmlSafeColumnName
var xmlSafeValue      = utils.xmlSafeValue


var GOOGLE_FEED_URL = "https://spreadsheets.google.com/feeds/";
var GOOGLE_AUTH_SCOPE = ["https://spreadsheets.google.com/feeds"];


// The main class that represents a single sheet
// this is the main module.exports
function GooogleSpreadsheet( ss_key, auth_id, options ){
  if(!(this instanceof GooogleSpreadsheet))
    return new GooogleSpreadsheet( ss_key, auth_id, options )

  var self = this;
  var google_auth = null;
  var visibility = 'public';
  var projection = 'values';

  var auth_mode = 'anonymous';

  var auth_client = new GoogleAuth();
  var jwt_client;

  options = options || {};

  var xml_parser = new xml2js.Parser({
    // options carried over from older version of xml2js
    // might want to update how the code works, but for now this is fine
    explicitArray: false,
    explicitRoot: false
  });

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
    if (typeof creds == 'string') creds = require(creds);
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
      cb(null, token)
    });
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
        if (google_auth.expires > +new Date()) return step();
        renewJwtAuth(step);
      },
      request: function(result, step) {
        var headers =
        {
          'Gdata-Version': '3.0',
        }

        // [Hack] bulkUpdateCells() don't work well with etags, so we ignore them
        var us = url.split('/')
        if(us[us.length-1] === 'batch')
          headers['If-Match'] = '*'

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
            return cb( new Error("HTTP error " + response.statusCode + ": " + http.STATUS_CODES[response.statusCode]) + " "+JSON.stringify(body));
          } else if ( response.statusCode === 200 && response.headers['content-type'].indexOf('text/html') >= 0 ) {
            return cb( new Error("Sheet is private. Use authentication or make public. (see https://github.com/theoephraim/node-google-spreadsheet#a-note-on-authentication for details)"));
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
    });
  }


  // public API methods
  this.getInfo = function( cb ){
    self.makeFeedRequest( ["worksheets", ss_key], 'GET', null, function(err, data, xml) {
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
        ss_data.worksheets.push( new Worksheet( self, ws_data ) );
      })
      cb( null, ss_data );
    });
  }

  // NOTE: worksheet IDs start at 1

  this.addWorksheet = function( opts, cb ) {
    var opts = opts || {};
    var defaults = {
      title: 'New Worksheet',
      rowCount: 50,
      colCount: 10
    };

    var opts = _.extend(defaults, opts);

    var data_xml =
    [
      '<entry xmlns="http://www.w3.org/2005/Atom"',
      '       xmlns:gs="http://schemas.google.com/spreadsheets/2006">',
      '  <title>'+opts.title+'</title>',
      '  <gs:rowCount>'+opts.rowCount+'</gs:rowCount>',
      '  <gs:colCount>'+opts.colCount+'</gs:colCount>',
      '</entry>'
    ].join('\n')

    self.makeFeedRequest( ["worksheets", ss_key], 'POST', data_xml, cb );
  }


  //
  // Worksheet
  //

  this.getRows = function( worksheet_id, opts, cb ){
    // the first row is used as titles/keys and is not included

    // opts is optional
    if ( typeof( opts ) == 'function' ){
      cb = opts;
      opts = {};
    }


    var query  = {}
    if ( opts.start ) query["start-index"] = opts.start;
    if ( opts.num ) query["max-results"] = opts.num;
    if ( opts.orderby ) query["orderby"] = opts.orderby;
    if ( opts.reverse ) query["reverse"] = opts.reverse;
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

      var rows = forceArray( data.entry ).map(function(row_data)
      {
        return new Row(this, row_data)
      },
      self)

      cb(null, rows)
    })
  }

  this.addRow = function( worksheet_id, data, cb ){
    var cells = Object.keys(data)
    .map(function(key)
    {
      return '<gsx:'+xmlSafeColumnName(key)+'>'+xmlSafeValue(data[key])+
             '</gsx:'+xmlSafeColumnName(key)+'>'
    })

    var data_xml =
    [
      '<entry xmlns="http://www.w3.org/2005/Atom"',
      '       xmlns:gsx="http://schemas.google.com/spreadsheets/2006/extended">',
      '  '+cells.join('\n  '),
      '</entry>'
    ].join('\n')

    self.makeFeedRequest( ["list", ss_key, worksheet_id], 'POST', data_xml, cb );
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


    this.makeFeedRequest(["cells", ss_key, worksheet_id], 'GET', query, function (err, data, xml) {
      if (err) return cb(err);
      if (data===true) {
        return cb(new Error('No response to getCells call'))
      }

      var cells = forceArray(data.entry).map(function( cell_data ){
        return new Cell( this, cell_data );
      },
      self);

      cb( null, cells );
    });
  }

  // this.bulkUpdateCells = function (worksheet_id, cells, cb) {
  //   var entries = cells.map((cell, i) => {
  //     cell._needsSave = false;
  //     return `<entry>
  //       <batch:id>${cell.id}</batch:id>
  //       <batch:operation type="update"/>
  //       <id>${cell.id}</id>
  //       <link rel="edit" type="application/atom+xml"
  //         href="${cell._links.edit}"/>
  //       <gs:cell row="${cell.row}" col="${cell.col}" inputValue="${cell.getValueForSave()}"/>
  //     </entry>`
  //   });
  //   var worksheetUrl = `https://spreadsheets.google.com/feeds/cells/${ss_key}/${worksheet_id}/private/full`;
  //   var data_xml = `<feed xmlns="http://www.w3.org/2005/Atom"
  //     xmlns:batch="http://schemas.google.com/gdata/batch"
  //     xmlns:gs="http://schemas.google.com/spreadsheets/2006">
  //     <id>${worksheetUrl}</id>
  //     ${entries.join("\n")}
  //   </feed>`
  //   console.log(data_xml);
  //   self.makeFeedRequest(`https://spreadsheets.google.com/feeds/cells/${ss_key}/${worksheet_id}/private/full/batch`,
  //                        'POST', data_xml, cb)
  // }

  this.bulkUpdateCells = function (worksheet_id, cells, cb) {
    var worksheetUrl = GOOGLE_FEED_URL+"cells/" + ss_key + "/" + worksheet_id

    var entries = cells.map(function (cell) {
      cell._needsSave = false;

      var id = cell.id || worksheetUrl+'/R'+cell.row+'C'+cell.col

      var inputValue = cell.getValueForSave
                     ? cell.getValueForSave()
                     : cell.value

      var result =
      [
        '<entry>',
        '  <batch:operation type="update"/>',
        '  <id>'+id+'</id>',
        '  <gs:cell row="'+cell.row+'" col="'+cell.col+'" inputValue="'+inputValue+'"/>',
        '</entry>'
      ].join('\n  ')

      return result
    });

    var data_xml =
    [
      '<feed xmlns="http://www.w3.org/2005/Atom"',
      '      xmlns:batch="http://schemas.google.com/gdata/batch"',
      '      xmlns:gs="http://schemas.google.com/spreadsheets/2006">',
      '  ' + entries.join('\n  '),
      '</feed>'
    ].join('\n')

    this.makeFeedRequest(worksheetUrl + "/private/full/batch", 'POST', data_xml, cb);
  };
};


module.exports = GooogleSpreadsheet;
