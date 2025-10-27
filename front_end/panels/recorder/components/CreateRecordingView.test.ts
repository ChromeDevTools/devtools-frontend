// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertScreenshot, renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {
  describeWithEnvironment,
  setupActionRegistry,
} from '../../../testing/EnvironmentHelpers.js';
import {
  createViewFunctionStub,
  type ViewFunctionStub,
} from '../../../testing/ViewFunctionHelpers.js';
import * as Models from '../models/models.js';

import * as Components from './components.js';

describeWithEnvironment('CreateRecordingView', () => {
  setupActionRegistry();

  const views: Components.CreateRecordingView.CreateRecordingView[] = [];

  afterEach(() => {
    // Unregister global listeners in willHide to prevent leaks.
    for (const view of views) {
      view.willHide();
    }
  });

  async function createView(
      params?: {
        onRecordingStarted:
            (data: {name: string, selectorTypesToRecord: Models.Schema.SelectorType[], selectorAttribute?: string}) =>
                void,
        recorderSettings?: Models.RecorderSettings.RecorderSettings,
      },
      output?: Components.CreateRecordingView.ViewOutput):
      Promise<[
        ViewFunctionStub<typeof Components.CreateRecordingView.CreateRecordingView>,
        Components.CreateRecordingView.CreateRecordingView
      ]> {
    const view = createViewFunctionStub(Components.CreateRecordingView.CreateRecordingView, output);
    const component = new Components.CreateRecordingView.CreateRecordingView(undefined, view);
    component.recorderSettings = params?.recorderSettings ?? new Models.RecorderSettings.RecorderSettings();
    if (params?.onRecordingStarted) {
      component.onRecordingStarted = params?.onRecordingStarted;
    }
    component.wasShown();
    views.push(component);
    await view.nextInput;
    return [view, component];
  }

  it('starts a recording if data is correct', async () => {
    const recordingStartedStub = sinon.stub();
    const [view] = await createView({
      onRecordingStarted: recordingStartedStub,
    });
    view.input.startRecording('test', [Models.Schema.SelectorType.CSS], 'test-attr');
    sinon.assert.calledOnceWithExactly(recordingStartedStub, {
      selectorTypesToRecord: [Models.Schema.SelectorType.CSS],
      selectorAttribute: 'test-attr',
      name: 'test',
    });
  });

  it('renders an error if the name is empty', async () => {
    const recordingStartedStub = sinon.stub();
    const [view] = await createView({
      onRecordingStarted: recordingStartedStub,
    });
    view.input.startRecording('', [Models.Schema.SelectorType.CSS], 'test-attr');
    const input = await view.nextInput;
    assert.deepEqual(input.error?.message, 'Recording name is required');
    sinon.assert.notCalled(recordingStartedStub);
  });

  it('renders an error if the selector attributes are turned off', async () => {
    const recordingStartedStub = sinon.stub();
    const [view] = await createView({
      onRecordingStarted: recordingStartedStub,
    });
    view.input.startRecording('test', [], 'test-attr');
    const input = await view.nextInput;
    assert.deepEqual(
        input.error?.message,
        'You must choose CSS, Pierce, or XPath as one of your options. Only these selectors are guaranteed to be recorded since ARIA and text selectors may not be unique.');
    sinon.assert.notCalled(recordingStartedStub);
  });

  describe('view', () => {
    it('renders default view', async () => {
      const target = document.createElement('div');
      renderElementIntoDOM(target);
      Components.CreateRecordingView.DEFAULT_VIEW(
          {
            defaultRecordingName: 'test',
            startRecording: sinon.stub(),
            onRecordingCancelled: sinon.stub(),
            resetError: sinon.stub(),
          },
          {}, target);
      await assertScreenshot('CreateRecordingView/default-view.png');
    });
    it('renders the error view', async () => {
      const target = document.createElement('div');
      renderElementIntoDOM(target);
      Components.CreateRecordingView.DEFAULT_VIEW(
          {
            defaultRecordingName: 'test',
            error: new Error('error'),
            startRecording: sinon.stub(),
            onRecordingCancelled: sinon.stub(),
            resetError: sinon.stub(),
          },
          {}, target);
      await assertScreenshot('CreateRecordingView/error-view.png');
    });
  });
});
