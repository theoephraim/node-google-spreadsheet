var utils = require('./utils')

var forceArray   = utils.forceArray
var xmlSafeValue = utils.xmlSafeValue


function Cell( spreadsheet, worksheet_id, data ){
  if(!(this instanceof Cell)) return new Cell( spreadsheet, worksheet_id, data )

  this.id = data.id;
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

    var edit_id = 'https://spreadsheets.google.com/feeds/cells/key/worksheetId/private/full/R'+this.row+'C'+this.col;
    var data_xml =
    [
      '<entry>',
      '  <id>'+edit_id+'</id>',
      '  <link rel="edit" type="application/atom+xml" href="'+edit_id+'"/>',
      '  <gs:cell row="'+this.row+'" col="'+this.col+'" inputValue="'+this.getValueForSave()+'"/>',
      '</entry>'
    ].join('\n')

    data_xml = data_xml.replace('<entry>', "<entry xmlns='http://www.w3.org/2005/Atom' xmlns:gs='http://schemas.google.com/spreadsheets/2006'>");

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
