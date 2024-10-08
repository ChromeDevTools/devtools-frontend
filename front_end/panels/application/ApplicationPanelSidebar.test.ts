// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {createTarget, stubNoopSettings} from '../../testing/EnvironmentHelpers.js';
import {
  describeWithMockConnection,
  setMockConnectionResponseHandler,
} from '../../testing/MockConnection.js';
import {createResource, getMainFrame} from '../../testing/ResourceTreeHelpers.js';
import * as Coordinator from '../../ui/components/render_coordinator/render_coordinator.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Application from './application.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

class SharedStorageTreeElementListener {
  #sidebar: Application.ApplicationPanelSidebar.ApplicationPanelSidebar;
  #originsAdded: Array<String> = new Array<String>();

  constructor(sidebar: Application.ApplicationPanelSidebar.ApplicationPanelSidebar) {
    this.#sidebar = sidebar;

    this.#sidebar.sharedStorageTreeElementDispatcher.addEventListener(
        Application.ApplicationPanelSidebar.SharedStorageTreeElementDispatcher.Events.SHARED_STORAGE_TREE_ELEMENT_ADDED,
        this.#treeElementAdded, this);
  }

  dispose(): void {
    this.#sidebar.sharedStorageTreeElementDispatcher.removeEventListener(
        Application.ApplicationPanelSidebar.SharedStorageTreeElementDispatcher.Events.SHARED_STORAGE_TREE_ELEMENT_ADDED,
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
          Application.ApplicationPanelSidebar.SharedStorageTreeElementDispatcher.Events
              .SHARED_STORAGE_TREE_ELEMENT_ADDED);
    }
  }
}

describeWithMockConnection('ApplicationPanelSidebar', () => {
  let target: SDK.Target.Target;

  const TEST_ORIGIN_A = 'http://www.example.com/';
  const TEST_ORIGIN_B = 'http://www.example.org/';
  const TEST_ORIGIN_C = 'http://www.example.net/';

  const TEST_EXTENSION_NAME = 'Test Extension';

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
    SDK.ChildTargetManager.ChildTargetManager.install();
    const tabTarget = createTarget({type: SDK.Target.Type.TAB});
    createTarget({parentTarget: tabTarget, subtype: 'prerender'});
    target = createTarget({parentTarget: tabTarget});
    sinon.stub(UI.ViewManager.ViewManager.instance(), 'showView').resolves();  // Silence console error
    setMockConnectionResponseHandler('Storage.getSharedStorageEntries', () => ({}));
    setMockConnectionResponseHandler('Storage.setSharedStorageTracking', () => ({}));
  });

  // Flaking on multiple bots on CQ.
  it.skip('[crbug.com/1472237] shows cookies for all frames', async () => {
    Application.ResourcesPanel.ResourcesPanel.instance({forceNew: true});
    const sidebar = await Application.ResourcesPanel.ResourcesPanel.showAndGetSidebar();
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    assert.exists(resourceTreeModel);
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

  // Flaking on windows + subsequence test failing
  it.skip('[crbug.com/1472651] shows shared storages and events for origins using shared storage', async () => {
    const securityOriginManager = target.model(SDK.SecurityOriginManager.SecurityOriginManager);
    assert.exists(securityOriginManager);
    sinon.stub(securityOriginManager, 'securityOrigins').returns([
      TEST_ORIGIN_A,
      TEST_ORIGIN_B,
      TEST_ORIGIN_C,
    ]);

    const sharedStorageModel = target.model(Application.SharedStorageModel.SharedStorageModel);
    assert.exists(sharedStorageModel);
    const setTrackingSpy = sinon.stub(sharedStorageModel.storageAgent, 'invoke_setSharedStorageTracking').resolves({
      getError: () => undefined,
    });

    Application.ResourcesPanel.ResourcesPanel.instance({forceNew: true});
    const sidebar = await Application.ResourcesPanel.ResourcesPanel.showAndGetSidebar();

    const listener = new SharedStorageTreeElementListener(sidebar);
    const addedPromise = listener.waitForElementsAdded(3);

    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    assert.exists(resourceTreeModel);
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
      sharedStorageModel.dispatchEventToListeners(Application.SharedStorageModel.Events.SHARED_STORAGE_ACCESS, event);
    }

    assert.deepEqual(sidebar.sharedStorageListTreeElement.view.getEventsForTesting(), EVENTS);
  });

  it('shows extension storage based on added models', async () => {
    Root.Runtime.experiments.enableForTest(Root.Runtime.ExperimentName.EXTENSION_STORAGE_VIEWER);

    for (const useTreeView of [false, true]) {
      Application.ResourcesPanel.ResourcesPanel.instance({forceNew: true});
      const sidebar = await Application.ResourcesPanel.ResourcesPanel.showAndGetSidebar();

      // Cast to any allows overriding private method.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sinon.stub(sidebar, 'useTreeViewForExtensionStorage' as any).returns(useTreeView);

      const extensionStorageModel = target.model(Application.ExtensionStorageModel.ExtensionStorageModel);
      assert.exists(extensionStorageModel);

      const makeFakeExtensionStorage = (storageArea: Protocol.Extensions.StorageArea) =>
          new Application.ExtensionStorageModel.ExtensionStorage(
              extensionStorageModel, '', TEST_EXTENSION_NAME, storageArea);

      const fakeModelLocal = makeFakeExtensionStorage(Protocol.Extensions.StorageArea.Local);
      const fakeModelSession = makeFakeExtensionStorage(Protocol.Extensions.StorageArea.Session);

      extensionStorageModel.dispatchEventToListeners(
          Application.ExtensionStorageModel.Events.EXTENSION_STORAGE_ADDED, fakeModelLocal);
      extensionStorageModel.dispatchEventToListeners(
          Application.ExtensionStorageModel.Events.EXTENSION_STORAGE_ADDED, fakeModelSession);

      if (useTreeView) {
        assert.strictEqual(sidebar.extensionStorageListTreeElement!.childCount(), 1);
        assert.strictEqual(sidebar.extensionStorageListTreeElement!.children()[0].title, TEST_EXTENSION_NAME);
        assert.deepStrictEqual(
            sidebar.extensionStorageListTreeElement!.children()[0].children().map(e => e.title), ['Session', 'Local']);
      } else {
        assert.strictEqual(sidebar.extensionStorageListTreeElement!.childCount(), 2);
        assert.deepStrictEqual(
            sidebar.extensionStorageListTreeElement!.children().map(e => e.title), ['Session', 'Local']);
      }

      extensionStorageModel.dispatchEventToListeners(
          Application.ExtensionStorageModel.Events.EXTENSION_STORAGE_REMOVED, fakeModelLocal);
      extensionStorageModel.dispatchEventToListeners(
          Application.ExtensionStorageModel.Events.EXTENSION_STORAGE_REMOVED, fakeModelSession);
      assert.strictEqual(sidebar.extensionStorageListTreeElement!.childCount(), 0);
    }
  });

  async function getExpectedCall(expectedCall: string): Promise<sinon.SinonSpy> {
    Application.ResourcesPanel.ResourcesPanel.instance({forceNew: true});
    const sidebar = await Application.ResourcesPanel.ResourcesPanel.showAndGetSidebar();
    const components = expectedCall.split('.');
    assert.strictEqual(components.length, 2);
    // @ts-ignore
    const object = sidebar[components[0]];
    assert.exists(object);
    return sinon.spy(object, components[1]);
  }

  const MOCK_EVENT_ITEM = {
    addEventListener: () => {},
    securityOrigin: 'https://example.com',
    databaseId: new Application.IndexedDBModel.DatabaseId({storageKey: ''}, ''),
  };

  const testUiUpdate = <Events, T extends keyof Events>(
      event: T, modelClass: new (arg1: SDK.Target.Target) => SDK.SDKModel.SDKModel<Events>, expectedCallString: string,
      inScope: boolean) => async () => {
    SDK.TargetManager.TargetManager.instance().setScopeTarget(inScope ? target : null);
    const expectedCall = await getExpectedCall(expectedCallString);
    const model = target.model(modelClass);
    await coordinator.done({waitForWork: true});
    assert.exists(model);
    const data = [{...MOCK_EVENT_ITEM, model}] as Common.EventTarget.EventPayloadToRestParameters<Events, T>;
    model.dispatchEventToListeners(event as Platform.TypeScriptUtilities.NoUnion<T>, ...data);
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.strictEqual(expectedCall.called, inScope);
  };

  it('adds interest group event on in scope event',
     testUiUpdate(
         Application.InterestGroupStorageModel.Events.INTEREST_GROUP_ACCESS,
         Application.InterestGroupStorageModel.InterestGroupStorageModel, 'interestGroupTreeElement.addEvent', true));
  // Failing on the toolbar button CL together with some AnimationTimeline tests
  it.skip(
      '[crbug.com/354673294] does not add interest group event on out of scope event',
      testUiUpdate(
          Application.InterestGroupStorageModel.Events.INTEREST_GROUP_ACCESS,
          Application.InterestGroupStorageModel.InterestGroupStorageModel, 'interestGroupTreeElement.addEvent', false));
  it('adds DOM storage on in scope event',
     testUiUpdate(
         Application.DOMStorageModel.Events.DOM_STORAGE_ADDED, Application.DOMStorageModel.DOMStorageModel,
         'sessionStorageListTreeElement.appendChild', true));
  // Failing on the toolbar button CL together with some AnimationTimeline tests
  it.skip(
      '[crbug.com/354673294] does not add DOM storage on out of scope event',
      testUiUpdate(
          Application.DOMStorageModel.Events.DOM_STORAGE_ADDED, Application.DOMStorageModel.DOMStorageModel,
          'sessionStorageListTreeElement.appendChild', false));

  it('adds indexed DB on in scope event',
     testUiUpdate(
         Application.IndexedDBModel.Events.DatabaseAdded, Application.IndexedDBModel.IndexedDBModel,
         'indexedDBListTreeElement.appendChild', true));
  // Failing on the toolbar button CL together with some AnimationTimeline tests
  it.skip(
      '[crbug.com/354673294] does not add indexed DB on out of scope event',
      testUiUpdate(
          Application.IndexedDBModel.Events.DatabaseAdded, Application.IndexedDBModel.IndexedDBModel,
          'indexedDBListTreeElement.appendChild', false));

  it('adds shared storage on in scope event',
     testUiUpdate(
         Application.SharedStorageModel.Events.SHARED_STORAGE_ADDED, Application.SharedStorageModel.SharedStorageModel,
         'sharedStorageListTreeElement.appendChild', true));
  // Failing on the toolbar button CL together with some AnimationTimeline tests
  it.skip(
      '[crbug.com/354673294] does not add shared storage on out of scope event',
      testUiUpdate(
          Application.SharedStorageModel.Events.SHARED_STORAGE_ADDED, Application.SharedStorageModel.SharedStorageModel,
          'sharedStorageListTreeElement.appendChild', false));

  const MOCK_GETTER_ITEM = {
    ...MOCK_EVENT_ITEM,
    ...MOCK_EVENT_ITEM.databaseId,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const testUiUpdateOnScopeChange = <T extends SDK.SDKModel.SDKModel<any>>(
      modelClass: new (arg1: SDK.Target.Target) => T, getter: keyof T, expectedCallString: string) => async () => {
    SDK.TargetManager.TargetManager.instance().setScopeTarget(null);
    const expectedCall = await getExpectedCall(expectedCallString);
    const model = target.model(modelClass);
    assert.exists(model);
    sinon.stub(model, getter).returns([MOCK_GETTER_ITEM]);
    SDK.TargetManager.TargetManager.instance().setScopeTarget(target);
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.strictEqual(expectedCall.called, true);
  };

  it('adds DOM storage element after scope change',
     testUiUpdateOnScopeChange(
         Application.DOMStorageModel.DOMStorageModel, 'storages', 'sessionStorageListTreeElement.appendChild'));

  it('adds shared storage after scope change',
     testUiUpdateOnScopeChange(
         Application.SharedStorageModel.SharedStorageModel, 'storages', 'sharedStorageListTreeElement.appendChild'));

  it('adds indexed db after scope change',
     testUiUpdateOnScopeChange(
         Application.IndexedDBModel.IndexedDBModel, 'databases', 'indexedDBListTreeElement.appendChild'));
});

describeWithMockConnection('IDBDatabaseTreeElement', () => {
  beforeEach(() => {
    stubNoopSettings();
  });

  it('only becomes selectable after database is updated', () => {
    const target = createTarget();
    const model = target.model(Application.IndexedDBModel.IndexedDBModel);
    assert.exists(model);
    const panel = Application.ResourcesPanel.ResourcesPanel.instance({forceNew: true});
    const databaseId = new Application.IndexedDBModel.DatabaseId({storageKey: ''}, '');
    const treeElement = new Application.ApplicationPanelSidebar.IDBDatabaseTreeElement(panel, model, databaseId);

    assert.isFalse(treeElement.selectable);
    treeElement.update(new Application.IndexedDBModel.Database(databaseId, 1), false);
    assert.isTrue(treeElement.selectable);
  });
});

describeWithMockConnection('ResourcesSection', () => {
  const tests = (inScope: boolean) => () => {
    let target: SDK.Target.Target;
    beforeEach(() => {
      stubNoopSettings();
      SDK.FrameManager.FrameManager.instance({forceNew: true});
      target = createTarget();
    });

    it('adds tree elements for a frame and resource', () => {
      SDK.TargetManager.TargetManager.instance().setScopeTarget(inScope ? target : null);
      const panel = Application.ResourcesPanel.ResourcesPanel.instance({forceNew: true});
      const treeElement = new UI.TreeOutline.TreeElement();
      new Application.ApplicationPanelSidebar.ResourcesSection(panel, treeElement);

      const model = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
      assert.exists(model);

      assert.strictEqual(treeElement.childCount(), 0);
      const frame = getMainFrame(target);

      const url = 'http://example.com' as Platform.DevToolsPath.UrlString;
      assert.strictEqual(treeElement.firstChild()?.childCount() ?? 0, 0);
      createResource(frame, url, 'text/html', '');
      assert.strictEqual(treeElement.firstChild()?.childCount() ?? 0, inScope ? 1 : 0);
    });

    it('picks up existing frames and resource', () => {
      SDK.TargetManager.TargetManager.instance().setScopeTarget(null);
      const panel = Application.ResourcesPanel.ResourcesPanel.instance({forceNew: true});
      const treeElement = new UI.TreeOutline.TreeElement();
      new Application.ApplicationPanelSidebar.ResourcesSection(panel, treeElement);

      const url = 'http://example.com' as Platform.DevToolsPath.UrlString;
      createResource(getMainFrame(target), url, 'text/html', '');
      assert.strictEqual(treeElement.firstChild()?.childCount() ?? 0, 0);

      assert.strictEqual(treeElement.childCount(), 0);
      SDK.TargetManager.TargetManager.instance().setScopeTarget(inScope ? target : null);
      assert.strictEqual(treeElement.childCount(), inScope ? 1 : 0);
      assert.strictEqual(treeElement.firstChild()?.childCount() ?? 0, inScope ? 1 : 0);
    });
  };

  describe('in scope', tests(true));
  describe('out of scope', tests(false));
});
