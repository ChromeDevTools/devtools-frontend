/*
 * Copyright (C) 2009 Apple Inc.  All rights reserved.
 * Copyright (C) 2009 Joseph Pecoraro
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

Resources.CookieItemsView = class extends Resources.StorageItemsView {
  /**
   * @param {!Resources.CookieTreeElement} treeElement
   * @param {!SDK.Target} target
   * @param {string} cookieDomain
   */
  constructor(treeElement, target, cookieDomain) {
    super(Common.UIString('Cookies'), 'cookiesPanel');

    this.element.classList.add('storage-view');

    this._target = target;
    this._treeElement = treeElement;
    this._cookieDomain = cookieDomain;

    /** @type {?Array<!SDK.Cookie>} */
    this._cookies = null;
    this._totalSize = 0;
    /** @type {?CookieTable.CookiesTable} */
    this._cookiesTable = null;
  }

  /**
   * @param {!Array.<!SDK.Cookie>} allCookies
   */
  _updateWithCookies(allCookies) {
    this._cookies = allCookies;
    this._totalSize = allCookies.reduce((size, cookie) => size + cookie.size(), 0);

    if (!this._cookiesTable) {
      const parsedURL = this._cookieDomain.asParsedURL();
      const domain = parsedURL ? parsedURL.host : '';
      this._cookiesTable = new CookieTable.CookiesTable(
          false, this.refreshItems.bind(this), () => this.setCanDeleteSelected(true), domain);
    }

    var shownCookies = this.filter(allCookies, cookie => `${cookie.name()} ${cookie.value()} ${cookie.domain()}`);
    this._cookiesTable.setCookies(shownCookies);
    this._cookiesTable.show(this.element);
    this._treeElement.subtitle =
        String.sprintf(Common.UIString('%d cookies (%s)'), this._cookies.length, Number.bytesToString(this._totalSize));
    this.setCanFilter(true);
    this.setCanDeleteAll(true);
    this.setCanDeleteSelected(!!this._cookiesTable.selectedCookie());
  }

  /**
   * @override
   */
  deleteAllItems() {
    this._cookiesTable.clear();
    this.refreshItems();
  }

  /**
   * @override
   */
  deleteSelectedItem() {
    var selectedCookie = this._cookiesTable.selectedCookie();
    if (selectedCookie) {
      selectedCookie.remove();
      this.refreshItems();
    }
  }

  /**
   * @override
   */
  refreshItems() {
    var resourceURLs = [];
    var cookieDomain = this._cookieDomain;
    /**
     * @param {!SDK.Resource} resource
     */
    function populateResourceURLs(resource) {
      var url = resource.documentURL.asParsedURL();
      if (url && url.securityOrigin() === cookieDomain)
        resourceURLs.push(resource.url);
    }

    SDK.ResourceTreeModel.fromTarget(this._target).forAllResources(populateResourceURLs);
    SDK.Cookies.getCookiesAsync(this._target, resourceURLs, this._updateWithCookies.bind(this));
  }
};
