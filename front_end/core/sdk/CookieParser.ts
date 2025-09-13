// Copyright 2010 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Ideally, we would rely on platform support for parsing a cookie, since
// this would save us from any potential inconsistency. However, exposing
// platform cookie parsing logic would require quite a bit of additional
// plumbing, and at least some platforms lack support for parsing Cookie,
// which is in a format slightly different from Set-Cookie and is normally
// only required on the server side.

import {Attribute, Cookie, Type} from './Cookie.js';

export class CookieParser {
  readonly #domain: string|undefined;
  #cookies: Cookie[];
  #input!: string|undefined;
  #originalInputLength: number;
  #lastCookie?: Cookie|null;
  #lastCookieLine?: string;
  #lastCookiePosition?: number;
  constructor(domain?: string) {
    if (domain) {
      // Handle #domain according to
      // https://tools.ietf.org/html/draft-ietf-httpbis-rfc6265bis-03#section-5.3.3
      this.#domain = domain.toLowerCase().replace(/^\./, '');
    }

    this.#cookies = [];

    this.#originalInputLength = 0;
  }

  static parseSetCookie(header: string|undefined, domain?: string): Cookie[]|null {
    return (new CookieParser(domain)).parseSetCookie(header);
  }

  getCookieAttribute(header: string|undefined): Attribute|null {
    if (!header) {
      return null;
    }

    switch (header.toLowerCase()) {
      case 'domain':
        return Attribute.DOMAIN;
      case 'expires':
        return Attribute.EXPIRES;
      case 'max-age':
        return Attribute.MAX_AGE;
      case 'httponly':
        return Attribute.HTTP_ONLY;
      case 'name':
        return Attribute.NAME;
      case 'path':
        return Attribute.PATH;
      case 'samesite':
        return Attribute.SAME_SITE;
      case 'secure':
        return Attribute.SECURE;
      case 'value':
        return Attribute.VALUE;
      case 'priority':
        return Attribute.PRIORITY;
      case 'sourceport':
        return Attribute.SOURCE_PORT;
      case 'sourcescheme':
        return Attribute.SOURCE_SCHEME;
      case 'partitioned':
        return Attribute.PARTITIONED;
      default:
        console.error('Failed getting cookie attribute: ' + header);
        return null;
    }
  }

  cookies(): Cookie[] {
    return this.#cookies;
  }

  parseSetCookie(setCookieHeader: string|undefined): Cookie[]|null {
    if (!this.initialize(setCookieHeader)) {
      return null;
    }
    for (let kv = this.extractKeyValue(); kv; kv = this.extractKeyValue()) {
      if (this.#lastCookie) {
        this.#lastCookie.addAttribute(this.getCookieAttribute(kv.key), kv.value);
      } else {
        this.addCookie(kv, Type.RESPONSE);
      }
      if (this.advanceAndCheckCookieDelimiter()) {
        this.flushCookie();
      }
    }
    this.flushCookie();
    return this.#cookies;
  }

  private initialize(headerValue: string|undefined): boolean {
    this.#input = headerValue;

    if (typeof headerValue !== 'string') {
      return false;
    }

    this.#cookies = [];
    this.#lastCookie = null;
    this.#lastCookieLine = '';
    this.#originalInputLength = (this.#input as string).length;
    return true;
  }

  private flushCookie(): void {
    if (this.#lastCookie) {
      // if we have a last cookie we know that these valeus all exist, hence the typecasts
      this.#lastCookie.setSize(
          this.#originalInputLength - (this.#input as string).length - (this.#lastCookiePosition as number));
      this.#lastCookie.setCookieLine((this.#lastCookieLine as string).replace('\n', ''));
    }
    this.#lastCookie = null;
    this.#lastCookieLine = '';
  }

  private extractKeyValue(): KeyValue|null {
    if (!this.#input || !this.#input.length) {
      return null;
    }
    // Note: RFCs offer an option for quoted values that may contain commas and semicolons.
    // Many browsers/platforms do not support this, however (see http://webkit.org/b/16699
    // and http://crbug.com/12361). The logic below matches latest versions of IE, Firefox,
    // Chrome and Safari on some old platforms. The latest version of Safari supports quoted
    // cookie values, though.
    const keyValueMatch = /^[ \t]*([^=;\n]+)[ \t]*(?:=[ \t]*([^;\n]*))?/.exec(this.#input);
    if (!keyValueMatch) {
      console.error('Failed parsing cookie header before: ' + this.#input);
      return null;
    }

    const result = new KeyValue(
        keyValueMatch[1]?.trim(), keyValueMatch[2]?.trim(), (this.#originalInputLength) - this.#input.length);
    this.#lastCookieLine += keyValueMatch[0];
    this.#input = this.#input.slice(keyValueMatch[0].length);
    return result;
  }

  private advanceAndCheckCookieDelimiter(): boolean {
    if (!this.#input) {
      return false;
    }

    const match = /^\s*[\n;]\s*/.exec(this.#input);
    if (!match) {
      return false;
    }
    this.#lastCookieLine += match[0];
    this.#input = this.#input.slice(match[0].length);
    return match[0].match('\n') !== null;
  }

  private addCookie(keyValue: KeyValue, type: Type): void {
    if (this.#lastCookie) {
      this.#lastCookie.setSize(keyValue.position - (this.#lastCookiePosition as number));
    }

    // Mozilla bug 169091: Mozilla, IE and Chrome treat single token (w/o "=") as
    // specifying a value for a cookie with empty name.
    this.#lastCookie = typeof keyValue.value === 'string' ? new Cookie(keyValue.key, keyValue.value, type) :
                                                            new Cookie('', keyValue.key, type);
    if (this.#domain) {
      this.#lastCookie.addAttribute(Attribute.DOMAIN, this.#domain);
    }
    this.#lastCookiePosition = keyValue.position;
    this.#cookies.push(this.#lastCookie);
  }
}

class KeyValue {
  key: string;
  value: string|undefined;
  position: number;
  constructor(key: string, value: string|undefined, position: number) {
    this.key = key;
    this.value = value;
    this.position = position;
  }
}
