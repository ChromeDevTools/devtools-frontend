// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {assertIsError, assertIsResult} from '../../../testing/AiAssistanceHelpers.js';
import type * as LHModel from '../../lighthouse/lighthouse.js';
import * as AiAssistance from '../ai_assistance.js';

describe('GetLighthouseAuditsTool', () => {
  const mockReport = {
    finalDisplayedUrl: 'https://example.com',
    categories: {
      accessibility: {
        title: 'Accessibility',
        score: 0.8,
        auditRefs: [{id: 'color-contrast', weight: 1}],
      },
    },
    audits: {
      'color-contrast': {
        id: 'color-contrast',
        score: 0,
        title: 'Low contrast',
        description: 'Fix color contrast.',
        details: {type: 'opportunity', items: []},
      },
    },
  } as unknown as LHModel.ReporterTypes.ReportJSON;

  const tool = new AiAssistance.GetLighthouseAudits.GetLighthouseAuditsTool();
  const context = {
    conversationContext: new AiAssistance.AccessibilityContext.AccessibilityContext(mockReport),
  };

  it('returns formatted audits for a given category', async () => {
    const result = await tool.handler({categoryId: 'accessibility'}, context);
    assertIsResult(result);
    assert.include(result.result.audits, '# Audits for Accessibility');
    assert.include(result.result.audits, 'Low contrast');
    assert.include(result.result.audits, '- **Low contrast**: 0');
    assert.deepEqual(result.widgets, [{name: 'LIGHTHOUSE_REPORT', data: {report: mockReport}}]);
  });

  it('returns error when context is not AccessibilityContext', async () => {
    const invalidContext = {
      conversationContext: null,
    };
    const result = await tool.handler({categoryId: 'accessibility'}, invalidContext);
    assertIsError(result);
    assert.strictEqual(result.error, 'Error: Active context is not a Lighthouse report.');
  });

  it('returns category not found message when category does not exist', async () => {
    const result = await tool.handler({categoryId: 'performance'}, context);
    assertIsResult(result);
    assert.strictEqual(result.result.audits, 'Category "performance" not found.');
  });
});
