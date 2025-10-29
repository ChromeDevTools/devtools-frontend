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

  const widgets: Components.CreateRecordingView.CreateRecordingView[] = [];

  afterEach(() => {
    // Unregister global listeners in willHide to prevent leaks.
    for (const widget of widgets) {
      widget.willHide();
    }
  });

  async function createWidget(
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
    widgets.push(component);
    await view.nextInput;
    return [view, component];
  }

  it('starts a recording if data is correct', async () => {
    const recordingStartedStub = sinon.stub();
    const [view] = await createWidget({
      onRecordingStarted: recordingStartedStub,
    });
    view.input.onUpdate({name: 'test'});
    view.input.onUpdate({selectorAttribute: 'test-attr'});
    view.input.onUpdate({selectorType: Models.Schema.SelectorType.CSS, checked: true});
    view.input.onUpdate({selectorType: Models.Schema.SelectorType.ARIA, checked: false});
    view.input.onUpdate({selectorType: Models.Schema.SelectorType.Pierce, checked: false});
    view.input.onUpdate({selectorType: Models.Schema.SelectorType.Text, checked: false});
    view.input.onUpdate({selectorType: Models.Schema.SelectorType.XPath, checked: false});
    view.input.onRecordingStarted();
    sinon.assert.calledOnceWithExactly(recordingStartedStub, {
      selectorTypesToRecord: [Models.Schema.SelectorType.CSS],
      selectorAttribute: 'test-attr',
      name: 'test',
    });
  });

  it('renders an error if the name is empty', async () => {
    const recordingStartedStub = sinon.stub();
    const [view] = await createWidget({
      onRecordingStarted: recordingStartedStub,
    });
    view.input.onUpdate({name: ''});
    view.input.onUpdate({selectorAttribute: 'test-attr'});
    view.input.onUpdate({selectorType: Models.Schema.SelectorType.CSS, checked: true});
    view.input.onRecordingStarted();
    const input = await view.nextInput;
    assert.deepEqual(input.error?.message, 'Recording name is required');
    sinon.assert.notCalled(recordingStartedStub);
  });

  it('renders an error if the selector attributes are turned off', async () => {
    const recordingStartedStub = sinon.stub();
    const [view] = await createWidget({
      onRecordingStarted: recordingStartedStub,
    });
    view.input.onUpdate({name: 'test'});
    view.input.onUpdate({selectorAttribute: 'test-attr'});
    view.input.onUpdate({selectorType: Models.Schema.SelectorType.CSS, checked: false});
    view.input.onUpdate({selectorType: Models.Schema.SelectorType.ARIA, checked: false});
    view.input.onUpdate({selectorType: Models.Schema.SelectorType.Pierce, checked: false});
    view.input.onUpdate({selectorType: Models.Schema.SelectorType.Text, checked: false});
    view.input.onUpdate({selectorType: Models.Schema.SelectorType.XPath, checked: false});
    view.input.onRecordingStarted();
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
            name: 'test',
            selectorAttribute: '',
            selectorTypes: [
              {selectorType: Models.Schema.SelectorType.CSS, checked: false},
              {selectorType: Models.Schema.SelectorType.ARIA, checked: false},
              {selectorType: Models.Schema.SelectorType.Text, checked: false},
              {selectorType: Models.Schema.SelectorType.XPath, checked: false},
              {selectorType: Models.Schema.SelectorType.Pierce, checked: false}
            ],
            onRecordingStarted: sinon.stub(),
            onRecordingCancelled: sinon.stub(),
            onErrorReset: sinon.stub(),
            onUpdate: sinon.stub(),
          },
          {}, target);
      await assertScreenshot('CreateRecordingView/default-view.png');
    });
    it('renders the error view', async () => {
      const target = document.createElement('div');
      renderElementIntoDOM(target);
      Components.CreateRecordingView.DEFAULT_VIEW(
          {
            name: 'test',
            selectorAttribute: '',
            selectorTypes: [
              {selectorType: Models.Schema.SelectorType.CSS, checked: false},
              {selectorType: Models.Schema.SelectorType.ARIA, checked: false},
              {selectorType: Models.Schema.SelectorType.Text, checked: false},
              {selectorType: Models.Schema.SelectorType.XPath, checked: false},
              {selectorType: Models.Schema.SelectorType.Pierce, checked: false}
            ],
            error: new Error('error'),
            onRecordingStarted: sinon.stub(),
            onRecordingCancelled: sinon.stub(),
            onErrorReset: sinon.stub(),
            onUpdate: sinon.stub(),
          },
          {}, target);
      await assertScreenshot('CreateRecordingView/error-view.png');
    });
  });
});
