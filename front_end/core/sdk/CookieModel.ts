// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Protocol from '../../generated/protocol.js';
import * as Common from '../common/common.js';
import * as Root from '../root/root.js';

import {Cookie, type Attributes} from './Cookie.js';
import {type Resource} from './Resource.js';
import {ResourceTreeModel} from './ResourceTreeModel.js';

import {Capability, type Target} from './Target.js';
import {SDKModel} from './SDKModel.js';

export class CookieModel extends SDKModel<void> {
  readonly #blockedCookies: Map<string, Cookie>;
  readonly #cookieToBlockedReasons: Map<Cookie, BlockedReason[]>;
  constructor(target: Target) {
    super(target);

    this.#blockedCookies = new Map();
    this.#cookieToBlockedReasons = new Map();
  }

  addBlockedCookie(cookie: Cookie, blockedReasons: BlockedReason[]|null): void {
    const key = cookie.key();
    const previousCookie = this.#blockedCookies.get(key);
    this.#blockedCookies.set(key, cookie);
    if (blockedReasons) {
      this.#cookieToBlockedReasons.set(cookie, blockedReasons);
    } else {
      this.#cookieToBlockedReasons.delete(cookie);
    }
    if (previousCookie) {
      this.#cookieToBlockedReasons.delete(previousCookie);
    }
  }

  getCookieToBlockedReasonsMap(): ReadonlyMap<Cookie, BlockedReason[]> {
    return this.#cookieToBlockedReasons;
  }

  async getCookies(urls: string[]): Promise<Cookie[]> {
    const response = await this.target().networkAgent().invoke_getCookies({urls});
    if (response.getError()) {
      return [];
    }
    const normalCookies = response.cookies.map(Cookie.fromProtocolCookie);
    return normalCookies.concat(Array.from(this.#blockedCookies.values()));
  }

  async deleteCookie(cookie: Cookie): Promise<void> {
    await this.deleteCookies([cookie]);
  }

  async clear(domain?: string, securityOrigin?: string): Promise<void> {
    const cookies = await this.getCookiesForDomain(domain || null);
    if (securityOrigin) {
      const cookiesToDelete = cookies.filter(cookie => {
        return cookie.matchesSecurityOrigin(securityOrigin);
      });
      await this.deleteCookies(cookiesToDelete);
    } else {
      await this.deleteCookies(cookies);
    }
  }

  async saveCookie(cookie: Cookie): Promise<boolean> {
    let domain = cookie.domain();
    if (!domain.startsWith('.')) {
      domain = '';
    }
    let expires: number|undefined = undefined;
    if (cookie.expires()) {
      expires = Math.floor(Date.parse(`${cookie.expires()}`) / 1000);
    }
    const enabled = Root.Runtime.experiments.isEnabled('experimentalCookieFeatures');
    const preserveUnset = (scheme: Protocol.Network.CookieSourceScheme): Protocol.Network.CookieSourceScheme.Unset|
                          undefined => scheme === Protocol.Network.CookieSourceScheme.Unset ? scheme : undefined;
    const protocolCookie = {
      name: cookie.name(),
      value: cookie.value(),
      url: cookie.url() || undefined,
      domain,
      path: cookie.path(),
      secure: cookie.secure(),
      httpOnly: cookie.httpOnly(),
      sameSite: cookie.sameSite(),
      expires,
      priority: cookie.priority(),
      partitionKey: cookie.partitionKey(),
      sourceScheme: enabled ? cookie.sourceScheme() : preserveUnset(cookie.sourceScheme()),
      sourcePort: enabled ? cookie.sourcePort() : undefined,
    };
    const response = await this.target().networkAgent().invoke_setCookie(protocolCookie);
    const error = response.getError();
    if (error || !response.success) {
      return false;
    }
    return response.success;
  }

  /**
   * Returns cookies needed by current page's frames whose security origins are |domain|.
   */
  getCookiesForDomain(domain: string|null): Promise<Cookie[]> {
    const resourceURLs = [];
    function populateResourceURLs(resource: Resource): boolean {
      const documentURL = Common.ParsedURL.ParsedURL.fromString(resource.documentURL);
      if (documentURL && (!domain || documentURL.securityOrigin() === domain)) {
        resourceURLs.push(resource.url);
      }
      return false;
    }
    const resourceTreeModel = this.target().model(ResourceTreeModel);
    if (resourceTreeModel) {
      // In case the current frame was unreachable, add it's cookies
      // because they might help to debug why the frame was unreachable.
      if (resourceTreeModel.mainFrame && resourceTreeModel.mainFrame.unreachableUrl()) {
        resourceURLs.push(resourceTreeModel.mainFrame.unreachableUrl());
      }

      resourceTreeModel.forAllResources(populateResourceURLs);
    }
    return this.getCookies(resourceURLs);
  }

  async deleteCookies(cookies: Cookie[]): Promise<void> {
    const networkAgent = this.target().networkAgent();
    this.#blockedCookies.clear();
    this.#cookieToBlockedReasons.clear();
    await Promise.all(cookies.map(
        cookie => networkAgent.invoke_deleteCookies(
            {name: cookie.name(), url: undefined, domain: cookie.domain(), path: cookie.path()})));
  }
}

SDKModel.register(CookieModel, {capabilities: Capability.Network, autostart: false});
export interface BlockedReason {
  uiString: string;
  attribute: Attributes|null;
}
