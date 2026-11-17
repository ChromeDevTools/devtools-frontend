// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import sinon from 'sinon';

import * as SDK from '../../../core/sdk/sdk.js';
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

    it('formats title, thought, and action defaulting to navigation mode for agentic-browsing when mode is omitted',
       () => {
         const displayInfo = tool.displayInfoFromArgs({
           explanation: 'Checking agent readiness',
           categoryId: 'agentic-browsing',
         });
         assert.deepEqual(displayInfo, {
           title: 'Running Lighthouse audits: agentic-browsing (navigation)',
           thought: 'Checking agent readiness',
           action: 'runLighthouse(\'agentic-browsing\', \'navigation\')',
         });
       });
  });

  describe('handler', () => {
    function createContext(
        runLighthouse: AiAssistance.Tool.LighthouseRecordingCapability['runLighthouse'],
        target: SDK.Target.Target|null = null,
        ): AiAssistance.Tool.BaseToolCapability&AiAssistance.Tool.LighthouseRecordingCapability&
        AiAssistance.Tool.TargetCapability {
      return {
        runLighthouse,
        getTarget: () => target,
      };
    }

    it('runs dynamic audits for a specified category and mode', async () => {
      const recordingStub = sinon.stub().resolves({status: 'completed', report: mockReport});

      const result = await tool.handler({explanation: 're-audit', categoryId: 'accessibility', mode: 'snapshot'},
                                        createContext(recordingStub));
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
      const recordingStub = sinon.stub().resolves({status: 'completed', report: mockReport});

      const result = await tool.handler({explanation: 'full audit', categoryId: 'all', mode: 'navigation'},
                                        createContext(recordingStub));
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
      const recordingStub = sinon.stub().resolves({status: 'completed', report: mockReport});

      const result =
          await tool.handler({explanation: 're-audit', categoryId: 'accessibility'}, createContext(recordingStub));
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

    it('defaults to navigation mode for agentic-browsing when mode is omitted', async () => {
      const recordingStub = sinon.stub().resolves({status: 'completed', report: mockReport});

      const result = await tool.handler({explanation: 'agentic browsing audit', categoryId: 'agentic-browsing'},
                                        createContext(recordingStub));
      assertIsContext(result);
      sinon.assert.calledOnceWithExactly(recordingStub, {
        mode: 'navigation',
        categoryIds: ['agentic-browsing'],
        isAIControlled: true,
      });
    });

    it('returns error when the run fails', async () => {
      const recordingStub = sinon.stub().resolves({status: 'failed'});
      const result =
          await tool.handler({explanation: 're-audit', categoryId: 'accessibility'}, createContext(recordingStub));
      assertIsError(result);
      assert.strictEqual(result.error, 'Error: Failed to record new audits.');
    });

    it('tells the model not to retry when the user cancels the run', async () => {
      const recordingStub = sinon.stub().resolves({status: 'cancelled'});
      const result =
          await tool.handler({explanation: 're-audit', categoryId: 'accessibility'}, createContext(recordingStub));
      assertIsError(result);
      assert.strictEqual(result.error,
                         'The user cancelled the Lighthouse audit. Do not run it again unless the user asks you to.');
    });

    it('returns error when runLighthouse rejects', async () => {
      const recordingStub = sinon.stub().rejects(new Error('Navigation timed out'));
      const result =
          await tool.handler({explanation: 're-audit', categoryId: 'accessibility'}, createContext(recordingStub));
      assertIsError(result);
      assert.strictEqual(result.error, 'Error: Failed to record new audits: Navigation timed out');
    });

    it('returns error without running Lighthouse when category does not support the requested mode', async () => {
      const recordingStub = sinon.stub().resolves({status: 'completed', report: mockReport});
      const result =
          await tool.handler({explanation: 'interaction audit', categoryId: 'agentic-browsing', mode: 'timespan'},
                             createContext(recordingStub));
      assertIsError(result);
      assert.strictEqual(
          result.error,
          'Error: Category "agentic-browsing" does not support "timespan" mode. Supported modes: navigation, snapshot.');
      sinon.assert.notCalled(recordingStub);
    });

    it('returns error ahead of mode validation when JavaScript execution is paused on a breakpoint', async () => {
      const recordingStub = sinon.stub().resolves({status: 'completed', report: mockReport});
      const target = sinon.createStubInstance(SDK.Target.Target);
      const debuggerModel = sinon.createStubInstance(SDK.DebuggerModel.DebuggerModel);
      debuggerModel.isPaused.returns(true);
      target.model.withArgs(SDK.DebuggerModel.DebuggerModel).returns(debuggerModel);

      const result = await tool.handler({explanation: 're-audit', categoryId: 'agentic-browsing', mode: 'timespan'},
                                        createContext(recordingStub, target));
      assertIsError(result);
      assert.strictEqual(
          result.error,
          'Error: Cannot run Lighthouse because JavaScript execution is paused on a breakpoint. Do not retry; ask the user to resume execution in the Sources panel first.');
      sinon.assert.notCalled(recordingStub);
    });

    it('proceeds to run Lighthouse when the debugger is not paused', async () => {
      const recordingStub = sinon.stub().resolves({status: 'completed', report: mockReport});
      const target = sinon.createStubInstance(SDK.Target.Target);
      const debuggerModel = sinon.createStubInstance(SDK.DebuggerModel.DebuggerModel);
      debuggerModel.isPaused.returns(false);
      target.model.withArgs(SDK.DebuggerModel.DebuggerModel).returns(debuggerModel);

      const result = await tool.handler({explanation: 're-audit', categoryId: 'accessibility', mode: 'snapshot'},
                                        createContext(recordingStub, target));
      assertIsContext(result);
      assert.instanceOf(result.context, AiAssistance.LighthouseContext.LighthouseContext);
      assert.strictEqual(result.context.getItem(), mockReport);
      sinon.assert.calledOnceWithExactly(recordingStub, {
        mode: 'snapshot',
        categoryIds: ['accessibility'],
        isAIControlled: true,
      });
    });
  });
});
