// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint @typescript-eslint/no-explicit-any: 0 */

import * as fs from 'fs';
import * as path from 'path';
import type {Page, ScreenshotOptions, Target} from 'puppeteer-core';
import puppeteer from 'puppeteer-core';
import * as url from 'url';

import {formatAsPatch, resultAssertionsDiff, ResultsDBReporter} from '../../test/conductor/karma-resultsdb-reporter.js';
import {CHECKOUT_ROOT, GEN_DIR, SOURCE_ROOT} from '../../test/conductor/paths.js';
import * as ResultsDb from '../../test/conductor/resultsdb.js';
import {loadTests, TestConfig} from '../../test/conductor/test_config.js';
import {ScreenshotError} from '../conductor/screenshot-error.js';
import {assertElementScreenshotUnchanged} from '../shared/screenshots.js';

const COVERAGE_OUTPUT_DIRECTORY = 'karma-coverage';
const REMOTE_DEBUGGING_PORT = 7722;

const tests = [
  ...loadTests(path.join(GEN_DIR, 'front_end')),
  ...loadTests(path.join(GEN_DIR, 'inspector_overlay')),
];

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

interface BrowserWithArgs {
  name: string;
  flags: string[];
}
const CustomChrome = function(this: any, _baseBrowserDecorator: unknown, args: BrowserWithArgs, _config: unknown) {
  require('karma-chrome-launcher')['launcher:Chrome'][1].apply(this, arguments);
  this._execCommand = async function(_cmd: string, args: string[]) {
    const url = args.pop()!;
    const browser = await puppeteer.launch({
      headless: TestConfig.headless,
      executablePath: TestConfig.chromeBinary,
      defaultViewport: null,
      dumpio: true,
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
    return [
      '--remote-allow-origins=*',
      `--remote-debugging-port=${REMOTE_DEBUGGING_PORT}`,
      '--use-mock-keychain',
      '--disable-features=DialMediaRouteProvider',
      '--password-store=basic',
      '--disable-extensions',
      '--disable-gpu',
      '--disable-font-subpixel-positioning',
      '--disable-lcd-text',
      '--force-device-scale-factor=1',
      '--disable-device-discovery-notifications',
      '--window-size=1280,768',
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
  const baseSpecFailure = this.specFailure;
  this.specFailure = function(this: any, _browser: unknown, result: any) {
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
    autoWatchBatchDelay: 1000,

    files: [
      // Global hooks in test_setup must go first
      {pattern: path.join(GEN_DIR, 'front_end', 'testing', 'test_setup.js'), type: 'module'},
      ...tests.map(pattern => ({pattern, type: 'module'})),
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

    frameworks: ['mocha', 'chai', 'sinon'],

    client: {
      mocha: {
        ...TestConfig.mochaGrep,
        retries: TestConfig.retries,
        timeout: TestConfig.debug ? 0 : 5_000,
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
      {'middleware:snapshotTester': ['factory', snapshotTesterFactory]},
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

    middleware: ['snapshotTester'],

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

function snapshotTesterFactory() {
  return (req: any, res: any, next: any) => {
    if (req.url.startsWith('/snapshot-update-mode')) {
      res.writeHead(200, {'Content-Type': 'application/json'});
      const updateMode = TestConfig.onDiff.update === true;
      res.end(JSON.stringify({updateMode}));
      return res.end();
    }

    if (req.url.startsWith('/update-snapshot')) {
      const parsedUrl = url.parse(req.url, true);
      if (typeof parsedUrl.query.snapshotUrl !== 'string') {
        throw new Error('invalid snapshotUrl');
      }

      const snapshotUrl = parsedUrl.query.snapshotUrl;
      const snapshotPath = path.join(SOURCE_ROOT, url.parse(snapshotUrl, false).pathname?.split('gen')[1] ?? '');

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
