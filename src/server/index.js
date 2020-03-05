/* eslint-disable no-console */
import { resolve, extname } from 'path';
import express from 'express';
import morgan from 'morgan';
import bodyParser from 'body-parser';

import compress from 'compression';
import 'colors';
import opn from 'opn';

import initializeDatabase from './database/initializeDatabase';
import siteApi from './routes/site-api';
import api from './routes/api-v2';
import firebase from './routes/firebase-api';
import tests from './routes/tests';
import {
  dyno,
  firebaseURL,
  isProduction,
  parserLimit,
  port,
} from './config';

const app = express();
const buildPath = resolve(__dirname, '..', '..', 'build');
const parserLimits = { limit: parserLimit, extended: true };

process.on('uncaughtException', err => {
  // eslint-disable-next-line no-console
  console.error('<!> Exception %s: ', err.message, err.stack);
});

process.on('message', msg => {
  // eslint-disable-next-line no-console
  console.log('Server %s process.on( message = %s )', JSON.stringify(msg));
});

app.disable('etag');
app.use(morgan(isProduction ? 'short' : 'dev'));
app.use(compress());
app.use(bodyParser.json(parserLimits));
app.use(bodyParser.raw(parserLimits));

((async () => {
  await initializeDatabase();

  app.use(siteApi);
  app.use('/api/site', siteApi);
  app.use('/api/firebase', firebase);
  app.use('/api/jwt', api);
  app.use('/api', firebaseURL ? firebase : api);
  app.use('/api', tests);

  if (isProduction) {
    app.use(express.static(buildPath));
  }

  app.use((req, res, next) => {
    const ext = extname(req.url);
    if ((!ext || ext === '.html') && req.url !== '/') {
      res.sendFile(resolve(buildPath, 'index.html'));
    } else {
      next();
    }
  });

  app.use((err, req, res) => {
    console.error(err.message, err.stack);
    res.status(500).send({ message: err.message || 'Something broke!' });
  });

  app.listen(port, () => {
    console.log('╔═══════════════════════════════════════════════════════════'.green.bold);
    console.log('║ Background Geolocation Server | port: %s'.green.bold, port);
    console.log('╚═══════════════════════════════════════════════════════════'.green.bold);

    // Spawning dedicated process on opened port.. only if not deployed on heroku
    if (!dyno) {
      opn('http://localhost:8080').catch(error => console.error('Optional site open failed:', error));
    }
  });
})());

module.exports = app;
