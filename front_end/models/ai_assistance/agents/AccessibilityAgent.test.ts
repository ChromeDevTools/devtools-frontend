// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {mockAidaClient} from '../../../testing/AiAssistanceHelpers.js';
import {describeWithMockConnection} from '../../../testing/MockConnection.js';
import type * as LHModel from '../../lighthouse/lighthouse.js';
import * as AiAssistance from '../ai_assistance.js';

describeWithMockConnection('AccessibilityAgent', () => {
  const mockReport = {
    lighthouseVersion: '1.0.0',
    userAgent: 'test user agent',
    fetchTime: '2026-03-12',
    timing: {total: 100},
    finalDisplayedUrl: 'https://example.com',
    artifacts: {Trace: {traceEvents: []}},
    audits: {},
    categories: {},
    categoryGroups: {},
  } satisfies LHModel.ReporterTypes.ReportJSON;

  it('generates an answer', async () => {
    const agent = new AiAssistance.AccessibilityAgent.AccessibilityAgent({
      aidaClient: mockAidaClient([[{
        explanation: 'This is the answer',
        metadata: {
          rpcGlobalId: 123,
        },
      }]]),
    });

    const responses = await Array.fromAsync(
        agent.run('test', {selected: new AiAssistance.AccessibilityAgent.AccessibilityContext(mockReport)}));
    assert.deepEqual(responses, [
      {
        type: AiAssistance.AiAgent.ResponseType.CONTEXT,
        details: [
          {
            title: 'Lighthouse report',
            text: '',
          },
        ],
      },
      {
        type: AiAssistance.AiAgent.ResponseType.QUERYING,
      },
      {
        type: AiAssistance.AiAgent.ResponseType.ANSWER,
        text: 'This is the answer',
        complete: true,
        suggestions: undefined,
        rpcId: 123,
      },
    ]);
  });
});
