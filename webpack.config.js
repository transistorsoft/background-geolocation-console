const webpack = require('webpack');
const path = require('path');

module.exports = {
  entry: [
    'react-hot-loader/patch',
    './src/app.js',
  ],
  output: {
    path: path.resolve(__dirname, './build'),
    filename: 'app.bundle.js',
  },
  resolve: {
    extensions: [".js", ".json", ".css", ".svg"]
  },
  devServer: {
    hot: true,
    publicPath: '/',
    port: 9001,
    contentBase: path.join(__dirname, "src"),
    proxy: {
      '/api/**': {
        target: 'http://localhost:9000',
        pathRewrite: {"^/api": ""},
        secure: true,
        changeOrigin: true
      }
    },
  },
  module: {
    loaders: [
      {
        test: /\.html$/,
        loader: 'file-loader?name=[name].[ext]',
      },
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
      },
      {
        test: /\.css$/,
        use: [
          "style-loader",
          {
            loader: "css-loader",
            options: {
              modules: true,
              sourceMap: true,
              importLoaders: 1,
              localIdentName: "[name]--[local]--[hash:base64:8]"
            }
          },
          "postcss-loader" // has separate config, see postcss.config.js nearby
        ]
      }
    ]
  },
  plugins: [
    new webpack.NamedModulesPlugin(),
  ],
};