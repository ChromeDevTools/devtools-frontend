// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import type * as Protocol from '../../generated/protocol.js';
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

  it('exports text and base64-encoded binary response content via stream write', async () => {
    const cssText = [
      '.image-background {',
      '    background-image: url("resource.php?type=image&random=1&size=200");',
      '}',
      '',
      '.image-background-2 {',
      '    background-image: url("resource.php?type=image&random=1&size=300");',
      '}',
      '',
      '@font-face {',
      '    font-family: Example;',
      '    src: url("example.ttf");',
      '}',
      '',
    ].join('\n');
    const binaryBase64 = 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4v' +
        'MDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5f' +
        'YGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6P' +
        'kJGSk5SVlpeYmZqbnJ2en6ChoqOkpaanqKmqq6ytrq+wsbKztLW2t7i5uru8vb6/' +
        'wMHCw8TFxsfIycrLzM3Oz9DR0tPU1dbX2Nna29zd3t/g4eLj5OXm5+jp6uvs7e7v' +
        '8PHy8/T19vf4+fr7/P3+/w==';

    const createContentRequest = (
                                     requestId: string,
                                     url: string,
                                     mimeType: string,
                                     content: string,
                                     isBase64: boolean,
                                     size: number,
                                     startTime: number,
                                     ): SDK.NetworkRequest.NetworkRequest => {
      const documentUrl = 'http://127.0.0.1:8000/devtools/network/har-content.html';
      const responseHeadersText = `HTTP/1.1 200 OK\r\nContent-Type: ${mimeType}\r\n\r\n`;
      const request = createNetworkRequest({
        requestId,
        url,
        documentURL: documentUrl,
        frameId: 'frame-1',
        loaderId: 'loader-1',
        requestMethod: 'GET',
        statusCode: 200,
        statusText: 'OK',
        mimeType,
        resourceType: Common.ResourceType.resourceTypes.XHR,
        requestHeaders: [{name: 'Host', value: '127.0.0.1:8000'}],
        responseHeaders: [{name: 'Content-Type', value: mimeType}],
        initiator: {
          type: 'script' as Protocol.Network.InitiatorType,
          url: documentUrl,
          requestId: 'r-parent' as Protocol.Network.RequestId,
          lineNumber: 1,
          stack: {
            callFrames: [{
              functionName: 'runTest',
              scriptId: '1' as Protocol.Runtime.ScriptId,
              url: documentUrl,
              lineNumber: 10,
              columnNumber: 4,
            }],
          },
        },
        finished: true,
        contentData: new TextUtils.ContentData.ContentData(content, isBase64, mimeType),
      });
      request.setRemoteAddress('127.0.0.1', 8000);
      request.connectionId = '1';
      request.setRequestHeadersText('GET /devtools/network/resources HTTP/1.1\r\nHost: 127.0.0.1:8000\r\n\r\n');
      request.responseHeadersText = responseHeadersText;
      request.resourceSize = size;
      request.setTransferSize(responseHeadersText.length + size);
      // Set timing after setIssueTime so startTime stays at timing.requestTime (> issueTime).
      request.setIssueTime(startTime - 0.005, startTime - 0.005);
      request.timing = {
        requestTime: startTime,
        proxyStart: -1,
        proxyEnd: -1,
        dnsStart: -1,
        dnsEnd: -1,
        connectStart: -1,
        connectEnd: -1,
        sslStart: -1,
        sslEnd: -1,
        workerStart: -1,
        workerReady: -1,
        workerFetchStart: -1,
        workerRespondWithSettled: -1,
        sendStart: 0.5,
        sendEnd: 1.0,
        pushStart: 0,
        pushEnd: 0,
        receiveHeadersStart: 1.0,
        receiveHeadersEnd: 2.0,
      };
      return request;
    };

    const cssRequest = createContentRequest(
        'r-css',
        'http://127.0.0.1:8000/devtools/network/resources/initiator.css',
        'text/css',
        cssText,
        false,
        262,
        1000,
    );
    const binaryRequest = createContentRequest(
        'r-bin',
        'http://127.0.0.1:8000/devtools/network/resources/binary.data',
        'application/octet-stream',
        binaryBase64,
        true,
        256,
        1001,
    );

    const stream = new Common.StringOutputStream.StringOutputStream();
    const progress = new Common.Progress.Progress();
    await HAR.Writer.Writer.write(stream, [cssRequest, binaryRequest], {sanitize: false}, progress);
    await stream.close();

    const entries = JSON.parse(stream.data()).log.entries;
    assert.lengthOf(entries, 2);

    const cssEntry = entries.find((entry: {request: {url: string}}) => /\/initiator\.css$/.test(entry.request.url));
    assert.exists(cssEntry);
    assert.notProperty(cssEntry.response.content, 'encoding');
    assert.deepEqual(cssEntry.response.content, {
      compression: 0,
      mimeType: 'text/css',
      size: 262,
      text: cssText,
    });

    const binaryEntry = entries.find((entry: {request: {url: string}}) => /\/binary\.data$/.test(entry.request.url));
    assert.exists(binaryEntry);
    assert.deepEqual(binaryEntry.response.content, {
      compression: 0,
      encoding: 'base64',
      mimeType: 'application/octet-stream',
      size: 256,
      text: binaryBase64,
    });
  });
});
