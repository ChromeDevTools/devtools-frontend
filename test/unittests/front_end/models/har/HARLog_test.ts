// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as HAR from '../../../../../front_end/models/har/har.js';

describe('HARLog', () => {
  it('blocked time when no response received is returned in milliseconds (crbug.com/1145177)', async () => {
    const request = new SDK.NetworkRequest.NetworkRequest('r0', 'p0.com', '', '', '', null);
    const issueTime = new Date(2020, 1, 3).getTime() / 1000;
    request.setIssueTime(issueTime, issueTime);
    request.endTime = issueTime + 5;
    const entry = await HAR.HARLog.Entry.build(request);

    assert.strictEqual(entry.timings.blocked, 5000, 'HARLog entry\'s blocked time is incorrect');
  });
});
