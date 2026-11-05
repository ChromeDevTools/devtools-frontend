// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import {
  calculateTrajectoryToolCalls,
  TrajectoryBuilder,
} from './trajectory-builder.js';

describe('trajectory-builder', () => {
  describe('calculateTrajectoryToolCalls', () => {
    it('computes per-tool call frequency and error counts across multiple tools and repeated calls', () => {
      const builder = new TrajectoryBuilder({taskId: 'failing-request'});
      builder.addSteps([
        {
          request: {
            current_message: {parts: [{text: 'Why is this request failing?'}]},
            metadata: {client_version: '155.0.0.0'},
          },
          aidaResponse: {
            explanation: '',
            functionCalls: [
              {
                name: 'learnSkills',
                args: {skills: ['network', 'cors']},
              },
              {
                name: 'takeSnapshot',
                args: {},
              },
              {
                name: 'executeJavaScript',
                args: {title: 'Run script 1', explanation: 'Inspecting page state'},
              },
            ],
            completed: true,
            metadata: {
              inferenceOptionMetadata: {
                modelId: 'gemini-2.5-pro',
                modelVersion: '1',
              },
            },
          },
          requestTimestamp: 1700000001000000,
          responseTimestamp: 1700000002500000,
        },
        {
          request: {
            current_message: {
              parts: [
                {
                  functionResponse: {
                    name: 'learnSkills',
                    response: {result: {}},
                  },
                },
                {
                  functionResponse: {
                    name: 'takeSnapshot',
                    response: {result: {snapshot: 'ok'}},
                  },
                },
                {
                  functionResponse: {
                    name: 'executeJavaScript',
                    response: {error: 'ReferenceError', result: {}},
                  },
                },
              ],
            },
            metadata: {client_version: '155.0.0.0'},
          },
          aidaResponse: {
            explanation: '',
            functionCalls: [
              {
                name: 'executeJavaScript',
                args: {title: 'Run script 2', explanation: 'Retrying inspection'},
              },
              {
                name: 'executeJavaScript',
                args: {title: 'Run script 3', explanation: 'Checking response headers'},
              },
            ],
            completed: true,
            metadata: {
              inferenceOptionMetadata: {
                modelId: 'gemini-2.5-pro',
                modelVersion: '1',
              },
            },
          },
          requestTimestamp: 1700000003000000,
          responseTimestamp: 1700000004500000,
        },
        {
          request: {
            current_message: {
              parts: [
                {
                  functionResponse: {
                    name: 'executeJavaScript',
                    response: {result: {status: 401}},
                  },
                },
                {
                  functionResponse: {
                    name: 'executeJavaScript',
                    response: {result: {headers: {}}},
                  },
                },
              ],
            },
            metadata: {client_version: '155.0.0.0'},
          },
          aidaResponse: {
            explanation: 'Fixed.',
            completed: true,
            metadata: {
              inferenceOptionMetadata: {
                modelId: 'gemini-2.5-pro',
                modelVersion: '1',
              },
            },
          },
          requestTimestamp: 1700000005000000,
          responseTimestamp: 1700000006000000,
        },
      ]);

      const trajectory = builder.build();
      assert.deepEqual(calculateTrajectoryToolCalls(trajectory), {
        total: 5,
        byTool: {learnSkills: 1, takeSnapshot: 1, executeJavaScript: 3},
        failedByTool: {executeJavaScript: 1},
        activationsBySkill: {network: 1, cors: 1},
      });
    });
  });
});
