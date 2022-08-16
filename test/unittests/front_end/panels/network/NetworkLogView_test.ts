// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import type * as Protocol from '../../../../../front_end/generated/protocol.js';
import type * as Platform from '../../../../../front_end/core/platform/platform.js';
import * as Network from '../../../../../front_end/panels/network/network.js';

describe('NetworkLogView', () => {
  it('can create curl command parameters for headers without value', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId,
        'https://www.example.com/file.html' as Platform.DevToolsPath.UrlString, '' as Platform.DevToolsPath.UrlString,
        null, null, null);
    request.requestMethod = 'GET';
    request.setRequestHeaders([
      {name: 'header-with-value', value: 'some value'},
      {name: 'no-value-header', value: ''},
    ]);
    const actual = await Network.NetworkLogView.NetworkLogView.generateCurlCommand(request, 'unix');
    const expected =
        'curl \'https://www.example.com/file.html\' \\\n  -H \'header-with-value: some value\' \\\n  -H \'no-value-header;\' \\\n  --compressed';
    assert.strictEqual(actual, expected);
  });
});
