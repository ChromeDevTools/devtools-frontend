// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

SDK.CookieModel = class extends SDK.SDKModel {
  /**
   * @param {!SDK.Target} target
   */
  constructor(target) {
    super(target);
  }

  /**
   * @param {!Protocol.Network.Cookie} protocolCookie
   * @return {!SDK.Cookie}
   */
  static _parseProtocolCookie(protocolCookie) {
    var cookie = new SDK.Cookie(protocolCookie.name, protocolCookie.value, null);
    cookie.addAttribute('domain', protocolCookie['domain']);
    cookie.addAttribute('path', protocolCookie['path']);
    cookie.addAttribute('port', protocolCookie['port']);
    if (protocolCookie['expires'])
      cookie.addAttribute('expires', protocolCookie['expires']);
    if (protocolCookie['httpOnly'])
      cookie.addAttribute('httpOnly');
    if (protocolCookie['secure'])
      cookie.addAttribute('secure');
    if (protocolCookie['sameSite'])
      cookie.addAttribute('sameSite', protocolCookie['sameSite']);
    cookie.setSize(protocolCookie['size']);
    return cookie;
  }

  /**
   * @param {!SDK.Target} target
   * @return {!SDK.CookieModel}
   */
  static fromTarget(target) {
    return /** @type {!SDK.CookieModel} */ (target.model(SDK.CookieModel));
  }

  /**
   * @param {!SDK.Cookie} cookie
   * @param {string} resourceURL
   * @return {boolean}
   */
  static cookieMatchesResourceURL(cookie, resourceURL) {
    var url = resourceURL.asParsedURL();
    if (!url || !SDK.CookieModel.cookieDomainMatchesResourceDomain(cookie.domain(), url.host))
      return false;
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
    if (cookieDomain.charAt(0) !== '.')
      return resourceDomain === cookieDomain;
    return !!resourceDomain.match(
        new RegExp('^([^\\.]+\\.)*' + cookieDomain.substring(1).escapeForRegExp() + '$', 'i'));
  }

  /**
   * @param {!Array<string>} urls
   * @param {function(!Array<!SDK.Cookie>)} callback
   */
  getCookiesAsync(urls, callback) {
    this.target().networkAgent().getCookies(urls, (err, cookies) => {
      if (err) {
        console.error(err);
        return callback([]);
      }

      callback(cookies.map(cookie => SDK.CookieModel._parseProtocolCookie(cookie)));
    });
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
    this.getCookiesForDomain(domain || null, cookies => this._deleteAll(cookies, callback));
  }

  /**
   * @param {!SDK.Cookie} cookie
   * @param {function(?Protocol.Error, ?)=} callback
   */
  saveCookie(cookie, callback) {
    var domain = cookie.domain();
    if (!domain.startsWith('.'))
      domain = '';
    var expires = undefined;
    if (cookie.expires())
      expires = Math.floor(Date.parse(cookie.expires()) / 1000);
    this.target().networkAgent().setCookie(
        cookie.url(), cookie.name(), cookie.value(), domain, cookie.path(), cookie.secure(), cookie.httpOnly(),
        cookie.sameSite(), expires, callback);
  }

  /**
   * @param {?string} domain
   * @param {function(!Array<!SDK.Cookie>)} callback
   */
  getCookiesForDomain(domain, callback) {
    var resourceURLs = [];
    /**
     * @param {!SDK.Resource} resource
     */
    function populateResourceURLs(resource) {
      var url = resource.documentURL.asParsedURL();
      if (url && (!domain || url.securityOrigin() === domain))
        resourceURLs.push(resource.url);
    }
    SDK.ResourceTreeModel.fromTarget(this.target()).forAllResources(populateResourceURLs);
    this.getCookiesAsync(resourceURLs, callback);
  }

  /**
   * @param {!Array<!SDK.Cookie>} cookies
   * @param {function()=} callback
   */
  _deleteAll(cookies, callback) {
    var networkAgent = this.target().networkAgent();
    function deleteCookie(cookie) {
      return new Promise(resolve => networkAgent.deleteCookie(cookie.name(), cookie.url(), resolve));
    }
    Promise.all(cookies.map(deleteCookie)).then(callback || function() {});
  }
};

SDK.SDKModel.register(SDK.CookieModel, SDK.Target.Capability.Network);
