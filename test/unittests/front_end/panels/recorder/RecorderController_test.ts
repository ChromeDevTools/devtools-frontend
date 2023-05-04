// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/es_modules_import */

const {assert} = chai;

import {RecorderActions} from '../../../../../front_end/panels/recorder/recorder-actions.js';
import {RecorderController} from '../../../../../front_end/panels/recorder/recorder.js';
import * as Models from '../../../../../front_end/panels/recorder/models/models.js';
import * as Components from '../../../../../front_end/panels/recorder/components/components.js';
import {
  describeWithEnvironment,
  setupActionRegistry,
} from '../../../../../test/unittests/front_end/helpers/EnvironmentHelpers.js';
import * as Coordinator from '../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

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
    controller.setCurrentPageForTesting(RecorderController.Pages.RecordingPage);
    controller.setCurrentRecordingForTesting(recording);
    controller.connectedCallback();
    await coordinator.done();
    return controller;
  }

  describe('Navigation', () => {
    it('should return back to the previous page on recordingcancelled event', async () => {
      const previousPage = RecorderController.Pages.AllRecordingsPage;
      const controller = new RecorderController.RecorderController();
      controller.setCurrentPageForTesting(previousPage);
      controller.setCurrentPageForTesting(
          RecorderController.Pages.CreateRecordingPage,
      );
      controller.connectedCallback();
      await coordinator.done();

      const createRecordingView = controller.shadowRoot?.querySelector(
          'devtools-create-recording-view',
      );
      assert.ok(createRecordingView);
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
      const recordingView = controller.shadowRoot?.querySelector(
          'devtools-recording-view',
      );
      assert.ok(recordingView);
      recordingView?.dispatchEvent(event);
      await coordinator.done();
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
      assert.deepStrictEqual(flow, {
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
      assert.deepStrictEqual(flow, {
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
      assert.deepStrictEqual(flow, {
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
      assert.deepStrictEqual(flow, {title: 'test', steps: []});
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

      await controller.handleActions(RecorderActions.CreateRecording);

      assert.strictEqual(
          controller.getCurrentPageForTesting(),
          RecorderController.Pages.CreateRecordingPage,
      );
    });

    it('should not execute action while recording', async () => {
      const recording = makeRecording();
      const controller = await setupController(recording);

      controller.setIsRecordingStateForTesting(true);

      await controller.handleActions(RecorderActions.CreateRecording);

      assert.strictEqual(
          controller.getCurrentPageForTesting(),
          RecorderController.Pages.RecordingPage,
      );
    });

    it('should not execute action while replaying', async () => {
      const recording = makeRecording();
      const controller = await setupController(recording);

      controller.setRecordingStateForTesting({
        isPlaying: true,
        isPausedOnBreakpoint: false,
      });

      await controller.handleActions(RecorderActions.CreateRecording);

      assert.strictEqual(
          controller.getCurrentPageForTesting(),
          RecorderController.Pages.RecordingPage,
      );
    });
  });

  describe('Action is possible', () => {
    it('should return true for create action when not replaying or recording', async () => {
      const recording = makeRecording();
      const controller = await setupController(recording);

      assert.isTrue(
          controller.isActionPossible(RecorderActions.CreateRecording),
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
          controller.isActionPossible(RecorderActions.CreateRecording),
      );
    });

    it('should return false for create action when replaying', async () => {
      const recording = makeRecording();
      const controller = await setupController(recording);

      controller.setIsRecordingStateForTesting(true);

      assert.isFalse(
          controller.isActionPossible(RecorderActions.CreateRecording),
      );
    });

    it('should return correct value for start/stop action', async () => {
      const recording = makeRecording();
      const controller = await setupController(recording);

      assert.isTrue(
          controller.isActionPossible(RecorderActions.StartRecording),
      );

      controller.setRecordingStateForTesting({
        isPlaying: true,
        isPausedOnBreakpoint: false,
      });
      assert.isFalse(
          controller.isActionPossible(RecorderActions.StartRecording),
      );
    });

    it('should return true for replay action when on the recording page', async () => {
      const recording = makeRecording();
      const controller = await setupController(recording);

      controller.setCurrentPageForTesting(
          RecorderController.Pages.RecordingPage,
      );

      assert.isTrue(
          controller.isActionPossible(RecorderActions.ReplayRecording),
      );
    });

    it('should return false for replay action when not on the recording page', async () => {
      const recording = makeRecording();
      const controller = await setupController(recording);

      controller.setCurrentPageForTesting(
          RecorderController.Pages.AllRecordingsPage,
      );
      assert.isFalse(
          controller.isActionPossible(RecorderActions.ReplayRecording),
      );

      controller.setCurrentPageForTesting(
          RecorderController.Pages.CreateRecordingPage,
      );
      assert.isFalse(
          controller.isActionPossible(RecorderActions.ReplayRecording),
      );

      controller.setCurrentPageForTesting(RecorderController.Pages.StartPage);
      assert.isFalse(
          controller.isActionPossible(RecorderActions.ReplayRecording),
      );

      controller.setRecordingStateForTesting({
        isPlaying: true,
        isPausedOnBreakpoint: false,
      });
      controller.setCurrentPageForTesting(
          RecorderController.Pages.RecordingPage,
      );
      assert.isFalse(
          controller.isActionPossible(RecorderActions.ReplayRecording),
      );
    });

    it('should true for toggle when on the recording page', async () => {
      const recording = makeRecording();
      const controller = await setupController(recording);

      controller.setCurrentPageForTesting(
          RecorderController.Pages.RecordingPage,
      );
      assert.isTrue(
          controller.isActionPossible(RecorderActions.ToggleCodeView),
      );
    });

    it('should false for toggle when on the recording page', async () => {
      const recording = makeRecording();
      const controller = await setupController(recording);

      controller.setCurrentPageForTesting(
          RecorderController.Pages.AllRecordingsPage,
      );
      assert.isFalse(
          controller.isActionPossible(RecorderActions.ToggleCodeView),
      );

      controller.setCurrentPageForTesting(RecorderController.Pages.StartPage);
      assert.isFalse(
          controller.isActionPossible(RecorderActions.ToggleCodeView),
      );

      controller.setCurrentPageForTesting(
          RecorderController.Pages.AllRecordingsPage,
      );
      assert.isFalse(
          controller.isActionPossible(RecorderActions.ToggleCodeView),
      );
    });
  });
});
