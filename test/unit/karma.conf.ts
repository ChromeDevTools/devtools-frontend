// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint @typescript-eslint/no-explicit-any: 0 */

import * as path from 'path';

import {formatAsPatch, resultAssertionsDiff, ResultsDBReporter} from '../../test/conductor/karma-resultsdb-reporter.js';
import {CHECKOUT_ROOT, GEN_DIR, SOURCE_ROOT} from '../../test/conductor/paths.js';
// eslint-disable-next-line  rulesdir/es_modules_import
import * as ResultsDb from '../../test/conductor/resultsdb.js';
import {loadTests, TestConfig} from '../../test/conductor/test_config.js';

const COVERAGE_OUTPUT_DIRECTORY = 'karma-coverage';
const REMOTE_DEBUGGING_PORT = 7722;

const tests = loadTests(path.join(GEN_DIR, 'front_end'));

function* reporters() {
  if (ResultsDb.available()) {
    yield 'resultsdb';
  } else {
    yield 'progress-diff';
  }
  if (TestConfig.coverage) {
    yield 'coverage';
  }
}

const CustomChrome = function(this: unknown, _baseBrowserDecorator: unknown, _args: unknown, _config: unknown) {
  require('karma-chrome-launcher')['launcher:Chrome'][1].apply(this, arguments);
};

const executablePath = TestConfig.chromeBinary;

CustomChrome.prototype = {
  name: 'ChromeLauncher',

  DEFAULT_CMD: {
    [process.platform]: executablePath,
  },
  ENV_CMD: 'CHROME_BIN',
};

TestConfig.configureChrome(executablePath);

CustomChrome.$inject = ['baseBrowserDecorator', 'args', 'config'];

const BaseProgressReporter =
    require(path.join(SOURCE_ROOT, 'node_modules', 'karma', 'lib', 'reporters', 'progress_color.js'));
const ProgressWithDiffReporter = function(
    this: any, formatError: unknown, reportSlow: unknown, useColors: unknown, browserConsoleLogOptions: unknown) {
  BaseProgressReporter.call(this, formatError, reportSlow, useColors, browserConsoleLogOptions);
  const baseSpecFailure = this.specFailure;
  this.specFailure = function(this: any, browser: unknown, result: any) {
    baseSpecFailure.apply(this, arguments);
    const patch = formatAsPatch(resultAssertionsDiff(result));
    if (patch) {
      this.write(`\n${patch}\n\n`);
    }
  };
};
ProgressWithDiffReporter.$inject =
    ['formatError', 'config.reportSlowerThan', 'config.colors', 'config.browserConsoleLogOptions'];

const coveragePreprocessors = TestConfig.coverage ? {
  [path.join(GEN_DIR, 'front_end/!(third_party)/**/!(*.test).{js,mjs}')]: ['coverage'],
  [path.join(GEN_DIR, 'inspector_overlay/**/*.{js,mjs}')]: ['coverage'],
  [path.join(GEN_DIR, 'front_end/third_party/i18n/**/*.{js,mjs}')]: ['coverage'],
} :
                                                    {};

module.exports = function(config: any) {
  const targetDir = path.relative(SOURCE_ROOT, GEN_DIR);
  const options = {
    basePath: CHECKOUT_ROOT,
    autoWatchBatchDelay: 3000,

    files: [
      // Global hooks in test_setup must go first
      {pattern: path.join(GEN_DIR, 'front_end', 'testing', 'test_setup.js'), type: 'module'},
      ...tests.map(pattern => ({pattern, type: 'module'})),
      {pattern: path.join(GEN_DIR, 'front_end', 'testing', 'test_post_setup.js'), type: 'module'},
      ...tests.map(pattern => ({pattern: `${pattern}.map`, served: true, included: false, watched: true})),
      {pattern: path.join(GEN_DIR, 'front_end/Images/*.{svg,png}'), served: true, included: false},
      {pattern: path.join(GEN_DIR, 'front_end/core/i18n/locales/*.json'), served: true, included: false},
      {pattern: path.join(GEN_DIR, 'front_end/ui/legacy/themeColors.css'), served: true, included: true},
      {pattern: path.join(GEN_DIR, 'front_end/ui/legacy/tokens.css'), served: true, included: true},
      {pattern: path.join(GEN_DIR, 'front_end/**/*.css'), served: true, included: false},
      {pattern: path.join(GEN_DIR, 'front_end/**/*.js'), served: true, included: false},
      {pattern: path.join(GEN_DIR, 'front_end/**/*.js.map'), served: true, included: false, watched: true},
      {pattern: path.join(GEN_DIR, 'front_end/**/*.mjs'), served: true, included: false},
      {pattern: path.join(GEN_DIR, 'front_end/**/*.mjs.map'), served: true, included: false},
      {pattern: path.join(SOURCE_ROOT, 'front_end/**/*.ts'), served: true, included: false, watched: false},
      {pattern: path.join(GEN_DIR, 'front_end/**/fixtures/*.png'), served: true, included: false},
      {pattern: path.join(GEN_DIR, 'inspector_overlay/**/*.js'), served: true, included: false},
      {pattern: path.join(GEN_DIR, 'inspector_overlay/**/*.js.map'), served: true, included: false},
      {pattern: path.join(GEN_DIR, 'front_end/**/fixtures/**/*'), served: true, included: false},
    ],

    reporters: [...reporters()],

    browsers: ['BrowserWithArgs'],
    customLaunchers: {
      BrowserWithArgs: {
        base: CustomChrome.prototype.name,
        flags: [
          '--remote-allow-origins=*',
          `--remote-debugging-port=${REMOTE_DEBUGGING_PORT}`,
          '--use-mock-keychain',
          '--disable-features=DialMediaRouteProvider',
          '--password-store=basic',
          ...(TestConfig.debug ? [] : ['--headless=new']),
          '--disable-extensions',
        ],
      },
    },

    frameworks: ['mocha', 'chai', 'sinon'],

    client: {
      mocha: {
        ...TestConfig.mochaGrep,
        timeout: 5_000,
      },
      remoteDebuggingPort: REMOTE_DEBUGGING_PORT,
    },

    plugins: [
      {[`launcher:${CustomChrome.prototype.name}`]: ['type', CustomChrome]},
      require('karma-mocha'),
      require('karma-mocha-reporter'),
      require('karma-chai'),
      require('karma-sinon'),
      require('karma-sourcemap-loader'),
      require('karma-spec-reporter'),
      require('karma-coverage'),
      {'reporter:resultsdb': ['type', ResultsDBReporter]},
      {'reporter:progress-diff': ['type', ProgressWithDiffReporter]},
    ],

    preprocessors: {
      '**/*.{js,mjs}': ['sourcemap'],
      ...coveragePreprocessors,
    },

    proxies: {
      '/Images': `/base/${targetDir}/front_end/Images`,
      '/locales': `/base/${targetDir}/front_end/core/i18n/locales`,
      '/json': `http://localhost:${REMOTE_DEBUGGING_PORT}/json`,
      '/front_end': `/base/${targetDir}/front_end`,
    },

    coverageReporter: {
      dir: path.join(TestConfig.artifactsDir, COVERAGE_OUTPUT_DIRECTORY),
      subdir: '.',
      reporters: [
        {type: 'json-summary'},
        {type: 'json'},
        {type: 'html'},
      ],
    },

    singleRun: !TestConfig.debug,

    pingTimeout: 4000,

    mochaReporter: {
      showDiff: true,
    },

  };

  config.set(options);
};
