// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {dispatchClickEvent} from '../../testing/DOMHelpers.js';
import {createTarget, registerActions} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Resources from './application.js';

describeWithMockConnection('BackgroundServiceView', () => {
  const testKey = 'test-storage-key';
  const serviceName = Protocol.BackgroundService.ServiceName.BackgroundFetch;
  let target: SDK.Target.Target;
  let backgroundServiceModel: Resources.BackgroundServiceModel.BackgroundServiceModel|null;
  let manager: SDK.StorageKeyManager.StorageKeyManager|null|undefined;
  let view: Resources.BackgroundServiceView.BackgroundServiceView;

  const BACKGROUND_SERVICE_EVENT = {
    timestamp: 1556889085,  // 2019-05-03 14:11:25.000.
    origin: '',
    storageKey: testKey,
    serviceWorkerRegistrationId: '42' as Protocol.ServiceWorker.RegistrationID,  // invalid.
    service: serviceName,
    eventName: 'Event1',
    instanceId: 'Instance1',
    eventMetadata: [],
  };

  beforeEach(() => {
    target = createTarget();
    backgroundServiceModel = target.model(Resources.BackgroundServiceModel.BackgroundServiceModel);
    manager = target.model(SDK.StorageKeyManager.StorageKeyManager);
    registerActions([{
      actionId: 'background-service.toggle-recording',
      category: UI.ActionRegistration.ActionCategory.BACKGROUND_SERVICES,
      title: () => 'mock' as Platform.UIString.LocalizedString,
      toggleable: true,
    }]);

    sinon.stub(UI.ShortcutRegistry.ShortcutRegistry, 'instance').returns({
      shortcutTitleForAction: () => {},
      shortcutsForAction: () => [new UI.KeyboardShortcut.KeyboardShortcut(
          [{key: UI.KeyboardShortcut.Keys.Ctrl.code, name: 'Ctrl'}], '', UI.KeyboardShortcut.Type.DEFAULT_SHORTCUT)],
    } as unknown as UI.ShortcutRegistry.ShortcutRegistry);
    assert.exists(backgroundServiceModel);
    view = new Resources.BackgroundServiceView.BackgroundServiceView(serviceName, backgroundServiceModel);
  });

  it('updates event list when main storage key changes', () => {
    assert.exists(backgroundServiceModel);
    assert.exists(manager);
    backgroundServiceModel.backgroundServiceEventReceived({backgroundServiceEvent: BACKGROUND_SERVICE_EVENT});
    manager.updateStorageKeys(new Set([testKey]));
    manager.setMainStorageKey(testKey);

    const dataRow = view.getDataGrid().dataTableBody.getElementsByClassName('data-grid-data-grid-node')[0];
    const expectedData = ['Event1', testKey, 'Instance1'];
    const actualData = [
      dataRow.getElementsByClassName('event-name-column')[0].textContent,
      dataRow.getElementsByClassName('storage-key-column')[0].textContent,
      dataRow.getElementsByClassName('instance-id-column')[0].textContent,
    ];
    assert.deepEqual(actualData, expectedData);
  });

  it('shows placeholder text to select a value if events have been captured', () => {
    assert.exists(backgroundServiceModel);
    assert.exists(manager);
    backgroundServiceModel.backgroundServiceEventReceived({backgroundServiceEvent: BACKGROUND_SERVICE_EVENT});
    manager.updateStorageKeys(new Set([testKey]));
    manager.setMainStorageKey(testKey);

    assert.isNotNull(view.contentElement.querySelector('.empty-state'));
    const header = view.contentElement.querySelector('.empty-state-header')?.textContent;
    const description = view.contentElement.querySelector('.empty-state-description')?.textContent;
    assert.deepEqual(header, 'No event selected');
    assert.deepEqual(description, 'Select an event to view its metadata');
  });

  it('shows placeholder text', () => {
    assert.isNotNull(view.contentElement.querySelector('.empty-state'));
    const header = view.contentElement.querySelector('.empty-state-header')?.textContent;
    const description = view.contentElement.querySelector('.empty-state-description')?.textContent;
    assert.deepEqual(header, 'No recording yet');
    assert.deepEqual(
        description,
        'Start to debug background services by using the "Start recording events" button or by pressing Ctrl.Learn more');
  });

  it('Triggers record on button click', () => {
    const recordButton = view.contentElement.querySelector('.empty-state devtools-button');
    Platform.assertNotNullOrUndefined(recordButton);
    assert.deepEqual(recordButton?.textContent, 'Start recording events');

    const recordingSpy = sinon.spy(view, 'toggleRecording');
    dispatchClickEvent(recordButton);
    sinon.assert.calledOnce(recordingSpy);
  });

  it('informs developer about current recording', () => {
    backgroundServiceModel?.recordingStateChanged(
        {isRecording: true, service: Protocol.BackgroundService.ServiceName.BackgroundFetch});

    assert.isNotNull(view.contentElement.querySelector('.empty-state'));
    const header = view.contentElement.querySelector('.empty-state-header')?.textContent;
    const description = view.contentElement.querySelector('.empty-state-description')?.textContent;
    assert.deepEqual(header, 'Recording background fetch activity…');
    assert.deepEqual(
        description, 'DevTools will record all background fetch activity for up to 3 days, even when closed.');
  });

  it('clears preview when view is cleared', async () => {
    backgroundServiceModel?.backgroundServiceEventReceived({backgroundServiceEvent: BACKGROUND_SERVICE_EVENT});
    manager?.updateStorageKeys(new Set([testKey]));

    await view.updateComplete;
    view.getDataGrid().asWidget().dataGrid.rootNode().children[0].select();

    // Metadata is shown.
    assert.isNull(view.contentElement.querySelector('.empty-state'));

    const toolbar = view.contentElement.querySelector('devtools-toolbar');
    assert.exists(toolbar);
    const clearButton = toolbar.querySelector('[aria-label="Clear"]');
    assert.exists(clearButton);
    dispatchClickEvent(clearButton);

    // Preview is cleared, showing general empty state text.
    assert.isNotNull(view.contentElement.querySelector('.empty-state'));
    const header = view.contentElement.querySelector('.empty-state-header')?.textContent;
    assert.deepEqual(header, 'No recording yet');
  });

  it('shows metadata in preview', async () => {
    backgroundServiceModel?.backgroundServiceEventReceived({backgroundServiceEvent: BACKGROUND_SERVICE_EVENT});

    const eventWithMetadata = {
      ...BACKGROUND_SERVICE_EVENT,
      eventMetadata: [{key: 'key', value: 'value'}],
      instanceId: 'Instance2',
      eventName: 'Event2'
    };
    backgroundServiceModel?.backgroundServiceEventReceived({backgroundServiceEvent: eventWithMetadata});
    manager?.updateStorageKeys(new Set([testKey]));

    await view.updateComplete;
    view.getDataGrid().asWidget().dataGrid.rootNode().children[0].select();
    let metadata = view.contentElement.querySelector('.background-service-metadata-entry');
    assert.deepEqual(metadata?.textContent, 'No metadata for this event');

    view.getDataGrid().asWidget().dataGrid.rootNode().children[1].select();
    metadata = view.contentElement.querySelector('.background-service-metadata-entry');
    assert.deepEqual(metadata?.textContent, 'key: value');
  });
});
