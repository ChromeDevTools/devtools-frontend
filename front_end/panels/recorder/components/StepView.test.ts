// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  getEventPromise,
} from '../../../testing/DOMHelpers.js';
import {
  describeWithEnvironment,
} from '../../../testing/EnvironmentHelpers.js';
import * as Menus from '../../../ui/components/menus/menus.js';
import * as Converters from '../converters/converters.js';
import * as Models from '../models/models.js';

import * as Components from './components.js';

describeWithEnvironment('StepView', () => {
  const step = {type: Models.Schema.StepType.Scroll as const};
  const section = {title: 'test', steps: [step], url: 'https://example.com'};

  function createViewFunctionSpy() {
    const viewFunction = sinon.spy();

    return {
      viewFunction,
      getViewInput(): Components.StepView.ViewInput {
        return viewFunction.lastCall.args[0];
      },
    };
  }

  async function createStepView(
      viewFunction: () => void,
      opts: Partial<Components.StepView.StepViewData> = {},
      ): Promise<Components.StepView.StepView> {
    const component = new Components.StepView.StepView(viewFunction);
    component.data = {
      step: opts.step !== undefined ? step : undefined,
      section: opts.section !== undefined ? section : undefined,
      state: Components.StepView.State.DEFAULT,
      isEndOfGroup: opts.isEndOfGroup ?? false,
      isStartOfGroup: opts.isStartOfGroup ?? false,
      isFirstSection: opts.isFirstSection ?? false,
      isLastSection: opts.isLastSection ?? false,
      stepIndex: opts.stepIndex ?? 0,
      sectionIndex: opts.sectionIndex ?? 0,
      isRecording: opts.isRecording ?? false,
      isPlaying: opts.isPlaying ?? false,
      hasBreakpoint: opts.hasBreakpoint ?? false,
      removable: opts.removable ?? false,
      builtInConverters: opts.builtInConverters ||
          [
            new Converters.JSONConverter.JSONConverter('  '),
          ],
      extensionConverters: opts.extensionConverters || [],
      isSelected: opts.isSelected ?? false,
      recorderSettings: new Models.RecorderSettings.RecorderSettings(),
    };
    return component;
  }

  describe('Step and section actions menu', () => {
    it('should produce actions for a step', async () => {
      const {viewFunction, getViewInput} = createViewFunctionSpy();
      await createStepView(viewFunction, {step});
      assert.deepStrictEqual(getViewInput().actions, [
        {id: 'add-step-before', label: 'Add step before', group: 'stepManagement', groupTitle: 'Manage steps'},
        {id: 'add-step-after', label: 'Add step after', group: 'stepManagement', groupTitle: 'Manage steps'},
        {
          id: 'add-breakpoint',
          label: 'Add breakpoint',
          group: 'breakPointManagement',
          groupTitle: 'Breakpoints',
        },
        {id: 'copy-step-as-json', label: 'JSON', group: 'copy', groupTitle: 'Copy as'},
      ]);
    });

    it('should produce actions for a section', async () => {
      const {viewFunction, getViewInput} = createViewFunctionSpy();
      await createStepView(viewFunction, {section});
      assert.deepStrictEqual(getViewInput().actions, [
        {id: 'add-step-after', label: 'Add step after', group: 'stepManagement', groupTitle: 'Manage steps'},
      ]);
    });

    it('should dispatch "AddStep before" events on steps', async () => {
      const {viewFunction, getViewInput} = createViewFunctionSpy();
      const component = await createStepView(viewFunction, {step});
      const eventPromise = getEventPromise<Components.StepView.AddStep>(
          component,
          'addstep',
      );
      getViewInput().handleStepAction(new Menus.Menu.MenuItemSelectedEvent('add-step-before'));
      const event = await eventPromise;

      assert.strictEqual(event.position, 'before');
      assert.deepStrictEqual(event.stepOrSection, step);
    });

    it('should dispatch "AddStep before" events on sections', async () => {
      const {viewFunction, getViewInput} = createViewFunctionSpy();
      const component = await createStepView(viewFunction, {section});

      const eventPromise = getEventPromise<Components.StepView.AddStep>(
          component,
          'addstep',
      );
      getViewInput().handleStepAction(new Menus.Menu.MenuItemSelectedEvent('add-step-before'));
      const event = await eventPromise;

      assert.strictEqual(event.position, 'before');
      assert.deepStrictEqual(event.stepOrSection, section);
    });

    it('should dispatch "AddStep after" events on steps', async () => {
      const {viewFunction, getViewInput} = createViewFunctionSpy();
      const component = await createStepView(viewFunction, {step});

      const eventPromise = getEventPromise<Components.StepView.AddStep>(
          component,
          'addstep',
      );
      getViewInput().handleStepAction(new Menus.Menu.MenuItemSelectedEvent('add-step-after'));
      const event = await eventPromise;

      assert.strictEqual(event.position, 'after');
      assert.deepStrictEqual(event.stepOrSection, step);
    });

    it('should dispatch "Remove steps" events on steps', async () => {
      const {viewFunction, getViewInput} = createViewFunctionSpy();
      const component = await createStepView(viewFunction, {step});

      const eventPromise = getEventPromise<Components.StepView.RemoveStep>(
          component,
          'removestep',
      );
      getViewInput().handleStepAction(new Menus.Menu.MenuItemSelectedEvent('remove-step'));
      const event = await eventPromise;

      assert.deepStrictEqual(event.step, step);
    });

    it('should dispatch "Add breakpoint" event on steps', async () => {
      const {viewFunction, getViewInput} = createViewFunctionSpy();
      const component = await createStepView(viewFunction, {step});

      const eventPromise = getEventPromise<Components.StepView.AddBreakpointEvent>(
          component,
          'addbreakpoint',
      );
      getViewInput().handleStepAction(new Menus.Menu.MenuItemSelectedEvent('add-breakpoint'));
      const event = await eventPromise;

      assert.deepStrictEqual(event.index, 0);
    });

    it('should dispatch "Remove breakpoint" event on steps', async () => {
      const {viewFunction, getViewInput} = createViewFunctionSpy();
      const component = await createStepView(viewFunction, {step});

      const eventPromise = getEventPromise<Components.StepView.AddBreakpointEvent>(
          component,
          'removebreakpoint',
      );
      getViewInput().handleStepAction(new Menus.Menu.MenuItemSelectedEvent('remove-breakpoint'));
      const event = await eventPromise;

      assert.deepStrictEqual(event.index, 0);
    });

    it('should dispatch copy step as JSON events', async () => {
      const {viewFunction, getViewInput} = createViewFunctionSpy();
      const component = await createStepView(viewFunction, {step});

      const eventPromise = getEventPromise<Components.StepView.CopyStepEvent>(
          component,
          'copystep',
      );

      getViewInput().handleStepAction(new Menus.Menu.MenuItemSelectedEvent('copy-step-as-json'));

      await eventPromise;
    });
  });

  describe('Breakpoint events', () => {
    it('should dispatch "Add breakpoint" event on breakpoint icon click if there is not a breakpoint on the step',
       async () => {
         const {viewFunction, getViewInput} = createViewFunctionSpy();
         const component = await createStepView(viewFunction, {step});
         const eventPromise = getEventPromise<Components.StepView.AddBreakpointEvent>(
             component,
             'addbreakpoint',
         );
         getViewInput().onBreakpointClick();
         const event = await eventPromise;

         assert.deepStrictEqual(event.index, 0);
       });

    it('should dispatch "Remove breakpoint" event on breakpoint icon click if there already is a breakpoint on the step',
       async () => {
         const {viewFunction, getViewInput} = createViewFunctionSpy();
         const component = await createStepView(viewFunction, {hasBreakpoint: true, step});
         const eventPromise = getEventPromise<Components.StepView.RemoveBreakpointEvent>(
             component,
             'removebreakpoint',
         );

         getViewInput().onBreakpointClick();
         const event = await eventPromise;

         assert.deepStrictEqual(event.index, 0);
       });
  });
});
