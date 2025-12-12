// Copyright 2011 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as uiI18n from '../../ui/i18n/i18n.js';
import * as CookieTable from '../../ui/legacy/components/cookie_table/cookie_table.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import requestCookiesViewStyles from './requestCookiesView.css.js';
const { render, html } = Lit;
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
export const DEFAULT_VIEW = (input, _output, target) => {
    // clang-format off
    render(html `
    <style>${requestCookiesViewStyles}</style>
    <style>${UI.inspectorCommonStyles}</style>
    <div class="request-cookies-view">
      ${input.gotCookies ? Lit.nothing : html `
        <devtools-widget .widgetConfig=${UI.Widget.widgetConfig(UI.EmptyWidget.EmptyWidget, {
        header: i18nString(UIStrings.thisRequestHasNoCookies)
    })}></devtools-widget>
      `}

      <div class=${input.requestCookies.cookies.length || input.hasBlockedCookies ? '' : 'hidden'}>
        <span class="request-cookies-title" title=${i18nString(UIStrings.cookiesThatWereSentToTheServerIn)}>
          ${i18nString(UIStrings.requestCookies)}
        </span>
        <devtools-checkbox
          @change=${(e) => input.onShowFilteredOutCookiesChange(e.target.checked)}
          .checked=${input.showFilteredOutCookies}>
          ${i18nString(UIStrings.showFilteredOutRequestCookies)}
        </devtools-checkbox>
      </div>

      <div class="cookies-panel-item ${!input.requestCookies.cookies.length && input.hasBlockedCookies ? '' : 'hidden'}">
        ${i18nString(UIStrings.noRequestCookiesWereSent)}
      </div>

      ${input.requestCookies.cookies.length > 0 ? html `
        <devtools-widget .widgetConfig=${UI.Widget.widgetConfig(CookieTable.CookiesTable.CookiesTable, {
        cookiesData: input.requestCookies,
        inline: true
    })} class="cookie-table cookies-panel-item"></devtools-widget>
      ` : Lit.nothing}

      <div class="cookies-panel-item site-has-cookies-in-other-partition ${input.siteHasCookieInOtherPartition ? '' : 'hidden'}">
        ${uiI18n.getFormatLocalizedString(str_, UIStrings.siteHasCookieInOtherPartition, {
        PH1: UI.XLink.XLink.create('https://developer.chrome.com/en/docs/privacy-sandbox/chips/', i18nString(UIStrings.learnMore), undefined, undefined, 'learn-more'),
    })}
      </div>

      <div class="request-cookies-title ${input.responseCookies.cookies.length ? '' : 'hidden'}"
        title=${i18nString(UIStrings.cookiesThatWereReceivedFromThe)}>
          ${i18nString(UIStrings.responseCookies)}
      </div>

      ${input.responseCookies.cookies.length ? html `
        <devtools-widget .widgetConfig=${UI.Widget.widgetConfig(CookieTable.CookiesTable.CookiesTable, {
        cookiesData: input.responseCookies,
        inline: true
    })} class="cookie-table cookies-panel-item"></devtools-widget>
      ` : Lit.nothing}

      <div class="request-cookies-title ${input.malformedResponseCookies.length ? '' : 'hidden'}" title=${i18nString(UIStrings.cookiesThatWereReceivedFromTheServer)}>
        ${i18nString(UIStrings.malformedResponseCookies)}
      </div>

      <div class=${input.malformedResponseCookies.length ? '' : 'hidden'}>
        ${input.malformedResponseCookies.map(malformedCookie => html `
          <span class="cookie-line source-code" title=${getMalformedCookieTooltip(malformedCookie)}>
            <devtools-icon class="cookie-warning-icon small" .name=${'cross-circle-filled'}></devtools-icon>
            ${malformedCookie.cookieLine}
          </span>
        `)}
      </div>
    </div>
  `, target);
    // clang-format on
};
function getMalformedCookieTooltip(malformedCookie) {
    if (malformedCookie.blockedReasons.includes("NameValuePairExceedsMaxSize" /* Protocol.Network.SetCookieBlockedReason.NameValuePairExceedsMaxSize */)) {
        return SDK.NetworkRequest.setCookieBlockedReasonToUiString("NameValuePairExceedsMaxSize" /* Protocol.Network.SetCookieBlockedReason.NameValuePairExceedsMaxSize */);
    }
    return SDK.NetworkRequest.setCookieBlockedReasonToUiString("SyntaxError" /* Protocol.Network.SetCookieBlockedReason.SyntaxError */);
}
export class RequestCookiesView extends UI.Widget.Widget {
    request;
    showFilteredOutCookiesSetting;
    view;
    constructor(request, view = DEFAULT_VIEW) {
        super({ jslog: `${VisualLogging.pane('cookies').track({ resize: true })}` });
        this.request = request;
        this.showFilteredOutCookiesSetting = Common.Settings.Settings.instance().createSetting('show-filtered-out-request-cookies', /* defaultValue */ false);
        this.view = view;
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
    performUpdate() {
        if (!this.isShowing()) {
            return;
        }
        const { requestCookies, requestCookieToBlockedReasons, requestCookieToExemptionReason } = this.getRequestCookies();
        const { responseCookies, responseCookieToBlockedReasons, responseCookieToExemptionReason, malformedResponseCookies } = this.getResponseCookies();
        const input = {
            gotCookies: this.request.hasRequestCookies() || this.request.responseCookies.length > 0,
            requestCookies: {
                cookies: requestCookies,
                cookieToBlockedReasons: requestCookieToBlockedReasons,
                cookieToExemptionReason: requestCookieToExemptionReason,
            },
            responseCookies: {
                cookies: responseCookies,
                cookieToBlockedReasons: responseCookieToBlockedReasons,
                cookieToExemptionReason: responseCookieToExemptionReason,
            },
            malformedResponseCookies,
            showFilteredOutCookies: this.showFilteredOutCookiesSetting.get(),
            onShowFilteredOutCookiesChange: (checked) => {
                this.showFilteredOutCookiesSetting.set(checked);
                this.requestUpdate();
            },
            siteHasCookieInOtherPartition: this.request.siteHasCookieInOtherPartition(),
            hasBlockedCookies: this.request.blockedRequestCookies().length > 0,
        };
        this.view(input, undefined, this.contentElement);
    }
    wasShown() {
        super.wasShown();
        this.request.addEventListener(SDK.NetworkRequest.Events.REQUEST_HEADERS_CHANGED, this.requestUpdate, this);
        this.request.addEventListener(SDK.NetworkRequest.Events.RESPONSE_HEADERS_CHANGED, this.requestUpdate, this);
        this.requestUpdate();
    }
    willHide() {
        super.willHide();
        this.request.removeEventListener(SDK.NetworkRequest.Events.REQUEST_HEADERS_CHANGED, this.requestUpdate, this);
        this.request.removeEventListener(SDK.NetworkRequest.Events.RESPONSE_HEADERS_CHANGED, this.requestUpdate, this);
    }
}
//# sourceMappingURL=RequestCookiesView.js.map