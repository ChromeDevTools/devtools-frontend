// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Host from '../../core/host/host.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {
  describeWithEnvironment,
  setupActionRegistry,
} from '../../testing/EnvironmentHelpers.js';
import {expectCall} from '../../testing/ExpectStubCall.js';
import {createViewFunctionStub, type ViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';

import * as Converters from './converters/converters.js';
import * as Models from './models/models.js';
import {RecordingView} from './recorder.js';

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
    const codeToggle = target.querySelector('devtools-button.show-code');
    if (!(codeToggle instanceof HTMLElement)) {
      assert.fail('Code toggle button was not rendered');
    }
    assert.strictEqual(codeToggle.getAttribute('aria-controls'), 'recording-code-pane');
    assert.strictEqual(codeToggle.getAttribute('aria-expanded'), 'false');
    assert.strictEqual(target.querySelector('[slot="main"]')?.getAttribute('role'), 'region');
    assert.strictEqual(target.querySelector('[slot="main"]')?.getAttribute('aria-labelledby'),
                       'recording-steps-heading');
    assert.strictEqual(target.querySelector('#recording-steps-heading')?.textContent, 'Steps');
    codeToggle.focus();

    RecordingView.DEFAULT_VIEW(openedInput, {}, target);

    assert.strictEqual(target.querySelector('devtools-button.show-code'), codeToggle);
    assert.strictEqual(document.activeElement, codeToggle);
    assert.strictEqual(codeToggle.getAttribute('aria-expanded'), 'true');
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
});
