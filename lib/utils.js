const REGEXP_SANITIZE = /[^\w-]+/g


function xmlSafeValue(val)
{
  if(val == null) return ''

  return String(val)
    .replace('&', '&amp;' )
    .replace('<', '&lt;'  )
    .replace('>', '&gt;'  )
    .replace('"', '&quot;')
}

function xmlSafeColumnName(val)
{
  if(val == null) return ''

  return val.toLowerCase().replace(REGEXP_SANITIZE, '')
}


exports.xmlSafeValue      = xmlSafeValue
exports.xmlSafeColumnName = xmlSafeColumnName
