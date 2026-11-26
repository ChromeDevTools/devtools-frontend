// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as fs from 'node:fs';
import * as path from 'node:path';

import {formatFailedTestsSummary, generateExactTestId} from '../../front_end/testing/TestIdGeneration.js';
import * as DiffUtils from '../conductor/diff-utils.js';
import {GEN_DIR, SOURCE_ROOT} from '../conductor/paths.js';
import * as ResultsDb from '../conductor/resultsdb.js';
import {
  type ArtifactGroup,
  ScreenshotError,
} from '../conductor/screenshot-error.js';
import {TestConfig} from '../conductor/test_config.js';
import {isExpectedResult} from '../conductor/test_expectations.js';

export interface ResultsDbCollectorOptions {
  suitePrefix?: string;
}

export interface RecordPassInput {
  file: string;
  titlePath: string[];
  durationMs: number;
  runAttempt: number;
  artifacts?: ArtifactGroup;
}

export interface RecordFailInput {
  file: string;
  titlePath: string[];
  durationMs: number;
  error: unknown;
  hookName?: string;
  hookTitle?: string;
  runAttempt: number;
}

export interface RecordSkipInput {
  file: string;
  titlePath: string[];
  runAttempt: number;
}

function getErrorMessage(error: unknown): string {
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

export class ResultsDbCollector {
  readonly #suitePrefix?: string;
  #expectedFailuresCount = 0;
  #unexpectedPassesCount = 0;
  readonly #failedTestIds = new Set<string>();
  #htmlResult: fs.WriteStream|undefined;

  constructor(options: ResultsDbCollectorOptions = {}) {
    this.#suitePrefix = options.suitePrefix;

    if (!TestConfig.dryRun) {
      const localResults = this.localResultsPath();
      if (localResults) {
        fs.mkdirSync(path.dirname(localResults), {recursive: true});
        this.#htmlResult = fs.createWriteStream(localResults, {});
      }
    }
  }

  localResultsPath(): string|undefined {
    return !ResultsDb.available() && this.#suitePrefix && fs.existsSync(GEN_DIR) ?
        path.join(GEN_DIR, 'test', this.#suitePrefix, 'results.html') :
        undefined;
  }

  recordPass(input: RecordPassInput): void {
    const {exactTestId, coarseName, fineName, caseName} =
        generateExactTestId(GEN_DIR, input.file, input.titlePath, SOURCE_ROOT);

    if (TestConfig.dryRun) {
      process.stdout.write(`[PASS] ${exactTestId} ${input.durationMs}ms\n`);
      return;
    }

    this.#failedTestIds.delete(exactTestId);
    const isExpected = isExpectedResult({exactTestId, success: true, skipped: false});
    if (!isExpected) {
      this.#unexpectedPassesCount++;
      process.stdout.write(`\n[TestExpectations] Unexpected pass: ${exactTestId}\n`);
    }

    if (!TestConfig.isAiAgent) {
      process.stdout.write(`[PASS] ${exactTestId} ${input.durationMs}ms\n`);
    }
    const testResult =
        this.#buildDefaultTestResult(exactTestId, coarseName, fineName, caseName, input.durationMs, input.runAttempt);
    testResult.status = 'PASS';
    testResult.expected = isExpected;
    if (input.artifacts) {
      testResult.artifacts = input.artifacts;
    }
    ResultsDb.sendTestResult(testResult);
  }

  recordFail(input: RecordFailInput): void {
    const {exactTestId, coarseName, fineName, caseName} =
        generateExactTestId(GEN_DIR, input.file, input.titlePath, SOURCE_ROOT);
    const isExpected = isExpectedResult({exactTestId, success: false, skipped: false});
    if (isExpected) {
      this.#expectedFailuresCount++;
      process.stdout.write(`\n[TestExpectations] Expected failure: ${exactTestId}\n`);
    } else {
      this.#failedTestIds.add(exactTestId);
    }

    if (!TestConfig.isAiAgent) {
      process.stdout.write(`[FAIL] ${exactTestId} ${input.durationMs}ms\n`);
    }

    const testResult = this.#buildDefaultTestResult(exactTestId, coarseName, fineName, caseName, input.durationMs,
                                                    input.runAttempt, input.hookName);
    testResult.status = 'FAIL';
    testResult.expected = isExpected;
    if (input.error instanceof ScreenshotError) {
      testResult.artifacts = input.error.screenshots;
      testResult.summaryHtml = input.error.toMiloSummary();
      if (input.error.screenshotPath) {
        testResult.tags?.push({key: 'screenshot_path', value: input.error.screenshotPath});
      }
    } else {
      const errorMessage = getErrorMessage(input.error);
      const assertionDiff = DiffUtils.resultAssertionsDiff([input.error]);
      const diffText = DiffUtils.formatDiffText(assertionDiff);
      testResult.summaryHtml = DiffUtils.formatSummary(errorMessage, diffText);
    }
    if (input.hookTitle) {
      testResult.summaryHtml = `Failed in ${input.hookTitle}:<br>${testResult.summaryHtml}`;
    }
    if (this.#htmlResult && testResult.summaryHtml) {
      this.#htmlResult.write(testResult.summaryHtml);
      if (input.error instanceof ScreenshotError) {
        for (const artifactId in input.error.screenshots) {
          this.#htmlResult.write(`<br>${artifactId}<br><img src="${input.error.screenshots[artifactId].filePath}">`);
        }
      }
    }
    ResultsDb.sendTestResult(testResult);
  }

  recordSkip(input: RecordSkipInput): void {
    const {exactTestId, coarseName, fineName, caseName} =
        generateExactTestId(GEN_DIR, input.file, input.titlePath, SOURCE_ROOT);
    if (!TestConfig.isAiAgent) {
      process.stdout.write(`[SKIP] ${exactTestId}\n`);
    }
    const testResult = this.#buildDefaultTestResult(exactTestId, coarseName, fineName, caseName, 0, input.runAttempt);
    testResult.status = 'SKIP';
    testResult.expected = isExpectedResult({exactTestId, success: false, skipped: true});
    ResultsDb.sendTestResult(testResult);
  }

  finalize(failuresCount: number): void {
    if (this.#htmlResult) {
      this.#htmlResult.end();
      this.#htmlResult = undefined;
    }

    const summary = formatFailedTestsSummary(this.#failedTestIds);
    if (summary) {
      process.stdout.write(summary);
    }

    const unexpectedFailures = failuresCount - this.#expectedFailuresCount;
    if (failuresCount > 0 && unexpectedFailures === 0) {
      process.stdout.write('\n[TestExpectations] All failures were expected! Overriding exit code to 0.\n');
      process.exitCode = 0;
    }

    if (this.#unexpectedPassesCount > 0) {
      process.stdout.write(
          `\n[TestExpectations] ${this.#unexpectedPassesCount} unexpected passes! Overriding exit code to 1.\n`);
      process.exitCode = 1;
    }

    if (TestConfig.isolatedScriptTestOutput) {
      ResultsDb.writeIsolatedScriptTestOutput(TestConfig.isolatedScriptTestOutput, {
        numFailures: Math.max(0, unexpectedFailures) + this.#unexpectedPassesCount,
      });
    }

    const localResults = this.localResultsPath();
    if (failuresCount > 0 && localResults) {
      console.error(`Results have been written to file://${localResults}`);
    }
  }

  #buildDefaultTestResult(
      exactTestId: string,
      coarseName: string,
      fineName: string,
      caseName: string,
      durationMs: number,
      runAttempt: number,
      hookName?: string,
      ): ResultsDb.TestResult {
    const properties = ResultsDb.buildTestProperties(exactTestId, coarseName, fineName, caseName);
    const result: ResultsDb.TestResult = {
      duration: `${((durationMs || 1) * 0.001).toFixed(3)}s`,
      ...properties,
      tags: [...properties.tags, {key: 'run', value: String(runAttempt)}],
    };
    if (hookName) {
      result.tags?.push({key: 'hook', value: hookName});
    }
    return result;
  }
}
