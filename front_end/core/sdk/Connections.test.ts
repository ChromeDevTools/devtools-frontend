// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import * as Platform from '../platform/platform.js';

import * as SDK from './sdk.js';

const {urlString} = Platform.DevToolsPath;

describe('WebSocketTransport', () => {
  setupLocaleHooks();

  let mockSocket: {
    onerror: ((event: Event) => void)|null,
    onopen: (() => void)|null,
    onmessage: ((event: MessageEvent<string>) => void)|null,
    onclose: (() => void)|null,
    send: sinon.SinonSpy,
    close: sinon.SinonSpy,
  };

  beforeEach(() => {
    mockSocket = {
      onerror: null,
      onopen: null,
      onmessage: null,
      onclose: null,
      send: sinon.spy(),
      close: sinon.spy(),
    };
    sinon.stub(globalThis, 'WebSocket').callsFake(function() {
      return mockSocket as unknown as WebSocket;
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  it('reports connection failed and mentions --remote-allow-origins on connection error', () => {
    const onWebSocketDisconnect = sinon.spy();
    const onDisconnect = sinon.spy();
    const transport =
        new SDK.Connections.WebSocketTransport(urlString`ws://localhost:9222/devtools/page/1`, onWebSocketDisconnect);
    transport.setOnDisconnect(onDisconnect);

    assert.isNotNull(mockSocket.onerror);
    mockSocket.onerror(new Event('error'));

    sinon.assert.calledOnceWithExactly(
        onWebSocketDisconnect,
        'WebSocket disconnected. Make sure --remote-allow-origins on the Chrome instance allows the current origin.');
    sinon.assert.calledOnceWithExactly(onDisconnect, 'connection failed');
    sinon.assert.calledOnce(mockSocket.close);
  });

  it('reports standard websocket disconnected message on close after opening', () => {
    const onWebSocketDisconnect = sinon.spy();
    const onDisconnect = sinon.spy();
    const transport =
        new SDK.Connections.WebSocketTransport(urlString`ws://localhost:9222/devtools/page/1`, onWebSocketDisconnect);
    transport.setOnDisconnect(onDisconnect);

    assert.isNotNull(mockSocket.onopen);
    mockSocket.onopen();

    assert.isNotNull(mockSocket.onclose);
    mockSocket.onclose();

    sinon.assert.calledOnceWithExactly(onWebSocketDisconnect, 'WebSocket disconnected');
    sinon.assert.calledOnceWithExactly(onDisconnect, 'websocket closed');
    sinon.assert.calledOnce(mockSocket.close);
  });
});
