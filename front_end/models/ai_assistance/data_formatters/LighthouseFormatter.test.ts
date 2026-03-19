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

  it('formats table details', function() {
    const tableReport = {
      ...report,
      categories: {
        performance: {
          title: 'Performance',
          score: 0.5,
          auditRefs: [{id: 'table-audit', score: 0.5, weight: 1}],
        },
      },
      audits: {
        'table-audit': {
          id: 'table-audit',
          title: 'Table Audit',
          description: 'Audit with a table',
          score: 0.5,
          details: {
            type: 'table',
            headings: [
              {key: 'url', label: 'URL', valueType: 'url'},
              {key: 'wastedBytes', label: 'Wasted Bytes', valueType: 'bytes'},
              {key: 'node', label: 'Node', valueType: 'node'},
              {key: 'location', label: 'Location', valueType: 'source-location'},
            ],
            items: [
              {
                url: 'https://example.com/script.js',
                wastedBytes: 1024,
                node: {type: 'node', nodeLabel: 'div.main', path: '1,HTML,1,BODY,5,DIV'},
                location: {type: 'source-location', url: 'https://example.com/script.js', line: 10, column: 5},
              },
              {
                url: 'https://example.com/style.css',
                wastedBytes: 512,
                node: {type: 'node', selector: 'body > p', path: '1,HTML,1,BODY,10,P'},
                location: {type: 'source-location', url: 'https://example.com/style.css'},
              },
            ],
          },
        },
      },
    } as unknown as ReportJSON;
    const formatter = new AiAssistance.LighthouseFormatter.LighthouseFormatter();
    const output = formatter.audits(tableReport, 'performance');
    snapshotTester.assert(this, output);
  });

  it('formats opportunity details', function() {
    const opportunityReport = {
      ...report,
      categories: {
        performance: {
          title: 'Performance',
          score: 0.5,
          auditRefs: [{id: 'opportunity-audit', score: 0.5, weight: 1}],
        },
      },
      audits: {
        'opportunity-audit': {
          id: 'opportunity-audit',
          title: 'Opportunity Audit',
          description: 'Audit with an opportunity',
          score: 0.5,
          details: {
            type: 'opportunity',
            overallSavingsMs: 500,
            overallSavingsBytes: 2048,
            headings: [
              {key: 'url', label: 'URL', valueType: 'url'},
              {key: 'wastedBytes', label: 'Wasted Bytes', valueType: 'bytes'},
            ],
            items: [
              {
                url: 'https://example.com/large-script.js',
                wastedBytes: 2048,
              },
            ],
          },
        },
      },
    } as unknown as ReportJSON;
    const formatter = new AiAssistance.LighthouseFormatter.LighthouseFormatter();
    const output = formatter.audits(opportunityReport, 'performance');
    snapshotTester.assert(this, output);
  });

  it('formats table details with summary', function() {
    const summaryReport = {
      ...report,
      categories: {
        performance: {
          title: 'Performance',
          score: 0.5,
          auditRefs: [{id: 'summary-audit', score: 0.5, weight: 1}],
        },
      },
      audits: {
        'summary-audit': {
          id: 'summary-audit',
          title: 'Summary Audit',
          description: 'Audit with a table summary',
          score: 0.5,
          details: {
            type: 'table',
            summary: {
              wastedMs: 100,
              wastedBytes: 512,
            },
            headings: [
              {key: 'text', label: 'Text', valueType: 'text'},
            ],
            items: [
              {text: 'Some detail'},
            ],
          },
        },
      },
    } as unknown as ReportJSON;
    const formatter = new AiAssistance.LighthouseFormatter.LighthouseFormatter();
    const output = formatter.audits(summaryReport, 'performance');
    snapshotTester.assert(this, output);
  });

  it('formats landmark-one-main audit with node explanation', function() {
    const reportWithLandmark = {
      ...report,
      categories: {
        accessibility: {
          title: 'Accessibility',
          score: 0.5,
          auditRefs: [{id: 'landmark-one-main', score: 0, weight: 1}],
        },
      },
      audits: {
        'landmark-one-main': {
          id: 'landmark-one-main',
          title: 'Document does not have a main landmark.',
          description:
              'One main landmark helps screen reader users navigate a web page. [Learn more about landmarks](https://dequeuniversity.com/rules/axe/4.11/landmark-one-main).',
          score: 0,
          scoreDisplayMode: 'binary',
          details: {
            type: 'table',
            headings: [
              {
                key: 'node',
                valueType: 'node',
                subItemsHeading: {
                  key: 'relatedNode',
                  valueType: 'node',
                },
                label: 'Failing Elements',
              },
            ],
            items: [
              {
                node: {
                  type: 'node',
                  path: '1,HTML',
                  selector: 'html',
                  boundingRect: {
                    top: 0,
                    bottom: 1564,
                    left: 0,
                    right: 412,
                    width: 412,
                    height: 1564,
                  },
                  snippet: '<html lang="not-a-real-language">',
                  nodeLabel: 'html',
                  explanation: 'Fix all of the following:\n  Document does not have a main landmark',
                },
              },
            ],
          },
        },
      },
    } as unknown as ReportJSON;
    const formatter = new AiAssistance.LighthouseFormatter.LighthouseFormatter();
    const output = formatter.audits(reportWithLandmark, 'accessibility');
    snapshotTester.assert(this, output);
  });
});
