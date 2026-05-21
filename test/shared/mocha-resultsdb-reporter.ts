// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Mocha from 'mocha';
import * as fs from 'node:fs';
import * as path from 'node:path';

import * as DiffUtils from '../conductor/diff-utils.js';
import * as ResultsDb from '../conductor/resultsdb.js';
import {
  ScreenshotError,
} from '../conductor/screenshot-error.js';
import {TestConfig} from '../conductor/test_config.js';

const {
  EVENT_RUN_END,
  EVENT_TEST_FAIL,
  EVENT_TEST_PASS,
  EVENT_TEST_RETRY,
  EVENT_TEST_PENDING,
} = Mocha.Runner.constants;

function getErrorMessage(error: Error|unknown): string {
  if (error instanceof Error) {
    if (error.cause) {
      // TypeScript types error.cause as {}, which doesn't allow us to access
      // properties on it or check for them. So we have to cast it to allow us
      // to read the `message` property.
      const cause = error.cause as {message?: string};
      const causeMessage = cause.message || '';
      return `${error.message}\n${causeMessage}`;
    }
    return error.stack ?? error.message;
  }
  return `${error}`;
}

interface TestRetry {
  currentRetry(): number;
}

interface HookWithParent {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parent: Record<string, any>;
}

class ResultsDbReporter extends (TestConfig.isAiAgent ? Mocha.reporters.Base : Mocha.reporters.Spec) {
  private suitePrefix?: string;
  htmlResult: fs.WriteStream|undefined;

  localResultsPath() {
    return !ResultsDb.available() && this.suitePrefix ? path.join(__dirname, '..', this.suitePrefix, 'results.html') :
                                                        undefined;
  }

  constructor(runner: Mocha.Runner, options?: Mocha.MochaOptions) {
    super(runner, options);
    // `reportOptions` doesn't work with .mocharc.js (configuring via exports).
    // BUT, every module.exports is forwarded onto the options object.
    this.suitePrefix = (options as {suiteName: string} | undefined)?.suiteName;

    const localResults = this.localResultsPath();

    if (localResults) {
      this.htmlResult = fs.createWriteStream(localResults, {});
    }

    runner.on(EVENT_TEST_PASS, this.onTestPass.bind(this));
    runner.on(EVENT_TEST_FAIL, this.onTestFail.bind(this));
    runner.on(EVENT_TEST_RETRY, this.onTestFail.bind(this));
    runner.on(EVENT_TEST_PENDING, this.onTestSkip.bind(this));

    if (TestConfig.isAiAgent) {
      // Base doesn't report anything so we just report the final result.
      runner.once(EVENT_RUN_END, this.epilogue.bind(this));
    }
  }

  private onTestPass(test: Mocha.Test) {
    const testResult = this.buildDefaultTestResultFrom(test);
    testResult.status = 'PASS';
    testResult.expected = true;
    // @ts-expect-error state exists on non-hosted conductor tests.
    const devToolsPage = test.parent?.state?.devToolsPage;
    if (devToolsPage) {
      testResult.artifacts = ScreenshotError.saveArtifacts(devToolsPage.screenshotLog);
    }
    ResultsDb.sendTestResult(testResult);
  }

  private onTestFail(test: Mocha.Test, error: Error|ScreenshotError|unknown) {
    const testResult = this.buildDefaultTestResultFrom(test);
    testResult.status = 'FAIL';
    testResult.expected = false;
    if (error instanceof ScreenshotError) {
      testResult.artifacts = error.screenshots;
      testResult.summaryHtml = error.toMiloSummary();
      if (error.screenshotPath) {
        testResult.tags?.push({key: 'screenshot_path', value: error.screenshotPath});
      }
    } else {
      const errorMessage = getErrorMessage(error);
      const assertionDiff = DiffUtils.resultAssertionsDiff([error]);
      const diffText = DiffUtils.formatDiffText(assertionDiff);
      testResult.summaryHtml = DiffUtils.formatSummary(errorMessage, diffText);
    }
    if (this.htmlResult) {
      this.htmlResult.write(testResult.summaryHtml);
      if (error instanceof ScreenshotError) {
        for (const artifactId in error.screenshots) {
          this.htmlResult.write(`<br>${artifactId}<br><img src="${error.screenshots[artifactId].filePath}">`);
        }
      }
    }
    ResultsDb.sendTestResult(testResult);
  }

  private maybeHook(test: Mocha.Test): string|undefined {
    if (!(test instanceof Mocha.Hook)) {
      return undefined;
    }
    const hook = (test as unknown) as HookWithParent;
    const suite = hook.parent;
    const hookNames = ['afterAll', 'afterEach', 'beforeAll', 'beforeEach'];
    return hookNames.find(hookName => suite[`_${hookName}`].includes(test) ? hookName : undefined);
  }

  private onTestSkip(test: Mocha.Test) {
    const testResult = this.buildDefaultTestResultFrom(test);
    testResult.status = 'SKIP';
    testResult.expected = true;
    ResultsDb.sendTestResult(testResult);
  }

  private buildDefaultTestResultFrom(test: Mocha.Test): ResultsDb.TestResult {
    let testId = this.suitePrefix ? this.suitePrefix + '/' : '';
    testId += test.titlePath().join('/');  // Chrome groups test by a path logic.
    const testRetry = ((test as unknown) as TestRetry);
    const result = {
      testId: ResultsDb.sanitizedTestId(testId),
      duration: `${((test.duration || 1) * .001).toFixed(3)}s`,
      tags: [{key: 'run', value: String(testRetry.currentRetry() + 1)}],
    };
    const hookName = this.maybeHook(test);
    if (hookName) {
      result.tags.push({key: 'hook', value: hookName});
    }
    return result;
  }

  override epilogue() {
    super.epilogue();
    const localResults = this.localResultsPath();
    if (this.failures.length > 0 && localResults) {
      console.error(`Results have been written to file://${localResults}`);
    }
  }
}

exports = module.exports = ResultsDbReporter;
