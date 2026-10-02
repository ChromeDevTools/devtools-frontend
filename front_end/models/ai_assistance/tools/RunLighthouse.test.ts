// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import {assertIsContext, assertIsError} from '../../../testing/AiAssistanceHelpers.js';
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
        categoryId: 'accessibility',
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
        categoryId: 'accessibility',
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
      const context: AiAssistance.Tool.BaseToolCapability&AiAssistance.Tool.LighthouseRecordingCapability = {
        runLighthouse: recordingStub,
      };

      const result =
          await tool.handler({explanation: 're-audit', categoryId: 'accessibility', mode: 'snapshot'}, context);
      assertIsContext(result);
      assert.instanceOf(result.context, AiAssistance.LighthouseContext.LighthouseContext);
      assert.strictEqual(result.context.getItem(), mockReport);
      assert.strictEqual(result.description, 'Lighthouse audit completed');
      assert.isUndefined(result.widgets);
      sinon.assert.calledOnceWithExactly(recordingStub, {
        mode: 'snapshot',
        categoryIds: ['accessibility'],
        isAIControlled: true,
      });
    });

    it('runs audits across all categories when categoryId is "all"', async () => {
      const recordingStub = sinon.stub().resolves(mockReport);
      const context: AiAssistance.Tool.BaseToolCapability&AiAssistance.Tool.LighthouseRecordingCapability = {
        runLighthouse: recordingStub,
      };

      const result = await tool.handler({explanation: 'full audit', categoryId: 'all', mode: 'navigation'}, context);
      assertIsContext(result);
      assert.instanceOf(result.context, AiAssistance.LighthouseContext.LighthouseContext);
      assert.strictEqual(result.context.getItem(), mockReport);
      assert.strictEqual(result.description, 'Lighthouse audit completed');
      assert.isUndefined(result.widgets);
      sinon.assert.calledOnceWithExactly(recordingStub, {
        mode: 'navigation',
        categoryIds: undefined,
        isAIControlled: true,
      });
    });

    it('defaults to snapshot mode when mode is omitted', async () => {
      const recordingStub = sinon.stub().resolves(mockReport);
      const context: AiAssistance.Tool.BaseToolCapability&AiAssistance.Tool.LighthouseRecordingCapability = {
        runLighthouse: recordingStub,
      };

      const result = await tool.handler({explanation: 're-audit', categoryId: 'accessibility'}, context);
      assertIsContext(result);
      assert.instanceOf(result.context, AiAssistance.LighthouseContext.LighthouseContext);
      assert.strictEqual(result.context.getItem(), mockReport);
      assert.strictEqual(result.description, 'Lighthouse audit completed');
      assert.isUndefined(result.widgets);
      sinon.assert.calledOnceWithExactly(recordingStub, {
        mode: 'snapshot',
        categoryIds: ['accessibility'],
        isAIControlled: true,
      });
    });

    it('returns error when runLighthouse returns null', async () => {
      const recordingStub = sinon.stub().resolves(null);
      const context: AiAssistance.Tool.BaseToolCapability&AiAssistance.Tool.LighthouseRecordingCapability = {
        runLighthouse: recordingStub,
      };
      const result = await tool.handler({explanation: 're-audit', categoryId: 'accessibility'}, context);
      assertIsError(result);
      assert.strictEqual(result.error, 'Error: Failed to record new audits.');
    });

    it('returns error when runLighthouse rejects', async () => {
      const recordingStub = sinon.stub().rejects(new Error('Navigation timed out'));
      const context: AiAssistance.Tool.BaseToolCapability&AiAssistance.Tool.LighthouseRecordingCapability = {
        runLighthouse: recordingStub,
      };
      const result = await tool.handler({explanation: 're-audit', categoryId: 'accessibility'}, context);
      assertIsError(result);
      assert.strictEqual(result.error, 'Error: Failed to record new audits: Navigation timed out');
    });
  });
});
