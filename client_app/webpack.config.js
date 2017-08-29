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

const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');

module.exports = {
    entry: {
        app: "./src/gallery-app.js"
        // config: "./src/config.js"
    },
    devtool: 'inline-source-map',
    plugins: [
        new CleanWebpackPlugin(['dist']),
        new HtmlWebpackPlugin({
           title: 'Gallery Prototype',
           inject: false,
           template: require("html-webpack-template"),
           appMountId: "app",
           scripts: ["/config.js"]
         })
   ],
    // Place output files in `./dist/app.js`
    output: {
            path: __dirname + '/dist',
            filename: '[name].js'
        },
    module: {
        loaders: [
            {
                test: /\.json$/,
                loader: 'json-loader'
            },
            {
                test: /\.css$/,
                use: [ 'style-loader', 'css-loader' ]
            },
            {
                test: /\.html$/,
                loader: 'file'
            },
            {
                test: /\.(woff|woff2|eot|ttf|otf)$/,
                use: ['file-loader']
            },
            {
                test: /\.(png|svg|jpg|gif)$/,
                use: ['file-loader']
            },
            {
                test: /\.vue$/,
                loader: 'vue-loader'
            }
        ]
    },
    resolve: {
        alias: {
            'vue$': 'vue/dist/vue.esm.js'
        }
    },
    devServer: {
      open: false,
      openPage: "",
      contentBase: __dirname + '/static'
    },
};

