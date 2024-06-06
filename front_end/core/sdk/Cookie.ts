// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../generated/protocol.js';
import type * as Platform from '../platform/platform.js';

const OPAQUE_PARTITION_KEY = '<opaque>';

export class Cookie {
  readonly #nameInternal: string;
  readonly #valueInternal: string;
  readonly #typeInternal: Type|null|undefined;
  #attributes: Map<Attribute, string|number|boolean|undefined>;
  #sizeInternal: number;
  #priorityInternal: Protocol.Network.CookiePriority;
  #cookieLine: string|null;
  #partitionKey: Protocol.Network.CookiePartitionKey|undefined;

  constructor(
      name: string, value: string, type?: Type|null, priority?: Protocol.Network.CookiePriority,
      partitionKey?: Protocol.Network.CookiePartitionKey) {
    this.#nameInternal = name;
    this.#valueInternal = value;
    this.#typeInternal = type;
    this.#attributes = new Map();
    this.#sizeInternal = 0;
    this.#priorityInternal = (priority || 'Medium' as Protocol.Network.CookiePriority);
    this.#cookieLine = null;
    this.#partitionKey = partitionKey;
  }

  static fromProtocolCookie(protocolCookie: Protocol.Network.Cookie): Cookie {
    const cookie = new Cookie(protocolCookie.name, protocolCookie.value, null, protocolCookie.priority);
    cookie.addAttribute(Attribute.Domain, protocolCookie['domain']);
    cookie.addAttribute(Attribute.Path, protocolCookie['path']);
    if (protocolCookie['expires']) {
      cookie.addAttribute(Attribute.Expires, protocolCookie['expires'] * 1000);
    }
    if (protocolCookie['httpOnly']) {
      cookie.addAttribute(Attribute.HttpOnly);
    }
    if (protocolCookie['secure']) {
      cookie.addAttribute(Attribute.Secure);
    }
    if (protocolCookie['sameSite']) {
      cookie.addAttribute(Attribute.SameSite, protocolCookie['sameSite']);
    }
    if ('sourcePort' in protocolCookie) {
      cookie.addAttribute(Attribute.SourcePort, protocolCookie.sourcePort);
    }
    if ('sourceScheme' in protocolCookie) {
      cookie.addAttribute(Attribute.SourceScheme, protocolCookie.sourceScheme);
    }
    if ('partitionKey' in protocolCookie) {
      if (protocolCookie.partitionKey) {
        cookie.setPartitionKey(
            protocolCookie.partitionKey ? protocolCookie.partitionKey.topLevelSite : '',
            protocolCookie.partitionKey ? protocolCookie.partitionKey.hasCrossSiteAncestor : false);
      }
    }
    if ('partitionKeyOpaque' in protocolCookie && protocolCookie.partitionKeyOpaque) {
      cookie.addAttribute(Attribute.PartitionKey, OPAQUE_PARTITION_KEY);
    }
    cookie.setSize(protocolCookie['size']);
    return cookie;
  }

  key(): string {
    return (this.domain() || '-') + ' ' + this.name() + ' ' + (this.path() || '-') + ' ' +
        (this.partitionKey() ?
             (this.topLevelSite() + ' ' + (this.hasCrossSiteAncestor() ? 'cross_site' : 'same_site')) :
             '-');
  }

  name(): string {
    return this.#nameInternal;
  }

  value(): string {
    return this.#valueInternal;
  }

  type(): Type|null|undefined {
    return this.#typeInternal;
  }

  httpOnly(): boolean {
    return this.#attributes.has(Attribute.HttpOnly);
  }

  secure(): boolean {
    return this.#attributes.has(Attribute.Secure);
  }

  partitioned(): boolean {
    return this.#attributes.has(Attribute.Partitioned) || Boolean(this.partitionKey()) || this.partitionKeyOpaque();
  }

  sameSite(): Protocol.Network.CookieSameSite {
    // TODO(allada) This should not rely on #attributes and instead store them individually.
    // when #attributes get added via addAttribute() they are lowercased, hence the lowercasing of samesite here
    return this.#attributes.get(Attribute.SameSite) as Protocol.Network.CookieSameSite;
  }

  partitionKey(): Protocol.Network.CookiePartitionKey {
    return this.#partitionKey as Protocol.Network.CookiePartitionKey;
  }

  setPartitionKey(topLevelSite: string, hasCrossSiteAncestor: boolean): void {
    this.#partitionKey = {topLevelSite, hasCrossSiteAncestor};
    if (!this.#attributes.has(Attribute.Partitioned)) {
      this.addAttribute(Attribute.Partitioned);
    }
  }

  topLevelSite(): string {
    if (!this.#partitionKey) {
      return '';
    }
    return this.#partitionKey?.topLevelSite as string;
  }

  setTopLevelSite(topLevelSite: string, hasCrossSiteAncestor: boolean): void {
    this.setPartitionKey(topLevelSite, hasCrossSiteAncestor);
  }

  hasCrossSiteAncestor(): boolean {
    if (!this.#partitionKey) {
      return false;
    }
    return this.#partitionKey?.hasCrossSiteAncestor as boolean;
  }

  setHasCrossSiteAncestor(hasCrossSiteAncestor: boolean): void {
    if (!this.partitionKey() || !Boolean(this.topLevelSite())) {
      return;
    }
    this.setPartitionKey(this.topLevelSite(), hasCrossSiteAncestor);
  }

  partitionKeyOpaque(): boolean {
    if (!this.#partitionKey) {
      return false;
    }
    return (this.topLevelSite() === OPAQUE_PARTITION_KEY);
  }

  setPartitionKeyOpaque(): void {
    this.addAttribute(Attribute.PartitionKey, OPAQUE_PARTITION_KEY);
    this.setPartitionKey(OPAQUE_PARTITION_KEY, false);
  }

  priority(): Protocol.Network.CookiePriority {
    return this.#priorityInternal;
  }

  session(): boolean {
    // RFC 2965 suggests using Discard attribute to mark session cookies, but this does not seem to be widely used.
    // Check for absence of explicitly max-age or expiry date instead.
    return !(this.#attributes.has(Attribute.Expires) || this.#attributes.has(Attribute.MaxAge));
  }

  path(): string {
    return this.#attributes.get(Attribute.Path) as string;
  }

  domain(): string {
    return this.#attributes.get(Attribute.Domain) as string;
  }

  expires(): number {
    return this.#attributes.get(Attribute.Expires) as number;
  }

  maxAge(): number {
    return this.#attributes.get(Attribute.MaxAge) as number;
  }

  sourcePort(): number {
    return this.#attributes.get(Attribute.SourcePort) as number;
  }

  sourceScheme(): Protocol.Network.CookieSourceScheme {
    return this.#attributes.get(Attribute.SourceScheme) as Protocol.Network.CookieSourceScheme;
  }

  size(): number {
    return this.#sizeInternal;
  }

  /**
   * @deprecated
   */
  url(): Platform.DevToolsPath.UrlString|null {
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
    return (this.secure() ? 'https://' : 'http://') + this.domain() + port + this.path() as
        Platform.DevToolsPath.UrlString;
  }

  setSize(size: number): void {
    this.#sizeInternal = size;
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

  addAttribute(key: Attribute|null, value?: string|number|boolean): void {
    if (!key) {
      return;
    }
    switch (key) {
      case Attribute.Priority:
        this.#priorityInternal = (value as Protocol.Network.CookiePriority);
        break;
      default:
        this.#attributes.set(key, value);
    }
  }

  setCookieLine(cookieLine: string): void {
    this.#cookieLine = cookieLine;
  }

  getCookieLine(): string|null {
    return this.#cookieLine;
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

export const enum Type {
  Request = 0,
  Response = 1,
}

export const enum Attribute {
  Name = 'name',
  Value = 'value',
  Size = 'size',
  Domain = 'domain',
  Path = 'path',
  Expires = 'expires',
  MaxAge = 'max-age',
  HttpOnly = 'http-only',
  Secure = 'secure',
  SameSite = 'same-site',
  SourceScheme = 'source-scheme',
  SourcePort = 'source-port',
  Priority = 'priority',
  Partitioned = 'partitioned',
  PartitionKey = 'partition-key',
  PartitionKeySite = 'partition-key-site',
  HasCrossSiteAncestor = 'has-cross-site-ancestor',
}
