// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import sinon from 'sinon';

import * as Host from './host.js';

describe('ResourceLoader', () => {
  it('loads a file resource for the frontend', async () => {
    const url = 'file:///resources/file-resource-to-load-for-frontend.txt';
    const loadNetworkResourceStub =
        sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'loadNetworkResource')
            .callsFake((_url, _headers, streamId, callback) => {
              Host.ResourceLoader.streamWrite(streamId, 'SUCCESS\n');
              callback({
                statusCode: 200,
                netError: 0,
                netErrorName: 'net::OK',
                headers: {},
              });
            });

    const result = await new Promise<{
      success: boolean,
      headers: Record<string, string>,
      content: string,
      errorDescription: Host.ResourceLoader.LoadErrorDescription,
    }>(resolve => {
      Host.ResourceLoader.load(url, null, (success, headers, content, errorDescription) => {
        resolve({success, headers, content, errorDescription});
      }, false);
    });

    sinon.assert.calledOnceWithExactly(loadNetworkResourceStub, url, '', sinon.match.number, sinon.match.func);
    assert.isTrue(result.success);
    assert.deepEqual(result.headers, {});
    assert.strictEqual(result.content, 'SUCCESS\n');
    assert.deepEqual(result.errorDescription, {
      statusCode: 200,
      netError: 0,
      netErrorName: 'net::OK',
      urlValid: undefined,
      message: '',
    });
  });
});
