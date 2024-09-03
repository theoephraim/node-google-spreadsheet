import { DmnoBaseTypes, defineDmnoService, configPath } from 'dmno';

import { EncryptedVaultDmnoPlugin, EncryptedVaultTypes } from '@dmno/encrypted-vault-plugin';

const SecretsVault = new EncryptedVaultDmnoPlugin('vault', {
  key: configPath('DMNO_VAULT_KEY'),
});

export default defineDmnoService({
  isRoot: true,
  settings: {
    redactSensitiveLogs: true,
    interceptSensitiveLeakRequests: true,
    preventClientLeaks: true,
  },
  schema: {
    DMNO_VAULT_KEY: {
      extends: EncryptedVaultTypes.encryptionKey,
    },
    GOOGLE_API_KEY: {
      sensitive: true,
      required: true,
      value: SecretsVault.item(),
    },
    GOOGLE_SERVICE_ACCOUNT_EMAIL: {
      sensitive: true,
      required: true,
      extends: DmnoBaseTypes.email,
      value: SecretsVault.item(),
    },
    GOOGLE_SERVICE_ACCOUNT_KEY: {
      sensitive: true,
      required: true,
      value: SecretsVault.item(),
      coerce: (val: string) => val.replaceAll('\\n', '\n'),
    },
    CI: {
      extends: 'boolean',
      description: 'flag to denote running tests in CI'
    },
    TEST_DELAY: {
      extends: 'number',
      required: true,
      value: (ctx) => DMNO_CONFIG.CI ? 1000 : 500,
    }

  },
});
