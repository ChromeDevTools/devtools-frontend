// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Protocol from '../../../../../front_end/generated/protocol.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {
  describeWithMockConnection,
  dispatchEvent,
  setMockConnectionResponseHandler,
} from '../../helpers/MockConnection.js';

const {assert} = chai;

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
  let target: SDK.Target.Target;
  let resourceTreeModel: SDK.ResourceTreeModel.ResourceTreeModel|null;
  let networkManager: SDK.NetworkManager.NetworkManager|null;

  beforeEach(async () => {
    setMockConnectionResponseHandler('Page.getResourceTree', () => {
      return {
        frame: {
          id: 'test-id',
          loaderId: 'test',
          url: 'http://example.com',
          securityOrigin: 'http://example.com',
          mimeType: 'text/html',
        },
        resources: [],
      };
    });
    target = createTarget();
    resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    networkManager = target.model(SDK.NetworkManager.NetworkManager);
  });

  it('calls clearRequests on reloadPage', () => {
    if (!networkManager) {
      throw new Error('No networkManager');
    }
    const clearRequests = sinon.stub(networkManager, 'clearRequests');
    resourceTreeModel?.reloadPage();
    assert.isTrue(clearRequests.calledOnce, 'Not called just once');
  });

  it('calls clearRequests on top frame navigated', () => {
    if (!networkManager) {
      throw new Error('No networkManager');
    }
    const clearRequests = sinon.stub(networkManager, 'clearRequests');
    dispatchEvent(target, 'Page.frameNavigated', {
      frame: {
        id: 'main',
        loaderId: 'foo',
        url: 'http://example.com',
        domainAndRegistry: 'example.com',
        securityOrigin: 'http://example.com',
        mimeType: 'text/html',
        secureContextType: Protocol.Page.SecureContextType.Secure,
        crossOriginIsolatedContextType: Protocol.Page.CrossOriginIsolatedContextType.Isolated,
        gatedAPIFeatures: [],
      },
    });
    assert.isTrue(clearRequests.calledOnce, 'Not called just once');
  });

  it('does not call clearRequests on non-top frame navigated', () => {
    if (!networkManager) {
      throw new Error('No networkManager');
    }
    const clearRequests = sinon.stub(networkManager, 'clearRequests');
    dispatchEvent(target, 'Page.frameNavigated', {
      frame: {
        id: 'main',
        parentId: 'parentId',
        loaderId: 'foo',
        url: 'http://example.com',
        domainAndRegistry: 'example.com',
        securityOrigin: 'http://example.com',
        mimeType: 'text/html',
        secureContextType: Protocol.Page.SecureContextType.Secure,
        crossOriginIsolatedContextType: Protocol.Page.CrossOriginIsolatedContextType.Isolated,
        gatedAPIFeatures: [],
      },
    });
    assert.isTrue(clearRequests.notCalled, 'Called unexpctedly');
  });

  it('records prerenderingStatus', () => {
    dispatchEvent(target, 'Page.frameNavigated', {
      frame: {
        id: 'main',
        loaderId: 'foo',
        url: 'http://example.com',
        domainAndRegistry: 'example.com',
        securityOrigin: 'http://example.com',
        mimeType: 'text/html',
        secureContextType: Protocol.Page.SecureContextType.Secure,
        crossOriginIsolatedContextType: Protocol.Page.CrossOriginIsolatedContextType.Isolated,
        gatedAPIFeatures: [],
      },
    });
    dispatchEvent(
        target,
        'Page.prerenderAttemptCompleted',
        {
          'initiatingFrameId': 'main',
          'prerenderingUrl': 'http://example.com/page.html',
          'finalStatus': Protocol.Page.PrerenderFinalStatus.TriggerDestroyed,
        },
    );
    dispatchEvent(
        target,
        'Page.prerenderAttemptCompleted',
        {
          'initiatingFrameId': 'next',
          'prerenderingUrl': 'http://example.com/page.html',
          'finalStatus': Protocol.Page.PrerenderFinalStatus.ClientCertRequested,
        },
    );
    assertNotNullOrUndefined(resourceTreeModel);
    assertNotNullOrUndefined(resourceTreeModel.mainFrame);
    assert.strictEqual(
        resourceTreeModel.mainFrame.prerenderFinalStatus, Protocol.Page.PrerenderFinalStatus.TriggerDestroyed);
    dispatchEvent(target, 'Page.frameNavigated', {
      frame: {
        id: 'next',
        loaderId: 'foo',
        url: 'http://example.com/next',
        domainAndRegistry: 'example.com',
        securityOrigin: 'http://example.com',
        mimeType: 'text/html',
        secureContextType: Protocol.Page.SecureContextType.Secure,
        crossOriginIsolatedContextType: Protocol.Page.CrossOriginIsolatedContextType.Isolated,
        gatedAPIFeatures: [],
      },
    });
    assertNotNullOrUndefined(resourceTreeModel);
    assertNotNullOrUndefined(resourceTreeModel.mainFrame);
    assert.strictEqual(
        resourceTreeModel.mainFrame.prerenderFinalStatus, Protocol.Page.PrerenderFinalStatus.ClientCertRequested);
  });

  it('added frame has storageKey when navigated', async () => {
    const testKey = 'test-storage-key';

    assert.isEmpty(resourceTreeModel?.frames());
    navigateFrameWithMockConnection(testKey, resourceTreeModel);
    const frames = resourceTreeModel?.frames();
    assertNotNullOrUndefined(frames);
    assert.lengthOf(frames, 1);
    const addedFrame = frames[0];
    assertNotNullOrUndefined(addedFrame);
    const key = await addedFrame.storageKey;
    assertNotNullOrUndefined(key);
    assert.strictEqual(key, testKey);
  });

  it('storage key gets updated when frame tree changes', async () => {
    const testKey = 'test-storage-key';

    assert.isEmpty(resourceTreeModel?.frames());
    const manager = target.model(SDK.StorageKeyManager.StorageKeyManager);
    assertNotNullOrUndefined(manager);
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
});
