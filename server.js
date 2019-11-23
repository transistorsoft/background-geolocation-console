import initializeDatabase from './src/server/database/initializeDatabase';
import express from 'express';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import path from 'path';
import compress from 'compression';
import 'colors';
import opn from 'opn';
import request from 'request';

import obsoleteApi from './src/server/routes/obsolete-api';
import { makeKeys } from './src/server/libs/jwt';
import api from './src/server/routes/api-v2';

const isProduction = process.env.NODE_ENV === 'production';

// if (!isProduction) {
//   if (!require('piping')({
//     hook: true,
//     ignore: /(\/\.|~$|\.json$)/i,
//   })) {
//     return;
//   }
// }

const app = express();
const port = process.env.PORT || 9000;

process
  .on('uncaughtException', (err) => {
    // eslint-disable-next-line no-console
    console.error('<!> Exception %s: ', err.message, err.stack);
  });

process
  .on('message', (msg) => {
    // eslint-disable-next-line no-console
    console.log('Server %s process.on( message = %s )', this.name, msg);
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
  // v2 with jwt auth support
  app.use('/v2', api);

  if (isProduction) {
    app.use(express.static('./build'));
  } else {
    console.info('adding webpack');
    const webpack = require('webpack');
    const webpackDevMiddleware = require('webpack-dev-middleware');
    const webpackHotMiddleware = require('webpack-hot-middleware');
    const webpackConfig = require('./webpack.config.babel');
    const compiler = webpack(webpackConfig);

    const middleware = [
      webpackDevMiddleware(compiler, {
        publicPath: '/', // Same as `output.publicPath` in most cases.
        contentBase: path.join(__dirname, 'src', 'client'),
        hot: true,
        stats: {
          colors: true,
        },
      }),
      webpackHotMiddleware(compiler, {
        log: console.log, // eslint-disable-line no-console
        heartbeat: 2000,
        path: '/__webpack_hmr',
      }),
    ];

    app.use(middleware);
  }

  app.use((req, res, next) => {
    var ext = path.extname(req.url);
    if ((ext === '' || ext === '.html') && req.url !== '/') {
      console.info('returning the index.html here');
      console.info(req.url);
      console.info(`http://localhost:${port}/`);
      req.pipe(request(`http://localhost:${port}/`)).pipe(res);
    } else {
      next();
    }
    app.use((err, req, res, next) => {
      console.error(err.message, err.stack);
      res.status(500).send({ message: err.message || 'Something broke!' });
    });
  });

  app.listen(port, function () {
    console.log('╔═══════════════════════════════════════════════════════════'.green.bold);
    console.log('║ Background Geolocation Server | port: %s'.green.bold, port);
    console.log('╚═══════════════════════════════════════════════════════════'.green.bold);

    // Spawning dedicated process on opened port.. only if not deployed on heroku
    if (!process.env.DYNO) {
      opn(`http://localhost:${port}`)
        .catch(error => console.log('Optional site open failed:', error));
    }
  });
})();
