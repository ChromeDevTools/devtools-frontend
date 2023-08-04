// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Application from '../../../../../front_end/panels/application/application.js';
import * as Coordinator from '../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';
import type * as Common from '../../../../../front_end/core/common/common.js';
import type * as Protocol from '../../../../../front_end/generated/protocol.js';
import * as Root from '../../../../../front_end/core/root/root.js';
import * as UI from '../../../../../front_end/ui/legacy/legacy.js';
import {
  createTarget,
  stubNoopSettings,
} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';

const {assert} = chai;

class SharedStorageItemsListener {
  #dispatcher:
      Common.ObjectWrapper.ObjectWrapper<Application.SharedStorageItemsView.SharedStorageItemsDispatcher.EventTypes>;
  #refreshed: boolean = false;

  constructor(dispatcher: Common.ObjectWrapper
                  .ObjectWrapper<Application.SharedStorageItemsView.SharedStorageItemsDispatcher.EventTypes>) {
    this.#dispatcher = dispatcher;
    this.#dispatcher.addEventListener(
        Application.SharedStorageItemsView.SharedStorageItemsDispatcher.Events.ItemsRefreshed, this.#itemsRefreshed,
        this);
  }

  dispose(): void {
    this.#dispatcher.removeEventListener(
        Application.SharedStorageItemsView.SharedStorageItemsDispatcher.Events.ItemsRefreshed, this.#itemsRefreshed,
        this);
  }

  #itemsRefreshed(): void {
    this.#refreshed = true;
  }

  async waitForItemsRefreshed(): Promise<void> {
    if (!this.#refreshed) {
      await this.#dispatcher.once(
          Application.SharedStorageItemsView.SharedStorageItemsDispatcher.Events.ItemsRefreshed);
    }
    this.#refreshed = false;
  }
}

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

describeWithMockConnection('SharedStorageTreeElement', function() {
  const tests = (targetFactory: () => SDK.Target.Target) => {
    let target: SDK.Target.Target;
    let sharedStorageModel: Application.SharedStorageModel.SharedStorageModel;
    let sharedStorage: Application.SharedStorageModel.SharedStorageForOrigin;
    let treeElement: Application.SharedStorageTreeElement.SharedStorageTreeElement;

    const TEST_ORIGIN = 'http://a.test';

    const METADATA = {
      creationTime: 100 as Protocol.Network.TimeSinceEpoch,
      length: 3,
      remainingBudget: 2.5,
    } as unknown as Protocol.Storage.SharedStorageMetadata;

    const ENTRIES = [
      {
        key: 'key1',
        value: 'a',
      } as unknown as Protocol.Storage.SharedStorageEntry,
      {
        key: 'key2',
        value: 'b',
      } as unknown as Protocol.Storage.SharedStorageEntry,
      {
        key: 'key3',
        value: 'c',
      } as unknown as Protocol.Storage.SharedStorageEntry,
    ];

    beforeEach(async () => {
      stubNoopSettings();
      target = targetFactory();
      Root.Runtime.experiments.register(Root.Runtime.ExperimentName.PRELOADING_STATUS_PANEL, '', false);
      Root.Runtime.experiments.register(Root.Runtime.ExperimentName.STORAGE_BUCKETS_TREE, '', false);

      sharedStorageModel = target.model(Application.SharedStorageModel.SharedStorageModel) as
          Application.SharedStorageModel.SharedStorageModel;
      sharedStorage = new Application.SharedStorageModel.SharedStorageForOrigin(sharedStorageModel, TEST_ORIGIN);
      assert.strictEqual(sharedStorage.securityOrigin, TEST_ORIGIN);
    });

    it('shows view on select', async () => {
      sinon.stub(sharedStorageModel.storageAgent, 'invoke_setSharedStorageTracking').resolves({
        getError: () => undefined,
      });
      const getMetadataSpy = sinon.stub(sharedStorageModel.storageAgent, 'invoke_getSharedStorageMetadata').resolves({
        metadata: METADATA,
        getError: () => undefined,
      });
      const getEntriesSpy = sinon.stub(sharedStorageModel.storageAgent, 'invoke_getSharedStorageEntries').resolves({
        entries: ENTRIES,
        getError: () => undefined,
      });

      const panel = Application.ResourcesPanel.ResourcesPanel.instance({forceNew: true});
      panel.markAsRoot();
      panel.show(document.body);

      treeElement =
          await Application.SharedStorageTreeElement.SharedStorageTreeElement.createElement(panel, sharedStorage);

      await coordinator.done({waitForWork: true});
      assert.isTrue(getMetadataSpy.calledOnceWithExactly({ownerOrigin: TEST_ORIGIN}));

      const view = treeElement.view;
      assertNotNullOrUndefined(view);

      const itemsListener = new SharedStorageItemsListener(view.sharedStorageItemsDispatcher);
      const refreshedPromise = itemsListener.waitForItemsRefreshed();

      document.body.appendChild(treeElement.listItemNode);
      treeElement.treeOutline = new UI.TreeOutline.TreeOutlineInShadow();
      treeElement.selectable = true;
      treeElement.select();
      await refreshedPromise;

      assert.isTrue(getMetadataSpy.calledTwice);
      assert.isTrue(getMetadataSpy.alwaysCalledWithExactly({ownerOrigin: TEST_ORIGIN}));
      assert.isTrue(getEntriesSpy.calledOnceWithExactly({ownerOrigin: TEST_ORIGIN}));

      assert.deepEqual(view.getEntriesForTesting(), ENTRIES);

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
