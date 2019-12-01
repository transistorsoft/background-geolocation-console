#!/usr/bin/env node
'use strict';

const isProduction = process.env.NODE_ENV === 'production';

if (!isProduction) {
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
