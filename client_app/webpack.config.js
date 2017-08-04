// if (env === 'dev') {
//   new WebpackDevServer(webpack(config), {
//     contentBase: './static',
//     hot: true,
//     debug: true
//   }).listen(port, host, function (err, result) {
//     if (err) {
//       console.log(err);
//     }
//   });
//   console.log('-------------------------');
//   console.log('Local web server runs at http://' + host + ':' + port);
//   console.log('-------------------------');
// }

module.exports = {
    // Example setup for your project:
    // The entry module that requires or imports the rest of your project.
    // Must start with `./`!
    // resolve: {
    //   extensions: ['.js']
    // },
    entry: './src/main.js',
    // Place output files in `./dist/my-app.js`
    output: {
        path: __dirname + '/dist',
        filename: 'app.js'
    },
    module: {
        loaders: [
            {
                test: /\.json$/,
                loader: 'json-loader'
            },
            {
                test: /\.html$/,
                loader: 'file'
            }
        ]
    },
    resolve: {
        alias: {
            'vue$': 'vue/dist/vue.esm.js'
        }
    },
    devServer: {
      open: true, // to open the local server in browser
      openPage: "",
      contentBase: __dirname + '/static'
    },
};

