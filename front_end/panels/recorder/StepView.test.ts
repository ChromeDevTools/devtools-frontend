// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import {
  describeWithEnvironment,
} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub, type ViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as Menus from '../../ui/components/menus/menus.js';

import * as Converters from './converters/converters.js';
import * as Models from './models/models.js';
import {StepView} from './recorder.js';

describeWithEnvironment('StepView', () => {
  const step = {type: Models.Schema.StepType.Scroll as const};
  const section = {title: 'test', steps: [step], url: 'https://example.com'};

  async function createStepView(
      viewFunction: ViewFunctionStub<typeof StepView.StepView>,
      opts: Partial<StepView.ViewInput> = {},
      ): Promise<StepView.StepView> {
    const component = new StepView.StepView(undefined, viewFunction);
    component.step = opts.step !== undefined ? step : undefined;
    component.section = opts.section !== undefined ? section : undefined;
    component.state = StepView.State.DEFAULT;
    component.isEndOfGroup = opts.isEndOfGroup ?? false;
    component.isStartOfGroup = opts.isStartOfGroup ?? false;
    component.isFirstSection = opts.isFirstSection ?? false;
    component.isLastSection = opts.isLastSection ?? false;
    component.stepIndex = opts.stepIndex ?? 0;
    component.sectionIndex = opts.sectionIndex ?? 0;
    component.isRecording = opts.isRecording ?? false;
    component.isPlaying = opts.isPlaying ?? false;
    component.hasBreakpoint = opts.hasBreakpoint ?? false;
    component.removable = opts.removable ?? false;
    component.builtInConverters = opts.builtInConverters || [
      new Converters.JSONConverter.JSONConverter('  '),
    ];
    component.extensionConverters = opts.extensionConverters || [];
    component.isSelected = opts.isSelected ?? false;
    component.recorderSettings = new Models.RecorderSettings.RecorderSettings();
    component.performUpdate();
    return component;
  }

  function createViewInput(opts: Partial<StepView.ViewInput> = {}): StepView.ViewInput {
    return {
      state: StepView.State.DEFAULT,
      showDetails: false,
      isEndOfGroup: false,
      isStartOfGroup: false,
      stepIndex: 0,
      sectionIndex: 0,
      isFirstSection: false,
      isLastSection: false,
      isRecording: false,
      isPlaying: false,
      isVisible: true,
      hasBreakpoint: false,
      removable: false,
      builtInConverters: [],
      extensionConverters: [],
      isSelected: false,
      actions: [],
      stepEdited: sinon.stub(),
      onBreakpointClick: sinon.stub(),
      handleStepAction: sinon.stub(),
      toggleShowDetails: sinon.stub(),
      onToggleShowDetailsKeydown: sinon.stub(),
      populateStepContextMenu: sinon.stub(),
      onStepClick: sinon.stub(),
      onStepHover: sinon.stub(),
      ...opts,
    };
  }

  describe('Step and section actions menu', () => {
    it('should produce actions for a step', async () => {
      const viewFunction = createViewFunctionStub(StepView.StepView);
      await createStepView(viewFunction, {step});
      assert.deepEqual(viewFunction.input.actions, [
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
      const viewFunction = createViewFunctionStub(StepView.StepView);
      await createStepView(viewFunction, {section});
      assert.deepEqual(viewFunction.input.actions, [
        {id: 'add-step-after', label: 'Add step after', group: 'stepManagement', groupTitle: 'Manage steps'},
      ]);
    });

    it('should call onAddStep before on steps', async () => {
      const viewFunction = createViewFunctionStub(StepView.StepView);
      const component = await createStepView(viewFunction, {step});
      const onAddStepSpy = sinon.spy();
      component.onAddStep = onAddStepSpy;

      viewFunction.input.handleStepAction(new Menus.Menu.MenuItemSelectedEvent('add-step-before'));

      sinon.assert.calledOnceWithExactly(onAddStepSpy, step, StepView.AddStepPosition.BEFORE);
    });

    it('should call onAddStep before on sections', async () => {
      const viewFunction = createViewFunctionStub(StepView.StepView);
      const component = await createStepView(viewFunction, {section});
      const onAddStepSpy = sinon.spy();
      component.onAddStep = onAddStepSpy;

      viewFunction.input.handleStepAction(new Menus.Menu.MenuItemSelectedEvent('add-step-before'));

      sinon.assert.calledOnceWithExactly(onAddStepSpy, section, StepView.AddStepPosition.BEFORE);
    });

    it('should call onAddStep after on steps', async () => {
      const viewFunction = createViewFunctionStub(StepView.StepView);
      const component = await createStepView(viewFunction, {step});
      const onAddStepSpy = sinon.spy();
      component.onAddStep = onAddStepSpy;

      viewFunction.input.handleStepAction(new Menus.Menu.MenuItemSelectedEvent('add-step-after'));

      sinon.assert.calledOnceWithExactly(onAddStepSpy, step, StepView.AddStepPosition.AFTER);
    });

    it('should call onRemoveStep on steps', async () => {
      const viewFunction = createViewFunctionStub(StepView.StepView);
      const component = await createStepView(viewFunction, {step});
      const onRemoveStepSpy = sinon.spy();
      component.onRemoveStep = onRemoveStepSpy;

      viewFunction.input.handleStepAction(new Menus.Menu.MenuItemSelectedEvent('remove-step'));

      sinon.assert.calledOnceWithExactly(onRemoveStepSpy, step);
    });

    it('should call onAddBreakpoint on steps', async () => {
      const viewFunction = createViewFunctionStub(StepView.StepView);
      const component = await createStepView(viewFunction, {step});
      const onAddBreakpointSpy = sinon.spy();
      component.onAddBreakpoint = onAddBreakpointSpy;

      viewFunction.input.handleStepAction(new Menus.Menu.MenuItemSelectedEvent('add-breakpoint'));

      sinon.assert.calledOnceWithExactly(onAddBreakpointSpy, 0);
    });

    it('should call onRemoveBreakpoint on steps', async () => {
      const viewFunction = createViewFunctionStub(StepView.StepView);
      const component = await createStepView(viewFunction, {step});
      const onRemoveBreakpointSpy = sinon.spy();
      component.onRemoveBreakpoint = onRemoveBreakpointSpy;

      viewFunction.input.handleStepAction(new Menus.Menu.MenuItemSelectedEvent('remove-breakpoint'));

      sinon.assert.calledOnceWithExactly(onRemoveBreakpointSpy, 0);
    });

    it('should call onCopyStep as JSON', async () => {
      const viewFunction = createViewFunctionStub(StepView.StepView);
      const component = await createStepView(viewFunction, {step});
      const onCopyStepSpy = sinon.spy();
      component.onCopyStep = onCopyStepSpy;

      viewFunction.input.handleStepAction(new Menus.Menu.MenuItemSelectedEvent('copy-step-as-json'));

      sinon.assert.calledOnce(onCopyStepSpy);
    });
  });

  describe('Breakpoint events', () => {
    describe('controller', () => {
      it('adds a breakpoint when the breakpoint callback is invoked', async () => {
        const viewFunction = createViewFunctionStub(StepView.StepView);
        const component = await createStepView(viewFunction, {step});
        const onAddBreakpointSpy = sinon.spy();
        component.onAddBreakpoint = onAddBreakpointSpy;

        viewFunction.input.onBreakpointClick();

        sinon.assert.calledOnceWithExactly(onAddBreakpointSpy, 0);
      });

      it('removes a breakpoint when the breakpoint callback is invoked', async () => {
        const viewFunction = createViewFunctionStub(StepView.StepView);
        const component = await createStepView(viewFunction, {hasBreakpoint: true, step});
        const onRemoveBreakpointSpy = sinon.spy();
        component.onRemoveBreakpoint = onRemoveBreakpointSpy;

        viewFunction.input.onBreakpointClick();

        sinon.assert.calledOnceWithExactly(onRemoveBreakpointSpy, 0);
      });
    });

    describe('view', () => {
      it('exposes the breakpoint icon as an add breakpoint button', () => {
        const container = document.createElement('div');

        StepView.DEFAULT_VIEW(createViewInput({step}), {}, container);
        const icon = container.querySelector<SVGElement>('.icon');
        assert.exists(icon);
        assert.strictEqual(icon.getAttribute('role'), 'button');
        assert.strictEqual(icon.getAttribute('aria-label'), 'Add breakpoint');
      });

      it('exposes the breakpoint icon as a remove breakpoint button', () => {
        const container = document.createElement('div');

        StepView.DEFAULT_VIEW(createViewInput({hasBreakpoint: true, step}), {}, container);
        const icon = container.querySelector<SVGElement>('.icon');
        assert.exists(icon);
        assert.strictEqual(icon.getAttribute('aria-label'), 'Remove breakpoint');
      });

      it('hides the non-actionable section icon from assistive technology', () => {
        const container = document.createElement('div');

        StepView.DEFAULT_VIEW(createViewInput({section}), {}, container);
        const icon = container.querySelector<SVGElement>('.icon');
        assert.exists(icon);
        assert.strictEqual(icon.getAttribute('aria-hidden'), 'true');
        assert.isFalse(icon.hasAttribute('jslog'));
      });

      it('invokes the breakpoint callback when the breakpoint button is clicked', () => {
        const onBreakpointClick = sinon.spy();
        const container = document.createElement('div');

        StepView.DEFAULT_VIEW(createViewInput({step, onBreakpointClick}), {}, container);
        const icon = container.querySelector<SVGElement>('.icon');
        assert.exists(icon);
        const event = new MouseEvent('click', {bubbles: true});
        icon.dispatchEvent(event);

        sinon.assert.calledOnceWithExactly(onBreakpointClick, event);
      });

      it('invokes the breakpoint callback when the breakpoint button is activated with the keyboard', () => {
        const onBreakpointClick = sinon.spy();
        const container = document.createElement('div');

        StepView.DEFAULT_VIEW(createViewInput({step, onBreakpointClick}), {}, container);
        const icon = container.querySelector<SVGElement>('.icon');
        assert.exists(icon);
        icon.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));
        icon.dispatchEvent(new KeyboardEvent('keydown', {key: ' ', bubbles: true}));

        sinon.assert.calledTwice(onBreakpointClick);
        sinon.assert.alwaysCalledWithExactly(onBreakpointClick);
      });
    });
  });
});
