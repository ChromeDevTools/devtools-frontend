// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, it} from 'mocha';
import sinon from 'sinon';

import {
  describeWithEnvironment,
  setupActionRegistry,
} from '../../testing/EnvironmentHelpers.js';
import {
  createViewFunctionStub,
  type ViewFunctionStub,
} from '../../testing/ViewFunctionHelpers.js';

import {RecordingListView} from './recorder.js';

describeWithEnvironment('RecordingListView', () => {
  setupActionRegistry();

  const views: RecordingListView.RecordingListView[] = [];

  afterEach(() => {
    // Unregister global listeners in willHide to prevent leaks.
    for (const view of views) {
      view.willHide();
    }
  });

  async function createView():
      Promise<[ViewFunctionStub<typeof RecordingListView.RecordingListView>, RecordingListView.RecordingListView]> {
    const view = createViewFunctionStub(RecordingListView.RecordingListView);
    const component = new RecordingListView.RecordingListView(undefined, view);
    component.recordings = [{storageName: 'storage-test', name: 'test'}];
    component.replayAllowed = true;
    component.wasShown();
    views.push(component);
    return [view, component];
  }

  it('should open a recording on Enter', async () => {
    const [view, component] = await createView();
    const onOpenRecordingSpy = sinon.spy();
    component.onOpenRecording = onOpenRecordingSpy;

    view.input.onKeyDown('storage-test', new KeyboardEvent('keydown', {key: 'Enter'}));

    sinon.assert.calledOnce(onOpenRecordingSpy);
    assert.strictEqual(onOpenRecordingSpy.firstCall.args[0], 'storage-test');
  });

  it('should delete a recording', async () => {
    const [view, component] = await createView();
    const onDeleteRecordingSpy = sinon.spy();
    component.onDeleteRecording = onDeleteRecordingSpy;

    view.input.onDeleteClick('storage-test', new MouseEvent('click'));

    sinon.assert.calledOnce(onDeleteRecordingSpy);
    assert.strictEqual(onDeleteRecordingSpy.firstCall.args[0], 'storage-test');
  });
});
