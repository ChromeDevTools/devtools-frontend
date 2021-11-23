// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection, setMockConnectionResponseHandler} from '../../helpers/MockConnection.js';
import type * as SDKModule from '../../../../../front_end/core/sdk/sdk.js';
import * as Protocol from '../../../../../front_end/generated/protocol.js';

describeWithMockConnection('CookieModel', () => {
  let SDK: typeof SDKModule;
  before(async () => {
    SDK = await import('../../../../../front_end/core/sdk/sdk.js');
  });

  it('can retrieve cookies', async () => {
    // CDP Connection mock: for Network.getCookies, respond with a single cookie.
    setMockConnectionResponseHandler('Network.getCookies', () => {
      return {
        cookies: [{
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
        }],
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
});
