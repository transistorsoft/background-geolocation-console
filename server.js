const express     = require('express');
const bodyParser  = require('body-parser')
const app         = express();
const colors      = require('colors');
const path        = require('path');

const webpackConfig         = require("./webpack.config");
const webpack               = require("webpack");
const historyFallback       = require('connect-history-api-fallback');
const webpackDevMiddleware  = require('webpack-dev-middleware');
const webpackHotMiddleware  = require('webpack-hot-middleware');

const isDev = true;

require('./src/server/routes.js')(app);

app.disable('etag');
app.use(express.static('./src/client'));
app.use(bodyParser.json());


var compiler = webpack(webpackConfig);

const middleware = [
  webpackDevMiddleware(compiler, {    
    publicPath: "/", // Same as `output.publicPath` in most cases.  
    index: "index.html",
    hot: true,
    contentBase: path.join(__dirname, "src", "client"),
    stats: {
      colors: true,
    }
  }),
  webpackHotMiddleware(compiler, {
    log: console.log, // eslint-disable-line no-console
    heartbeat: 2000,
    path: '/__webpack_hmr'
  }),
  historyFallback(),
];

app.use(middleware);

const spawn = require('child_process').spawn

var server = app.listen(9000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('╔═══════════════════════════════════════════════════════════'.green.bold);
  console.log('║ Background Geolocation Server | port: %s'.green.bold, port);
  console.log('╚═══════════════════════════════════════════════════════════'.green.bold);

  
  spawn('open', ['http://localhost:' + port]);

});





