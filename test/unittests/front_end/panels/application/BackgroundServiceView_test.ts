// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as UI from '../../../../../front_end/ui/legacy/legacy.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import * as Protocol from '../../../../../front_end/generated/protocol.js';
import * as Resources from '../../../../../front_end/panels/application/application.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';

import type * as Platform from '../../../../../front_end/core/platform/platform.js';

describeWithMockConnection('BackgroundServiceView', () => {
  const testKey = 'test-storage-key';
  const serviceName = Protocol.BackgroundService.ServiceName.BackgroundFetch;
  let target: SDK.Target.Target;
  let backgroundServiceModel: Resources.BackgroundServiceModel.BackgroundServiceModel|null;
  let manager: SDK.StorageKeyManager.StorageKeyManager|null|undefined;
  let view: Resources.BackgroundServiceView.BackgroundServiceView;

  beforeEach(() => {
    target = createTarget();
    backgroundServiceModel = target.model(Resources.BackgroundServiceModel.BackgroundServiceModel);
    manager = target.model(SDK.StorageKeyManager.StorageKeyManager);
    UI.ActionRegistration.maybeRemoveActionExtension('background-service.toggle-recording');
    UI.ActionRegistration.registerActionExtension({
      actionId: 'background-service.toggle-recording',
      category: UI.ActionRegistration.ActionCategory.BACKGROUND_SERVICES,
      title: (): Platform.UIString.LocalizedString => 'mock' as Platform.UIString.LocalizedString,
      toggleable: true,
    });
    sinon.stub(UI.ShortcutRegistry.ShortcutRegistry, 'instance').returns({
      shortcutTitleForAction: () => {},
      shortcutsForAction: () => [new UI.KeyboardShortcut.KeyboardShortcut(
          [{key: 0, name: ''}], '', UI.KeyboardShortcut.Type.DefaultShortcut)],
    } as unknown as UI.ShortcutRegistry.ShortcutRegistry);
    assertNotNullOrUndefined(backgroundServiceModel);
    view = new Resources.BackgroundServiceView.BackgroundServiceView(serviceName, backgroundServiceModel);
  });

  afterEach(() => {
    UI.ActionRegistration.maybeRemoveActionExtension('background-service.toggle-recording');
  });

  it('updates event list when main storage key changes', () => {
    assertNotNullOrUndefined(backgroundServiceModel);
    assertNotNullOrUndefined(manager);
    backgroundServiceModel.backgroundServiceEventReceived({
      backgroundServiceEvent: {
        timestamp: 1556889085,  // 2019-05-03 14:11:25.000.
        origin: '',
        storageKey: testKey,
        serviceWorkerRegistrationId: 42 as unknown as Protocol.ServiceWorker.RegistrationID,  // invalid.
        service: serviceName,
        eventName: 'Event1',
        instanceId: 'Instance1',
        eventMetadata: [],
      },
    });
    manager.updateStorageKeys(new Set([testKey]));

    manager.setMainStorageKey(testKey);

    const dataRow = view.getDataGrid().dataTableBody.getElementsByClassName('data-grid-data-grid-node')[0];
    const expectedData = ['Event1', testKey, 'Instance1'];
    const actualData = [
      dataRow.getElementsByClassName('eventName-column')[0].textContent,
      dataRow.getElementsByClassName('storageKey-column')[0].textContent,
      dataRow.getElementsByClassName('instanceId-column')[0].textContent,
    ];
    assert.deepEqual(actualData, expectedData);
  });
});
