// Copyright 2011 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as uiI18n from '../../ui/i18n/i18n.js';
import { Icon } from '../../ui/kit/kit.js';
import * as CookieTable from '../../ui/legacy/components/cookie_table/cookie_table.js';
import * as SettingsUI from '../../ui/legacy/components/settings_ui/settings_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import requestCookiesViewStyles from './requestCookiesView.css.js';
const UIStrings = {
    /**
     * @description Text in Request Cookies View of the Network panel
     */
    thisRequestHasNoCookies: 'This request has no cookies.',
    /**
     * @description Title for a table which shows all of the cookies associated with a selected network
     * request, in the Network panel. Noun phrase.
     */
    requestCookies: 'Request Cookies',
    /**
     * @description Tooltip to explain what request cookies are
     */
    cookiesThatWereSentToTheServerIn: 'Cookies that were sent to the server in the \'cookie\' header of the request',
    /**
     * @description Label for showing request cookies that were not actually sent
     */
    showFilteredOutRequestCookies: 'show filtered out request cookies',
    /**
     * @description Text in Request Headers View of the Network Panel
     */
    noRequestCookiesWereSent: 'No request cookies were sent.',
    /**
     * @description Text in Request Cookies View of the Network panel
     */
    responseCookies: 'Response Cookies',
    /**
     * @description Tooltip to explain what response cookies are
     */
    cookiesThatWereReceivedFromThe: 'Cookies that were received from the server in the \'`set-cookie`\' header of the response',
    /**
     * @description Label for response cookies with invalid syntax
     */
    malformedResponseCookies: 'Malformed Response Cookies',
    /**
     * @description Tooltip to explain what malformed response cookies are. Malformed cookies are
     * cookies that did not match the expected format and could not be interpreted, and are invalid.
     */
    cookiesThatWereReceivedFromTheServer: 'Cookies that were received from the server in the \'`set-cookie`\' header of the response but were malformed',
    /**
     * @description Informational text to explain that there were other cookies
     * that were not used and not shown in the list.
     * @example {Learn more} PH1
     *
     */
    siteHasCookieInOtherPartition: 'This site has cookies in another partition, that were not sent with this request. {PH1}',
    /**
     * @description Title of a link to the developer documentation.
     */
    learnMore: 'Learn more',
};
const str_ = i18n.i18n.registerUIStrings('panels/network/RequestCookiesView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class RequestCookiesView extends UI.Widget.Widget {
    request;
    showFilteredOutCookiesSetting;
    emptyWidget;
    requestCookiesTitle;
    requestCookiesEmpty;
    requestCookiesTable;
    responseCookiesTitle;
    responseCookiesTable;
    siteHasCookieInOtherPartition;
    malformedResponseCookiesTitle;
    malformedResponseCookiesList;
    constructor(request) {
        super({ jslog: `${VisualLogging.pane('cookies').track({ resize: true })}` });
        this.registerRequiredCSS(requestCookiesViewStyles);
        this.element.classList.add('request-cookies-view');
        this.request = request;
        this.showFilteredOutCookiesSetting = Common.Settings.Settings.instance().createSetting('show-filtered-out-request-cookies', /* defaultValue */ false);
        this.emptyWidget = new UI.EmptyWidget.EmptyWidget(i18nString(UIStrings.thisRequestHasNoCookies), '');
        this.emptyWidget.show(this.element);
        this.requestCookiesTitle = this.element.createChild('div');
        const titleText = this.requestCookiesTitle.createChild('span', 'request-cookies-title');
        titleText.textContent = i18nString(UIStrings.requestCookies);
        UI.Tooltip.Tooltip.install(titleText, i18nString(UIStrings.cookiesThatWereSentToTheServerIn));
        const requestCookiesCheckbox = SettingsUI.SettingsUI.createSettingCheckbox(i18nString(UIStrings.showFilteredOutRequestCookies), this.showFilteredOutCookiesSetting);
        requestCookiesCheckbox.addEventListener('change', () => {
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
        this.siteHasCookieInOtherPartition.appendChild(uiI18n.getFormatLocalizedString(str_, UIStrings.siteHasCookieInOtherPartition, {
            PH1: UI.XLink.XLink.create('https://developer.chrome.com/en/docs/privacy-sandbox/chips/', i18nString(UIStrings.learnMore), undefined, undefined, 'learn-more'),
        }));
        this.responseCookiesTitle = this.element.createChild('div', 'request-cookies-title');
        this.responseCookiesTitle.textContent = i18nString(UIStrings.responseCookies);
        this.responseCookiesTitle.title = i18nString(UIStrings.cookiesThatWereReceivedFromThe);
        this.responseCookiesTable = new CookieTable.CookiesTable.CookiesTable(/* renderInline */ true);
        this.responseCookiesTable.contentElement.classList.add('cookie-table', 'cookies-panel-item');
        this.responseCookiesTable.show(this.element);
        this.malformedResponseCookiesTitle = this.element.createChild('div', 'request-cookies-title');
        this.malformedResponseCookiesTitle.textContent = i18nString(UIStrings.malformedResponseCookies);
        UI.Tooltip.Tooltip.install(this.malformedResponseCookiesTitle, i18nString(UIStrings.cookiesThatWereReceivedFromTheServer));
        this.malformedResponseCookiesList = this.element.createChild('div');
    }
    getRequestCookies() {
        const requestCookieToBlockedReasons = new Map();
        const requestCookieToExemptionReason = new Map();
        const requestCookies = this.request.includedRequestCookies().map(includedRequestCookie => includedRequestCookie.cookie);
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
        for (const includedCookie of this.request.includedRequestCookies()) {
            if (includedCookie.exemptionReason) {
                requestCookieToExemptionReason.set(includedCookie.cookie, {
                    uiString: SDK.NetworkRequest.cookieExemptionReasonToUiString(includedCookie.exemptionReason),
                });
            }
        }
        return { requestCookies, requestCookieToBlockedReasons, requestCookieToExemptionReason };
    }
    getResponseCookies() {
        let responseCookies = [];
        const responseCookieToBlockedReasons = new Map();
        const responseCookieToExemptionReason = new Map();
        const malformedResponseCookies = [];
        if (this.request.responseCookies.length) {
            responseCookies = this.request.nonBlockedResponseCookies();
            for (const blockedCookie of this.request.blockedResponseCookies()) {
                const parsedCookies = SDK.CookieParser.CookieParser.parseSetCookie(blockedCookie.cookieLine);
                if ((parsedCookies && !parsedCookies.length) ||
                    blockedCookie.blockedReasons.includes("SyntaxError" /* Protocol.Network.SetCookieBlockedReason.SyntaxError */) ||
                    blockedCookie.blockedReasons.includes("NameValuePairExceedsMaxSize" /* Protocol.Network.SetCookieBlockedReason.NameValuePairExceedsMaxSize */)) {
                    malformedResponseCookies.push(blockedCookie);
                    continue;
                }
                let cookie = blockedCookie.cookie;
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
            for (const exemptedCookie of this.request.exemptedResponseCookies()) {
                // `responseCookies` are generated from `Set-Cookie` header, which should include the exempted cookies, whereas
                // exempted cookies are received via CDP as objects of type cookie. Therefore they are different objects in
                // DevTools and need to be matched here in order for the rendering logic to be able to lookup a potential
                // exemption reason for a cookie.
                const matchedResponseCookie = responseCookies.find(responseCookie => exemptedCookie.cookieLine === responseCookie.getCookieLine());
                if (matchedResponseCookie) {
                    responseCookieToExemptionReason.set(matchedResponseCookie, {
                        uiString: SDK.NetworkRequest.cookieExemptionReasonToUiString(exemptedCookie.exemptionReason),
                    });
                }
            }
        }
        return { responseCookies, responseCookieToBlockedReasons, responseCookieToExemptionReason, malformedResponseCookies };
    }
    refreshRequestCookiesView() {
        if (!this.isShowing()) {
            return;
        }
        const gotCookies = this.request.hasRequestCookies() || this.request.responseCookies.length;
        if (gotCookies) {
            this.emptyWidget.hideWidget();
        }
        else {
            this.emptyWidget.showWidget();
        }
        const { requestCookies, requestCookieToBlockedReasons, requestCookieToExemptionReason } = this.getRequestCookies();
        const { responseCookies, responseCookieToBlockedReasons, responseCookieToExemptionReason, malformedResponseCookies } = this.getResponseCookies();
        if (requestCookies.length) {
            this.requestCookiesTitle.classList.remove('hidden');
            this.requestCookiesEmpty.classList.add('hidden');
            this.requestCookiesTable.showWidget();
            this.requestCookiesTable.setCookies(requestCookies, requestCookieToBlockedReasons, requestCookieToExemptionReason);
        }
        else if (this.request.blockedRequestCookies().length) {
            this.requestCookiesTitle.classList.remove('hidden');
            this.requestCookiesEmpty.classList.remove('hidden');
            this.requestCookiesTable.hideWidget();
        }
        else {
            this.requestCookiesTitle.classList.add('hidden');
            this.requestCookiesEmpty.classList.add('hidden');
            this.requestCookiesTable.hideWidget();
        }
        if (responseCookies.length) {
            this.responseCookiesTitle.classList.remove('hidden');
            this.responseCookiesTable.showWidget();
            this.responseCookiesTable.setCookies(responseCookies, responseCookieToBlockedReasons, responseCookieToExemptionReason);
        }
        else {
            this.responseCookiesTitle.classList.add('hidden');
            this.responseCookiesTable.hideWidget();
        }
        if (malformedResponseCookies.length) {
            this.malformedResponseCookiesTitle.classList.remove('hidden');
            this.malformedResponseCookiesList.classList.remove('hidden');
            this.malformedResponseCookiesList.removeChildren();
            for (const malformedCookie of malformedResponseCookies) {
                const listItem = this.malformedResponseCookiesList.createChild('span', 'cookie-line source-code');
                const icon = new Icon();
                icon.name = 'cross-circle-filled';
                icon.classList.add('cookie-warning-icon', 'small');
                listItem.appendChild(icon);
                UI.UIUtils.createTextChild(listItem, malformedCookie.cookieLine);
                if (malformedCookie.blockedReasons.includes("NameValuePairExceedsMaxSize" /* Protocol.Network.SetCookieBlockedReason.NameValuePairExceedsMaxSize */)) {
                    listItem.title = SDK.NetworkRequest.setCookieBlockedReasonToUiString("NameValuePairExceedsMaxSize" /* Protocol.Network.SetCookieBlockedReason.NameValuePairExceedsMaxSize */);
                }
                else {
                    listItem.title =
                        SDK.NetworkRequest.setCookieBlockedReasonToUiString("SyntaxError" /* Protocol.Network.SetCookieBlockedReason.SyntaxError */);
                }
            }
        }
        else {
            this.malformedResponseCookiesTitle.classList.add('hidden');
            this.malformedResponseCookiesList.classList.add('hidden');
        }
        if (this.request.siteHasCookieInOtherPartition()) {
            this.siteHasCookieInOtherPartition.classList.remove('hidden');
        }
        else {
            this.siteHasCookieInOtherPartition.classList.add('hidden');
        }
    }
    wasShown() {
        super.wasShown();
        this.request.addEventListener(SDK.NetworkRequest.Events.REQUEST_HEADERS_CHANGED, this.refreshRequestCookiesView, this);
        this.request.addEventListener(SDK.NetworkRequest.Events.RESPONSE_HEADERS_CHANGED, this.refreshRequestCookiesView, this);
        this.refreshRequestCookiesView();
    }
    willHide() {
        super.willHide();
        this.request.removeEventListener(SDK.NetworkRequest.Events.REQUEST_HEADERS_CHANGED, this.refreshRequestCookiesView, this);
        this.request.removeEventListener(SDK.NetworkRequest.Events.RESPONSE_HEADERS_CHANGED, this.refreshRequestCookiesView, this);
    }
}
//# sourceMappingURL=RequestCookiesView.js.map