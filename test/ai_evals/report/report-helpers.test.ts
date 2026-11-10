// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import sinon from 'sinon';

import {TaskOutputFile} from './gcs-upload.js';
import {
  aggregateRunMetrics,
  buildRunTags,
  buildTaskTags,
  formatError,
  formatProtoDuration,
  formatProtoTaskStatus,
  formatVerificationStderr,
  formatVerificationStdout,
  generateRunId,
  getContentType,
} from './report-helpers.js';

describe('report-helpers', () => {
  describe('generateRunId', () => {
    it('formats run IDs as YYYY-MM-DD-HHmmss-xxxx-xxxxxxx with unique hex suffixes', () => {
      const clock = sinon.useFakeTimers(new Date('2026-08-25T13:46:19.789Z'));
      try {
        const firstId = generateRunId();
        const secondId = generateRunId();
        assert.match(firstId, /^2026-08-25-134619-[0-9a-f]{4}-[0-9a-f]{7}$/);
        assert.match(secondId, /^2026-08-25-134619-[0-9a-f]{4}-[0-9a-f]{7}$/);
        assert.notStrictEqual(firstId, secondId);
      } finally {
        clock.restore();
      }
    });
  });

  describe('getContentType', () => {
    it('returns the expected MIME type and charset for each artifact extension', () => {
      assert.strictEqual(getContentType('eval_run.log'), 'text/plain; charset=utf-8');
      assert.strictEqual(getContentType(TaskOutputFile.AGENT_LOG), 'text/plain; charset=utf-8');
      assert.strictEqual(getContentType(TaskOutputFile.CHAT_LOG), 'text/plain; charset=utf-8');
      assert.strictEqual(getContentType(TaskOutputFile.AGENT_STDERR), 'text/plain; charset=utf-8');
      assert.strictEqual(getContentType(TaskOutputFile.GRADER_LOG), 'text/plain; charset=utf-8');
      assert.strictEqual(getContentType(TaskOutputFile.VERIFICATION_STDOUT), 'text/plain; charset=utf-8');
      assert.strictEqual(getContentType(TaskOutputFile.VERIFICATION_STDERR), 'text/plain; charset=utf-8');
      assert.strictEqual(getContentType(TaskOutputFile.TRAJECTORY), 'application/json; charset=utf-8');
      assert.strictEqual(getContentType(TaskOutputFile.EVAL_RESULT), 'application/json; charset=utf-8');
      assert.strictEqual(getContentType('eval_report.html'), 'text/html; charset=utf-8');
      assert.strictEqual(getContentType('run_started.marker'), 'text/plain');
    });
  });

  describe('formatError', () => {
    it('returns the error stack when there is no cause', () => {
      const error = new Error('Primary failure');
      error.stack = 'Error: Primary failure\n    at run (test.ts:10:5)';
      assert.strictEqual(formatError(error), 'Error: Primary failure\n    at run (test.ts:10:5)');
    });

    it('appends the cause stack when the error has an Error cause', () => {
      const cause = new Error('Root cause');
      cause.stack = 'Error: Root cause\n    at inner (test.ts:2:3)';
      const error = new Error('Wrapper failure', {cause});
      error.stack = 'Error: Wrapper failure\n    at outer (test.ts:10:5)';
      assert.strictEqual(
          formatError(error),
          'Error: Wrapper failure\n    at outer (test.ts:10:5)\nError: Root cause\n    at inner (test.ts:2:3)',
      );
    });

    it('falls back to string representation when stack is missing or cause is not an Error', () => {
      const errorWithStringCause = new Error('Wrapper failure', {cause: 'connection reset'});
      errorWithStringCause.stack = undefined;
      assert.strictEqual(formatError(errorWithStringCause), 'Error: Wrapper failure\nconnection reset');
      assert.strictEqual(formatError('raw string error'), 'raw string error');
    });
  });

  describe('formatProtoDuration', () => {
    it('formats durations with three decimal places and an s suffix', () => {
      assert.strictEqual(formatProtoDuration(0), '0.000s');
      assert.strictEqual(formatProtoDuration(12.3456), '12.346s');
      assert.strictEqual(formatProtoDuration(4.2), '4.200s');
    });
  });

  describe('formatProtoTaskStatus', () => {
    it('prefixes phase statuses with TASK_STATUS_', () => {
      assert.strictEqual(formatProtoTaskStatus('SUCCEEDED'), 'TASK_STATUS_SUCCEEDED');
      assert.strictEqual(formatProtoTaskStatus('FAILED'), 'TASK_STATUS_FAILED');
      assert.strictEqual(formatProtoTaskStatus('UNSPECIFIED'), 'TASK_STATUS_UNSPECIFIED');
    });
  });

  describe('formatVerificationStdout', () => {
    it('formats verification summary lines for passed and failed tasks', () => {
      assert.strictEqual(
          formatVerificationStdout('coffee-alchemy', 'elements', false),
          [
            '[Verification] Task: coffee-alchemy',
            '[Verification] Target: elements',
            '[Verification] Result: PASSED',
            '',
          ].join('\n'),
      );
      assert.strictEqual(
          formatVerificationStdout('failing-request', 'network', true),
          [
            '[Verification] Task: failing-request',
            '[Verification] Target: network',
            '[Verification] Result: FAILED',
            '',
          ].join('\n'),
      );
    });
  });

  describe('formatVerificationStderr', () => {
    it('returns an empty string when no error occurred and formats error messages otherwise', () => {
      assert.strictEqual(formatVerificationStderr(), '');
      assert.strictEqual(formatVerificationStderr(''), '');
      assert.strictEqual(formatVerificationStderr('AssertionError: expected 200'),
                         '[Error]: AssertionError: expected 200\n');
    });
  });

  describe('buildRunTags', () => {
    it('maps target domains to agent_type:devtools-<target> tags', () => {
      assert.deepEqual(buildRunTags(new Set(['elements', 'network'])), [
        'agent_type:devtools-elements',
        'agent_type:devtools-network',
      ]);
      assert.deepEqual(buildRunTags([]), []);
    });
  });

  describe('buildTaskTags', () => {
    it('defaults to attempt:1 for single-attempt task IDs and extracts __attempt_<N> suffixes', () => {
      assert.deepEqual(buildTaskTags('elements', 'coffee-alchemy'), [
        'attempt:1',
        'agent_type:devtools-elements',
      ]);
      assert.deepEqual(buildTaskTags('network', 'failing-request__attempt_3'), [
        'attempt:3',
        'agent_type:devtools-network',
      ]);
    });
  });

  describe('aggregateRunMetrics', () => {
    it('sums token counts, tool calls, failed calls, and skill activations across tasks', () => {
      const metrics = aggregateRunMetrics(
          [
            {
              total: 3,
              byTool: {takeSnapshot: 1, executeJavaScript: 2},
              failedByTool: {executeJavaScript: 1},
              activationsBySkill: {elements: 1},
            },
            {
              total: 2,
              byTool: {executeJavaScript: 1, listNetworkRequests: 1},
              failedByTool: {executeJavaScript: 1, listNetworkRequests: 1},
              activationsBySkill: {elements: 1, network: 2},
            },
          ],
          [
            {input: 100, output: 40, cached: 20, total: 140},
            {input: 250, output: 60, cached: 50, total: 310},
          ],
      );

      assert.deepEqual(metrics, {
        inputTokens: 350,
        outputTokens: 100,
        cachedTokens: 70,
        totalTokens: 450,
        totalToolCalls: 5,
        toolCallsByTool: {
          takeSnapshot: 1,
          executeJavaScript: 3,
          listNetworkRequests: 1,
        },
        failedToolCallsByTool: {
          executeJavaScript: 2,
          listNetworkRequests: 1,
        },
        activationsBySkill: {
          elements: 2,
          network: 2,
        },
      });
    });

    it('leaves token totals undefined when tasks report no token usage', () => {
      const metrics = aggregateRunMetrics([], [{}]);
      assert.deepEqual(metrics, {
        inputTokens: undefined,
        outputTokens: undefined,
        cachedTokens: undefined,
        totalTokens: undefined,
        totalToolCalls: 0,
        toolCallsByTool: {},
        failedToolCallsByTool: {},
        activationsBySkill: {},
      });
    });
  });
});
