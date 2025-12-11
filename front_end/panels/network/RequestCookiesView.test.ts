// Copyright 2024 The Chromium Authors
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

const {RequestCookiesView} = Network;
const {urlString} = Platform.DevToolsPath;

describeWithMockConnection('RequestCookiesView', () => {
  setupLocaleHooks();

  const mockCookie = (name: string, value: string): SDK.Cookie.Cookie => {
    return new SDK.Cookie.Cookie(name, value);
  };

  it('renders correctly with no cookies', async () => {
    const container = document.createElement('div');
    renderElementIntoDOM(container);
    RequestCookiesView.DEFAULT_VIEW(
        {
          requestCookies: {cookies: [], cookieToBlockedReasons: new Map(), cookieToExemptionReason: new Map()},
          responseCookies: {cookies: [], cookieToBlockedReasons: new Map(), cookieToExemptionReason: new Map()},
          malformedResponseCookies: [],
          showFilteredOutCookies: false,
          hasBlockedCookies: false,
          gotCookies: false,
          onShowFilteredOutCookiesChange: () => {},
          siteHasCookieInOtherPartition: false,
        },
        undefined, container);
    await assertScreenshot('network/request_cookies_view_no_cookies.png');
  });

  it('renders correctly with request and response cookies', async () => {
    const container = document.createElement('div');
    renderElementIntoDOM(container);
    RequestCookiesView.DEFAULT_VIEW(
        {
          requestCookies: {
            cookies: [mockCookie('request-cookie', 'val1')],
            cookieToBlockedReasons: new Map(),
            cookieToExemptionReason: new Map(),
          },
          responseCookies: {
            cookies: [mockCookie('response-cookie', 'val2')],
            cookieToBlockedReasons: new Map(),
            cookieToExemptionReason: new Map(),
          },
          malformedResponseCookies: [],
          showFilteredOutCookies: false,
          hasBlockedCookies: true,
          gotCookies: true,
          onShowFilteredOutCookiesChange: () => {},
          siteHasCookieInOtherPartition: true,
        },
        undefined, container);
    await assertScreenshot('network/request_cookies_view_req_and_res_cookies.png');
  });

  it('renders correctly with malformed response cookies', async () => {
    const container = document.createElement('div');
    renderElementIntoDOM(container);
    RequestCookiesView.DEFAULT_VIEW(
        {
          requestCookies: {cookies: [], cookieToBlockedReasons: new Map(), cookieToExemptionReason: new Map()},
          responseCookies: {cookies: [], cookieToBlockedReasons: new Map(), cookieToExemptionReason: new Map()},
          malformedResponseCookies: [{
            cookie: mockCookie('malformed-cookie', 'val'),
            cookieLine: 'malformed-cookie=val; SameSite=Invalid',
            blockedReasons: [Protocol.Network.SetCookieBlockedReason.SyntaxError],
          }],
          showFilteredOutCookies: false,
          hasBlockedCookies: false,
          gotCookies: true,
          onShowFilteredOutCookiesChange: () => {},
          siteHasCookieInOtherPartition: false,
        },
        undefined, container);
    await assertScreenshot('network/request_cookies_view_malformed_cookies.png');
  });

  it('shows a message when request site has cookies in another partition', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId, urlString`https://www.example.com/foo.html`, urlString``, null, null,
        null);
    request.addExtraRequestInfo({
      siteHasCookieInOtherPartition: true,
      includedRequestCookies: [],
      blockedRequestCookies: [],
      connectTiming: {requestTime: 0},
      requestHeaders: [],
    } as SDK.NetworkRequest.ExtraRequestInfo);
    const view = createViewFunctionStub(RequestCookiesView.RequestCookiesView);
    const component = new RequestCookiesView.RequestCookiesView(request, view);
    renderElementIntoDOM(component);
    component.wasShown();

    const input = await view.nextInput;
    assert.isTrue(input.siteHasCookieInOtherPartition);
  });

  it('shows filtered out cookies when checkbox is ticked', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId, urlString`https://www.example.com/foo.html`, urlString``, null, null,
        null);

    const view = createViewFunctionStub(RequestCookiesView.RequestCookiesView);
    const component = new RequestCookiesView.RequestCookiesView(request, view);
    renderElementIntoDOM(component);
    component.wasShown();

    let input = await view.nextInput;
    assert.isFalse(input.showFilteredOutCookies);

    input.onShowFilteredOutCookiesChange(true);

    input = await view.nextInput;
    assert.isTrue(input.showFilteredOutCookies);
  });
});
