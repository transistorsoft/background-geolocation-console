#!/usr/bin/env node

require('@babel/polyfill/noConflict');
require('@babel/register')();

const {
  // default: check,
  migrate,
} = require('../src/server/firebase/migration');

// check({ org: 'test', uuid: 'UNKNOWN' })
//   .then(() => process.exit(1));

migrate()
  .then(() => process.exit(1));
