// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Platform from '../../../../../front_end/core/platform/platform.js';
import * as Protocol from '../../../../../front_end/generated/protocol.js';
import * as HAR from '../../../../../front_end/models/har/har.js';

describe('HAR.Log', () => {
  it('blocked time when no response received is returned in milliseconds (crbug.com/1145177)', async () => {
    const requestId = 'r0' as Protocol.Network.RequestId;
    const request = SDK.NetworkRequest.NetworkRequest.create(
        requestId, 'p0.com' as Platform.DevToolsPath.UrlString, Platform.DevToolsPath.EmptyUrlString, null, null, null);
    const issueTime = new Date(2020, 1, 3).getTime() / 1000;
    request.setIssueTime(issueTime, issueTime);
    request.endTime = issueTime + 5;
    const entry = await HAR.Log.Entry.build(request);

    assert.strictEqual(entry.timings.blocked, 5000, 'HARLog entry\'s blocked time is incorrect');
  });

  it('_initiator.requestId is exported', async () => {
    const requestId = 'r0' as Protocol.Network.RequestId;
    const request = SDK.NetworkRequest.NetworkRequest.create(
        requestId, 'p0.com' as Platform.DevToolsPath.UrlString, Platform.DevToolsPath.EmptyUrlString, null, null,
        {requestId, type: Protocol.Network.InitiatorType.Script});
    const entry = await HAR.Log.Entry.build(request);

    assert.strictEqual(entry._initiator?.requestId, requestId);
  });
});
