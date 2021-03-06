/*
 * Backpack - Skyscanner's Design System
 *
 * Copyright 2016-2020 Skyscanner Ltd
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import fs from 'fs';
import path from 'path';

import webpack from 'webpack';
import StaticSiteGeneratorPlugin from 'static-site-generator-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import OptimizeCSSAssetsPlugin from 'optimize-css-assets-webpack-plugin';
import TerserPlugin from 'terser-webpack-plugin';

import postCssPlugins from './scripts/webpack/postCssPlugins';
import sassFunctions from './node_modules/bpk-mixins/sass-functions';
import * as ROUTES from './docs/src/constants/routes';
import redirects from './docs/src/constants/redirect-routes';

const {
  NODE_ENV,
  BPK_TOKENS,
  ENABLE_CSS_MODULES,
  BPK_BUILT_AT,
  GOOGLE_MAPS_API_KEY,
} = process.env;
const useCssModules = ENABLE_CSS_MODULES !== 'false';
const isProduction = NODE_ENV === 'production';

const staticSiteGeneratorConfig = {
  paths: [
    ...Object.keys(ROUTES).map(key => ROUTES[key]),
    ...Object.keys(redirects),
  ],
};

const sassOptions = {
  prependData: BPK_TOKENS
    ? fs.readFileSync(`packages/bpk-tokens/tokens/${BPK_TOKENS}.scss`)
    : '',
  sassOptions: {
    functions: sassFunctions,
  },
};

const config = {
  entry: {
    docs: './docs/src/index.js',
  },

  mode: isProduction ? 'production' : 'development',

  output: {
    filename: `[name]${isProduction ? '_[chunkhash]' : ''}.js`,
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: 'umd',
    globalObject: 'this',
  },

  module: {
    rules: [
      {
        test: /\.jsx?$/,
        use: ['babel-loader'],
        exclude: /node_modules\/(?!bpk-).*/,
      },
      {
        test: /base\.scss$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              hmr: !isProduction,
            },
          },
          {
            loader: 'css-loader',
          },
          {
            loader: 'postcss-loader',
            options: {
              plugins: postCssPlugins,
            },
          },
          {
            loader: 'sass-loader',
            options: sassOptions,
          },
        ],
      },
      {
        test: /\.scss$/,
        exclude: /base\.scss$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              hmr: !isProduction,
            },
          },
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1,
              modules: useCssModules
                ? {
                    localIdentName: '[local]-[hash:base64:5]',
                  }
                : null,
            },
          },
          {
            loader: 'postcss-loader',
            options: {
              plugins: postCssPlugins,
            },
          },
          {
            loader: 'sass-loader',
            options: sassOptions,
          },
        ],
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              hmr: !isProduction,
            },
          },
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1,
            },
          },
          {
            loader: 'postcss-loader',
            options: {
              plugins: postCssPlugins,
            },
          },
        ],
      },
      {
        test: /\.(jpg|png|svg|mp4)$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'file-loader',
            query: {
              limit: 10000,
              name: '[name]_[hash].[ext]',
            },
          },
        ],
      },
      {
        test: /favicon\.ico$/,
        use: [
          {
            loader: 'file-loader',
            query: {
              name: '[name].[ext]',
            },
          },
        ],
      },
      {
        test: /\.md$/,
        use: ['raw-loader'],
      },
    ],
  },

  plugins: [
    new MiniCssExtractPlugin({
      filename: `[name]${isProduction ? '_[contenthash]' : ''}.css`,
    }),
  ],
  optimization: {
    minimize: true,
    minimizer: [new OptimizeCSSAssetsPlugin(), new TerserPlugin()],
  },
  devServer: {
    host: '0.0.0.0',
    disableHostCheck: true,
    historyApiFallback: {
      index: 'index.html',
    },
  },
};

config.plugins.push(
  new webpack.DefinePlugin({
    'process.env': {
      BPK_BUILT_AT,
      GOOGLE_MAPS_API_KEY: JSON.stringify(GOOGLE_MAPS_API_KEY),
      NODE_ENV: JSON.stringify(NODE_ENV),
    },
  }),
);

if (isProduction) {
  config.plugins.push(
    new StaticSiteGeneratorPlugin({
      entry: 'docs',
      paths: staticSiteGeneratorConfig.paths,
      locals: staticSiteGeneratorConfig,
    }),
    new webpack.optimize.OccurrenceOrderPlugin(),
    new CopyWebpackPlugin([{ from: 'docs/src/README.md', to: 'README.md' }]),
  );
}

export default config;
