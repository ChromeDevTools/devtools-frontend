// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import {activate, getMainFrame, LOADER_ID, navigate} from '../../testing/ResourceTreeHelpers.js';
import * as Logs from '../logs/logs.js';

function url(input: string): Platform.DevToolsPath.UrlString {
  return input as unknown as Platform.DevToolsPath.UrlString;
}

describe('NetworkLog', () => {
  describe('initiatorInfoForRequest', () => {
    const {initiatorInfoForRequest} = Logs.NetworkLog.NetworkLog;

    it('uses the passed in initiator info if it exists', () => {
      const request = {
        initiator() {
          return null;
        },
        redirectSource() {
          return null;
        },
      } as unknown as SDK.NetworkRequest.NetworkRequest;
      const existingInfo: Logs.NetworkLog.InitiatorData = {
        info: null,
        chain: null,
        request: undefined,
      };
      const info = initiatorInfoForRequest(request, existingInfo);
      assert.deepEqual(info, {
        type: SDK.NetworkRequest.InitiatorType.OTHER,
        url: Platform.DevToolsPath.EmptyUrlString,
        lineNumber: undefined,
        columnNumber: undefined,
        scriptId: null,
        stack: null,
        initiatorRequest: null,
      });
      assert.deepEqual(info, existingInfo.info);
    });

    it('returns "other" if there is no initiator or redirect', () => {
      const request = {
        initiator() {
          return null;
        },
        redirectSource() {
          return null;
        },
      } as unknown as SDK.NetworkRequest.NetworkRequest;
      const info = initiatorInfoForRequest(request);
      assert.deepEqual(info, {
        type: SDK.NetworkRequest.InitiatorType.OTHER,
        url: Platform.DevToolsPath.EmptyUrlString,
        lineNumber: undefined,
        columnNumber: undefined,
        scriptId: null,
        stack: null,
        initiatorRequest: null,
      });
    });

    it('returns the redirect info if the request has a redirect', () => {
      const request = {
        initiator() {
          return null;
        },
        redirectSource() {
          return {
            url() {
              return url('http://localhost:3000/example.js');
            },
          } as unknown as SDK.NetworkRequest.NetworkRequest;
        },
      } as unknown as SDK.NetworkRequest.NetworkRequest;
      const info = initiatorInfoForRequest(request);
      assert.deepEqual(info, {
        type: SDK.NetworkRequest.InitiatorType.REDIRECT,
        url: url('http://localhost:3000/example.js'),
        lineNumber: undefined,
        columnNumber: undefined,
        scriptId: null,
        stack: null,
        initiatorRequest: null,
      });
    });

    it('returns the initiator info if the initiator is the parser', () => {
      const request = {
        initiator() {
          return {
            type: Protocol.Network.InitiatorType.Parser,
            url: url('http://localhost:3000/example.js'),
            lineNumber: 5,
            columnNumber: 6,
          } as unknown as Protocol.Network.Initiator;
        },
        redirectSource() {
          return null;
        },
      } as unknown as SDK.NetworkRequest.NetworkRequest;
      const info = initiatorInfoForRequest(request);
      assert.deepEqual(info, {
        type: SDK.NetworkRequest.InitiatorType.PARSER,
        url: url('http://localhost:3000/example.js'),
        lineNumber: 5,
        columnNumber: 6,
        scriptId: null,
        stack: null,
        initiatorRequest: null,
      });
    });

    it('returns the initiator info if the initiator is a script with a stack', () => {
      const request = {
        initiator() {
          return {
            type: Protocol.Network.InitiatorType.Script,
            url: url('http://localhost:3000/example.js'),
            stack: {
              callFrames: [{
                functionName: 'foo',
                url: url('http://localhost:3000/example.js'),
                scriptId: 'script-id-1' as Protocol.Runtime.ScriptId,
                lineNumber: 5,
                columnNumber: 6,
              }],
            },
          } as unknown as Protocol.Network.Initiator;
        },
        redirectSource() {
          return null;
        },
      } as unknown as SDK.NetworkRequest.NetworkRequest;
      const info = initiatorInfoForRequest(request);
      assert.deepEqual(info, {
        type: SDK.NetworkRequest.InitiatorType.SCRIPT,
        url: url('http://localhost:3000/example.js'),
        lineNumber: 5,
        columnNumber: 6,
        scriptId: 'script-id-1' as Protocol.Runtime.ScriptId,
        stack: {
          callFrames: [{
            functionName: 'foo',
            url: url('http://localhost:3000/example.js'),
            scriptId: 'script-id-1' as Protocol.Runtime.ScriptId,
            lineNumber: 5,
            columnNumber: 6,
          }],
        },
        initiatorRequest: null,
      });
    });

    it('deals with a nested stack and finds the top frame to use for the script-id', () => {
      const request = {
        initiator() {
          return {
            type: Protocol.Network.InitiatorType.Script,
            url: url('http://localhost:3000/example.js'),
            stack: {
              parent: {
                callFrames: [{
                  functionName: 'foo',
                  url: url('http://localhost:3000/example.js'),
                  scriptId: 'script-id-1' as Protocol.Runtime.ScriptId,
                  lineNumber: 5,
                  columnNumber: 6,
                }],
              },
              callFrames: [],
            },
          } as unknown as Protocol.Network.Initiator;
        },
        redirectSource() {
          return null;
        },
      } as unknown as SDK.NetworkRequest.NetworkRequest;
      const info = initiatorInfoForRequest(request);
      assert.deepEqual(info, {
        type: SDK.NetworkRequest.InitiatorType.SCRIPT,
        url: url('http://localhost:3000/example.js'),
        lineNumber: 5,
        columnNumber: 6,
        scriptId: 'script-id-1' as Protocol.Runtime.ScriptId,
        stack: null,
        initiatorRequest: null,
      });
    });

    it('returns the initiator info if the initiator is a script without a stack', () => {
      const request = {
        initiator() {
          return {
            type: Protocol.Network.InitiatorType.Script,
            url: url('http://localhost:3000/example.js'),
          } as unknown as Protocol.Network.Initiator;
        },
        redirectSource() {
          return null;
        },
      } as unknown as SDK.NetworkRequest.NetworkRequest;
      const info = initiatorInfoForRequest(request);
      assert.deepEqual(info, {
        type: SDK.NetworkRequest.InitiatorType.SCRIPT,
        url: url('http://localhost:3000/example.js'),
        lineNumber: undefined,
        columnNumber: undefined,
        scriptId: null,
        stack: null,
        initiatorRequest: null,
      });
    });

    it('returns the info for a Preload request', () => {
      const request = {
        initiator() {
          return {
            type: Protocol.Network.InitiatorType.Preload,
          } as unknown as Protocol.Network.Initiator;
        },
        redirectSource() {
          return null;
        },
      } as unknown as SDK.NetworkRequest.NetworkRequest;
      const info = initiatorInfoForRequest(request);
      assert.deepEqual(info, {
        type: SDK.NetworkRequest.InitiatorType.PRELOAD,
        url: Platform.DevToolsPath.EmptyUrlString,
        lineNumber: undefined,
        columnNumber: undefined,
        scriptId: null,
        stack: null,
        initiatorRequest: null,
      });
    });

    it('returns the info for a Preflight request', () => {
      const PREFLIGHT_INITIATOR_REQUEST = {} as unknown as SDK.NetworkRequest.NetworkRequest;
      const request = {
        initiator() {
          return {
            type: Protocol.Network.InitiatorType.Preflight,
          } as unknown as Protocol.Network.Initiator;
        },
        preflightInitiatorRequest() {
          return PREFLIGHT_INITIATOR_REQUEST;
        },
        redirectSource() {
          return null;
        },
      } as unknown as SDK.NetworkRequest.NetworkRequest;
      const info = initiatorInfoForRequest(request);
      assert.deepEqual(info, {
        type: SDK.NetworkRequest.InitiatorType.PREFLIGHT,
        url: Platform.DevToolsPath.EmptyUrlString,
        lineNumber: undefined,
        columnNumber: undefined,
        scriptId: null,
        stack: null,
        initiatorRequest: PREFLIGHT_INITIATOR_REQUEST,
      });
    });

    it('returns the info for a signed exchange request', () => {
      const request = {
        initiator() {
          return {
            type: Protocol.Network.InitiatorType.SignedExchange,
            url: url('http://localhost:3000/example.js'),
          } as unknown as Protocol.Network.Initiator;
        },
        redirectSource() {
          return null;
        },
      } as unknown as SDK.NetworkRequest.NetworkRequest;
      const info = initiatorInfoForRequest(request);
      assert.deepEqual(info, {
        type: SDK.NetworkRequest.InitiatorType.SIGNED_EXCHANGE,
        url: url('http://localhost:3000/example.js'),
        lineNumber: undefined,
        columnNumber: undefined,
        scriptId: null,
        stack: null,
        initiatorRequest: null,
      });
    });
  });
});

describeWithMockConnection('NetworkLog', () => {
  it('clears on main frame navigation', () => {
    const networkLog = Logs.NetworkLog.NetworkLog.instance();
    const tabTarget = createTarget({type: SDK.Target.Type.TAB});
    const mainFrameTarget = createTarget({parentTarget: tabTarget});
    const mainFrame = getMainFrame(mainFrameTarget);
    const subframe = getMainFrame(createTarget({parentTarget: mainFrameTarget}));

    let networkLogResetEvents = 0;
    networkLog.addEventListener(Logs.NetworkLog.Events.Reset, () => ++networkLogResetEvents);

    navigate(subframe);
    assert.strictEqual(networkLogResetEvents, 0);

    navigate(mainFrame);
    assert.strictEqual(networkLogResetEvents, 1);
  });

  describe('on primary page changed', () => {
    let networkLog: Logs.NetworkLog.NetworkLog;
    let target: SDK.Target.Target;

    beforeEach(() => {
      Common.Settings.Settings.instance().moduleSetting('network-log.preserve-log').set(false);
      target = createTarget();
      const networkManager = target.model(SDK.NetworkManager.NetworkManager);
      assert.exists(networkManager);
      networkLog = Logs.NetworkLog.NetworkLog.instance();
      const networkDispatcher = new SDK.NetworkManager.NetworkDispatcher(networkManager);

      const requestWillBeSentEvent1 = {requestId: 'mockId1', request: {url: 'example.com'}, loaderId: LOADER_ID} as
          Protocol.Network.RequestWillBeSentEvent;
      networkDispatcher.requestWillBeSent(requestWillBeSentEvent1);
      const requestWillBeSentEvent2 = {requestId: 'mockId2', request: {url: 'foo.com'}, loaderId: 'OTHER_LOADER_ID'} as
          Protocol.Network.RequestWillBeSentEvent;
      networkDispatcher.requestWillBeSent(requestWillBeSentEvent2);
      assert.strictEqual(networkLog.requests().length, 2);
    });

    it('discards requests with mismatched loaderId on navigation', () => {
      navigate(getMainFrame(target));
      assert.deepEqual(networkLog.requests().map(request => request.requestId()), ['mockId1']);
    });

    it('does not discard requests on prerender activation', () => {
      activate(target);
      assert.deepEqual(networkLog.requests().map(request => request.requestId()), ['mockId1', 'mockId2']);
    });
  });

  it('removes preflight requests with a UnexpectedPrivateNetworkAccess CORS error', () => {
    const target = createTarget();
    const networkManager = target.model(SDK.NetworkManager.NetworkManager);
    if (!networkManager) {
      throw new Error('No networkManager');
    }
    const networkLog = Logs.NetworkLog.NetworkLog.instance();
    let removedRequest: SDK.NetworkRequest.NetworkRequest|null = null;
    networkLog.addEventListener(Logs.NetworkLog.Events.RequestRemoved, event => {
      assert.isNull(removedRequest, 'Request was removed multiple times.');
      removedRequest = event.data.request;
    });

    const request = {
      requestId: () => 'request-id',
      isPreflightRequest: () => true,
      initiator: () => null,
      corsErrorStatus: () => ({corsError: Protocol.Network.CorsError.UnexpectedPrivateNetworkAccess}),
    } as SDK.NetworkRequest.NetworkRequest;
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.RequestStarted, {request, originalRequest: null});
    assert.strictEqual(networkLog.requests().length, 1);

    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.RequestUpdated, request);
    assert.strictEqual(request, removedRequest);
    assert.strictEqual(networkLog.requests().length, 0);
  });
});
