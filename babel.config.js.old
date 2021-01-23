module.exports = {
  presets: ['@babel/preset-flow', '@babel/preset-env', '@babel/preset-react'],
  plugins: [
    ['@babel/plugin-proposal-decorators', { legacy: true }],
    'transform-function-bind',
    '@babel/plugin-proposal-export-namespace-from',
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-proposal-export-default-from',
    ['babel-plugin-root-import', {
      paths: [
        { rootPathSuffix: 'src/client', rootPathPrefix: '' },
      ],
    }],
  ],
  env: { development: { plugins: ['react-hot-loader/babel'] } },
};
