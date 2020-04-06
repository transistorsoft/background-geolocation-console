#!/usr/bin/env node

require('@babel/polyfill/noConflict');
require('@babel/register')();

const { migrate } = require('../src/server/firebase/migration');

migrate()
  .then(() => process.exit(1));
