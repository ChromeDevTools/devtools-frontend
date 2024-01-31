// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection, setMockConnectionResponseHandler} from '../../helpers/MockConnection.js';
import type * as SDKModule from '../../../../../front_end/core/sdk/sdk.js';
import * as Protocol from '../../../../../front_end/generated/protocol.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';

describeWithMockConnection('CookieModel', () => {
  let SDK: typeof SDKModule;
  before(async () => {
    SDK = await import('../../../../../front_end/core/sdk/sdk.js');
  });

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
    partitionKey: 'https://example.net',
  };

  it('can retrieve cookies', async () => {
    // CDP Connection mock: for Network.getCookies, respond with a single cookie.
    setMockConnectionResponseHandler('Network.getCookies', () => {
      return {
        cookies: [PROTOCOL_COOKIE],
      };
    });

    const target = createTarget();
    const model = new SDK.CookieModel.CookieModel(target);
    const cookies = await model.getCookies(['https://www.google.com']);
    assert.isArray(cookies);
    assert.lengthOf(cookies, 1);
    assert.strictEqual(cookies[0].domain(), '.example.com');
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
    assert.strictEqual(cookies[0].partitionKey(), 'https://example.net');
  });

  it('can retrieve blocked cookies without returning them twice', async () => {
    const blockedProtocolCookie = {
      domain: '.thirdparty.com',
      name: 'third',
      path: '/path',
      size: 25,
      value: 'blocked',
      expires: 43,
      httpOnly: false,
      secure: false,
      session: true,
      sameParty: false,
      priority: Protocol.Network.CookiePriority.Medium,
      sourcePort: 80,
      sourceScheme: Protocol.Network.CookieSourceScheme.NonSecure,
      sameSite: Protocol.Network.CookieSameSite.Lax,
    };
    setMockConnectionResponseHandler('Network.getCookies', () => {
      return {
        cookies: [PROTOCOL_COOKIE, blockedProtocolCookie],
      };
    });

    const target = createTarget();
    const model = new SDK.CookieModel.CookieModel(target);
    const blockedCookie = SDK.Cookie.Cookie.fromProtocolCookie(blockedProtocolCookie);
    model.addBlockedCookie(blockedCookie, [
      {
        attribute: SDK.Cookie.Attribute.SameSite,
        uiString:
            'This cookie was blocked because it had the "SameSite=Lax" attribute and the request was made from a different site and was not initiated by a top-level navigation.',
      },
    ]);
    const cookies = await model.getCookies(['https://www.google.com']);
    assert.isArray(cookies);
    assert.lengthOf(cookies, 2);
    assert.strictEqual(cookies[0].domain(), '.example.com');
    assert.strictEqual(cookies[0].name(), 'name');
    assert.strictEqual(cookies[1].domain(), '.thirdparty.com');
    assert.strictEqual(cookies[1].name(), 'third');
  });

  it('clears stored blocked cookies on primary page change', async () => {
    const target = createTarget();
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    assertNotNullOrUndefined(resourceTreeModel);
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

    resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.PrimaryPageChanged, {
      frame: {} as SDKModule.ResourceTreeModel.ResourceTreeFrame,
      type: SDK.ResourceTreeModel.PrimaryPageChangeType.Navigation,
    });
    assert.strictEqual(cookieModel.getCookieToBlockedReasonsMap().size, 0);
  });
});
