const GoogleSpreadsheet = require('../lib/GoogleSpreadsheet');

module.exports = () => ({
  public: new GoogleSpreadsheet('1LG6vqg6ezQpIXr-SIDDWQAc9mLNSXasboDR7MUbLvZw'),
  publicReadOnly: new GoogleSpreadsheet('1Gf1RL2FUjQpE6nJ4ywuX7hpZFqQ8oLE2yMAgzF7VsF0'),
  private: new GoogleSpreadsheet('148tpVrZgcc-ReSMRXiQaqf9hstgT8HTzyPeKx6f399Y'),
  privateReadOnly: new GoogleSpreadsheet('1d9McHkpKu-1R3WxPT7B-bhNPnBzijMp2zI_knjwnw4s'),
});
