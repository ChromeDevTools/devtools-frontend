// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {
  createTarget,
  stubNoopSettings,
} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import {SECURITY_ORIGIN} from '../../testing/ResourceTreeHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as RenderCoordinator from '../../ui/components/render_coordinator/render_coordinator.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Application from './application.js';

class SharedStorageItemsListener {
  #dispatcher:
      Common.ObjectWrapper.ObjectWrapper<Application.SharedStorageItemsView.SharedStorageItemsDispatcher.EventTypes>;
  #refreshed = false;

  constructor(dispatcher: Common.ObjectWrapper
                  .ObjectWrapper<Application.SharedStorageItemsView.SharedStorageItemsDispatcher.EventTypes>) {
    this.#dispatcher = dispatcher;
    this.#dispatcher.addEventListener(
        Application.SharedStorageItemsView.SharedStorageItemsDispatcher.Events.ITEMS_REFRESHED, this.#itemsRefreshed,
        this);
  }

  dispose(): void {
    this.#dispatcher.removeEventListener(
        Application.SharedStorageItemsView.SharedStorageItemsDispatcher.Events.ITEMS_REFRESHED, this.#itemsRefreshed,
        this);
  }

  #itemsRefreshed(): void {
    this.#refreshed = true;
  }

  async waitForItemsRefreshed(): Promise<void> {
    if (!this.#refreshed) {
      await this.#dispatcher.once(
          Application.SharedStorageItemsView.SharedStorageItemsDispatcher.Events.ITEMS_REFRESHED);
    }
    this.#refreshed = false;
  }
}

describeWithMockConnection('SharedStorageTreeElement', function() {
  let target: SDK.Target.Target;
  let sharedStorageModel: Application.SharedStorageModel.SharedStorageModel;
  let sharedStorage: Application.SharedStorageModel.SharedStorageForOrigin;

  const METADATA = {
    creationTime: 100 as Protocol.Network.TimeSinceEpoch,
    length: 3,
    remainingBudget: 2.5,
    bytesUsed: 30,
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
    SDK.ChildTargetManager.ChildTargetManager.install();
    const tabTarget = createTarget({type: SDK.Target.Type.TAB});
    createTarget({parentTarget: tabTarget, subtype: 'prerender'});
    target = createTarget({parentTarget: tabTarget});

    sharedStorageModel = target.model(Application.SharedStorageModel.SharedStorageModel) as
        Application.SharedStorageModel.SharedStorageModel;
    sharedStorage = new Application.SharedStorageModel.SharedStorageForOrigin(sharedStorageModel, SECURITY_ORIGIN);
    assert.strictEqual(sharedStorage.securityOrigin, SECURITY_ORIGIN);
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

    const container = document.createElement('div');
    renderElementIntoDOM(container);
    const panel = Application.ResourcesPanel.ResourcesPanel.instance({forceNew: true});
    panel.markAsRoot();
    panel.show(container);

    const toolbar = new Application.StorageItemsToolbar.StorageItemsToolbar();
    const viewFunction = createViewFunctionStub(Application.SharedStorageItemsView.SharedStorageItemsView, {toolbar});
    const treeElement = new Application.SharedStorageTreeElement.SharedStorageTreeElement(panel, sharedStorage);
    treeElement.view =
        await Application.SharedStorageItemsView.SharedStorageItemsView.createView(sharedStorage, viewFunction);

    await RenderCoordinator.done({waitForWork: true});
    sinon.assert.calledOnceWithExactly(getMetadataSpy, {ownerOrigin: SECURITY_ORIGIN});

    const {view} = treeElement;

    const itemsListener = new SharedStorageItemsListener(view.sharedStorageItemsDispatcher);
    const refreshedPromise = itemsListener.waitForItemsRefreshed();

    container.appendChild(treeElement.listItemNode);
    treeElement.treeOutline = new UI.TreeOutline.TreeOutlineInShadow();
    treeElement.selectable = true;
    treeElement.select();
    await refreshedPromise;

    sinon.assert.calledTwice(getMetadataSpy);
    sinon.assert.alwaysCalledWithExactly(getMetadataSpy, {ownerOrigin: SECURITY_ORIGIN});
    sinon.assert.alwaysCalledWithExactly(getEntriesSpy, {ownerOrigin: SECURITY_ORIGIN});

    assert.deepEqual(viewFunction.input.items, ENTRIES);

    panel.detach();
  });
});
