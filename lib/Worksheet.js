var inherits = require('inherits')

var Entry = require('./Entry')


function Worksheet( spreadsheet, data ){
  if(!(this instanceof Worksheet)) return new Worksheet( spreadsheet, data )

  Worksheet.super_.call(this, spreadsheet, data)

  this.id = data.id.substring( data.id.lastIndexOf("/") + 1 );

  this.url = data.id;
  this.title = data.title;
  this.rowCount = data['gs:rowCount'];
  this.colCount = data['gs:colCount'];

}
inherits(Worksheet, Entry)


Worksheet.prototype.getRows = function( opts, cb ){
  this.spreadsheet.getRows( this.id, opts, cb );
}

Worksheet.prototype.getCells = function (opts, cb) {
  this.spreadsheet.getCells( this.id, opts, cb );
}

Worksheet.prototype.addRow = function( data, cb ){
  this.spreadsheet.addRow( this.id, data, cb );
}

Worksheet.prototype.bulkUpdateCells = function( cells, cb ) {
  this.spreadsheet.bulkUpdateCells( this.id, cells, cb );
}

Worksheet.prototype.del = function ( cb ){
  this.spreadsheet.makeFeedRequest( this.url, 'DELETE', null, cb );
}

Worksheet.prototype.setColumns = function(value, cb)
{
  var self = this

  var data =
  [
    '<title type="text">'+this.title+'</title>',
    '<gs:rowCount>'+this.rowCount+'</gs:rowCount>',
    '<gs:colCount>'+value+'</gs:colCount>',
  ]

  Worksheet.super_.prototype.save.call(this, data, function(error, result, body)
  {
    if(error) return cb(error)

    self.colCount = value
    cb(null, result, body)
  })
}


module.exports = Worksheet
