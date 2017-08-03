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
    }
};
