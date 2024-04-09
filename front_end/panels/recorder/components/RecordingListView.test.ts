// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {dispatchClickEvent, dispatchKeyDownEvent, renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {
  describeWithEnvironment,
  setupActionRegistry,
} from '../../../testing/EnvironmentHelpers.js';
import * as Coordinator from '../../../ui/components/render_coordinator/render_coordinator.js';

import * as Components from './components.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

describeWithEnvironment('RecordingListView', () => {
  setupActionRegistry();

  it('should open a recording on Enter', async () => {
    const view = new Components.RecordingListView.RecordingListView();
    renderElementIntoDOM(view);
    view.recordings = [{storageName: 'storage-test', name: 'test'}];
    await coordinator.done();
    const recording = view.shadowRoot?.querySelector('.row') as HTMLDivElement;
    assert.ok(recording);
    const eventSent = new Promise<Components.RecordingListView.OpenRecordingEvent>(
        resolve => {
          view.addEventListener('openrecording', resolve, {once: true});
        },
    );
    dispatchKeyDownEvent(recording, {key: 'Enter'});
    const event = await eventSent;
    assert.strictEqual(event.storageName, 'storage-test');
  });

  it('should delete a recording', async () => {
    const view = new Components.RecordingListView.RecordingListView();
    renderElementIntoDOM(view);
    view.recordings = [{storageName: 'storage-test', name: 'test'}];
    await coordinator.done();
    const deleteButton = view.shadowRoot?.querySelector(
                             '.delete-recording-button',
                             ) as HTMLButtonElement;
    assert.ok(deleteButton);
    const eventSent = new Promise<Components.RecordingListView.DeleteRecordingEvent>(
        resolve => {
          view.addEventListener('deleterecording', resolve, {once: true});
        },
    );
    dispatchClickEvent(deleteButton);
    const event = await eventSent;
    assert.strictEqual(event.storageName, 'storage-test');
  });

  it('should not open a recording on Enter on the delete button', async () => {
    const view = new Components.RecordingListView.RecordingListView();
    renderElementIntoDOM(view);
    view.recordings = [{storageName: 'storage-test', name: 'test'}];
    await coordinator.done();
    const deleteButton = view.shadowRoot?.querySelector(
                             '.delete-recording-button',
                             ) as HTMLDivElement;
    assert.ok(deleteButton);
    let forceResolve: Function|undefined;
    const eventSent = new Promise<Components.RecordingListView.OpenRecordingEvent>(
        resolve => {
          forceResolve = resolve;
          view.addEventListener('openrecording', resolve, {once: true});
        },
    );
    dispatchKeyDownEvent(deleteButton, {key: 'Enter', bubbles: true});
    const maybeEvent = await Promise.race([
      eventSent,
      new Promise(resolve => queueMicrotask(() => resolve('timeout'))),
    ]);
    assert.strictEqual(maybeEvent, 'timeout');
    forceResolve?.();
  });
});
