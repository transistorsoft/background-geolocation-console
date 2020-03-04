/* eslint-disable no-console */
/* eslint-disable import/no-extraneous-dependencies */
import path from 'path';
import express from 'express';
import webpack from 'webpack';
import webpackDevMiddleware from 'webpack-dev-middleware';
import webpackHotMiddleware from 'webpack-hot-middleware';
import httpProxy from 'http-proxy';

import {
  port,
  devPort,
} from './src/server/config';
import webpackConfig from './webpack.config';

const app = express();
const compiler = webpack(webpackConfig);
const make = apiAddress => {
  const proxy = apiAddress
    ? httpProxy.createProxyServer({ target: apiAddress })
    : httpProxy.createProxyServer();

  proxy.on('error', (error, req, res) => {
    if (error.code !== 'ECONNRESET') {
      console.error('proxy error', error);
    }
    if (!res.headersSent) {
      res.writeHead(500, { 'content-type': 'application/json' });
    }

    res.status(500).json({ error: 'proxy_error', reason: error.message });
  });

  return proxy;
};
const register = (a, proxy, p, apiAddress) => {
  console.log(`Server ${a.name} will proxy ${p} to ${apiAddress}`);

  a.use(p, (req, res) => {
    proxy.web(req, res, { target: apiAddress });
  });
};
const middleware = [
  webpackDevMiddleware(compiler, {
    port: devPort,
    contentBase: path.join(__dirname, 'src', 'client'),
    hot: true,
    stats: { colors: true },
    compress: true,
  }),
  webpackHotMiddleware(compiler, {
    // eslint-disable-next-line no-console
    log: console.log,
    heartbeat: 2000,
    path: '/__webpack_hmr',
  }),
];

app.use(middleware);

[{ address: `http://localhost:${port}/api`, path: '/api' }].forEach(cfg => {
  const proxy = make(cfg.address);
  app.on('stop', () => proxy.close());
  register(app, proxy, cfg.path, cfg.address);
});

app.get('*', (req, res, next) => {
  const filename = path.join(compiler.outputPath, 'index.html');
  compiler.outputFileSystem.readFile(filename, (err, result) => {
    if (err) {
      return next(err);
    }
    res.set('content-type', 'text/html');
    res.send(result);
    return res.end();
  });
});

app.listen(devPort, () => {
  console.log('Developer Server | port: %s', devPort);
});

process.on('dev server Uncaught Exception', err => {
  // eslint-disable-next-line no-console
  console.error('<!> Exception %s: ', err.message, err.stack);
});
