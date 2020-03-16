/*
 * Copyright (C) 2010 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
// Ideally, we would rely on platform support for parsing a cookie, since
// this would save us from any potential inconsistency. However, exposing
// platform cookie parsing logic would require quite a bit of additional
// plumbing, and at least some platforms lack support for parsing Cookie,
// which is in a format slightly different from Set-Cookie and is normally
// only required on the server side.

import {Cookie, Type} from './Cookie.js';

/**
 * @unrestricted
 */
export class CookieParser {
  /**
   * @param {string=} domain
   */
  constructor(domain) {
    if (domain) {
      // Handle domain according to
      // https://tools.ietf.org/html/draft-ietf-httpbis-rfc6265bis-03#section-5.3.3
      this._domain = domain.toLowerCase().replace(/^\./, '');
    }

    /** @type {!Array<!Cookie>} */
    this._cookies = [];

    /** @type {string|undefined} */
    this._input;

    this._originalInputLength = 0;
  }

  /**
   * @param {string|undefined} header
   * @return {?Array<!Cookie>}
   */
  static parseCookie(header) {
    return (new CookieParser()).parseCookie(header);
  }

  /**
   * @param {string|undefined} header
   * @param {string=} domain
   * @return {?Array<!Cookie>}
   */
  static parseSetCookie(header, domain) {
    return (new CookieParser(domain)).parseSetCookie(header);
  }

  /**
   * @return {!Array<!Cookie>}
   */
  cookies() {
    return this._cookies;
  }

  /**
   * @param {string|undefined} cookieHeader
   * @return {?Array<!Cookie>}
   */
  parseCookie(cookieHeader) {
    if (!this._initialize(cookieHeader)) {
      return null;
    }

    for (let kv = this._extractKeyValue(); kv; kv = this._extractKeyValue()) {
      if (kv.key.charAt(0) === '$' && this._lastCookie) {
        this._lastCookie.addAttribute(kv.key.slice(1), kv.value);
      } else if (kv.key.toLowerCase() !== '$version' && typeof kv.value === 'string') {
        this._addCookie(kv, Type.Request);
      }
      this._advanceAndCheckCookieDelimiter();
    }
    this._flushCookie();
    return this._cookies;
  }

  /**
   * @param {string|undefined} setCookieHeader
   * @return {?Array<!Cookie>}
   */
  parseSetCookie(setCookieHeader) {
    if (!this._initialize(setCookieHeader)) {
      return null;
    }
    for (let kv = this._extractKeyValue(); kv; kv = this._extractKeyValue()) {
      if (this._lastCookie) {
        this._lastCookie.addAttribute(kv.key, kv.value);
      } else {
        this._addCookie(kv, Type.Response);
      }
      if (this._advanceAndCheckCookieDelimiter()) {
        this._flushCookie();
      }
    }
    this._flushCookie();
    return this._cookies;
  }

  /**
   * @param {string|undefined} headerValue
   * @return {boolean}
   */
  _initialize(headerValue) {
    this._input = headerValue;

    if (typeof headerValue !== 'string') {
      return false;
    }

    this._cookies = [];
    this._lastCookie = null;
    this._lastCookieLine = '';
    this._originalInputLength = /** @type {string} */ (this._input).length;
    return true;
  }

  _flushCookie() {
    if (this._lastCookie) {
      // if we have a last cookie we know that these valeus all exist, hence the typecasts
      this._lastCookie.setSize(
          this._originalInputLength - /** @type {string} */ (this._input).length -
          /** @type {number} */ (this._lastCookiePosition));
      this._lastCookie.setCookieLine(/** @type {string} */ (this._lastCookieLine).replace('\n', ''));
    }
    this._lastCookie = null;
    this._lastCookieLine = '';
  }

  /**
   * @return {?KeyValue}
   */
  _extractKeyValue() {
    if (!this._input || !this._input.length) {
      return null;
    }
    // Note: RFCs offer an option for quoted values that may contain commas and semicolons.
    // Many browsers/platforms do not support this, however (see http://webkit.org/b/16699
    // and http://crbug.com/12361). The logic below matches latest versions of IE, Firefox,
    // Chrome and Safari on some old platforms. The latest version of Safari supports quoted
    // cookie values, though.
    const keyValueMatch = /^[ \t]*([^\s=;]+)[ \t]*(?:=[ \t]*([^;\n]*))?/.exec(this._input);
    if (!keyValueMatch) {
      console.error('Failed parsing cookie header before: ' + this._input);
      return null;
    }

    const result = new KeyValue(
        keyValueMatch[1], keyValueMatch[2] && keyValueMatch[2].trim(),
        /** @type {number} */ (this._originalInputLength) - this._input.length);
    this._lastCookieLine += keyValueMatch[0];
    this._input = this._input.slice(keyValueMatch[0].length);
    return result;
  }

  /**
   * @return {boolean}
   */
  _advanceAndCheckCookieDelimiter() {
    if (!this._input) {
      return false;
    }

    const match = /^\s*[\n;]\s*/.exec(this._input);
    if (!match) {
      return false;
    }
    this._lastCookieLine += match[0];
    this._input = this._input.slice(match[0].length);
    return match[0].match('\n') !== null;
  }

  /**
   * @param {!KeyValue} keyValue
   * @param {!Type} type
   */
  _addCookie(keyValue, type) {
    if (this._lastCookie) {
      this._lastCookie.setSize(keyValue.position - /** @type {number} */ (this._lastCookiePosition));
    }

    // Mozilla bug 169091: Mozilla, IE and Chrome treat single token (w/o "=") as
    // specifying a value for a cookie with empty name.
    this._lastCookie = typeof keyValue.value === 'string' ? new Cookie(keyValue.key, keyValue.value, type) :
                                                            new Cookie('', keyValue.key, type);
    if (this._domain) {
      this._lastCookie.addAttribute('domain', this._domain);
    }
    this._lastCookiePosition = keyValue.position;
    this._cookies.push(this._lastCookie);
  }
}

/**
 * @unrestricted
 */
class KeyValue {
  /**
   * @param {string} key
   * @param {string|undefined} value
   * @param {number} position
   */
  constructor(key, value, position) {
    this.key = key;
    this.value = value;
    this.position = position;
  }
}
