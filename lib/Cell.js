var utils = require('./utils')

var forceArray   = utils.forceArray
var xmlSafeValue = utils.xmlSafeValue


var GOOGLE_FEED_URL = "https://spreadsheets.google.com/feeds/";


function Cell( spreadsheet, data ){
  if(!(this instanceof Cell))
    return new Cell( spreadsheet, data )

  this.id = data.id;
  this.etag = data.$['gd:etag'];
  this.row = parseInt(data['gs:cell'].$.row);
  this.col = parseInt(data['gs:cell'].$.col);
  this.value = data['gs:cell']._;
  this.numericValue = data['gs:cell'].$.numericValue;
  this.inputValue = data['gs:cell'].$.inputValue;

  this._links = {};
  forceArray( data.link ).forEach( function( link ){
    var $ = link.$
    this._links[ $.rel ] = $.href;
  }, this);

  this.save = function(cb) {
    this._needsSave = false;

    var data_xml =
    [
      '<entry xmlns="http://www.w3.org/2005/Atom"',
      '       xmlns:gd="http://schemas.google.com/g/2005"',
      '       xmlns:gs="http://schemas.google.com/spreadsheets/2006"',
      "       gd:etag='"+this.etag+"'>",
      '  <id>'+this._links.edit+'</id>',
      '  <link rel="edit" type="application/atom+xml" href="'+this._links.edit+'"/>',
      '  <gs:cell row="'+this.row+'" col="'+this.col+'" inputValue="'+this.getValueForSave()+'"/>',
      '</entry>'
    ].join('\n')

    spreadsheet.makeFeedRequest( this._links.edit, 'PUT', data_xml, cb );
  }
}


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
