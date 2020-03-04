#!/usr/bin/env node

// eslint-disable-next-line import/no-extraneous-dependencies, global-require
if (!require('piping')({
  hook: true,
  ignore: /(\/\.|~$|\.json$)/i,
})) {
  return;
}

require('@babel/polyfill/noConflict');
require('@babel/register')();
require('../dev.server');
