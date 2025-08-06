// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  describeWithEnvironment,
  setupActionRegistry,
} from '../../../testing/EnvironmentHelpers.js';
import {
  createViewFunctionStub,
  type ViewFunctionStub,
} from '../../../testing/ViewFunctionHelpers.js';

import * as Components from './components.js';

describeWithEnvironment('RecordingListView', () => {
  setupActionRegistry();

  const views: Components.RecordingListView.RecordingListView[] = [];

  afterEach(() => {
    // Unregister global listeners in willHide to prevent leaks.
    for (const view of views) {
      view.willHide();
    }
  });

  async function createView(output?: Components.RecordingListView.ViewOutput): Promise<[
    ViewFunctionStub<typeof Components.RecordingListView.RecordingListView>,
    Components.RecordingListView.RecordingListView
  ]> {
    const view = createViewFunctionStub(Components.RecordingListView.RecordingListView, output);
    const component = new Components.RecordingListView.RecordingListView(undefined, view);
    component.recordings = [{storageName: 'storage-test', name: 'test'}];
    component.replayAllowed = true;
    component.wasShown();
    views.push(component);
    return [view, component];
  }

  it('should open a recording on Enter', async () => {
    const [view, component] = await createView();
    const dispatchEventSpy = sinon.spy(component.contentElement, 'dispatchEvent');

    view.input.onKeyDown('storage-test', new KeyboardEvent('keydown', {key: 'Enter'}));

    sinon.assert.calledOnce(dispatchEventSpy);
    const event = dispatchEventSpy.firstCall.args[0];
    assert.instanceOf(event, Components.RecordingListView.OpenRecordingEvent);
    assert.strictEqual((event as Components.RecordingListView.OpenRecordingEvent).storageName, 'storage-test');
  });

  it('should delete a recording', async () => {
    const [view, component] = await createView();
    const dispatchEventSpy = sinon.spy(component.contentElement, 'dispatchEvent');

    view.input.onDeleteClick('storage-test', new MouseEvent('click'));

    sinon.assert.calledOnce(dispatchEventSpy);
    const event = dispatchEventSpy.firstCall.args[0];
    assert.instanceOf(event, Components.RecordingListView.DeleteRecordingEvent);
    assert.strictEqual((event as Components.RecordingListView.DeleteRecordingEvent).storageName, 'storage-test');
  });
});
