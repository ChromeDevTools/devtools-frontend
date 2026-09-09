// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {createNetworkRequest} from '../../testing/NetworkRequestHelpers.js';

import * as HAR from './har.js';

const simulateRequestWithStartTime = (startTime: number) => {
  const request = createNetworkRequest({
    requestId: 'r0',
    url: 'p0.com',
    documentURL: '',
    contentData: () => Promise.resolve(new TextUtils.ContentData.ContentData('', false, request.mimeType)),
  });
  request.setIssueTime(startTime, startTime);
  return request;
};

describe('HARWriter', () => {
  setupLocaleHooks();
  it('can correctly sort exported requests logs', async () => {
    const req1Time = new Date(2020, 0, 3);
    const req2Time = new Date(2020, 1, 3);
    const req3Time = new Date(2020, 2, 3);
    const req1 = simulateRequestWithStartTime(req1Time.getTime() / 1000);
    const req2 = simulateRequestWithStartTime(req2Time.getTime() / 1000);
    const req3 = simulateRequestWithStartTime(req3Time.getTime() / 1000);

    const progress = new Common.Progress.Progress();
    const compositeProgress = new Common.Progress.CompositeProgress(progress);
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

  it('exports multiple EventSource messages for an unfinished request', async () => {
    const request = simulateRequestWithStartTime(Date.now() / 1000);
    request.finished = false;
    request.mimeType = 'text/event-stream';
    request.addEventSourceMessage(
        1773352390.598671, 'session', '',
        '{"sid":"11111111-2222-3333-4444-555555555555","tenant":"66666666-7777-8888-9999-000000000000"}');
    request.addEventSourceMessage(1773352391.102345, 'message', '2', '{"role":"assistant","content":"hello"}');

    const progress = new Common.Progress.Progress();
    const compositeProgress = new Common.Progress.CompositeProgress(progress);
    const result = await HAR.Writer.Writer.harStringForRequests([request], {sanitize: false}, compositeProgress);
    const resultEntries = JSON.parse(result).log.entries;

    assert.lengthOf(resultEntries, 1);
    assert.lengthOf(resultEntries[0]._eventSourceMessages, 2);
    assert.strictEqual(resultEntries[0]._eventSourceMessages[0].eventName, 'session');
    assert.strictEqual(resultEntries[0]._eventSourceMessages[1].eventId, '2');
  });

  it('exports WebSocket messages', async () => {
    const request = simulateRequestWithStartTime(Date.now() / 1000);
    request.setResourceType(Common.ResourceType.resourceTypes.WebSocket);

    const frames: SDK.NetworkRequest.WebSocketFrame[] = [
      {
        type: SDK.NetworkRequest.WebSocketFrameType.Send,
        time: 1,
        text: 'text message',
        opCode: 1,
        mask: true,
      },
      {
        type: SDK.NetworkRequest.WebSocketFrameType.Send,
        time: 2,
        text: 'YmluYXJ5IG1lc3NhZ2U=',
        opCode: 2,
        mask: true,
      },
      {
        type: SDK.NetworkRequest.WebSocketFrameType.Send,
        time: 3,
        text: 'last message',
        opCode: 1,
        mask: true,
      },
      {
        type: SDK.NetworkRequest.WebSocketFrameType.Receive,
        time: 4,
        text: 'text message',
        opCode: 1,
        mask: false,
      },
      {
        type: SDK.NetworkRequest.WebSocketFrameType.Receive,
        time: 5,
        text: 'YmluYXJ5IG1lc3NhZ2U=',
        opCode: 2,
        mask: false,
      },
      {
        type: SDK.NetworkRequest.WebSocketFrameType.Receive,
        time: 6,
        text: 'last message',
        opCode: 1,
        mask: false,
      },
    ];

    for (const frame of frames) {
      request.addFrame(frame);
    }

    const progress = new Common.Progress.Progress();
    const compositeProgress = new Common.Progress.CompositeProgress(progress);
    const result = await HAR.Writer.Writer.harStringForRequests([request], {sanitize: false}, compositeProgress);
    const resultEntries = JSON.parse(result).log.entries;

    assert.lengthOf(resultEntries, 1);
    const entry = resultEntries[0];
    assert.property(entry, '_webSocketMessages');
    const exportedMessages = entry._webSocketMessages;
    assert.lengthOf(exportedMessages, 6);

    const expectedMessages = frames.map(f => ({
                                          type: f.type,
                                          time: f.time,
                                          opcode: f.opCode,
                                          data: f.text,
                                        }));

    assert.deepEqual(exportedMessages, expectedMessages);
  });
});
