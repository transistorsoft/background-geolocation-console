const path = require('path'); const webpack = require('webpack');

const HtmlWebpackPlugin = require('html-webpack-plugin');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

const copyAssets = new CopyPlugin([{ from: 'assets/images', to: 'images' }]);
const isProduction = process.env.NODE_ENV === 'production';

const htmlWebpackPlugin = new HtmlWebpackPlugin({
  template: 'index.ejs',
  inject: true,
  production: isProduction,
  minify: isProduction && {
    removeComments: true,
    collapseWhitespace: true,
    removeRedundantAttributes: true,
    useShortDoctype: true,
    removeEmptyAttributes: true,
    removeStyleLinkTypeAttributes: true,
    keepClosingSlash: true,
    minifyJS: true,
    minifyCSS: true,
    minifyURLs: true,
  },
  GOOGLE_ANALYTICS_ID: process.env.GOOGLE_ANALYTICS_ID,
  PURE_CHAT_ID: process.env.PURE_CHAT_ID,
  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
});

const config = {
  context: path.resolve(__dirname, 'src', 'client'),
  devtool: !isProduction ? 'cheap-module-eval-source-map' : 'source-map',
  target: 'web',
  entry: isProduction
    ? [
      '@babel/polyfill/noConflict',
      '@babel/polyfill',
      './main.js',
    ]
    : [
      '@babel/polyfill',
      'webpack-hot-middleware/client?path=/__webpack_hmr&timeout=20000',
      'react-hot-loader/patch',
      './main.js',
    ],
  output: {
    path: path.resolve(__dirname, 'build'),
    publicPath: '/',
    filename: '[name]-[hash].js',
    chunkFilename: '[id].[chunkhash].js',
  },
  resolve: {
    alias: { 'react-dom': '@hot-loader/react-dom' },
    modules: ['node_modules', 'src/client', 'src/server'],
    extensions: ['.js', '.json', '.css', '.svg'],
  },
  mode: isProduction ? 'production' : 'development',
  optimization: {
    minimizer: [
      new UglifyJsPlugin({
        sourceMap: true,
        parallel: false,
        uglifyOptions: {
          ecma: 8,
          sourceMap: true,
          beautify: false,
          drop_console: true,
          safari10: true,
          ie8: true,
          mangle: {
            ie8: true,
            keep_fnames: true,
          },
          compress: {
            ie8: true,
            drop_console: true,
          },
          output: { comments: false },
          comments: false,
        },
      }),
      new OptimizeCSSAssetsPlugin({}),
    ],
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
      },
      {
        test: /\.(jpe?g|png|gif|svg)$/i,
        use: [
          { loader: 'url-loader' },
        ],
      },
      {
        test: /\.ejs$/,
        loader: 'ejs-loader', // or 'url'
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              modules: true,
              sourceMap: true,
              importLoaders: 1,
              localIdentName: '[name]--[local]--[hash:base64:8]',
            },
          },
          // has separate config,
          // see postcss.config.js nearby
          'postcss-loader',
        ],
      },
    ],
  },
  plugins: isProduction
    ? [
      new webpack.DefinePlugin({
        'process.env.SHARED_DASHBOARD': !!process.env.SHARED_DASHBOARD || '',
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
      }),
      new webpack.LoaderOptionsPlugin({
        minimize: true,
        debug: false,
      }),
      copyAssets,
      htmlWebpackPlugin,
    ]
    : [
      new webpack.NamedModulesPlugin(),
      new webpack.DefinePlugin({
        'process.env.SHARED_DASHBOARD': !!process.env.SHARED_DASHBOARD || '',
        'process.env.NODE_ENV': JSON.stringify(
          process.env.NODE_ENV || 'development',
        ),
      }),
      copyAssets,
      new webpack.HotModuleReplacementPlugin(),
      htmlWebpackPlugin,
    ],
};

module.exports = config;
