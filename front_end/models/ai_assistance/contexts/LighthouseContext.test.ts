// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as SDK from '../../../core/sdk/sdk.js';
import {updateHostConfig} from '../../../testing/EnvironmentHelpers.js';
import {setupRuntimeHooks} from '../../../testing/RuntimeHelpers.js';
import {SnapshotTester} from '../../../testing/SnapshotTester.js';
import type * as LHModel from '../../lighthouse/lighthouse.js';
import * as AiAssistance from '../ai_assistance.js';

describe('LighthouseContext', function() {
  setupRuntimeHooks();

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

  const multiCategoryReport = {
    finalDisplayedUrl: 'https://example.com',
    categories: {
      accessibility: {
        title: 'Accessibility',
        score: 0.8,
        auditRefs: [{id: 'color-contrast', weight: 1}],
      },
      performance: {
        title: 'Performance',
        score: 0.9,
        auditRefs: [{id: 'first-contentful-paint', weight: 1}],
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
      'first-contentful-paint': {
        id: 'first-contentful-paint',
        score: 0.5,
        title: 'First Contentful Paint',
        description: 'Keep FCP fast.',
        details: {type: 'opportunity', items: []},
      },
    },
  } as unknown as LHModel.ReporterTypes.ReportJSON;

  const failedReport = {
    finalDisplayedUrl: 'https://example.com',
    categories: {
      accessibility: {
        title: 'Accessibility',
        score: null,
        auditRefs: [],
      },
      performance: {
        title: 'Performance',
        score: null,
        auditRefs: [],
      },
    },
    audits: {},
  } as unknown as LHModel.ReporterTypes.ReportJSON;

  const criticalPayload =
      '**CRITICAL**: The Lighthouse report failed to record or all category scores are error/unavailable (n/a). This indicates a failed run or missing data.';

  it('should return origin, item, and title correctly', () => {
    const context = new AiAssistance.LighthouseContext.LighthouseContext(mockReport);

    assert.isTrue(
        context.getOrigin().isSameOriginWith(SDK.SecurityOrigin.SecurityOrigin.create('https://example.com')));
    assert.strictEqual(context.getItem(), mockReport);
    assert.strictEqual(context.getTitle(), 'Lighthouse report: https://example.com');
  });

  it('should return prompt details correctly', async function() {
    const context = new AiAssistance.LighthouseContext.LighthouseContext(mockReport);

    const promptDetails = await context.getPromptDetails();
    assert.exists(promptDetails);
    snapshotTester.assert(this, promptDetails);
  });

  it('should return user facing details correctly', async function() {
    const context = new AiAssistance.LighthouseContext.LighthouseContext(mockReport);

    const details = await context.getUserFacingDetails();
    assert.exists(details);
    snapshotTester.assert(this, JSON.stringify(details, null, 2));
  });

  it('should return LIGHTHOUSE_REPORT widget in getWidgets', async () => {
    const context = new AiAssistance.LighthouseContext.LighthouseContext(mockReport);

    const widgets = await context.getWidgets();
    assert.deepEqual(widgets, [
      {
        name: 'LIGHTHOUSE_REPORT',
        data: {
          report: mockReport,
        },
      },
    ]);
  });

  it('does not add snapshotReport to the LIGHTHOUSE_REPORT widget for snapshot mode reports', async () => {
    const snapshotReport = {...mockReport, gatherMode: 'snapshot'} satisfies LHModel.ReporterTypes.ReportJSON;
    const context = new AiAssistance.LighthouseContext.LighthouseContext(snapshotReport);

    const widgets = await context.getWidgets();
    assert.deepEqual(widgets, [
      {
        name: 'LIGHTHOUSE_REPORT',
        data: {
          report: snapshotReport,
        },
      },
    ]);
  });

  it('includes only the accessibility audits when the report has multiple categories', async () => {
    const context = new AiAssistance.LighthouseContext.LighthouseContext(multiCategoryReport);

    const details = await context.getPromptDetails();
    assert.exists(details);
    assert.include(details, '- Performance: 90');
    assert.include(details, 'Audits for Accessibility');
    assert.include(details, 'Low contrast');
    assert.notInclude(details, 'Audits for Performance');
    assert.notInclude(details, 'First Contentful Paint');
  });

  it('returns critical error payload when all category scores are null', async () => {
    const context = new AiAssistance.LighthouseContext.LighthouseContext(failedReport);

    const details = await context.getPromptDetails();
    assert.strictEqual(details, criticalPayload);
  });

  describe('with AI V2 architecture enabled', () => {
    beforeEach(() => {
      updateHostConfig({devToolsAiV2Architecture: {enabled: true}});
    });

    it('returns only the report summary as prompt details', async function() {
      const context = new AiAssistance.LighthouseContext.LighthouseContext(mockReport);

      const promptDetails = await context.getPromptDetails();
      assert.exists(promptDetails);
      snapshotTester.assert(this, promptDetails);
    });

    it('returns the report summary as user facing details', async function() {
      const context = new AiAssistance.LighthouseContext.LighthouseContext(mockReport);

      const details = await context.getUserFacingDetails();
      assert.exists(details);
      snapshotTester.assert(this, JSON.stringify(details, null, 2));
    });

    it('includes every category score and failing audit title but no audit details for multiple categories',
       async () => {
         const context = new AiAssistance.LighthouseContext.LighthouseContext(multiCategoryReport);

         const details = await context.getPromptDetails();
         assert.exists(details);
         assert.include(details, '- Accessibility: 80');
         assert.include(details, '- Performance: 90');
         assert.include(details, '### Accessibility (categoryId: "accessibility")\n- Low contrast: 0');
         assert.include(details, '### Performance (categoryId: "performance")\n- First Contentful Paint: 50');
         assert.notInclude(details, 'Audits for');
         assert.notInclude(details, 'Fix color contrast.');
       });

    it('returns critical error payload when all category scores are null', async () => {
      const context = new AiAssistance.LighthouseContext.LighthouseContext(failedReport);

      const details = await context.getPromptDetails();
      assert.strictEqual(details, criticalPayload);
    });

    it('marks the LIGHTHOUSE_REPORT widget as a snapshot report for snapshot mode reports', async () => {
      const snapshotReport = {...mockReport, gatherMode: 'snapshot'} satisfies LHModel.ReporterTypes.ReportJSON;
      const context = new AiAssistance.LighthouseContext.LighthouseContext(snapshotReport);

      const widgets = await context.getWidgets();
      assert.deepEqual(widgets, [
        {
          name: 'LIGHTHOUSE_REPORT',
          data: {
            report: snapshotReport,
            snapshotReport: true,
          },
        },
      ]);
    });

    it('does not mark the LIGHTHOUSE_REPORT widget as a snapshot report for navigation mode reports', async () => {
      const navigationReport = {...mockReport, gatherMode: 'navigation'} satisfies LHModel.ReporterTypes.ReportJSON;
      const context = new AiAssistance.LighthouseContext.LighthouseContext(navigationReport);

      const widgets = await context.getWidgets();
      assert.deepEqual(widgets, [
        {
          name: 'LIGHTHOUSE_REPORT',
          data: {
            report: navigationReport,
            snapshotReport: false,
          },
        },
      ]);
    });
  });
});
