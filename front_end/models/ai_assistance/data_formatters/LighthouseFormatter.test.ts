// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {SnapshotTester} from '../../../testing/SnapshotTester.js';
import type {ReportJSON} from '../../lighthouse/LighthouseReporterTypes.js';
import * as AiAssistance from '../ai_assistance.js';

describe('LighthouseFormatter', function() {
  const snapshotTester = new SnapshotTester(this, import.meta);

  const report = {
    lighthouseVersion: '12.0.0',
    fetchTime: '2025-01-01T00:00:00.000Z',
    finalDisplayedUrl: 'https://example.com',
    categories: {
      performance: {
        title: 'Performance',
        score: 0.8,
        auditRefs: [{id: 'first-audit', score: 0.8, weight: 1}],
      },
      accessibility: {
        title: 'Accessibility',
        score: 1,
        auditRefs: [{id: 'second-audit', score: 1, weight: 1}],
      },
    },
    audits: {
      'first-audit': {
        id: 'first-audit',
        title: 'First Audit',
        description: 'Description of first audit',
        score: 0.8,
        displayValue: '1.2s',
      },
      'second-audit': {
        id: 'second-audit',
        title: 'Second Audit',
        description: 'Description of second audit',
        score: 1,
      },
    },
  } as unknown as ReportJSON;

  it('generates a summary', function() {
    const formatter = new AiAssistance.LighthouseFormatter.LighthouseFormatter();
    const output = formatter.summary(report);
    snapshotTester.assert(this, output);
  });

  it('generates audits for a category', function() {
    const formatter = new AiAssistance.LighthouseFormatter.LighthouseFormatter();
    const output = formatter.audits(report, 'performance');
    snapshotTester.assert(this, output);
  });

  it('indicates when all audits passed', function() {
    const formatter = new AiAssistance.LighthouseFormatter.LighthouseFormatter();
    const output = formatter.audits(report, 'accessibility');
    snapshotTester.assert(this, output);
  });

  it('handles missing category', function() {
    const formatter = new AiAssistance.LighthouseFormatter.LighthouseFormatter();
    const output = formatter.audits(report, 'seo');
    snapshotTester.assert(this, output);
  });
});
