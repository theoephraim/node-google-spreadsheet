function Worksheet( spreadsheet, data ){
  if(!(this instanceof Worksheet)) return new Worksheet( spreadsheet, data )

  var self = this;

  self.url = data.id;
  self.id = data.id.substring( data.id.lastIndexOf("/") + 1 );
  self.title = data.title;
  self.rowCount = data['gs:rowCount'];
  self.colCount = data['gs:colCount'];

  this.getRows = function( opts, cb ){
    spreadsheet.getRows( self.id, opts, cb );
  }
  this.getCells = function (opts, cb) {
    spreadsheet.getCells( self.id, opts, cb );
  }
  this.addRow = function( data, cb ){
    spreadsheet.addRow( self.id, data, cb );
  }
  this.bulkUpdateCells = function( cells, cb ) {
    spreadsheet.bulkUpdateCells( self.id, cells, cb );
  }
  this.del = function ( cb ){
    spreadsheet.makeFeedRequest( self.url, 'DELETE', null, cb );
  }
}


module.exports = Worksheet
