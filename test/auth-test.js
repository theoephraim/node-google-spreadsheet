var path = require('path');
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

function getSheetName() { return 'test sheet'+(+new Date()); }

describe('Authentication', function() {
  this.timeout(5000);

  describe('without auth', function() {
    describe('reading + getInfo', function(){
      it('getInfo should fail on a private doc', function(done) {
        docs['private'].getInfo(function(err, info) {
          err.should.be.an.error;
          err.message.should.include('Sheet is private.');
          err.message.should.include('Use authentication or make public.');
          done();
        });
      });

      it('should fail on a private doc', function(done) {
        docs['private'].getRows(1, function(err, rows) {
          err.should.be.an.error;
          err.message.should.include('Sheet is private.');
          err.message.should.include('Use authentication or make public.');
          done();
        });
      });

      _.each(['public', 'public-read-only'], function(key) {
        it('reading should succeed on a '+key+' doc', function(done) {
          docs[key].getRows(1, function(err, rows) {
            rows.should.be.an.array;
            done(err);
          });
        });

        it('getInfo should succeed on a '+key+' doc', function(done) {
          docs[key].getInfo(function(err, info) {
            info.title.should.be.a.string;
            done(err);
          });
        });
      });
    });


    describe('writing', function(){
      // it still fails on the public doc because you always need to auth
      _.each(['public', 'public-read-only', 'private'], function(key) {
        it('should fail on a '+key+' doc', function(done) {
          docs[key].addWorksheet(function(err, sheet) {
            err.should.be.an.error;
            err.message.should.include('authenticate');
            done();
          });
        });
      });
    });

  });


  describe('authentication', function() {
    it('should fail if the token is empty', function(done) {
      docs['private'].useServiceAccountAuth({}, function(err) {
        err.should.be.an.error;
        done();
      });
    });

    it('should fail if the key is no good', function(done) {
      docs['private'].useServiceAccountAuth({
        client_email: 'test@example.com',
        private_key: 'not-a-real-key'
      }, function(err) {
        err.should.be.an.error;
        done();
      });
    });

    it('should fail if the email and key do not match', function(done) {
      var bad_creds = _.clone(creds);
      bad_creds.client_email = 'a'+bad_creds.client_email;
      docs['private'].useServiceAccountAuth(bad_creds, function(err) {
        err.should.be.an.error;
        done();
      });
    });

    it('should succeed if the creds are valid', function(done) {
      docs['private'].useServiceAccountAuth(creds, function(err) {
        (err == null).should.be.true;
        done();
      });
    });

    it('should accept a string which is a path to the file', function(done) {
      var creds_file_path = path.resolve(__dirname+'/service-account-creds.json');
      docs['private'].useServiceAccountAuth(creds_file_path, function(err) {
        (err == null).should.be.true;
        done();
      });
    });

    it('should fail if the path is invalid', function(done) {
      var creds_file_path = path.resolve(__dirname+'/doesnt-exist.json');
      docs['private'].useServiceAccountAuth(creds_file_path, function(err) {
        err.should.be.an.error;
        done();
      });
    });
  });


  describe('with auth', function() {
    before(function(done) {
      async.each(docs, function(doc, nextDoc) {
        doc.useServiceAccountAuth(creds, nextDoc);
      }, done);
    });

    _.each(['public', 'public-read-only', 'private'], function(key) {
      it('getInfo should succeed on a '+key+' doc', function(done) {
        docs[key].getInfo(function(err, info) {
          (err == null).should.be.true;
          done();
        });
      });

      it('reading data succeed on a '+key+' doc', function(done) {
        docs[key].getRows(1, function(err, rows) {
          (err == null).should.be.true;
          rows.should.be.an.array;
          done();
        });
      });
    });

    _.each(['public', 'private'], function(key) {
      it('writing should succeed on a '+key+' doc', function(done) {
        docs[key].addWorksheet(function(err, sheet) {
          (err == null).should.be.true;
          sheet.del(done);
        });
      });
    });

    it('writing should fail if user does not have access', function(done) {
      docs['public-read-only'].addWorksheet(function(err, sheet) {
        err.should.be.a.error;
        done();
      });
    });
  });

});
