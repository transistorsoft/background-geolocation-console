const { defaults } = require('jest-config');

module.exports = {
  // rootDir: 'src/server',
  transform: {
    ...defaults.transform,
    '^.+\\.[t|j]sx?$': 'babel-jest',
  },
  moduleFileExtensions: [
    'js',
    'jsx',
  ],
  testEnvironment: 'node',
  coveragePathIgnorePatterns: [].concat(
    defaults.coveragePathIgnorePatterns,
    []
  ),
  verbose: true,
};
