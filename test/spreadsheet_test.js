'use strict';

/*
These tests use the test spreadsheet accessible at https://docs.google.com/spreadsheet/ccc?key=0Araic6gTol6SdEtwb1Badl92c2tlek45OUxJZDlyN2c#gid=0

In order to allow other devs to test both read and write funcitonality, the doc must be public read/write which means if someone feels like it, they could mess up the sheet which would mess up the tests. Please don't do that...
*/

var async = require('async');

var GoogleSpreadsheet = require("../index.js");
var doc = new GoogleSpreadsheet('0Araic6gTol6SdGtyUVAzQmVLM0lxUWlBMkNraWVubUE');
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
  check_auth_env_vars: function(test){
    test.expect(1);
    var auth_set = process.env.GOOGLE_ACCOUNT != null && process.env.GOOGLE_PASSWORD != null;
    test.ok(auth_set, 'Please set env variables GOOGLE_ACCOUNT and GOOGLE_PASSWORD to run tests' );
    test.done(false);
  },
  check_init_auth: function(test){
    doc.setAuth(process.env.GOOGLE_ACCOUNT, process.env.GOOGLE_PASSWORD, function(err){
      test.done();
    })
  },
  clear_sheet: function(test){
    sheet.getRows(function(err, rows){
      if ( rows.length == 0 ) test.done();
      async.each( rows, function(row, cb){
        row.del(cb);
      }, function( cb ){
        test.done();
      })
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
      test.done();
    });
  },
  basic_write_and_read: function(test){
    test.expect(2);
    async.waterfall([
      function write(cb){
        // NOTE -- key and val are arbitrary headers.
        // These are the column headers in the first row of the spreadsheet.
        sheet.addRow({ key: 'test-key', val: 'test-val' }, function(){
          cb();
        });
      },
      function read(cb){
        sheet.getRows( cb );
      },
      function check(rows, cb){
        test.equal( rows[0].key, 'test-key', 'newly written value should match read value');
        test.equal( rows[0].val, 'test-val', 'newly written value should match read value');
        cb();
      }
    ], function(err){
      if (err) console.log(err);
      test.done();
    });
  },
  check_newlines_read: function(test){
    test.expect(2);
    async.waterfall([
      function write(cb){
        sheet.addRow({ key: "Newline\ntest", val: "Double\n\nnewline test" }, function(){
          cb();
        });
      },
      function read(cb){
        sheet.getRows( cb );
      },
      function check(rows, cb){
        // this was an issue before with an older version of xml2js
        test.ok( rows[1].key.indexOf("\n") > 0, 'newline is read from sheet');
        test.ok( rows[1].val.indexOf("\n\n") > 0, 'double newline is read from sheet');
        cb();
      }
    ], function(err){
      if (err) console.log(err);
      test.done();
    });
  }
  // TODO - test cell based feeds
};
