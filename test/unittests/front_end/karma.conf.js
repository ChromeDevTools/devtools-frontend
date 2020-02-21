// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck - we only want TS checking our source files, not JS config like this

// true by default
// const COVERAGE_ENABLED = !process.env['NOCOVERAGE'];

// false by default
const DEBUG_ENABLED = !!process.env['DEBUG'];

const browsers = DEBUG_ENABLED ? ['Chrome'] : ['ChromeHeadless'];
// const reporters = COVERAGE_ENABLED ? ['dots', 'coverage-istanbul'] : ['dots'];

module.exports = function(config) {
  const options = {
    basePath: '',

    files: [
      {pattern: 'test/unittests/**/*_test.js', type: 'module'},
      {pattern: 'front_end/**/*.js', served: true, included: false},
    ],

    reporters: ['dots'],

    browsers,

    frameworks: ['mocha', 'chai', 'sinon'],

    plugins: [
      require('karma-chrome-launcher'),
      require('karma-mocha'),
      require('karma-chai'),
      require('karma-sinon'),
    ],

    singleRun: !DEBUG_ENABLED
  };

  config.set(options);
};
