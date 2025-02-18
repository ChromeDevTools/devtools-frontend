// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

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

import * as Common from '../../../../core/common/common.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as Root from '../../../../core/root/root.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import * as Protocol from '../../../../generated/protocol.js';
import * as IssuesManager from '../../../../models/issues_manager/issues_manager.js';
import * as NetworkForward from '../../../../panels/network/forward/forward.js';
import * as IconButton from '../../../components/icon_button/icon_button.js';
import * as UI from '../../legacy.js';
import * as DataGrid from '../data_grid/data_grid.js';

import cookiesTableStyles from './cookiesTable.css.js';

type AttributeWithIcon = SDK.Cookie.Attribute.NAME|SDK.Cookie.Attribute.VALUE|SDK.Cookie.Attribute.DOMAIN|
                         SDK.Cookie.Attribute.PATH|SDK.Cookie.Attribute.SECURE|SDK.Cookie.Attribute.SAME_SITE;

type CookieData = {
  [key in SDK.Cookie.Attribute]?: string;
}&{
  name: string,
  value: string,
}&{
  key?: string,
  flagged?: boolean,
  icons?: {[key in AttributeWithIcon]?: IconButton.Icon.Icon;},
  priorityValue?: number,
  expiresTooltip?: string,
};

const UIStrings = {
  /**
   *@description Cookie table cookies table expires session value in Cookies Table of the Cookies table in the Application panel
   */
  session: 'Session',
  /**
   *@description Text for the name of something
   */
  name: 'Name',
  /**
   *@description Text for the value of something
   */
  value: 'Value',
  /**
   *@description Text for the size of something
   */
  size: 'Size',
  /**
   *@description Data grid name for Editable Cookies data grid
   */
  editableCookies: 'Editable Cookies',
  /**
   *@description Text for web cookies
   */
  cookies: 'Cookies',
  /**
   *@description Text for something not available
   */
  na: 'N/A',
  /**
   *@description Text for Context Menu entry
   */
  showRequestsWithThisCookie: 'Show requests with this cookie',
  /**
   *@description Text for Context Menu entry
   */
  showIssueAssociatedWithThis: 'Show issue associated with this cookie',
  /**
   *@description Tooltip for the cell that shows the sourcePort property of a cookie in the cookie table. The source port is numberic attribute of a cookie.
   */
  sourcePortTooltip:
      'Shows the source port (range 1-65535) the cookie was set on. If the port is unknown, this shows -1.',
  /**
   *@description Tooltip for the cell that shows the sourceScheme property of a cookie in the cookie table. The source scheme is a trinary attribute of a cookie.
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
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/cookie_table/CookiesTable.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

const expiresSessionValue = i18nLazyString(UIStrings.session);

export class CookiesTable extends UI.Widget.VBox {
  private saveCallback?: ((arg0: SDK.Cookie.Cookie, arg1: SDK.Cookie.Cookie|null) => Promise<boolean>);
  private readonly refreshCallback?: (() => void)|undefined;
  private readonly deleteCallback?: ((arg0: SDK.Cookie.Cookie, arg1: () => void) => void);
  private dataGrid: DataGrid.DataGrid.DataGridImpl<DataGridNode>;
  private lastEditedColumnId: string|null;
  private cookies: SDK.Cookie.Cookie[]|null;
  private cookieDomain: string;
  private cookieToBlockedReasons: ReadonlyMap<SDK.Cookie.Cookie, SDK.CookieModel.BlockedReason[]>|null;
  private cookieToExemptionReason: ReadonlyMap<SDK.Cookie.Cookie, SDK.CookieModel.ExemptionReason>|null;
  constructor(
      renderInline?: boolean,
      saveCallback?: ((arg0: SDK.Cookie.Cookie, arg1: SDK.Cookie.Cookie|null) => Promise<boolean>),
      refreshCallback?: (() => void), selectedCallback?: (() => void),
      deleteCallback?: ((arg0: SDK.Cookie.Cookie, arg1: () => void) => void)) {
    super();
    this.registerRequiredCSS(cookiesTableStyles);

    this.element.classList.add('cookies-table');

    this.saveCallback = saveCallback;
    this.refreshCallback = refreshCallback;
    this.deleteCallback = deleteCallback;

    const editable = Boolean(saveCallback);

    const columns = [
      {
        id: SDK.Cookie.Attribute.NAME,
        title: i18nString(UIStrings.name),
        sortable: true,
        disclosure: editable,
        sort: DataGrid.DataGrid.Order.Ascending,
        longText: true,
        weight: 24,
        editable,
      },
      {
        id: SDK.Cookie.Attribute.VALUE,
        title: i18nString(UIStrings.value),
        sortable: true,
        longText: true,
        weight: 34,
        editable,
      },
      {
        id: SDK.Cookie.Attribute.DOMAIN,
        title: 'Domain',
        sortable: true,
        weight: 7,
        editable,
      },
      {
        id: SDK.Cookie.Attribute.PATH,
        title: 'Path',
        sortable: true,
        weight: 7,
        editable,
      },
      {
        id: SDK.Cookie.Attribute.EXPIRES,
        title: 'Expires / Max-Age',
        sortable: true,
        weight: 7,
        editable,
      },
      {
        id: SDK.Cookie.Attribute.SIZE,
        title: i18nString(UIStrings.size),
        sortable: true,
        align: DataGrid.DataGrid.Align.RIGHT,
        weight: 7,
      },
      {
        id: SDK.Cookie.Attribute.HTTP_ONLY,
        title: 'HttpOnly',
        sortable: true,
        align: DataGrid.DataGrid.Align.CENTER,
        weight: 7,
        dataType: DataGrid.DataGrid.DataType.BOOLEAN,
        editable,
      },
      {
        id: SDK.Cookie.Attribute.SECURE,
        title: 'Secure',
        sortable: true,
        align: DataGrid.DataGrid.Align.CENTER,
        weight: 7,
        dataType: DataGrid.DataGrid.DataType.BOOLEAN,
        editable,
      },
      {
        id: SDK.Cookie.Attribute.SAME_SITE,
        title: 'SameSite',
        sortable: true,
        weight: 7,
        editable,
      },
      {
        id: SDK.Cookie.Attribute.PARTITION_KEY_SITE,
        title: 'Partition Key Site',
        sortable: true,
        weight: 7,
        editable,
      },
      {
        id: SDK.Cookie.Attribute.HAS_CROSS_SITE_ANCESTOR,
        title: 'Cross Site',
        sortable: true,
        align: DataGrid.DataGrid.Align.CENTER,
        weight: 7,
        dataType: DataGrid.DataGrid.DataType.BOOLEAN,
        editable,
      },
      {
        id: SDK.Cookie.Attribute.PRIORITY,
        title: 'Priority',
        sortable: true,
        weight: 7,
        editable,
      },
    ] as DataGrid.DataGrid.ColumnDescriptor[];

    const {hostConfig} = Root.Runtime;
    if (hostConfig.devToolsEnableOriginBoundCookies?.schemeBindingEnabled) {
      const additionalColumns = [
        {
          id: SDK.Cookie.Attribute.SOURCE_SCHEME,
          title: 'SourceScheme',
          sortable: true,
          align: DataGrid.DataGrid.Align.CENTER,
          weight: 7,
          editable,
        },
      ] as DataGrid.DataGrid.ColumnDescriptor[];
      columns.push(...additionalColumns);
    }
    if (hostConfig.devToolsEnableOriginBoundCookies?.portBindingEnabled) {
      const additionalColumns = [
        {
          id: SDK.Cookie.Attribute.SOURCE_PORT,
          title: 'SourcePort',
          sortable: true,
          align: DataGrid.DataGrid.Align.CENTER,
          weight: 7,
          editable,
        },
      ] as DataGrid.DataGrid.ColumnDescriptor[];
      columns.push(...additionalColumns);
    }

    if (editable) {
      this.dataGrid = new DataGrid.DataGrid.DataGridImpl({
        displayName: i18nString(UIStrings.editableCookies),
        columns,
        editCallback: this.onUpdateCookie.bind(this),
        deleteCallback: this.onDeleteCookie.bind(this),
        refreshCallback,
      });
    } else {
      this.dataGrid = new DataGrid.DataGrid.DataGridImpl({
        displayName: i18nString(UIStrings.cookies),
        columns,
        editCallback: undefined,
        deleteCallback: undefined,
        refreshCallback: undefined,
      });
    }
    this.dataGrid.setStriped(true);
    this.dataGrid.setName('cookies-table');
    this.dataGrid.addEventListener(DataGrid.DataGrid.Events.SORTING_CHANGED, this.rebuildTable, this);
    this.dataGrid.setRowContextMenuCallback(this.populateContextMenu.bind(this));
    if (renderInline) {
      this.dataGrid.renderInline();
    }

    if (selectedCallback) {
      this.dataGrid.addEventListener(DataGrid.DataGrid.Events.SELECTED_NODE, selectedCallback, this);
    }

    this.lastEditedColumnId = null;

    this.dataGrid.asWidget().show(this.element);

    this.cookies = [];

    this.cookieDomain = '';

    this.cookieToBlockedReasons = null;

    this.cookieToExemptionReason = null;
  }

  setCookies(
      cookies: SDK.Cookie.Cookie[],
      cookieToBlockedReasons?: ReadonlyMap<SDK.Cookie.Cookie, SDK.CookieModel.BlockedReason[]>,
      cookieToExemptionReason?: ReadonlyMap<SDK.Cookie.Cookie, SDK.CookieModel.ExemptionReason>): void {
    this.cookies = cookies;
    this.cookieToBlockedReasons = cookieToBlockedReasons || null;
    this.cookieToExemptionReason = cookieToExemptionReason || null;
    this.rebuildTable();
  }

  setCookieDomain(cookieDomain: string): void {
    this.cookieDomain = cookieDomain;
  }

  selectedCookie(): SDK.Cookie.Cookie|null {
    const node = this.dataGrid.selectedNode as DataGridNode | null;
    return node ? node.cookie : null;
  }

  private getSelectionCookies(): {current: SDK.Cookie.Cookie|null, neighbor: SDK.Cookie.Cookie|null} {
    const node = this.dataGrid.selectedNode as DataGridNode | null;
    const nextNeighbor = node && node.traverseNextNode(true) as DataGridNode | null;
    const previousNeighbor = node && node.traversePreviousNode(true) as DataGridNode | null;

    return {
      current: node && node.cookie,
      neighbor: (nextNeighbor && nextNeighbor.cookie) || (previousNeighbor && previousNeighbor.cookie),
    };
  }

  override willHide(): void {
    this.lastEditedColumnId = null;
  }

  private findSelectedCookie(
      selectionCookies: {current: SDK.Cookie.Cookie|null, neighbor: SDK.Cookie.Cookie|null},
      cookies: SDK.Cookie.Cookie[]|null): SDK.Cookie.Cookie|null {
    if (!cookies) {
      return null;
    }

    const current = selectionCookies.current;
    const foundCurrent = cookies.find(cookie => this.isSameCookie(cookie, current));
    if (foundCurrent) {
      return foundCurrent;
    }

    const neighbor = selectionCookies.neighbor;
    const foundNeighbor = cookies.find(cookie => this.isSameCookie(cookie, neighbor));
    if (foundNeighbor) {
      return foundNeighbor;
    }

    return null;
  }

  private isSameCookie(cookieA: SDK.Cookie.Cookie, cookieB: SDK.Cookie.Cookie|null|undefined): boolean {
    return cookieB !== null && cookieB !== undefined && cookieB.name() === cookieA.name() &&
        cookieB.domain() === cookieA.domain() && cookieB.path() === cookieA.path();
  }

  private rebuildTable(): void {
    const restoreFocus = this.dataGrid.element?.contains(document.activeElement);
    const selectionCookies = this.getSelectionCookies();
    const lastEditedColumnId = this.lastEditedColumnId;
    this.lastEditedColumnId = null;
    this.dataGrid.rootNode().removeChildren();
    const selectedCookie = this.findSelectedCookie(selectionCookies, this.cookies);
    this.populateNode(this.dataGrid.rootNode(), this.cookies, selectedCookie, lastEditedColumnId);
    if (selectionCookies.current && lastEditedColumnId && !this.dataGrid.selectedNode) {
      this.addInactiveNode(this.dataGrid.rootNode(), selectionCookies.current, lastEditedColumnId);
    }
    if (this.saveCallback) {
      this.dataGrid.addCreationNode(false);
    }
    if (restoreFocus) {
      this.dataGrid.element.focus();
    }
  }

  private populateNode(
      parentNode: DataGrid.DataGrid.DataGridNode<DataGridNode>, cookies: SDK.Cookie.Cookie[]|null,
      selectedCookie: SDK.Cookie.Cookie|null, lastEditedColumnId: string|null): void {
    parentNode.removeChildren();
    if (!cookies) {
      return;
    }

    this.sortCookies(cookies);
    for (let i = 0; i < cookies.length; ++i) {
      const cookie = cookies[i];
      const cookieNode = new DataGridNode(this.createCookieData(cookie), cookie);
      parentNode.appendChild(cookieNode);
      if (this.isSameCookie(cookie, selectedCookie)) {
        cookieNode.select();
        if (lastEditedColumnId !== null) {
          this.dataGrid.startEditingNextEditableColumnOfDataGridNode(cookieNode, lastEditedColumnId);
        }
      }
    }
  }

  private addInactiveNode(
      parentNode: DataGrid.DataGrid.DataGridNode<DataGridNode>, cookie: SDK.Cookie.Cookie,
      editedColumnId: string|null): void {
    const cookieNode = new DataGridNode(this.createCookieData(cookie), cookie);
    parentNode.appendChild(cookieNode);
    cookieNode.select();
    cookieNode.setInactive(true);
    if (editedColumnId !== null) {
      this.dataGrid.startEditingNextEditableColumnOfDataGridNode(cookieNode, editedColumnId);
    }
  }
  private totalSize(cookies: SDK.Cookie.Cookie[]|null): number {
    let totalSize = 0;
    for (let i = 0; cookies && i < cookies.length; ++i) {
      totalSize += cookies[i].size();
    }
    return totalSize;
  }

  private sortCookies(cookies: SDK.Cookie.Cookie[]): void {
    const sortDirection = this.dataGrid.isSortOrderAscending() ? 1 : -1;

    function getValue(cookie: SDK.Cookie.Cookie, property: string): string {
      switch (property) {
        case SDK.Cookie.Attribute.NAME:
          return String(cookie.name());
        case SDK.Cookie.Attribute.VALUE:
          return String(cookie.value());
        case SDK.Cookie.Attribute.DOMAIN:
          return String(cookie.domain());
        case SDK.Cookie.Attribute.PATH:
          return String(cookie.path());
        case SDK.Cookie.Attribute.HTTP_ONLY:
          return String(cookie.httpOnly());
        case SDK.Cookie.Attribute.SECURE:
          return String(cookie.secure());
        case SDK.Cookie.Attribute.SAME_SITE:
          return String(cookie.sameSite());
        case SDK.Cookie.Attribute.PARTITION_KEY_SITE:
          return cookie.partitionKeyOpaque() ? i18nString(UIStrings.opaquePartitionKey) : String(cookie.topLevelSite());
        case SDK.Cookie.Attribute.HAS_CROSS_SITE_ANCESTOR:
          return String(cookie.partitioned() ? cookie.hasCrossSiteAncestor() : false);
        case SDK.Cookie.Attribute.SOURCE_SCHEME:
          return String(cookie.sourceScheme());
        default:
          return String(cookie.name());
      }
    }

    function compareTo(property: string, cookie1: SDK.Cookie.Cookie, cookie2: SDK.Cookie.Cookie): number {
      return sortDirection * Platform.StringUtilities.compare(getValue(cookie1, property), getValue(cookie2, property));
    }

    function numberCompare(
        p: (cookie: SDK.Cookie.Cookie) => number, cookie1: SDK.Cookie.Cookie, cookie2: SDK.Cookie.Cookie): number {
      return sortDirection * (p(cookie1) - p(cookie2));
    }

    function priorityCompare(cookie1: SDK.Cookie.Cookie, cookie2: SDK.Cookie.Cookie): number {
      const priorities = [
        Protocol.Network.CookiePriority.Low,
        Protocol.Network.CookiePriority.Medium,
        Protocol.Network.CookiePriority.High,
      ];

      const priority1 = priorities.indexOf(cookie1.priority());
      const priority2 = priorities.indexOf(cookie2.priority());
      return sortDirection * (priority1 - priority2);
    }

    function expiresCompare(cookie1: SDK.Cookie.Cookie, cookie2: SDK.Cookie.Cookie): number {
      if (cookie1.session() !== cookie2.session()) {
        return sortDirection * (cookie1.session() ? 1 : -1);
      }

      if (cookie1.session()) {
        return 0;
      }

      if (cookie1.maxAge() && cookie2.maxAge()) {
        return sortDirection * (cookie1.maxAge() - cookie2.maxAge());
      }
      if (cookie1.expires() && cookie2.expires()) {
        return sortDirection * (cookie1.expires() - cookie2.expires());
      }
      return sortDirection * (cookie1.expires() ? 1 : -1);
    }

    let comparator;
    const columnId = this.dataGrid.sortColumnId() || SDK.Cookie.Attribute.NAME;
    if (columnId === SDK.Cookie.Attribute.EXPIRES) {
      comparator = expiresCompare;
    } else if (columnId === SDK.Cookie.Attribute.SIZE) {
      comparator = numberCompare.bind(null, c => c.size());
    } else if (columnId === SDK.Cookie.Attribute.SOURCE_PORT) {
      comparator = numberCompare.bind(null, c => c.sourcePort());
    } else if (columnId === SDK.Cookie.Attribute.PRIORITY) {
      comparator = priorityCompare;
    } else {
      comparator = compareTo.bind(null, columnId);
    }
    cookies.sort(comparator);
  }

  private createCookieData(cookie: SDK.Cookie.Cookie): CookieData {
    const data = {} as CookieData;
    data[SDK.Cookie.Attribute.NAME] = cookie.name();
    data[SDK.Cookie.Attribute.VALUE] = cookie.value();
    const isRequest = cookie.type() === SDK.Cookie.Type.REQUEST;
    data[SDK.Cookie.Attribute.DOMAIN] = cookie.domain() || (isRequest ? i18nString(UIStrings.na) : '');
    data[SDK.Cookie.Attribute.PATH] = cookie.path() || (isRequest ? i18nString(UIStrings.na) : '');
    // See https://tc39.es/ecma262/#sec-time-values-and-time-range
    const maxTime: number = 8640000000000000;
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
    for (const attribute
             of [SDK.Cookie.Attribute.SIZE, SDK.Cookie.Attribute.HTTP_ONLY, SDK.Cookie.Attribute.SECURE,
                 SDK.Cookie.Attribute.SAME_SITE, SDK.Cookie.Attribute.SOURCE_SCHEME, SDK.Cookie.Attribute.SOURCE_PORT,
                 SDK.Cookie.Attribute.PRIORITY]) {
      if (cookie.hasAttribute(attribute)) {
        data[attribute] = String(cookie.getAttribute(attribute));
      }
    }
    data[SDK.Cookie.Attribute.PARTITION_KEY_SITE] =
        cookie.partitionKeyOpaque() ? i18nString(UIStrings.opaquePartitionKey) : cookie.topLevelSite();
    data[SDK.Cookie.Attribute.HAS_CROSS_SITE_ANCESTOR] = cookie.hasCrossSiteAncestor() ? 'true' : '';
    data.priorityValue = ['Low', 'Medium', 'High'].indexOf(cookie.priority());
    const blockedReasons = this.cookieToBlockedReasons && this.cookieToBlockedReasons.get(cookie) || [];
    for (const blockedReason of blockedReasons) {
      data.flagged = true;
      const attribute = (blockedReason.attribute || SDK.Cookie.Attribute.NAME) as AttributeWithIcon;
      data.icons = data.icons || {};
      if (!(attribute in data.icons)) {
        data.icons[attribute] = new IconButton.Icon.Icon();
        if (attribute === SDK.Cookie.Attribute.NAME &&
            IssuesManager.RelatedIssue.hasThirdPartyPhaseoutCookieIssue(cookie)) {
          data.icons[attribute].name = 'warning-filled';
          data.icons[attribute].style.color = 'var(--icon-warning)';
          data.icons[attribute].style.width = '14px';
          data.icons[attribute].style.height = '14px';
          data.icons[attribute].onclick = () => IssuesManager.RelatedIssue.reveal(cookie);
          data.icons[attribute].style.cursor = 'pointer';
        } else {
          data.icons[attribute].name = 'info';
          data.icons[attribute].style.width = '14px';
          data.icons[attribute].style.height = '14px';
        }
        data.icons[attribute].title = blockedReason.uiString;
      } else if (data.icons[attribute]) {
        data.icons[attribute].title += '\n' + blockedReason.uiString;
      }
    }
    const exemptionReason = this.cookieToExemptionReason && this.cookieToExemptionReason.get(cookie)?.uiString;
    if (exemptionReason) {
      data.icons = data.icons || {};
      data.flagged = true;
      data.icons.name = new IconButton.Icon.Icon();
      data.icons.name.name = 'info';
      data.icons.name.style.width = '14px';
      data.icons.name.style.height = '14px';
      data.icons.name.title = exemptionReason;
    }
    data.key = cookie.key();
    return data;
  }

  private onDeleteCookie(node: DataGridNode): void {
    if (node.cookie && this.deleteCallback) {
      this.deleteCallback(node.cookie, () => this.refresh());
    }
  }

  private onUpdateCookie(editingNode: DataGridNode, columnIdentifier: string, _oldText: string, _newText: string):
      void {
    this.lastEditedColumnId = columnIdentifier;
    this.setDefaults(editingNode);
    if (this.isValidCookieData(editingNode.cookieData)) {
      this.saveNode(editingNode);
    } else {
      editingNode.setDirty(true);
    }
  }

  private setDefaults(node: DataGridNode): void {
    if (node.data[SDK.Cookie.Attribute.NAME] === null) {
      node.data[SDK.Cookie.Attribute.NAME] = '';
    }
    if (node.data[SDK.Cookie.Attribute.VALUE] === null) {
      node.data[SDK.Cookie.Attribute.VALUE] = '';
    }
    if (node.data[SDK.Cookie.Attribute.DOMAIN] === null) {
      node.data[SDK.Cookie.Attribute.DOMAIN] = this.cookieDomain;
    }
    if (node.data[SDK.Cookie.Attribute.PATH] === null) {
      node.data[SDK.Cookie.Attribute.PATH] = '/';
    }
    if (node.data[SDK.Cookie.Attribute.EXPIRES] === null) {
      node.data[SDK.Cookie.Attribute.EXPIRES] = expiresSessionValue();
    }
    if (node.data[SDK.Cookie.Attribute.PARTITION_KEY] === null) {
      node.data[SDK.Cookie.Attribute.PARTITION_KEY] = '';
    }
  }

  private saveNode(node: DataGridNode): void {
    const oldCookie = node.cookie;
    const newCookie = this.createCookieFromData(node.cookieData);
    node.cookie = newCookie;
    if (!this.saveCallback) {
      return;
    }
    void this.saveCallback(newCookie, oldCookie).then(success => {
      if (success) {
        this.refresh();
      } else {
        node.setDirty(true);
      }
    });
  }

  private createCookieFromData(data: CookieData): SDK.Cookie.Cookie {
    const cookie = new SDK.Cookie.Cookie(
        data[SDK.Cookie.Attribute.NAME], data[SDK.Cookie.Attribute.VALUE], null,
        data[SDK.Cookie.Attribute.PRIORITY] as Protocol.Network.CookiePriority);

    cookie.addAttribute(SDK.Cookie.Attribute.DOMAIN, data[SDK.Cookie.Attribute.DOMAIN]);
    cookie.addAttribute(SDK.Cookie.Attribute.PATH, data[SDK.Cookie.Attribute.PATH]);
    if (data.expires && data.expires !== expiresSessionValue()) {
      cookie.addAttribute(SDK.Cookie.Attribute.EXPIRES, (new Date(data[SDK.Cookie.Attribute.EXPIRES])).toUTCString());
    }
    if (data[SDK.Cookie.Attribute.HTTP_ONLY]) {
      cookie.addAttribute(SDK.Cookie.Attribute.HTTP_ONLY);
    }
    if (data[SDK.Cookie.Attribute.SECURE]) {
      cookie.addAttribute(SDK.Cookie.Attribute.SECURE);
    }
    if (data[SDK.Cookie.Attribute.SAME_SITE]) {
      cookie.addAttribute(SDK.Cookie.Attribute.SAME_SITE, data[SDK.Cookie.Attribute.SAME_SITE]);
    }
    if (SDK.Cookie.Attribute.SOURCE_SCHEME in data) {
      cookie.addAttribute(SDK.Cookie.Attribute.SOURCE_SCHEME, data[SDK.Cookie.Attribute.SOURCE_SCHEME]);
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

  private populateContextMenu(
      contextMenu: UI.ContextMenu.ContextMenu, gridNode: DataGrid.DataGrid.DataGridNode<DataGridNode>): void {
    const maybeCookie = (gridNode as DataGridNode).cookie;
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

export class DataGridNode extends DataGrid.DataGrid.DataGridNode<DataGridNode> {
  cookieData: CookieData;
  cookie: SDK.Cookie.Cookie;

  constructor(data: CookieData, cookie: SDK.Cookie.Cookie) {
    super(data);
    this.cookieData = data;
    this.cookie = cookie;
  }

  override createCells(element: Element): void {
    super.createCells(element);
    if (this.cookieData.flagged) {
      element.classList.add('flagged-cookie-attribute-row');
    }
  }

  override createCell(columnId: string): HTMLElement {
    const cell = super.createCell(columnId);
    if (columnId === SDK.Cookie.Attribute.SOURCE_PORT) {
      UI.Tooltip.Tooltip.install(cell, i18nString(UIStrings.sourcePortTooltip));
    } else if (columnId === SDK.Cookie.Attribute.SOURCE_SCHEME) {
      UI.Tooltip.Tooltip.install(cell, i18nString(UIStrings.sourceSchemeTooltip));
    } else if (columnId === SDK.Cookie.Attribute.EXPIRES && this.cookieData.expiresTooltip) {
      UI.Tooltip.Tooltip.install(cell, this.cookieData.expiresTooltip);
    } else {
      UI.Tooltip.Tooltip.install(cell, cell.textContent || '');
    }

    const infoElement = this.cookieData.icons?.[columnId as AttributeWithIcon];
    if (infoElement) {
      cell.insertBefore(infoElement, cell.firstChild);
    }

    return cell;
  }
}
