// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  describeWithEnvironment,
  setupActionRegistry,
} from '../../testing/EnvironmentHelpers.js';
import * as RenderCoordinator from '../../ui/components/render_coordinator/render_coordinator.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Components from './components/components.js';
import * as Models from './models/models.js';
import {RecorderActions} from './recorder-actions/recorder-actions.js';
import {RecorderController} from './recorder.js';

describeWithEnvironment('RecorderController', () => {
  setupActionRegistry();

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

  async function setupController(
      recording: Models.RecordingStorage.StoredRecording,
      ): Promise<RecorderController.RecorderController> {
    const controller = new RecorderController.RecorderController();
    controller.setCurrentPageForTesting(RecorderController.Pages.RECORDING_PAGE);
    controller.setCurrentRecordingForTesting(recording);
    controller.connectedCallback();
    await RenderCoordinator.done();
    return controller;
  }

  describe('Navigation', () => {
    it('should return back to the previous page on recordingcancelled event', async () => {
      const previousPage = RecorderController.Pages.ALL_RECORDINGS_PAGE;
      const controller = new RecorderController.RecorderController();
      controller.setCurrentPageForTesting(previousPage);
      controller.setCurrentPageForTesting(
          RecorderController.Pages.CREATE_RECORDING_PAGE,
      );
      controller.connectedCallback();
      await RenderCoordinator.done();

      const createRecordingView = controller.shadowRoot?.querySelector(
          'devtools-create-recording-view',
      );
      assert.isOk(createRecordingView);
      createRecordingView?.dispatchEvent(
          new Components.CreateRecordingView.RecordingCancelledEvent(),
      );

      assert.strictEqual(controller.getCurrentPageForTesting(), previousPage);
    });
  });

  describe('StepView', () => {
    async function dispatchRecordingViewEvent(
        controller: RecorderController.RecorderController,
        event: Event,
        ): Promise<void> {
      const recordingViewWidgetElement = controller.shadowRoot?.querySelector<HTMLElement>(
          '.recording-view',
      );
      if (!recordingViewWidgetElement) {
        throw new Error('Could not find RecordingView widget element');
      }
      const widget = UI.Widget.Widget.getOrCreateWidget(recordingViewWidgetElement);
      await widget.updateComplete;
      const recordingView = widget.contentElement?.querySelector('.recording-view');
      assert.isOk(recordingView);
      recordingView?.dispatchEvent(event);
      await RenderCoordinator.done();
    }

    beforeEach(() => {
      Models.RecordingStorage.RecordingStorage.instance().clearForTest();
    });

    after(() => {
      Models.RecordingStorage.RecordingStorage.instance().clearForTest();
    });

    it('should add a new step after a step', async () => {
      const recording = makeRecording();
      const controller = await setupController(recording);

      await dispatchRecordingViewEvent(
          controller,
          new Components.StepView.AddStep(
              recording.flow.steps[0],
              Components.StepView.AddStepPosition.AFTER,
              ),
      );

      const flow = controller.getUserFlow();
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
      const controller = await setupController(recording);

      const sections = controller.getSectionsForTesting();
      if (!sections) {
        throw new Error('Controller is missing sections');
      }
      assert.lengthOf(sections, 1);
      await dispatchRecordingViewEvent(
          controller,
          new Components.StepView.AddStep(
              sections[0],
              Components.StepView.AddStepPosition.AFTER,
              ),
      );

      const flow = controller.getUserFlow();
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
      const controller = await setupController(recording);

      await dispatchRecordingViewEvent(
          controller,
          new Components.StepView.AddStep(
              recording.flow.steps[0],
              Components.StepView.AddStepPosition.BEFORE,
              ),
      );

      const flow = controller.getUserFlow();
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
      const controller = await setupController(recording);

      await dispatchRecordingViewEvent(
          controller,
          new Components.StepView.RemoveStep(recording.flow.steps[0]),
      );

      const flow = controller.getUserFlow();
      assert.deepEqual(flow, {title: 'test', steps: []});
    });

    it('should adding a new step before a step with a breakpoint update the breakpoint indexes correctly', async () => {
      const recording = makeRecording();
      const controller = await setupController(recording);
      const stepIndex = 3;

      await dispatchRecordingViewEvent(
          controller,
          new Components.StepView.AddBreakpointEvent(stepIndex),
      );
      assert.deepEqual(controller.getStepBreakpointIndexesForTesting(), [
        stepIndex,
      ]);
      await dispatchRecordingViewEvent(
          controller,
          new Components.StepView.AddStep(
              recording.flow.steps[0],
              Components.StepView.AddStepPosition.BEFORE,
              ),
      );

      // Breakpoint index moves to the next index
      assert.deepEqual(controller.getStepBreakpointIndexesForTesting(), [
        stepIndex + 1,
      ]);
    });

    it('should removing a step before a step with a breakpoint update the breakpoint indexes correctly', async () => {
      const recording = makeRecording();
      const controller = await setupController(recording);
      const stepIndex = 3;

      await dispatchRecordingViewEvent(
          controller,
          new Components.StepView.AddBreakpointEvent(stepIndex),
      );
      assert.deepEqual(controller.getStepBreakpointIndexesForTesting(), [
        stepIndex,
      ]);
      await dispatchRecordingViewEvent(
          controller,
          new Components.StepView.RemoveStep(recording.flow.steps[0]),
      );

      // Breakpoint index moves to the previous index
      assert.deepEqual(controller.getStepBreakpointIndexesForTesting(), [
        stepIndex - 1,
      ]);
    });

    it('should removing a step with a breakpoint remove the breakpoint index as well', async () => {
      const recording = makeRecording();
      const controller = await setupController(recording);
      const stepIndex = 0;

      await dispatchRecordingViewEvent(
          controller,
          new Components.StepView.AddBreakpointEvent(stepIndex),
      );
      assert.deepEqual(controller.getStepBreakpointIndexesForTesting(), [
        stepIndex,
      ]);
      await dispatchRecordingViewEvent(
          controller,
          new Components.StepView.RemoveStep(recording.flow.steps[stepIndex]),
      );

      // Breakpoint index is removed
      assert.deepEqual(controller.getStepBreakpointIndexesForTesting(), []);
    });

    it('should "add breakpoint" event add a breakpoint', async () => {
      const recording = makeRecording();
      const controller = await setupController(recording);
      const stepIndex = 1;

      assert.deepEqual(controller.getStepBreakpointIndexesForTesting(), []);
      await dispatchRecordingViewEvent(
          controller,
          new Components.StepView.AddBreakpointEvent(stepIndex),
      );

      assert.deepEqual(controller.getStepBreakpointIndexesForTesting(), [
        stepIndex,
      ]);
    });

    it('should "remove breakpoint" event remove a breakpoint', async () => {
      const recording = makeRecording();
      const controller = await setupController(recording);
      const stepIndex = 1;

      await dispatchRecordingViewEvent(
          controller,
          new Components.StepView.AddBreakpointEvent(stepIndex),
      );
      assert.deepEqual(controller.getStepBreakpointIndexesForTesting(), [
        stepIndex,
      ]);
      await dispatchRecordingViewEvent(
          controller,
          new Components.StepView.RemoveBreakpointEvent(stepIndex),
      );

      assert.deepEqual(controller.getStepBreakpointIndexesForTesting(), []);
    });
  });

  describe('Create new recording action', () => {
    it('should execute action', async () => {
      const recording = makeRecording();
      const controller = await setupController(recording);

      await controller.handleActions(RecorderActions.CREATE_RECORDING);

      assert.strictEqual(
          controller.getCurrentPageForTesting(),
          RecorderController.Pages.CREATE_RECORDING_PAGE,
      );
    });

    it('should not execute action while recording', async () => {
      const recording = makeRecording();
      const controller = await setupController(recording);

      controller.setIsRecordingStateForTesting(true);

      await controller.handleActions(RecorderActions.CREATE_RECORDING);

      assert.strictEqual(
          controller.getCurrentPageForTesting(),
          RecorderController.Pages.RECORDING_PAGE,
      );
    });

    it('should not execute action while replaying', async () => {
      const recording = makeRecording();
      const controller = await setupController(recording);

      controller.setRecordingStateForTesting({
        isPlaying: true,
        isPausedOnBreakpoint: false,
      });

      await controller.handleActions(RecorderActions.CREATE_RECORDING);

      assert.strictEqual(
          controller.getCurrentPageForTesting(),
          RecorderController.Pages.RECORDING_PAGE,
      );
    });
  });

  describe('Action is possible', () => {
    it('should return true for create action when not replaying or recording', async () => {
      const recording = makeRecording();
      const controller = await setupController(recording);

      assert.isTrue(
          controller.isActionPossible(RecorderActions.CREATE_RECORDING),
      );
    });

    it('should return false for create action when recording', async () => {
      const recording = makeRecording();
      const controller = await setupController(recording);

      controller.setRecordingStateForTesting({
        isPlaying: true,
        isPausedOnBreakpoint: false,
      });

      assert.isFalse(
          controller.isActionPossible(RecorderActions.CREATE_RECORDING),
      );
    });

    it('should return false for create action when replaying', async () => {
      const recording = makeRecording();
      const controller = await setupController(recording);

      controller.setIsRecordingStateForTesting(true);

      assert.isFalse(
          controller.isActionPossible(RecorderActions.CREATE_RECORDING),
      );
    });

    it('should return correct value for start/stop action', async () => {
      const recording = makeRecording();
      const controller = await setupController(recording);

      assert.isTrue(
          controller.isActionPossible(RecorderActions.START_RECORDING),
      );

      controller.setRecordingStateForTesting({
        isPlaying: true,
        isPausedOnBreakpoint: false,
      });
      assert.isFalse(
          controller.isActionPossible(RecorderActions.START_RECORDING),
      );
    });

    it('should return true for replay action when on the recording page', async () => {
      const recording = makeRecording();
      const controller = await setupController(recording);

      controller.setCurrentPageForTesting(
          RecorderController.Pages.RECORDING_PAGE,
      );

      assert.isTrue(
          controller.isActionPossible(RecorderActions.REPLAY_RECORDING),
      );
    });

    it('should return false for replay action when not on the recording page', async () => {
      const recording = makeRecording();
      const controller = await setupController(recording);

      controller.setCurrentPageForTesting(
          RecorderController.Pages.ALL_RECORDINGS_PAGE,
      );
      assert.isFalse(
          controller.isActionPossible(RecorderActions.REPLAY_RECORDING),
      );

      controller.setCurrentPageForTesting(
          RecorderController.Pages.CREATE_RECORDING_PAGE,
      );
      assert.isFalse(
          controller.isActionPossible(RecorderActions.REPLAY_RECORDING),
      );

      controller.setCurrentPageForTesting(RecorderController.Pages.START_PAGE);
      assert.isFalse(
          controller.isActionPossible(RecorderActions.REPLAY_RECORDING),
      );

      controller.setRecordingStateForTesting({
        isPlaying: true,
        isPausedOnBreakpoint: false,
      });
      controller.setCurrentPageForTesting(
          RecorderController.Pages.RECORDING_PAGE,
      );
      assert.isFalse(
          controller.isActionPossible(RecorderActions.REPLAY_RECORDING),
      );
    });

    it('should true for toggle when on the recording page', async () => {
      const recording = makeRecording();
      const controller = await setupController(recording);

      controller.setCurrentPageForTesting(
          RecorderController.Pages.RECORDING_PAGE,
      );
      assert.isTrue(
          controller.isActionPossible(RecorderActions.TOGGLE_CODE_VIEW),
      );
    });

    it('should false for toggle when on the recording page', async () => {
      const recording = makeRecording();
      const controller = await setupController(recording);

      controller.setCurrentPageForTesting(
          RecorderController.Pages.ALL_RECORDINGS_PAGE,
      );
      assert.isFalse(
          controller.isActionPossible(RecorderActions.TOGGLE_CODE_VIEW),
      );

      controller.setCurrentPageForTesting(RecorderController.Pages.START_PAGE);
      assert.isFalse(
          controller.isActionPossible(RecorderActions.TOGGLE_CODE_VIEW),
      );

      controller.setCurrentPageForTesting(
          RecorderController.Pages.ALL_RECORDINGS_PAGE,
      );
      assert.isFalse(
          controller.isActionPossible(RecorderActions.TOGGLE_CODE_VIEW),
      );
    });
  });
});
