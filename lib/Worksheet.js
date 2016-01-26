var concat   = require('unique-concat')
var inherits = require('inherits')

var Entry = require('./Entry')


function getValue(item)
{
  return item.value
}


function Worksheet( spreadsheet, data ){
  if(!(this instanceof Worksheet)) return new Worksheet( spreadsheet, data )

  Worksheet.super_.call(this, spreadsheet, data)


  this.id = data.id.substring( data.id.lastIndexOf("/") + 1 );

  this.url = data.id;
  this.title = data.title;
  this.rowCount = data['gs:rowCount'];
  this.colCount = data['gs:colCount'];


  var cachedColnames

  this.getColnames = function(cb)
  {
    if(cachedColnames) return cb(null, cachedColnames)

    this.getCells({'max-row': 1}, function(error, cells)
    {
      if(error) return cb(error)

      cachedColnames = cells.map(getValue)

      cb(null, cachedColnames)
    })
  }

  this.addColnames = function(colnames, cb)
  {
    var self = this

    function setColnames()
    {
      colnames = colnames.map(function(colname, index)
      {
        return {row: 1, col: index+1, value: colname}
      })

      self.bulkUpdateCells(colnames, cb)
    }

    function setColcount()
    {
      colnames = concat(cachedColnames, colnames)

      var length = colnames.length

      // No new colnames, do nothing
      if(length === cachedColnames.length) return cb()

      // There are less headers than columns, update only colnames
      if(length <= self.colCount) return setColnames()

      self.setColumns(length, function(error, result)
      {
        if(error) return cb(error)

        setColnames()
      })
    }


    if(cachedColnames) return setColcount()

    this.getColnames(function(error)
    {
      if(error) return cb(error)

      setColcount()
    })
  }
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

Worksheet.prototype.setMetadata = function(title, rowCount, colCount, cb)
{
  var self = this

  var data =
  [
    '<title type="text">'+title+'</title>',
    '<gs:rowCount>'+rowCount+'</gs:rowCount>',
    '<gs:colCount>'+colCount+'</gs:colCount>',
  ]

  Worksheet.super_.prototype.save.call(this, data, function(error, result, body)
  {
    if(error) return cb(error)

    self.title    = title
    self.rowCount = rowCount
    self.colCount = colCount

    cb(null, result, body)
  })
}

Worksheet.prototype.setColumns = function(value, cb)
{
  this.setMetadata(this.title, this.rowCount, value, cb)
}


module.exports = Worksheet
