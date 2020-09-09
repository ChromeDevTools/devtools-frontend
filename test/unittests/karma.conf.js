// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const path = require('path');
const glob = require('glob');
const fs = require('fs');

// false by default
const DEBUG_ENABLED = !!process.env['DEBUG'];
const COVERAGE_ENABLED = !!process.env['COVERAGE'];

// true by default
const TEXT_COVERAGE_ENABLED = COVERAGE_ENABLED && !process.env['NO_TEXT_COVERAGE'];

const GEN_DIRECTORY = path.join(__dirname, '..', '..');
const ROOT_DIRECTORY = path.join(GEN_DIRECTORY, '..', '..', '..');
const browsers = DEBUG_ENABLED ? ['Chrome'] : ['ChromeHeadless'];

const coverageReporters = COVERAGE_ENABLED ? ['coverage'] : [];
const coveragePreprocessors = COVERAGE_ENABLED ? ['coverage'] : [];
const commonIstanbulReporters = [{type: 'html'}, {type: 'json-summary'}];
const istanbulReportOutputs =
    TEXT_COVERAGE_ENABLED ? [{type: 'text'}, ...commonIstanbulReporters] : commonIstanbulReporters;

const UNIT_TESTS_ROOT_FOLDER = path.join(ROOT_DIRECTORY, 'test', 'unittests');
const UNIT_TESTS_FOLDERS = [
  path.join(UNIT_TESTS_ROOT_FOLDER, 'front_end'),
  path.join(UNIT_TESTS_ROOT_FOLDER, 'inspector_overlay'),
];
const TEST_SOURCES = UNIT_TESTS_FOLDERS.map(folder => path.join(folder, '**/*.ts'));

// To make sure that any leftover JavaScript files (e.g. that were outputs from now-removed tests)
// aren't incorrectly included, we glob for the TypeScript files instead and use that
// to instruct Mocha to run the output JavaScript file.
const TEST_FILES =
    TEST_SOURCES
        .map(source => {
          return glob.sync(source).map(fileName => {
            const jsFile = fileName.replace(/\.ts$/, '.js');
            const generatedJsFile = path.join(__dirname, path.relative(UNIT_TESTS_ROOT_FOLDER, jsFile));
            if (!fs.existsSync(generatedJsFile)) {
              throw new Error(`Test file ${fileName} is not included in a BUILD.gn and therefore will not be run.`);
            }

            return generatedJsFile;
          });
        })
        .flat();


const TEST_FILES_SOURCE_MAPS = TEST_FILES.map(fileName => `${fileName}.map`);

module.exports = function(config) {
  const options = {
    basePath: ROOT_DIRECTORY,

    files: [
      ...TEST_FILES.map(pattern => ({pattern, type: 'module'})),
      ...TEST_FILES_SOURCE_MAPS.map(pattern => ({pattern, served: true, included: false})),
      ...TEST_SOURCES.map(source => ({pattern: source, served: true, included: false})),
      {pattern: path.join(GEN_DIRECTORY, 'front_end/Images/*.{svg,png}'), served: true, included: false},
      {pattern: path.join(GEN_DIRECTORY, 'front_end/**/*.css'), served: true, included: false},
      {pattern: path.join(GEN_DIRECTORY, 'front_end/**/*.js'), served: true, included: false},
      {pattern: path.join(GEN_DIRECTORY, 'front_end/**/*.js.map'), served: true, included: false},
      {pattern: path.join(GEN_DIRECTORY, 'front_end/**/*.mjs'), served: true, included: false},
      {pattern: path.join(GEN_DIRECTORY, 'front_end/**/*.mjs.map'), served: true, included: false},
      {pattern: path.join(ROOT_DIRECTORY, 'front_end/**/*.ts'), served: true, included: false},
      {pattern: path.join(GEN_DIRECTORY, 'inspector_overlay/**/*.js'), served: true, included: false},
      {pattern: path.join(GEN_DIRECTORY, 'inspector_overlay/**/*.js.map'), served: true, included: false},
    ],

    reporters: [
      'dots',
      ...coverageReporters,
    ],

    browsers,

    frameworks: ['mocha', 'chai'],

    client: {
      /*
       * Passed through to the client via __karma__ because test_setup.ts
       * preloads some CSS files and it needs to know the target directory to do
       * so.
       */
      targetDir: path.relative(process.cwd(), GEN_DIRECTORY),
    },

    plugins: [
      require('karma-chrome-launcher'),
      require('karma-mocha'),
      require('karma-chai'),
      require('karma-sourcemap-loader'),
      require('karma-coverage'),
    ],

    preprocessors: {
      '**/*.{js,mjs}': ['sourcemap'],
      [path.join(GEN_DIRECTORY, 'front_end/**/*.{js,mjs}')]: [...coveragePreprocessors],
    },

    proxies: {'/Images': 'front_end/Images'},

    coverageReporter: {
      dir: 'karma-coverage',
      reporters: istanbulReportOutputs,
    },

    singleRun: !DEBUG_ENABLED,
  };

  config.set(options);
};
