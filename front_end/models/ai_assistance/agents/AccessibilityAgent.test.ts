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
    audits: {
      'first-audit': {
        id: 'first-audit',
        title: 'First Audit',
        description: 'Description of first audit',
        score: 0.8,
        displayValue: '1.2s',
      },
      'accessibility-audit': {
        id: 'accessibility-audit',
        title: 'Accessibility Audit',
        description: 'Description of accessibility audit',
        score: 0.5,
        displayValue: 'Fail',
      },
    },
    categories: {
      performance: {
        title: 'Performance',
        score: 0.8,
        auditRefs: [{id: 'first-audit', score: 0.8, weight: 1}],
      },
      accessibility: {
        title: 'Accessibility',
        score: 0.5,
        auditRefs: [{id: 'accessibility-audit', score: 0.5, weight: 1}],
      },
    },
    categoryGroups: {},
  } as unknown as LHModel.ReporterTypes.ReportJSON;

  it('generates an answer', async () => {
    const aidaClient = mockAidaClient([[{
      explanation: 'This is the answer',
      metadata: {
        rpcGlobalId: 123,
      },
    }]]);
    const agent = new AiAssistance.AccessibilityAgent.AccessibilityAgent({
      aidaClient,
    });

    const responses = await Array.fromAsync(
        agent.run('test', {selected: new AiAssistance.AccessibilityAgent.AccessibilityContext(mockReport)}));

    assert.deepEqual(responses, [
      {
        type: AiAssistance.AiAgent.ResponseType.CONTEXT,
        details: [
          {
            title: 'Lighthouse report',
            text:
                '# Lighthouse Report Summary\nURL: https://example.com\nFetch Time: 2026-03-12\nLighthouse Version: 1.0.0\n\n## Category Scores\n- Performance: 80\n- Accessibility: 50',
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

    const call = aidaClient.doConversation.getCall(0);
    assert.exists(call);
    const request = call.args[0];
    const text = (request.current_message.parts[0] as {text: string}).text;
    assert.include(text, '# Lighthouse Report');
    assert.include(text, '# Audits for Accessibility');
    assert.include(text, '**Accessibility Audit**: 50 (Fail)');
  });
});
