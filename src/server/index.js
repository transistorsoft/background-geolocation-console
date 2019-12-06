import initializeDatabase from './database/initializeDatabase';
import express from 'express';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import { resolve, extname } from 'path';
import compress from 'compression';
import 'colors';
import opn from 'opn';

import siteApi from './routes/site-api';
import api from './routes/api-v2';
import tests from './routes/tests';

const isProduction = process.env.NODE_ENV === 'production';
const port = process.env.PORT || 9000;
const dyno = process.env.DYNO;
const app = express();
const buildPath = resolve(__dirname, '..', '..', 'build');
const parserLimits = { limit: '1mb', extended: true };

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

app.disable('etag');
app.use(morgan(isProduction ? 'short' : 'dev'));
app.use(compress());
app.use(bodyParser.json(parserLimits));
app.use(bodyParser.raw(parserLimits));

(async function () {
  await initializeDatabase();

  app.use(siteApi);
  app.use('/api/site', siteApi);
  app.use('/api', api);
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
      opn(`http://localhost:8080`)
        .catch(error => console.error('Optional site open failed:', error));
    }
  });
})();

module.exports = app;
