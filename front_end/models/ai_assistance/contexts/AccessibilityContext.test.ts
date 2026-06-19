// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {SnapshotTester} from '../../../testing/SnapshotTester.js';
import type * as LHModel from '../../lighthouse/lighthouse.js';
import * as AiAssistance from '../ai_assistance.js';

describe('AccessibilityContext', function() {
  const snapshotTester = new SnapshotTester(this, import.meta);

  const mockReport = {
    lighthouseVersion: '1.0.0',
    userAgent: 'test user agent',
    fetchTime: '2026-03-12',
    timing: {total: 100},
    finalDisplayedUrl: 'https://example.com',
    artifacts: {Trace: {traceEvents: []}},
    audits: {
      'accessibility-audit': {
        id: 'accessibility-audit',
        title: 'Accessibility Audit',
        description: 'Description of accessibility audit',
        score: 0.5,
        displayValue: 'Fail',
      },
    },
    categories: {
      accessibility: {
        title: 'Accessibility',
        score: 0.5,
        auditRefs: [{id: 'accessibility-audit', score: 0.5, weight: 1}],
      },
    },
    categoryGroups: {},
  } as unknown as LHModel.ReporterTypes.ReportJSON;

  it('should return URL, item, and title correctly', () => {
    const context = new AiAssistance.AccessibilityContext.AccessibilityContext(mockReport);

    assert.strictEqual(context.getURL(), 'https://example.com');
    assert.strictEqual(context.getItem(), mockReport);
    assert.strictEqual(context.getTitle(), 'Lighthouse report: https://example.com');
  });

  it('should return prompt details correctly', async function() {
    const context = new AiAssistance.AccessibilityContext.AccessibilityContext(mockReport);

    const promptDetails = await context.getPromptDetails();
    assert.exists(promptDetails);
    snapshotTester.assert(this, promptDetails);
  });

  it('should return user facing details correctly', async function() {
    const context = new AiAssistance.AccessibilityContext.AccessibilityContext(mockReport);

    const details = await context.getUserFacingDetails();
    assert.exists(details);
    snapshotTester.assert(this, JSON.stringify(details, null, 2));
  });
});
