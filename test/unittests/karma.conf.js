// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck File doesn't need to be checked by TS.

const colors = require('ansi-colors');
const path = require('path');
const glob = require('glob');
const fs = require('fs');
const rimraf = require('rimraf');
const debugCheck = require('./debug-check.js');

const USER_DEFINED_COVERAGE_FOLDERS = process.env['COVERAGE_FOLDERS'];

// false by default
const DEBUG_ENABLED = Boolean(process.env['DEBUG_TEST']);
const REPEAT_ENABLED = Boolean(process.env['REPEAT']);
const COVERAGE_ENABLED = Boolean(process.env['COVERAGE']) || Boolean(USER_DEFINED_COVERAGE_FOLDERS);
const EXPANDED_REPORTING = Boolean(process.env['EXPANDED_REPORTING']);
const KARMA_TIMEOUT = process.env['KARMA_TIMEOUT'] ? Number(process.env['KARMA_TIMEOUT']) : undefined;

// true by default
const TEXT_COVERAGE_ENABLED = COVERAGE_ENABLED && !process.env['NO_TEXT_COVERAGE'];
// true by default
const HTML_COVERAGE_ENABLED = COVERAGE_ENABLED && !process.env['NO_HTML_COVERAGE'];
const COVERAGE_OUTPUT_DIRECTORY = 'karma-coverage';

if (COVERAGE_ENABLED) {
  /* Clear out the old coverage directory so you can't accidentally open old,
   * out of date coverage output.
   */
  const fullPathToDirectory = path.resolve(process.cwd(), COVERAGE_OUTPUT_DIRECTORY);
  if (fs.existsSync(fullPathToDirectory)) {
    rimraf.sync(fullPathToDirectory);
  }

  debugCheck(__dirname).then(isDebug => {
    if (!isDebug) {
      const warning = `The unit tests appear to be running against a non-debug build and
your coverage report will likely be incomplete due to bundling.

In order to get a complete coverage report please run against a
target with is_debug = true in the args.gn file.`;
      console.warn(colors.magenta(warning));
    }
  });
}

const GEN_DIRECTORY = path.join(__dirname, '..', '..');
const ROOT_DIRECTORY = path.join(GEN_DIRECTORY, '..', '..', '..');
const browsers = DEBUG_ENABLED ? ['Chrome'] : ['ChromeHeadless'];
const singleRun = !(DEBUG_ENABLED || REPEAT_ENABLED);

const coverageReporters = COVERAGE_ENABLED ? ['coverage'] : [];
const coveragePreprocessors = COVERAGE_ENABLED ? ['coverage'] : [];
const commonIstanbulReporters = [{type: 'json-summary'}, {type: 'json'}];
const istanbulReportOutputs = commonIstanbulReporters;

if (TEXT_COVERAGE_ENABLED) {
  istanbulReportOutputs.push({type: 'text'});
}

if (HTML_COVERAGE_ENABLED) {
  istanbulReportOutputs.push({type: 'html'});
}

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

const DEFAULT_PREPROCESSING_FOLDERS = {
  [path.join(GEN_DIRECTORY, 'front_end/!(third_party)/**/*.{js,mjs}')]: [...coveragePreprocessors],
  [path.join(GEN_DIRECTORY, 'inspector_overlay/**/*.{js,mjs}')]: [...coveragePreprocessors],
  [path.join(GEN_DIRECTORY, 'front_end/third_party/i18n/**/*.{js,mjs}')]: [...coveragePreprocessors],
};
const USER_DEFINED_PROCESSING_FOLDERS = {
  [path.join(GEN_DIRECTORY, `${USER_DEFINED_COVERAGE_FOLDERS}/**/*.{js,mjs}`)]: [...coveragePreprocessors]
};

const COVERAGE_PREPROCESSING_FOLDERS =
    USER_DEFINED_COVERAGE_FOLDERS ? USER_DEFINED_PROCESSING_FOLDERS : DEFAULT_PREPROCESSING_FOLDERS;

// Locate the test setup file in all the gathered files. This is so we can
// ensure that it goes first and registers its global hooks before anything else.
const testSetupFilePattern = {
  pattern: null,
  type: 'module'
};
const testFiles = [];
for (const pattern of TEST_FILES) {
  if (pattern.endsWith('test_setup.js')) {
    testSetupFilePattern.pattern = pattern;
  } else {
    testFiles.push({pattern, type: 'module'});
  }
}

module.exports = function(config) {
  const targetDir = path.relative(process.cwd(), GEN_DIRECTORY);
  const options = {
    basePath: ROOT_DIRECTORY,
    autoWatchBatchDelay: 3000,

    files: [
      // Ensure the test setup goes first because Karma registers with Mocha in file order, and the hooks in the test_setup
      // must be set before any other hooks in order to ensure all tests get the same environment.
      testSetupFilePattern,
      ...testFiles,
      ...TEST_FILES_SOURCE_MAPS.map(pattern => ({pattern, served: true, included: false, watched: false})),
      ...TEST_SOURCES.map(source => ({pattern: source, served: true, included: false, watched: false})),
      {pattern: path.join(GEN_DIRECTORY, 'front_end/Images/*.{svg,png}'), served: true, included: false},
      {pattern: path.join(GEN_DIRECTORY, 'front_end/core/i18n/locales/*.json'), served: true, included: false},
      // Inject the CSS color theme variables into the page so any rendered
      // components have access to them.
      {pattern: path.join(GEN_DIRECTORY, 'front_end/ui/legacy/themeColors.css'), served: true, included: true},
      {pattern: path.join(GEN_DIRECTORY, 'front_end/**/*.css'), served: true, included: false},
      {pattern: path.join(GEN_DIRECTORY, 'front_end/**/*.js'), served: true, included: false},
      {pattern: path.join(GEN_DIRECTORY, 'front_end/**/*.js.map'), served: true, included: false},
      {pattern: path.join(GEN_DIRECTORY, 'front_end/**/*.mjs'), served: true, included: false},
      {pattern: path.join(GEN_DIRECTORY, 'front_end/**/*.mjs.map'), served: true, included: false},
      {pattern: path.join(ROOT_DIRECTORY, 'front_end/**/*.ts'), served: true, included: false, watched: false},
      {pattern: path.join(GEN_DIRECTORY, 'inspector_overlay/**/*.js'), served: true, included: false},
      {pattern: path.join(GEN_DIRECTORY, 'inspector_overlay/**/*.js.map'), served: true, included: false},
    ],

    reporters: [
      EXPANDED_REPORTING ? 'mocha' : 'dots',
      ...coverageReporters,
    ],

    browsers,

    frameworks: ['mocha', 'chai', 'sinon'],

    client: {
      /*
       * Passed through to the client via __karma__ because test_setup.ts
       * preloads some CSS files and it needs to know the target directory to do
       * so.
       */
      targetDir,
    },

    plugins: [
      require('karma-chrome-launcher'),
      require('karma-mocha'),
      require('karma-mocha-reporter'),
      require('karma-chai'),
      require('karma-sinon'),
      require('karma-sourcemap-loader'),
      require('karma-spec-reporter'),
      require('karma-coverage'),
    ],

    preprocessors: {
      '**/*.{js,mjs}': ['sourcemap'],
      ...COVERAGE_PREPROCESSING_FOLDERS,
    },

    proxies: {
      '/Images': `/base/${targetDir}/front_end/Images`,
      '/locales': `/base/${targetDir}/front_end/core/i18n/locales`
    },

    coverageReporter: {
      dir: COVERAGE_OUTPUT_DIRECTORY,
      subdir: '.',
      reporters: istanbulReportOutputs,
    },

    singleRun,

    pingTimeout: KARMA_TIMEOUT,
    browserNoActivityTimeout: KARMA_TIMEOUT,
    browserSocketTimeout: KARMA_TIMEOUT,

    mochaReporter: {
      showDiff: true,
    }
  };

  config.set(options);
};
