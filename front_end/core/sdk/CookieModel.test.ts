// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../core/platform/platform.js';
import * as Protocol from '../../generated/protocol.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {expectCalled} from '../../testing/ExpectStubCall.js';
import {
  describeWithMockConnection,
  setMockConnectionResponseHandler,
} from '../../testing/MockConnection.js';
import {createNetworkRequest} from '../../testing/MockNetworkLog.js';
import {addChildFrame, createResource, DOMAIN, getMainFrame, navigate} from '../../testing/ResourceTreeHelpers.js';

import * as SDK from './sdk.js';

const MAIN_FRAME_RESOURCE_DOMAIN = 'example.org' as Platform.DevToolsPath.UrlString;
const CHILD_FRAME_RESOURCE_DOMAIN = 'example.net' as Platform.DevToolsPath.UrlString;

describeWithMockConnection('CookieModel', () => {
  const PROTOCOL_COOKIE = {
    domain: '.example.com',
    name: 'name',
    path: '/test',
    size: 23,
    value: 'value',
    expires: 42,
    httpOnly: false,
    secure: false,
    session: true,
    sameParty: false,
    priority: Protocol.Network.CookiePriority.Medium,
    sourcePort: 80,
    sourceScheme: Protocol.Network.CookieSourceScheme.NonSecure,
    partitionKey: undefined,
  };

  const PROTOCOL_COOKIE_PARTITIONED = {
    domain: '.example.com',
    name: 'name',
    path: '/test',
    size: 23,
    value: 'value',
    expires: 42,
    httpOnly: false,
    secure: false,
    session: true,
    sameParty: false,
    priority: Protocol.Network.CookiePriority.Medium,
    sourcePort: 80,
    sourceScheme: Protocol.Network.CookieSourceScheme.NonSecure,
    partitionKey: {topLevelSite: 'https://example.net', hasCrossSiteAncestor: false},
  };

  it('can retrieve cookies for domain', async () => {
    // CDP Connection mock: for Network.getCookies, respond with a single cookie.
    setMockConnectionResponseHandler('Network.getCookies', ({urls}) => {
      return {
        cookies: [
          {...PROTOCOL_COOKIE_PARTITIONED, domain: `.${new URL(urls[0]).host}`},
        ],
      };
    });

    const target = createTarget();
    const mainFrame = getMainFrame(target);
    const resourceUrl = (domain: string) => `https://${domain}/resource` as Platform.DevToolsPath.UrlString;
    createResource(mainFrame, resourceUrl(MAIN_FRAME_RESOURCE_DOMAIN), 'text/html', '');
    const childFrame = await addChildFrame(target);
    createResource(childFrame, resourceUrl(CHILD_FRAME_RESOURCE_DOMAIN), 'text/html', '');

    const model = target.model(SDK.CookieModel.CookieModel)!;
    for (const domain of [DOMAIN, MAIN_FRAME_RESOURCE_DOMAIN, CHILD_FRAME_RESOURCE_DOMAIN]) {
      const cookies = await model.getCookiesForDomain(`https://${domain}`);
      assert.isArray(cookies);
      assert.lengthOf(cookies, 1);
      assert.strictEqual(cookies[0].domain(), `.${domain}`);
      assert.strictEqual(cookies[0].name(), 'name');
      assert.strictEqual(cookies[0].path(), '/test');
      assert.strictEqual(cookies[0].size(), 23);
      assert.strictEqual(cookies[0].value(), 'value');
      assert.strictEqual(cookies[0].expires(), 42000);
      assert.strictEqual(cookies[0].httpOnly(), false);
      assert.strictEqual(cookies[0].secure(), false);
      assert.strictEqual(cookies[0].priority(), Protocol.Network.CookiePriority.Medium);
      assert.strictEqual(cookies[0].sourcePort(), 80);
      assert.strictEqual(cookies[0].sourceScheme(), Protocol.Network.CookieSourceScheme.NonSecure);
      assert.strictEqual(cookies[0].partitionKey().topLevelSite, 'https://example.net');
      assert.strictEqual(cookies[0].partitionKey().hasCrossSiteAncestor, false);
    }
  });

  it('can detect cookie list changes', async () => {
    setMockConnectionResponseHandler('Network.getCookies', ({urls}) => {
      return {
        cookies: [
          {...PROTOCOL_COOKIE, domain: `.${new URL(urls[0]).host}`},
        ],
      };
    });

    const target = createTarget();

    const dispatchLoadingFinished = () => target.model(SDK.NetworkManager.NetworkManager)!.dispatchEventToListeners(
        SDK.NetworkManager.Events.LoadingFinished, createNetworkRequest('1'));

    const mainFrame = getMainFrame(target);
    const model = target.model(SDK.CookieModel.CookieModel)!;

    const eventListener = sinon.stub();
    model.addEventListener(SDK.CookieModel.Events.COOKIE_LIST_UPDATED, eventListener);

    assert.isEmpty(await model.getCookiesForDomain(`https://${MAIN_FRAME_RESOURCE_DOMAIN}`));

    const resourceUrl = (domain: string) => `https://${domain}/main_resource` as Platform.DevToolsPath.UrlString;
    createResource(mainFrame, resourceUrl(MAIN_FRAME_RESOURCE_DOMAIN), 'text/html', '');
    dispatchLoadingFinished();
    await expectCalled(eventListener);
    assert.isNotEmpty(await model.getCookiesForDomain(`https://${MAIN_FRAME_RESOURCE_DOMAIN}`));
    assert.isEmpty(await model.getCookiesForDomain(`https://${CHILD_FRAME_RESOURCE_DOMAIN}`));

    eventListener.resetHistory();
    const childFrame = await addChildFrame(target);
    createResource(childFrame, resourceUrl(CHILD_FRAME_RESOURCE_DOMAIN), 'text/html', '');
    dispatchLoadingFinished();
    await expectCalled(eventListener);
    assert.isNotEmpty(await model.getCookiesForDomain(`https://${CHILD_FRAME_RESOURCE_DOMAIN}`));
  });

  it('can detect cookie value changes', async () => {
    const cookie = {...PROTOCOL_COOKIE};
    setMockConnectionResponseHandler('Network.getCookies', () => ({cookies: [cookie]}));

    const target = createTarget();
    const dispatchLoadingFinished = () => target.model(SDK.NetworkManager.NetworkManager)!.dispatchEventToListeners(
        SDK.NetworkManager.Events.LoadingFinished, createNetworkRequest('1'));

    const mainFrame = getMainFrame(target);
    const model = target.model(SDK.CookieModel.CookieModel)!;

    const eventListener = sinon.stub();
    model.addEventListener(SDK.CookieModel.Events.COOKIE_LIST_UPDATED, eventListener);

    createResource(mainFrame, `https://${DOMAIN}/main_resource` as Platform.DevToolsPath.UrlString, 'text/html', '');
    dispatchLoadingFinished();

    await expectCalled(eventListener);
    eventListener.resetHistory();

    cookie.value = 'new value';

    dispatchLoadingFinished();
    await expectCalled(eventListener);
  });

  it('does not refetch cookies while listening unless requested', async () => {
    const cookie = {...PROTOCOL_COOKIE};
    setMockConnectionResponseHandler('Network.getCookies', () => ({cookies: [cookie]}));

    const target = createTarget();
    const dispatchLoadingFinished = () => target.model(SDK.NetworkManager.NetworkManager)!.dispatchEventToListeners(
        SDK.NetworkManager.Events.LoadingFinished, createNetworkRequest('1'));

    const mainFrame = getMainFrame(target);
    const model = target.model(SDK.CookieModel.CookieModel)!;

    createResource(mainFrame, `https://${DOMAIN}/main_resource` as Platform.DevToolsPath.UrlString, 'text/html', '');
    dispatchLoadingFinished();

    let [readCookie] = await model.getCookiesForDomain(`https://${DOMAIN}`);
    assert.strictEqual(readCookie.value(), 'value');

    cookie.value = 'new value';

    model.addEventListener(SDK.CookieModel.Events.COOKIE_LIST_UPDATED, () => {});

    [readCookie] = await model.getCookiesForDomain(`https://${DOMAIN}`);
    assert.strictEqual(readCookie.value(), 'value');

    [readCookie] = await model.getCookiesForDomain(`https://${DOMAIN}`);
    assert.strictEqual(readCookie.value(), 'value');

    [readCookie] = await model.getCookiesForDomain(`https://${DOMAIN}`, true);
    assert.strictEqual(readCookie.value(), 'new value');
  });

  it('clears stored blocked cookies on primary page change', async () => {
    const target = createTarget();
    const cookieModel = new SDK.CookieModel.CookieModel(target);
    const cookie = new SDK.Cookie.Cookie('name', 'value');
    const blockedReason = {
      attribute: null,
      uiString: 'Setting this cookie was blocked due to third-party cookie phaseout. Learn more in the Issues tab.',
    };

    cookieModel.addBlockedCookie(cookie, [blockedReason]);
    const cookieToBlockedReasons = cookieModel.getCookieToBlockedReasonsMap();
    assert.strictEqual(cookieToBlockedReasons.size, 1);
    assert.deepStrictEqual(cookieToBlockedReasons.get(cookie), [blockedReason]);

    navigate(getMainFrame(target));
    assert.strictEqual(cookieModel.getCookieToBlockedReasonsMap().size, 0);
  });

  it('can delete unpartitioned and partitioned cookies', async () => {
    let cookieArray = [PROTOCOL_COOKIE, PROTOCOL_COOKIE_PARTITIONED];

    // CDP Connection mock.
    setMockConnectionResponseHandler('Network.getCookies', () => {
      return {
        cookies: cookieArray,
      };
    });

    // CDP Connection mock: simplified implementation for Network.deleteCookies, which deletes the matching cookie from `cookies`.
    setMockConnectionResponseHandler('Network.deleteCookies', cookieToDelete => {
      cookieArray = cookieArray.filter(cookie => {
        return !(
            cookie.name === cookieToDelete.name && cookie.domain === cookieToDelete.domain &&
            cookie.path === cookieToDelete.path &&
            cookie.partitionKey?.topLevelSite === cookieToDelete.partitionKey?.topLevelSite &&
            cookie.partitionKey?.hasCrossSiteAncestor === cookieToDelete.partitionKey?.hasCrossSiteAncestor);
      });

      const response = {
        getError() {
          return undefined;
        },
      };
      return Promise.resolve(response);
    });

    const target = createTarget();
    const model = new SDK.CookieModel.CookieModel(target);
    const cookies = await model.getCookiesForDomain(`https://${DOMAIN}`);
    assert.isArray(cookies);
    assert.lengthOf(cookies, 2);

    await model.deleteCookie(SDK.Cookie.Cookie.fromProtocolCookie(PROTOCOL_COOKIE));

    const cookies2 = await model.getCookiesForDomain(`https://${DOMAIN}`);
    assert.isArray(cookies2);
    assert.lengthOf(cookies2, 1);

    assert.strictEqual(cookies2[0].domain(), '.example.com');
    assert.strictEqual(cookies2[0].name(), 'name');
    assert.strictEqual(cookies2[0].partitionKey().topLevelSite, 'https://example.net');
    assert.strictEqual(cookies2[0].partitionKey().hasCrossSiteAncestor, false);

    await model.deleteCookie(SDK.Cookie.Cookie.fromProtocolCookie(PROTOCOL_COOKIE_PARTITIONED));

    const cookies3 = await model.getCookiesForDomain(`https://${DOMAIN}`);
    assert.isArray(cookies3);
    assert.lengthOf(cookies3, 0);
  });
});
