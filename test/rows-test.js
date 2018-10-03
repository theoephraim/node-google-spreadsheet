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

var MAX_NUM = 5;
var NUMBERS = _.times(MAX_NUM);
var LETTERS = ['C', 'D', 'E', 'A', 'B']

describe('Row-based feeds', function() {
  this.timeout(5000);

  before(function(done) {
    async.series({
      setupAuth: function(step) {
        doc.useServiceAccountAuth(creds, step);
      },
      addSheet: function(step) {
        doc.addWorksheet({
          headers: ['col1', 'col2', 'col3']
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

  describe('adding, updating, removing rows', function() {
    var row;

    it('can add a row', function(done) {
      var new_data = {
        col1: 'c1',
        col2: 'c2',
        col3: 'c3'
      };

      sheet.addRow(new_data, function(err, _row) {
        (err == null).should.be.true;
        row = _row;
        row.col1.should.equal(new_data.col1);
        row.col2.should.equal(new_data.col2);
        row.col3.should.equal(new_data.col3);
        done();
      });
    });

    it('can update a row', function(done) {
      row.col1 = 'col1-update';
      row.col2 = 'col2-update';
      row.save(function(err) {
        (err == null).should.be.true;
        done();
      });
    });

    it('persisted the row update', function(done) {
      sheet.getRows(function(err, rows) {
        rows.length.should.equal(1);
        rows[0].col1.should.equal(row.col1);
        rows[0].col2.should.equal(row.col2);
        rows[0].col3.should.equal(row.col3);
        done(err);
      });
    });

    it('can write a formula', function(done) {
      row.col1 = 1;
      row.col2 = 2;
      row.col3 = '=A2+B2';
      row.save(done);
    });

    it('can read (only) the value from a formula', function(done) {
      sheet.getRows(function(err, rows) {
        rows[0].col3.should.equal('3');
        done(err);
      });
    });

    _.each({
      'new lines': "new\n\nlines\n",
      'special chars': "∑πécial <> chårs = !\t"
    }, function(value, description) {
      it('supports '+description, function(done) {
        row.col1 = value;
        row.save(function(err) {
          (err == null).should.be.true;
          sheet.getRows(function(err, rows) {
            rows.length.should.equal(1);
            rows[0].col1.should.equal(value);
            done(err);
          });
        });
      });
    });

    it('can delete a row', function(done) {
      row.del(function(err) {
        (err == null).should.be.true;
        sheet.getRows(function(err, rows) {
          rows.length.should.equal(0);
          done(err);
        });
      });
    });
  });

  describe('fetching rows', function() {
    // add 5 rows to use for read tests
    before(function(done) {
      this.timeout(5000);
      async.eachSeries(NUMBERS, function(i, nextVal) {
        sheet.addRow({
          col1: i,
          col2: LETTERS[i],
          col3: (new Date()).toISOString()
        }, nextVal);
      }, done);
    });

    it('can fetch multiple rows', function(done) {
      sheet.getRows(function(err, rows) {
        rows.length.should.equal(5);
        done(err);
      });
    });

    it('supports `offset` option', function(done) {
      sheet.getRows({offset: 3}, function(err, rows) {
        rows.length.should.equal(MAX_NUM - 3 + 1); //offset is inclusive
        rows[0].col1.should.equal('2');
        done(err);
      });
    });

    it('supports `limit` option', function(done) {
      sheet.getRows({limit: 3}, function(err, rows) {
        rows.length.should.equal(3);
        rows[0].col1.should.equal('0');
        done(err);
      });
    });

    it('supports `orderby` option', function(done) {
      sheet.getRows({orderby: 'col2'}, function(err, rows) {
        rows.length.should.equal(5);
        _.map(rows, 'col2').should.deep.equal(_.sortBy(LETTERS));
        done(err);
      });
    });


    // GOOGLE HAS A KNOWN BUG WITH THIS!
    // see: http://stackoverflow.com/questions/32272783/google-sheets-api-reverse-order-parameter-ignored/34805432#34805432
    it.skip('supports `reverse` option', function(done) {
      sheet.getRows({reverse: true}, function(err, rows) {
        rows.length.should.equal(5);
        rows[0].col1.should.equal('4');
        done(err);
      });
    });

    it('supports `query` option', function(done) {
      sheet.getRows({query: 'col1>=2 and col1<4'}, function(err, rows) {
        rows.length.should.equal(2);
        _.map(rows, 'col1').should.include.members(['2', '3']);
        done(err);
      });
    });

    it('supports `orderby`+`reverse` option', function(done) {
      sheet.getRows({orderby: 'col2', reverse: true}, function(err, rows) {
        rows.length.should.equal(5);
        _.map(rows, 'col2').should.deep.equal(_.sortBy(LETTERS).reverse());
        done(err);
      });
    });

    it('supports `orderby`+`limit` option', function(done) {
      sheet.getRows({orderby: 'col2', limit: 2}, function(err, rows) {
        rows.length.should.equal(2);
        _.map(rows, 'col2').should.deep.equal(_.sortBy(LETTERS).slice(0,2));
        done(err);
      });
    });

    // we could add more tests here, but it seems a bit unnecessary
    // as it would just be testing google's API

  });
});
