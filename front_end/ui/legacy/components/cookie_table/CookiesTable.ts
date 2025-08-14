// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-imperative-dom-api */
/* eslint-disable rulesdir/no-lit-render-outside-of-view */

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
import type * as Protocol from '../../../../generated/protocol.js';
import * as IssuesManager from '../../../../models/issues_manager/issues_manager.js';
import * as NetworkForward from '../../../../panels/network/forward/forward.js';
import * as IconButton from '../../../components/icon_button/icon_button.js';
import {Directives, html, render} from '../../../lit/lit.js';
import * as UI from '../../legacy.js';

import cookiesTableStyles from './cookiesTable.css.js';

interface ViewInput {
  data: CookieData[];
  selectedKey?: string;
  editable?: boolean;
  renderInline?: boolean;
  portBindingEnabled?: boolean;
  schemeBindingEnabled?: boolean;
  onEdit:
      (event: CustomEvent<{node: HTMLElement, columnId: string, valueBeforeEditing: string, newText: string}>) => void;
  onCreate: (event: CustomEvent<CookieData>) => void;
  onRefresh: () => void;
  onDelete: (event: CustomEvent<HTMLElement>) => void;
  onContextMenu: (event: CustomEvent<{menu: UI.ContextMenu.ContextMenu, element: HTMLElement}>) => void;
  onSelect: (event: CustomEvent<HTMLElement|null>) => void;
}
type ViewFunction = (input: ViewInput, output: object, target: HTMLElement) => void;
type AttributeWithIcon = SDK.Cookie.Attribute.NAME|SDK.Cookie.Attribute.VALUE|SDK.Cookie.Attribute.DOMAIN|
                         SDK.Cookie.Attribute.PATH|SDK.Cookie.Attribute.SECURE|SDK.Cookie.Attribute.SAME_SITE;

type CookieData = Partial<Record<SDK.Cookie.Attribute, string>>&{
  name: string,
  value: string,
}&{
  key?: string,
  flagged?: boolean,
  icons?: Partial<Record<AttributeWithIcon, IconButton.Icon.Icon>>,
  priorityValue?: number,
  expiresTooltip?: string,
  dirty?: boolean,
  inactive?: boolean,
};

const {repeat, ifDefined} = Directives;

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
  sourcePortTooltip:
      'Shows the source port (range 1-65535) the cookie was set on. If the port is unknown, this shows -1.',
  /**
   * @description Tooltip for the cell that shows the sourceScheme property of a cookie in the cookie table. The source scheme is a trinary attribute of a cookie.
   */
  sourceSchemeTooltip:
      'Shows the source scheme (`Secure`, `NonSecure`) the cookie was set on. If the scheme is unknown, this shows `Unset`.',
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
} as const;
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/cookie_table/CookiesTable.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

const expiresSessionValue = i18nLazyString(UIStrings.session);

export class CookiesTable extends UI.Widget.VBox {
  private saveCallback?: ((arg0: SDK.Cookie.Cookie, arg1: SDK.Cookie.Cookie|null) => Promise<boolean>);
  private readonly refreshCallback?: (() => void);
  private readonly selectedCallback?: (() => void);
  private readonly deleteCallback?: ((arg0: SDK.Cookie.Cookie, arg1: () => void) => void);
  private lastEditedColumnId: string|null;
  private data: CookieData[] = [];
  private cookies: SDK.Cookie.Cookie[] = [];
  private cookieDomain: string;
  private cookieToBlockedReasons: ReadonlyMap<SDK.Cookie.Cookie, SDK.CookieModel.BlockedReason[]>|null;
  private cookieToExemptionReason: ReadonlyMap<SDK.Cookie.Cookie, SDK.CookieModel.ExemptionReason>|null;
  private readonly view: ViewFunction;
  private selectedKey?: string;
  private readonly editable: boolean;
  private readonly renderInline: boolean;
  private readonly schemeBindingEnabled: boolean;
  private readonly portBindingEnabled: boolean;
  constructor(
      renderInline?: boolean,
      saveCallback?: ((arg0: SDK.Cookie.Cookie, arg1: SDK.Cookie.Cookie|null) => Promise<boolean>),
      refreshCallback?: (() => void), selectedCallback?: (() => void),
      deleteCallback?: ((arg0: SDK.Cookie.Cookie, arg1: () => void) => void), view?: ViewFunction) {
    super();
    if (!view) {
      view = (input, _, target) => {
        // clang-format off
        render(html`
          <devtools-data-grid
               name=${input.editable ? i18nString(UIStrings.editableCookies) : i18nString(UIStrings.cookies)}
               id="cookies-table"
               striped
               ?inline=${input.renderInline}
               @edit=${input.onEdit}
               @create=${input.onCreate}
               @refresh=${input.onRefresh}
               @delete=${input.onDelete}
               @contextmenu=${input.onContextMenu}
               @select=${input.onSelect}
          >
            <table>
               <tr>
                 <th id=${SDK.Cookie.Attribute.NAME} sortable ?disclosure=${input.editable} ?editable=${input.editable} long weight="24">
                   ${i18nString(UIStrings.name)}
                 </th>
                 <th id=${SDK.Cookie.Attribute.VALUE} sortable ?editable=${input.editable} long weight="34">
                   ${i18nString(UIStrings.value)}
                 </th>
                 <th id=${SDK.Cookie.Attribute.DOMAIN} sortable weight="7" ?editable=${input.editable}>
                   Domain
                 </th>
                 <th id=${SDK.Cookie.Attribute.PATH} sortable weight="7" ?editable=${input.editable}>
                   Path
                 </th>
                 <th id=${SDK.Cookie.Attribute.EXPIRES} sortable weight="7" ?editable=${input.editable}>
                   Expires / Max-Age
                 </th>
                 <th id=${SDK.Cookie.Attribute.SIZE} sortable align="right" weight="7">
                   ${i18nString(UIStrings.size)}
                 </th>
                 <th id=${SDK.Cookie.Attribute.HTTP_ONLY} sortable align="center" weight="7" ?editable=${input.editable} type="boolean">
                   HttpOnly
                 </th>
                 <th id=${SDK.Cookie.Attribute.SECURE} sortable align="center" weight="7" ?editable=${input.editable} type="boolean">
                   Secure
                 </th>
                 <th id=${SDK.Cookie.Attribute.SAME_SITE} sortable weight="7" ?editable=${input.editable}>
                   SameSite
                 </th>
                 <th id=${SDK.Cookie.Attribute.PARTITION_KEY_SITE} sortable weight="7" ?editable=${input.editable}>
                   Partition Key Site
                 </th>
                 <th id=${SDK.Cookie.Attribute.HAS_CROSS_SITE_ANCESTOR} sortable align="center" weight="7" ?editable=${input.editable} type="boolean">
                   Cross Site
                 </th>
                 <th id=${SDK.Cookie.Attribute.PRIORITY} sortable weight="7" ?editable=${input.editable}>
                   Priority
                 </th>
                 ${input.schemeBindingEnabled ?  html`
                 <th id=${SDK.Cookie.Attribute.SOURCE_SCHEME} sortable align="center" weight="7" ?editable=${input.editable} type="string">
                   SourceScheme
                 </th>` : ''}
                 ${input.portBindingEnabled ? html`
                <th id=${SDK.Cookie.Attribute.SOURCE_PORT} sortable align="center" weight="7" ?editable=${input.editable} type="number">
                   SourcePort
                </th>` : ''}
              </tr>
              ${repeat(this.data,
                        cookie => cookie.key, cookie => html`<tr data-key=${ifDefined(cookie.key)}
                    ?selected=${cookie.key === input.selectedKey}
                    ?inactive=${cookie.inactive}
                    ?dirty=${cookie.dirty}
                    ?highlighted=${cookie.flagged}>
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
                  ${input.schemeBindingEnabled ? html`
                    <td title=${i18nString(UIStrings.sourceSchemeTooltip)}>${cookie['source-scheme']}</td>` : ''}
                  ${input.portBindingEnabled ? html`
                    <td title=${i18nString(UIStrings.sourcePortTooltip)}>${cookie['source-port']}</td>` : ''}
                </tr>`)}
                ${input.editable ? html`<tr placeholder><tr>` : ''}
              </table>
            </devtools-data-grid>`, target, {host: target});
        // clang-format on
      };
    }
    this.registerRequiredCSS(cookiesTableStyles);

    this.element.classList.add('cookies-table');

    this.saveCallback = saveCallback;
    this.refreshCallback = refreshCallback;
    this.deleteCallback = deleteCallback;

    this.editable = Boolean(saveCallback);
    const {devToolsEnableOriginBoundCookies} = Root.Runtime.hostConfig;

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

  setCookies(
      cookies: SDK.Cookie.Cookie[],
      cookieToBlockedReasons?: ReadonlyMap<SDK.Cookie.Cookie, SDK.CookieModel.BlockedReason[]>,
      cookieToExemptionReason?: ReadonlyMap<SDK.Cookie.Cookie, SDK.CookieModel.ExemptionReason>): void {
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

  setCookieDomain(cookieDomain: string): void {
    this.cookieDomain = cookieDomain;
  }

  selectedCookie(): SDK.Cookie.Cookie|null {
    return this.cookies.find(cookie => cookie.key() === this.selectedKey) || null;
  }

  override willHide(): void {
    this.lastEditedColumnId = null;
  }

  override performUpdate(): void {
    const input: ViewInput = {
      data: this.data,
      selectedKey: this.selectedKey,
      editable: this.editable,
      renderInline: this.renderInline,
      schemeBindingEnabled: this.schemeBindingEnabled,
      portBindingEnabled: this.portBindingEnabled,
      onEdit: event => this.onUpdateCookie(
          event.detail.node, event.detail.columnId, event.detail.valueBeforeEditing, event.detail.newText),
      onCreate: event => this.onCreateCookie(event.detail),
      onRefresh: () => this.refresh(),
      onDelete: event => this.onDeleteCookie(event.detail),
      onSelect: event => this.onSelect(event.detail),
      onContextMenu: event => this.populateContextMenu(event.detail.menu, event.detail.element),
    };
    const output = {};
    this.view(input, output, this.element);
  }

  private onSelect(node: HTMLElement|null): void {
    this.selectedKey = node?.dataset?.key;
    this.selectedCallback?.();
  }

  private onDeleteCookie(node: HTMLElement): void {
    const cookie = this.cookies.find(cookie => cookie.key() === node.dataset.key);
    if (cookie && this.deleteCallback) {
      this.deleteCallback(cookie, () => this.refresh());
    }
  }

  private onUpdateCookie(editingNode: HTMLElement, columnIdentifier: string, _oldText: string, newText: string): void {
    const oldCookie = this.cookies.find(cookie => cookie.key() === editingNode.dataset.key);
    const oldData = this.data.find(data => data.key === editingNode.dataset.key);
    if (!oldData || !oldCookie) {
      return;
    }
    const newCookieData = {...oldData, [columnIdentifier]: newText};  // as CookieData;
    if (!this.isValidCookieData(newCookieData)) {
      newCookieData.dirty = true;
      this.requestUpdate();
      return;
    }
    this.lastEditedColumnId = columnIdentifier;
    this.saveCookie(newCookieData, oldCookie);
  }

  private onCreateCookie(data: CookieData): void {
    this.setDefaults(data);
    if (this.isValidCookieData(data)) {
      this.saveCookie(data);
    } else {
      data.dirty = true;
      this.requestUpdate();
    }
  }

  private setDefaults(data: CookieData): void {
    if (data[SDK.Cookie.Attribute.NAME] === undefined) {
      data[SDK.Cookie.Attribute.NAME] = '';
    }
    if (data[SDK.Cookie.Attribute.VALUE] === undefined) {
      data[SDK.Cookie.Attribute.VALUE] = '';
    }
    if (data[SDK.Cookie.Attribute.DOMAIN] === undefined) {
      data[SDK.Cookie.Attribute.DOMAIN] = this.cookieDomain;
    }
    if (data[SDK.Cookie.Attribute.PATH] === undefined) {
      data[SDK.Cookie.Attribute.PATH] = '/';
    }
    if (data[SDK.Cookie.Attribute.EXPIRES] === undefined) {
      data[SDK.Cookie.Attribute.EXPIRES] = expiresSessionValue();
    }
    if (data[SDK.Cookie.Attribute.PARTITION_KEY] === undefined) {
      data[SDK.Cookie.Attribute.PARTITION_KEY] = '';
    }
  }

  private saveCookie(newCookieData: CookieData, oldCookie?: SDK.Cookie.Cookie): void {
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

  private createCookieFromData(data: CookieData): SDK.Cookie.Cookie {
    const cookie = new SDK.Cookie.Cookie(
        data[SDK.Cookie.Attribute.NAME] || '', data[SDK.Cookie.Attribute.VALUE] || '', null,
        data[SDK.Cookie.Attribute.PRIORITY] as Protocol.Network.CookiePriority);

    for (const attribute
             of [SDK.Cookie.Attribute.DOMAIN, SDK.Cookie.Attribute.PATH, SDK.Cookie.Attribute.HTTP_ONLY,
                 SDK.Cookie.Attribute.SECURE, SDK.Cookie.Attribute.SAME_SITE, SDK.Cookie.Attribute.SOURCE_SCHEME]) {
      if (attribute in data) {
        cookie.addAttribute(attribute, data[attribute]);
      }
    }
    if (data.expires && data.expires !== expiresSessionValue()) {
      cookie.addAttribute(SDK.Cookie.Attribute.EXPIRES, (new Date(data[SDK.Cookie.Attribute.EXPIRES])).toUTCString());
    }
    if (SDK.Cookie.Attribute.SOURCE_PORT in data) {
      cookie.addAttribute(
          SDK.Cookie.Attribute.SOURCE_PORT,
          Number.parseInt(data[SDK.Cookie.Attribute.SOURCE_PORT] || '', 10) || undefined);
    }
    if (data[SDK.Cookie.Attribute.PARTITION_KEY_SITE]) {
      cookie.setPartitionKey(
          data[SDK.Cookie.Attribute.PARTITION_KEY_SITE],
          Boolean(
              data[SDK.Cookie.Attribute.HAS_CROSS_SITE_ANCESTOR] ? data[SDK.Cookie.Attribute.HAS_CROSS_SITE_ANCESTOR] :
                                                                   false));
    }
    cookie.setSize(data[SDK.Cookie.Attribute.NAME].length + data[SDK.Cookie.Attribute.VALUE].length);
    return cookie;
  }

  private createCookieData(cookie: SDK.Cookie.Cookie): CookieData {
    // See https://tc39.es/ecma262/#sec-time-values-and-time-range
    const maxTime = 8640000000000000;
    const isRequest = cookie.type() === SDK.Cookie.Type.REQUEST;
    const data: CookieData = {name: cookie.name(), value: cookie.value()};
    for (const attribute
             of [SDK.Cookie.Attribute.HTTP_ONLY, SDK.Cookie.Attribute.SECURE, SDK.Cookie.Attribute.SAME_SITE,
                 SDK.Cookie.Attribute.SOURCE_SCHEME, SDK.Cookie.Attribute.SOURCE_PORT]) {
      if (cookie.hasAttribute(attribute)) {
        data[attribute] = String(cookie.getAttribute(attribute) ?? true);
      }
    }
    data[SDK.Cookie.Attribute.DOMAIN] = cookie.domain() || (isRequest ? i18nString(UIStrings.na) : '');
    data[SDK.Cookie.Attribute.PATH] = cookie.path() || (isRequest ? i18nString(UIStrings.na) : '');
    data[SDK.Cookie.Attribute.EXPIRES] =  //
        cookie.maxAge()            ? i18n.TimeUtilities.secondsToString(Math.floor(cookie.maxAge())) :
        cookie.expires() < 0       ? expiresSessionValue() :
        cookie.expires() > maxTime ? i18nString(UIStrings.timeAfter, {date: new Date(maxTime).toISOString()}) :
        cookie.expires() > 0       ? new Date(cookie.expires()).toISOString() :
        isRequest                  ? i18nString(UIStrings.na) :
                                     expiresSessionValue();
    if (cookie.expires() > maxTime) {
      data.expiresTooltip =
          i18nString(UIStrings.timeAfterTooltip, {seconds: cookie.expires(), date: new Date(maxTime).toISOString()});
    }
    data[SDK.Cookie.Attribute.PARTITION_KEY_SITE] =
        cookie.partitionKeyOpaque() ? i18nString(UIStrings.opaquePartitionKey).toString() : cookie.topLevelSite();
    data[SDK.Cookie.Attribute.HAS_CROSS_SITE_ANCESTOR] = cookie.hasCrossSiteAncestor() ? 'true' : '';
    data[SDK.Cookie.Attribute.SIZE] = String(cookie.size());
    data[SDK.Cookie.Attribute.PRIORITY] = cookie.priority();
    data.priorityValue = ['Low', 'Medium', 'High'].indexOf(cookie.priority());
    const blockedReasons = this.cookieToBlockedReasons?.get(cookie) || [];
    for (const blockedReason of blockedReasons) {
      data.flagged = true;
      const attribute = (blockedReason.attribute || SDK.Cookie.Attribute.NAME) as AttributeWithIcon;
      data.icons = data.icons || {};
      if (!(attribute in data.icons)) {
        data.icons[attribute] = new IconButton.Icon.Icon();
        if (attribute === SDK.Cookie.Attribute.NAME &&
            IssuesManager.RelatedIssue.hasThirdPartyPhaseoutCookieIssue(cookie)) {
          data.icons[attribute].name = 'warning-filled';
          data.icons[attribute].onclick = () => IssuesManager.RelatedIssue.reveal(cookie);
          data.icons[attribute].style.cursor = 'pointer';
        } else {
          data.icons[attribute].name = 'info';
        }
        data.icons[attribute].classList.add('small');
        data.icons[attribute].title = blockedReason.uiString;
      } else if (data.icons[attribute]) {
        data.icons[attribute].title += '\n' + blockedReason.uiString;
      }
    }
    const exemptionReason = this.cookieToExemptionReason?.get(cookie)?.uiString;
    if (exemptionReason) {
      data.icons = data.icons || {};
      data.flagged = true;
      data.icons.name = new IconButton.Icon.Icon();
      data.icons.name.name = 'info';
      data.icons.name.classList.add('small');
      data.icons.name.title = exemptionReason;
    }
    data.key = cookie.key();
    return data;
  }

  private isValidCookieData(data: CookieData): boolean {
    return (Boolean(data.name) || Boolean(data.value)) && this.isValidDomain(data.domain) &&
        this.isValidPath(data.path) && this.isValidDate(data.expires) &&
        this.isValidPartitionKey(data[SDK.Cookie.Attribute.PARTITION_KEY_SITE]);
  }

  private isValidDomain(domain: string|undefined): boolean {
    if (!domain) {
      return true;
    }
    const parsedURL = Common.ParsedURL.ParsedURL.fromString('http://' + domain);
    return parsedURL !== null && parsedURL.domain() === domain;
  }

  private isValidPath(path: string|undefined): boolean {
    if (!path) {
      return true;
    }
    const parsedURL = Common.ParsedURL.ParsedURL.fromString('http://example.com' + path);
    return parsedURL !== null && parsedURL.path === path;
  }

  private isValidDate(date: string|undefined): boolean {
    return !date || date === expiresSessionValue() || !isNaN(Date.parse(date));
  }

  private isValidPartitionKey(partitionKey: string|undefined): boolean {
    if (!partitionKey) {
      return true;
    }
    const parsedURL = Common.ParsedURL.ParsedURL.fromString(partitionKey);
    return parsedURL !== null;
  }

  private refresh(): void {
    if (this.refreshCallback) {
      this.refreshCallback();
    }
  }

  private populateContextMenu(contextMenu: UI.ContextMenu.ContextMenu, gridNode: HTMLElement): void {
    const maybeCookie = this.cookies.find(cookie => cookie.key() === gridNode.dataset.key);
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
    }, {jslogContext: 'show-requests-with-this-cookie'});
    if (IssuesManager.RelatedIssue.hasIssues(cookie)) {
      contextMenu.revealSection().appendItem(i18nString(UIStrings.showIssueAssociatedWithThis), () => {
        // TODO(chromium:1077719): Just filter for the cookie instead of revealing one of the associated issues.
        void IssuesManager.RelatedIssue.reveal(cookie);
      }, {jslogContext: 'show-issue-associated-with-this'});
    }
  }
}
