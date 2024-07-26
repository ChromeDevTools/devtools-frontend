// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../core/sdk/sdk.js';
import * as Protocol from '../generated/protocol.js';

export interface CookieExpectation {
  name: string;
  value: string;
  httpOnly?: boolean;
  sameSite?: Protocol.Network.CookieSameSite;
  secure?: boolean;
  session?: boolean;
  path?: string;
  domain?: string;
  expires?: null|number|string;
  size?: number;
  priority?: Protocol.Network.CookiePriority;
  partitionKey?: Protocol.Network.CookiePartitionKey|null;
  partitionKeyOpaque?: boolean;
}

const cookieExpectationDefaults: CookieExpectation = {
  name: 'name',
  value: 'value',
  httpOnly: false,
  sameSite: undefined,
  secure: false,
  session: true,
  path: undefined,
  domain: undefined,
  expires: null,
  size: undefined,
  priority: Protocol.Network.CookiePriority.Medium,
  partitionKey: null,
  partitionKeyOpaque: false,
};

const requestDate = new Date('Mon Oct 18 2010 17:00:00 GMT+0000');

export function expectCookie(cookie: SDK.Cookie.Cookie, cookieExpectation: CookieExpectation) {
  const expectation = {...cookieExpectationDefaults, ...cookieExpectation};
  assert.strictEqual(cookie.name(), expectation.name, 'name');
  assert.strictEqual(cookie.value(), expectation.value, 'value');
  assert.strictEqual(cookie.httpOnly(), expectation.httpOnly, 'httpOnly');
  assert.strictEqual(cookie.sameSite(), expectation.sameSite, 'sameSite');
  assert.strictEqual(cookie.secure(), expectation.secure, 'secure');
  assert.strictEqual(cookie.session(), expectation.session, 'session');
  assert.strictEqual(cookie.path(), expectation.path, 'path');
  assert.strictEqual(cookie.domain(), expectation.domain, 'domain');
  const date = cookie.expiresDate(requestDate);
  if (typeof expectation.expires === 'string') {
    assert.isNotNull(date);
    assert.strictEqual((date as Date).toISOString(), expectation.expires, 'expires');
  } else if (typeof expectation.expires === 'number') {
    assert.isNotNull(date);
    assert.strictEqual((date as Date).getTime(), expectation.expires, 'expires');
  } else {
    assert.strictEqual(date, expectation.expires, 'expires');
  }
  assert.strictEqual(cookie.size(), expectation.size, 'size');
  assert.strictEqual(cookie.priority(), expectation.priority, 'priority');

  assert.strictEqual(cookie.partitioned(), Boolean(expectation.partitionKey), 'partitioned');
  if (cookie.partitioned()) {
    assert.strictEqual(
        cookie.hasCrossSiteAncestor(), expectation.partitionKey?.hasCrossSiteAncestor, 'hasCrossSiteAncestor');
    assert.strictEqual(cookie.topLevelSite(), expectation.partitionKey?.topLevelSite, 'topLevelSite');
  }
  assert.strictEqual(cookie.partitionKeyOpaque(), expectation.partitionKeyOpaque, 'partitionKeyOpaque');
}
