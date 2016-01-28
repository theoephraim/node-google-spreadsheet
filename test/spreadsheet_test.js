'use strict';

/*
These tests use the test spreadsheet accessible at https://docs.google.com/spreadsheets/d/148tpVrZgcc-ReSMRXiQaqf9hstgT8HTzyPeKx6f399Y/edit#gid=0

In order to allow other devs to test both read and write funcitonality, the doc must be public read/write which means if someone feels like it, they could mess up the sheet which would mess up the tests. Please don't do that...
*/

var async = require('async');

var GoogleSpreadsheet = require("..");
var doc = new GoogleSpreadsheet('148tpVrZgcc-ReSMRXiQaqf9hstgT8HTzyPeKx6f399Y');
var creds = require('./test_creds');
var sheet;

module.exports.node_google_spreadsheet = {
  test_info: function(test){
    test.expect(2);
    doc.getInfo( function(err, sheet_info){
      // even with public read/write, I think sheet author should stay constant
      test.equal( sheet_info.author.email, 'theozero@gmail.com', 'can read sheet info from google doc');

      sheet = sheet_info.worksheets[0];
      test.equal( sheet.title, 'Sheet1', 'can read sheet names from doc');

      test.done();
    });
  },
  check_init_auth: function(test){
    doc.useServiceAccountAuth(creds, function(err){
      test.done(err);
    })
  },
  clear_sheet: function(test){
    sheet.getRows(function(err, rows){
      if ( rows.length == 0 ) return test.done();
      async.each( rows, function(row, cb){
        row.del(cb);
      }, function(err){
        if (err) console.log(err);
        test.done()
      });
    })
  },
  check_delete: function(test){
    test.expect(1);
    async.waterfall([
      function read(cb){
        sheet.getRows( cb );
      },
      function check(rows, cb){
        test.equal( rows.length, 0, 'sheet should be empty after delete calls');
        cb();
      }
    ], function(err){
      if (err) console.log(err);
      test.done()
    });
  },
  basic_write_and_read: function(test){
    test.expect(2);
    async.waterfall([
      function write(cb){
        // NOTE -- key and val are arbitrary headers.
        // These are the column headers in the first row of the spreadsheet.
        sheet.addRow({ col1: 'test-col1', col2: 'test-col2' }, function(err) {
          cb(err);
        });
      },
      function read(cb){
        sheet.getRows( cb );
      },
      function check(rows, cb){
        test.equal( rows[0].col1, 'test-col1', 'newly written value should match read value');
        test.equal( rows[0].col2, 'test-col2', 'newly written value should match read value');
        cb();
      }
    ], function(err){
      if (err) console.log(err);
      test.done()
    });
  },
  check_newlines_read: function(test){
    test.expect(2);
    async.waterfall([
      function write(cb){
        sheet.addRow({ col1: "Newline\ntest", col2: "Double\n\nnewline test" }, function(){
          cb();
        });
      },
      function read(cb){
        sheet.getRows( cb );
      },
      function check(rows, cb){
        // this was an issue before with an older version of xml2js
        test.ok( rows[1].col1.indexOf("\n") > 0, 'newline is read from sheet');
        test.ok( rows[1].col2.indexOf("\n\n") > 0, 'double newline is read from sheet');
        cb();
      }
    ], function(err){
      if (err) console.log(err);
      test.done()
    });
  }
  // TODO - test cell based feeds
};
