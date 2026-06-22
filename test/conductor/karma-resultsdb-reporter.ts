// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable @typescript-eslint/no-explicit-any */

import {styleText} from 'node:util';

import {formatAsHtml, formatDiff, resultAssertionsDiff} from './diff-utils.js';
import * as ResultsDb from './resultsdb.js';
import {ScreenshotError} from './screenshot-error.js';

export function formatAsPatch(assertionDiff: any) {
  const consoleDiffLines = Array.from(formatDiff(
      assertionDiff,
      (same: string) => ` ${same}`,
      (actual: string) => styleText('green', `+${actual}`),
      (expected: string) => styleText('red', `-${expected}`),
      ));
  if (consoleDiffLines.length > 0) {
    return `${styleText('red', '- expected')}\n${styleText('green', '+ actual')}\n\n${consoleDiffLines.join('\n')}\n`;
  }
  return null;
}

export const ResultsDBReporter = function(
    this: any, baseReporterDecorator: (arg0: any) => void, formatError: any, _config: any) {
  baseReporterDecorator(this);

  this.USE_COLORS = true;

  const capturedLog: Array<{log: string, type: string}> = [];
  this.onBrowserLog = (_browser: any, log: string, type: string) => {
    capturedLog.push({log, type});
  };

  const specComplete = (_browser: any, result: any) => {
    if (result.mocha?.hasExclusiveTests) {
      this.hasExclusiveTests = true;
    }
    const {suite, description, log, startTime, endTime, success, skipped} = result;
    const testId = ResultsDb.sanitizedTestId([...suite, description].join('/'));
    const expected = success || skipped;
    const status = skipped ? 'SKIP' : success ? 'PASS' : 'FAIL';
    let duration = '.001s';
    if (startTime < endTime) {
      duration = ((endTime - startTime) * .001).toFixed(3) + 's';
    }

    const consoleLog = capturedLog.map(({type, log}) => `${type.toUpperCase()}: ${log}`);
    capturedLog.length = 0;

    let summaryHtml = undefined;
    if (!expected || consoleLog.length > 0) {
      const messages = consoleLog.concat(log.map(formatError));
      const assertionDiff = resultAssertionsDiff(result);
      // Prepare resultsdb summary
      const summaryLines = messages.map(m => `<p><pre>${m}</pre></p>`);

      const htmlDiff = formatAsHtml(assertionDiff);
      if (htmlDiff) {
        summaryLines.push(htmlDiff);
      }
      summaryHtml = summaryLines.join('\n');

      const consoleHeader = `==== ${status}: ${testId}`;
      this.write(`${consoleHeader}\n${messages.join('\n\n')}\n`);
      const patch = formatAsPatch(assertionDiff);
      if (patch) {
        this.write(patch);
      }
      this.write(`${'='.repeat(consoleHeader.length)}\n\n`);
      if (_config['bail']) {
        throw new Error('Bailing (bail option is enabled)');
      }
    } else if (skipped) {
      this.write(`==== ${status}: ${testId}\n\n`);
    }

    const testResult: ResultsDb.TestResult = {testId, duration, status, expected, summaryHtml};

    if (result.log?.[0]?.startsWith('Error: ScreenshotError')) {
      const screenshotError = ScreenshotError.errors.shift();
      if (screenshotError) {
        // Assert that the screenshot error matches the log.
        // If it does not, it means something is wrong
        // with the order of assertions and tests.«
        if (!result.log?.[0]?.includes(screenshotError.message)) {
          throw new Error('Unexpected screenshot assertion error');
        }
        testResult.artifacts = screenshotError.screenshots;
        testResult.summaryHtml = screenshotError.toMiloSummary();
        if (screenshotError.screenshotPath) {
          if (!testResult.tags) {
            testResult.tags = [];
          }
          testResult.tags.push({key: 'screenshot_path', value: screenshotError.screenshotPath});
        }
      }
    }
    ResultsDb.sendTestResult(testResult, /* sendImmediately=*/ true);
  };
  this.specSuccess = specComplete;
  this.specSkipped = specComplete;
  this.specFailure = specComplete;

  this.onRunComplete = (browsers: any, results: any) => {
    browsers.forEach((browser: any) => {
      const {total, success, failed, skipped} = browser.lastResult;
      if (total !== success + failed + skipped && !this.hasExclusiveTests) {
        throw new Error(`Karma exited early: executed ${success + failed + skipped} out of ${total} tests`);
      }
    });

    if (browsers.length >= 1 && !results.disconnected && !results.error) {
      if (!results.failed) {
        this.write('SUCCESS: %d passed (%d skipped)\n', results.success, results.skipped);
      } else {
        this.write('FAILED: %d failed, %d passed (%d skipped)\n', results.failed, results.success, results.skipped);
      }
    }
  };
};
ResultsDBReporter.$inject = ['baseReporterDecorator', 'formatError', 'config'];
