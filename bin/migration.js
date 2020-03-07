#!/usr/bin/env node

require('@babel/polyfill/noConflict');
require('@babel/register')();

const {
  // default: check,
  transfer,
} = require('../src/server/firebase/migration');

// check({ org: 'test', uuid: 'UNKNOWN' })
//   .then(() => process.exit(1));

transfer()
  .then(() => process.exit(1));
