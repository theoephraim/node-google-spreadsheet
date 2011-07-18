var util = require("util");
var GoogleSpreadsheets = require("./lib/spreadsheets");
var GoogleClientLogin = require('googleclientlogin').GoogleClientLogin;
var googleAuth = new GoogleClientLogin({
  email: '',
  password: '',
  service: 'spreadsheets',
  accountType: GoogleClientLogin.accountTypes.google
});

googleAuth.on(GoogleClientLogin.events.login, function(){
	/*GoogleSpreadsheets({
		key: "tkuXNV2Q8eOiToapbWUZsFQ",
		auth: googleAuth.getAuthId()
	}, function(err, spreadsheet) {
		console.log(util.inspect(spreadsheet, false, null));
	});*/
	
	GoogleSpreadsheets.rows({
		key: "tkuXNV2Q8eOiToapbWUZsFQ",
		worksheet: 2,
		auth: googleAuth.getAuthId()
	}, function(err, rows) {
		console.log(util.inspect(rows, false, null));
	});
});

googleAuth.on(GoogleClientLogin.events.error, function(e) {
    switch(e.message) {
      case GoogleClientLogin.errors.loginFailed:
        if (this.isCaptchaRequired()) {
          console.log("ERROR. captcha required :(");
        }
        break;
      case GoogleClientLogin.errors.tokenMissing:
      case GoogleClientLogin.errors.captchaMissing:
        throw new Error('You must pass the both captcha token and the captcha')
        break;
    }
    throw new Error('Unknown error');
  // damn..
});
googleAuth.login();