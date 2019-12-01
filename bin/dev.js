#!/usr/bin/env node
'use strict';

if (!require('piping')({
  hook: true,
  ignore: /(\/\.|~$|\.json$)/i,
})) {
  return;
}

require('@babel/polyfill/noConflict');
require('@babel/register')();
require('../dev.server');
