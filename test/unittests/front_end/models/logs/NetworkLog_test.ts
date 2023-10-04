// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../../front_end/core/common/common.js';
import * as Platform from '../../../../../front_end/core/platform/platform.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Protocol from '../../../../../front_end/generated/protocol.js';
import * as Logs from '../../../../../front_end/models/logs/logs.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';

const {assert} = chai;

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
        type: SDK.NetworkRequest.InitiatorType.Other,
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
        type: SDK.NetworkRequest.InitiatorType.Other,
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
        type: SDK.NetworkRequest.InitiatorType.Redirect,
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
        type: SDK.NetworkRequest.InitiatorType.Parser,
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
        type: SDK.NetworkRequest.InitiatorType.Script,
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
        type: SDK.NetworkRequest.InitiatorType.Script,
        url: url('http://localhost:3000/example.js'),
        lineNumber: 5,
        columnNumber: 6,
        scriptId: 'script-id-1' as Protocol.Runtime.ScriptId,
        stack: null,
        initiatorRequest: null,
      });
    });

    it('returns the initiator info if the initiator is a script without a stack',
       () => {
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
           type: SDK.NetworkRequest.InitiatorType.Script,
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
        type: SDK.NetworkRequest.InitiatorType.Preload,
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
        type: SDK.NetworkRequest.InitiatorType.Preflight,
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
        type: SDK.NetworkRequest.InitiatorType.SignedExchange,
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
    const tabTarget = createTarget({type: SDK.Target.Type.Tab});
    const mainFrameUnderTabTarget = createTarget({parentTarget: tabTarget});
    const mainFrameWithoutTabTarget = createTarget();
    const subframeTarget = createTarget({parentTarget: mainFrameWithoutTabTarget});

    const navigateTarget = (target: SDK.Target.Target) => {
      const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
      assertNotNullOrUndefined(resourceTreeModel);
      const frame = {
        url: 'http://example.com/',
        backForwardCacheDetails: {},
        unreachableUrl: () => Platform.DevToolsPath.EmptyUrlString,
        resourceTreeModel: () => resourceTreeModel,
      } as SDK.ResourceTreeModel.ResourceTreeFrame;
      resourceTreeModel.dispatchEventToListeners(
          SDK.ResourceTreeModel.Events.PrimaryPageChanged,
          {frame, type: SDK.ResourceTreeModel.PrimaryPageChangeType.Navigation});
    };

    let networkLogResetEvents = 0;
    networkLog.addEventListener(Logs.NetworkLog.Events.Reset, () => ++networkLogResetEvents);

    navigateTarget(subframeTarget);
    assert.strictEqual(networkLogResetEvents, 0);

    navigateTarget(mainFrameUnderTabTarget);
    assert.strictEqual(networkLogResetEvents, 1);

    navigateTarget(mainFrameWithoutTabTarget);
    assert.strictEqual(networkLogResetEvents, 2);
  });

  describe('on primary page changed', () => {
    let networkLog: Logs.NetworkLog.NetworkLog;
    let resourceTreeModel: SDK.ResourceTreeModel.ResourceTreeModel|null;
    let frame: SDK.ResourceTreeModel.ResourceTreeFrame;

    beforeEach(() => {
      Common.Settings.Settings.instance().moduleSetting('network_log.preserve-log').set(false);
      const target = createTarget();
      const networkManager = target.model(SDK.NetworkManager.NetworkManager);
      assertNotNullOrUndefined(networkManager);
      networkLog = Logs.NetworkLog.NetworkLog.instance();
      const networkDispatcher = new SDK.NetworkManager.NetworkDispatcher(networkManager);

      const requestWillBeSentEvent1 = {requestId: 'mockId1', request: {url: 'example.com'}} as
          Protocol.Network.RequestWillBeSentEvent;
      networkDispatcher.requestWillBeSent(requestWillBeSentEvent1);
      const requestWillBeSentEvent2 = {requestId: 'mockId2', request: {url: 'foo.com'}, loaderId: 'loaderId'} as
          Protocol.Network.RequestWillBeSentEvent;
      networkDispatcher.requestWillBeSent(requestWillBeSentEvent2);
      assert.strictEqual(networkLog.requests().length, 2);

      resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
      frame = {
        url: 'http://example.com/',
        backForwardCacheDetails: {},
        unreachableUrl: () => Platform.DevToolsPath.EmptyUrlString,
        resourceTreeModel: () => resourceTreeModel,
      } as SDK.ResourceTreeModel.ResourceTreeFrame;
    });

    it('discards requests with mismatched loaderId on navigation', () => {
      assertNotNullOrUndefined(resourceTreeModel);
      resourceTreeModel.dispatchEventToListeners(
          SDK.ResourceTreeModel.Events.PrimaryPageChanged,
          {frame, type: SDK.ResourceTreeModel.PrimaryPageChangeType.Navigation});
      assert.deepEqual(networkLog.requests().map(request => request.requestId()), ['mockId1']);
    });

    it('does not discard requests on prerender activation', () => {
      assertNotNullOrUndefined(resourceTreeModel);
      resourceTreeModel.dispatchEventToListeners(
          SDK.ResourceTreeModel.Events.PrimaryPageChanged,
          {frame, type: SDK.ResourceTreeModel.PrimaryPageChangeType.Activation});
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
      removedRequest = event.data;
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
