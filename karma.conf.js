// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// TODO(1011259): switch to true.
let external_devtools_frontend = true;
let node_modules_path = external_devtools_frontend
    ? ''
    : '../../../../third_party/devtools-node-modules/third_party/node_modules/';

module.exports = function(config) {
  const options = {
    basePath: '',

    files: [
      {pattern: 'front_end/**/*.js', included: false, served: true}, {pattern: 'test/unittests/**/*.ts', type: 'module'}
    ],

    // FIXME(https://crbug.com/1006759): Re-enable these tests when ESM work is completed.
    exclude: [
      'test/unittests/**/WorkspaceImpl.ts',
      'test/unittests/**/TempFile.ts',
    ],

    reporters: ['dots', 'coverage-istanbul'],

    preprocessors: {
      './test/unittests/**/*.ts': ['karma-typescript'],
      './front_end/common/*.js': ['karma-coverage-istanbul-instrumenter'],
      './front_end/workspace/*.js': ['karma-coverage-istanbul-instrumenter'],
      './front_end/ui/*.js': ['karma-coverage-istanbul-instrumenter']
    },

    browsers: ['ChromeHeadless'],

    frameworks: ['mocha', 'chai', 'karma-typescript'],

    karmaTypescriptConfig: {
      compilerOptions: {
        target: 'esnext',
        module: 'esnext',
        typeRoots: external_devtools_frontend ? undefined : [node_modules_path + '@types'],
        lib: ['esnext', 'dom']
      },
      coverageOptions: {instrumentation: false},
      bundlerOptions: {resolve: {directories: [node_modules_path]}},
      exclude: ['scripts']
    },

    proxies: {
      '/front_end': '/base/front_end',
    },

    plugins: [
      'karma-chrome-launcher', 'karma-mocha', 'karma-chai', 'karma-typescript',
      require(node_modules_path + 'karma-coverage-istanbul-instrumenter'),
      require(node_modules_path + 'karma-coverage-istanbul-reporter')
    ],

    coverageIstanbulInstrumenter: {esModules: true},

    coverageIstanbulReporter: {reports: ['text', 'html'], dir: 'karma-coverage'},

    singleRun: true
  };

  config.set(options);
};
