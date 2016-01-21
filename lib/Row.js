var utils = require('./utils')

var forceArray        = utils.forceArray
var xmlSafeColumnName = utils.xmlSafeColumnName
var xmlSafeValue      = utils.xmlSafeValue


function Row( spreadsheet, data, xml ){
  if(!(this instanceof Row)) return new Row( spreadsheet, data, xml )

  Object.keys(data).forEach(function(key) {
    var val = data[key];

    if(key.substring(0, 4) === "gsx:") {
      if(typeof val === 'object' && !Object.keys(val).length) {
        val = null;
      }

      if (key === "gsx:") {
        this.gsx = val;
      } else {
        this[key.substring(4)] = val;
      }
    } else {
      if (key === "id") {
        this[key] = val;
      } else if (val._) {
        this[key] = val._;
      } else if ( key === 'link' ){
        this._links = {};

        forceArray( val ).forEach( function( link ){
          var $ = link.$;
          this._links[$.rel] = $.href;
        }, this);
      }
    }
  }, this);

  Object.defineProperties(this,
  {
    _xml: {value: xml},

    id:           {enumerable: false},
    'app:edited': {enumerable: false},
    _links:       {enumerable: false},

    save:
    {
      value: function( cb ){
        /*
        API for edits is very strict with the XML it accepts
        So we just do a find replace on the original XML.
        It's dumb, but I couldnt get any JSON->XML conversion to work reliably
        */

        // probably should make this part more robust?
        var data_xml = this._xml.replace('<entry>', "<entry xmlns='http://www.w3.org/2005/Atom' xmlns:gsx='http://schemas.google.com/spreadsheets/2006/extended'>");
        Object.keys( this ).forEach( function(key) {
          if (key.substr(0,1) !== '_' && typeof this[key] === 'string'){
            data_xml = data_xml.replace( new RegExp('<gsx:'+xmlSafeColumnName(key)+">([\\s\\S]*?)</gsx:"+xmlSafeColumnName(key)+'>'),
                                                    '<gsx:'+xmlSafeColumnName(key)+'>'+ xmlSafeValue(self[key]) +'</gsx:'+xmlSafeColumnName(key)+'>');
          }
        });
        spreadsheet.makeFeedRequest( this._links.edit, 'PUT', data_xml, cb );
      }
    },

    del:
    {
      value: function( cb ){
        spreadsheet.makeFeedRequest( this._links.edit, 'DELETE', null, cb );
      }
    }
  })
}


module.exports = Row
