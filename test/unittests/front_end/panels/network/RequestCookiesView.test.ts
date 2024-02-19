// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../../../../front_end/generated/protocol.js';
import * as Network from '../../../../../front_end/panels/network/network.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import type * as Platform from '../../../../../front_end/core/platform/platform.js';
import * as Root from '../../../../../front_end/core/root/root.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import {renderElementIntoDOM} from '../../helpers/DOMHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';

const {assert} = chai;

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
    Root.Runtime.experiments.register('experimentalCookieFeatures', '');
  });
  it('show a message when request site has cookies in another partition', () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId,
        'https://www.example.com/foo.html' as Platform.DevToolsPath.UrlString, '' as Platform.DevToolsPath.UrlString,
        null, null, null);
    const component = renderCookiesView(request);
    const message = component.element.querySelector('.site-has-cookies-in-other-partition');
    assertNotNullOrUndefined(message);
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
