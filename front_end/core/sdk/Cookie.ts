// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import type * as Protocol from '../../generated/protocol.js';

export class Cookie {
  _name: string;
  _value: string;
  _type: Type|null|undefined;
  _attributes: {
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [x: string]: any,
  };
  _size: number;
  _priority: Protocol.Network.CookiePriority;
  _cookieLine: string|null;
  constructor(name: string, value: string, type?: Type|null, priority?: Protocol.Network.CookiePriority) {
    this._name = name;
    this._value = value;
    this._type = type;
    this._attributes = {};
    this._size = 0;
    this._priority = (priority || 'Medium' as Protocol.Network.CookiePriority);
    this._cookieLine = null;
  }

  static fromProtocolCookie(protocolCookie: Protocol.Network.Cookie): Cookie {
    const cookie = new Cookie(protocolCookie.name, protocolCookie.value, null, protocolCookie.priority);
    cookie.addAttribute('domain', protocolCookie['domain']);
    cookie.addAttribute('path', protocolCookie['path']);
    if (protocolCookie['expires']) {
      cookie.addAttribute('expires', protocolCookie['expires'] * 1000);
    }
    if (protocolCookie['httpOnly']) {
      cookie.addAttribute('httpOnly');
    }
    if (protocolCookie['secure']) {
      cookie.addAttribute('secure');
    }
    if (protocolCookie['sameSite']) {
      cookie.addAttribute('sameSite', protocolCookie['sameSite']);
    }
    if (protocolCookie.sameParty) {
      cookie.addAttribute('sameParty');
    }
    if ('sourcePort' in protocolCookie) {
      cookie.addAttribute('sourcePort', protocolCookie.sourcePort);
    }
    if ('sourceScheme' in protocolCookie) {
      cookie.addAttribute('sourceScheme', protocolCookie.sourceScheme);
    }
    cookie.setSize(protocolCookie['size']);
    return cookie;
  }

  key(): string {
    return (this.domain() || '-') + ' ' + this.name() + ' ' + (this.path() || '-');
  }

  name(): string {
    return this._name;
  }

  value(): string {
    return this._value;
  }

  type(): Type|null|undefined {
    return this._type;
  }

  httpOnly(): boolean {
    return 'httponly' in this._attributes;
  }

  secure(): boolean {
    return 'secure' in this._attributes;
  }

  sameSite(): Protocol.Network.CookieSameSite {
    // TODO(allada) This should not rely on _attributes and instead store them individually.
    // when attributes get added via addAttribute() they are lowercased, hence the lowercasing of samesite here
    return /** @type {!Protocol.Network.CookieSameSite} */ this._attributes['samesite'] as
        Protocol.Network.CookieSameSite;
  }

  /** boolean
   */
  sameParty(): boolean {
    return 'sameparty' in this._attributes;
  }

  priority(): Protocol.Network.CookiePriority {
    return this._priority;
  }

  session(): boolean {
    // RFC 2965 suggests using Discard attribute to mark session cookies, but this does not seem to be widely used.
    // Check for absence of explicitly max-age or expiry date instead.
    return !('expires' in this._attributes || 'max-age' in this._attributes);
  }

  path(): string {
    return /** @type {string} */ this._attributes['path'] as string;
  }

  domain(): string {
    return /** @type {string} */ this._attributes['domain'] as string;
  }

  expires(): number {
    return /** @type {number} */ this._attributes['expires'] as number;
  }

  maxAge(): number {
    return /** @type {number} */ this._attributes['max-age'] as number;
  }

  sourcePort(): number {
    return /** @type {number} */ this._attributes['sourceport'] as number;
  }

  sourceScheme(): Protocol.Network.CookieSourceScheme {
    return /** @type {Protocol.Network.CookieSourceScheme} */ this._attributes['sourcescheme'] as
        Protocol.Network.CookieSourceScheme;
  }

  size(): number {
    return this._size;
  }

  /**
   * @deprecated
   */
  url(): string|null {
    if (!this.domain() || !this.path()) {
      return null;
    }
    let port = '';
    const sourcePort = this.sourcePort();
    // Do not include standard ports to ensure the back-end will change standard ports according to the scheme.
    if (sourcePort && sourcePort !== 80 && sourcePort !== 443) {
      port = `:${this.sourcePort()}`;
    }
    // We must not consider the this.sourceScheme() here, otherwise it will be impossible to set a cookie without
    // the Secure attribute from a secure origin.
    return (this.secure() ? 'https://' : 'http://') + this.domain() + port + this.path();
  }

  setSize(size: number): void {
    this._size = size;
  }

  expiresDate(requestDate: Date): Date|null {
    // RFC 6265 indicates that the max-age attribute takes precedence over the expires attribute
    if (this.maxAge()) {
      return new Date(requestDate.getTime() + 1000 * this.maxAge());
    }

    if (this.expires()) {
      return new Date(this.expires());
    }

    return null;
  }

  addAttribute(key: string, value?: string|number|boolean): void {
    const normalizedKey = key.toLowerCase();
    switch (normalizedKey) {
      case 'priority':
        this._priority = (value as Protocol.Network.CookiePriority);
        break;
      default:
        this._attributes[normalizedKey] = value;
    }
  }

  setCookieLine(cookieLine: string): void {
    this._cookieLine = cookieLine;
  }

  getCookieLine(): string|null {
    return this._cookieLine;
  }

  matchesSecurityOrigin(securityOrigin: string): boolean {
    const hostname = new URL(securityOrigin).hostname;
    return Cookie.isDomainMatch(this.domain(), hostname);
  }

  static isDomainMatch(domain: string, hostname: string): boolean {
    // This implementation mirrors
    // https://source.chromium.org/search?q=net::cookie_util::IsDomainMatch()
    //
    // Can domain match in two ways; as a domain cookie (where the cookie
    // domain begins with ".") or as a host cookie (where it doesn't).

    // Some consumers of the CookieMonster expect to set cookies on
    // URLs like http://.strange.url.  To retrieve cookies in this instance,
    // we allow matching as a host cookie even when the domain_ starts with
    // a period.
    if (hostname === domain) {
      return true;
    }

    // Domain cookie must have an initial ".".  To match, it must be
    // equal to url's host with initial period removed, or a suffix of
    // it.

    // Arguably this should only apply to "http" or "https" cookies, but
    // extension cookie tests currently use the funtionality, and if we
    // ever decide to implement that it should be done by preventing
    // such cookies from being set.
    if (!domain || domain[0] !== '.') {
      return false;
    }

    // The host with a "." prefixed.
    if (domain.substr(1) === hostname) {
      return true;
    }

    // A pure suffix of the host (ok since we know the domain already
    // starts with a ".")
    return hostname.length > domain.length && hostname.endsWith(domain);
  }
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Type {
  Request = 0,
  Response = 1,
}


// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Attributes {
  Name = 'name',
  Value = 'value',
  Size = 'size',
  Domain = 'domain',
  Path = 'path',
  Expires = 'expires',
  HttpOnly = 'httpOnly',
  Secure = 'secure',
  SameSite = 'sameSite',
  SameParty = 'sameParty',
  SourceScheme = 'sourceScheme',
  SourcePort = 'sourcePort',
  Priority = 'priority',
}


/**
 * A `CookieReference` uniquely identifies a cookie by the triple (name,domain,path). Additionally, a context may be
 * included to make it clear which site under Application>Cookies should be opened when revealing a `CookieReference`.
 */
export class CookieReference {
  _name: string;
  _domain: string;
  _path: string;
  _contextUrl: string|undefined;
  constructor(name: string, domain: string, path: string, contextUrl: string|undefined) {
    this._name = name;
    this._domain = domain;
    this._path = path;
    this._contextUrl = contextUrl;
  }

  domain(): string {
    return this._domain;
  }

  contextUrl(): string|undefined {
    return this._contextUrl;
  }
}
