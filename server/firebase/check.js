#!/usr/bin/env node
import check from './migration.js';

check({ org: 'test', uuid: 'UNKNOWN' })
  .then(() => process.exit(1));
