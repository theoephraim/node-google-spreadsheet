function Worksheet( spreadsheet, data ){
  if(!(this instanceof Worksheet)) return new Worksheet( spreadsheet, data )

  this.url = data.id;
  this.id = data.id.substring( data.id.lastIndexOf("/") + 1 );
  this.title = data.title;
  this.rowCount = data['gs:rowCount'];
  this.colCount = data['gs:colCount'];


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
}


module.exports = Worksheet
