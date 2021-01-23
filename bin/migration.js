#!/usr/bin/env node
const { migrate } = require('../src/server/firebase/migration');

migrate()
  .then(() => process.exit(1));
