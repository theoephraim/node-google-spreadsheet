// https://eslint.org/docs/user-guide/configuring
module.exports = {
  root: true,
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2018,
    project: './tsconfig.json',
  },
  env: {
    es6: true,
    node: true,
  },
  extends: [
    'airbnb-base',
    'airbnb-typescript/base',
  ],
  plugins: [
    'no-floating-promise',
  ],
  // add your custom rules here
  rules: {
    'no-underscore-dangle': 0,
    'no-plusplus': 0, // i++ OK :D
    'class-methods-use-this': 0,
    'radix': 0,
    'prefer-destructuring': 0,
    'no-param-reassign': 0, // sometimes it's just much easier
    '@typescript-eslint/lines-between-class-members': 0, // grouping related one-liners can be nice
    'no-continue': 0,
    // override airbnb - breaks old version of node - https://github.com/eslint/eslint/issues/7749
    '@typescript-eslint/comma-dangle': ['error', {
      arrays: 'always-multiline',
      objects: 'always-multiline',
      imports: 'always-multiline',
      exports: 'always-multiline',
      functions: 'never', // this breaks
    }],
    'no-multiple-empty-lines': 0, // sometimes helpful to break up sections of code
    'import/prefer-default-export': 0,
    'import/no-cycle': 0,
    'grouped-accessor-pairs': 0,
    "@typescript-eslint/naming-convention": 0,

    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      },
    ],

    'max-len': ['error', 120, 2, { // bumped to 120, otherwise same as airbnb's rule but ignoring comments
      ignoreUrls: true,
      ignoreComments: true,
      ignoreRegExpLiterals: true,
      ignoreStrings: true,
      ignoreTemplateLiterals: true,
    }],

  },
  overrides: [
    { // extra rules for tests
      files: 'test/*',
      rules: {
        'no-await-in-loop': 0,
      }
    },
    { // relaxed rules for examples
      files: 'examples/*',
      rules: {
        'no-console': 0,
        'no-unused-vars': 0,
      },
    },
  ],
};
