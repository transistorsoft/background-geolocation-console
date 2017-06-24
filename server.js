const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const path = require('path');

const webpackConfig = require('./webpack.config.babel');
const webpack = require('webpack');
const historyFallback = require('connect-history-api-fallback');
const webpackDevMiddleware = require('webpack-dev-middleware');
const webpackHotMiddleware = require('webpack-hot-middleware');
require('colors');

process.on('uncaughtException', function (error) {
  console.error('Uncaught error : ', error);
});

app.disable('etag');
app.use(express.static('./src/client'));
app.use(bodyParser.json());

require('./src/server/routes.js')(app);

var compiler = webpack(webpackConfig);

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

var server = app.listen(process.env.PORT || 9000, function () {
  var port = server.address().port;

  console.log('╔═══════════════════════════════════════════════════════════'.green.bold);
  console.log('║ Background Geolocation Server | port: %s'.green.bold, port);
  console.log('╚═══════════════════════════════════════════════════════════'.green.bold);

  // Spawning dedicated process on opened port.. only if not deployed on heroku
  if (!process.env.DYNO) {
    const spawn = require('child_process').spawn;
    var child = spawn('open', ['http://localhost:' + port]);
    child.on('error', function (err) {
      console.error('Error during spawned child process : ', err);
    });
  }
});
