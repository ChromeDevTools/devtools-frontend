// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {after, afterEach, beforeEach, describe, it} from 'mocha';

import * as Platform from '../../core/platform/platform.js';
import * as PublicExtensions from '../../models/extensions/extensions.js';
import {doubleRaf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {
  describeWithEnvironment,
  setupActionRegistry,
} from '../../testing/EnvironmentHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Models from './models/models.js';
import {RecorderActions} from './recorder-actions/recorder-actions.js';
import {RecorderPanel, type RecordingView, StepView} from './recorder.js';

describeWithEnvironment('RecorderPanel', () => {
  setupActionRegistry();

  let panel: RecorderPanel.RecorderPanel|null = null;

  afterEach(async () => {
    if (panel) {
      panel.detach();
      await doubleRaf();
      panel = null;
    }
  });

  function makeRecording(): Models.RecordingStorage.StoredRecording {
    const step = {
      type: Models.Schema.StepType.Navigate as const,
      url: 'https://example.com',
    };
    const recording = {
      storageName: 'test',
      flow: {title: 'test', steps: [step]},
    };
    return recording;
  }

  async function setupPanel(
      recording: Models.RecordingStorage.StoredRecording,
      ): Promise<RecorderPanel.RecorderPanel> {
    panel = new RecorderPanel.RecorderPanel();
    panel.setCurrentPageForTesting(RecorderPanel.Pages.RECORDING_PAGE);
    panel.setCurrentRecordingForTesting(recording);
    renderElementIntoDOM(panel);
    await panel.updateComplete;
    await doubleRaf();
    return panel;
  }

  describe('Visual logging', () => {
    it('should set the panel visual logging context on the root element', async () => {
      panel = new RecorderPanel.RecorderPanel();
      renderElementIntoDOM(panel);
      await panel.updateComplete;
      assert.strictEqual(panel.element.getAttribute('jslog'), 'Panel; context: chrome-recorder; track: resize');
    });
  });

  describe('Navigation', () => {
    it('should return back to the previous page if recording was cancelled', async () => {
      const previousPage = RecorderPanel.Pages.ALL_RECORDINGS_PAGE;
      panel = new RecorderPanel.RecorderPanel();
      panel.setCurrentPageForTesting(previousPage);
      panel.setCurrentPageForTesting(
          RecorderPanel.Pages.CREATE_RECORDING_PAGE,
      );
      renderElementIntoDOM(panel);
      await panel.updateComplete;
      await doubleRaf();

      await panel.onRecordingCancelled();
      assert.strictEqual(panel.getCurrentPageForTesting(), previousPage);
    });
  });

  describe('StepView', () => {
    async function triggerRecordingViewCallback(panel: RecorderPanel.RecorderPanel,
                                                callbackName: 'onAddStep'|'onRemoveStep'|'onAddBreakpoint'|
                                                'onRemoveBreakpoint',
                                                ...args: any[]): Promise<void> {
      const recordingViewWidgetElement = panel.contentElement?.querySelector<HTMLElement>(
          '.recording-view',
      );
      if (!recordingViewWidgetElement) {
        throw new Error('Could not find RecordingView widget element');
      }
      const widget = UI.Widget.Widget.getOrCreateWidget(recordingViewWidgetElement) as RecordingView.RecordingView;
      await widget.updateComplete;
      const callback = widget[callbackName] as (...args: unknown[]) => void;
      callback?.(...args);
      await panel.updateComplete;
    }

    beforeEach(() => {
      Models.RecordingStorage.RecordingStorage.instance().clearForTest();
    });

    after(() => {
      Models.RecordingStorage.RecordingStorage.instance().clearForTest();
    });

    it('should add a new step after a step', async () => {
      const recording = makeRecording();
      const panel = await setupPanel(recording);

      await triggerRecordingViewCallback(
          panel,
          'onAddStep',
          recording.flow.steps[0],
          StepView.AddStepPosition.AFTER,
      );

      const flow = panel.getUserFlow();
      assert.deepEqual(flow, {
        title: 'test',
        steps: [
          {
            type: Models.Schema.StepType.Navigate as const,
            url: 'https://example.com',
          },
          {
            type: Models.Schema.StepType.WaitForElement as const,
            selectors: ['body'],
          },
        ],
      });
    });

    it('should add a new step after a section', async () => {
      const recording = makeRecording();
      const panel = await setupPanel(recording);

      const sections = panel.getSectionsForTesting();
      if (!sections) {
        throw new Error('Panel is missing sections');
      }
      assert.lengthOf(sections, 1);
      await triggerRecordingViewCallback(
          panel,
          'onAddStep',
          sections[0],
          StepView.AddStepPosition.AFTER,
      );

      const flow = panel.getUserFlow();
      assert.deepEqual(flow, {
        title: 'test',
        steps: [
          {
            type: Models.Schema.StepType.Navigate as const,
            url: 'https://example.com',
          },
          {
            type: Models.Schema.StepType.WaitForElement as const,
            selectors: ['body'],
          },
        ],
      });
    });

    it('should add a new step before a step', async () => {
      const recording = makeRecording();
      const panel = await setupPanel(recording);

      await triggerRecordingViewCallback(
          panel,
          'onAddStep',
          recording.flow.steps[0],
          StepView.AddStepPosition.BEFORE,
      );

      const flow = panel.getUserFlow();
      assert.deepEqual(flow, {
        title: 'test',
        steps: [
          {
            type: Models.Schema.StepType.WaitForElement as const,
            selectors: ['body'],
          },
          {
            type: Models.Schema.StepType.Navigate as const,
            url: 'https://example.com',
          },
        ],
      });
    });

    it('should delete a step', async () => {
      const recording = makeRecording();
      const panel = await setupPanel(recording);

      await triggerRecordingViewCallback(
          panel,
          'onRemoveStep',
          recording.flow.steps[0],
      );

      const flow = panel.getUserFlow();
      assert.deepEqual(flow, {title: 'test', steps: []});
    });

    it('should adding a new step before a step with a breakpoint update the breakpoint indexes correctly', async () => {
      const recording = makeRecording();
      const panel = await setupPanel(recording);
      const stepIndex = 3;

      await triggerRecordingViewCallback(
          panel,
          'onAddBreakpoint',
          stepIndex,
      );
      assert.deepEqual(panel.getStepBreakpointIndexesForTesting(), [
        stepIndex,
      ]);
      await triggerRecordingViewCallback(
          panel,
          'onAddStep',
          recording.flow.steps[0],
          StepView.AddStepPosition.BEFORE,
      );

      // Breakpoint index moves to the next index
      assert.deepEqual(panel.getStepBreakpointIndexesForTesting(), [
        stepIndex + 1,
      ]);
    });

    it('should removing a step before a step with a breakpoint update the breakpoint indexes correctly', async () => {
      const recording = makeRecording();
      const panel = await setupPanel(recording);
      const stepIndex = 3;

      await triggerRecordingViewCallback(
          panel,
          'onAddBreakpoint',
          stepIndex,
      );
      assert.deepEqual(panel.getStepBreakpointIndexesForTesting(), [
        stepIndex,
      ]);
      await triggerRecordingViewCallback(
          panel,
          'onRemoveStep',
          recording.flow.steps[0],
      );

      // Breakpoint index moves to the previous index
      assert.deepEqual(panel.getStepBreakpointIndexesForTesting(), [
        stepIndex - 1,
      ]);
    });

    it('should removing a step with a breakpoint remove the breakpoint index as well', async () => {
      const recording = makeRecording();
      const panel = await setupPanel(recording);
      const stepIndex = 0;

      await triggerRecordingViewCallback(
          panel,
          'onAddBreakpoint',
          stepIndex,
      );
      assert.deepEqual(panel.getStepBreakpointIndexesForTesting(), [
        stepIndex,
      ]);
      await triggerRecordingViewCallback(
          panel,
          'onRemoveStep',
          recording.flow.steps[stepIndex],
      );

      // Breakpoint index is removed
      assert.deepEqual(panel.getStepBreakpointIndexesForTesting(), []);
    });

    it('should "add breakpoint" event add a breakpoint', async () => {
      const recording = makeRecording();
      const panel = await setupPanel(recording);
      const stepIndex = 1;

      assert.deepEqual(panel.getStepBreakpointIndexesForTesting(), []);
      await triggerRecordingViewCallback(
          panel,
          'onAddBreakpoint',
          stepIndex,
      );

      assert.deepEqual(panel.getStepBreakpointIndexesForTesting(), [
        stepIndex,
      ]);
    });

    it('should "remove breakpoint" event remove a breakpoint', async () => {
      const recording = makeRecording();
      const panel = await setupPanel(recording);
      const stepIndex = 1;

      await triggerRecordingViewCallback(
          panel,
          'onAddBreakpoint',
          stepIndex,
      );
      assert.deepEqual(panel.getStepBreakpointIndexesForTesting(), [
        stepIndex,
      ]);
      await triggerRecordingViewCallback(
          panel,
          'onRemoveBreakpoint',
          stepIndex,
      );

      assert.deepEqual(panel.getStepBreakpointIndexesForTesting(), []);
    });
  });

  describe('Create new recording action', () => {
    it('should execute action', async () => {
      const recording = makeRecording();
      const panel = await setupPanel(recording);

      await panel.handleActions(RecorderActions.CREATE_RECORDING);

      assert.strictEqual(
          panel.getCurrentPageForTesting(),
          RecorderPanel.Pages.CREATE_RECORDING_PAGE,
      );
    });

    it('should not execute action while recording', async () => {
      const recording = makeRecording();
      const panel = await setupPanel(recording);

      panel.setIsRecordingStateForTesting(true);

      await panel.handleActions(RecorderActions.CREATE_RECORDING);

      assert.strictEqual(
          panel.getCurrentPageForTesting(),
          RecorderPanel.Pages.RECORDING_PAGE,
      );
    });

    it('should not execute action while replaying', async () => {
      const recording = makeRecording();
      const panel = await setupPanel(recording);

      panel.setRecordingStateForTesting({
        isPlaying: true,
        isPausedOnBreakpoint: false,
      });

      await panel.handleActions(RecorderActions.CREATE_RECORDING);

      assert.strictEqual(
          panel.getCurrentPageForTesting(),
          RecorderPanel.Pages.RECORDING_PAGE,
      );
    });
  });

  describe('Action is possible', () => {
    it('should return true for create action when not replaying or recording', async () => {
      const recording = makeRecording();
      const panel = await setupPanel(recording);

      assert.isTrue(
          panel.isActionPossible(RecorderActions.CREATE_RECORDING),
      );
    });

    it('should return false for create action when recording', async () => {
      const recording = makeRecording();
      const panel = await setupPanel(recording);

      panel.setRecordingStateForTesting({
        isPlaying: true,
        isPausedOnBreakpoint: false,
      });

      assert.isFalse(
          panel.isActionPossible(RecorderActions.CREATE_RECORDING),
      );
    });

    it('should return false for create action when replaying', async () => {
      const recording = makeRecording();
      const panel = await setupPanel(recording);

      panel.setIsRecordingStateForTesting(true);

      assert.isFalse(
          panel.isActionPossible(RecorderActions.CREATE_RECORDING),
      );
    });

    it('should return correct value for start/stop action', async () => {
      const recording = makeRecording();
      const panel = await setupPanel(recording);

      assert.isTrue(
          panel.isActionPossible(RecorderActions.START_RECORDING),
      );

      panel.setRecordingStateForTesting({
        isPlaying: true,
        isPausedOnBreakpoint: false,
      });
      assert.isFalse(
          panel.isActionPossible(RecorderActions.START_RECORDING),
      );
    });

    it('should return true for replay action when on the recording page', async () => {
      const recording = makeRecording();
      const panel = await setupPanel(recording);

      panel.setCurrentPageForTesting(
          RecorderPanel.Pages.RECORDING_PAGE,
      );

      assert.isTrue(
          panel.isActionPossible(RecorderActions.REPLAY_RECORDING),
      );
    });

    it('should return false for replay action when not on the recording page', async () => {
      const recording = makeRecording();
      const panel = await setupPanel(recording);

      panel.setCurrentPageForTesting(
          RecorderPanel.Pages.ALL_RECORDINGS_PAGE,
      );
      assert.isFalse(
          panel.isActionPossible(RecorderActions.REPLAY_RECORDING),
      );

      panel.setCurrentPageForTesting(
          RecorderPanel.Pages.CREATE_RECORDING_PAGE,
      );
      assert.isFalse(
          panel.isActionPossible(RecorderActions.REPLAY_RECORDING),
      );

      panel.setCurrentPageForTesting(RecorderPanel.Pages.START_PAGE);
      assert.isFalse(
          panel.isActionPossible(RecorderActions.REPLAY_RECORDING),
      );

      panel.setRecordingStateForTesting({
        isPlaying: true,
        isPausedOnBreakpoint: false,
      });
      panel.setCurrentPageForTesting(
          RecorderPanel.Pages.RECORDING_PAGE,
      );
      assert.isFalse(
          panel.isActionPossible(RecorderActions.REPLAY_RECORDING),
      );
    });

    it('should true for toggle when on the recording page', async () => {
      const recording = makeRecording();
      const panel = await setupPanel(recording);

      panel.setCurrentPageForTesting(
          RecorderPanel.Pages.RECORDING_PAGE,
      );
      assert.isTrue(
          panel.isActionPossible(RecorderActions.TOGGLE_CODE_VIEW),
      );
    });

    it('should false for toggle when on the recording page', async () => {
      const recording = makeRecording();
      const panel = await setupPanel(recording);

      panel.setCurrentPageForTesting(
          RecorderPanel.Pages.ALL_RECORDINGS_PAGE,
      );
      assert.isFalse(
          panel.isActionPossible(RecorderActions.TOGGLE_CODE_VIEW),
      );

      panel.setCurrentPageForTesting(RecorderPanel.Pages.START_PAGE);
      assert.isFalse(
          panel.isActionPossible(RecorderActions.TOGGLE_CODE_VIEW),
      );

      panel.setCurrentPageForTesting(
          RecorderPanel.Pages.ALL_RECORDINGS_PAGE,
      );
      assert.isFalse(
          panel.isActionPossible(RecorderActions.TOGGLE_CODE_VIEW),
      );
    });
  });

  describe('Extension converters', () => {
    const channels: MessageChannel[] = [];

    afterEach(() => {
      const pluginManager = PublicExtensions.RecorderPluginManager.RecorderPluginManager.instance();
      for (const plugin of pluginManager.plugins()) {
        pluginManager.removePlugin(plugin);
      }
      for (const channel of channels.splice(0)) {
        channel.port1.close();
        channel.port2.close();
      }
    });

    it('preserves extension converter IDs when registration order changes', async () => {
      const pluginManager = PublicExtensions.RecorderPluginManager.RecorderPluginManager.instance();
      const channelA = new MessageChannel();
      const channelB = new MessageChannel();
      channels.push(channelA, channelB);
      const pluginA = new PublicExtensions.RecorderExtensionEndpoint.RecorderExtensionEndpoint(
          'Export A',
          channelA.port1,
          ['export'],
          Platform.DevToolsPath.urlString`chrome-extension://ext-a`,
          pluginManager,
          'text/javascript',
      );
      const pluginB = new PublicExtensions.RecorderExtensionEndpoint.RecorderExtensionEndpoint(
          'Export B',
          channelB.port1,
          ['export'],
          Platform.DevToolsPath.urlString`chrome-extension://ext-b`,
          pluginManager,
          'text/javascript',
      );

      pluginManager.addPlugin(pluginA);
      pluginManager.addPlugin(pluginB);

      const panel = await setupPanel(makeRecording());
      assert.deepEqual(
          panel.extensionConverters.map(converter => converter.getId()),
          [
            'extension_chrome-extension://ext-a_Export A',
            'extension_chrome-extension://ext-b_Export B',
          ],
      );

      pluginManager.removePlugin(pluginA);
      pluginManager.removePlugin(pluginB);
      pluginManager.addPlugin(pluginB);
      pluginManager.addPlugin(pluginA);

      assert.deepEqual(
          panel.extensionConverters.map(converter => converter.getId()),
          [
            'extension_chrome-extension://ext-b_Export B',
            'extension_chrome-extension://ext-a_Export A',
          ],
      );
    });
  });
});
