// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import {
  describeWithEnvironment,
  setupActionRegistry,
} from '../../../testing/EnvironmentHelpers.js';
import {expectCall} from '../../../testing/ExpectStubCall.js';
import {createViewFunctionStub, type ViewFunctionStub} from '../../../testing/ViewFunctionHelpers.js';
import * as Menus from '../../../ui/components/menus/menus.js';
import * as Converters from '../converters/converters.js';
import * as Models from '../models/models.js';

import * as Components from './components.js';

describeWithEnvironment('RecordingView', () => {
  setupActionRegistry();

  const step = {type: Models.Schema.StepType.Scroll as const};
  const section = {title: 'test', steps: [step], url: 'https://example.com'};
  const userFlow = {title: 'test', steps: [step]};
  const recorderSettingsMock = {
    preferredCopyFormat: Models.ConverterIds.ConverterIds.JSON,
  } as Models.RecorderSettings.RecorderSettings;
  const views: Components.RecordingView.RecordingView[] = [];

  afterEach(() => {
    // Unregister global listeners in willHide to prevent leaks.
    for (const view of views) {
      view.willHide();
    }
  });

  async function createView(output?: Components.RecordingView.ViewOutput): Promise<
      [ViewFunctionStub<typeof Components.RecordingView.RecordingView>, Components.RecordingView.RecordingView]> {
    const view = createViewFunctionStub(Components.RecordingView.RecordingView, output);
    const component = new Components.RecordingView.RecordingView(undefined, view);
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
    view.input.onStepHover({
      target: {
        step,
      },
    } as unknown as MouseEvent);
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

    view.input.showCodeToggle();
    {
      const input = await view.nextInput;
      assert.isNotOk(input.showCodeView);
    }
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
    view.input.onStepClick({
      target: {
        step,
      },
      stopPropagation: sinon.stub(),
    } as unknown as MouseEvent);

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

  it('should copy a step to clipboard via custom event', async () => {
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
    const event = new Components.StepView.CopyStepEvent(step);

    view.input.onCopyStep(event);

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

    view.input.onCodeFormatChange(
        new Menus.SelectMenu.SelectMenuItemSelectedEvent(Models.ConverterIds.ConverterIds.REPLAY));
    {
      const input = await view.nextInput;
      assert.strictEqual(input.recorderSettings?.preferredCopyFormat, Models.ConverterIds.ConverterIds.REPLAY);
      assert.strictEqual(recorderSettingsMock.preferredCopyFormat, Models.ConverterIds.ConverterIds.REPLAY);
    }
  });
});
