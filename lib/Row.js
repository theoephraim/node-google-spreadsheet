var forceArray = require('force-array')
var inherits   = require('inherits')

var Entry = require('./Entry')
var utils = require('./utils')

var xmlSafeColumnName = utils.xmlSafeColumnName
var xmlSafeValue      = utils.xmlSafeValue


function Row(spreadsheet, data)
{
  if(!(this instanceof Row)) return new Row(spreadsheet, data)

  Row.super_.call(this, spreadsheet, data)

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
    } else if (key === "id") {
      this[key] = val;
    } else if (val._) {
      this[key] = val._;
    }
  }, this);

  Object.defineProperties(this,
  {
    id:           {enumerable: false},
    'app:edited': {enumerable: false}
  })
}
inherits(Row, Entry)


Row.prototype.save = function(cb)
{
  var data = Object.keys(this)
  .filter(function(key)
  {
    return key[0] !== '_' && typeof this[key] === 'string'
  })
  .map(function(key)
  {
    return '<gsx:'+xmlSafeColumnName(key)+'>'+xmlSafeValue(self[key])
          +'</gsx:'+xmlSafeColumnName(key)+'>'
  })

  Row.super_.prototype.save.call(this, data, cb)
}

Row.prototype.del = function(cb)
{
  this.spreadsheet.makeFeedRequest(this._links.edit, 'DELETE', null, cb)
}


module.exports = Row
