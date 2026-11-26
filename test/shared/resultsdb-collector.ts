// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  computeBuildTestId,
  formatFailedTestsSummary,
  generateExactTestId,
  listContainsTestOrSuite,
} from '../../front_end/testing/TestIdGeneration.js';
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
  printSummaryCounts?: boolean;
  printFailureDetails?: boolean;
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
  retryBuildTestId?: string;
  durationMs: number;
  error: unknown;
  hookName?: string;
  hookTitle?: string;
  runAttempt: number;
  willRetry?: boolean;
}

export interface RecordSkipInput {
  file: string;
  titlePath: string[];
  runAttempt: number;
}

export interface FinalizeResult {
  unexpectedFailures: number;
  expectedFailures: number;
  unexpectedPasses: number;
  passCount: number;
  skipCount: number;
  exitCode: number;
}

type FailureKind = 'none'|'expected'|'unexpected';

interface TrackedTestState {
  runAttempt: number;
  status: 'PASS'|'FAIL'|'SKIP';
  failureKind: FailureKind;
  isRetriable: boolean;
  hasUnexpectedPass: boolean;
  retryBuildTestId: string;
  failureMessage?: string;
  diffText?: string|null;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.cause) {
      const cause = error.cause as {message?: string, stack?: string};
      const causeMessage = cause.stack ?? cause.message ?? '';
      return causeMessage ? `${error.message}\n${causeMessage}` : (error.stack ?? error.message);
    }
    return error.stack ?? error.message;
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const errLike = error as {message?: unknown, stack?: unknown};
    if (typeof errLike.stack === 'string' && errLike.stack.length > 0) {
      return errLike.stack;
    }
    if (typeof errLike.message === 'string') {
      return errLike.message;
    }
  }
  return `${error}`;
}

export class ResultsDbCollector {
  readonly #suitePrefix?: string;
  readonly #printSummaryCounts: boolean;
  readonly #printFailureDetails: boolean;
  readonly #states = new Map<string, TrackedTestState>();
  #htmlResult: fs.WriteStream|undefined;

  constructor(options: ResultsDbCollectorOptions = {}) {
    this.#suitePrefix = options.suitePrefix;
    this.#printSummaryCounts = Boolean(options.printSummaryCounts);
    this.#printFailureDetails = Boolean(options.printFailureDetails);

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
      process.stdout.write(`[PASS] ${exactTestId} ${Math.round(input.durationMs)}ms\n`);
      return;
    }

    const isExpected = isExpectedResult({exactTestId, success: true, skipped: false});
    if (!isExpected) {
      process.stdout.write(`\n[TestExpectations] Unexpected pass: ${exactTestId}\n`);
    }

    const existing = this.#states.get(exactTestId);
    const keepPriorFailure = existing !== undefined && existing.failureKind !== 'none' &&
        (!existing.isRetriable || existing.runAttempt === input.runAttempt);
    this.#states.set(exactTestId, {
      runAttempt: input.runAttempt,
      status: keepPriorFailure ? 'FAIL' : 'PASS',
      failureKind: keepPriorFailure ? existing.failureKind : 'none',
      isRetriable: keepPriorFailure ? existing.isRetriable : false,
      hasUnexpectedPass: Boolean(existing?.hasUnexpectedPass) || !isExpected,
      retryBuildTestId: existing?.retryBuildTestId ?? computeBuildTestId(input.file, input.titlePath),
      failureMessage: keepPriorFailure ? existing.failureMessage : undefined,
      diffText: keepPriorFailure ? existing.diffText : undefined,
    });

    if (!TestConfig.isAiAgent) {
      process.stdout.write(`[PASS] ${exactTestId} ${Math.round(input.durationMs)}ms\n`);
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
    if (TestConfig.dryRun) {
      return;
    }

    const {exactTestId, coarseName, fineName, caseName} =
        generateExactTestId(GEN_DIR, input.file, input.titlePath, SOURCE_ROOT);
    const isExpected = isExpectedResult({exactTestId, success: false, skipped: false});
    if (isExpected) {
      process.stdout.write(`\n[TestExpectations] Expected failure: ${exactTestId}\n`);
    }

    if (!TestConfig.isAiAgent) {
      process.stdout.write(`[FAIL] ${exactTestId} ${Math.round(input.durationMs)}ms\n`);
    }

    const testResult = this.#buildDefaultTestResult(exactTestId, coarseName, fineName, caseName, input.durationMs,
                                                    input.runAttempt, input.hookName);
    testResult.status = 'FAIL';
    testResult.expected = isExpected;

    const errorMessage = getErrorMessage(input.error);
    let diffText: string|null = null;
    if (input.error instanceof ScreenshotError) {
      testResult.artifacts = input.error.screenshots;
      testResult.summaryHtml = input.error.toMiloSummary();
      if (input.error.screenshotPath) {
        testResult.tags?.push({key: 'screenshot_path', value: input.error.screenshotPath});
      }
    } else {
      const hasAssertionSides = typeof input.error === 'object' && input.error !== null &&
          ('actual' in input.error || 'expected' in input.error);
      const assertionDiff = hasAssertionSides ? DiffUtils.resultAssertionsDiff([input.error]) : [];
      diffText = assertionDiff.length > 0 ? DiffUtils.formatDiffText(assertionDiff) : null;
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

    const existing = this.#states.get(exactTestId);
    const retryBuildTestId = input.retryBuildTestId ?? computeBuildTestId(input.file, input.titlePath);
    const formattedFailure = input.hookTitle ? `Failed in ${input.hookTitle}:\n${errorMessage}` : errorMessage;
    const keepUnexpected =
        existing?.failureKind === 'unexpected' && (!existing.isRetriable || existing.runAttempt === input.runAttempt);
    this.#states.set(exactTestId, {
      runAttempt: input.runAttempt,
      status: 'FAIL',
      failureKind: keepUnexpected || !isExpected ? 'unexpected' : 'expected',
      isRetriable: Boolean(input.willRetry) && !keepUnexpected,
      hasUnexpectedPass: Boolean(existing?.hasUnexpectedPass),
      retryBuildTestId,
      failureMessage: !isExpected ? formattedFailure : existing?.failureMessage,
      diffText: !isExpected ? diffText : existing?.diffText,
    });

    ResultsDb.sendTestResult(testResult);
  }

  recordSkip(input: RecordSkipInput): void {
    if (TestConfig.dryRun) {
      return;
    }

    const {exactTestId, coarseName, fineName, caseName} =
        generateExactTestId(GEN_DIR, input.file, input.titlePath, SOURCE_ROOT);
    if (!TestConfig.isAiAgent) {
      process.stdout.write(`[SKIP] ${exactTestId}\n`);
    }

    const isExpected = isExpectedResult({exactTestId, success: false, skipped: true});
    const existing = this.#states.get(exactTestId);
    const canOverwrite = !existing || (existing.isRetriable && existing.runAttempt !== input.runAttempt);
    if (canOverwrite) {
      this.#states.set(exactTestId, {
        runAttempt: input.runAttempt,
        status: 'SKIP',
        failureKind: 'none',
        isRetriable: false,
        hasUnexpectedPass: Boolean(existing?.hasUnexpectedPass),
        retryBuildTestId: existing?.retryBuildTestId ?? computeBuildTestId(input.file, input.titlePath),
      });
    }

    const testResult = this.#buildDefaultTestResult(exactTestId, coarseName, fineName, caseName, 0, input.runAttempt);
    testResult.status = 'SKIP';
    testResult.expected = isExpected;
    ResultsDb.sendTestResult(testResult);
  }

  getUnexpectedFailedBuildTestIds(): string[] {
    const failed = new Set<string>();
    for (const state of this.#states.values()) {
      if (state.failureKind === 'unexpected') {
        failed.add(state.retryBuildTestId);
      }
    }
    return Array.from(failed);
  }

  beginRetryAttempt(retriedBuildTestIds: Iterable<string>): void {
    const retriedList = Array.from(retriedBuildTestIds);
    for (const [exactTestId, state] of this.#states.entries()) {
      if (!listContainsTestOrSuite(retriedList, state.retryBuildTestId)) {
        continue;
      }
      if (exactTestId.endsWith(':*fixture')) {
        this.#states.delete(exactTestId);
        continue;
      }
      state.isRetriable = true;
    }
  }

  finalize(options: {interrupted?: boolean, durationMs?: number} = {}): FinalizeResult {
    if (this.#htmlResult) {
      this.#htmlResult.end();
      this.#htmlResult = undefined;
    }

    const failedTestIds: string[] = [];
    let unexpectedFailures = 0;
    let expectedFailures = 0;
    let unexpectedPasses = 0;
    let passCount = 0;
    let skipCount = 0;

    for (const [exactTestId, state] of this.#states.entries()) {
      if (state.status === 'PASS') {
        passCount++;
      } else if (state.status === 'SKIP') {
        skipCount++;
      }
      if (state.failureKind === 'unexpected') {
        unexpectedFailures++;
        failedTestIds.push(exactTestId);
      } else if (state.failureKind === 'expected') {
        expectedFailures++;
      }
      if (state.hasUnexpectedPass) {
        unexpectedPasses++;
      }
    }

    if (this.#printFailureDetails && failedTestIds.length > 0) {
      for (const exactTestId of failedTestIds) {
        const state = this.#states.get(exactTestId);
        if (!state?.failureMessage) {
          continue;
        }
        process.stdout.write(`\n==== FAIL: ${exactTestId}\n${state.failureMessage}\n`);
        if (state.diffText) {
          process.stdout.write(`\n${state.diffText}\n`);
        }
        process.stdout.write(`${'='.repeat(`==== FAIL: ${exactTestId}`.length)}\n`);
      }
    }

    if (this.#printSummaryCounts) {
      const durationSuffix = options.durationMs !== undefined ? ` (${(options.durationMs * 0.001).toFixed(1)}s)` : '';
      process.stdout.write(`\n  ${passCount} passing${durationSuffix}\n`);
      if (skipCount > 0) {
        process.stdout.write(`  ${skipCount} pending\n`);
      }
      if (unexpectedFailures > 0) {
        process.stdout.write(`  ${unexpectedFailures} failing\n`);
      }
    }

    const summary = formatFailedTestsSummary(failedTestIds);
    if (summary) {
      process.stdout.write(summary);
    }

    const totalFailures = unexpectedFailures + expectedFailures;
    let exitCode = unexpectedFailures > 0 || options.interrupted ? 1 : 0;
    if (totalFailures > 0 && unexpectedFailures === 0 && !options.interrupted) {
      process.stdout.write('\n[TestExpectations] All failures were expected! Overriding exit code to 0.\n');
      exitCode = 0;
    }

    if (unexpectedPasses > 0) {
      process.stdout.write(`\n[TestExpectations] ${unexpectedPasses} unexpected passes! Overriding exit code to 1.\n`);
      exitCode = 1;
    }

    if (TestConfig.isolatedScriptTestOutput) {
      ResultsDb.writeIsolatedScriptTestOutput(TestConfig.isolatedScriptTestOutput, {
        numFailures: unexpectedFailures + unexpectedPasses,
        interrupted: options.interrupted,
      });
    }

    const localResults = this.localResultsPath();
    if (totalFailures > 0 && localResults) {
      console.error(`Results have been written to file://${localResults}`);
    }

    return {
      unexpectedFailures,
      expectedFailures,
      unexpectedPasses,
      passCount,
      skipCount,
      exitCode,
    };
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
