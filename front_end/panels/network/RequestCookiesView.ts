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

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as CookieTable from '../../ui/legacy/components/cookie_table/cookie_table.js';
import * as UI from '../../ui/legacy/legacy.js';

import requestCookiesViewStyles from './requestCookiesView.css.js';

const UIStrings = {
  /**
   *@description Text in Request Cookies View of the Network panel
   */
  thisRequestHasNoCookies: 'This request has no cookies.',
  /**
   * @description Title for a table which shows all of the cookies associated with a selected network
   * request, in the Network panel. Noun phrase.
   */
  requestCookies: 'Request Cookies',
  /**
   *@description Tooltip to explain what request cookies are
   */
  cookiesThatWereSentToTheServerIn: 'Cookies that were sent to the server in the \'cookie\' header of the request',
  /**
   *@description Label for showing request cookies that were not actually sent
   */
  showFilteredOutRequestCookies: 'show filtered out request cookies',
  /**
   *@description Text in Request Headers View of the Network Panel
   */
  noRequestCookiesWereSent: 'No request cookies were sent.',
  /**
   *@description Text in Request Cookies View of the Network panel
   */
  responseCookies: 'Response Cookies',
  /**
   *@description Tooltip to explain what response cookies are
   */
  cookiesThatWereReceivedFromThe:
      'Cookies that were received from the server in the \'`set-cookie`\' header of the response',
  /**
   *@description Label for response cookies with invalid syntax
   */
  malformedResponseCookies: 'Malformed Response Cookies',
  /**
   * @description Tooltip to explain what malformed response cookies are. Malformed cookies are
   * cookies that did not match the expected format and could not be interpreted, and are invalid.
   */
  cookiesThatWereReceivedFromTheServer:
      'Cookies that were received from the server in the \'`set-cookie`\' header of the response but were malformed',

  /**
   * @description Informational text to explain that there were other cookies
   * that were not used and not shown in the list.
   * @example {Learn more} PH1
   *
   */
  siteHasCookieInOtherPartition:
      'This site has cookies in another partition, that were not sent with this request. {PH1}',
  /**
   * @description Title of a link to the developer documentation.
   */
  learnMore: 'Learn more',
};
const str_ = i18n.i18n.registerUIStrings('panels/network/RequestCookiesView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class RequestCookiesView extends UI.Widget.Widget {
  private request: SDK.NetworkRequest.NetworkRequest;
  private readonly showFilteredOutCookiesSetting: Common.Settings.Setting<boolean>;
  private readonly emptyWidget: UI.EmptyWidget.EmptyWidget;
  private readonly requestCookiesTitle: HTMLElement;
  private readonly requestCookiesEmpty: HTMLElement;
  private readonly requestCookiesTable: CookieTable.CookiesTable.CookiesTable;
  private readonly responseCookiesTitle: HTMLElement;
  private readonly responseCookiesTable: CookieTable.CookiesTable.CookiesTable;
  private readonly siteHasCookieInOtherPartition: HTMLElement;
  private readonly malformedResponseCookiesTitle: HTMLElement;
  private readonly malformedResponseCookiesList: HTMLElement;

  constructor(request: SDK.NetworkRequest.NetworkRequest) {
    super();

    this.element.classList.add('request-cookies-view');

    this.request = request;
    this.showFilteredOutCookiesSetting = Common.Settings.Settings.instance().createSetting(
        'show-filtered-out-request-cookies', /* defaultValue */ false);

    this.emptyWidget = new UI.EmptyWidget.EmptyWidget(i18nString(UIStrings.thisRequestHasNoCookies));
    this.emptyWidget.show(this.element);

    this.requestCookiesTitle = this.element.createChild('div');
    const titleText = this.requestCookiesTitle.createChild('span', 'request-cookies-title');
    titleText.textContent = i18nString(UIStrings.requestCookies);
    UI.Tooltip.Tooltip.install(titleText, i18nString(UIStrings.cookiesThatWereSentToTheServerIn));

    const requestCookiesCheckbox =
        (UI.SettingsUI.createSettingCheckbox(
             i18nString(UIStrings.showFilteredOutRequestCookies), this.showFilteredOutCookiesSetting, true) as
         UI.UIUtils.CheckboxLabel);
    requestCookiesCheckbox.checkboxElement.addEventListener('change', () => {
      this.refreshRequestCookiesView();
    });
    this.requestCookiesTitle.appendChild(requestCookiesCheckbox);

    this.requestCookiesEmpty = this.element.createChild('div', 'cookies-panel-item');
    this.requestCookiesEmpty.textContent = i18nString(UIStrings.noRequestCookiesWereSent);

    this.requestCookiesTable = new CookieTable.CookiesTable.CookiesTable(/* renderInline */ true);
    this.requestCookiesTable.contentElement.classList.add('cookie-table', 'cookies-panel-item');
    this.requestCookiesTable.show(this.element);

    this.siteHasCookieInOtherPartition =
        this.element.createChild('div', 'cookies-panel-item site-has-cookies-in-other-partition');
    this.siteHasCookieInOtherPartition.appendChild(
        i18n.i18n.getFormatLocalizedString(str_, UIStrings.siteHasCookieInOtherPartition, {
          PH1: UI.XLink.XLink.create(
              'https://developer.chrome.com/en/docs/privacy-sandbox/chips/', i18nString(UIStrings.learnMore)),
        }));

    this.responseCookiesTitle = this.element.createChild('div', 'request-cookies-title');
    this.responseCookiesTitle.textContent = i18nString(UIStrings.responseCookies);
    this.responseCookiesTitle.title = i18nString(UIStrings.cookiesThatWereReceivedFromThe);

    this.responseCookiesTable = new CookieTable.CookiesTable.CookiesTable(/* renderInline */ true);
    this.responseCookiesTable.contentElement.classList.add('cookie-table', 'cookies-panel-item');
    this.responseCookiesTable.show(this.element);

    this.malformedResponseCookiesTitle = this.element.createChild('div', 'request-cookies-title');
    this.malformedResponseCookiesTitle.textContent = i18nString(UIStrings.malformedResponseCookies);
    UI.Tooltip.Tooltip.install(
        this.malformedResponseCookiesTitle, i18nString(UIStrings.cookiesThatWereReceivedFromTheServer));

    this.malformedResponseCookiesList = this.element.createChild('div');
  }

  private getRequestCookies(): {
    requestCookies: Array<SDK.Cookie.Cookie>,
    requestCookieToBlockedReasons: Map<SDK.Cookie.Cookie, SDK.CookieModel.BlockedReason[]>,
  } {
    const requestCookieToBlockedReasons = new Map<SDK.Cookie.Cookie, SDK.CookieModel.BlockedReason[]>();
    const requestCookies = this.request.includedRequestCookies().slice();

    if (this.showFilteredOutCookiesSetting.get()) {
      for (const blockedCookie of this.request.blockedRequestCookies()) {
        requestCookieToBlockedReasons.set(blockedCookie.cookie, blockedCookie.blockedReasons.map(blockedReason => {
          return {
            attribute: SDK.NetworkRequest.cookieBlockedReasonToAttribute(blockedReason),
            uiString: SDK.NetworkRequest.cookieBlockedReasonToUiString(blockedReason),
          };
        }));
        requestCookies.push(blockedCookie.cookie);
      }
    }

    return {requestCookies, requestCookieToBlockedReasons};
  }

  private getResponseCookies(): {
    responseCookies: Array<SDK.Cookie.Cookie>,
    responseCookieToBlockedReasons: Map<SDK.Cookie.Cookie, Array<SDK.CookieModel.BlockedReason>>,
    malformedResponseCookies: Array<SDK.NetworkRequest.BlockedSetCookieWithReason>,
  } {
    let responseCookies: SDK.Cookie.Cookie[] = [];
    const responseCookieToBlockedReasons = new Map<SDK.Cookie.Cookie, SDK.CookieModel.BlockedReason[]>();
    const malformedResponseCookies: SDK.NetworkRequest.BlockedSetCookieWithReason[] = [];

    if (this.request.responseCookies.length) {
      const blockedCookieLines: (string|null)[] =
          this.request.blockedResponseCookies().map(blockedCookie => blockedCookie.cookieLine);
      responseCookies = this.request.responseCookies.filter(cookie => {
        // remove the regular cookies that would overlap with blocked cookies
        const index = blockedCookieLines.indexOf(cookie.getCookieLine());
        if (index !== -1) {
          blockedCookieLines[index] = null;
          return false;
        }
        return true;
      });

      for (const blockedCookie of this.request.blockedResponseCookies()) {
        const parsedCookies = SDK.CookieParser.CookieParser.parseSetCookie(blockedCookie.cookieLine);
        if ((parsedCookies && !parsedCookies.length) ||
            blockedCookie.blockedReasons.includes(Protocol.Network.SetCookieBlockedReason.SyntaxError) ||
            blockedCookie.blockedReasons.includes(
                Protocol.Network.SetCookieBlockedReason.NameValuePairExceedsMaxSize)) {
          malformedResponseCookies.push(blockedCookie);
          continue;
        }

        let cookie: SDK.Cookie.Cookie|(SDK.Cookie.Cookie | null) = blockedCookie.cookie;
        if (!cookie && parsedCookies) {
          cookie = parsedCookies[0];
        }
        if (cookie) {
          responseCookieToBlockedReasons.set(cookie, blockedCookie.blockedReasons.map(blockedReason => {
            return {
              attribute: SDK.NetworkRequest.setCookieBlockedReasonToAttribute(blockedReason),
              uiString: SDK.NetworkRequest.setCookieBlockedReasonToUiString(blockedReason),
            };
          }));
          responseCookies.push(cookie);
        }
      }
    }

    return {responseCookies, responseCookieToBlockedReasons, malformedResponseCookies};
  }

  private refreshRequestCookiesView(): void {
    if (!this.isShowing()) {
      return;
    }

    const gotCookies = this.request.hasRequestCookies() || this.request.responseCookies.length;
    if (gotCookies) {
      this.emptyWidget.hideWidget();
    } else {
      this.emptyWidget.showWidget();
    }

    const {requestCookies, requestCookieToBlockedReasons} = this.getRequestCookies();
    const {responseCookies, responseCookieToBlockedReasons, malformedResponseCookies} = this.getResponseCookies();

    if (requestCookies.length) {
      this.requestCookiesTitle.classList.remove('hidden');
      this.requestCookiesEmpty.classList.add('hidden');
      this.requestCookiesTable.showWidget();
      this.requestCookiesTable.setCookies(requestCookies, requestCookieToBlockedReasons);

    } else if (this.request.blockedRequestCookies().length) {
      this.requestCookiesTitle.classList.remove('hidden');
      this.requestCookiesEmpty.classList.remove('hidden');
      this.requestCookiesTable.hideWidget();

    } else {
      this.requestCookiesTitle.classList.add('hidden');
      this.requestCookiesEmpty.classList.add('hidden');
      this.requestCookiesTable.hideWidget();
    }

    if (responseCookies.length) {
      this.responseCookiesTitle.classList.remove('hidden');
      this.responseCookiesTable.showWidget();
      this.responseCookiesTable.setCookies(responseCookies, responseCookieToBlockedReasons);
    } else {
      this.responseCookiesTitle.classList.add('hidden');
      this.responseCookiesTable.hideWidget();
    }

    if (malformedResponseCookies.length) {
      this.malformedResponseCookiesTitle.classList.remove('hidden');
      this.malformedResponseCookiesList.classList.remove('hidden');

      this.malformedResponseCookiesList.removeChildren();
      for (const malformedCookie of malformedResponseCookies) {
        const listItem = this.malformedResponseCookiesList.createChild('span', 'cookie-line source-code');
        const icon = UI.Icon.Icon.create('smallicon-error', 'cookie-warning-icon');
        listItem.appendChild(icon);
        UI.UIUtils.createTextChild(listItem, malformedCookie.cookieLine);

        if (malformedCookie.blockedReasons.includes(
                Protocol.Network.SetCookieBlockedReason.NameValuePairExceedsMaxSize)) {
          listItem.title = SDK.NetworkRequest.setCookieBlockedReasonToUiString(
              Protocol.Network.SetCookieBlockedReason.NameValuePairExceedsMaxSize);
        } else {
          listItem.title =
              SDK.NetworkRequest.setCookieBlockedReasonToUiString(Protocol.Network.SetCookieBlockedReason.SyntaxError);
        }
      }
    } else {
      this.malformedResponseCookiesTitle.classList.add('hidden');
      this.malformedResponseCookiesList.classList.add('hidden');
    }

    if (this.request.siteHasCookieInOtherPartition()) {
      this.siteHasCookieInOtherPartition.classList.remove('hidden');
    } else {
      this.siteHasCookieInOtherPartition.classList.add('hidden');
    }
  }

  wasShown(): void {
    super.wasShown();
    this.registerCSSFiles([requestCookiesViewStyles]);
    this.request.addEventListener(
        SDK.NetworkRequest.Events.RequestHeadersChanged, this.refreshRequestCookiesView, this);
    this.request.addEventListener(
        SDK.NetworkRequest.Events.ResponseHeadersChanged, this.refreshRequestCookiesView, this);

    this.refreshRequestCookiesView();
  }

  willHide(): void {
    this.request.removeEventListener(
        SDK.NetworkRequest.Events.RequestHeadersChanged, this.refreshRequestCookiesView, this);
    this.request.removeEventListener(
        SDK.NetworkRequest.Events.ResponseHeadersChanged, this.refreshRequestCookiesView, this);
  }
}
