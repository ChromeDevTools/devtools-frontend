// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable @typescript-eslint/no-explicit-any */

import * as ResultsDb from './resultsdb.js';
const diff = require('diff');
const chalk = require('chalk');

type DiffCallback = (line: string) => string;
function*
    formatDiff(
        diffBlocks: Array<{value: string, added: boolean, removed: boolean}>, onSame: DiffCallback,
        onAdded: DiffCallback, onRemoved: DiffCallback) {
  for (const block of diffBlocks) {
    const lines = block.value.split('\n').filter(l => l.length > 0);
    if (!block.added && !block.removed && lines.length > 3) {
      yield onSame(lines[0]);
      yield onSame('  ...');
      yield onSame(lines[lines.length - 1]);
    } else {
      for (const line of lines) {
        if (block.added) {
          yield onAdded(line);
        } else if (block.removed) {
          yield onRemoved(line);
        } else {
          yield onSame(line);
        }
      }
    }
  }
}

export function resultAssertionsDiff({assertionErrors}: any) {
  return assertionErrors && assertionErrors.length > 0 ?
      diff.diffLines(`${assertionErrors[0].expected}`, `${assertionErrors[0].actual}`) :
      [];
}

export function formatAsPatch(assertionDiff: any) {
  const consoleDiffLines = Array.from(formatDiff(
      assertionDiff, same => ` ${same}`, actual => chalk.green(`+${actual}`), expected => chalk.red(`-${expected}`)));
  if (consoleDiffLines.length > 0) {
    return `${chalk.red('- expected')}\n${chalk.green('+ actual')}\n\n${consoleDiffLines.join('\n')}\n`;
  }
  return null;
}

export const ResultsDBReporter = function(
    this: any, baseReporterDecorator: (arg0: any) => void, formatError: any, _config: any) {
  baseReporterDecorator(this);

  this.USE_COLORS = true;

  const capturedLog: {log: string, type: string}[] = [];
  this.onBrowserLog = (browser: any, log: string, type: string) => {
    capturedLog.push({log, type});
  };

  const specComplete = (browser: any, result: any) => {
    const {suite, description, log, startTime, endTime, success, skipped} = result;
    const testId = ResultsDb.sanitizedTestId([...suite, description].join('/'));
    const expected = success || skipped;
    const status = skipped ? 'SKIP' : success ? 'PASS' : 'FAIL';
    let duration = '1ms';
    if (startTime < endTime) {
      duration = (endTime - startTime).toString() + 'ms';
    }

    const consoleLog = capturedLog.map(({type, log}) => `${type.toUpperCase()}: ${log}`);
    capturedLog.length = 0;

    let summaryHtml = undefined;
    if (!expected || consoleLog.length > 0) {
      const messages = [...consoleLog, ...log.map(formatError)];
      const assertionDiff = resultAssertionsDiff(result);

      // Prepare resultsdb summary
      const summaryLines = messages.map(m => `<p><pre>${m}</pre></p>`);
      const htmlDiffLines = Array.from(formatDiff(
          assertionDiff, same => `<pre style="margin: 0;"> ${same}</pre>`,
          actual => `<pre style="color: green;margin: 0;">+${actual}</pre>`,
          expected => `<pre style="color: red;margin: 0;">-${expected}</pre>`));
      if (htmlDiffLines.length > 0) {
        summaryLines.push(
            '<p>',
            '<pre style="color: red;margin: 0;">- expected</pre>',
            '<pre style="color: green;margin: 0;">+ actual</pre>',
            '</p>',
            '<p>',
        );
        summaryLines.push(...htmlDiffLines);
        summaryLines.push('</p>');
      }
      summaryHtml = summaryLines.join('\n');

      // Log to console
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
    ResultsDb.sendTestResult(testResult);
  };
  this.specSuccess = specComplete;
  this.specSkipped = specComplete;
  this.specFailure = specComplete;

  this.onRunComplete = (browsers: any, results: any) => {
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
