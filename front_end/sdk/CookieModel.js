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
    const normalCookies = await this.target().networkAgent().getCookies(urls).then(
        cookies => (cookies || []).map(cookie => Cookie.fromProtocolCookie(cookie)));

    return normalCookies.concat(Array.from(this._blockedCookies.values()));
  }

  /**
   * @param {!Cookie} cookie
   * @param {function()=} callback
   */
  deleteCookie(cookie, callback) {
    this._deleteAll([cookie], callback);
  }

  /**
   * @param {string=} domain
   * @param {function()=} callback
   */
  clear(domain, callback) {
    this.getCookiesForDomain(domain || null).then(cookies => this._deleteAll(cookies, callback));
  }

  /**
   * @param {!Cookie} cookie
   * @return {!Promise<boolean>}
   */
  saveCookie(cookie) {
    let domain = cookie.domain();
    if (!domain.startsWith('.')) {
      domain = '';
    }
    let expires = undefined;
    if (cookie.expires()) {
      expires = Math.floor(Date.parse(cookie.expires()) / 1000);
    }
    return this.target()
        .networkAgent()
        .setCookie(
            cookie.name(), cookie.value(), cookie.url() || undefined, domain, cookie.path(), cookie.secure(),
            cookie.httpOnly(), cookie.sameSite(), expires, cookie.priority())
        .then(success => !!success);
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
      resourceTreeModel.forAllResources(populateResourceURLs);
    }
    return this.getCookies(resourceURLs);
  }

  /**
   * @param {!Array<!Cookie>} cookies
   * @param {function()=} callback
   */
  _deleteAll(cookies, callback) {
    const networkAgent = this.target().networkAgent();
    this._blockedCookies.clear();
    this._cookieToBlockedReasons.clear();
    Promise
        .all(
            cookies.map(cookie => networkAgent.deleteCookies(cookie.name(), undefined, cookie.domain(), cookie.path())))
        .then(callback || function() {});
  }
}

SDKModel.register(CookieModel, Capability.Network, false);

/** @typedef {!{uiString: string, attribute: ?Attributes}} */
export let BlockedReason;
