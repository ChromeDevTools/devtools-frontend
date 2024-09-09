// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {describeWithLocale} from '../../testing/EnvironmentHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as HAR from '../har/har.js';
import * as TextUtils from '../text_utils/text_utils.js';

const simulateRequestWithStartTime = (startTime: number) => {
  const requestId = 'r0' as Protocol.Network.RequestId;
  const request = SDK.NetworkRequest.NetworkRequest.create(
      requestId, 'p0.com' as Platform.DevToolsPath.UrlString, Platform.DevToolsPath.EmptyUrlString, null, null, null);
  request.setIssueTime(startTime, startTime);
  request.setContentDataProvider(
      () => Promise.resolve(new TextUtils.ContentData.ContentData('', false, request.mimeType)));
  return request;
};

describeWithLocale('HARWriter', () => {
  it('can correctly sort exported requests logs', async () => {
    const req1Time = new Date(2020, 0, 3);
    const req2Time = new Date(2020, 1, 3);
    const req3Time = new Date(2020, 2, 3);
    const req1 = simulateRequestWithStartTime(req1Time.getTime() / 1000);
    const req2 = simulateRequestWithStartTime(req2Time.getTime() / 1000);
    const req3 = simulateRequestWithStartTime(req3Time.getTime() / 1000);

    const progressIndicator = new UI.ProgressIndicator.ProgressIndicator();
    const compositeProgress = new Common.Progress.CompositeProgress(progressIndicator);
    const result = await HAR.Writer.Writer.harStringForRequests(
        [
          req3,
          req2,
          req1,
        ],
        {sanitize: false}, compositeProgress);
    const resultEntries = JSON.parse(result).log.entries;
    assert.strictEqual(resultEntries[0].startedDateTime, req1Time.toJSON(), 'earlier request should come first');
    assert.strictEqual(resultEntries[1].startedDateTime, req2Time.toJSON(), 'earlier request should come first');
    assert.strictEqual(resultEntries[2].startedDateTime, req3Time.toJSON(), 'earlier request should come first');
  });
});
