// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../../../../front_end/core/common/common.js';
import * as Protocol from '../../../../../front_end/generated/protocol.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import * as Root from '../../../../../front_end/core/root/root.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Application from '../../../../../front_end/panels/application/application.js';
import * as UI from '../../../../../front_end/ui/legacy/legacy.js';
import {createTarget, stubNoopSettings} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';

const {assert} = chai;

class SharedStorageTreeElementListener {
  #sidebar: Application.ApplicationPanelSidebar.ApplicationPanelSidebar;
  #originsAdded: Array<String> = new Array<String>();

  constructor(sidebar: Application.ApplicationPanelSidebar.ApplicationPanelSidebar) {
    this.#sidebar = sidebar;

    this.#sidebar.sharedStorageTreeElementDispatcher.addEventListener(
        Application.ApplicationPanelSidebar.SharedStorageTreeElementDispatcher.Events.SharedStorageTreeElementAdded,
        this.#treeElementAdded, this);
  }

  dispose(): void {
    this.#sidebar.sharedStorageTreeElementDispatcher.removeEventListener(
        Application.ApplicationPanelSidebar.SharedStorageTreeElementDispatcher.Events.SharedStorageTreeElementAdded,
        this.#treeElementAdded, this);
  }

  #treeElementAdded(
      event: Common.EventTarget.EventTargetEvent<Application.ApplicationPanelSidebar.SharedStorageTreeElementDispatcher
                                                     .SharedStorageTreeElementAddedEvent>): void {
    this.#originsAdded.push(event.data.origin);
  }

  async waitForElementsAdded(expectedCount: number): Promise<void> {
    while (this.#originsAdded.length < expectedCount) {
      await this.#sidebar.sharedStorageTreeElementDispatcher.once(
          Application.ApplicationPanelSidebar.SharedStorageTreeElementDispatcher.Events.SharedStorageTreeElementAdded);
    }
  }
}

describeWithMockConnection('ApplicationPanelSidebar', () => {
  const tests = (targetFactory: () => SDK.Target.Target) => {
    let target: SDK.Target.Target;

    const TEST_ORIGIN_A = 'http://www.example.com/';
    const TEST_ORIGIN_B = 'http://www.example.org/';
    const TEST_ORIGIN_C = 'http://www.example.net/';

    const ID = 'AA' as Protocol.Page.FrameId;

    const EVENTS = [
      {
        accessTime: 0,
        type: Protocol.Storage.SharedStorageAccessType.DocumentAppend,
        mainFrameId: ID,
        ownerOrigin: TEST_ORIGIN_A,
        params: {key: 'key0', value: 'value0'} as Protocol.Storage.SharedStorageAccessParams,
      },
      {
        accessTime: 10,
        type: Protocol.Storage.SharedStorageAccessType.WorkletGet,
        mainFrameId: ID,
        ownerOrigin: TEST_ORIGIN_A,
        params: {key: 'key0'} as Protocol.Storage.SharedStorageAccessParams,
      },
      {
        accessTime: 15,
        type: Protocol.Storage.SharedStorageAccessType.WorkletLength,
        mainFrameId: ID,
        ownerOrigin: TEST_ORIGIN_A,
        params: {} as Protocol.Storage.SharedStorageAccessParams,
      },
      {
        accessTime: 20,
        type: Protocol.Storage.SharedStorageAccessType.DocumentClear,
        mainFrameId: ID,
        ownerOrigin: TEST_ORIGIN_C,
        params: {} as Protocol.Storage.SharedStorageAccessParams,
      },
      {
        accessTime: 100,
        type: Protocol.Storage.SharedStorageAccessType.WorkletSet,
        mainFrameId: ID,
        ownerOrigin: TEST_ORIGIN_C,
        params: {key: 'key0', value: 'value1', ignoreIfPresent: true} as Protocol.Storage.SharedStorageAccessParams,
      },
      {
        accessTime: 150,
        type: Protocol.Storage.SharedStorageAccessType.WorkletRemainingBudget,
        mainFrameId: ID,
        ownerOrigin: TEST_ORIGIN_C,
        params: {} as Protocol.Storage.SharedStorageAccessParams,
      },
    ];

    beforeEach(() => {
      stubNoopSettings();
      target = targetFactory();
      Root.Runtime.experiments.register(Root.Runtime.ExperimentName.PRELOADING_STATUS_PANEL, '', false);
    });

    it('shows cookies for all frames', async () => {
      sinon.stub(UI.ViewManager.ViewManager.instance(), 'showView').resolves();  // Silence console error
      Application.ResourcesPanel.ResourcesPanel.instance({forceNew: true});
      const sidebar = await Application.ResourcesPanel.ResourcesPanel.showAndGetSidebar();
      const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
      assertNotNullOrUndefined(resourceTreeModel);
      sinon.stub(resourceTreeModel, 'frames').returns([
        {
          url: 'http://www.example.com/',
          unreachableUrl: () => null,
          resourceTreeModel: () => resourceTreeModel,
        } as unknown as SDK.ResourceTreeModel.ResourceTreeFrame,
        {
          url: 'http://www.example.com/admin/',
          unreachableUrl: () => null,
          resourceTreeModel: () => resourceTreeModel,
        } as unknown as SDK.ResourceTreeModel.ResourceTreeFrame,
        {
          url: 'http://www.example.org/',
          unreachableUrl: () => null,
          resourceTreeModel: () => resourceTreeModel,
        } as unknown as SDK.ResourceTreeModel.ResourceTreeFrame,
      ]);
      resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.CachedResourcesLoaded, resourceTreeModel);

      assert.strictEqual(sidebar.cookieListTreeElement.childCount(), 2);
      assert.deepStrictEqual(
          sidebar.cookieListTreeElement.children().map(e => e.title),
          ['http://www.example.com', 'http://www.example.org']);
    });

    it('shows shared storages and events for origins using shared storage', async () => {
      sinon.stub(UI.ViewManager.ViewManager.instance(), 'showView').resolves();  // Silence console error

      const securityOriginManager = target.model(SDK.SecurityOriginManager.SecurityOriginManager);
      assertNotNullOrUndefined(securityOriginManager);
      sinon.stub(securityOriginManager, 'securityOrigins').returns([
        TEST_ORIGIN_A,
        TEST_ORIGIN_B,
        TEST_ORIGIN_C,
      ]);

      const sharedStorageModel = target.model(Application.SharedStorageModel.SharedStorageModel);
      assertNotNullOrUndefined(sharedStorageModel);
      const setTrackingSpy = sinon.stub(sharedStorageModel.storageAgent, 'invoke_setSharedStorageTracking').resolves({
        getError: () => undefined,
      });

      Application.ResourcesPanel.ResourcesPanel.instance({forceNew: true});
      const sidebar = await Application.ResourcesPanel.ResourcesPanel.showAndGetSidebar();

      const listener = new SharedStorageTreeElementListener(sidebar);
      const addedPromise = listener.waitForElementsAdded(3);

      const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
      assertNotNullOrUndefined(resourceTreeModel);
      resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.CachedResourcesLoaded, resourceTreeModel);
      await addedPromise;

      assert.isTrue(setTrackingSpy.calledOnceWithExactly({enable: true}));

      assert.strictEqual(sidebar.sharedStorageListTreeElement.childCount(), 3);
      assert.deepStrictEqual(sidebar.sharedStorageListTreeElement.children().map(e => e.title), [
        TEST_ORIGIN_A,
        TEST_ORIGIN_B,
        TEST_ORIGIN_C,
      ]);

      sidebar.sharedStorageListTreeElement.view.setDefaultIdForTesting(ID);
      for (const event of EVENTS) {
        sharedStorageModel.dispatchEventToListeners(Application.SharedStorageModel.Events.SharedStorageAccess, event);
      }

      assert.deepEqual(sidebar.sharedStorageListTreeElement.view.getEventsForTesting(), EVENTS);
    });
  };
  describe('without tab target', () => tests(() => createTarget()));
  describe('with tab target', () => tests(() => {
                                const tabTarget = createTarget({type: SDK.Target.Type.Tab});
                                createTarget({parentTarget: tabTarget, subtype: 'prerender'});
                                return createTarget({parentTarget: tabTarget});
                              }));
});
