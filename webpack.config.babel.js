const webpack = require('webpack');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

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
  PURE_CHAT_ID: process.env.PURE_CHAT_ID
});

module.exports = {
  context: path.resolve(__dirname, 'src', 'client'),
  devtool: 'source-map',
  target: 'web',
  entry: isProduction
    ? ['./main.js']
    : ['webpack-hot-middleware/client?path=/__webpack_hmr&timeout=20000', 'react-hot-loader/patch', './main.js'],
  output: {
    path: path.resolve(__dirname, './build'),
    publicPath: '/',
    filename: '[name]-[hash].js',
    chunkFilename: '[id].[chunkhash].js',
  },
  resolve: {
    extensions: ['.js', '.json', '.css', '.svg'],
  },
  module: {
    loaders: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
      },
      {
        test: /\.(jpg|png|svg)$/,
        loader: 'file-loader', // or 'url'
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
          'postcss-loader', // has separate config, see postcss.config.js nearby
        ],
      },
    ].filter(x => x),
  },
  plugins: isProduction
    ? [
      new webpack.DefinePlugin({
        'process.env.SHARED_DASHBOARD': !!process.env.SHARED_DASHBOARD || '',
      }),
      new webpack.LoaderOptionsPlugin({
        minimize: true,
        debug: false,
      }),
      new webpack.optimize.UglifyJsPlugin({
        sourceMap: true,
        compress: {
          warnings: false,
        },
        mangle: true,
        beautify: false, // use true for debugging
      }),
      htmlWebpackPlugin,
    ]
    : [
      new webpack.NamedModulesPlugin(),
      new webpack.DefinePlugin({
        'process.env.SHARED_DASHBOARD': !!process.env.SHARED_DASHBOARD || '',
      }),
      new webpack.HotModuleReplacementPlugin(),
      htmlWebpackPlugin,
    ],
};
