/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testEnvironment: 'node',
  extensionsToTreatAsEsm: [".ts"],
  transform: {
    "^.+\\.(t|j)s$": "@swc/jest",
  },
  moduleNameMapper: {
    "lodash-es": "lodash"
  },
  testTimeout: 10000,
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/examples/",
    "/test/"
  ]
};