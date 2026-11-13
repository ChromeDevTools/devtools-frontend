// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Host from '../../core/host/host.js';
import {assertScreenshot, raf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {
  describeWithEnvironment,
  setupActionRegistry,
} from '../../testing/EnvironmentHelpers.js';
import {expectCall} from '../../testing/ExpectStubCall.js';
import {createViewFunctionStub, type ViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Converters from './converters/converters.js';
import * as Models from './models/models.js';
import {RecordingView, StepView} from './recorder.js';

describeWithEnvironment('RecordingView', () => {
  setupActionRegistry();

  const step = {type: Models.Schema.StepType.Scroll as const};
  const section = {title: 'test', steps: [step], url: 'https://example.com'};
  const userFlow = {title: 'test', steps: [step]};
  const recorderSettingsMock = {
    preferredCopyFormat: Models.ConverterIds.ConverterIds.JSON,
  } as Models.RecorderSettings.RecorderSettings;
  const views: RecordingView.RecordingView[] = [];

  afterEach(() => {
    // Unregister global listeners in willHide to prevent leaks.
    for (const view of views) {
      view.willHide();
    }
  });

  async function createView(output?: RecordingView.ViewOutput):
      Promise<[ViewFunctionStub<typeof RecordingView.RecordingView>, RecordingView.RecordingView]> {
    const view = createViewFunctionStub(RecordingView.RecordingView, output);
    const component = new RecordingView.RecordingView(undefined, view);
    Object.assign(component, {
      replayState: {isPlaying: false, isPausedOnBreakpoint: false},
      isRecording: false,
      recordingTogglingInProgress: false,
      recording: userFlow,
      currentStep: undefined,
      currentError: undefined,
      sections: [section],
      settings: undefined,
      recorderSettings: recorderSettingsMock,
      lastReplayResult: undefined,
      replayAllowed: true,
      breakpointIndexes: new Set(),
      builtInConverters: [
        new Converters.JSONConverter.JSONConverter('  '),
        new Converters.PuppeteerReplayConverter.PuppeteerReplayConverter('  '),
      ],
      extensionConverters: [],
      replayExtensions: [],
    });
    component.wasShown();
    views.push(component);
    await view.nextInput;
    return [view, component];
  }

  it('should show code and highlight on hover', async () => {
    const output = {
      highlightLinesInEditor: sinon.stub(),
    };
    const [view] = await createView(output);
    view.input.showCodeToggle();
    const input = await view.nextInput;
    assert.deepEqual(input.editorState?.selection.toJSON(), {
      ranges: [{anchor: 0, head: 0}],
      main: 0,
    });
    const highlightCalled = expectCall(output.highlightLinesInEditor);
    view.input.onStepHover(step);
    const [line, length, scroll] = await highlightCalled;
    assert.strictEqual(line, 3);
    assert.strictEqual(length, 3);
    assert.isFalse(scroll);
  });

  it('should close code view', async () => {
    const [view] = await createView();

    view.input.showCodeToggle();
    {
      const input = await view.nextInput;
      assert.isOk(input.showCodeView);
    }

    const closeInput = view.nextInput;
    view.input.showCodeToggle();
    {
      const input = await closeInput;
      assert.isNotOk(input.showCodeView);
    }
  });

  it('should use the same focused button when showing code', async () => {
    const [view] = await createView();
    const closedInput = view.input;
    closedInput.showCodeToggle();
    const openedInput = await view.nextInput;
    const target = document.createElement('div');
    renderElementIntoDOM(target);

    RecordingView.DEFAULT_VIEW(closedInput, {}, target);
    const codeToggle = target.querySelector<HTMLElementTagNameMap['devtools-button']>('devtools-button.show-code');
    assert.instanceOf(codeToggle, HTMLElement);
    assert.isFalse(codeToggle.accessibleExpanded);
    assert.strictEqual(target.querySelector('[slot="main"]')?.getAttribute('role'), 'region');
    assert.strictEqual(target.querySelector('[slot="main"]')?.getAttribute('aria-labelledby'),
                       'recording-steps-heading');
    assert.strictEqual(target.querySelector('#recording-steps-heading')?.textContent, 'Steps');
    codeToggle.focus();

    RecordingView.DEFAULT_VIEW(openedInput, {}, target);

    assert.strictEqual(target.querySelector('devtools-button.show-code'), codeToggle);
    assert.strictEqual(document.activeElement, codeToggle);
    assert.isTrue(codeToggle.accessibleExpanded);
    assert.strictEqual(target.querySelector('#recording-code-pane')?.getAttribute('role'), 'region');
    assert.strictEqual(target.querySelector('#recording-code-pane')?.getAttribute('aria-labelledby'),
                       'recording-code-heading');
    assert.strictEqual(target.querySelector('#recording-code-heading')?.textContent, 'Code');
  });

  it('should copy the recording to clipboard via copy event', async () => {
    await createView();
    const clipboardData = new DataTransfer();
    const copyText = expectCall(sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'copyText',
        ));
    const event = new ClipboardEvent('copy', {clipboardData, bubbles: true});

    document.body.dispatchEvent(event);

    const [text] = await copyText;

    assert.strictEqual(JSON.stringify(userFlow, null, 2) + '\n', text);
  });

  it('should copy a step to clipboard via copy event', async () => {
    const [view] = await createView();
    view.input.onStepClick(step);

    const clipboardData = new DataTransfer();
    const isCalled = sinon.promise();
    const copyText = sinon
                         .stub(
                             Host.InspectorFrontendHost.InspectorFrontendHostInstance,
                             'copyText',
                             )
                         .callsFake(() => {
                           void isCalled.resolve(true);
                         });
    const event = new ClipboardEvent('copy', {clipboardData, bubbles: true});

    document.body.dispatchEvent(event);

    await isCalled;

    sinon.assert.calledWith(copyText, JSON.stringify(step, null, 2) + '\n');
  });

  it('should copy a step to clipboard via callback', async () => {
    const [view] = await createView();
    const isCalled = sinon.promise();
    const copyText = sinon
                         .stub(
                             Host.InspectorFrontendHost.InspectorFrontendHostInstance,
                             'copyText',
                             )
                         .callsFake(() => {
                           void isCalled.resolve(true);
                         });

    view.input.onCopyStep(step as Models.Schema.Step);

    await isCalled;

    sinon.assert.calledWith(copyText, JSON.stringify(step, null, 2) + '\n');
  });

  it('should show code and change preferred copy method', async () => {
    const [view] = await createView();

    view.input.showCodeToggle();
    {
      const input = await view.nextInput;
      assert.isOk(input.showCodeView);
    }

    view.input.onCodeFormatChange(Models.ConverterIds.ConverterIds.REPLAY);
    {
      const input = await view.nextInput;
      assert.strictEqual(input.recorderSettings?.preferredCopyFormat, Models.ConverterIds.ConverterIds.REPLAY);
      assert.strictEqual(recorderSettingsMock.preferredCopyFormat, Models.ConverterIds.ConverterIds.REPLAY);
    }
  });

  it('should select the step that starts a section when the section is clicked', async () => {
    const [view] = await createView();
    const causingStep = {type: Models.Schema.StepType.Click as const, selectors: ['#link'], offsetX: 1, offsetY: 1};

    // onStepClick updates the view synchronously.
    view.input.onStepClick({...section, causingStep});
    assert.strictEqual(view.input.selectedStep, causingStep);

    view.input.onStepClick(step);
    assert.strictEqual(view.input.selectedStep, step);

    // Sections that are not started by a step (e.g. the initial "Current page" section) clear the selection.
    view.input.onStepClick(section);
    assert.isNull(view.input.selectedStep);
  });

  describe('view', () => {
    const screenshot = ('data:image/svg+xml,' +
                        encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="120">' +
                                           '<rect width="200" height="120" fill="#4285f4"/>' +
                                           '<rect x="20" y="20" width="160" height="20" fill="#ffffff"/></svg>')) as
        Models.ScreenshotStorage.Screenshot;

    function makeSteps(): Models.Schema.Step[] {
      return [
        {
          type: Models.Schema.StepType.Navigate,
          url: 'https://example.com/',
          assertedEvents: [{
            type: Models.Schema.AssertedEventType.Navigation,
            url: 'https://example.com/',
            title: 'Example',
          }],
        },
        {
          type: Models.Schema.StepType.Click,
          selectors: [['aria/Submit[role="button"]'], ['#submit']],
          offsetX: 1,
          offsetY: 1,
        },
        {
          type: Models.Schema.StepType.Change,
          selectors: [['aria/Name[role="input"]'], ['#name']],
          value: 'Name',
        },
        {
          type: Models.Schema.StepType.Click,
          selectors: [['#link']],
          offsetX: 1,
          offsetY: 1,
          assertedEvents: [{
            type: Models.Schema.AssertedEventType.Navigation,
            url: 'https://example.com/next',
            title: 'Next',
          }],
        },
        {type: Models.Schema.StepType.KeyDown, key: 'Enter'},
      ];
    }

    async function waitForRendering(component: RecordingView.RecordingView): Promise<void> {
      for (let i = 0; i < 3; i++) {
        await UI.Widget.Widget.allUpdatesComplete;
        await raf();
      }
      await Promise.all([...component.contentElement.querySelectorAll('img')].map(img => img.decode()));
    }

    async function renderRecordingView(width: number, options: {
      currentError?: Error,
      height?: number,
      withSettings?: boolean,
    } = {}): Promise<RecordingView.RecordingView> {
      const steps = makeSteps();
      const sections = Models.Section.buildSections(steps);
      sections[0].screenshot = screenshot;
      const component = new RecordingView.RecordingView();
      Object.assign(component, {
        recording: {title: 'Recording', steps},
        sections,
        currentStep: options.currentError ? steps[2] : undefined,
        currentError: options.currentError,
        settings: options.withSettings ? {
          viewportSettings: {
            type: Models.Schema.StepType.SetViewport,
            width: 1280,
            height: 720,
            deviceScaleFactor: 1,
            isMobile: false,
            hasTouch: false,
            isLandscape: false,
          },
          timeout: 5000,
        } :
                                         undefined,
        recorderSettings: new Models.RecorderSettings.RecorderSettings(),
        replayAllowed: true,
        builtInConverters: [new Converters.JSONConverter.JSONConverter('  ')],
      });
      renderElementIntoDOM(component, {width, height: options.height ?? 420, includeCommonStyles: true});
      await waitForRendering(component);
      return component;
    }

    /**
     * Renders the pure view function with a synthetic input and returns the params that it passes to each StepView
     * in document order (each section row followed by its steps).
     */
    function renderView(overrides: Partial<Parameters<typeof RecordingView.DEFAULT_VIEW>[0]>):
        Array<Partial<StepView.StepView>> {
      const steps = makeSteps();
      const noop = (): void => {};
      const input: Parameters<typeof RecordingView.DEFAULT_VIEW>[0] = {
        breakpointIndexes: new Set(),
        builtInConverters: [],
        converterId: Models.ConverterIds.ConverterIds.JSON,
        currentError: null,
        currentStep: null,
        editorState: null,
        extensionConverters: [],
        isRecording: false,
        isTitleInvalid: false,
        lastReplayResult: null,
        recorderSettings: null,
        recording: {title: 'Recording', steps},
        recordingTogglingInProgress: false,
        replayAllowed: true,
        replayExtensions: [],
        replaySettingsExpanded: false,
        replayState: {isPlaying: false, isPausedOnBreakpoint: false},
        sections: Models.Section.buildSections(steps),
        selectedStep: null,
        settings: null,
        showCodeView: false,
        onAddAssertion: noop,
        onRecordingFinished: noop,
        getSectionState: () => StepView.State.DEFAULT,
        getStepState: () => StepView.State.DEFAULT,
        onAbortReplay: noop,
        onMeasurePerformanceClick: noop,
        onTogglePlaying: noop,
        onCodeFormatChange: noop,
        onCopyStep: noop,
        onEditTitleButtonClick: noop,
        onNetworkConditionsChange: noop,
        onReplaySettingsKeydown: noop,
        onStepClick: noop,
        onStepHover: noop,
        onTimeoutInput: noop,
        onTitleBlur: noop,
        onTitleInputKeyDown: noop,
        onToggleReplaySettings: noop,
        onWrapperClick: noop,
        showCodeToggle: noop,
        ...overrides,
      };
      const target = document.createElement('div');
      RecordingView.DEFAULT_VIEW(input, {}, target);
      return [...target.querySelectorAll<HTMLElement>('devtools-widget')]
          .map(element => UI.Widget.widgetConfigs.get(element))
          .filter(config => config?.widgetClass === StepView.StepView)
          .map(config => config?.widgetParams as Partial<StepView.StepView>);
    }

    it('renders the sections with their screenshots', async () => {
      await renderRecordingView(600);
      await assertScreenshot('recorder/RecordingView_sections.png');
    });

    it('hides the screenshots and wraps the settings without dangling separators in narrow panels', async () => {
      await renderRecordingView(360, {withSettings: true});
      await assertScreenshot('recorder/RecordingView_narrow.png');
    });

    it('renders an expanded step', async () => {
      const component = await renderRecordingView(600);
      const stepView =
          component.contentElement.querySelectorAll<UI.Widget.WidgetElement<StepView.StepView>>('.step-view-widget')[2]
              .getWidget();
      assert.exists(stepView);
      stepView.showDetails = true;
      stepView.isSelected = true;
      await waitForRendering(component);
      await assertScreenshot('recorder/RecordingView_expanded.png');
    });

    it('draws the timeline after a failed step as an error', async () => {
      await renderRecordingView(600, {currentError: new Error('Timed out')});
      await assertScreenshot('recorder/RecordingView_error.png');
    });

    it('only selects sections that are started by the selected step', () => {
      const steps = makeSteps();
      const sections = Models.Section.buildSections(steps);
      // The rows are: section (started by the navigation), click, change, click, section (not started by a step), key
      // down.
      assert.lengthOf(sections, 2);
      assert.strictEqual(sections[0].causingStep, steps[0]);
      assert.isUndefined(sections[1].causingStep);

      const getSelectedStates = (selectedStep: Models.Schema.Step|null): Array<boolean|undefined> =>
          renderView({recording: {title: 'Recording', steps}, sections, selectedStep}).map(params => params.isSelected);

      // A section that is not started by a step must not be selected while nothing is selected.
      assert.deepEqual(getSelectedStates(null), [false, false, false, false, false, false]);
      assert.deepEqual(getSelectedStates(steps[0]), [true, false, false, false, false, false]);
      assert.deepEqual(getSelectedStates(steps[2]), [false, false, true, false, false, false]);
      assert.deepEqual(getSelectedStates(steps[3]), [false, false, false, true, false, false]);
    });

    it('scrolls to the last step including steps that are not rendered yet', async () => {
      const component = await renderRecordingView(600, {height: 300});
      const stepsPane = component.contentElement.querySelector('.steps-pane');
      assert.exists(stepsPane);
      assert.strictEqual(stepsPane.scrollTop, 0);

      await component.scrollToBottom();
      const maxScrollTop = stepsPane.scrollHeight - stepsPane.clientHeight;
      assert.isAbove(maxScrollTop, 0);
      assert.closeTo(stepsPane.scrollTop, maxScrollTop, 1);

      const steps = [...component.recording.steps, {type: Models.Schema.StepType.KeyUp, key: 'Enter'} as const];
      component.recording = {...component.recording, steps};
      component.sections = Models.Section.buildSections(steps);
      component.requestUpdate();
      await component.scrollToBottom();
      assert.isAbove(stepsPane.scrollTop, maxScrollTop);
      assert.closeTo(stepsPane.scrollTop, stepsPane.scrollHeight - stepsPane.clientHeight, 1);
    });
  });
});
