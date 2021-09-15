/* eslint-disable no-console */
/* eslint-disable import/no-extraneous-dependencies */
import path from 'path';
import express from 'express';
import httpProxy from 'http-proxy';
import fs from 'fs';

import {
  port,
  devPort,
} from './src/server/config';

const app = express();
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
  console.info(`Server ${a.name} will proxy ${p} to ${apiAddress}`);

  a.use(p, (req, res) => {
    proxy.web(req, res, { target: apiAddress });
  });
};

[{ address: `http://localhost:${port}/api`, path: '/api' }].forEach(cfg => {
  const proxy = make(cfg.address);
  app.on('stop', () => proxy.close());
  register(app, proxy, cfg.path, cfg.address);
});
app.use(express.static('src/new'));

app.get('*', (req, res, next) => {
  const filename = path.join('./src/new/', 'index.html');
  fs.readFile(filename, (err, result) => {
    if (err) {
      return next(err);
    }
    res.set('content-type', 'text/html');
    res.send(result);
    return res.end();
  });
});

app.listen(devPort, () => {
  console.log('Developer Server | port: %s'.green, devPort);
});

process.on('dev server Uncaught Exception', err => {
  // eslint-disable-next-line no-console
  console.error('<!> Exception %s: '.red, err.message, err.stack);
});
