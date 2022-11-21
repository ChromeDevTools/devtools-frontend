// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Mocha from 'mocha';

import * as ResultsDb from './resultsdb.js';

const {
  EVENT_RUN_END,
  EVENT_TEST_FAIL,
  EVENT_TEST_PASS,
  EVENT_TEST_PENDING,
} = Mocha.Runner.constants;

function getErrorMessage(error: Error|unknown) {
  if (error instanceof Error) {
    if (error.cause) {
      // TypeScript types error.cause as {}, which doesn't allow us to access
      // properties on it or check for them. So we have to cast it to allow us
      // to read the `message` property.
      const cause = error.cause as {message?: string};
      const causeMessage = cause.message || '';
      return `${error.message}\n${causeMessage}`;
    }
    return error.stack;
  }
  return `${error}`;
}

class ResultsDbReporter extends Mocha.reporters.Spec {
  private suitePrefix?: string;

  constructor(runner: Mocha.Runner, options?: Mocha.MochaOptions) {
    super(runner, options);
    // `reportOptions` doesn't work with .mocharc.js (configurig via exports).
    // BUT, every module.exports is forwarded onto the options object.
    this.suitePrefix = (options as {suiteName: string} | undefined)?.suiteName;

    runner.on(EVENT_TEST_PASS, this.onTestPass.bind(this));
    runner.on(EVENT_TEST_FAIL, this.onTestFail.bind(this));
    runner.on(EVENT_TEST_PENDING, this.onTestSkip.bind(this));
    runner.on(EVENT_RUN_END, this.onceEventRunEnds.bind(this));
  }

  private onTestPass(test: Mocha.Test) {
    const testResult = this.buildDefaultTestResultFrom(test);
    testResult.status = 'PASS';
    testResult.expected = true;
    ResultsDb.recordTestResult(testResult);
  }

  private onTestFail(test: Mocha.Test, error: Error|unknown) {
    const testResult = this.buildDefaultTestResultFrom(test);
    testResult.status = 'FAIL';
    testResult.expected = false;
    testResult.summaryHtml = `<pre>${getErrorMessage(error)}</pre>`;
    ResultsDb.recordTestResult(testResult);
  }

  private onTestSkip(test: Mocha.Test) {
    const testResult = this.buildDefaultTestResultFrom(test);
    testResult.status = 'SKIP';
    testResult.expected = true;
    ResultsDb.recordTestResult(testResult);
  }

  private onceEventRunEnds() {
    ResultsDb.sendCollectedTestResultsIfSinkIsAvailable();
  }

  private buildDefaultTestResultFrom(test: Mocha.Test): ResultsDb.TestResult {
    let testId = this.suitePrefix ? this.suitePrefix + '/' : '';
    testId += test.titlePath().join('/');  // Chrome groups test by a path logic.
    return {
      testId: ResultsDb.sanitizedTestId(testId),
      duration: `${test.duration || 0}ms`,
    };
  }
}

exports = module.exports = ResultsDbReporter;
