var async = require('async');

var GoogleSpreadsheet = require("./index.js");
var doc = new GoogleSpreadsheet('1saRApLme-qgAH0nyfg2mqPcm980nzKDg5kES0tS90rg');

// doc.getInfo(function(err, info){
//   if (err) return console.log(err);
//   console.log(info);
// });
// return;

var sheet;

doc.useServiceAccountAuth(require('./creds'), function(err){
  if (err) {
    console.log(err)
    return;
  }
  doc.getInfo(function(err, info){
    if (err) return console.log(err);
    console.log(info);
    sheet = info.worksheets[0];

    // info.worksheets[0].getRows(function(err, rows){
    //   console.log(rows[0]);
    // });
    addRow();
    setInterval(addRow, 1000*60);
  });
});

function addRow(){
  var now = new Date();
  sheet.addRow({time: now.toString(), test: 'foo'}, function(err, result){
    console.log(err);
    console.log(result);
  });
}


