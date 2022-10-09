// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as SDK from '../../../../../front_end/core/sdk/sdk.js';

describe('NetworkRequest', () => {
  it('can parse statusText from the first line of responseReceivedExtraInfo\'s headersText', () => {
    assert.strictEqual(
        SDK.NetworkRequest.NetworkRequest.parseStatusTextFromResponseHeadersText('HTTP/1.1 304 not modified'),
        'not modified');
    assert.strictEqual(
        SDK.NetworkRequest.NetworkRequest.parseStatusTextFromResponseHeadersText('HTTP/1.1 200 OK'), 'OK');
    assert.strictEqual(
        SDK.NetworkRequest.NetworkRequest.parseStatusTextFromResponseHeadersText('HTTP/1.1 200 OK\r\n\r\nfoo: bar\r\n'),
        'OK');
  });
});
