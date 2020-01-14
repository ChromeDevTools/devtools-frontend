// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {Cookie} from '../../../../front_end/sdk/Cookie.js';

describe('Cookie', () => {
  after(() => {
    // FIXME(https://crbug.com/1006759): Remove after ESM work is complete
    delete (self as any).SDK;
  });

  it('can be instantiated without issues', () => {
    const cookie = new Cookie('name', 'value');

    assert.equal(cookie.key(), '- name -');
    assert.equal(cookie.name(), 'name');
    assert.equal(cookie.value(), 'value');

    assert.equal(cookie.type(), undefined);
    assert.equal(cookie.httpOnly(), false);
    assert.equal(cookie.secure(), false);
    assert.equal(cookie.sameSite(), undefined);
    assert.equal(cookie.priority(), 'Medium');
    assert.equal(cookie.session(), true);
    assert.equal(cookie.path(), undefined);
    assert.equal(cookie.port(), undefined);
    assert.equal(cookie.domain(), undefined);
    assert.equal(cookie.expires(), undefined);
    assert.equal(cookie.maxAge(), undefined);
    assert.equal(cookie.size(), 0);
    assert.equal(cookie.url(), null);
    assert.equal(cookie.getCookieLine(), undefined);
  });

  it('can be created from a protocol Cookie with all optional fields set', () => {
    const expires = new Date().getTime() + 3600 * 1000;
    const cookie = Cookie.fromProtocolCookie({
      domain: '.example.com',
      expires: expires / 1000,
      httpOnly: true,
      name: 'name',
      path: '/test',
      sameSite: 'Strict',
      secure: true,
      session: false,
      size: 23,
      value: 'value',
      priority: 'High',
    });

    assert.equal(cookie.key(), '.example.com name /test');
    assert.equal(cookie.name(), 'name');
    assert.equal(cookie.value(), 'value');

    assert.equal(cookie.type(), undefined);
    assert.equal(cookie.httpOnly(), true);
    assert.equal(cookie.secure(), true);
    assert.equal(cookie.sameSite(), 'Strict');
    assert.equal(cookie.session(), false);
    assert.equal(cookie.path(), '/test');
    assert.equal(cookie.port(), undefined);
    assert.equal(cookie.domain(), '.example.com');
    assert.equal(cookie.expires(), expires);
    assert.equal(cookie.maxAge(), undefined);
    assert.equal(cookie.size(), 23);
    assert.equal(cookie.url(), 'https://.example.com/test');
    assert.equal(cookie.getCookieLine(), undefined);
  });

  it('can be created from a protocol Cookie with no optional fields set', () => {
    const cookie = Cookie.fromProtocolCookie({
        domain: '.example.com',
        name: 'name',
        path: '/test',
        size: 23,
        value: 'value',
    });

    assert.equal(cookie.key(), '.example.com name /test');
    assert.equal(cookie.name(), 'name');
    assert.equal(cookie.value(), 'value');

    assert.equal(cookie.type(), undefined);
    assert.equal(cookie.httpOnly(), false);
    assert.equal(cookie.secure(), false);
    assert.equal(cookie.sameSite(), undefined);
    assert.equal(cookie.priority(), 'Medium');
    assert.equal(cookie.session(), true);
    assert.equal(cookie.path(), '/test');
    assert.equal(cookie.port(), undefined);
    assert.equal(cookie.domain(), '.example.com');
    assert.equal(cookie.expires(), undefined);
    assert.equal(cookie.maxAge(), undefined);
    assert.equal(cookie.size(), 23);
    assert.equal(cookie.url(), 'http://.example.com/test');
    assert.equal(cookie.getCookieLine(), undefined);
  });

  it('can handle secure urls', () => {
    const cookie = new Cookie('name', 'value');
    cookie.addAttribute('Secure');
    cookie.addAttribute('Domain', 'example.com');
    cookie.addAttribute('Path', '/test');
    assert.equal(cookie.url(), 'https://example.com/test');
  });

  it('can handle insecure urls', () => {
    const cookie = new Cookie('name', 'value');
    cookie.addAttribute('Domain', 'example.com');
    cookie.addAttribute('Path', '/test');
    assert.equal(cookie.url(), 'http://example.com/test');
  });

  it('can set attributes used as flags', () => {
    const cookie = new Cookie('name', 'value');
    cookie.addAttribute('HttpOnly');
    assert.equal(cookie.httpOnly(), true);
  });

  it('can set attributes used as key=value', () => {
    const cookie = new Cookie('name', 'value');
    cookie.addAttribute('Path', '/test');
    assert.equal(cookie.path(), '/test');
  });

  it('can set initialize with a different priority', () => {
    const cookie = new Cookie('name', 'value', null, 'High');
    assert.equal(cookie.priority(), 'High');
  });

  it('can change the priority', () => {
    const cookie = new Cookie('name', 'value');
    cookie.addAttribute('Priority', 'Low');
    assert.equal(cookie.priority(), 'Low');
  });

  it('can set the cookie line', () => {
    const cookie = new Cookie('name', 'value');
    cookie.setCookieLine('name=value');
    assert.equal(cookie.getCookieLine(), 'name=value');
  });

  it('can calculate the expiration date for session cookies', () => {
    const cookie = new Cookie('name', 'value');
    assert.equal(cookie.expiresDate(), null);
  });

  it('can calculate the expiration date for max age cookies', () => {
    const cookie = new Cookie('name', 'value');
    const now = new Date();
    const expires = Math.floor(now.getTime()) + 3600 * 1000;
    cookie.addAttribute('Max-Age', '3600');
    assert.equal(cookie.expiresDate(now).toISOString(), new Date(expires).toISOString());
  });

  it('can calculate the expiration date for cookies with expires attribute', () => {
    const cookie = new Cookie('name', 'value');
    const now = new Date();
    const expires = Math.floor(now.getTime()) + 3600 * 1000;
    cookie.addAttribute('Expires', expires);
    assert.equal(cookie.expiresDate(now).toISOString(), new Date(expires).toISOString());
  });
});
