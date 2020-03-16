/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as Common from '../common/common.js';
import * as CookieTable from '../cookie_table/cookie_table.js';  // eslint-disable-line no-unused-vars
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

export class RequestCookiesView extends UI.Widget.Widget {
  /**
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   */
  constructor(request) {
    super();
    this.registerRequiredCSS('network/requestCookiesView.css');
    this.element.classList.add('request-cookies-view');

    /** @type {!SDK.NetworkRequest.NetworkRequest} */
    this._request = request;
    /** @type {?Array<!SDK.Cookie.Cookie>} */
    this._detailedRequestCookies = null;
    this._showFilteredOutCookiesSetting = Common.Settings.Settings.instance().createSetting(
        'show-filtered-out-request-cookies', /* defaultValue */ false);

    this._emptyWidget = new UI.EmptyWidget.EmptyWidget(Common.UIString.UIString('This request has no cookies.'));
    this._emptyWidget.show(this.element);

    this._requestCookiesTitle = this.element.createChild('div');
    const titleText = this._requestCookiesTitle.createChild('span', 'request-cookies-title');
    titleText.textContent = ls`Request Cookies`;
    titleText.title = ls`Cookies that were sent to the server in the 'cookie' header of the request`;

    const requestCookiesCheckbox = UI.SettingsUI.createSettingCheckbox(
        ls`show filtered out request cookies`, this._showFilteredOutCookiesSetting,
        /* omitParagraphElement */ true);
    requestCookiesCheckbox.checkboxElement.addEventListener('change', () => {
      this._refreshRequestCookiesView();
    });
    this._requestCookiesTitle.appendChild(requestCookiesCheckbox);

    this._requestCookiesEmpty = this.element.createChild('div', 'cookies-panel-item');
    this._requestCookiesEmpty.textContent = ls`No request cookies were sent.`;

    this._requestCookiesTable = new CookieTable.CookiesTable.CookiesTable(/* renderInline */ true);
    this._requestCookiesTable.contentElement.classList.add('cookie-table', 'cookies-panel-item');
    this._requestCookiesTable.show(this.element);

    this._responseCookiesTitle = this.element.createChild('div', 'request-cookies-title');
    this._responseCookiesTitle.textContent = ls`Response Cookies`;
    this._responseCookiesTitle.title =
        ls`Cookies that were received from the server in the 'set-cookie' header of the response`;

    this._responseCookiesTable = new CookieTable.CookiesTable.CookiesTable(/* renderInline */ true);
    this._responseCookiesTable.contentElement.classList.add('cookie-table', 'cookies-panel-item');
    this._responseCookiesTable.show(this.element);

    this._malformedResponseCookiesTitle = this.element.createChild('div', 'request-cookies-title');
    this._malformedResponseCookiesTitle.textContent = ls`Malformed Response Cookies`;
    this._malformedResponseCookiesTitle.title = ls
    `Cookies that were received from the server in the 'set-cookie' header of the response but were malformed`;

    this._malformedResponseCookiesList = this.element.createChild('div');
  }

  /**
   * @return {!{requestCookies: !Array<!SDK.Cookie.Cookie>, requestCookieToBlockedReasons: !Map<!SDK.Cookie.Cookie, !Array<!SDK.CookieModel.BlockedReason>>}}
   */
  _getRequestCookies() {
    let requestCookies = [];
    /** @type {!Map<!SDK.Cookie.Cookie, !Array<!SDK.CookieModel.BlockedReason>>} */
    const requestCookieToBlockedReasons = new Map();

    if (this._request.requestCookies.length) {
      requestCookies = this._request.requestCookies.slice();

      // request.requestCookies are generated from headers which are missing
      // cookie attributes that we can fetch from the backend.
      if (this._detailedRequestCookies) {
        requestCookies = requestCookies.map(cookie => {
          for (const detailedCookie of (this._detailedRequestCookies || [])) {
            if (detailedCookie.name() === cookie.name() && detailedCookie.value() === cookie.value()) {
              return detailedCookie;
            }
          }
          return cookie;
        });

      } else {
        const networkManager = SDK.NetworkManager.NetworkManager.forRequest(this._request);
        if (networkManager) {
          const cookieModel = networkManager.target().model(SDK.CookieModel.CookieModel);
          if (cookieModel) {
            cookieModel.getCookies([this._request.url()]).then(cookies => {
              this._detailedRequestCookies = cookies;
              this._refreshRequestCookiesView();
            });
          }
        }
      }
    }

    if (this._showFilteredOutCookiesSetting.get()) {
      for (const blockedCookie of this._request.blockedRequestCookies()) {
        requestCookieToBlockedReasons.set(blockedCookie.cookie, blockedCookie.blockedReasons.map(blockedReason => {
          return {
            attribute: SDK.NetworkRequest.cookieBlockedReasonToAttribute(blockedReason),
            uiString: SDK.NetworkRequest.cookieBlockedReasonToUiString(blockedReason)
          };
        }));
        requestCookies.push(blockedCookie.cookie);
      }
    }

    return {requestCookies, requestCookieToBlockedReasons};
  }

  /**
   * @return {!{responseCookies: !Array<!SDK.Cookie.Cookie>, responseCookieToBlockedReasons: !Map<!SDK.Cookie.Cookie, !Array<!SDK.CookieModel.BlockedReason>>, malformedResponseCookies: !Array<!SDK.NetworkRequest.BlockedSetCookieWithReason>}}
   */
  _getResponseCookies() {
    /** @type {!Array<!SDK.Cookie.Cookie>} */
    let responseCookies = [];
    /** @type {!Map<!SDK.Cookie.Cookie, !Array<!SDK.CookieModel.BlockedReason>>} */
    const responseCookieToBlockedReasons = new Map();
    /** @type {!Array<!SDK.NetworkRequest.BlockedSetCookieWithReason>} */
    const malformedResponseCookies = [];

    if (this._request.responseCookies.length) {
      const blockedCookieLines = this._request.blockedResponseCookies().map(blockedCookie => blockedCookie.cookieLine);
      responseCookies = this._request.responseCookies.filter(cookie => {
        // remove the regular cookies that would overlap with blocked cookies
        const index = blockedCookieLines.indexOf(cookie.getCookieLine());
        if (index !== -1) {
          blockedCookieLines[index] = null;
          return false;
        }
        return true;
      });

      for (const blockedCookie of this._request.blockedResponseCookies()) {
        const parsedCookies = SDK.CookieParser.CookieParser.parseSetCookie(blockedCookie.cookieLine);
        if (!parsedCookies.length ||
            blockedCookie.blockedReasons.includes(Protocol.Network.SetCookieBlockedReason.SyntaxError)) {
          malformedResponseCookies.push(blockedCookie);
          continue;
        }

        const cookie = blockedCookie.cookie || parsedCookies[0];
        if (cookie) {
          responseCookieToBlockedReasons.set(cookie, blockedCookie.blockedReasons.map(blockedReason => {
            return {
              attribute: SDK.NetworkRequest.setCookieBlockedReasonToAttribute(blockedReason),
              uiString: SDK.NetworkRequest.setCookieBlockedReasonToUiString(blockedReason)
            };
          }));
          responseCookies.push(cookie);
        }
      }
    }

    return {responseCookies, responseCookieToBlockedReasons, malformedResponseCookies};
  }

  _refreshRequestCookiesView() {
    if (!this.isShowing()) {
      return;
    }

    const gotCookies = this._request.requestCookies.length || this._request.responseCookies.length;
    if (gotCookies) {
      this._emptyWidget.hideWidget();
    } else {
      this._emptyWidget.showWidget();
    }

    const {requestCookies, requestCookieToBlockedReasons} = this._getRequestCookies();
    const {responseCookies, responseCookieToBlockedReasons, malformedResponseCookies} = this._getResponseCookies();

    if (requestCookies.length) {
      this._requestCookiesTitle.classList.remove('hidden');
      this._requestCookiesEmpty.classList.add('hidden');
      this._requestCookiesTable.showWidget();
      this._requestCookiesTable.setCookies(requestCookies, requestCookieToBlockedReasons);

    } else if (this._request.blockedRequestCookies().length) {
      this._requestCookiesTitle.classList.remove('hidden');
      this._requestCookiesEmpty.classList.remove('hidden');
      this._requestCookiesTable.hideWidget();

    } else {
      this._requestCookiesTitle.classList.add('hidden');
      this._requestCookiesEmpty.classList.add('hidden');
      this._requestCookiesTable.hideWidget();
    }

    if (responseCookies.length) {
      this._responseCookiesTitle.classList.remove('hidden');
      this._responseCookiesTable.showWidget();
      this._responseCookiesTable.setCookies(responseCookies, responseCookieToBlockedReasons);
    } else {
      this._responseCookiesTitle.classList.add('hidden');
      this._responseCookiesTable.hideWidget();
    }

    if (malformedResponseCookies.length) {
      this._malformedResponseCookiesTitle.classList.remove('hidden');
      this._malformedResponseCookiesList.classList.remove('hidden');

      this._malformedResponseCookiesList.removeChildren();
      for (const malformedCookie of malformedResponseCookies) {
        const listItem = this._malformedResponseCookiesList.createChild('span', 'cookie-line source-code');
        const icon = UI.Icon.Icon.create('smallicon-error', 'cookie-warning-icon');
        listItem.appendChild(icon);
        listItem.createTextChild(malformedCookie.cookieLine);
        listItem.title =
            SDK.NetworkRequest.setCookieBlockedReasonToUiString(Protocol.Network.SetCookieBlockedReason.SyntaxError);
      }
    } else {
      this._malformedResponseCookiesTitle.classList.add('hidden');
      this._malformedResponseCookiesList.classList.add('hidden');
    }
  }

  /**
   * @override
   */
  wasShown() {
    this._request.addEventListener(
        SDK.NetworkRequest.Events.RequestHeadersChanged, this._refreshRequestCookiesView, this);
    this._request.addEventListener(
        SDK.NetworkRequest.Events.ResponseHeadersChanged, this._refreshRequestCookiesView, this);

    this._refreshRequestCookiesView();
  }

  /**
   * @override
   */
  willHide() {
    this._request.removeEventListener(
        SDK.NetworkRequest.Events.RequestHeadersChanged, this._refreshRequestCookiesView, this);
    this._request.removeEventListener(
        SDK.NetworkRequest.Events.ResponseHeadersChanged, this._refreshRequestCookiesView, this);
  }
}
