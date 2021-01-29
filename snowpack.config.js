/** @type {import("snowpack").SnowpackUserConfig } */
const httpProxy = require('http-proxy');
const proxy = httpProxy.createServer({ target: 'http://localhost:9000' });
module.exports = {
  mount: {
    'src/public': {url: '/', static: true},
    src: {url: '/dist'},
  },
  plugins: ['@snowpack/plugin-babel','@snowpack/plugin-dotenv'],
  routes: [
    /* Enable an SPA Fallback in development: */
    {
      src: '/api/.*',
      dest: (req, res) => proxy.web(req, res),
    },
    {"match": "routes", "src": ".*", "dest": "/index.html"}
  ],
  optimize: {
    /* Example: Bundle your final build: */
    // "bundle": true,
  },
  packageOptions: {
    /* ... */
  },
  devOptions: {
    /* ... */
  },
  buildOptions: {
    /* ... */
  },
};
