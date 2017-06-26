import initializeDatabase from './src/server/database/initializeDatabase';
import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import webpackConfig from './webpack.config.babel';
import webpack from 'webpack';
import historyFallback from 'connect-history-api-fallback';
import webpackDevMiddleware from 'webpack-dev-middleware';
import webpackHotMiddleware from 'webpack-hot-middleware';
import compress from 'compression';
import 'colors';
import opn from 'opn';
const app = express();

process.on('uncaughtException', function (error) {
  console.error('Uncaught error : ', error);
});

(async function () {
  app.disable('etag');
  app.use(compress());
  app.use(express.static('./src/client'));
  app.use(bodyParser.json());

  await initializeDatabase();
  require('./src/server/routes.js')(app);

  const compiler = webpack(webpackConfig);

  const middleware = [
    webpackDevMiddleware(compiler, {
      publicPath: '/', // Same as `output.publicPath` in most cases.
      index: 'index.html',
      hot: true,
      contentBase: path.join(__dirname, 'src', 'client'),
      stats: {
        colors: true,
      },
    }),
    webpackHotMiddleware(compiler, {
      log: console.log, // eslint-disable-line no-console
      heartbeat: 2000,
      path: '/__webpack_hmr',
    }),
    historyFallback(),
  ];

  app.use(middleware);

  const server = app.listen(process.env.PORT || 9000, function () {
    const port = server.address().port;

    console.log('╔═══════════════════════════════════════════════════════════'.green.bold);
    console.log('║ Background Geolocation Server | port: %s'.green.bold, port);
    console.log('╚═══════════════════════════════════════════════════════════'.green.bold);

    // Spawning dedicated process on opened port.. only if not deployed on heroku
    if (!process.env.DYNO) {
      opn(`http://localhost:${port}`);
    }
  });
})();
