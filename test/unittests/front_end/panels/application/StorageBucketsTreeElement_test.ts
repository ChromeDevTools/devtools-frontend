// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import * as Root from '../../../../../front_end/core/root/root.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Protocol from '../../../../../front_end/generated/protocol.js';
import * as Application from '../../../../../front_end/panels/application/application.js';
import * as UI from '../../../../../front_end/ui/legacy/legacy.js';
import {
  createTarget,
  stubNoopSettings,
} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';

const {assert} = chai;

describeWithMockConnection('StorageBucketsTreeElement', function() {
  const tests = (targetFactory: () => SDK.Target.Target) => {
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

    const setStorageBucketTrackingStub =
        ({storageKey}: {storageKey: string}): Promise<Protocol.ProtocolResponseWithError> => {
          assertNotNullOrUndefined(storageBucketsModel);
          for (const bucketInfo of getBucketsForStorageKeys(storageKey)) {
            storageBucketsModel.storageBucketCreatedOrUpdated({bucketInfo});
          }
          return Promise.resolve({
            getError: () => undefined,
          });
        };

    beforeEach(async () => {
      stubNoopSettings();
      target = targetFactory();
      Root.Runtime.experiments.register(Root.Runtime.ExperimentName.PRELOADING_STATUS_PANEL, '', false);
      Root.Runtime.experiments.register(Root.Runtime.ExperimentName.STORAGE_BUCKETS_TREE, '', false);

      storageKeyManager =
          target.model(SDK.StorageKeyManager.StorageKeyManager) as SDK.StorageKeyManager.StorageKeyManager;
      storageBucketsModel = target.model(SDK.StorageBucketsModel.StorageBucketsModel);
    });

    it('adds bucket tree elements on non default buckets added', async () => {
      assertNotNullOrUndefined(storageBucketsModel);

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
      assertNotNullOrUndefined(storageBucketsModel);

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
  };
  describe('without tab target', () => tests(() => createTarget()));
  describe('with tab target', () => tests(() => {
                                const tabTarget = createTarget({type: SDK.Target.Type.Tab});
                                createTarget({parentTarget: tabTarget, subtype: 'prerender'});
                                return createTarget({parentTarget: tabTarget});
                              }));
});
