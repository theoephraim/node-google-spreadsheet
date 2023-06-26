import { JWT } from 'google-auth-library';
import creds from './service-account-creds.json' assert { type: 'json' };

export const DOC_IDS = {
  public: '1LG6vqg6ezQpIXr-SIDDWQAc9mLNSXasboDR7MUbLvZw',
  publicReadOnly: '1Gf1RL2FUjQpE6nJ4ywuX7hpZFqQ8oLE2yMAgzF7VsF0',
  private: '148tpVrZgcc-ReSMRXiQaqf9hstgT8HTzyPeKx6f399Y',
  privateReadOnly: '1d9McHkpKu-1R3WxPT7B-bhNPnBzijMp2zI_knjwnw4s',
};

export const testServiceAccountAuth = new JWT({
  email: creds.client_email,
  key: creds.private_key,
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file',
  ],
});
