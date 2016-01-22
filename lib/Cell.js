var inherits = require('inherits')

var Entry        = require('./Entry')
var xmlSafeValue = require('./utils').xmlSafeValue


var GOOGLE_FEED_URL = "https://spreadsheets.google.com/feeds/";


function Cell( spreadsheet, data ){
  if(!(this instanceof Cell))
    return new Cell( spreadsheet, data )

  Cell.super_.call(this, spreadsheet, data)

  this.id = data.id;

  var cell = data['gs:cell']

  this.row = parseInt(cell.$.row)
  this.col = parseInt(cell.$.col)
  this.value        = cell._
  this.numericValue = cell.$.numericValue
  this.inputValue   = cell.$.inputValue

  this.save = function(cb) {
    this._needsSave = false;

    var data = ['<gs:cell row="'+this.row+'" col="'+this.col+'" inputValue="'+this.getValueForSave()+'"/>']

    Cell.super_.prototype.save.call(this, data, cb)
  }
}
inherits(Cell, Entry)


Cell.prototype.getValueForSave = function(){
  var _hasFormula = this.inputValue[0] === '=';
  if (_hasFormula){
    return this.inputValue;
  }
  return xmlSafeValue(this.value);
}

Cell.prototype.setValue = function(new_value, cb) {
  this.value = new_value;
  this.save(cb);
};

Cell.prototype.del = function(cb) {
  this.setValue('', cb);
}


module.exports = Cell
