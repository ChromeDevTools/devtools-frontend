// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';

import * as Network from './network.js';

function renderCookiesView(request: SDK.NetworkRequest.NetworkRequest): Network.RequestCookiesView.RequestCookiesView {
  const component = new Network.RequestCookiesView.RequestCookiesView(request);
  const div = document.createElement('div');
  renderElementIntoDOM(div);
  component.markAsRoot();
  component.show(div);
  return component;
}

describeWithMockConnection('RequestCookiesView', () => {
  beforeEach(() => {
    Root.Runtime.experiments.register('experimental-cookie-features', '');
  });
  it('show a message when request site has cookies in another partition', () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId,
        'https://www.example.com/foo.html' as Platform.DevToolsPath.UrlString, '' as Platform.DevToolsPath.UrlString,
        null, null, null);
    const component = renderCookiesView(request);
    const message = component.element.querySelector('.site-has-cookies-in-other-partition');
    assert.exists(message);
    assert.isTrue(message.classList.contains('hidden'));
    request.addExtraRequestInfo({
      siteHasCookieInOtherPartition: true,
      includedRequestCookies: [],
      blockedRequestCookies: [],
      connectTiming: {requestTime: 0},
      requestHeaders: [],
    } as SDK.NetworkRequest.ExtraRequestInfo);
    component.willHide();
    component.wasShown();
    assert.isFalse(message.classList.contains('hidden'));
    component.detach();
  });
});
