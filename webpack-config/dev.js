const path = require('path');

module.exports = {
    mode: 'development',
    entry: path.resolve('./', 'src/game.js'),
    output: {
        path: path.resolve('./', 'dist'),
        filename: 'game.min.js'
    },
    devtool: 'eval-source-map',
    devServer: {
        host: '0.0.0.0',
        port: 18081,
        allowedHosts: 'all',
        static: {
            directory: path.resolve('./', 'public'),
        },
        historyApiFallback: true,
        proxy: [
            {
                context: ['/api'],
                target: 'http://localhost:18082',
                changeOrigin: true,
            },
        ],
    },
    module: {
        rules: [{
            test: /(.js)$/,
            use: [{
                loader: 'babel-loader',
            }]
        }]
    },
};