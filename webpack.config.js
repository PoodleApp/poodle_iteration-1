module.exports = {
  context: __dirname,
  entry: {
    index: './client/index.js'
  },
  output: {
    path: __dirname + '/static/js',
    filename: '[name].js'
  },
  module: {
    loaders: [
      { test: /\.jsx?$/, loader: 'babel-loader' }
    ]
  },
  devtool: 'source-map'
}
