// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Protocol from '../../generated/protocol.js';
import * as Common from '../common/common.js';
import * as Platform from '../platform/platform.js';
import * as Root from '../root/root.js';

import {type Attribute, Cookie} from './Cookie.js';
import {Events as NetworkManagerEvents, NetworkManager} from './NetworkManager.js';
import {type Resource} from './Resource.js';
import {Events as ResourceTreeModelEvents, ResourceTreeModel} from './ResourceTreeModel.js';
import {SDKModel} from './SDKModel.js';
import {Capability, type Target} from './Target.js';

export class CookieModel extends SDKModel<EventTypes> {
  readonly #blockedCookies: Map<string, Cookie>;
  readonly #cookieToBlockedReasons: Map<Cookie, BlockedReason[]>;
  readonly #refreshThrottler: Common.Throttler.Throttler;
  #cookies: Map<string, Cookie[]>;

  constructor(target: Target) {
    super(target);

    this.#refreshThrottler = new Common.Throttler.Throttler(300);
    this.#blockedCookies = new Map();
    this.#cookieToBlockedReasons = new Map();
    this.#cookies = new Map();
    target.model(ResourceTreeModel)
        ?.addEventListener(ResourceTreeModelEvents.PrimaryPageChanged, this.#onPrimaryPageChanged, this);
    target.model(NetworkManager)
        ?.addEventListener(NetworkManagerEvents.ResponseReceived, this.#onResponseReceived, this);
    target.model(NetworkManager)?.addEventListener(NetworkManagerEvents.LoadingFinished, this.#onLoadingFinished, this);
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

  removeBlockedCookie(cookie: Cookie): void {
    this.#blockedCookies.delete(cookie.key());
  }

  async #onPrimaryPageChanged(): Promise<void> {
    this.#blockedCookies.clear();
    this.#cookieToBlockedReasons.clear();
    await this.#refresh();
  }

  getCookieToBlockedReasonsMap(): ReadonlyMap<Cookie, BlockedReason[]> {
    return this.#cookieToBlockedReasons;
  }

  async #getCookies(urls: Platform.MapUtilities.Multimap<string, string>): Promise<void> {
    const networkAgent = this.target().networkAgent();
    const newCookies = new Map<string, Cookie[]>(await Promise.all(urls.keysArray().map(
        domain => networkAgent.invoke_getCookies({urls: [...urls.get(domain).values()]})
                      .then(({cookies}) => [domain, cookies.map(Cookie.fromProtocolCookie)] as const))));
    const updated = this.#isUpdated(newCookies);
    this.#cookies = newCookies;
    if (updated) {
      this.dispatchEventToListeners(Events.CookieListUpdated);
    }
  }

  async deleteCookie(cookie: Cookie): Promise<void> {
    await this.deleteCookies([cookie]);
  }

  async clear(domain?: string, securityOrigin?: string): Promise<void> {
    if (!this.#isRefreshing()) {
      await this.#refreshThrottled();
    }
    const cookies = domain ? (this.#cookies.get(domain) || []) : [...this.#cookies.values()].flat();
    cookies.push(...this.#blockedCookies.values());
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
    const enabled = Root.Runtime.experiments.isEnabled('experimental-cookie-features');
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
    await this.#refreshThrottled();
    return response.success;
  }

  /**
   * Returns cookies needed by current page's frames whose security origins are |domain|.
   */
  async getCookiesForDomain(domain: string, forceUpdate?: boolean): Promise<Cookie[]> {
    if (!this.#isRefreshing() || forceUpdate) {
      await this.#refreshThrottled();
    }
    const normalCookies = this.#cookies.get(domain) || [];
    return normalCookies.concat(Array.from(this.#blockedCookies.values()));
  }

  async deleteCookies(cookies: Cookie[]): Promise<void> {
    const networkAgent = this.target().networkAgent();
    this.#blockedCookies.clear();
    this.#cookieToBlockedReasons.clear();
    await Promise.all(cookies.map(cookie => networkAgent.invoke_deleteCookies({
      name: cookie.name(),
      url: undefined,
      domain: cookie.domain(),
      path: cookie.path(),
      partitionKey: cookie.partitionKey(),
    })));
    await this.#refreshThrottled();
  }

  #isRefreshing(): boolean {
    return Boolean(this.listeners?.size);
  }

  #isUpdated(newCookies: Map<string, Cookie[]>): boolean {
    if (newCookies.size !== this.#cookies.size) {
      return true;
    }
    for (const [domain, newDomainCookies] of newCookies) {
      if (!this.#cookies.has(domain)) {
        return true;
      }
      const oldDomainCookies = this.#cookies.get(domain) || [];
      if (newDomainCookies.length !== oldDomainCookies.length) {
        return true;
      }
      const comparisonKey = (c: Cookie): string => c.key() + ' ' + c.value();
      const oldDomainCookieKeys = new Set(oldDomainCookies.map(comparisonKey));
      for (const newCookie of newDomainCookies) {
        if (!oldDomainCookieKeys.has(comparisonKey(newCookie))) {
          return true;
        }
      }
    }
    return false;
  }

  #refreshThrottled(): Promise<void> {
    return this.#refreshThrottler.schedule(() => this.#refresh());
  }

  #refresh(): Promise<void> {
    const resourceURLs = new Platform.MapUtilities.Multimap<string, string>();
    function populateResourceURLs(resource: Resource): boolean {
      const documentURL = Common.ParsedURL.ParsedURL.fromString(resource.documentURL);
      if (documentURL) {
        resourceURLs.set(documentURL.securityOrigin(), resource.url);
      }
      return false;
    }
    const resourceTreeModel = this.target().model(ResourceTreeModel);
    if (resourceTreeModel) {
      // In case the current frame was unreachable, add its cookies
      // because they might help to debug why the frame was unreachable.
      const unreachableUrl = resourceTreeModel.mainFrame?.unreachableUrl();
      if (unreachableUrl) {
        const documentURL = Common.ParsedURL.ParsedURL.fromString(unreachableUrl);
        if (documentURL) {
          resourceURLs.set(documentURL.securityOrigin(), unreachableUrl);
        }
      }

      resourceTreeModel.forAllResources(populateResourceURLs);
    }
    return this.#getCookies(resourceURLs);
  }

  #onResponseReceived(): void {
    if (this.#isRefreshing()) {
      void this.#refreshThrottled();
    }
  }

  #onLoadingFinished(): void {
    if (this.#isRefreshing()) {
      void this.#refreshThrottled();
    }
  }
}

SDKModel.register(CookieModel, {capabilities: Capability.Network, autostart: false});
export interface BlockedReason {
  uiString: string;
  attribute: Attribute|null;
}
export interface ExemptionReason {
  uiString: string;
}

export const enum Events {
  CookieListUpdated = 'CookieListUpdated',
}

export type EventTypes = {
  [Events.CookieListUpdated]: void,
};
