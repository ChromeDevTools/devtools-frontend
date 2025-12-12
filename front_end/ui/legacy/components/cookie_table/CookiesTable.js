// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
/* eslint-disable @devtools/no-lit-render-outside-of-view */
/*
 * Copyright (C) 2009 Apple Inc.  All rights reserved.
 * Copyright (C) 2009 Joseph Pecoraro
 * Copyright (C) 2010 Google Inc. All rights reserved.
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
import '../data_grid/data_grid.js';
import * as Common from '../../../../core/common/common.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import * as Root from '../../../../core/root/root.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import * as IssuesManager from '../../../../models/issues_manager/issues_manager.js';
import * as NetworkForward from '../../../../panels/network/forward/forward.js';
import { Icon } from '../../../kit/kit.js';
import { Directives, html, render } from '../../../lit/lit.js';
import * as UI from '../../legacy.js';
import cookiesTableStyles from './cookiesTable.css.js';
const { repeat, ifDefined } = Directives;
const UIStrings = {
    /**
     * @description Cookie table cookies table expires session value in Cookies Table of the Cookies table in the Application panel
     */
    session: 'Session',
    /**
     * @description Text for the name of something
     */
    name: 'Name',
    /**
     * @description Text for the value of something
     */
    value: 'Value',
    /**
     * @description Text for the size of something
     */
    size: 'Size',
    /**
     * @description Text for the "Domain" of the cookie
     * https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie#domaindomain-value
     */
    domain: 'Domain',
    /**
     * @description Text for the "Path" of the cookie
     * https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie#pathpath-value
     */
    path: 'Path',
    /**
     * @description Text for the "Secure" property of the cookie
     * https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie#secure
     */
    secure: 'Secure',
    /**
     * @description Text for the "Partition Key Site" property of the cookie
     * https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie#partitioned
     */
    partitionKeySite: 'Partition Key Site',
    /**
     * @description Text for the "Priority" property of the cookie
     * Contains Low, Medium (default), or High if using deprecated cookie Priority attribute.
     * https://bugs.chromium.org/p/chromium/issues/detail?id=232693
     */
    priority: 'Priority',
    /**
     * @description Data grid name for Editable Cookies data grid
     */
    editableCookies: 'Editable Cookies',
    /**
     * @description Text for web cookies
     */
    cookies: 'Cookies',
    /**
     * @description Text for something not available
     */
    na: 'N/A',
    /**
     * @description Text for Context Menu entry
     */
    showRequestsWithThisCookie: 'Show requests with this cookie',
    /**
     * @description Text for Context Menu entry
     */
    showIssueAssociatedWithThis: 'Show issue associated with this cookie',
    /**
     * @description Tooltip for the cell that shows the sourcePort property of a cookie in the cookie table. The source port is numberic attribute of a cookie.
     */
    sourcePortTooltip: 'Shows the source port (range 1-65535) the cookie was set on. If the port is unknown, this shows -1.',
    /**
     * @description Tooltip for the cell that shows the sourceScheme property of a cookie in the cookie table. The source scheme is a trinary attribute of a cookie.
     */
    sourceSchemeTooltip: 'Shows the source scheme (`Secure`, `NonSecure`) the cookie was set on. If the scheme is unknown, this shows `Unset`.',
    /**
     * @description Text for the date column displayed if the expiration time of the cookie is extremely far out in the future.
     * @example {+275760-09-13T00:00:00.000Z} date
     */
    timeAfter: 'after {date}',
    /**
     * @description Tooltip for the date column displayed if the expiration time of the cookie is extremely far out in the future.
     * @example {+275760-09-13T00:00:00.000Z} date
     * @example {9001628746521180} seconds
     */
    timeAfterTooltip: 'The expiration timestamp is {seconds}, which corresponds to a date after {date}',
    /**
     * @description Text to be show in the Partition Key column in case it is an opaque origin.
     */
    opaquePartitionKey: '(opaque)',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/cookie_table/CookiesTable.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);
const expiresSessionValue = i18nLazyString(UIStrings.session);
export class CookiesTable extends UI.Widget.VBox {
    saveCallback;
    refreshCallback;
    selectedCallback;
    deleteCallback;
    lastEditedColumnId;
    data = [];
    cookies = [];
    cookieDomain;
    cookieToBlockedReasons;
    cookieToExemptionReason;
    view;
    selectedKey;
    editable;
    renderInline;
    schemeBindingEnabled;
    portBindingEnabled;
    constructor(element, renderInline, saveCallback, refreshCallback, selectedCallback, deleteCallback, view) {
        super(element);
        if (!view) {
            view = (input, _, target) => {
                // clang-format off
                render(html `
          <devtools-data-grid
               name=${input.editable ? i18nString(UIStrings.editableCookies) : i18nString(UIStrings.cookies)}
               id="cookies-table"
               striped
               ?inline=${input.renderInline}
               @create=${(e) => input.onCreate(e.detail)}
               @refresh=${input.onRefresh}
               @deselect=${() => input.onSelect(undefined)}
          >
            <table>
               <tr>
                 <th id=${"name" /* SDK.Cookie.Attribute.NAME */} sortable ?disclosure=${input.editable} ?editable=${input.editable} long weight="24">
                   ${i18nString(UIStrings.name)}
                 </th>
                 <th id=${"value" /* SDK.Cookie.Attribute.VALUE */} sortable ?editable=${input.editable} long weight="34">
                   ${i18nString(UIStrings.value)}
                 </th>
                 <th id=${"domain" /* SDK.Cookie.Attribute.DOMAIN */} sortable weight="7" ?editable=${input.editable}>
                   ${i18nString(UIStrings.domain)}
                 </th>
                 <th id=${"path" /* SDK.Cookie.Attribute.PATH */} sortable weight="7" ?editable=${input.editable}>
                   ${i18nString(UIStrings.path)}
                 </th>
                 <th id=${"expires" /* SDK.Cookie.Attribute.EXPIRES */} sortable weight="7" ?editable=${input.editable}>
                   Expires / Max-Age
                 </th>
                 <th id=${"size" /* SDK.Cookie.Attribute.SIZE */} sortable align="right" weight="7">
                   ${i18nString(UIStrings.size)}
                 </th>
                 <th id=${"http-only" /* SDK.Cookie.Attribute.HTTP_ONLY */} sortable align="center" weight="7" ?editable=${input.editable} type="boolean">
                   HttpOnly
                 </th>
                 <th id=${"secure" /* SDK.Cookie.Attribute.SECURE */} sortable align="center" weight="7" ?editable=${input.editable} type="boolean">
                   ${i18nString(UIStrings.secure)}
                 </th>
                 <th id=${"same-site" /* SDK.Cookie.Attribute.SAME_SITE */} sortable weight="7" ?editable=${input.editable}>
                   SameSite
                 </th>
                 <th id=${"partition-key-site" /* SDK.Cookie.Attribute.PARTITION_KEY_SITE */} sortable weight="7" ?editable=${input.editable}>
                   ${i18nString(UIStrings.partitionKeySite)}
                 </th>
                 <th id=${"has-cross-site-ancestor" /* SDK.Cookie.Attribute.HAS_CROSS_SITE_ANCESTOR */} sortable align="center" weight="7" ?editable=${input.editable} type="boolean">
                   Cross Site
                 </th>
                 <th id=${"priority" /* SDK.Cookie.Attribute.PRIORITY */} sortable weight="7" ?editable=${input.editable}>
                   ${i18nString(UIStrings.priority)}
                 </th>
                 ${input.schemeBindingEnabled ? html `
                 <th id=${"source-scheme" /* SDK.Cookie.Attribute.SOURCE_SCHEME */} sortable align="center" weight="7" ?editable=${input.editable} type="string">
                   SourceScheme
                 </th>` : ''}
                 ${input.portBindingEnabled ? html `
                <th id=${"source-port" /* SDK.Cookie.Attribute.SOURCE_PORT */} sortable align="center" weight="7" ?editable=${input.editable} type="number">
                   SourcePort
                </th>` : ''}
              </tr>
              ${repeat(this.data, cookie => cookie.key, cookie => html `
                <tr ?selected=${cookie.key === input.selectedKey}
                    ?inactive=${cookie.inactive}
                    ?dirty=${cookie.dirty}
                    ?highlighted=${cookie.flagged}
                    @edit=${(e) => input.onEdit(cookie, e.detail.columnId, e.detail.valueBeforeEditing, e.detail.newText)}
                    @delete=${() => input.onDelete(cookie)}
                    @contextmenu=${(e) => input.onContextMenu(cookie, e.detail)}
                    @select=${() => input.onSelect(cookie.key)}>
                  <td>${cookie.icons?.name}${cookie.name}</td>
                  <td>${cookie.value}</td>
                  <td>${cookie.icons?.domain}${cookie.domain}</td>
                  <td>${cookie.icons?.path}${cookie.path}</td>
                  <td title=${ifDefined(cookie.expiresTooltip)}>${cookie.expires}</td>
                  <td>${cookie.size}</td>
                  <td data-value=${Boolean(cookie['http-only'])}></td>
                  <td data-value=${Boolean(cookie.secure)}>${cookie.icons?.secure}</td>
                  <td>${cookie.icons?.['same-site']}${cookie['same-site']}</td>
                  <td>${cookie['partition-key-site']}</td>
                  <td data-value=${Boolean(cookie['has-cross-site-ancestor'])}></td>
                  <td data-value=${ifDefined(cookie.priorityValue)}>${cookie.priority}</td>
                  ${input.schemeBindingEnabled ? html `
                    <td title=${i18nString(UIStrings.sourceSchemeTooltip)}>${cookie['source-scheme']}</td>` : ''}
                  ${input.portBindingEnabled ? html `
                    <td title=${i18nString(UIStrings.sourcePortTooltip)}>${cookie['source-port']}</td>` : ''}
                </tr>`)}
                ${input.editable ? html `<tr placeholder><tr>` : ''}
              </table>
            </devtools-data-grid>`, target, { host: target });
                // clang-format on
            };
        }
        this.registerRequiredCSS(cookiesTableStyles);
        this.element.classList.add('cookies-table');
        this.saveCallback = saveCallback;
        this.refreshCallback = refreshCallback;
        this.deleteCallback = deleteCallback;
        this.editable = Boolean(saveCallback);
        const { devToolsEnableOriginBoundCookies } = Root.Runtime.hostConfig;
        this.schemeBindingEnabled = Boolean(devToolsEnableOriginBoundCookies?.schemeBindingEnabled);
        this.portBindingEnabled = Boolean(devToolsEnableOriginBoundCookies?.portBindingEnabled);
        this.view = view;
        this.renderInline = Boolean(renderInline);
        this.selectedCallback = selectedCallback;
        this.lastEditedColumnId = null;
        this.data = [];
        this.cookieDomain = '';
        this.cookieToBlockedReasons = null;
        this.cookieToExemptionReason = null;
        this.requestUpdate();
    }
    set cookiesData(data) {
        this.setCookies(data.cookies, data.cookieToBlockedReasons, data.cookieToExemptionReason);
    }
    set inline(value) {
        this.renderInline = value;
        this.requestUpdate();
    }
    setCookies(cookies, cookieToBlockedReasons, cookieToExemptionReason) {
        this.cookieToBlockedReasons = cookieToBlockedReasons || null;
        this.cookieToExemptionReason = cookieToExemptionReason || null;
        this.cookies = cookies;
        const selectedData = this.data.find(data => data.key === this.selectedKey);
        const selectedCookie = this.cookies.find(cookie => cookie.key() === this.selectedKey);
        this.data = cookies.sort((c1, c2) => c1.name().localeCompare(c2.name())).map(this.createCookieData.bind(this));
        if (selectedData && this.lastEditedColumnId && !selectedCookie) {
            selectedData.inactive = true;
            this.data.push(selectedData);
        }
        this.requestUpdate();
    }
    setCookieDomain(cookieDomain) {
        this.cookieDomain = cookieDomain;
    }
    selectedCookie() {
        return this.cookies.find(cookie => cookie.key() === this.selectedKey) || null;
    }
    willHide() {
        super.willHide();
        this.lastEditedColumnId = null;
    }
    performUpdate() {
        const input = {
            data: this.data,
            selectedKey: this.selectedKey,
            editable: this.editable,
            renderInline: this.renderInline,
            schemeBindingEnabled: this.schemeBindingEnabled,
            portBindingEnabled: this.portBindingEnabled,
            onEdit: this.onUpdateCookie.bind(this),
            onCreate: this.onCreateCookie.bind(this),
            onRefresh: this.refresh.bind(this),
            onDelete: this.onDeleteCookie.bind(this),
            onSelect: this.onSelect.bind(this),
            onContextMenu: this.populateContextMenu.bind(this),
        };
        const output = {};
        this.view(input, output, this.element);
    }
    onSelect(key) {
        this.selectedKey = key;
        this.selectedCallback?.();
    }
    onDeleteCookie(data) {
        const cookie = this.cookies.find(cookie => cookie.key() === data.key);
        if (cookie && this.deleteCallback) {
            this.deleteCallback(cookie, () => this.refresh());
        }
    }
    onUpdateCookie(oldData, columnIdentifier, _oldText, newText) {
        const oldCookie = this.cookies.find(cookie => cookie.key() === oldData.key);
        if (!oldCookie) {
            return;
        }
        const newCookieData = { ...oldData, [columnIdentifier]: newText };
        if (!this.isValidCookieData(newCookieData)) {
            newCookieData.dirty = true;
            this.requestUpdate();
            return;
        }
        this.lastEditedColumnId = columnIdentifier;
        this.saveCookie(newCookieData, oldCookie);
    }
    onCreateCookie(data) {
        this.setDefaults(data);
        if (this.isValidCookieData(data)) {
            this.saveCookie(data);
        }
        else {
            data.dirty = true;
            this.requestUpdate();
        }
    }
    setDefaults(data) {
        if (data["name" /* SDK.Cookie.Attribute.NAME */] === undefined) {
            data["name" /* SDK.Cookie.Attribute.NAME */] = '';
        }
        if (data["value" /* SDK.Cookie.Attribute.VALUE */] === undefined) {
            data["value" /* SDK.Cookie.Attribute.VALUE */] = '';
        }
        if (data["domain" /* SDK.Cookie.Attribute.DOMAIN */] === undefined) {
            data["domain" /* SDK.Cookie.Attribute.DOMAIN */] = this.cookieDomain;
        }
        if (data["path" /* SDK.Cookie.Attribute.PATH */] === undefined) {
            data["path" /* SDK.Cookie.Attribute.PATH */] = '/';
        }
        if (data["expires" /* SDK.Cookie.Attribute.EXPIRES */] === undefined) {
            data["expires" /* SDK.Cookie.Attribute.EXPIRES */] = expiresSessionValue();
        }
        if (data["partition-key" /* SDK.Cookie.Attribute.PARTITION_KEY */] === undefined) {
            data["partition-key" /* SDK.Cookie.Attribute.PARTITION_KEY */] = '';
        }
    }
    saveCookie(newCookieData, oldCookie) {
        if (!this.saveCallback) {
            return;
        }
        const newCookie = this.createCookieFromData(newCookieData);
        void this.saveCallback(newCookie, oldCookie ?? null).then(success => {
            if (!success) {
                newCookieData.dirty = true;
            }
            this.refresh();
        });
    }
    createCookieFromData(data) {
        const cookie = new SDK.Cookie.Cookie(data["name" /* SDK.Cookie.Attribute.NAME */] || '', data["value" /* SDK.Cookie.Attribute.VALUE */] || '', null, data["priority" /* SDK.Cookie.Attribute.PRIORITY */]);
        for (const attribute of ["domain" /* SDK.Cookie.Attribute.DOMAIN */, "path" /* SDK.Cookie.Attribute.PATH */, "http-only" /* SDK.Cookie.Attribute.HTTP_ONLY */,
            "secure" /* SDK.Cookie.Attribute.SECURE */, "same-site" /* SDK.Cookie.Attribute.SAME_SITE */, "source-scheme" /* SDK.Cookie.Attribute.SOURCE_SCHEME */]) {
            if (attribute in data) {
                cookie.addAttribute(attribute, data[attribute]);
            }
        }
        if (data.expires && data.expires !== expiresSessionValue()) {
            cookie.addAttribute("expires" /* SDK.Cookie.Attribute.EXPIRES */, (new Date(data["expires" /* SDK.Cookie.Attribute.EXPIRES */])).toUTCString());
        }
        if ("source-port" /* SDK.Cookie.Attribute.SOURCE_PORT */ in data) {
            cookie.addAttribute("source-port" /* SDK.Cookie.Attribute.SOURCE_PORT */, Number.parseInt(data["source-port" /* SDK.Cookie.Attribute.SOURCE_PORT */] || '', 10) || undefined);
        }
        if (data["partition-key-site" /* SDK.Cookie.Attribute.PARTITION_KEY_SITE */]) {
            cookie.setPartitionKey(data["partition-key-site" /* SDK.Cookie.Attribute.PARTITION_KEY_SITE */], Boolean(data["has-cross-site-ancestor" /* SDK.Cookie.Attribute.HAS_CROSS_SITE_ANCESTOR */] ? data["has-cross-site-ancestor" /* SDK.Cookie.Attribute.HAS_CROSS_SITE_ANCESTOR */] :
                false));
        }
        cookie.setSize(data["name" /* SDK.Cookie.Attribute.NAME */].length + data["value" /* SDK.Cookie.Attribute.VALUE */].length);
        return cookie;
    }
    createCookieData(cookie) {
        // See https://tc39.es/ecma262/#sec-time-values-and-time-range
        const maxTime = 8640000000000000;
        const isRequest = cookie.type() === 0 /* SDK.Cookie.Type.REQUEST */;
        const data = { name: cookie.name(), value: cookie.value() };
        for (const attribute of ["http-only" /* SDK.Cookie.Attribute.HTTP_ONLY */, "secure" /* SDK.Cookie.Attribute.SECURE */, "same-site" /* SDK.Cookie.Attribute.SAME_SITE */,
            "source-scheme" /* SDK.Cookie.Attribute.SOURCE_SCHEME */, "source-port" /* SDK.Cookie.Attribute.SOURCE_PORT */]) {
            if (cookie.hasAttribute(attribute)) {
                data[attribute] = String(cookie.getAttribute(attribute) ?? true);
            }
        }
        data["domain" /* SDK.Cookie.Attribute.DOMAIN */] = cookie.domain() || (isRequest ? i18nString(UIStrings.na) : '');
        data["path" /* SDK.Cookie.Attribute.PATH */] = cookie.path() || (isRequest ? i18nString(UIStrings.na) : '');
        data["expires" /* SDK.Cookie.Attribute.EXPIRES */] = //
            cookie.maxAge() ? i18n.TimeUtilities.secondsToString(Math.floor(cookie.maxAge())) :
                cookie.expires() < 0 ? expiresSessionValue() :
                    cookie.expires() > maxTime ? i18nString(UIStrings.timeAfter, { date: new Date(maxTime).toISOString() }) :
                        cookie.expires() > 0 ? new Date(cookie.expires()).toISOString() :
                            isRequest ? i18nString(UIStrings.na) :
                                expiresSessionValue();
        if (cookie.expires() > maxTime) {
            data.expiresTooltip =
                i18nString(UIStrings.timeAfterTooltip, { seconds: cookie.expires(), date: new Date(maxTime).toISOString() });
        }
        data["partition-key-site" /* SDK.Cookie.Attribute.PARTITION_KEY_SITE */] =
            cookie.partitionKeyOpaque() ? i18nString(UIStrings.opaquePartitionKey).toString() : cookie.topLevelSite();
        data["has-cross-site-ancestor" /* SDK.Cookie.Attribute.HAS_CROSS_SITE_ANCESTOR */] = cookie.hasCrossSiteAncestor() ? 'true' : '';
        data["size" /* SDK.Cookie.Attribute.SIZE */] = String(cookie.size());
        data["priority" /* SDK.Cookie.Attribute.PRIORITY */] = cookie.priority();
        data.priorityValue = ['Low', 'Medium', 'High'].indexOf(cookie.priority());
        const blockedReasons = this.cookieToBlockedReasons?.get(cookie) || [];
        for (const blockedReason of blockedReasons) {
            data.flagged = true;
            const attribute = (blockedReason.attribute || "name" /* SDK.Cookie.Attribute.NAME */);
            data.icons = data.icons || {};
            if (!(attribute in data.icons)) {
                data.icons[attribute] = new Icon();
                if (attribute === "name" /* SDK.Cookie.Attribute.NAME */ &&
                    IssuesManager.RelatedIssue.hasThirdPartyPhaseoutCookieIssue(cookie)) {
                    data.icons[attribute].name = 'warning-filled';
                    data.icons[attribute].onclick = () => IssuesManager.RelatedIssue.reveal(cookie);
                    data.icons[attribute].style.cursor = 'pointer';
                }
                else {
                    data.icons[attribute].name = 'info';
                }
                data.icons[attribute].classList.add('small');
                data.icons[attribute].title = blockedReason.uiString;
            }
            else if (data.icons[attribute]) {
                data.icons[attribute].title += '\n' + blockedReason.uiString;
            }
        }
        const exemptionReason = this.cookieToExemptionReason?.get(cookie)?.uiString;
        if (exemptionReason) {
            data.icons = data.icons || {};
            data.flagged = true;
            data.icons.name = new Icon();
            data.icons.name.name = 'info';
            data.icons.name.classList.add('small');
            data.icons.name.title = exemptionReason;
        }
        data.key = cookie.key();
        return data;
    }
    isValidCookieData(data) {
        return (Boolean(data.name) || Boolean(data.value)) && this.isValidDomain(data.domain) &&
            this.isValidPath(data.path) && this.isValidDate(data.expires) &&
            this.isValidPartitionKey(data["partition-key-site" /* SDK.Cookie.Attribute.PARTITION_KEY_SITE */]);
    }
    isValidDomain(domain) {
        if (!domain) {
            return true;
        }
        const parsedURL = Common.ParsedURL.ParsedURL.fromString('http://' + domain);
        return parsedURL !== null && parsedURL.domain() === domain;
    }
    isValidPath(path) {
        if (!path) {
            return true;
        }
        const parsedURL = Common.ParsedURL.ParsedURL.fromString('http://example.com' + path);
        return parsedURL !== null && parsedURL.path === path;
    }
    isValidDate(date) {
        return !date || date === expiresSessionValue() || !isNaN(Date.parse(date));
    }
    isValidPartitionKey(partitionKey) {
        if (!partitionKey) {
            return true;
        }
        const parsedURL = Common.ParsedURL.ParsedURL.fromString(partitionKey);
        return parsedURL !== null;
    }
    refresh() {
        if (this.refreshCallback) {
            this.refreshCallback();
        }
    }
    populateContextMenu(data, contextMenu) {
        const maybeCookie = this.cookies.find(cookie => cookie.key() === data.key);
        if (!maybeCookie) {
            return;
        }
        const cookie = maybeCookie;
        contextMenu.revealSection().appendItem(i18nString(UIStrings.showRequestsWithThisCookie), () => {
            const requestFilter = NetworkForward.UIFilter.UIRequestFilter.filters([
                {
                    filterType: NetworkForward.UIFilter.FilterType.CookieDomain,
                    filterValue: cookie.domain(),
                },
                {
                    filterType: NetworkForward.UIFilter.FilterType.CookieName,
                    filterValue: cookie.name(),
                },
            ]);
            void Common.Revealer.reveal(requestFilter);
        }, { jslogContext: 'show-requests-with-this-cookie' });
        if (IssuesManager.RelatedIssue.hasIssues(cookie)) {
            contextMenu.revealSection().appendItem(i18nString(UIStrings.showIssueAssociatedWithThis), () => {
                // TODO(chromium:1077719): Just filter for the cookie instead of revealing one of the associated issues.
                void IssuesManager.RelatedIssue.reveal(cookie);
            }, { jslogContext: 'show-issue-associated-with-this' });
        }
    }
}
//# sourceMappingURL=CookiesTable.js.map