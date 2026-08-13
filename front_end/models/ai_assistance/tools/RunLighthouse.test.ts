// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import {assertIsError, assertIsResult} from '../../../testing/AiAssistanceHelpers.js';
import type * as LHModel from '../../lighthouse/lighthouse.js';
import * as AiAssistance from '../ai_assistance.js';

describe('RunLighthouseTool', () => {
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

  const tool = new AiAssistance.RunLighthouse.RunLighthouseTool();

  describe('displayInfoFromArgs', () => {
    it('formats title, thought, and action with explicit mode', () => {
      const displayInfo = tool.displayInfoFromArgs({
        explanation: 'Testing color contrast after CSS change',
        category: 'accessibility',
        mode: 'navigation',
      });
      assert.deepEqual(displayInfo, {
        title: 'Running Lighthouse audits: accessibility (navigation)',
        thought: 'Testing color contrast after CSS change',
        action: 'runLighthouse(\'accessibility\', \'navigation\')',
      });
    });

    it('formats title, thought, and action defaulting to snapshot mode when mode is omitted', () => {
      const displayInfo = tool.displayInfoFromArgs({
        explanation: 'Testing in-page fix',
        category: 'accessibility',
      });
      assert.deepEqual(displayInfo, {
        title: 'Running Lighthouse audits: accessibility (snapshot)',
        thought: 'Testing in-page fix',
        action: 'runLighthouse(\'accessibility\', \'snapshot\')',
      });
    });
  });

  describe('handler', () => {
    it('runs dynamic audits for a specified category and mode', async () => {
      const recordingStub = sinon.stub().resolves(mockReport);
      const context = {
        conversationContext: null,
        lighthouseRecording: recordingStub,
      };

      const result =
          await tool.handler({explanation: 're-audit', category: 'accessibility', mode: 'snapshot'}, context);
      assertIsResult(result);
      assert.include(result.result.audits, '# Audits for Accessibility');
      assert.include(result.result.audits, 'Low contrast');
      assert.include(result.result.audits, '- **Low contrast**: 0');
      assert.deepEqual(result.widgets, [{name: 'LIGHTHOUSE_REPORT', data: {report: mockReport, snapshotReport: true}}]);
      sinon.assert.calledOnceWithExactly(recordingStub, {
        mode: 'snapshot',
        categoryIds: ['accessibility'],
        isAIControlled: true,
      });
    });

    it('defaults to snapshot mode when mode is omitted', async () => {
      const recordingStub = sinon.stub().resolves(mockReport);
      const context = {
        conversationContext: null,
        lighthouseRecording: recordingStub,
      };

      const result = await tool.handler({explanation: 're-audit', category: 'accessibility'}, context);
      assertIsResult(result);
      assert.deepEqual(result.widgets, [{name: 'LIGHTHOUSE_REPORT', data: {report: mockReport, snapshotReport: true}}]);
      sinon.assert.calledOnceWithExactly(recordingStub, {
        mode: 'snapshot',
        categoryIds: ['accessibility'],
        isAIControlled: true,
      });
    });

    it('sets snapshotReport to false when running in navigation mode', async () => {
      const recordingStub = sinon.stub().resolves(mockReport);
      const context = {
        conversationContext: null,
        lighthouseRecording: recordingStub,
      };

      const result =
          await tool.handler({explanation: 're-audit', category: 'accessibility', mode: 'navigation'}, context);
      assertIsResult(result);
      assert.deepEqual(result.widgets,
                       [{name: 'LIGHTHOUSE_REPORT', data: {report: mockReport, snapshotReport: false}}]);
      sinon.assert.calledOnceWithExactly(recordingStub, {
        mode: 'navigation',
        categoryIds: ['accessibility'],
        isAIControlled: true,
      });
    });

    it('returns error when lighthouseRecording capability is not available', async () => {
      const context = {
        conversationContext: null,
      };
      const result = await tool.handler({explanation: 're-audit', category: 'accessibility'}, context);
      assertIsError(result);
      assert.strictEqual(result.error, 'Error: Lighthouse recording capability is not available.');
    });

    it('returns error when lighthouseRecording returns null', async () => {
      const recordingStub = sinon.stub().resolves(null);
      const context = {
        conversationContext: null,
        lighthouseRecording: recordingStub,
      };
      const result = await tool.handler({explanation: 're-audit', category: 'accessibility'}, context);
      assertIsError(result);
      assert.strictEqual(result.error, 'Error: Failed to record new audits.');
    });

    it('returns error when lighthouseRecording rejects', async () => {
      const recordingStub = sinon.stub().rejects(new Error('Navigation timed out'));
      const context = {
        conversationContext: null,
        lighthouseRecording: recordingStub,
      };
      const result = await tool.handler({explanation: 're-audit', category: 'accessibility'}, context);
      assertIsError(result);
      assert.strictEqual(result.error, 'Error: Failed to record new audits: Navigation timed out');
    });
  });
});
