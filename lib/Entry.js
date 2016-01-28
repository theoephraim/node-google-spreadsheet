var forceArray = require('force-array')


function Entry(spreadsheet, data)
{
  if(!(this instanceof Entry)) return new Entry(spreadsheet, data)

  var _links = {}
  forceArray(data.link).forEach(function(link)
  {
    var $ = link.$
    _links[$.rel] = $.href
  })

  Object.defineProperties(this,
  {
    etag: {value: data.$['gd:etag']},
    _links: {value: _links},
    spreadsheet: {value: spreadsheet}
  })
}

Entry.prototype.save = function(data, cb)
{
  var data_xml =
  [
    '<entry xmlns="http://www.w3.org/2005/Atom"',
    '       xmlns:gd="http://schemas.google.com/g/2005"',
    '       xmlns:gs="http://schemas.google.com/spreadsheets/2006"',
    "       gd:etag='"+this.etag+"'>",
    '  '+data.join('\n  '),
    '</entry>'
  ].join('\n')

  this.spreadsheet.makeFeedRequest(this._links.edit, 'PUT', data_xml, cb)
}


module.exports = Entry
