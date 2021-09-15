/* eslint-disable no-console */

import bodyParser from 'body-parser';
import 'colors';
import compress from 'compression';
import express from 'express';
import morgan from 'morgan';
import { extname, resolve } from 'path';

import {
  dyno,
  firebaseURL,
  isProduction,
  parserLimit,
  port,
} from './config.js';
import initializeDatabase from './database/initializeDatabase.js';
import { AccessDeniedError } from './libs/utils.js';
import api from './routes/api-v2.js';
import firebase from './routes/firebase-api.js';
import siteApi from './routes/site-api.js';
import tests from './routes/tests.js';

const app = express();
const staticContent = resolve('.', 'public');
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

  const index = resolve(staticContent, 'index.html');

  app.use(siteApi);
  app.use('/api/site', siteApi);
  app.use('/api/firebase', firebase);
  app.use('/api/jwt', api);
  app.use('/api', firebaseURL ? firebase : api);
  app.use('/api', tests);

  app.use(express.static(staticContent));

  app.use((req, res, next) => {
    const ext = extname(req.url);
    console.log('req.url', req.url, {
      ext,
      url: req.url,
      index,
    });
    if ((!ext || ext === '.html') && req.url !== '/') {
      res.sendFile(index);
    } else {
      next();
    }
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err.message, err.stack);

    if (err instanceof AccessDeniedError) {
      return res.status(403)
        .send({ error: err.message });
    }

    return res.status(500)
      .send({ message: err.message || 'Something broke!' });
  });

  app.listen(port, () => {
    console.log('╔═══════════════════════════════════════════════════════════'.green.bold);
    console.log('║ Background Geolocation Server | port: %s, dyno: %s'.green.bold, port, dyno);
    console.log('╚═══════════════════════════════════════════════════════════'.green.bold);
  });
})());

export default app;
