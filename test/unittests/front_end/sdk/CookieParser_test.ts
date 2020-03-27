// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;
import {CookieParser} from '../../../../front_end/sdk/CookieParser.js';
import {Cookie} from '../../../../front_end/sdk/Cookie.js';

function ensureCookiesExistOrFailTest(cookies: Cookie[]|null): cookies is Cookie[] {
  if (!cookies) {
    assert.fail('expected cookies to exist');
    return false;
  }
  return true;
}

describe('CookieParser', () => {
  describe('parseCookie', () => {
    it('can parse basic cookies', () => {
      const cookie = 'foo=bar';
      const cookies = CookieParser.parseCookie(cookie);
      if (ensureCookiesExistOrFailTest(cookies)) {
        assert.lengthOf(cookies, 1);
        assert.equal(cookies[0].name(), 'foo');
        assert.equal(cookies[0].value(), 'bar');
      }
    });

    it('parses multiple cookies', () => {
      const cookie = 'one=jack; two=tim';
      const cookies = CookieParser.parseCookie(cookie);
      if (ensureCookiesExistOrFailTest(cookies)) {
        assert.lengthOf(cookies, 2);
        assert.equal(cookies[0].name(), 'one');
        assert.equal(cookies[0].value(), 'jack');
        assert.equal(cookies[1].name(), 'two');
        assert.equal(cookies[1].value(), 'tim');
      }
    });
  });

  describe('parseSetCookie', () => {
    it('can parse basic cookies', () => {
      const cookie = 'foo=bar';
      const cookies = CookieParser.parseSetCookie(cookie);
      if (ensureCookiesExistOrFailTest(cookies)) {
        assert.lengthOf(cookies, 1);
        assert.equal(cookies[0].name(), 'foo');
        assert.equal(cookies[0].value(), 'bar');
      }
    });

    it('recognises attributes like Expires', () => {
      const cookie = 'foo=bar; expires=Wed, 21 Oct 2015 07:28:00 GMT;';
      const cookies = CookieParser.parseSetCookie(cookie);
      if (ensureCookiesExistOrFailTest(cookies)) {
        assert.lengthOf(cookies, 1);
        assert.equal(cookies[0].name(), 'foo');
        assert.equal(cookies[0].value(), 'bar');
        assert.equal(cookies[0].expires().toString(), 'Wed, 21 Oct 2015 07:28:00 GMT');
      }
    });
  });
});
