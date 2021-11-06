// https://eslint.org/docs/user-guide/configuring
module.exports = {
  root: true,
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2018,
  },
  env: {
    es6: true,
    node: true,
  },
  extends: [
    'airbnb-base',
  ],
  plugins: [
    'async-await',
  ],
  // add your custom rules here
  rules: {
    'no-underscore-dangle': 0,
    'no-plusplus': 0, // i++ OK :D
    'class-methods-use-this': 0,
    'radix': 0,
    'prefer-destructuring': 0,
    'no-param-reassign': 0, // sometimes it's just much easier
    'lines-between-class-members': 0, // grouping related one-liners can be nice
    'no-continue': 0,
    // override airbnb - breaks old version of node - https://github.com/eslint/eslint/issues/7749
    'comma-dangle': ['error', {
      arrays: 'always-multiline',
      objects: 'always-multiline',
      imports: 'always-multiline',
      exports: 'always-multiline',
      functions: 'never', // this breaks
    }],
    'no-multiple-empty-lines': 0, // sometimes helpful to break up sections of code
  },
  overrides: [
    { // extra jest related rules for tests
      files: 'test/*',
      plugins: ["jest"],
      extends: ["plugin:jest/recommended"],
      env: {
        "jest/globals": true,
      },
      rules: {
        "jest/consistent-test-it": "error",
        'jest/expect-expect': 0, // sometimes the lack of an error thrown is a good test
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
}
