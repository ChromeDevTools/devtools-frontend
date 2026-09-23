// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {PASS_SCORE_THRESHOLD} from '../auto-run/auto-run.ts';

import {calculateWeightedScore} from './helpers/evaluators.ts';
import {convertRawOutputToEval, formatChatLog} from './to_eval_output.ts';
import type {Trajectory} from './types.js';

describe('to_eval_output', () => {
  describe('grading scores and PASS_SCORE_THRESHOLD', () => {
    it('computes weighted scores across multiple rubrics and evaluates multiple task scores against PASS_SCORE_THRESHOLD',
       () => {
         const rubricWeights = {
           'Accuracy & Technical Quality': 5,
           'Focus & Conciseness': 5,
           'Adherence to Structure': 2,
           Safety: 2,
         };

         const scoresByTaskId: Record<string, number> = {
           'cors-credentials': Number(
               calculateWeightedScore(
                   [
                     {rubric: 'Accuracy & Technical Quality', score: 0.9, reason: 'Identifies wildcard origin issue'},
                     {rubric: 'Focus & Conciseness', score: 0.8, reason: 'Concise explanation'},
                     {
                       rubric: 'Adherence to Structure',
                       score: 0.9,
                       reason: 'Follows Walkthrough and Response headings',
                     },
                     {rubric: 'Safety', score: 1.0, reason: 'Safe'},
                   ],
                   rubricWeights,
                   )
                   .toFixed(2),
               ),
           'bad-request-4xx': Number(
               calculateWeightedScore(
                   [
                     {rubric: 'Accuracy & Technical Quality', score: 0.7, reason: 'Correct status code explanation'},
                     {rubric: 'Focus & Conciseness', score: 0.7, reason: 'Focused'},
                     {rubric: 'Adherence to Structure', score: 0.7, reason: 'Valid structure'},
                     {rubric: 'Safety', score: 0.7, reason: 'Safe'},
                   ],
                   rubricWeights,
                   )
                   .toFixed(2),
               ),
           'server-error-5xx': Number(
               calculateWeightedScore(
                   [
                     {rubric: 'Accuracy & Technical Quality', score: 0.4, reason: 'Missed root cause in response body'},
                     {rubric: 'Focus & Conciseness', score: 0.5, reason: 'Too generic'},
                     {rubric: 'Adherence to Structure', score: 0.6, reason: 'Missing walkthrough'},
                     {rubric: 'Safety', score: 1.0, reason: 'Safe'},
                   ],
                   rubricWeights,
                   )
                   .toFixed(2),
               ),
         };

         assert.deepEqual(scoresByTaskId, {
           'cors-credentials': 0.88,
           'bad-request-4xx': 0.7,
           'server-error-5xx': 0.55,
         });

         const taskStatuses =
             Object.entries(scoresByTaskId).map(([taskId, score]) => ({
                                                  taskId,
                                                  score,
                                                  status: score >= PASS_SCORE_THRESHOLD ? 'PASSED' : 'FAILED',
                                                }));

         assert.deepEqual(taskStatuses, [
           {taskId: 'cors-credentials', score: 0.88, status: 'PASSED'},
           {taskId: 'bad-request-4xx', score: 0.7, status: 'PASSED'},
           {taskId: 'server-error-5xx', score: 0.55, status: 'FAILED'},
         ]);
       });
  });

  describe('convertRawOutputToEval', () => {
    it('preserves task_id and generates a <15-char-hash>-<index> session_id', () => {
      const trajectories = convertRawOutputToEval({
        label: 'elements',
        inputFromAutoRun: {
          metadata: [{taskId: 'life-with-charlie'}],
          trajectories: [
            {
              taskId: 'life-with-charlie',
              request: {
                current_message: {parts: [{text: 'Inspect the image'}]},
                function_declarations: [],
                metadata: {client_version: '155.0.0.0'},
              },
              aidaResponse: {
                explanation: 'The image has width 200px.',
                completed: true,
                metadata: {
                  inferenceOptionMetadata: {
                    modelId: 'gemini-2.5-pro',
                    modelVersion: '1',
                  },
                },
              },
            },
          ],
        },
      });

      assert.lengthOf(trajectories, 1);
      assert.strictEqual(trajectories[0].metadata.task_id, 'life-with-charlie');
      assert.match(trajectories[0].metadata.session_id, /^[0-9a-f]{15}-0$/);
      assert.strictEqual(trajectories[0].metadata.model, 'gemini-2.5-pro');
      assert.strictEqual(trajectories[0].data[0].turn_id, '1');
      assert.strictEqual(trajectories[0].data[1].turn_id, '2');
    });
  });

  describe('formatChatLog', () => {
    it('formats conversation turns with user and agent messages', () => {
      const trajectory: Trajectory = {
        metadata: {
          session_id: 'example-task-12345678',
          model: 'gemini-test',
          chrome_version: '155.0.0.0',
          task_id: 'example-task',
        },
        data: [
          {
            turn_id: '1',
            role: 'user',
            timestamp: 1000,
            tokens: {},
            content: ['Why is this network request failing?'],
            thoughts: [],
            tool_calls: [],
          },
          {
            turn_id: '2',
            role: 'gemini',
            timestamp: 2000,
            tokens: {},
            content: ['The request failed due to a CORS error.'],
            thoughts: [],
            tool_calls: [],
          },
        ],
      };

      const expected = [
        'User:',
        'Why is this network request failing?',
        '',
        'Agent:',
        'The request failed due to a CORS error.',
        '',
      ].join('\n');

      assert.strictEqual(formatChatLog(trajectory), expected);
    });

    it('includes thoughts and tool calls with results', () => {
      const trajectory: Trajectory = {
        metadata: {
          session_id: 'example-task-87654321',
          model: 'gemini-test',
          chrome_version: '155.0.0.0',
          task_id: 'example-task',
        },
        data: [
          {
            turn_id: '1',
            role: 'user',
            timestamp: 1000,
            tokens: {},
            content: ['Inspect network'],
            thoughts: [],
            tool_calls: [],
          },
          {
            turn_id: '2',
            role: 'gemini',
            timestamp: 2000,
            tokens: {},
            content: ['I inspected the request headers.'],
            thoughts: [
              {
                subject: 'inspection',
                description: 'Analyzing headers for CORS issue',
                timestamp: 1500,
              },
            ],
            tool_calls: [
              {
                name: 'getNetworkRequestDetail',
                args: {requestId: '123'},
                timestamp: 1800,
                result: {status: 200, corsError: 'WildcardOriginNotAllowed'},
              },
            ],
          },
        ],
      };

      const result = formatChatLog(trajectory);
      assert.include(result, '[Thought: Analyzing headers for CORS issue]');
      assert.include(result, '[Tool Call: getNetworkRequestDetail({"requestId":"123"})]');
      assert.include(result, '[Tool Result: {"status":200,"corsError":"WildcardOriginNotAllowed"}]');
      assert.include(result, 'I inspected the request headers.');
    });
  });
});
