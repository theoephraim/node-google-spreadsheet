var forceArray = require('./utils').forceArray


function Worksheet( spreadsheet, data ){
  if(!(this instanceof Worksheet)) return new Worksheet( spreadsheet, data )

  this.url = data.id;
  this.etag = data.$['gd:etag'];
  this.id = data.id.substring( data.id.lastIndexOf("/") + 1 );
  this.title = data.title;
  this.rowCount = data['gs:rowCount'];
  this.colCount = data['gs:colCount'];

  this._links = {};
  forceArray( data.link ).forEach( function( link ){
    var $ = link.$
    this._links[ $.rel ] = $.href;
  }, this);

  this.getRows = function( opts, cb ){
    spreadsheet.getRows( this.id, opts, cb );
  }
  this.getCells = function (opts, cb) {
    spreadsheet.getCells( this.id, opts, cb );
  }
  this.addRow = function( data, cb ){
    spreadsheet.addRow( this.id, data, cb );
  }
  this.bulkUpdateCells = function( cells, cb ) {
    spreadsheet.bulkUpdateCells( this.id, cells, cb );
  }
  this.del = function ( cb ){
    spreadsheet.makeFeedRequest( this.url, 'DELETE', null, cb );
  }

  this.setColumns = function(value, cb)
  {
    var self = this

    var data_xml =
    [
      '<entry xmlns="http://www.w3.org/2005/Atom"',
      '       xmlns:gd="http://schemas.google.com/g/2005"',
      '       xmlns:gs="http://schemas.google.com/spreadsheets/2006">',
      "       gd:etag='"+this.etag+"'>",
      '  <title type="text">'+this.title+'</title>',
      '  <gs:rowCount>'+this.rowCount+'</gs:rowCount>',
      '  <gs:colCount>'+value+'</gs:colCount>',
      '</entry>'
    ].join('\n')

    spreadsheet.makeFeedRequest(this._links.edit, 'PUT', data_xml,
    function(error, result, body)
    {
      if(error) return cb(error)

      self.colCount = value
      cb(null, result, body)
    })
  }
}


module.exports = Worksheet
