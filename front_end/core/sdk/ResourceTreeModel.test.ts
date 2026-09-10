// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Protocol from '../../generated/protocol.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {MockCDPConnection} from '../../testing/MockCDPConnection.js';
import {
  addChildFrame,
  createResource,
  getInitializedResourceTreeModel,
  getMainFrame,
  LOADER_ID,
  MAIN_FRAME_ID,
  mockResourceTree,
  navigate,
} from '../../testing/ResourceTreeHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import * as Platform from '../platform/platform.js';

import * as SDK from './sdk.js';

const {urlString} = Platform.DevToolsPath;

describeWithEnvironment('ResourceTreeModel', () => {
  let universe: TestUniverse;
  let connection: MockCDPConnection;

  beforeEach(() => {
    universe = new TestUniverse();
    connection = new MockCDPConnection();
    mockResourceTree(connection);
  });

  it('calls clearRequests on reloadPage', async () => {
    const target = universe.createTarget({connection});
    const resourceTreeModel = await getInitializedResourceTreeModel(target);
    const clearRequests = sinon.stub(SDK.NetworkManager.NetworkManager.prototype, 'clearRequests');
    resourceTreeModel.reloadPage();
    assert.isTrue(clearRequests.calledOnce, 'Not called just once');
  });

  it('calls clearRequests on top frame navigated', () => {
    const target = universe.createTarget({connection});
    const clearRequests = sinon.stub(SDK.NetworkManager.NetworkManager.prototype, 'clearRequests');
    navigate(getMainFrame(target));
    assert.isTrue(clearRequests.calledOnce, 'Not called just once');
  });

  it('does not call clearRequests on non-top frame navigated', async () => {
    const target = universe.createTarget({connection});
    const clearRequests = sinon.stub(SDK.NetworkManager.NetworkManager.prototype, 'clearRequests');
    navigate(await addChildFrame(target));
    assert.isTrue(clearRequests.notCalled, 'Called unexpctedly');
  });

  it('added frame has storageKey when navigated', async () => {
    const testKey = 'test-storage-key';

    connection.setSuccessHandler('Storage.getStorageKey', () => ({storageKey: testKey}));
    const target = universe.createTarget({connection});
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    assert.isEmpty(resourceTreeModel!.frames());
    navigate(getMainFrame(target));
    const frames = resourceTreeModel!.frames();
    assert.lengthOf(frames, 1);
    const addedFrame = frames[0];
    const key = await addedFrame.getStorageKey(false);
    assert.strictEqual(key, testKey);
  });

  it('storage key gets updated when frame tree changes', async () => {
    const testKey = 'test-storage-key';

    connection.setSuccessHandler('Storage.getStorageKey', () => ({storageKey: testKey}));
    const target = universe.createTarget({connection});
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    assert.isEmpty(resourceTreeModel?.frames());
    const manager = target.model(SDK.StorageKeyManager.StorageKeyManager);
    assert.exists(manager);
    const storageKeyAddedPromise = new Promise<void>(resolve => {
      manager.addEventListener(SDK.StorageKeyManager.Events.STORAGE_KEY_ADDED, () => {
        resolve();
      });
    });
    navigate(getMainFrame(target));
    await storageKeyAddedPromise;
    assert.strictEqual(resourceTreeModel?.frames().length, 1);

    const mainStorageKeyChangedPromise = new Promise<void>(resolve => {
      manager.addEventListener(SDK.StorageKeyManager.Events.MAIN_STORAGE_KEY_CHANGED, () => {
        resolve();
      });
    });
    const storageKeyRemovedPromise = new Promise<void>(resolve => {
      manager.addEventListener(SDK.StorageKeyManager.Events.STORAGE_KEY_REMOVED, () => {
        resolve();
      });
    });

    resourceTreeModel?.frameDetached('main' as Protocol.Page.FrameId, false);
    assert.isEmpty(resourceTreeModel?.frames());
    await Promise.all([mainStorageKeyChangedPromise, storageKeyRemovedPromise]);
  });

  function getResourceTreeModel(target: SDK.Target.Target): SDK.ResourceTreeModel.ResourceTreeModel {
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    assert.exists(resourceTreeModel);
    return resourceTreeModel;
  }

  it('calls reloads only top frames', () => {
    const tabTarget = universe.createTarget({type: SDK.Target.Type.TAB});
    const mainFrameTarget = universe.createTarget({parentTarget: tabTarget});
    const subframeTarget = universe.createTarget({parentTarget: mainFrameTarget});
    const reloadMainFramePage = sinon.spy(getResourceTreeModel(mainFrameTarget), 'reloadPage');
    const reloadSubframePage = sinon.spy(getResourceTreeModel(subframeTarget), 'reloadPage');
    SDK.ResourceTreeModel.ResourceTreeModel.reloadAllPages(universe.targetManager);

    sinon.assert.calledOnce(reloadMainFramePage);
    sinon.assert.notCalled(reloadSubframePage);
  });

  it('tags reloads with the targets loaderId', async () => {
    const target = universe.createTarget({connection});
    const resourceTreeModel = await getInitializedResourceTreeModel(target);

    const reload = sinon.spy(target.pageAgent(), 'invoke_reload');
    assert.isNotNull(resourceTreeModel.mainFrame);
    resourceTreeModel.reloadPage();
    sinon.assert.calledOnce(reload);
    assert.deepEqual(
        reload.args[0], [{ignoreCache: undefined, loaderId: LOADER_ID, scriptToEvaluateOnLoad: undefined}]);
  });

  it('resourceForURL can find resource', async () => {
    const target = universe.createTarget({connection});
    await getInitializedResourceTreeModel(target);
    const mainFrame = getMainFrame(target);
    const url = urlString`https://example.com/script.js`;
    const content = 'console.log("hello");';
    const mimeType = 'text/javascript';
    const resource = createResource(mainFrame, url, mimeType, content);

    // Test with TargetManager
    const foundResource = SDK.ResourceTreeModel.ResourceTreeModel.resourceForURL(universe.targetManager, url);
    assert.strictEqual(foundResource, resource);
  });

  it('identifies not top frame', async () => {
    const tabTarget = universe.createTarget({type: SDK.Target.Type.TAB});
    const mainFrameTarget = universe.createTarget({parentTarget: tabTarget});
    const subframeTarget = universe.createTarget({parentTarget: mainFrameTarget});

    navigate(getMainFrame(mainFrameTarget));
    navigate(getMainFrame(subframeTarget), {parentId: 'parentId' as Protocol.Page.FrameId});
    assert.isTrue(getResourceTreeModel(mainFrameTarget).mainFrame!.isOutermostFrame());
    assert.isFalse(getResourceTreeModel(subframeTarget).mainFrame!.isOutermostFrame());
  });

  it('identifies primary frame', async () => {
    const tabTarget = universe.createTarget({type: SDK.Target.Type.TAB});
    const mainFrameTarget = universe.createTarget({parentTarget: tabTarget});
    const subframeTarget = universe.createTarget({parentTarget: mainFrameTarget});

    navigate(getMainFrame(mainFrameTarget));
    navigate(getMainFrame(subframeTarget), {parentId: MAIN_FRAME_ID, id: 'child' as Protocol.Page.FrameId});

    assert.isTrue(getResourceTreeModel(mainFrameTarget).mainFrame!.isPrimaryFrame());
    assert.isFalse(getResourceTreeModel(subframeTarget).mainFrame!.isPrimaryFrame());
  });

  it('emits PrimaryPageChanged event upon prerender activation', async () => {
    SDK.ChildTargetManager.ChildTargetManager.install();
    const tabTarget = universe.createTarget({type: SDK.Target.Type.TAB});
    const childTargetManager = tabTarget.model(SDK.ChildTargetManager.ChildTargetManager);
    assert.exists(childTargetManager);

    const targetId = 'target_id' as Protocol.Target.TargetID;
    const targetInfo = {
      targetId,
      type: 'page',
      title: 'title',
      url: 'http://example.com/prerendered.html',
      attached: true,
      canAccessOpener: false,
      subtype: 'prerender',
    };
    childTargetManager.targetCreated({targetInfo});
    await childTargetManager.attachedToTarget(
        {sessionId: 'session_id' as Protocol.Target.SessionID, targetInfo, waitingForDebugger: false});

    const prerenderTarget = universe.targetManager.targetById(targetId);
    assert.exists(prerenderTarget);
    const resourceTreeModel = prerenderTarget.model(SDK.ResourceTreeModel.ResourceTreeModel);
    assert.exists(resourceTreeModel);

    const primaryPageChangedEvents:
        Array<{frame: SDK.ResourceTreeModel.ResourceTreeFrame, type: SDK.ResourceTreeModel.PrimaryPageChangeType}> = [];
    resourceTreeModel.addEventListener(
        SDK.ResourceTreeModel.Events.PrimaryPageChanged, event => primaryPageChangedEvents.push(event.data));

    const frame = resourceTreeModel.frameAttached('frame_id' as Protocol.Page.FrameId, null);
    childTargetManager.targetInfoChanged({targetInfo: {...targetInfo, subtype: undefined}});

    assert.lengthOf(primaryPageChangedEvents, 1);
    assert.strictEqual(primaryPageChangedEvents[0].frame, frame);
    assert.strictEqual(primaryPageChangedEvents[0].type, SDK.ResourceTreeModel.PrimaryPageChangeType.ACTIVATION);
  });

  it('emits PrimaryPageChanged event only upon navigation of the primary frame', async () => {
    const tabTarget = universe.createTarget({type: SDK.Target.Type.TAB});
    const mainFrameTarget = universe.createTarget({parentTarget: tabTarget});
    const subframeTarget = universe.createTarget({parentTarget: mainFrameTarget});
    const prerenderTarget = universe.createTarget({parentTarget: tabTarget, subtype: 'prerender'});

    const primaryPageChangedEvents:
        Array<{frame: SDK.ResourceTreeModel.ResourceTreeFrame, type: SDK.ResourceTreeModel.PrimaryPageChangeType}> = [];

    [getResourceTreeModel(mainFrameTarget), getResourceTreeModel(subframeTarget), getResourceTreeModel(prerenderTarget)]
        .forEach(resourceTreeModel => {
          resourceTreeModel.addEventListener(
              SDK.ResourceTreeModel.Events.PrimaryPageChanged, event => primaryPageChangedEvents.push(event.data));
        });

    navigate(getMainFrame(mainFrameTarget));
    assert.lengthOf(primaryPageChangedEvents, 1);
    assert.strictEqual(primaryPageChangedEvents[0].frame.id, 'main');
    assert.strictEqual(primaryPageChangedEvents[0].type, SDK.ResourceTreeModel.PrimaryPageChangeType.NAVIGATION);

    navigate(getMainFrame(subframeTarget), {parentId: MAIN_FRAME_ID, id: 'child' as Protocol.Page.FrameId});
    assert.lengthOf(primaryPageChangedEvents, 1);

    navigate(getMainFrame(prerenderTarget));
    assert.lengthOf(primaryPageChangedEvents, 1);
  });

  it('rebuilds the resource tree upon bfcache-navigation', async () => {
    const target = universe.createTarget({connection});
    const frameManager = universe.frameManager;
    const removedFromFrameManagerSpy = sinon.spy(frameManager, 'modelRemoved');
    const addedToFrameManagerSpy = sinon.spy(frameManager, 'modelAdded');
    const resourceTreeModel = getResourceTreeModel(target);
    await resourceTreeModel.once(SDK.ResourceTreeModel.Events.CachedResourcesLoaded);
    const cachedResourcesLoaded = resourceTreeModel.once(SDK.ResourceTreeModel.Events.CachedResourcesLoaded);
    const processPendingEventsSpy = sinon.spy(resourceTreeModel, 'processPendingEvents');
    const initialFrame = resourceTreeModel.frames()[0];

    navigate(getMainFrame(target), {}, Protocol.Page.NavigationType.BackForwardCacheRestore);

    await cachedResourcesLoaded;
    sinon.assert.calledOnce(removedFromFrameManagerSpy);
    sinon.assert.calledOnce(addedToFrameManagerSpy);
    sinon.assert.calledTwice(processPendingEventsSpy);

    const frameAfterNav = resourceTreeModel.frames()[0];
    assert.strictEqual(
        initialFrame, frameAfterNav,
        'Instead of keeping the existing frame, a new frame was created upon bfcache-navigation');
  });

  it('updates frame url and dispatches events on navigatedWithinDocument', async () => {
    const target = universe.createTarget({connection});
    const resourceTreeModel = await getInitializedResourceTreeModel(target);
    const mainFrame = getMainFrame(target);
    const newUrl = urlString`https://example.com/spa-route`;

    const frameNavigatedWithinDocumentSpy = sinon.spy();
    resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.FrameNavigatedWithinDocument,
                                       frameNavigatedWithinDocumentSpy);

    connection.dispatchEvent('Page.navigatedWithinDocument', {
      frameId: mainFrame.id,
      url: newUrl,
      navigationType: Protocol.Page.NavigatedWithinDocumentEventNavigationType.HistoryAPI,
    },
                             undefined);

    assert.strictEqual(mainFrame.url, newUrl);
    assert.strictEqual(target.inspectedURL(), newUrl);
    sinon.assert.calledOnce(frameNavigatedWithinDocumentSpy);
    assert.strictEqual(frameNavigatedWithinDocumentSpy.firstCall.args[0].data, mainFrame);
  });

  describe('securityOrigin', () => {
    it('returns a SecurityOrigin instance matching the frame origin', async () => {
      const target = universe.createTarget({connection});
      await getInitializedResourceTreeModel(target);
      const frame = getMainFrame(target);
      assert.strictEqual(frame.securityOrigin().siteId(), 'https://example.com');
      assert.isFalse(frame.securityOrigin().isOpaque());
    });

    it('returns an opaque SecurityOrigin when frame security origin is empty', async () => {
      const target = universe.createTarget({connection});
      await getInitializedResourceTreeModel(target);
      const childFrame = await addChildFrame(target, {securityOrigin: ''});
      assert.isTrue(childFrame.securityOrigin().isOpaque());
    });

    it('updates securityOrigin when navigating to a new origin', async () => {
      const target = universe.createTarget({connection});
      await getInitializedResourceTreeModel(target);
      const frame = getMainFrame(target);
      navigate(frame, {url: urlString`https://new-origin.com/`, securityOrigin: 'https://new-origin.com'});
      assert.strictEqual(frame.securityOrigin().siteId(), 'https://new-origin.com');
    });
  });

  describe('frameForOrigin', () => {
    it('returns the frame matching the security origin under the primary page target', async () => {
      const target = universe.createTarget({connection});
      await getInitializedResourceTreeModel(target);
      const mainFrame = getMainFrame(target);
      const origin = SDK.SecurityOrigin.SecurityOrigin.create('https://example.com');

      const foundFrame = SDK.ResourceTreeModel.ResourceTreeModel.frameForOrigin(target, origin);
      assert.strictEqual(foundFrame, mainFrame);
    });

    it('returns a child frame matching the requested origin', async () => {
      const target = universe.createTarget({connection});
      await getInitializedResourceTreeModel(target);
      const childFrame = await addChildFrame(target, {securityOrigin: 'https://sub.example.com'});
      const origin = SDK.SecurityOrigin.SecurityOrigin.create('https://sub.example.com');

      const foundFrame = SDK.ResourceTreeModel.ResourceTreeModel.frameForOrigin(target, origin);
      assert.strictEqual(foundFrame, childFrame);
    });

    it('returns null when searching for an opaque origin that does not match', async () => {
      const target = universe.createTarget({connection});
      await getInitializedResourceTreeModel(target);
      await addChildFrame(target, {securityOrigin: ''});
      const opaqueOrigin = SDK.SecurityOrigin.SecurityOrigin.create('about:blank');

      const foundFrame = SDK.ResourceTreeModel.ResourceTreeModel.frameForOrigin(target, opaqueOrigin);
      assert.isNull(foundFrame);
    });

    it('matches an opaque frame when searching with its exact SecurityOrigin', async () => {
      const target = universe.createTarget({connection});
      await getInitializedResourceTreeModel(target);
      const childFrame = await addChildFrame(target, {securityOrigin: ''});

      const foundFrame = SDK.ResourceTreeModel.ResourceTreeModel.frameForOrigin(target, childFrame.securityOrigin());
      assert.strictEqual(foundFrame, childFrame);
    });

    it('returns null when origin is not found in any frame', async () => {
      const target = universe.createTarget({connection});
      await getInitializedResourceTreeModel(target);
      const origin = SDK.SecurityOrigin.SecurityOrigin.create('https://not-in-tree.com');

      const foundFrame = SDK.ResourceTreeModel.ResourceTreeModel.frameForOrigin(target, origin);
      assert.isNull(foundFrame);
    });

    it('ignores frames belonging to a different outermost target', async () => {
      const target1 = universe.createTarget({connection});
      await getInitializedResourceTreeModel(target1);

      const otherConnection = new MockCDPConnection();
      mockResourceTree(otherConnection);
      const target2 = universe.createTarget({connection: otherConnection});
      await getInitializedResourceTreeModel(target2);
      const target2Child = await addChildFrame(target2, {securityOrigin: 'https://other-tab.com'});
      assert.exists(target2Child);

      const origin = SDK.SecurityOrigin.SecurityOrigin.create('https://other-tab.com');
      const foundFrame = SDK.ResourceTreeModel.ResourceTreeModel.frameForOrigin(target1, origin);
      assert.isNull(foundFrame);
    });

    it('skips frames with missing or empty security origins', async () => {
      const target = universe.createTarget({connection});
      await getInitializedResourceTreeModel(target);
      await addChildFrame(target, {securityOrigin: ''});
      const origin = SDK.SecurityOrigin.SecurityOrigin.create('https://example.com');

      const foundFrame = SDK.ResourceTreeModel.ResourceTreeModel.frameForOrigin(target, origin);
      assert.strictEqual(foundFrame, getMainFrame(target));
    });

    it('distinguishes different ports on the same host', async () => {
      const target = universe.createTarget({connection});
      await getInitializedResourceTreeModel(target);
      const originWithPort = SDK.SecurityOrigin.SecurityOrigin.create('https://example.com:8080');

      const foundFrame = SDK.ResourceTreeModel.ResourceTreeModel.frameForOrigin(target, originWithPort);
      assert.isNull(foundFrame);
    });

    it('finds a frame hosted on a subframe target belonging to the primary page target', async () => {
      const target = universe.createTarget({connection});
      await getInitializedResourceTreeModel(target);

      const oopifTarget = universe.createTarget({
        type: SDK.Target.Type.FRAME,
        parentTarget: target,
      });
      const oopifFrame = await addChildFrame(oopifTarget, {securityOrigin: 'https://oopif.example.com'});

      const origin = SDK.SecurityOrigin.SecurityOrigin.create('https://oopif.example.com');
      const foundFrame = SDK.ResourceTreeModel.ResourceTreeModel.frameForOrigin(target, origin);
      assert.strictEqual(foundFrame, oopifFrame);
    });

    it('returns null when target has no outermost target', async () => {
      const tabTarget = universe.createTarget({type: SDK.Target.Type.TAB});
      const origin = SDK.SecurityOrigin.SecurityOrigin.create('https://example.com');

      const foundFrame = SDK.ResourceTreeModel.ResourceTreeModel.frameForOrigin(tabTarget, origin);
      assert.isNull(foundFrame);
    });
  });

  describe('SecurityOriginManager events', () => {
    it('dispatches SecurityOriginAdded and MainSecurityOriginChanged when main frame navigates to a new origin',
       async () => {
         const target = universe.createTarget({connection});
         await getInitializedResourceTreeModel(target);
         const securityOriginManager = target.model(SDK.SecurityOriginManager.SecurityOriginManager)!;

         const addedSpy = sinon.spy();
         const changedSpy = sinon.spy();
         securityOriginManager.addEventListener(SDK.SecurityOriginManager.Events.SecurityOriginAdded, addedSpy);
         securityOriginManager.addEventListener(SDK.SecurityOriginManager.Events.MainSecurityOriginChanged, changedSpy);

         const mainFrame = getMainFrame(target);
         navigate(mainFrame, {url: urlString`https://new-origin.com/`, securityOrigin: 'https://new-origin.com'});

         sinon.assert.calledWith(addedSpy, sinon.match({data: 'https://new-origin.com'}));
         sinon.assert.calledWith(changedSpy, sinon.match({
           data: {mainSecurityOrigin: 'https://new-origin.com', unreachableMainSecurityOrigin: null},
         }));
         assert.strictEqual(securityOriginManager.mainSecurityOrigin(), 'https://new-origin.com');
       });

    it('does not dispatch SecurityOriginAdded when a child frame attaches with an existing origin', async () => {
      const target = universe.createTarget({connection});
      await getInitializedResourceTreeModel(target);
      const securityOriginManager = target.model(SDK.SecurityOriginManager.SecurityOriginManager)!;

      const addedSpy = sinon.spy();
      securityOriginManager.addEventListener(SDK.SecurityOriginManager.Events.SecurityOriginAdded, addedSpy);

      await addChildFrame(target, {securityOrigin: 'https://example.com'});

      sinon.assert.notCalled(addedSpy);
      assert.deepEqual(securityOriginManager.securityOrigins(), ['https://example.com']);
    });

    it('dispatches SecurityOriginAdded when a cross-origin child frame attaches', async () => {
      const target = universe.createTarget({connection});
      await getInitializedResourceTreeModel(target);
      const securityOriginManager = target.model(SDK.SecurityOriginManager.SecurityOriginManager)!;

      const addedSpy = sinon.spy();
      securityOriginManager.addEventListener(SDK.SecurityOriginManager.Events.SecurityOriginAdded, addedSpy);

      await addChildFrame(target, {securityOrigin: 'https://cross-origin.com'});

      assert.isTrue(addedSpy.calledOnceWith(sinon.match({data: 'https://cross-origin.com'})));
      assert.sameMembers(securityOriginManager.securityOrigins(), ['https://example.com', 'https://cross-origin.com']);
    });

    it('dispatches SecurityOriginRemoved and SecurityOriginAdded when a child frame navigates', async () => {
      const target = universe.createTarget({connection});
      await getInitializedResourceTreeModel(target);
      const securityOriginManager = target.model(SDK.SecurityOriginManager.SecurityOriginManager)!;

      const childFrame = await addChildFrame(target, {securityOrigin: 'https://cross-origin.com'});

      const addedSpy = sinon.spy();
      const removedSpy = sinon.spy();
      securityOriginManager.addEventListener(SDK.SecurityOriginManager.Events.SecurityOriginAdded, addedSpy);
      securityOriginManager.addEventListener(SDK.SecurityOriginManager.Events.SecurityOriginRemoved, removedSpy);

      navigate(childFrame, {url: urlString`https://second-origin.com/`, securityOrigin: 'https://second-origin.com'});

      assert.isTrue(removedSpy.calledOnceWith(sinon.match({data: 'https://cross-origin.com'})));
      assert.isTrue(addedSpy.calledOnceWith(sinon.match({data: 'https://second-origin.com'})));
      assert.sameMembers(securityOriginManager.securityOrigins(), ['https://example.com', 'https://second-origin.com']);
    });

    it('dispatches SecurityOriginRemoved when a unique-origin child frame is detached', async () => {
      const target = universe.createTarget({connection});
      const resourceTreeModel = await getInitializedResourceTreeModel(target);
      const securityOriginManager = target.model(SDK.SecurityOriginManager.SecurityOriginManager)!;

      const childFrame = await addChildFrame(target, {securityOrigin: 'https://unique-child.com'});
      assert.include(securityOriginManager.securityOrigins(), 'https://unique-child.com');

      const removedSpy = sinon.spy();
      securityOriginManager.addEventListener(SDK.SecurityOriginManager.Events.SecurityOriginRemoved, removedSpy);

      resourceTreeModel.frameDetached(childFrame.id, false);

      assert.isTrue(removedSpy.calledOnceWith(sinon.match({data: 'https://unique-child.com'})));
      assert.deepEqual(securityOriginManager.securityOrigins(), ['https://example.com']);
    });

    it('updates unreachableMainSecurityOrigin when navigating to an unreachable URL', async () => {
      const target = universe.createTarget({connection});
      await getInitializedResourceTreeModel(target);
      const securityOriginManager = target.model(SDK.SecurityOriginManager.SecurityOriginManager)!;

      const changedSpy = sinon.spy();
      securityOriginManager.addEventListener(SDK.SecurityOriginManager.Events.MainSecurityOriginChanged, changedSpy);

      const mainFrame = getMainFrame(target);
      navigate(mainFrame, {
        url: urlString`https://unreachable.example.com/`,
        unreachableUrl: urlString`https://unreachable.example.com/`,
        securityOrigin: '://',
      });

      sinon.assert.calledWith(changedSpy, sinon.match({
        data: {mainSecurityOrigin: '', unreachableMainSecurityOrigin: 'https://unreachable.example.com'},
      }));
      assert.strictEqual(securityOriginManager.unreachableMainSecurityOrigin(), 'https://unreachable.example.com');
    });
  });
});
