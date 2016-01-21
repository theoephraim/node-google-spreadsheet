function forceArray(val) {
  if ( Array.isArray( val ) ) return val;
  if ( !val ) return [];
  return [ val ];
}

function xmlSafeValue(val){
  if ( val == null ) return '';
  return String(val).replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
}

function xmlSafeColumnName(val){
  if (!val) return '';
  return String(val).replace(/[\s_]+/g, '')
      .toLowerCase();
}


exports.forceArray        = forceArray
exports.xmlSafeValue      = xmlSafeValue
exports.xmlSafeColumnName = xmlSafeColumnName
