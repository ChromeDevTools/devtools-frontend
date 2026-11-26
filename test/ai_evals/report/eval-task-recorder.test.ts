// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import {buildEvalResult} from './eval-task-recorder.js';
import {CheckSource, formatCheckTable, scoreChecks} from './scorer.js';

describe('eval-task-recorder', () => {
  describe('buildEvalResult', () => {
    it('includes score, pass, summary, checks and null gradingError for graded tasks', () => {
      const grading = scoreChecks([
        {
          id: 'names_image',
          source: CheckSource.JUDGE,
          verdict: true,
          weight: 5,
          reason: 'Names img#hero-product-image.',
        },
      ]);
      const gradingOutput = formatCheckTable(grading);

      assert.deepEqual(
          buildEvalResult({
            runId: 'run-1',
            taskId: 'cls-unsized-image',
            target: 'performance',
            gradingOutput,
            grading,
          }),
          {
            runId: 'run-1',
            taskId: 'cls-unsized-image',
            target: 'performance',
            score: 1,
            pass: true,
            rawScore: 1,
            summary: {
              maxPoints: 5,
              earnedPoints: 5,
              penaltyPoints: 0,
              criticalFailures: [],
            },
            checks: grading.checks,
            gradingError: null,
            gradingOutput,
          },
      );
    });

    it('preserves critical failure capping and gradingError', () => {
      const criticalFailed = scoreChecks([
        {id: 'names_image', source: CheckSource.JUDGE, verdict: true, weight: 10, reason: 'Matched.'},
        {id: 'blames_other', source: CheckSource.JUDGE, verdict: true, weight: -1, critical: true, reason: 'Wrong.'},
      ]);
      const critResult = buildEvalResult({
                           runId: 'run-1',
                           taskId: 'cls-unsized-image',
                           target: 'performance',
                           gradingOutput: formatCheckTable(criticalFailed),
                           grading: criticalFailed,
                         }) as {
        score: number,
        pass: boolean,
        summary: {criticalFailures: string[]},
      };
      assert.strictEqual(critResult.score, 0.69);
      assert.isFalse(critResult.pass);
      assert.deepEqual(critResult.summary.criticalFailures, ['blames_other']);

      const errored = scoreChecks([], 'Judge timeout');
      assert.deepEqual(
          buildEvalResult({
            runId: 'run-1',
            taskId: 'cls-unsized-image',
            target: 'performance',
            gradingOutput: 'Score: null',
            grading: errored,
          }),
          {
            runId: 'run-1',
            taskId: 'cls-unsized-image',
            target: 'performance',
            score: null,
            pass: null,
            rawScore: null,
            summary: {
              maxPoints: 0,
              earnedPoints: 0,
              penaltyPoints: 0,
              criticalFailures: [],
            },
            checks: [],
            gradingError: 'Judge timeout',
            gradingOutput: 'Score: null',
          },
      );
    });
  });
});
