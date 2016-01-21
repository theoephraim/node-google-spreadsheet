var utils = require('./utils')

var forceArray   = utils.forceArray
var xmlSafeValue = utils.xmlSafeValue


function Cell( spreadsheet, worksheet_id, data ){
  if(!(this instanceof Cell)) return new Cell( spreadsheet, worksheet_id, data )

  var self = this;

  self.id = data['id'];
  self.row = parseInt(data['gs:cell']['$']['row']);
  self.col = parseInt(data['gs:cell']['$']['col']);
  self.value = data['gs:cell']['_'];
  self.numericValue = data['gs:cell']['$']['numericValue'];
  self.inputValue = data['gs:cell']['$']['inputValue'];

  var _hasFormula = self.inputValue.substr(0,1) === '=';

  self._links = {};
  forceArray( data.link ).forEach( function( link ){
    self._links[ link.$.rel ] = link.$.href;
  });

  self.getValueForSave = function(){
    if (_hasFormula){
      return self.inputValue;
    }
    return xmlSafeValue(self.value);
  }

  self.setValue = function(new_value, cb) {
    self.value = new_value;
    self.save(cb);
  };

  self.save = function(cb) {
    self._needsSave = false;

    var edit_id = 'https://spreadsheets.google.com/feeds/cells/key/worksheetId/private/full/R'+self.row+'C'+self.col;
    var data_xml =
    [
      '<entry>',
      '  <id>'+edit_id+'</id>',
      '  <link rel="edit" type="application/atom+xml" href="'+edit_id+'"/>',
      '  <gs:cell row="'+self.row+'" col="'+self.col+'" inputValue="'+self.getValueForSave()+'"/>',
      '</entry>'
    ].join('\n')

    data_xml = data_xml.replace('<entry>', "<entry xmlns='http://www.w3.org/2005/Atom' xmlns:gs='http://schemas.google.com/spreadsheets/2006'>");

    spreadsheet.makeFeedRequest( self._links.edit, 'PUT', data_xml, cb );
  }

  self.del = function(cb) {
    self.setValue('', cb);
  }
}


module.exports = Cell
