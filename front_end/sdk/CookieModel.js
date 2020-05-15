// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';

import {Attributes, Cookie} from './Cookie.js';  // eslint-disable-line no-unused-vars
import {Resource} from './Resource.js';          // eslint-disable-line no-unused-vars
import {ResourceTreeModel} from './ResourceTreeModel.js';
import {Capability, SDKModel, Target} from './SDKModel.js';  // eslint-disable-line no-unused-vars

export class CookieModel extends SDKModel {
  /**
   * @param {!Target} target
   */
  constructor(target) {
    super(target);

    /** Array<!Cookie> */
    this._blockedCookies = new Map();
    this._cookieToBlockedReasons = new Map();
  }

  /**
   * @param {!Cookie} cookie
   * @param {?Array<!BlockedReason>} blockedReasons
   */
  addBlockedCookie(cookie, blockedReasons) {
    const key = cookie.key();
    const previousCookie = this._blockedCookies.get(key);
    this._blockedCookies.set(key, cookie);
    this._cookieToBlockedReasons.set(cookie, blockedReasons);
    if (previousCookie) {
      this._cookieToBlockedReasons.delete(key);
    }
  }

  getCookieToBlockedReasonsMap() {
    return this._cookieToBlockedReasons;
  }

  /**
   * @param {!Array<string>} urls
   * @return {!Promise<!Array<!Cookie>>}
   */
  async getCookies(urls) {
    const response = await this.target().networkAgent().invoke_getCookies({urls});
    if (response.getError()) {
      return [];
    }
    const normalCookies = response.cookies.map(Cookie.fromProtocolCookie);
    return normalCookies.concat(Array.from(this._blockedCookies.values()));
  }

  /**
   * @param {!Cookie} cookie
   * @return {!Promise<void>}
   */
  async deleteCookie(cookie) {
    await this._deleteAll([cookie]);
  }

  /**
   * @param {string=} domain
   * @return {!Promise<void>}
   */
  async clear(domain) {
    const cookies = await this.getCookiesForDomain(domain || null);
    await this._deleteAll(cookies);
  }

  /**
   * @param {!Cookie} cookie
   * @return {!Promise<boolean>}
   */
  async saveCookie(cookie) {
    let domain = cookie.domain();
    if (!domain.startsWith('.')) {
      domain = '';
    }
    let expires = undefined;
    if (cookie.expires()) {
      expires = Math.floor(Date.parse(`${cookie.expires()}`) / 1000);
    }
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
      priority: cookie.priority()
    };
    const response = await this.target().networkAgent().invoke_setCookie(protocolCookie);
    if (response.getError()) {
      return false;
    }
    return response.success;
  }

  /**
   * Returns cookies needed by current page's frames whose security origins are |domain|.
   * @param {?string} domain
   * @return {!Promise<!Array<!Cookie>>}
   */
  getCookiesForDomain(domain) {
    const resourceURLs = [];
    /**
     * @param {!Resource} resource
     */
    function populateResourceURLs(resource) {
      const documentURL = Common.ParsedURL.ParsedURL.fromString(resource.documentURL);
      if (documentURL && (!domain || documentURL.securityOrigin() === domain)) {
        resourceURLs.push(resource.url);
      }
    }
    const resourceTreeModel = this.target().model(ResourceTreeModel);
    if (resourceTreeModel) {
      // In case the current frame was unreachable, add it's cookies
      // because they might help to debug why the frame was unreachable.
      if (resourceTreeModel.mainFrame.unreachableUrl()) {
        resourceURLs.push(resourceTreeModel.mainFrame.unreachableUrl());
      }

      resourceTreeModel.forAllResources(populateResourceURLs);
    }
    return this.getCookies(resourceURLs);
  }

  /**
   * @param {!Array<!Cookie>} cookies
   * @return {!Promise<void>}
   */
  async _deleteAll(cookies) {
    const networkAgent = this.target().networkAgent();
    this._blockedCookies.clear();
    this._cookieToBlockedReasons.clear();
    await Promise.all(cookies.map(
        cookie => networkAgent.invoke_deleteCookies(
            {name: cookie.name(), url: undefined, domain: cookie.domain(), path: cookie.path()})));
  }
}

SDKModel.register(CookieModel, Capability.Network, false);

/** @typedef {!{uiString: string, attribute: ?Attributes}} */
// @ts-ignore typedef
export let BlockedReason;
