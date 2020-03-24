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

import * as Common from '../common/common.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

import {StorageItemsView} from './StorageItemsView.js';

export class CookieItemsView extends StorageItemsView {
  /**
   * @param {!SDK.CookieModel.CookieModel} model
   * @param {string} cookieDomain
   */
  constructor(model, cookieDomain) {
    super(Common.UIString.UIString('Cookies'), 'cookiesPanel');

    this.registerRequiredCSS('resources/cookieItemsView.css');
    this.element.classList.add('storage-view');

    this._model = model;
    this._cookieDomain = cookieDomain;

    this._totalSize = 0;
    /** @type {?CookieTable.CookiesTable} */
    this._cookiesTable = this._cookiesTable = new CookieTable.CookiesTable(
        /* renderInline */ false, this._saveCookie.bind(this), this.refreshItems.bind(this),
        this._handleCookieSelected.bind(this), this._deleteCookie.bind(this));

    this._cookiesTable.setMinimumSize(0, 50);

    this._splitWidget = new UI.SplitWidget.SplitWidget(
        /* isVertical: */ false, /* secondIsSidebar: */ true, 'cookieItemsSplitViewState');
    this._splitWidget.show(this.element);

    this._previewPanel = new UI.Widget.VBox();
    const resizer = this._previewPanel.element.createChild('div', 'preview-panel-resizer');

    this._splitWidget.setMainWidget(this._cookiesTable);
    this._splitWidget.setSidebarWidget(this._previewPanel);
    this._splitWidget.installResizer(resizer);

    this._onlyIssuesFilterUI = new UI.Toolbar.ToolbarCheckbox(ls`Only blocked`, ls`Only show blocked Cookies`, () => {
      this._updateWithCookies(this._allCookies);
    });
    this.appendToolbarItem(this._onlyIssuesFilterUI);

    this._refreshThrottler = new Common.Throttler.Throttler(300);
    /** @type {!Array<!Common.EventTarget.EventDescriptor>} */
    this._eventDescriptors = [];


    /** @type {?UI.Widget.Widget} */
    this._preview = null;
    /** @type {?SDK.Cookie.Cookie} */
    this._previewValue = null;

    /** @type {!Array<!SDK.Cookie.Cookie>} */
    this._allCookies = [];

    this.setCookiesDomain(model, cookieDomain);
  }

  /**
   * @param {!SDK.CookieModel.CookieModel} model
   * @param {string} domain
   */
  setCookiesDomain(model, domain) {
    this._model = model;
    this._cookieDomain = domain;
    this.refreshItems();
    Common.EventTarget.EventTarget.removeEventListeners(this._eventDescriptors);
    const networkManager = model.target().model(SDK.NetworkManager.NetworkManager);
    this._eventDescriptors = [
      networkManager.addEventListener(SDK.NetworkManager.Events.ResponseReceived, this._onResponseReceived, this),
      networkManager.addEventListener(SDK.NetworkManager.Events.LoadingFinished, this._onLoadingFinished, this),
    ];

    this._showPreview(null, null);
  }

  /**
   * @param {?UI.Widget.Widget} preview
   * @param {?SDK.Cookie.Cookie} value
   */
  _showPreview(preview, value) {
    if (this._preview && this._previewValue === value) {
      return;
    }

    if (this._preview) {
      this._preview.detach();
    }

    if (!preview) {
      preview = new UI.EmptyWidget.EmptyWidget(ls`Select a cookie to preview its value`);
    }

    this._previewValue = value;
    this._preview = preview;

    preview.show(this._previewPanel.contentElement);
  }

  _handleCookieSelected() {
    const cookie = this._cookiesTable.selectedCookie();
    this.setCanDeleteSelected(!!cookie);

    if (!cookie) {
      this._showPreview(null, null);
      return;
    }

    const value = createElementWithClass('div', 'cookie-value');
    value.textContent = cookie.value();
    value.addEventListener('dblclick', handleDblClickOnCookieValue);

    const preview = new UI.Widget.VBox();
    preview.contentElement.appendChild(value);

    this._showPreview(preview, cookie);

    /**
     * @suppressGlobalPropertiesCheck
     */
    function handleDblClickOnCookieValue() {
      const range = document.createRange();
      range.selectNode(value);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
    }
  }

  /**
   * @param {!SDK.Cookie.Cookie} newCookie
   * @param {?SDK.Cookie.Cookie} oldCookie
   * @return {!Promise<boolean>}
   */
  _saveCookie(newCookie, oldCookie) {
    if (!this._model) {
      return Promise.resolve(false);
    }
    if (oldCookie && newCookie.key() !== oldCookie.key()) {
      this._model.deleteCookie(oldCookie);
    }
    return this._model.saveCookie(newCookie);
  }

  /**
   * @param {!SDK.Cookie.Cookie} cookie
   * @param {function()} callback
   */
  _deleteCookie(cookie, callback) {
    this._model.deleteCookie(cookie, callback);
  }

  /**
   * @param {!Array<!SDK.Cookie.Cookie>} allCookies
   */
  _updateWithCookies(allCookies) {
    this._allCookies = allCookies;
    this._totalSize = allCookies.reduce((size, cookie) => size + cookie.size(), 0);

    const parsedURL = Common.ParsedURL.ParsedURL.fromString(this._cookieDomain);
    const host = parsedURL ? parsedURL.host : '';
    this._cookiesTable.setCookieDomain(host);

    const shownCookies = this.filter(allCookies, cookie => `${cookie.name()} ${cookie.value()} ${cookie.domain()}`);
    this._cookiesTable.setCookies(shownCookies, this._model.getCookieToBlockedReasonsMap());
    this.setCanFilter(true);
    this.setCanDeleteAll(true);
    this.setCanDeleteSelected(!!this._cookiesTable.selectedCookie());
  }

  /**
   * @override
   * @param {!Array<?Object>} items
   * @param {function(?Object): string} keyFunction
   * @return {!Array<?Object>}
   * @protected
   */
  filter(items, keyFunction) {
    return super.filter(items, keyFunction)
        .filter(cookie => !this._onlyIssuesFilterUI.checked() || SDK.RelatedIssue.hasIssues(cookie));
  }

  /**
   * @override
   */
  deleteAllItems() {
    this._model.clear(this._cookieDomain, () => this.refreshItems());
  }

  /**
   * @override
   */
  deleteSelectedItem() {
    const selectedCookie = this._cookiesTable.selectedCookie();
    if (selectedCookie) {
      this._model.deleteCookie(selectedCookie, () => this.refreshItems());
    }
  }

  /**
   * @override
   */
  refreshItems() {
    this._model.getCookiesForDomain(this._cookieDomain).then(this._updateWithCookies.bind(this));
  }

  refreshItemsThrottled() {
    this._refreshThrottler.schedule(() => Promise.resolve(this.refreshItems()));
  }

  _onResponseReceived() {
    this.refreshItemsThrottled();
  }

  _onLoadingFinished() {
    this.refreshItemsThrottled();
  }
}
