// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {
  createTarget,
  stubNoopSettings,
} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Application from './application.js';

describeWithMockConnection('StorageBucketsTreeElement', function() {
  let target: SDK.Target.Target;
  let storageKeyManager: SDK.StorageKeyManager.StorageKeyManager;
  let storageBucketsModel: SDK.StorageBucketsModel.StorageBucketsModel|null;

  const STORAGE_KEYS: string[] = [
    'storagekey1',
    'storagekey2',
    'storagekey3',
  ];

  const STORAGE_BUCKET_INFOS: Protocol.Storage.StorageBucketInfo[] = [
    {
      bucket: {
        storageKey: STORAGE_KEYS[0],
      },
      id: '0',
      expiration: 0,
      quota: 0,
      persistent: false,
      durability: Protocol.Storage.StorageBucketsDurability.Strict,
    },
    {
      bucket: {
        storageKey: STORAGE_KEYS[0],
        name: 'bucket1',
      },
      id: '1',
      expiration: 0,
      quota: 0,
      persistent: false,
      durability: Protocol.Storage.StorageBucketsDurability.Strict,
    },
    {
      bucket: {
        storageKey: STORAGE_KEYS[1],
        name: 'bucket2',
      },
      id: '2',
      expiration: 0,
      quota: 0,
      persistent: false,
      durability: Protocol.Storage.StorageBucketsDurability.Strict,
    },
    {
      bucket: {
        storageKey: STORAGE_KEYS[2],
        name: 'bucket3',
      },
      id: '3',
      expiration: 0,
      quota: 0,
      persistent: false,
      durability: Protocol.Storage.StorageBucketsDurability.Strict,
    },
  ];

  const getBucketsForStorageKeys = (...storageKeys: string[]) => {
    return STORAGE_BUCKET_INFOS.filter(({bucket}) => storageKeys.includes(bucket.storageKey));
  };

  const getNonDefaultBuckets = () => {
    return STORAGE_BUCKET_INFOS.filter(({bucket}) => bucket.name !== undefined);
  };

  const setStorageBucketTrackingStub = ({storageKey}: {storageKey: string}) => {
    assert.exists(storageBucketsModel);
    for (const bucketInfo of getBucketsForStorageKeys(storageKey)) {
      storageBucketsModel.storageBucketCreatedOrUpdated({bucketInfo});
    }
    return Promise.resolve({
      getError: () => undefined,
    });
  };

  beforeEach(async () => {
    stubNoopSettings();
    SDK.ChildTargetManager.ChildTargetManager.install();
    const tabTarget = createTarget({type: SDK.Target.Type.TAB});
    createTarget({parentTarget: tabTarget, subtype: 'prerender'});
    target = createTarget({parentTarget: tabTarget});

    storageKeyManager =
        target.model(SDK.StorageKeyManager.StorageKeyManager) as SDK.StorageKeyManager.StorageKeyManager;
    storageBucketsModel = target.model(SDK.StorageBucketsModel.StorageBucketsModel);
  });

  it('adds bucket tree elements on non default buckets added', async () => {
    assert.exists(storageBucketsModel);

    sinon.stub(storageBucketsModel.storageAgent, 'invoke_setStorageBucketTracking')
        .callsFake(setStorageBucketTrackingStub);
    storageKeyManager.updateStorageKeys(new Set(STORAGE_KEYS));
    storageBucketsModel.enable();

    const panel = Application.ResourcesPanel.ResourcesPanel.instance({forceNew: true});
    panel.markAsRoot();
    panel.show(document.body);

    const parentTreeElement = new Application.StorageBucketsTreeElement.StorageBucketsTreeParentElement(panel);
    const appendChildSpy = sinon.spy(parentTreeElement, 'appendChild');
    parentTreeElement.initialize();

    assert.strictEqual(appendChildSpy.callCount, getNonDefaultBuckets().length);

    panel.detach();
  });

  it('shows view on select', async () => {
    assert.exists(storageBucketsModel);

    const panel = Application.ResourcesPanel.ResourcesPanel.instance({forceNew: true});
    panel.markAsRoot();
    panel.show(document.body);

    const treeElement = new Application.StorageBucketsTreeElement.StorageBucketsTreeElement(
        panel, storageBucketsModel, STORAGE_BUCKET_INFOS[0]);

    const showViewSpy = sinon.spy(treeElement, 'showView');

    document.body.appendChild(treeElement.listItemNode);
    treeElement.treeOutline = new UI.TreeOutline.TreeOutlineInShadow();
    treeElement.selectable = true;
    treeElement.select();

    assert.isTrue(showViewSpy.calledOnce);

    panel.detach();
  });
});
