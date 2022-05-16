// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Protocol from '../../../../../front_end/generated/protocol.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection, dispatchEvent} from '../../helpers/MockConnection.js';

const {assert} = chai;

describeWithMockConnection('ResourceTreeModel', () => {
  let target: SDK.Target.Target;
  let resourceTreeModel: SDK.ResourceTreeModel.ResourceTreeModel|null;
  let networkManager: SDK.NetworkManager.NetworkManager|null;

  beforeEach(() => {
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

  it('calls clearRequests on frameNavigated', () => {
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
});
