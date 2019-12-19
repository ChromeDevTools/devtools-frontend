// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export default class CookieModel extends SDK.SDKModel {
  /**
   * @param {!SDK.Target} target
   */
  constructor(target) {
    super(target);

    /** Array<!SDK.Cookie> */
    this._blockedCookies = new Map();
    this._cookieToBlockedReasons = new Map();
  }

  /**
   * @param {!SDK.Cookie} cookie
   * @param {string} resourceURL
   * @return {boolean}
   */
  static cookieMatchesResourceURL(cookie, resourceURL) {
    const url = Common.ParsedURL.fromString(resourceURL);
    if (!url || !CookieModel.cookieDomainMatchesResourceDomain(cookie.domain(), url.host)) {
      return false;
    }
    return (
        url.path.startsWith(cookie.path()) && (!cookie.port() || url.port === cookie.port()) &&
        (!cookie.secure() || url.scheme === 'https'));
  }

  /**
   * @param {string} cookieDomain
   * @param {string} resourceDomain
   * @return {boolean}
   */
  static cookieDomainMatchesResourceDomain(cookieDomain, resourceDomain) {
    if (cookieDomain.charAt(0) !== '.') {
      return resourceDomain === cookieDomain;
    }
    return !!resourceDomain.match(
        new RegExp('^([^\\.]+\\.)*' + cookieDomain.substring(1).escapeForRegExp() + '$', 'i'));
  }

  /**
   * @param {!SDK.Cookie} cookie
   * @param {?Array<!CookieTable.BlockedReason>} blockedReasons
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

  getBlockedReasonsByCookie(cookie) {
    return this._cookieToBlockedReasons.get(cookie) || null;
  }

  getCookieToBlockedReasonsMap() {
    return this._cookieToBlockedReasons;
  }

  /**
   * @param {!Array<string>} urls
   * @return {!Promise<!Array<!SDK.Cookie>>}
   */
  async getCookies(urls) {
    const normalCookies = await this.target().networkAgent().getCookies(urls).then(
        cookies => (cookies || []).map(cookie => SDK.Cookie.fromProtocolCookie(cookie)));

    return normalCookies.concat(Array.from(this._blockedCookies.values()));
  }

  /**
   * @param {!SDK.Cookie} cookie
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
   * @param {!SDK.Cookie} cookie
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
   * @return {!Promise<!Array<!SDK.Cookie>>}
   */
  getCookiesForDomain(domain) {
    const resourceURLs = [];
    /**
     * @param {!SDK.Resource} resource
     */
    function populateResourceURLs(resource) {
      const documentURL = Common.ParsedURL.fromString(resource.documentURL);
      if (documentURL && (!domain || documentURL.securityOrigin() === domain)) {
        resourceURLs.push(resource.url);
      }
    }
    const resourceTreeModel = this.target().model(SDK.ResourceTreeModel);
    if (resourceTreeModel) {
      resourceTreeModel.forAllResources(populateResourceURLs);
    }
    return this.getCookies(resourceURLs);
  }

  /**
   * @param {!Array<!SDK.Cookie>} cookies
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

/* Legacy exported object */
self.SDK = self.SDK || {};

/* Legacy exported object */
SDK = SDK || {};

/** @constructor */
SDK.CookieModel = CookieModel;

SDK.SDKModel.register(SDK.CookieModel, SDK.Target.Capability.Network, false);
