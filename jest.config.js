const { defaults } = require('jest-config');

module.exports = {
  // rootDir: './',
  transform: {
    ...defaults.transform,
    '^.+\\.[t|j]sx?$': '<rootDir>/jest.transform.js',
  },
  moduleFileExtensions: ['js', 'jsx'],
  testEnvironment: 'node',
  coveragePathIgnorePatterns: [].concat(
    defaults.coveragePathIgnorePatterns,
    []
  ),
  setupFiles: ['<rootDir>/jest.init.js'],
  verbose: true,
};
