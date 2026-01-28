// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {
  assertScreenshot,
  renderElementIntoDOM,
} from '../../testing/DOMHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';

import * as Network from './network.js';

const {RequestDeviceBoundSessionsView} = Network;
const {urlString} = Platform.DevToolsPath;

describeWithMockConnection('RequestDeviceBoundSessionsView', () => {
  setupLocaleHooks();

  it('renders device bound sessions', async () => {
    const container = document.createElement('div');
    renderElementIntoDOM(container);
    RequestDeviceBoundSessionsView.DEFAULT_VIEW(
        {
          deviceBoundSessionUsages: [
            {
              sessionKey: {site: 'https://example.com', id: 'session-1'},
              usage: Protocol.Network.DeviceBoundSessionWithUsageUsage.Deferred,
            },
            {
              sessionKey: {site: 'https://example.com', id: 'session-2'},
              usage: Protocol.Network.DeviceBoundSessionWithUsageUsage.NotInScope,
            },
            {
              sessionKey: {site: 'https://example.com', id: 'session-3'},
              usage: Protocol.Network.DeviceBoundSessionWithUsageUsage.InScopeRefreshNotYetNeeded,
            },
            {
              sessionKey: {site: 'https://example.com', id: 'session-4'},
              usage: Protocol.Network.DeviceBoundSessionWithUsageUsage.InScopeRefreshNotAllowed,
            },
            {
              sessionKey: {site: 'https://example.com', id: 'session-5'},
              usage: Protocol.Network.DeviceBoundSessionWithUsageUsage.ProactiveRefreshNotPossible,
            },
            {
              sessionKey: {site: 'https://example.com', id: 'session-6'},
              usage: Protocol.Network.DeviceBoundSessionWithUsageUsage.ProactiveRefreshAttempted,
            },
          ],
        },
        {}, container);
    await assertScreenshot('network/request_device_bound_sessions_view.png');
  });

  it('updates when the request headers change', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId, urlString`https://www.example.com`, urlString``, null, null, null);

    const view = createViewFunctionStub(RequestDeviceBoundSessionsView.RequestDeviceBoundSessionsView);
    const component = new RequestDeviceBoundSessionsView.RequestDeviceBoundSessionsView(request, view);
    renderElementIntoDOM(component);
    component.wasShown();

    assert.deepEqual(view.input.deviceBoundSessionUsages, []);

    request.addExtraRequestInfo({
      deviceBoundSessionUsages: [
        {
          sessionKey: {site: 'https://example.com', id: 'session-1'},
          usage: Protocol.Network.DeviceBoundSessionWithUsageUsage.Deferred,
        },
      ],
      blockedRequestCookies: [],
      includedRequestCookies: [],
      connectTiming: {requestTime: 0},
      requestHeaders: [],
    } as SDK.NetworkRequest.ExtraRequestInfo);

    request.dispatchEventToListeners(SDK.NetworkRequest.Events.RESPONSE_HEADERS_CHANGED);

    assert.deepEqual(view.input.deviceBoundSessionUsages, [
      {
        sessionKey: {site: 'https://example.com', id: 'session-1'},
        usage: Protocol.Network.DeviceBoundSessionWithUsageUsage.Deferred,
      },
    ]);
  });
});
