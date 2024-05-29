// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Protocol from '../../generated/protocol.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {
  describeWithMockConnection,
  dispatchEvent,
  setMockConnectionResponseHandler,
} from '../../testing/MockConnection.js';
import {
  getInitializedResourceTreeModel,
  LOADER_ID,
} from '../../testing/ResourceTreeHelpers.js';

import * as SDK from './sdk.js';

function navigateFrameWithMockConnection(
    storageKey: string, resourceTreeModel: SDK.ResourceTreeModel.ResourceTreeModel|null) {
  setMockConnectionResponseHandler('Storage.getStorageKeyForFrame', () => ({storageKey}));
  resourceTreeModel?.frameNavigated(
      {
        id: 'main',
        loaderId: 'foo',
        url: 'http://example.com',
        securityOrigin: 'http://example.com',
        mimeType: 'text/html',
      } as Protocol.Page.Frame,
      undefined,
  );
}

describeWithMockConnection('ResourceTreeModel', () => {
  it('calls clearRequests on reloadPage', async () => {
    const resourceTreeModel = await getInitializedResourceTreeModel(createTarget());
    const clearRequests = sinon.stub(SDK.NetworkManager.NetworkManager.prototype, 'clearRequests');
    resourceTreeModel.reloadPage();
    assert.isTrue(clearRequests.calledOnce, 'Not called just once');
  });

  function frameNavigatedEvent(parentId?: string, id?: string) {
    return {
      frame: {
        id: id ?? 'main',
        parentId,
        loaderId: 'foo',
        url: 'http://example.com',
        domainAndRegistry: 'example.com',
        securityOrigin: 'http://example.com',
        mimeType: 'text/html',
        secureContextType: Protocol.Page.SecureContextType.Secure,
        crossOriginIsolatedContextType: Protocol.Page.CrossOriginIsolatedContextType.Isolated,
        gatedAPIFeatures: [],
      },
    };
  }

  it('calls clearRequests on top frame navigated', () => {
    const target = createTarget();
    const clearRequests = sinon.stub(SDK.NetworkManager.NetworkManager.prototype, 'clearRequests');
    dispatchEvent(target, 'Page.frameNavigated', frameNavigatedEvent());
    assert.isTrue(clearRequests.calledOnce, 'Not called just once');
  });

  it('does not call clearRequests on non-top frame navigated', () => {
    const target = createTarget();
    const clearRequests = sinon.stub(SDK.NetworkManager.NetworkManager.prototype, 'clearRequests');
    dispatchEvent(target, 'Page.frameNavigated', frameNavigatedEvent('parentId'));
    assert.isTrue(clearRequests.notCalled, 'Called unexpctedly');
  });

  it('added frame has storageKey when navigated', async () => {
    const testKey = 'test-storage-key';

    const target = createTarget();
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    assert.isEmpty(resourceTreeModel!.frames());
    navigateFrameWithMockConnection(testKey, resourceTreeModel);
    const frames = resourceTreeModel!.frames();
    assert.lengthOf(frames, 1);
    const addedFrame = frames[0];
    const key = await addedFrame.getStorageKey(false);
    assert.strictEqual(key, testKey);
  });

  it('storage key gets updated when frame tree changes', async () => {
    const testKey = 'test-storage-key';

    const target = createTarget();
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    assert.isEmpty(resourceTreeModel?.frames());
    const manager = target.model(SDK.StorageKeyManager.StorageKeyManager);
    assert.exists(manager);
    const storageKeyAddedPromise = new Promise<void>(resolve => {
      manager.addEventListener(SDK.StorageKeyManager.Events.StorageKeyAdded, () => {
        resolve();
      });
    });
    navigateFrameWithMockConnection(testKey, resourceTreeModel);
    await storageKeyAddedPromise;
    assert.strictEqual(resourceTreeModel?.frames().length, 1);

    const mainStorageKeyChangedPromise = new Promise<void>(resolve => {
      manager.addEventListener(SDK.StorageKeyManager.Events.MainStorageKeyChanged, () => {
        resolve();
      });
    });
    const storageKeyRemovedPromise = new Promise<void>(resolve => {
      manager.addEventListener(SDK.StorageKeyManager.Events.StorageKeyRemoved, () => {
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
    const tabTarget = createTarget({type: SDK.Target.Type.Tab});
    const mainFrameTarget = createTarget({parentTarget: tabTarget});
    const subframeTarget = createTarget({parentTarget: mainFrameTarget});
    const reloadMainFramePage = sinon.spy(getResourceTreeModel(mainFrameTarget), 'reloadPage');
    const reloadSubframePage = sinon.spy(getResourceTreeModel(subframeTarget), 'reloadPage');
    SDK.ResourceTreeModel.ResourceTreeModel.reloadAllPages();

    assert.isTrue(reloadMainFramePage.calledOnce);
    assert.isTrue(reloadSubframePage.notCalled);
  });

  it('tags reloads with the targets loaderId', async () => {
    const target = createTarget();
    const resourceTreeModel = await getInitializedResourceTreeModel(target);

    const reload = sinon.spy(target.pageAgent(), 'invoke_reload');
    assert.isNotNull(resourceTreeModel.mainFrame);
    resourceTreeModel.reloadPage();
    assert.isTrue(reload.calledOnce);
    assert.deepStrictEqual(
        reload.args[0], [{ignoreCache: undefined, loaderId: LOADER_ID, scriptToEvaluateOnLoad: undefined}]);
  });

  it('identifies not top frame', async () => {
    const tabTarget = createTarget({type: SDK.Target.Type.Tab});
    const mainFrameTarget = createTarget({parentTarget: tabTarget});
    const subframeTarget = createTarget({parentTarget: mainFrameTarget});

    dispatchEvent(mainFrameTarget, 'Page.frameNavigated', frameNavigatedEvent());
    dispatchEvent(subframeTarget, 'Page.frameNavigated', frameNavigatedEvent('parentId'));
    assert.isTrue(getResourceTreeModel(mainFrameTarget).mainFrame!.isOutermostFrame());
    assert.isFalse(getResourceTreeModel(subframeTarget).mainFrame!.isOutermostFrame());
  });

  it('emits PrimaryPageChanged event upon prerender activation', async () => {
    const tabTarget = createTarget({type: SDK.Target.Type.Tab});
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

    const prerenderTarget = SDK.TargetManager.TargetManager.instance().targetById(targetId);
    assert.exists(prerenderTarget);
    const resourceTreeModel = prerenderTarget.model(SDK.ResourceTreeModel.ResourceTreeModel);
    assert.exists(resourceTreeModel);

    const primaryPageChangedEvents:
        {frame: SDK.ResourceTreeModel.ResourceTreeFrame, type: SDK.ResourceTreeModel.PrimaryPageChangeType}[] = [];
    resourceTreeModel.addEventListener(
        SDK.ResourceTreeModel.Events.PrimaryPageChanged, event => primaryPageChangedEvents.push(event.data));

    const frame = resourceTreeModel.frameAttached('frame_id' as Protocol.Page.FrameId, null);
    childTargetManager.targetInfoChanged({targetInfo: {...targetInfo, subtype: undefined}});

    assert.strictEqual(primaryPageChangedEvents.length, 1);
    assert.strictEqual(primaryPageChangedEvents[0].frame, frame);
    assert.strictEqual(primaryPageChangedEvents[0].type, SDK.ResourceTreeModel.PrimaryPageChangeType.Activation);
  });

  it('emits PrimaryPageChanged event only upon navigation of the primary frame', async () => {
    const tabTarget = createTarget({type: SDK.Target.Type.Tab});
    const mainFrameTarget = createTarget({parentTarget: tabTarget});
    const subframeTarget = createTarget({parentTarget: mainFrameTarget});
    const prerenderTarget = createTarget({parentTarget: tabTarget, subtype: 'prerender'});

    const primaryPageChangedEvents:
        {frame: SDK.ResourceTreeModel.ResourceTreeFrame, type: SDK.ResourceTreeModel.PrimaryPageChangeType}[] = [];

    [getResourceTreeModel(mainFrameTarget), getResourceTreeModel(subframeTarget), getResourceTreeModel(prerenderTarget)]
        .forEach(resourceTreeModel => {
          resourceTreeModel.addEventListener(
              SDK.ResourceTreeModel.Events.PrimaryPageChanged, event => primaryPageChangedEvents.push(event.data));
        });

    dispatchEvent(mainFrameTarget, 'Page.frameNavigated', frameNavigatedEvent());
    assert.strictEqual(primaryPageChangedEvents.length, 1);
    assert.strictEqual(primaryPageChangedEvents[0].frame.id, 'main');
    assert.strictEqual(primaryPageChangedEvents[0].type, SDK.ResourceTreeModel.PrimaryPageChangeType.Navigation);

    dispatchEvent(subframeTarget, 'Page.frameNavigated', frameNavigatedEvent('main', 'child'));
    assert.strictEqual(primaryPageChangedEvents.length, 1);

    dispatchEvent(prerenderTarget, 'Page.frameNavigated', frameNavigatedEvent());
    assert.strictEqual(primaryPageChangedEvents.length, 1);
  });

  it('rebuilds the resource tree upon bfcache-navigation', async () => {
    const target = createTarget();
    const frameManager = SDK.FrameManager.FrameManager.instance();
    const removedFromFrameManagerSpy = sinon.spy(frameManager, 'modelRemoved');
    const addedToFrameManagerSpy = sinon.spy(frameManager, 'modelAdded');
    const resourceTreeModel = getResourceTreeModel(target);
    await resourceTreeModel.once(SDK.ResourceTreeModel.Events.CachedResourcesLoaded);
    const cachedResourcesLoaded = resourceTreeModel.once(SDK.ResourceTreeModel.Events.CachedResourcesLoaded);
    const processPendingEventsSpy = sinon.spy(resourceTreeModel, 'processPendingEvents');
    const initialFrame = resourceTreeModel.frames()[0];

    dispatchEvent(
        target, 'Page.frameNavigated',
        {...frameNavigatedEvent(), type: Protocol.Page.NavigationType.BackForwardCacheRestore});

    await cachedResourcesLoaded;
    assert.isTrue(removedFromFrameManagerSpy.calledOnce);
    assert.isTrue(addedToFrameManagerSpy.calledOnce);
    assert.isTrue(processPendingEventsSpy.calledTwice);

    const frameAfterNav = resourceTreeModel.frames()[0];
    assert.strictEqual(
        initialFrame, frameAfterNav,
        'Instead of keeping the existing frame, a new frame was created upon bfcache-navigation');
  });
});
