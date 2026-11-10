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
import {RecordingView, type StepView} from './recorder.js';

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

    async function renderRecordingView(width: number,
                                       options: {currentError?: Error} = {}): Promise<RecordingView.RecordingView> {
      const steps = makeSteps();
      const sections = Models.Section.buildSections(steps);
      sections[0].screenshot = screenshot;
      const component = new RecordingView.RecordingView();
      Object.assign(component, {
        recording: {title: 'Recording', steps},
        sections,
        currentStep: options.currentError ? steps[2] : undefined,
        currentError: options.currentError,
        recorderSettings: new Models.RecorderSettings.RecorderSettings(),
        replayAllowed: true,
        builtInConverters: [new Converters.JSONConverter.JSONConverter('  ')],
      });
      renderElementIntoDOM(component, {width, height: 420, includeCommonStyles: true});
      await waitForRendering(component);
      return component;
    }

    it('renders the sections with their screenshots', async () => {
      await renderRecordingView(600);
      await assertScreenshot('recorder/RecordingView_sections.png');
    });

    it('hides the screenshots in narrow panels', async () => {
      await renderRecordingView(360);
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
  });
});
