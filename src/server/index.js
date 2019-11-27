import initializeDatabase from './database/initializeDatabase';
import express from 'express';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import { resolve, extname } from 'path';
import compress from 'compression';
import 'colors';
import opn from 'opn';

import obsoleteApi from './routes/obsolete-api';
import { makeKeys } from './libs/jwt';
import api from './routes/api-v2';

const isProduction = process.env.NODE_ENV === 'production';
const port = process.env.PORT || 9000;
const dyno = process.env.DYNO;
const app = express();
const buildPath = resolve(__dirname, '..', '..', 'build');

process
  .on('uncaughtException', (err) => {
    // eslint-disable-next-line no-console
    console.error('<!> Exception %s: ', err.message, err.stack);
  });

process
  .on('message', (msg) => {
    // eslint-disable-next-line no-console
    console.log('Server %s process.on( message = %s )', msg);
  });

(async function () {
  app.disable('etag');
  app.use(morgan(isProduction ? 'short' : 'dev'));
  app.use(compress());
  app.use(bodyParser.json({ limit: '1mb', extended: true }));
  app.use(bodyParser.raw({ limit: '1mb', extended: true }));

  /**
  * Enable CORS for /v2/register from XMLHttpRequest in Ionic webview.
  * Required by cordova-background-geolocation method BackgroundGeolocation.getTransistorAuthorizationToken.
  */
  app.use(function(req, res, next) {
    if (req.url.includes('/v2/register')) {
      res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
      res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    }
    next();
  });

  await initializeDatabase();
  await makeKeys();

  // default old api
  app.use(obsoleteApi);
  app.use('/v1', obsoleteApi);
  // v2 with jwt auth support
  app.use('/v2', api);

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
    app.use((err, req, res, next) => {
      console.error(err.message, err.stack);
      res.status(500).send({ message: err.message || 'Something broke!' });
    });
  });

  app.listen(port, () => {
    console.log('╔═══════════════════════════════════════════════════════════'.green.bold);
    console.log('║ Background Geolocation Server | port: %s'.green.bold, port);
    console.log('╚═══════════════════════════════════════════════════════════'.green.bold);

    // Spawning dedicated process on opened port.. only if not deployed on heroku
    if (!dyno) {
      opn(`http://localhost:${port}`)
        .catch(error => console.log('Optional site open failed:', error));
    }
  });
})();

module.exports = app;
