// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, beforeEach, describe, it} from 'mocha';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {GEN_DIR} from '../conductor/paths.js';
import {TestConfig} from '../conductor/test_config.js';

import {ResultsDbCollector} from './resultsdb-collector.js';

describe('ResultsDbCollector', () => {
  const testFile = path.join(GEN_DIR, 'test', 'example', 'sample.test.js');
  let tmpDir: string;
  let originalExpectationsFile: string|undefined;
  let originalIsolatedOutput: string|undefined;
  let originalDryRun: boolean;
  let originalWrite: typeof process.stdout.write;
  let capturedStdout: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'resultsdb-collector-test-'));
    originalExpectationsFile = TestConfig.expectationsFile;
    originalIsolatedOutput = TestConfig.isolatedScriptTestOutput;
    originalDryRun = TestConfig.dryRun;
    TestConfig.expectationsFile = path.join(tmpDir, 'empty-expectations');
    TestConfig.isolatedScriptTestOutput = undefined;
    TestConfig.dryRun = false;

    capturedStdout = '';
    originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: string|Uint8Array) => {
                             capturedStdout += typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8');
                             return true;
                           }) as typeof process.stdout.write;
  });

  afterEach(() => {
    process.stdout.write = originalWrite;
    TestConfig.expectationsFile = originalExpectationsFile;
    TestConfig.isolatedScriptTestOutput = originalIsolatedOutput;
    TestConfig.dryRun = originalDryRun;
    fs.rmSync(tmpDir, {recursive: true, force: true});
  });

  function writeExpectations(content: string): void {
    const file = path.join(tmpDir, `expectations-${Math.random().toString(36).slice(2)}`);
    fs.writeFileSync(file, content, 'utf8');
    TestConfig.expectationsFile = file;
  }

  it('tracks pass, fail, and skip counts and computes exitCode', () => {
    const collector = new ResultsDbCollector();
    collector.recordPass({file: testFile, titlePath: ['suite', 'passes'], durationMs: 5, runAttempt: 1});
    collector.recordSkip({file: testFile, titlePath: ['suite', 'skipped'], runAttempt: 1});
    collector.recordFail({
      file: testFile,
      titlePath: ['suite', 'fails'],
      durationMs: 10,
      error: new Error('boom'),
      runAttempt: 1,
    });

    const result = collector.finalize();
    assert.strictEqual(result.passCount, 1);
    assert.strictEqual(result.skipCount, 1);
    assert.strictEqual(result.unexpectedFailures, 1);
    assert.strictEqual(result.expectedFailures, 0);
    assert.strictEqual(result.unexpectedPasses, 0);
    assert.strictEqual(result.exitCode, 1);
  });

  it('keeps a failure when a later repetition in the same runAttempt passes', () => {
    const collector = new ResultsDbCollector();
    collector.recordFail({
      file: testFile,
      titlePath: ['suite', 'flaky'],
      durationMs: 5,
      error: new Error('rep 1 failed'),
      runAttempt: 1,
    });
    collector.recordPass({file: testFile, titlePath: ['suite', 'flaky'], durationMs: 5, runAttempt: 1});

    const result = collector.finalize();
    assert.strictEqual(result.passCount, 0);
    assert.strictEqual(result.unexpectedFailures, 1);
    assert.strictEqual(result.exitCode, 1);
  });

  it('clears a transient Mocha willRetry failure when the next attempt passes', () => {
    const collector = new ResultsDbCollector();
    collector.recordFail({
      file: testFile,
      titlePath: ['suite', 'flaky'],
      durationMs: 5,
      error: new Error('attempt 1 failed'),
      runAttempt: 1,
      willRetry: true,
    });
    collector.recordPass({file: testFile, titlePath: ['suite', 'flaky'], durationMs: 5, runAttempt: 2});

    const result = collector.finalize();
    assert.strictEqual(result.passCount, 1);
    assert.strictEqual(result.unexpectedFailures, 0);
    assert.strictEqual(result.exitCode, 0);
  });

  it('supports external retry cycles via getUnexpectedFailedBuildTestIds and beginRetryAttempt', () => {
    const collector = new ResultsDbCollector();
    collector.recordFail({
      file: testFile,
      titlePath: ['suite', 'flaky'],
      durationMs: 5,
      error: new Error('attempt 1 failed'),
      runAttempt: 1,
    });
    collector.recordFail({
      file: testFile,
      titlePath: ['*fixture'],
      retryBuildTestId: testFile,
      durationMs: 5,
      error: new Error('top-level throw'),
      runAttempt: 1,
    });

    const failedIds = collector.getUnexpectedFailedBuildTestIds();
    assert.sameMembers(failedIds, [`${testFile}:suite:flaky`, testFile]);

    collector.beginRetryAttempt(failedIds);
    // Stale *fixture entry is cleared, while non-fixture entry remains failed until attempt 2 passes.
    assert.deepEqual(collector.getUnexpectedFailedBuildTestIds(), [`${testFile}:suite:flaky`]);

    collector.recordPass({file: testFile, titlePath: ['suite', 'flaky'], durationMs: 5, runAttempt: 2});
    assert.deepEqual(collector.getUnexpectedFailedBuildTestIds(), []);

    const result = collector.finalize();
    assert.strictEqual(result.passCount, 1);
    assert.strictEqual(result.unexpectedFailures, 0);
    assert.strictEqual(result.exitCode, 0);
  });

  it('handles expected failures from TestExpectations', () => {
    writeExpectations(
        'crbug.com/123 [ mac linux win32 ] test/example/sample.test.ts:suite:expected_fail [ Failure ]\n');

    const collector = new ResultsDbCollector();
    collector.recordFail({
      file: testFile,
      titlePath: ['suite', 'expected_fail'],
      durationMs: 5,
      error: new Error('expected'),
      runAttempt: 1,
    });

    const result = collector.finalize();
    assert.strictEqual(result.expectedFailures, 1);
    assert.strictEqual(result.unexpectedFailures, 0);
    assert.strictEqual(result.exitCode, 0);
  });

  it('handles unexpected passes from TestExpectations', () => {
    writeExpectations(
        'crbug.com/123 [ mac linux win32 ] test/example/sample.test.ts:suite:unexpected_pass [ Failure ]\n');

    const collector = new ResultsDbCollector();
    collector.recordPass({
      file: testFile,
      titlePath: ['suite', 'unexpected_pass'],
      durationMs: 5,
      runAttempt: 1,
    });

    const result = collector.finalize();
    assert.strictEqual(result.unexpectedPasses, 1);
    assert.strictEqual(result.exitCode, 1);
  });

  it('does not treat an unexpected skip as a failure or retry target', () => {
    writeExpectations('crbug.com/123 [ mac linux win32 ] test/example/sample.test.ts:suite:skipped_fail [ Failure ]\n');

    const collector = new ResultsDbCollector();
    collector.recordSkip({file: testFile, titlePath: ['suite', 'skipped_fail'], runAttempt: 1});

    assert.deepEqual(collector.getUnexpectedFailedBuildTestIds(), []);
    const result = collector.finalize();
    assert.strictEqual(result.skipCount, 1);
    assert.strictEqual(result.unexpectedFailures, 0);
    assert.strictEqual(result.exitCode, 0);
  });

  it('returns exitCode 1 when finalize is called with interrupted: true', () => {
    const collector = new ResultsDbCollector();
    collector.recordPass({file: testFile, titlePath: ['suite', 'passes'], durationMs: 5, runAttempt: 1});

    const result = collector.finalize({interrupted: true});
    assert.strictEqual(result.unexpectedFailures, 0);
    assert.strictEqual(result.exitCode, 1);
  });

  it('prints failure details, assertion diffs, and summary counts when enabled', () => {
    const collector = new ResultsDbCollector({
      printSummaryCounts: true,
      printFailureDetails: true,
    });
    collector.recordPass({file: testFile, titlePath: ['suite', 'passes'], durationMs: 5, runAttempt: 1});
    collector.recordSkip({file: testFile, titlePath: ['suite', 'skipped'], runAttempt: 1});
    const assertionError = Object.assign(new Error('values differ'), {
      actual: 'got',
      expected: 'want',
    });
    collector.recordFail({
      file: testFile,
      titlePath: ['suite', 'fails'],
      durationMs: 10,
      error: assertionError,
      hookTitle: 'beforeEach hook',
      runAttempt: 1,
    });

    const result = collector.finalize({durationMs: 1200});
    assert.strictEqual(result.exitCode, 1);
    assert.include(capturedStdout, '==== FAIL: test/example/sample.test.ts:suite:fails');
    assert.include(capturedStdout, 'Failed in beforeEach hook:');
    assert.include(capturedStdout, 'got');
    assert.include(capturedStdout, 'want');
    assert.include(capturedStdout, '1 passing (1.2s)');
    assert.include(capturedStdout, '1 pending');
    assert.include(capturedStdout, '1 failing');
  });
});
