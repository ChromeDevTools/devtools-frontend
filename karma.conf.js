// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck - we only want TS checking our source files, not JS config like this

// true by default
const COVERAGE_ENABLED = !process.env['NOCOVERAGE'];
const TEXT_COVERAGE_ENABLED = COVERAGE_ENABLED && !process.env['NO_TEXT_COVERAGE'];

// false by default
const DEBUG_ENABLED = !!process.env['DEBUG'];

const instrumenterPreprocessors =
    (DEBUG_ENABLED || COVERAGE_ENABLED === false) ? [] : ['karma-coverage-istanbul-instrumenter'];

const coverageKarmaPlugins = COVERAGE_ENABLED ?
    [require('karma-coverage-istanbul-instrumenter'), require('karma-coverage-istanbul-reporter')] :
    [];

const browsers = DEBUG_ENABLED ? ['Chrome'] : ['ChromeHeadless'];

const enabledKarmaReporters = COVERAGE_ENABLED ? ['dots', 'coverage-istanbul'] : ['dots'];

const commonIstanbulReporters = ['html', 'json-summary'];
const istanbulReportOutputs = TEXT_COVERAGE_ENABLED ? ['text', ...commonIstanbulReporters] : commonIstanbulReporters;

module.exports = function(config) {
  const options = {
    basePath: '',

    files: [
      {pattern: 'front_end/**/*.js', included: false, served: true},
      {pattern: 'test/unittests/front_end/**/*.ts', type: 'module'},
      {pattern: 'front_end/**/*.svg', included: false, served: true},
      {pattern: 'front_end/**/*.png', included: false, served: true},
    ],

    reporters: enabledKarmaReporters,

    preprocessors: {
      './test/unittests/front_end/**/*.ts': ['karma-typescript'],
      './front_end/common/*.js': instrumenterPreprocessors,
      './front_end/formatter_worker/*.js': instrumenterPreprocessors,
      './front_end/inline_editor/*.js': instrumenterPreprocessors,
      './front_end/persistence/*.js': instrumenterPreprocessors,
      './front_end/platform/*.js': instrumenterPreprocessors,
      './front_end/protocol_client/*.js': instrumenterPreprocessors,
      './front_end/sdk/*.js': instrumenterPreprocessors,
      './front_end/text_utils/*.js': instrumenterPreprocessors,
      './front_end/ui/**/*.js': instrumenterPreprocessors,
      './front_end/workspace/*.js': instrumenterPreprocessors,
    },

    browsers,

    frameworks: ['mocha', 'chai', 'karma-typescript'],

    karmaTypescriptConfig: {
      tsconfig: './tsconfig.base.json',
      compilerOptions: {
        checkJs: false,
        baseUrl: '.',
      },
      coverageOptions: {instrumentation: false},
      include: {mode: 'replace', values: ['test/unittests/front_end/**/*.ts']},
    },

    proxies: {
      '/Images': '/base/front_end/Images',
    },

    plugins: [
      require('karma-chrome-launcher'),
      require('karma-mocha'),
      require('karma-chai'),
      require('karma-typescript'),
      ...coverageKarmaPlugins,
    ],

    coverageIstanbulInstrumenter: {esModules: true},

    coverageIstanbulReporter: {
      reports: istanbulReportOutputs,
      dir: 'karma-coverage',
    },

    singleRun: !DEBUG_ENABLED
  };

  config.set(options);
};
