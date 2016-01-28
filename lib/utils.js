
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


exports.xmlSafeValue      = xmlSafeValue
exports.xmlSafeColumnName = xmlSafeColumnName
