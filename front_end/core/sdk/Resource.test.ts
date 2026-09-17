// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import type * as Protocol from '../../generated/protocol.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {MockCDPConnection} from '../../testing/MockCDPConnection.js';
import {getMainFrame} from '../../testing/ResourceTreeHelpers.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import * as Common from '../common/common.js';
import * as Platform from '../platform/platform.js';
import * as TextUtils from '../text_utils/text_utils.js';

import * as SDK from './sdk.js';

const {urlString} = Platform.DevToolsPath;

describe('Resource', () => {
  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();
  let universe: TestUniverse;

  beforeEach(() => {
    universe = new TestUniverse();
  });

  it('returns content data from network request if available', async () => {
    const target = universe.createTarget();
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel)!;
    const frame = getMainFrame(target);

    const url = urlString`https://example.com/script.js`;
    const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest('requestId', url, url, null);

    const contentData = new TextUtils.ContentData.ContentData('console.log("hello");', false, 'text/javascript');
    const requestContentDataStub = sinon.stub(request, 'requestContentData').resolves(contentData);

    const resource = new SDK.Resource.Resource(resourceTreeModel, request, url, url, frame.id, null,
                                               Common.ResourceType.resourceTypes.Script, 'text/javascript', null, null);

    const result = await resource.requestContentData();
    assert.deepEqual(result, contentData);
    sinon.assert.calledOnce(requestContentDataStub);
  });

  it('returns content data from pageAgent if network request is not available', async () => {
    const connection = new MockCDPConnection();
    const target = universe.createTarget({connection});
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel)!;
    const frame = getMainFrame(target);

    const url = urlString`https://example.com/script.js`;
    const content = 'console.log("hello");';

    connection.setSuccessHandler('Page.getResourceContent', () => {
      return {
        content,
        base64Encoded: false,
      };
    });

    const resource = new SDK.Resource.Resource(resourceTreeModel, null, url, url, frame.id, null,
                                               Common.ResourceType.resourceTypes.Script, 'text/javascript', null, null);

    const result = await resource.requestContentData();
    assert.isFalse(TextUtils.ContentData.ContentData.isError(result));
    assert.strictEqual((result as TextUtils.ContentData.ContentData).text, content);
  });

  it('waits for network request to finish if called before it is finished', async () => {
    const connection = new MockCDPConnection();
    const target = universe.createTarget({connection});
    const networkManager = target.model(SDK.NetworkManager.NetworkManager)!;
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel)!;
    const frame = getMainFrame(target);

    const url = urlString`https://example.com/script.js`;
    const requestId = 'requestId' as Protocol.Network.RequestId;

    // 1. Dispatch the requestWillBeSent event.
    networkManager.dispatcher.requestWillBeSent({
      requestId,
      request: {
        url,
      },
      type: 'Script',
    } as unknown as Protocol.Network.RequestWillBeSentEvent);

    const request = networkManager.requestForId(requestId);
    assert.exists(request);
    assert.isNotTrue(request.finished);

    const resource = new SDK.Resource.Resource(resourceTreeModel, request, url, url, frame.id, null,
                                               Common.ResourceType.resourceTypes.Script, 'text/javascript', null, null);

    // Mock Network.getResponseBody to return the content.
    const content = 'console.log("hello");';
    connection.setSuccessHandler('Network.getResponseBody', () => {
      return {
        body: content,
        base64Encoded: false,
      };
    });

    // 2. Call requestContentData, which should not resolve yet.
    let resolved = false;
    const promise = resource.requestContentData().then(result => {
      resolved = true;
      return result;
    });

    // Wait a bit to ensure it does not resolve eagerly.
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.isFalse(resolved);

    // 3. Dispatch the loadingFinished event.
    networkManager.dispatcher.loadingFinished({
      requestId,
      timestamp: 0,
      encodedDataLength: content.length,
    });

    // 4. Now the promise should resolve.
    const result = await promise;
    assert.isTrue(resolved);
    assert.isFalse(TextUtils.ContentData.ContentData.isError(result));
    assert.strictEqual((result as TextUtils.ContentData.ContentData).text, content);
  });
});
