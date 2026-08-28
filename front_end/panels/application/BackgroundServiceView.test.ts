// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {assertScreenshot, dispatchClickEvent, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment, registerActions} from '../../testing/EnvironmentHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Resources from './application.js';

describeWithEnvironment('BackgroundServiceView', () => {
  const testKey = 'test-storage-key';
  const serviceName = Protocol.BackgroundService.ServiceName.BackgroundFetch;
  let target: SDK.Target.Target;
  let backgroundServiceModel: Resources.BackgroundServiceModel.BackgroundServiceModel|null;
  let manager: SDK.StorageKeyManager.StorageKeyManager|null|undefined;
  let securityOriginManager: SDK.SecurityOriginManager.SecurityOriginManager|null|undefined;
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
    securityOriginManager = target.model(SDK.SecurityOriginManager.SecurityOriginManager);
    registerActions([{
      actionId: 'background-service.toggle-recording',
      category: UI.ActionRegistration.ActionCategory.BACKGROUND_SERVICES,
      title: () => 'mock' as Platform.UIString.LocalizedString,
      toggleable: true,
      iconClass: UI.ActionRegistration.IconClass.START_RECORDING,
      toggledIconClass: UI.ActionRegistration.IconClass.STOP_RECORDING,
      async loadActionDelegate() {
        return new Resources.BackgroundServiceView.ActionDelegate();
      },
    }]);

    sinon.stub(UI.ShortcutRegistry.ShortcutRegistry, 'instance').returns({
      shortcutTitleForAction: () => {},
      shortcutsForAction: () => [new UI.KeyboardShortcut.KeyboardShortcut(
          [{key: UI.KeyboardShortcut.Keys.Ctrl.code, name: 'Ctrl'}], '', UI.KeyboardShortcut.Type.DEFAULT_SHORTCUT)],
    } as unknown as UI.ShortcutRegistry.ShortcutRegistry);
    assert.exists(backgroundServiceModel);
    view = new Resources.BackgroundServiceView.BackgroundServiceView();
    view.serviceName = serviceName;
    view.model = backgroundServiceModel;
    renderElementIntoDOM(view, {width: 1100, height: 800, includeCommonStyles: true});
  });

  function assertEmptyState(expectedHeader: string, expectedDescription?: string): ShadowRoot {
    const emptyWidget = view.contentElement.querySelector('.empty-widget-container');
    assert.exists(emptyWidget);
    const shadowRoot = emptyWidget.shadowRoot;
    assert.exists(shadowRoot);
    const header = shadowRoot.querySelector('.empty-state-header')?.textContent;
    assert.deepEqual(header, expectedHeader);
    if (expectedDescription !== undefined) {
      const description = shadowRoot.querySelector('.empty-state-description')?.textContent;
      assert.deepEqual(description, expectedDescription);
    }
    return shadowRoot;
  }

  it('updates event list when main storage key changes', async () => {
    assert.exists(backgroundServiceModel);
    assert.exists(manager);
    backgroundServiceModel.backgroundServiceEventReceived({backgroundServiceEvent: BACKGROUND_SERVICE_EVENT});
    manager.updateStorageKeys(new Set([testKey]));
    manager.setMainStorageKey(testKey);

    await view.updateComplete;
    const dataRow = view.contentElement.querySelector('devtools-data-grid table tr:nth-of-type(2)');
    assert.exists(dataRow);
    const tds = dataRow.querySelectorAll('td');

    const expectedData = ['Event1', testKey, 'Instance1'];
    const actualData = [
      tds[2].textContent,
      tds[4].textContent,
      tds[6].textContent,
    ];
    assert.deepEqual(actualData, expectedData);
  });

  it('shows placeholder text to select a value if events have been captured', async () => {
    assert.exists(backgroundServiceModel);
    assert.exists(manager);
    backgroundServiceModel.backgroundServiceEventReceived({backgroundServiceEvent: BACKGROUND_SERVICE_EVENT});
    manager.updateStorageKeys(new Set([testKey]));
    manager.setMainStorageKey(testKey);

    await view.updateComplete;
    assertEmptyState('No event selected', 'Select an event to view its metadata');
  });

  it('shows placeholder text', async () => {
    await view.updateComplete;
    assertEmptyState(
        'No recording yet',
        'Start to debug background services by using the "Start recording events" button or by pressing Ctrl.Learn more');
  });

  it('Triggers record on button click', async () => {
    await view.updateComplete;
    assertEmptyState('No recording yet');
    const recordButton = view.contentElement.querySelector('devtools-button.start-recording-button');
    assert.exists(recordButton);
    assert.deepEqual(recordButton.textContent?.trim(), 'Start recording events');

    const recordingSpy = sinon.spy(view, 'toggleRecording');
    dispatchClickEvent(recordButton);
    sinon.assert.calledOnce(recordingSpy);
  });

  it('informs developer about current recording', async () => {
    backgroundServiceModel?.recordingStateChanged(
        {isRecording: true, service: Protocol.BackgroundService.ServiceName.BackgroundFetch});

    await view.updateComplete;
    assertEmptyState('Recording background fetch activity…',
                     'DevTools will record all background fetch activity for up to 3 days, even when closed.');
  });

  it('clears preview when view is cleared', async () => {
    backgroundServiceModel?.backgroundServiceEventReceived({backgroundServiceEvent: BACKGROUND_SERVICE_EVENT});
    manager?.updateStorageKeys(new Set([testKey]));
    manager?.setMainStorageKey(testKey);

    await view.updateComplete;
    const dataRow = view.contentElement.querySelector('devtools-data-grid table tr:nth-of-type(2)');
    assert.exists(dataRow);
    dataRow.dispatchEvent(new Event('select'));
    await view.updateComplete;

    // Metadata is shown.
    assert.isNull(view.contentElement.querySelector('.empty-widget-container'));

    const toolbar = view.contentElement.querySelector('devtools-toolbar');
    assert.exists(toolbar);
    const clearButton = toolbar.querySelector('[title="Clear"]');
    assert.exists(clearButton);
    dispatchClickEvent(clearButton);
    await view.updateComplete;

    // Preview is cleared, showing general empty state text.
    assertEmptyState('No recording yet');
  });

  it('shows metadata in preview and renders a screenshot', async () => {
    backgroundServiceModel?.backgroundServiceEventReceived({backgroundServiceEvent: BACKGROUND_SERVICE_EVENT});

    const eventWithMetadata = {
      ...BACKGROUND_SERVICE_EVENT,
      eventMetadata: [{key: 'key', value: 'value'}],
      instanceId: 'Instance2',
      eventName: 'Event2',
    };
    backgroundServiceModel?.backgroundServiceEventReceived({backgroundServiceEvent: eventWithMetadata});
    manager?.updateStorageKeys(new Set([testKey]));
    manager?.setMainStorageKey(testKey);

    await view.updateComplete;
    const rows = view.contentElement.querySelectorAll('devtools-data-grid table tr');

    rows[1].dispatchEvent(new Event('select'));
    await view.updateComplete;

    let metadata = view.contentElement.querySelector('.background-service-metadata-entry');
    assert.deepEqual(metadata?.textContent?.trim(), 'No metadata for this event');

    rows[2].dispatchEvent(new Event('select'));
    await view.updateComplete;
    metadata = view.contentElement.querySelector('.background-service-metadata-entry');
    assert.deepEqual(metadata?.textContent?.trim().replace(/\s+/g, ' '), 'key: value');

    // Focus the datagrid to ensure consistent focused styling across test runs
    const dataGrid = view.contentElement.querySelector('devtools-data-grid');
    if (dataGrid) {
      (dataGrid as HTMLElement).focus();
    }

    await assertScreenshot('application/background_service_view.png');
  });

  it('shows events in the grid and filters by service and origin', async () => {
    assert.exists(backgroundServiceModel);
    assert.exists(securityOriginManager);

    backgroundServiceModel.enable(Protocol.BackgroundService.ServiceName.BackgroundSync);
    securityOriginManager.updateSecurityOrigins(new Set(['http://127.0.0.1:8000']));

    // Initially grid is empty.
    let dataRows = view.contentElement.querySelectorAll('devtools-data-grid table tr:not(:first-child)');
    assert.lengthOf(dataRows, 0);

    // Event for BackgroundFetch from matching origin.
    const event1: Protocol.BackgroundService.BackgroundServiceEvent = {
      timestamp: 1556889085,  // 2019-05-03 14:11:25.000.
      origin: 'http://127.0.0.1:8000/',
      serviceWorkerRegistrationId: '42' as Protocol.ServiceWorker.RegistrationID,
      service: Protocol.BackgroundService.ServiceName.BackgroundFetch,
      eventName: 'Event1',
      instanceId: 'Instance1',
      eventMetadata: [],
      storageKey: 'testKey',
    };
    backgroundServiceModel.backgroundServiceEventReceived({backgroundServiceEvent: event1});
    await view.updateComplete;

    dataRows = view.contentElement.querySelectorAll('devtools-data-grid table tr:not(:first-child)');
    assert.lengthOf(dataRows, 1);
    const getRowValues = (row: Element) => Array.from(row.querySelectorAll('td')).map(td => td.textContent);
    assert.deepEqual(getRowValues(dataRows[0]), [
      '1',
      UI.UIUtils.formatTimestamp(1556889085 * 1000, true),
      'Event1',
      'http://127.0.0.1:8000/',
      'testKey',
      '',
      'Instance1',
    ]);

    // Event from a different service is ignored.
    const eventDifferentService: Protocol.BackgroundService.BackgroundServiceEvent = {
      timestamp: 1556889085,
      origin: 'http://127.0.0.1:8000/',
      serviceWorkerRegistrationId: '42' as Protocol.ServiceWorker.RegistrationID,
      service: Protocol.BackgroundService.ServiceName.BackgroundSync,
      eventName: 'Event1',
      instanceId: 'Instance2',
      eventMetadata: [],
      storageKey: 'testKey',
    };
    backgroundServiceModel.backgroundServiceEventReceived({backgroundServiceEvent: eventDifferentService});
    await view.updateComplete;

    dataRows = view.contentElement.querySelectorAll('devtools-data-grid table tr:not(:first-child)');
    assert.lengthOf(dataRows, 1);

    // Event from a different origin is ignored by default.
    const eventDifferentOrigin: Protocol.BackgroundService.BackgroundServiceEvent = {
      timestamp: 1556889085,
      origin: 'http://127.0.0.1:8080/',
      serviceWorkerRegistrationId: '42' as Protocol.ServiceWorker.RegistrationID,
      service: Protocol.BackgroundService.ServiceName.BackgroundFetch,
      eventName: 'Event2',
      instanceId: 'Instance1',
      eventMetadata: [],
      storageKey: 'testKey',
    };
    backgroundServiceModel.backgroundServiceEventReceived({backgroundServiceEvent: eventDifferentOrigin});
    await view.updateComplete;

    dataRows = view.contentElement.querySelectorAll('devtools-data-grid table tr:not(:first-child)');
    assert.lengthOf(dataRows, 1);

    // The event from a different origin should show up when the origin checkbox is checked.
    const originCheckbox =
        view.contentElement.querySelector<HTMLInputElement>('label.checkbox-label input[type="checkbox"]');
    assert.exists(originCheckbox);
    originCheckbox.checked = true;
    originCheckbox.dispatchEvent(new Event('change'));
    await view.updateComplete;

    dataRows = view.contentElement.querySelectorAll('devtools-data-grid table tr:not(:first-child)');
    assert.lengthOf(dataRows, 2);
    assert.deepEqual(getRowValues(dataRows[0]), [
      '1',
      UI.UIUtils.formatTimestamp(1556889085 * 1000, true),
      'Event1',
      'http://127.0.0.1:8000/',
      'testKey',
      '',
      'Instance1',
    ]);
    assert.deepEqual(getRowValues(dataRows[1]), [
      '2',
      UI.UIUtils.formatTimestamp(1556889085 * 1000, true),
      'Event2',
      'http://127.0.0.1:8080/',
      'testKey',
      '',
      'Instance1',
    ]);

    // Unchecking the origin checkbox removes it again.
    originCheckbox.checked = false;
    originCheckbox.dispatchEvent(new Event('change'));
    await view.updateComplete;

    dataRows = view.contentElement.querySelectorAll('devtools-data-grid table tr:not(:first-child)');
    assert.lengthOf(dataRows, 1);
    assert.deepEqual(getRowValues(dataRows[0]), [
      '1',
      UI.UIUtils.formatTimestamp(1556889085 * 1000, true),
      'Event1',
      'http://127.0.0.1:8000/',
      'testKey',
      '',
      'Instance1',
    ]);

    // Clicking the clear button clears events.
    const clearButton = view.contentElement.querySelector('devtools-button[title="Clear"]');
    assert.exists(clearButton);
    dispatchClickEvent(clearButton);
    await view.updateComplete;

    dataRows = view.contentElement.querySelectorAll('devtools-data-grid table tr:not(:first-child)');
    assert.lengthOf(dataRows, 0);
    assertEmptyState('No recording yet');
  });
});
