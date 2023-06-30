// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Models from '../../../../../../front_end/panels/recorder/models/models.js';
import * as Converters from '../../../../../../front_end/panels/recorder/converters/converters.js';
import * as Components from '../../../../../../front_end/panels/recorder/components/components.js';
import * as Menus from '../../../../../../front_end/ui/components/menus/menus.js';
import type * as Button from '../../../../../../front_end/ui/components/buttons/buttons.js';
import * as Coordinator from '../../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';

import {
  dispatchClickEvent,
  getEventPromise,
  renderElementIntoDOM,
} from '../../../../../../test/unittests/front_end/helpers/DOMHelpers.js';
import {
  describeWithEnvironment,
} from '../../../../../../test/unittests/front_end/helpers/EnvironmentHelpers.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

describeWithEnvironment('StepView', () => {
  const step = {type: Models.Schema.StepType.Scroll as const};
  const section = {title: 'test', steps: [step], url: 'https://example.com'};

  async function createStepView(
      opts: Partial<Components.StepView.StepViewData> = {},
      ): Promise<Components.StepView.StepView> {
    const view = new Components.StepView.StepView();
    view.data = {
      step: opts.step !== undefined ? step : undefined,
      section: opts.section !== undefined ? section : undefined,
      state: Components.StepView.State.Default,
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
    renderElementIntoDOM(view);
    await coordinator.done();
    return view;
  }

  describe('Step and section actions menu', () => {
    it('should open actions menu', async () => {
      const view = await createStepView({step});
      assert.notOk(
          view.shadowRoot?.querySelector('devtools-menu[has-open-dialog]'),
      );

      const button = view.shadowRoot?.querySelector(
                         '.step-actions',
                         ) as Button.Button.Button;
      assert.ok(button);

      dispatchClickEvent(button);
      await coordinator.done();

      assert.ok(
          view.shadowRoot?.querySelector('devtools-menu[has-open-dialog]'),
      );
    });

    it('should dispatch "AddStep before" events on steps', async () => {
      const view = await createStepView({step});

      const menu = view.shadowRoot?.querySelector(
                       '.step-actions + devtools-menu',
                       ) as Menus.Menu.Menu;
      assert.ok(menu);
      const eventPromise = getEventPromise<Components.StepView.AddStep>(
          view,
          'addstep',
      );
      menu.dispatchEvent(
          new Menus.Menu.MenuItemSelectedEvent('add-step-before'),
      );
      const event = await eventPromise;

      assert.strictEqual(event.position, 'before');
      assert.deepStrictEqual(event.stepOrSection, step);
    });

    it('should dispatch "AddStep before" events on steps', async () => {
      const view = await createStepView({section});

      const menu = view.shadowRoot?.querySelector(
                       '.step-actions + devtools-menu',
                       ) as Menus.Menu.Menu;
      assert.ok(menu);
      const eventPromise = getEventPromise<Components.StepView.AddStep>(
          view,
          'addstep',
      );
      menu.dispatchEvent(
          new Menus.Menu.MenuItemSelectedEvent('add-step-before'),
      );
      const event = await eventPromise;

      assert.strictEqual(event.position, 'before');
      assert.deepStrictEqual(event.stepOrSection, section);
    });

    it('should dispatch "AddStep after" events on steps', async () => {
      const view = await createStepView({step});

      const menu = view.shadowRoot?.querySelector(
                       '.step-actions + devtools-menu',
                       ) as Menus.Menu.Menu;
      assert.ok(menu);
      const eventPromise = getEventPromise<Components.StepView.AddStep>(
          view,
          'addstep',
      );
      menu.dispatchEvent(
          new Menus.Menu.MenuItemSelectedEvent('add-step-after'),
      );
      const event = await eventPromise;

      assert.strictEqual(event.position, 'after');
      assert.deepStrictEqual(event.stepOrSection, step);
    });

    it('should dispatch "Remove steps" events on steps', async () => {
      const view = await createStepView({step});

      const menu = view.shadowRoot?.querySelector(
                       '.step-actions + devtools-menu',
                       ) as Menus.Menu.Menu;
      assert.ok(menu);
      const eventPromise = getEventPromise<Components.StepView.RemoveStep>(
          view,
          'removestep',
      );
      menu.dispatchEvent(
          new Menus.Menu.MenuItemSelectedEvent('remove-step'),
      );
      const event = await eventPromise;

      assert.deepStrictEqual(event.step, step);
    });

    it('should dispatch "Add breakpoint" event on steps', async () => {
      const view = await createStepView({step});

      const menu = view.shadowRoot?.querySelector(
                       '.step-actions + devtools-menu',
                       ) as Menus.Menu.Menu;
      assert.ok(menu);
      const eventPromise = getEventPromise<Components.StepView.AddBreakpointEvent>(
          view,
          'addbreakpoint',
      );
      menu.dispatchEvent(
          new Menus.Menu.MenuItemSelectedEvent('add-breakpoint'),
      );
      const event = await eventPromise;

      assert.deepStrictEqual(event.index, 0);
    });

    it('should dispatch "Remove breakpoint" event on steps', async () => {
      const view = await createStepView({step});

      const menu = view.shadowRoot?.querySelector(
                       '.step-actions + devtools-menu',
                       ) as Menus.Menu.Menu;
      assert.ok(menu);
      const eventPromise = getEventPromise<Components.StepView.AddBreakpointEvent>(
          view,
          'removebreakpoint',
      );
      menu.dispatchEvent(
          new Menus.Menu.MenuItemSelectedEvent('remove-breakpoint'),
      );
      const event = await eventPromise;

      assert.deepStrictEqual(event.index, 0);
    });
  });

  describe('Breakpoint events', () => {
    it('should dispatch "Add breakpoint" event on breakpoint icon click if there is not a breakpoint on the step',
       async () => {
         const view = await createStepView({step});
         const breakpointIcon = view.shadowRoot?.querySelector('.breakpoint-icon');
         const eventPromise = getEventPromise<Components.StepView.AddBreakpointEvent>(
             view,
             'addbreakpoint',
         );
         assert.isOk(breakpointIcon);

         breakpointIcon?.dispatchEvent(new Event('click'));
         const event = await eventPromise;

         assert.deepStrictEqual(event.index, 0);
       });

    it('should dispatch "Remove breakpoint" event on breakpoint icon click if there already is a breakpoint on the step',
       async () => {
         const view = await createStepView({hasBreakpoint: true, step});
         const breakpointIcon = view.shadowRoot?.querySelector('.breakpoint-icon');
         const eventPromise = getEventPromise<Components.StepView.RemoveBreakpointEvent>(
             view,
             'removebreakpoint',
         );

         breakpointIcon?.dispatchEvent(new Event('click'));
         const event = await eventPromise;

         assert.deepStrictEqual(event.index, 0);
       });
  });

  describe('Copy steps', () => {
    it('should copy a step to clipboard', async () => {
      const view = await createStepView({step});
      const menu = view.shadowRoot?.querySelector(
                       '.step-actions + devtools-menu',
                       ) as Menus.Menu.Menu;
      assert.ok(menu);

      const isCalled = sinon.promise();
      view.addEventListener(Components.StepView.CopyStepEvent.eventName, () => {
        void isCalled.resolve(true);
      });
      menu.dispatchEvent(
          new Menus.Menu.MenuItemSelectedEvent('copy-step-as-json'),
      );

      const called = await isCalled;

      assert.isTrue(called);
    });
  });

  describe('Selection', () => {
    it('should render timeline as selected if isSelected = true', async () => {
      const view = await createStepView({step, isSelected: true});
      assert.ok(view);
      const section = view.shadowRoot?.querySelector(
          'devtools-timeline-section',
      );
      assert.ok(section);
      const div = section?.shadowRoot?.querySelector('div');
      assert.isTrue(div?.classList.contains('is-selected'));
    });
  });
});
