// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {convertRawOutputToEval, formatChatLog} from './to_eval_output.ts';
import type {Trajectory} from './types.js';

describe('to_eval_output', () => {
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
