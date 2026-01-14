// Copyright 2019 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Protocol from '../../generated/protocol.js';

import * as SDK from './sdk.js';

describe('Cookie', () => {
  it('can be instantiated without issues', () => {
    const cookie = new SDK.Cookie.Cookie('name', 'value');

    assert.strictEqual(cookie.key(), '- name - -');
    assert.strictEqual(cookie.name(), 'name');
    assert.strictEqual(cookie.value(), 'value');

    assert.isUndefined(cookie.type());
    assert.isFalse(cookie.httpOnly());
    assert.isFalse(cookie.secure());
    assert.isUndefined(cookie.sameSite());
    assert.strictEqual(cookie.priority(), 'Medium');
    assert.isTrue(cookie.session());
    assert.isUndefined(cookie.path());
    assert.isUndefined(cookie.domain());
    assert.isUndefined(cookie.expires());
    assert.isUndefined(cookie.maxAge());
    assert.strictEqual(cookie.size(), 0);
    assert.isNull(cookie.url());
    assert.isUndefined(cookie.partitionKey());
    assert.isNull(cookie.getCookieLine());
  });

  it('can be created from a protocol Cookie with all optional fields set', () => {
    const expires = new Date().getTime() + 3600 * 1000;
    const cookie = SDK.Cookie.Cookie.fromProtocolCookie({
      domain: '.example.com',
      expires: expires / 1000,
      httpOnly: true,
      name: 'name',
      path: '/test',
      sameSite: Protocol.Network.CookieSameSite.Strict,
      secure: true,
      session: false,
      size: 23,
      value: 'value',
      priority: Protocol.Network.CookiePriority.High,
      sourcePort: 443,
      sourceScheme: Protocol.Network.CookieSourceScheme.Secure,
      partitionKey: {topLevelSite: 'https://a.com', hasCrossSiteAncestor: false},
      partitionKeyOpaque: false,
    });

    assert.strictEqual(cookie.key(), '.example.com name /test https://a.com same_site');
    assert.strictEqual(cookie.name(), 'name');
    assert.strictEqual(cookie.value(), 'value');

    assert.isNull(cookie.type());
    assert.isTrue(cookie.httpOnly());
    assert.isTrue(cookie.secure());
    assert.strictEqual(cookie.sameSite(), 'Strict');
    assert.isFalse(cookie.session());
    assert.strictEqual(cookie.path(), '/test');
    assert.strictEqual(cookie.domain(), '.example.com');
    assert.strictEqual(cookie.expires(), expires);
    assert.isUndefined(cookie.maxAge());
    assert.strictEqual(cookie.size(), 23);
    assert.strictEqual(String(cookie.url()), 'https://.example.com/test');
    assert.isNull(cookie.getCookieLine());
    assert.strictEqual(cookie.sourcePort(), 443);
    assert.strictEqual(cookie.sourceScheme(), Protocol.Network.CookieSourceScheme.Secure);
    assert.strictEqual(cookie.partitionKey().topLevelSite, 'https://a.com');
    assert.isFalse(cookie.partitionKey().hasCrossSiteAncestor);
    assert.isFalse(cookie.partitionKeyOpaque());
    assert.isTrue(cookie.partitioned());
  });

  // The jsdoc states that the fields are required, not optional
  it('can be created from a protocol Cookie with no optional fields set', () => {
    const cookie = SDK.Cookie.Cookie.fromProtocolCookie({
      domain: '.example.com',
      name: 'name',
      path: '/test',
      size: 23,
      value: 'value',
      expires: 0,
      httpOnly: false,
      secure: false,
      session: true,
      priority: Protocol.Network.CookiePriority.Medium,
      sourcePort: 80,
      sourceScheme: Protocol.Network.CookieSourceScheme.NonSecure,
    });

    assert.strictEqual(cookie.key(), '.example.com name /test -');
    assert.strictEqual(cookie.name(), 'name');
    assert.strictEqual(cookie.value(), 'value');

    assert.isNull(cookie.type());
    assert.isFalse(cookie.httpOnly());
    assert.isFalse(cookie.secure());
    assert.isUndefined(cookie.sameSite());
    assert.strictEqual(cookie.priority(), 'Medium');
    // Session cookie status is derived from the presence of max-age or expires fields.
    assert.isTrue(cookie.session());
    assert.strictEqual(cookie.path(), '/test');
    assert.strictEqual(cookie.domain(), '.example.com');
    assert.isUndefined(cookie.maxAge());
    assert.strictEqual(cookie.size(), 23);
    assert.strictEqual(String(cookie.url()), 'http://.example.com/test');
    assert.isNull(cookie.getCookieLine());
    assert.strictEqual(cookie.sourcePort(), 80);
    assert.strictEqual(cookie.sourceScheme(), Protocol.Network.CookieSourceScheme.NonSecure);
  });

  it('can be created from a protocol Cookie with no optional fields set and non-standard port', () => {
    const cookie = SDK.Cookie.Cookie.fromProtocolCookie({
      domain: '.example.com',
      name: 'name',
      path: '/test',
      size: 23,
      value: 'value',
      expires: 0,
      httpOnly: false,
      secure: false,
      session: true,
      priority: Protocol.Network.CookiePriority.Medium,
      sourcePort: 8000,
      sourceScheme: Protocol.Network.CookieSourceScheme.NonSecure,
    });

    assert.strictEqual(cookie.key(), '.example.com name /test -');
    assert.strictEqual(cookie.name(), 'name');
    assert.strictEqual(cookie.value(), 'value');

    assert.isNull(cookie.type());
    assert.isFalse(cookie.httpOnly());
    assert.isFalse(cookie.secure());
    assert.isUndefined(cookie.sameSite());
    assert.strictEqual(cookie.priority(), 'Medium');
    // Session cookie status is derived from the presence of max-age or expires fields.
    assert.isTrue(cookie.session());
    assert.strictEqual(cookie.path(), '/test');
    assert.strictEqual(cookie.domain(), '.example.com');
    assert.isUndefined(cookie.maxAge());
    assert.strictEqual(cookie.size(), 23);
    assert.strictEqual(String(cookie.url()), 'http://.example.com:8000/test');
    assert.isNull(cookie.getCookieLine());
    assert.strictEqual(cookie.sourcePort(), 8000);
    assert.strictEqual(cookie.sourceScheme(), Protocol.Network.CookieSourceScheme.NonSecure);
  });

  it('can handle secure urls', () => {
    const cookie = new SDK.Cookie.Cookie('name', 'value');
    cookie.addAttribute(SDK.Cookie.Attribute.SECURE);
    cookie.addAttribute(SDK.Cookie.Attribute.DOMAIN, 'example.com');
    cookie.addAttribute(SDK.Cookie.Attribute.PATH, '/test');
    assert.strictEqual(String(cookie.url()), 'https://example.com/test');
  });

  it('can handle insecure urls', () => {
    const cookie = new SDK.Cookie.Cookie('name', 'value');
    cookie.addAttribute(SDK.Cookie.Attribute.DOMAIN, 'example.com');
    cookie.addAttribute(SDK.Cookie.Attribute.PATH, '/test');
    assert.strictEqual(String(cookie.url()), 'http://example.com/test');
  });

  it('can set SDK.Cookie.Attribute used as flags', () => {
    const cookie = new SDK.Cookie.Cookie('name', 'value');
    cookie.addAttribute(SDK.Cookie.Attribute.HTTP_ONLY);
    assert.isTrue(cookie.httpOnly());
  });

  it('can set SDK.Cookie.Attribute used as key=value', () => {
    const cookie = new SDK.Cookie.Cookie('name', 'value');
    cookie.addAttribute(SDK.Cookie.Attribute.PATH, '/test');
    assert.strictEqual(cookie.path(), '/test');
  });

  it('can set initialize with a different priority', () => {
    const cookie = new SDK.Cookie.Cookie('name', 'value', null, Protocol.Network.CookiePriority.High);
    assert.strictEqual(cookie.priority(), 'High');
  });

  it('can change the priority', () => {
    const cookie = new SDK.Cookie.Cookie('name', 'value');
    cookie.addAttribute(SDK.Cookie.Attribute.PRIORITY, 'Low');
    assert.strictEqual(cookie.priority(), 'Low');
  });

  it('can set the cookie line', () => {
    const cookie = new SDK.Cookie.Cookie('name', 'value');
    cookie.setCookieLine('name=value');
    assert.strictEqual(cookie.getCookieLine(), 'name=value');
  });

  it('can calculate the expiration date for session cookies', () => {
    const cookie = new SDK.Cookie.Cookie('name', 'value');
    assert.isNull(cookie.expiresDate(new Date()));
  });

  it('can calculate the expiration date for max age cookies', () => {
    const cookie = new SDK.Cookie.Cookie('name', 'value');
    const now = new Date();
    const expires = Math.floor(now.getTime()) + 3600 * 1000;
    cookie.addAttribute(SDK.Cookie.Attribute.MAX_AGE, '3600');
    const expiresDate = cookie.expiresDate(now);
    assert.strictEqual(expiresDate!.toISOString(), new Date(expires).toISOString());
  });

  it('can calculate the expiration date for cookies with expires attribute', () => {
    const cookie = new SDK.Cookie.Cookie('name', 'value');
    const now = new Date();
    const expires = Math.floor(now.getTime()) + 3600 * 1000;
    cookie.addAttribute(SDK.Cookie.Attribute.EXPIRES, expires);
    const expiresDate = cookie.expiresDate(now);
    assert.strictEqual(expiresDate!.toISOString(), new Date(expires).toISOString());
  });

  it('can check if a cookie domain matches a given host', () => {
    assert.isTrue(SDK.Cookie.Cookie.isDomainMatch('example.com', 'example.com'));
    assert.isFalse(SDK.Cookie.Cookie.isDomainMatch('www.example.com', 'example.com'));

    assert.isTrue(SDK.Cookie.Cookie.isDomainMatch('.example.com', 'example.com'));
    assert.isTrue(SDK.Cookie.Cookie.isDomainMatch('.example.com', 'www.example.com'));
    assert.isFalse(SDK.Cookie.Cookie.isDomainMatch('.www.example.com', 'example.com'));

    assert.isFalse(SDK.Cookie.Cookie.isDomainMatch('example.com', 'example.de'));
    assert.isFalse(SDK.Cookie.Cookie.isDomainMatch('.example.com', 'example.de'));
    assert.isFalse(SDK.Cookie.Cookie.isDomainMatch('.example.de', 'example.de.vu'));

    assert.isFalse(SDK.Cookie.Cookie.isDomainMatch('example.com', 'notexample.com'));
  });

  it('detects the Partitioned attribute in the Set-Cookie header', () => {
    const cookie = new SDK.Cookie.Cookie('name', 'value');
    cookie.addAttribute(SDK.Cookie.Attribute.PARTITIONED);
    assert.isTrue(cookie.partitioned());
    assert.isFalse(cookie.hasCrossSiteAncestor());
    assert.strictEqual(cookie.topLevelSite(), '');
  });

  it('can modify partition key', () => {
    const cookie = new SDK.Cookie.Cookie('name', 'value');
    cookie.setPartitionKey('https://a.com', true);
    assert.isTrue(cookie.partitioned());
    assert.isTrue(cookie.hasCrossSiteAncestor());
    assert.strictEqual(cookie.topLevelSite(), 'https://a.com');
    // set crossSiteAncestor
    cookie.setHasCrossSiteAncestor(false);
    assert.isFalse(cookie.hasCrossSiteAncestor());
    // set topLevelSite
    cookie.setTopLevelSite('https://b.com', true);
    assert.isTrue(cookie.hasCrossSiteAncestor());
    assert.strictEqual(cookie.topLevelSite(), 'https://b.com');
  });

  it('can compare partition keys', () => {
    const unpartitionedCookie = new SDK.Cookie.Cookie('name', 'value');
    assert.isFalse(unpartitionedCookie.partitioned());
    assert.isFalse(Boolean(unpartitionedCookie.partitionKey()));

    const partitionedCookie = new SDK.Cookie.Cookie('name', 'value');
    partitionedCookie.setPartitionKey('https://a.com', true);
    assert.isTrue(partitionedCookie.partitioned());
    assert.isTrue(Boolean(partitionedCookie.partitionKey()));
    assert.notStrictEqual(unpartitionedCookie.partitionKey(), partitionedCookie.partitionKey());
    assert.strictEqual(partitionedCookie.partitionKey(), partitionedCookie.partitionKey());

    const differentHasCrossSiteAncestor = new SDK.Cookie.Cookie('name', 'value');
    differentHasCrossSiteAncestor.setPartitionKey('https://a.com', false);
    assert.isTrue(differentHasCrossSiteAncestor.partitioned());
    assert.notStrictEqual(differentHasCrossSiteAncestor.partitionKey(), partitionedCookie.partitionKey());

    const differentTopLevel = new SDK.Cookie.Cookie('name', 'value');
    differentTopLevel.setPartitionKey('https://b.com', true);
    assert.isTrue(differentTopLevel.partitioned());
    assert.notStrictEqual(differentTopLevel.partitionKey(), partitionedCookie.partitionKey());
  });

  it('can set opaque partition key', () => {
    const partitionedCookie = new SDK.Cookie.Cookie('name', 'value');
    partitionedCookie.setPartitionKey('https://a.com', true);
    assert.isTrue(partitionedCookie.partitioned());
    assert.isTrue(partitionedCookie.hasCrossSiteAncestor());
    assert.isFalse(partitionedCookie.partitionKeyOpaque());
    // Set key to opaque and confirm the the key is opaque and cross site.
    partitionedCookie.setPartitionKeyOpaque();
    assert.isTrue(partitionedCookie.partitionKeyOpaque());
    assert.isFalse(partitionedCookie.hasCrossSiteAncestor());
  });
});
