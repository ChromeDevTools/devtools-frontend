// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable @typescript-eslint/no-explicit-any */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type {Page, ScreenshotOptions, Target} from 'puppeteer-core';
import puppeteer from 'puppeteer-core';

import {generateExactTestId} from '../../front_end/testing/TestIdGeneration.js';
import {resultAssertionsDiff} from '../../test/conductor/diff-utils.js';
import {formatAsPatch, ResultsDBReporter} from '../../test/conductor/karma-resultsdb-reporter.js';
import {CHECKOUT_ROOT, GEN_DIR, SOURCE_ROOT, TEST_ID_REGEX} from '../../test/conductor/paths.js';
import * as ResultsDb from '../../test/conductor/resultsdb.js';
import {loadTests, TestConfig} from '../../test/conductor/test_config.js';
import {getSkippedTests, isExpectedResult} from '../../test/conductor/test_expectations.js';
import {ScreenshotError, ScreenshotErrorReporter} from '../conductor/screenshot-error.js';
import {assertElementScreenshotUnchanged} from '../shared/screenshots.js';

const COVERAGE_OUTPUT_DIRECTORY = 'karma-coverage';

const tests = [
  ...loadTests(path.join(GEN_DIR, 'front_end')),
  ...loadTests(path.join(GEN_DIR, 'inspector_overlay')),
  ...loadTests(path.join(GEN_DIR, 'test', 'harness', 'unit')),
];

function* reporters() {
  yield 'test-expectations';
  if (ResultsDb.available()) {
    yield 'resultsdb';
    yield 'exact-test-id';
  } else {
    yield 'screenshots';
    yield TestConfig.verbose ? 'exact-test-id' : 'progress-diff';
  }
  if (TestConfig.coverage) {
    yield 'coverage';
  }
}

interface BrowserWithArgs {
  name: string;
  flags: string[];
}
const CustomChrome = function(this: any, _baseBrowserDecorator: unknown, args: BrowserWithArgs, _config: unknown) {
  require('karma-chrome-launcher')['launcher:Chrome'][1].apply(this, arguments);
  this._execCommand = async function(_cmd: string, args: string[]) {
    const url = args.pop()!;
    const browser = await puppeteer.launch({
      pipe: true,
      headless: TestConfig.headless,
      executablePath: TestConfig.chromeBinary,
      defaultViewport: null,
      dumpio: true,
      // We do not need to process network in unit tests.
      networkEnabled: false,
      args,
      ignoreDefaultArgs: ['--hide-scrollbars'],
    });
    this._process = browser.process();

    this._process.on('exit', (code: unknown, signal: unknown) => {
      this._onProcessExit(code, signal, '');
    });

    const page = await browser.newPage();

    async function setupBindings(page: Page) {
      await page.exposeFunction(
          'assertScreenshot',
          async (
              elementSelector: string,
              filename: NonNullable<ScreenshotOptions['path']>,
              ) => {
            try {
              // Karma sometimes runs tests in an iframe or in the main frame.
              const testFrame = page.frames()[1] ?? page.mainFrame();
              const element = await testFrame.waitForSelector(elementSelector);

              await assertElementScreenshotUnchanged(element, filename, {
                captureBeyondViewport: false,
              });
              return undefined;
            } catch (error) {
              if (error instanceof ScreenshotError) {
                ScreenshotError.errors.push(error);
              }
              return `ScreenshotError: ${error.message}`;
            }
          });
    }

    async function disableAnimations(page: Page) {
      const session = await page.createCDPSession();
      await session.send('Animation.enable');
      await session.send('Animation.setPlaybackRate', {playbackRate: 30_000});
    }

    await Promise.all([
      setupBindings(page),
      disableAnimations(page),
    ]);

    browser.on('targetcreated', async (target: Target) => {
      if (target.type() === 'page') {
        const page = await target.page();
        if (!page) {
          return;
        }
        await Promise.all([
          setupBindings(page),
          disableAnimations(page),
        ]);
      }
    });

    await page.goto(url);
  };
  this._getOptions = function(url: string) {
    const flagsDisabledWithDebugging = TestConfig.debug ? [] : [
      // If the user has non 1 scale factor DevTools renders
      // Small and makes it not useful for debugging
      '--force-device-scale-factor=1',
    ];

    return [
      '--remote-allow-origins=*',
      '--use-mock-keychain',
      '--disable-features=DialMediaRouteProvider,WebUIReloadButton',
      '--password-store=basic',
      '--disable-extensions',
      '--disable-gpu',
      '--disable-font-subpixel-positioning',
      '--disable-lcd-text',
      '--force-color-profile=srgb',
      '--disable-device-discovery-notifications',
      '--window-size=1280,768',
      '--enable-crash-reporter-for-testing',  // Works only on linux
      `--crash-dumps-dir=${TestConfig.artifactsDir}`,
      '--enable-logging',
      '--v=1',
      `--log-file=${path.join(TestConfig.artifactsDir, 'chrome-log.txt')}`,
      ...flagsDisabledWithDebugging,
      ...args.flags,
      url,
    ];
  };
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

  const onSpecComplete = (result: any) => {
    if (result.mocha?.hasExclusiveTests) {
      this.hasExclusiveTests = true;
    }
    const type = result.mocha?.type;
    if (!type) {
      throw new Error(`Test ${result.description} does not have a type property`);
    }
    const file = result.mocha?.file;
    if (type !== 'hook' && !file) {
      throw new Error(`Test ${result.description} does not have a file property`);
    }
    if (file && !fs.existsSync(file)) {
      throw new Error(`Test file ${file} does not exist`);
    }
  };

  const baseSpecFailure = this.specFailure;
  this.specFailure = function(this: any, _browser: unknown, result: any) {
    onSpecComplete(result);
    if (result.mocha?.hasExclusiveTests) {
      this.hasExclusiveTests = true;
    }
    baseSpecFailure.apply(this, arguments);
    const patch = formatAsPatch(resultAssertionsDiff(result));
    if (patch) {
      this.write(`\n${patch}\n\n`);
    }
  };

  const baseSpecSuccess = this.specSuccess;
  this.specSuccess = function(this: any, _browser: unknown, result: any) {
    onSpecComplete(result);
    if (result.mocha?.hasExclusiveTests) {
      this.hasExclusiveTests = true;
    }
    if (!TestConfig.isAiAgent) {
      baseSpecSuccess.apply(this, arguments);
    }
  };

  const baseSpecSkipped = this.specSkipped;
  this.specSkipped = function(this: any, _browser: unknown, result: any) {
    onSpecComplete(result);
    if (result.mocha?.hasExclusiveTests) {
      this.hasExclusiveTests = true;
    }
    if (baseSpecSkipped) {
      baseSpecSkipped.apply(this, arguments);
    }
  };

  const baseOnRunComplete = this.onRunComplete;
  this.onRunComplete = function(this: any, browsers: any, _results: any) {
    if (baseOnRunComplete) {
      baseOnRunComplete.apply(this, arguments);
    }

    browsers.forEach((browser: any) => {
      const {total, success, failed, skipped} = browser.lastResult;
      if (total !== success + failed + skipped && !this.hasExclusiveTests) {
        throw new Error(`Karma exited early: executed ${success + failed + skipped} out of ${total} tests`);
      }
    });
  };
};
ProgressWithDiffReporter.$inject =
    ['formatError', 'config.reportSlowerThan', 'config.colors', 'config.browserConsoleLogOptions'];

const TestExpectationsReporter = function(this: any, baseReporterDecorator: any) {
  baseReporterDecorator(this);

  let expectedFailuresCount = 0;
  let unexpectedPassesCount = 0;

  this.specFailure = function(_browser: any, result: any) {
    const file = result.mocha?.file;
    if (!file) {
      throw new Error(`Test ${result.description} does not have a file property`);
    }
    const suite = result.suite || [];
    const description = result.description;
    const {exactTestId} = generateExactTestId(GEN_DIR, file, [...suite, description]);
    const isExpected = isExpectedResult({exactTestId, success: false, skipped: false});
    if (isExpected) {
      expectedFailuresCount++;
      this.write(`\n[TestExpectations] Expected failure: ${exactTestId}\n`);
    }
  };

  this.specSuccess = function(_browser: any, result: any) {
    const file = result.mocha?.file;
    if (!file) {
      throw new Error(`Test ${result.description} does not have a file property`);
    }
    const {exactTestId} = generateExactTestId(GEN_DIR, file, [...(result.suite || []), result.description]);
    const isExpected = isExpectedResult({exactTestId, success: true, skipped: false});
    if (!isExpected) {
      unexpectedPassesCount++;
      this.write(`\n[TestExpectations] Unexpected pass: ${exactTestId}\n`);
    }
  };

  this.onRunComplete = function(_browsers: any, _results: any) {
    const unexpectedFailures = _results.failed - expectedFailuresCount;
    if (_results.failed > 0 && unexpectedFailures === 0) {
      this.write('\n[TestExpectations] All failures were expected! Overriding exit code to 0.\n');
      _results.exitCode = 0;
    }

    if (unexpectedPassesCount > 0) {
      this.write(`\n[TestExpectations] ${unexpectedPassesCount} unexpected passes! Overriding exit code to 1.\n`);
      _results.exitCode = 1;
    }
  };
};
TestExpectationsReporter.$inject = ['baseReporterDecorator'];

const ExactTestIdReporter = function(this: any, baseReporterDecorator: any) {
  baseReporterDecorator(this);

  this.specSuccess = function(_browser: any, result: any) {
    const file = result.mocha?.file;
    const suite = result.suite || [];
    const description = result.description;
    const {exactTestId} = generateExactTestId(GEN_DIR, file, [...suite, description]);
    this.write(`[PASS] ${exactTestId} ${result.time}ms\n`);
  };

  this.specFailure = function(_browser: any, result: any) {
    const file = result.mocha?.file;
    const suite = result.suite || [];
    const description = result.description;
    const {exactTestId} = generateExactTestId(GEN_DIR, file, [...suite, description]);
    this.write(`[FAIL] ${exactTestId} ${result.time}ms\n`);
  };
};
ExactTestIdReporter.$inject = ['baseReporterDecorator'];

const coveragePreprocessors = TestConfig.coverage ? {
  [path.join(GEN_DIR, 'front_end/!(third_party)/**/!(*.test).{js,mjs}')]: ['coverage'],
  [path.join(GEN_DIR, 'inspector_overlay/**/*.{js,mjs}')]: ['coverage'],
  [path.join(GEN_DIR, 'front_end/third_party/i18n/**/*.{js,mjs}')]: ['coverage'],
} :
                                                    {};

const setupScriptPath = path.join(GEN_DIR, 'front_end', 'testing', 'test_setup.js');

function testsEntrypointMiddleware(config: any) {
  return (req: any, res: any, next: any) => {
    if (req.url.startsWith('/base/tests.js')) {
      res.writeHead(200, {'Content-Type': 'application/javascript'});
      const imports = tests
                          .map(testPath => {
                            const relativePath = path.relative(config.basePath, testPath).replace(/\\/g, '/');
                            const importPath = `/base/${relativePath}`;
                            return `import ${JSON.stringify(importPath)};`;
                          })
                          .join('\n');
      const setupScriptImportPath = `/base/${path.relative(config.basePath, setupScriptPath).replace(/\\/g, '/')}`;
      return res.end(`import ${JSON.stringify(setupScriptImportPath)};
        ${imports}
        window.__karma__.loaded();\n`);
    }
    next();
  };
}

testsEntrypointMiddleware.$inject = ['config'];

module.exports = function(config: any) {
  const targetDir = path.relative(SOURCE_ROOT, GEN_DIR);
  const devToolsRoot = path.relative(CHECKOUT_ROOT, SOURCE_ROOT);
  const options = {
    basePath: CHECKOUT_ROOT,
    autoWatchBatchDelay: 1000,
    failOnEmptyTestSuite: false,

    customContextFile: path.join(GEN_DIR, 'test/unit/context.html'),
    customDebugFile: path.join(GEN_DIR, 'test/unit/debug.html'),

    files: [
      {pattern: path.join(SOURCE_ROOT, 'node_modules/mocha/mocha.js'), served: true, included: true},
      {pattern: path.join(GEN_DIR, 'test/unit/mocha-adapter-browser.js'), type: 'module', included: true},
      // Global hooks in test_setup must go first
      {pattern: setupScriptPath, served: true, included: false},
      {pattern: path.join(GEN_DIR, 'test/unit/browser-globals.js'), type: 'module', served: true, included: false},
      {pattern: path.join(SOURCE_ROOT, 'node_modules/chai/**/*'), served: true, included: false},
      {pattern: path.join(SOURCE_ROOT, 'node_modules/sinon/**/*'), served: true, included: false},
      {pattern: path.join(GEN_DIR, 'test/unit/mocha-interface.js'), served: true, included: false},
      ...tests.map(pattern => ({pattern, type: 'module', served: true, included: false})),
      ...tests.map(pattern => ({pattern: `${pattern}.map`, served: true, included: false, watched: true})),
      {pattern: path.join(GEN_DIR, 'front_end/Images/*.{svg,png}'), served: true, included: false},
      {pattern: path.join(GEN_DIR, 'front_end/core/i18n/locales/*.json'), served: true, included: false},
      {pattern: path.join(GEN_DIR, 'front_end/design_system_tokens.css'), served: true, included: true},
      {pattern: path.join(GEN_DIR, 'front_end/application_tokens.css'), served: true, included: true},
      {pattern: path.join(GEN_DIR, 'front_end/**/*.css'), served: true, included: false},
      {pattern: path.join(GEN_DIR, 'front_end/**/*.js'), served: true, included: false},
      {pattern: path.join(GEN_DIR, 'front_end/**/*.js.map'), served: true, included: false, watched: true},
      {pattern: path.join(GEN_DIR, 'front_end/**/*.json'), served: true, included: false},
      {pattern: path.join(GEN_DIR, 'front_end/**/*.md'), served: true, included: false},
      {pattern: path.join(GEN_DIR, 'front_end/**/*.mjs'), served: true, included: false},
      {pattern: path.join(GEN_DIR, 'front_end/**/*.mjs.map'), served: true, included: false},
      {pattern: path.join(SOURCE_ROOT, 'front_end/**/*.ts'), served: true, included: false, watched: false},
      {pattern: path.join(GEN_DIR, 'front_end/**/fixtures/*.png'), served: true, included: false},
      {pattern: path.join(GEN_DIR, 'inspector_overlay/**/*.js'), served: true, included: false},
      {pattern: path.join(GEN_DIR, 'inspector_overlay/**/*.js.map'), served: true, included: false},
      {pattern: path.join(GEN_DIR, 'front_end/**/fixtures/**/*'), served: true, included: false},
      {pattern: path.join(GEN_DIR, 'front_end/**/*.snapshot.txt'), served: true, included: false},
      {pattern: path.join(GEN_DIR, 'front_end/ui/components/docs/**/*'), served: true, included: false},
    ],

    reporters: [...reporters()],

    browsers: ['BrowserWithArgs'],
    customLaunchers: {
      BrowserWithArgs: {
        base: CustomChrome.prototype.name,
        flags: [],
      },
    },

    client: {
      mocha: {
        ...TestConfig.mochaGrep,
        retries: TestConfig.retries,
        timeout: TestConfig.debug ? 0 : 5_000,
        expose: ['hasExclusiveTests', 'file', 'type'],
      },
      checkoutRoot: path.resolve(CHECKOUT_ROOT),
      pathSeparator: path.sep,
      testIds: TestConfig.tests.filter(t => TEST_ID_REGEX.test(t)),
      repetitions: TestConfig.repetitions,
      skippedTests: getSkippedTests(),
    },

    plugins: [
      {'middleware:esm-entry': ['factory', testsEntrypointMiddleware]},
      {[`launcher:${CustomChrome.prototype.name}`]: ['type', CustomChrome]},
      require('karma-sourcemap-loader'),
      require('karma-coverage'),
      {'reporter:exact-test-id': ['type', ExactTestIdReporter]},
      {'reporter:resultsdb': ['type', ResultsDBReporter]},
      {'reporter:screenshots': ['type', ScreenshotErrorReporter]},
      {'reporter:progress-diff': ['type', ProgressWithDiffReporter]},
      {'reporter:test-expectations': ['type', TestExpectationsReporter]},
      {'middleware:snapshotTester': ['factory', snapshotTesterFactory]},
    ],

    preprocessors: {
      '**/*.{js,mjs}': ['sourcemap'],
      ...coveragePreprocessors,
    },

    proxies: {
      '/Images': `/base/${targetDir}/front_end/Images`,
      '/locales': `/base/${targetDir}/front_end/core/i18n/locales`,
      '/front_end': `/base/${targetDir}/front_end`,
      '/chai': `/base/${devToolsRoot}/node_modules/chai`,
      '/sinon': `/base/${devToolsRoot}/node_modules/sinon`,
    },

    middleware: ['esm-entry', 'snapshotTester'],

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

    pingTimeout: 15_000,
    browserDisconnectTimeout: 15_000,
    browserNoActivityTimeout: 60_000,
    mochaReporter: {
      showDiff: true,
    },

  };

  config.set(options);
};

function snapshotTesterFactory() {
  return (req: any, res: any, next: any) => {
    if (req.url.startsWith('/snapshot-update-mode')) {
      res.writeHead(200, {'Content-Type': 'application/json'});
      const updateMode = TestConfig.onDiff.update === true;
      res.end(JSON.stringify({updateMode}));
      return;
    }

    if (req.url.startsWith('/snapshot')) {
      const parsedUrl = new URL(req.url, 'http://localhost');
      const snapshotPathParam = parsedUrl.searchParams.get('snapshotPath');
      if (typeof snapshotPathParam !== 'string') {
        throw new Error('invalid snapshotPath');
      }

      const snapshotPath = path.join(SOURCE_ROOT, snapshotPathParam);
      if (!fs.existsSync(snapshotPath)) {
        res.writeHead(404);
        res.end();
        return;
      }

      const snapshot = fs.readFileSync(snapshotPath, 'utf-8');
      res.writeHead(200);
      res.end(snapshot);
      return;
    }

    if (req.url.startsWith('/update-snapshot')) {
      const parsedUrl = new URL(req.url, 'http://localhost');
      const snapshotPathParam = parsedUrl.searchParams.get('snapshotPath');
      if (typeof snapshotPathParam !== 'string') {
        throw new Error('invalid snapshotPath');
      }

      const snapshotPath = path.join(SOURCE_ROOT, snapshotPathParam);

      let body = '';
      req.on('data', (chunk: any) => {
        body += chunk.toString();
      });
      req.on('end', () => {
        // eslint-disable-next-line no-console
        console.info(`updating snapshot: ${snapshotPath}`);
        if (body) {
          fs.writeFileSync(snapshotPath, body);
        } else {
          fs.rmSync(snapshotPath, {force: true});
        }

        res.writeHead(200);
        res.end();
      });

      return;
    }

    next();
  };
}
