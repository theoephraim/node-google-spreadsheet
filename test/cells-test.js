var should = require('chai').should();
var async = require('async');
var _ = require('lodash');

var GoogleSpreadsheet = require("../index.js");

var sheet_ids = require('./config');

var docs = {};
Object.keys(sheet_ids).forEach(function(key) {
  docs[key] = new GoogleSpreadsheet(sheet_ids[key]);
});

var creds = require('./service-account-creds.json');

var doc = docs['private'];
var sheet;

var NUM_ROWS = 10;
var NUM_COLS = 10;

describe('Cell-based feeds', function() {
  this.timeout(5000);

  before(function(done) {
    async.series({
      setupAuth: function(step) {
        doc.useServiceAccountAuth(creds, step);
      },
      addSheet: function(step) {
        doc.addWorksheet({
          rowCount: NUM_ROWS,
          colCount: NUM_COLS
        }, function(err, _sheet) {
          sheet = _sheet;
          step(err);
        });
      }
    }, done);
  });

  after(function(done) {
    sheet.del(done);
  });

  describe('getCells params', function() {
    it('fetches an empty array if sheet is empty', function(done) {
      sheet.getCells({}, function(err, cells) {
        cells.length.should.equal(0);
        done(err);
      });
    });

    it('fetches entire sheet if `return-empty` is true', function(done) {
      sheet.getCells({'return-empty': true}, function(err, cells) {
        cells.length.should.equal(NUM_ROWS * NUM_COLS);
        done(err);
      });
    });

    it('respects `min-row`', function(done) {
      sheet.getCells({'return-empty': true, 'min-row': 2}, function(err, cells) {
        cells.length.should.equal((NUM_ROWS - 2 + 1) * NUM_COLS);
        done(err);
      });
    });

    it('respects `max-row`', function(done) {
      sheet.getCells({'return-empty': true, 'max-row': 5}, function(err, cells) {
        cells.length.should.equal(5 * NUM_COLS);
        done(err);
      });
    });

    it('respects `min-col`', function(done) {
      sheet.getCells({'return-empty': true, 'min-col': 2}, function(err, cells) {
        cells.length.should.equal((NUM_COLS - 2 + 1) * NUM_ROWS);
        done(err);
      });
    });

    it('respects `max-col`', function(done) {
      sheet.getCells({'return-empty': true, 'max-col': 5}, function(err, cells) {
        cells.length.should.equal(5 * NUM_ROWS);
        done(err);
      });
    });

    it('respects combined min/max params', function(done) {
      sheet.getCells({
        'return-empty': true,
        'min-row': 2,
        'max-row': 4,
        'min-col': 5,
        'max-col': 8
      }, function(err, cells) {
        cells.length.should.equal((4-2+1) * (8-5+1));
        done(err);
      });
    });

    it('handles requests outisde the bounds of the sheet', function(done) {
      sheet.getCells({
        'return-empty': true,
        'max-row': 1,
        'max-col': NUM_COLS+1
      }, function(err, cells) {
        err.should.be.an.error;
        err.toString().indexOf('max-col').should.not.equal(-1);
        done();
      });
    });
  });

  describe('manipulating cell data', function() {
    var cell;

    before(function(done) {
      sheet.getCells({
        'return-empty': true
      }, function(err, cells) {
        cell = cells[0];
        done(err);
      });
    });

    it('has row and column numbers', function(done) {
      sheet.getCells({}, function(err, new_cells) {
        cell.row.should.equal(1);
        cell.col.should.equal(1);
        done(err);
      });
    });

    it('can update a single cell by calling `setValue`', function(done) {
      cell.setValue('HELLO', function(err) {
        (!err).should.be.true;
        cell.value.should.equal('HELLO');
        sheet.getCells({}, function(err, cells) {
          cells[0].value.should.equal('HELLO');
          done(err);
        });
      });
    });

    it('can update a single cell by `save`', function(done) {
      cell.value = 'GOODBYE';
      cell.save(function(err) {
        (!err).should.be.true;
        cell.value.should.equal('GOODBYE');
        sheet.getCells({}, function(err, cells) {
          cells[0].value.should.equal('GOODBYE');
          done(err);
        });
      });
    });

    it('supports `value` to numeric values', function(done) {
      cell.value = 123;
      cell.value.should.equal('123');
      cell.numericValue.should.equal(123);
      (cell.formula === undefined).should.be.true;

      cell.save(function(err) {
        (!err).should.be.true;
        cell.value.should.equal('123');
        cell.numericValue.should.equal(123);
        (cell.formula === undefined).should.be.true;
        done();
      });
    });

    it('supports setting `numericValue`', function(done) {
      cell.numericValue = 456;
      cell.value.should.equal('456');
      cell.numericValue.should.equal(456);
      (cell.formula === undefined).should.be.true;

      cell.save(function(err) {
        (!err).should.be.true;
        cell.value.should.equal('456');
        cell.numericValue.should.equal(456);
        (cell.formula === undefined).should.be.true;
        done();
      });
    });

    it('throws an error if an invalid `numericValue` is set', function() {
      var err;
      try {
        cell.numericValue = 'abc';
      } catch (_err) { err = _err; }
      err.should.be.an.error;
    });

    it('supports non-numeric values', function(done) {
      cell.value = 'ABC';
      cell.value.should.equal('ABC');
      (cell.numericValue === undefined).should.be.true;
      (cell.formula === undefined).should.be.true;

      cell.save(function(err) {
        (!err).should.be.true;
        cell.value.should.equal('ABC');
        (cell.numericValue === undefined).should.be.true;
        (cell.formula === undefined).should.be.true;
        done();
      });
    });

    it('throws an error if setting an invalid formula', function() {
      var err;
      try {
        cell.formula = 'This is not a formula';
      } catch (_err) { err = _err; }
      err.should.be.an.error;
    });

    it('supports formulas that resolve to a numeric value', function(done) {
      cell.formula = '=ROW()';
      (cell.numericValue === undefined).should.be.true;
      cell.value.should.equal('*SAVE TO GET NEW VALUE*');
      cell.formula.should.equal('=ROW()');
      cell.save(function(err) {
        (!err).should.be.true;
        cell.value.should.equal('1');
        cell.numericValue.should.equal(1);
        cell.formula.should.equal('=ROW()');
        done();
      });
    });

    it('persists the new formula value', function(done){
      sheet.getCells({}, function(err, cells) {
        cells[0].value.should.equal('1');
        cells[0].numericValue.should.equal(1);
        cells[0].formula.should.equal('=ROW()');
        done(err);
      });
    });

    it('supports formulas that resolve to non-numeric values', function(done) {
      cell.formula = '=IF(TRUE, "ABC", "DEF")';
      cell.save(function(err) {
        (!err).should.be.true;
        cell.value.should.equal('ABC');
        (cell.numericValue === undefined).should.be.true;
        cell.formula.should.equal('=IF(TRUE, "ABC", "DEF")');
        done();
      });
    });

    it('supports setting the formula via the `value` property', function(done) {
      cell.value = '=COLUMN()';
      cell.value.should.equal('*SAVE TO GET NEW VALUE*');
      cell.formula.should.equal('=COLUMN()');
      (cell.numericValue === undefined).should.be.true;
      cell.save(function(err) {
        (!err).should.be.true;
        cell.value.should.equal('1');
        cell.numericValue.should.equal(1);
        cell.formula.should.equal('=COLUMN()');
        done();
      });
    });

    it('supports clearing the `value`', function(done) {
      cell.value = '4';
      cell.value = '';
      cell.value.should.equal('');
      (cell.numericValue === undefined).should.be.true;
      (cell.formula === undefined).should.be.true;

      cell.save(function(err) {
        (!err).should.be.true;
        cell.value.should.equal('');
        (cell.numericValue === undefined).should.be.true;
        (cell.formula === undefined).should.be.true;
        done();
      });
    });

    it('can update a single cell with linefeed in value', function(done) {
      cell.setValue('HELLO\nWORLD', function(err) {
        (!err).should.be.true;
        cell.value.should.equal('HELLO\nWORLD');
        sheet.getCells({}, function(err, cells) {
          cells[0].value.should.equal('HELLO\nWORLD');
          done(err);
        });
      });
    });
  });

  describe('bulk cell updates', function() {
    var cells;

    before(function(done) {
      sheet.getCells({
        'return-empty': true
      }, function(err, _cells) {
        cells = _cells.slice(0,4);
        done(err);
      });
    });

    it('succeeds if no cells need an update', function(done) {
      sheet.bulkUpdateCells(cells, function(err) {
        (!err).should.be.true;
        done();
      })
    });

    it('can update multiple cells at once', function(done) {
      cells[0].value = 1;
      cells[1].value = '2';
      cells[2].formula = '=A1+B1';
      sheet.bulkUpdateCells(cells, function(err) {
        (!err).should.be.true;
        cells[0].numericValue.should.equal(1);
        cells[1].numericValue.should.equal(2);
        cells[2].numericValue.should.equal(3);
        done();
      })
    });
  });

});
