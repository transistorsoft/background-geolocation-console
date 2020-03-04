#!/usr/bin/env node


const isProduction = process.env.NODE_ENV === 'production';

if (!isProduction) {
  // eslint-disable-next-line import/no-extraneous-dependencies, global-require
  if (!require('piping')({
    hook: true,
    ignore: /(\/\.|~$|\.json$)/i,
  })) {
    return;
  }
}

require('@babel/polyfill/noConflict');
require('@babel/register')();
require('../src/server');
