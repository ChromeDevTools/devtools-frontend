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
import * as UI from '../../legacy.js';
import * as DataGrid from '../data_grid/data_grid.js';

import cookiesTableStyles from './cookiesTable.css.js';

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
  showRequestsWithThisCookie: 'Show Requests With This Cookie',
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
  private data: {folderName: string|null, cookies: Array<SDK.Cookie.Cookie>|null}[];
  private cookieDomain: string;
  private cookieToBlockedReasons: ReadonlyMap<SDK.Cookie.Cookie, SDK.CookieModel.BlockedReason[]>|null;
  constructor(
      renderInline?: boolean,
      saveCallback?: ((arg0: SDK.Cookie.Cookie, arg1: SDK.Cookie.Cookie|null) => Promise<boolean>),
      refreshCallback?: (() => void), selectedCallback?: (() => void),
      deleteCallback?: ((arg0: SDK.Cookie.Cookie, arg1: () => void) => void)) {
    super();

    this.element.classList.add('cookies-table');

    this.saveCallback = saveCallback;
    this.refreshCallback = refreshCallback;
    this.deleteCallback = deleteCallback;

    const editable = Boolean(saveCallback);

    const columns = [
      {
        id: SDK.Cookie.Attributes.Name,
        title: i18nString(UIStrings.name),
        sortable: true,
        disclosure: editable,
        sort: DataGrid.DataGrid.Order.Ascending,
        longText: true,
        weight: 24,
        editable: editable,
      },
      {
        id: SDK.Cookie.Attributes.Value,
        title: i18nString(UIStrings.value),
        sortable: true,
        longText: true,
        weight: 34,
        editable: editable,
      },
      {
        id: SDK.Cookie.Attributes.Domain,
        title: 'Domain',
        sortable: true,
        weight: 7,
        editable: editable,
      },
      {
        id: SDK.Cookie.Attributes.Path,
        title: 'Path',
        sortable: true,
        weight: 7,
        editable: editable,
      },
      {
        id: SDK.Cookie.Attributes.Expires,
        title: 'Expires / Max-Age',
        sortable: true,
        weight: 7,
        editable: editable,
      },
      {
        id: SDK.Cookie.Attributes.Size,
        title: i18nString(UIStrings.size),
        sortable: true,
        align: DataGrid.DataGrid.Align.Right,
        weight: 7,
      },
      {
        id: SDK.Cookie.Attributes.HttpOnly,
        title: 'HttpOnly',
        sortable: true,
        align: DataGrid.DataGrid.Align.Center,
        weight: 7,
        dataType: DataGrid.DataGrid.DataType.Boolean,
        editable,
      },
      {
        id: SDK.Cookie.Attributes.Secure,
        title: 'Secure',
        sortable: true,
        align: DataGrid.DataGrid.Align.Center,
        weight: 7,
        dataType: DataGrid.DataGrid.DataType.Boolean,
        editable,
      },
      {
        id: SDK.Cookie.Attributes.SameSite,
        title: 'SameSite',
        sortable: true,
        weight: 7,
        editable: editable,
      },
      {
        id: SDK.Cookie.Attributes.PartitionKey,
        title: 'Partition Key',
        sortable: true,
        weight: 7,
        editable: editable,
      },
      {
        id: SDK.Cookie.Attributes.Priority,
        title: 'Priority',
        sortable: true,
        sort: DataGrid.DataGrid.Order.Descending,
        weight: 7,
        editable: editable,
      },
    ] as DataGrid.DataGrid.ColumnDescriptor[];

    if (Root.Runtime.experiments.isEnabled('experimentalCookieFeatures')) {
      const additionalColumns = [
        {
          id: SDK.Cookie.Attributes.SourceScheme,
          title: 'SourceScheme',
          sortable: true,
          align: DataGrid.DataGrid.Align.Center,
          weight: 7,
          editable: editable,
        },
        {
          id: SDK.Cookie.Attributes.SourcePort,
          title: 'SourcePort',
          sortable: true,
          align: DataGrid.DataGrid.Align.Center,
          weight: 7,
          editable: editable,
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
    this.dataGrid.setName('cookiesTable');
    this.dataGrid.addEventListener(DataGrid.DataGrid.Events.SortingChanged, this.rebuildTable, this);
    this.dataGrid.setRowContextMenuCallback(this.populateContextMenu.bind(this));
    if (renderInline) {
      this.dataGrid.renderInline();
    }

    if (selectedCallback) {
      this.dataGrid.addEventListener(DataGrid.DataGrid.Events.SelectedNode, selectedCallback, this);
    }

    this.lastEditedColumnId = null;

    this.dataGrid.asWidget().show(this.element);

    this.data = [];

    this.cookieDomain = '';

    this.cookieToBlockedReasons = null;
  }

  wasShown(): void {
    this.registerCSSFiles([cookiesTableStyles]);
  }

  setCookies(
      cookies: SDK.Cookie.Cookie[],
      cookieToBlockedReasons?: ReadonlyMap<SDK.Cookie.Cookie, SDK.CookieModel.BlockedReason[]>): void {
    this.setCookieFolders([{cookies: cookies, folderName: null}], cookieToBlockedReasons);
  }

  setCookieFolders(
      cookieFolders: {folderName: string|null, cookies: Array<SDK.Cookie.Cookie>|null}[],
      cookieToBlockedReasons?: ReadonlyMap<SDK.Cookie.Cookie, SDK.CookieModel.BlockedReason[]>): void {
    this.data = cookieFolders;
    this.cookieToBlockedReasons = cookieToBlockedReasons || null;
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

  willHide(): void {
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
    const selectionCookies = this.getSelectionCookies();
    const lastEditedColumnId = this.lastEditedColumnId;
    this.lastEditedColumnId = null;
    this.dataGrid.rootNode().removeChildren();
    for (let i = 0; i < this.data.length; ++i) {
      const item = this.data[i];
      const selectedCookie = this.findSelectedCookie(selectionCookies, item.cookies);
      if (item.folderName) {
        const groupData = {} as {
          [x: string]: string | number,
        };
        groupData[SDK.Cookie.Attributes.Name] = item.folderName;
        groupData[SDK.Cookie.Attributes.Value] = '';
        groupData[SDK.Cookie.Attributes.Size] = this.totalSize(item.cookies);
        groupData[SDK.Cookie.Attributes.Domain] = '';
        groupData[SDK.Cookie.Attributes.Path] = '';
        groupData[SDK.Cookie.Attributes.Expires] = '';
        groupData[SDK.Cookie.Attributes.HttpOnly] = '';
        groupData[SDK.Cookie.Attributes.Secure] = '';
        groupData[SDK.Cookie.Attributes.SameSite] = '';
        groupData[SDK.Cookie.Attributes.SourcePort] = '';
        groupData[SDK.Cookie.Attributes.SourceScheme] = '';
        groupData[SDK.Cookie.Attributes.Priority] = '';

        const groupNode = new DataGrid.DataGrid.DataGridNode(groupData) as DataGrid.DataGrid.DataGridNode<DataGridNode>;
        groupNode.selectable = true;
        this.dataGrid.rootNode().appendChild(groupNode);
        groupNode.element().classList.add('row-group');
        this.populateNode(groupNode, item.cookies, selectedCookie, lastEditedColumnId);
        groupNode.expand();
      } else {
        this.populateNode(this.dataGrid.rootNode(), item.cookies, selectedCookie, lastEditedColumnId);
      }
    }
    if (selectionCookies.current && lastEditedColumnId && !this.dataGrid.selectedNode) {
      this.addInactiveNode(this.dataGrid.rootNode(), selectionCookies.current, lastEditedColumnId);
    }
    if (this.saveCallback) {
      this.dataGrid.addCreationNode(false);
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
      const cookieNode = this.createGridNode(cookie);
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
    const cookieNode = this.createGridNode(cookie);
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
        case SDK.Cookie.Attributes.Name:
          return String(cookie.name());
        case SDK.Cookie.Attributes.Value:
          return String(cookie.value());
        case SDK.Cookie.Attributes.Domain:
          return String(cookie.domain());
        case SDK.Cookie.Attributes.Path:
          return String(cookie.path());
        case SDK.Cookie.Attributes.HttpOnly:
          return String(cookie.httpOnly());
        case SDK.Cookie.Attributes.Secure:
          return String(cookie.secure());
        case SDK.Cookie.Attributes.SameSite:
          return String(cookie.sameSite());
        case SDK.Cookie.Attributes.PartitionKey:
          return cookie.partitionKeyOpaque() ? i18nString(UIStrings.opaquePartitionKey) : String(cookie.partitionKey());
        case SDK.Cookie.Attributes.SourceScheme:
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
    const columnId = this.dataGrid.sortColumnId() || SDK.Cookie.Attributes.Name;
    if (columnId === SDK.Cookie.Attributes.Expires) {
      comparator = expiresCompare;
    } else if (columnId === SDK.Cookie.Attributes.Size) {
      comparator = numberCompare.bind(null, c => c.size());
    } else if (columnId === SDK.Cookie.Attributes.SourcePort) {
      comparator = numberCompare.bind(null, c => c.sourcePort());
    } else if (columnId === SDK.Cookie.Attributes.Priority) {
      comparator = priorityCompare;
    } else {
      comparator = compareTo.bind(null, columnId);
    }
    cookies.sort(comparator);
  }

  private createGridNode(cookie: SDK.Cookie.Cookie): DataGridNode {
    const data = {} as {
      [x: string]: string | number | boolean,
    };
    data[SDK.Cookie.Attributes.Name] = cookie.name();
    data[SDK.Cookie.Attributes.Value] = cookie.value();

    if (cookie.type() === SDK.Cookie.Type.Request) {
      data[SDK.Cookie.Attributes.Domain] = cookie.domain() ? cookie.domain() : i18nString(UIStrings.na);
      data[SDK.Cookie.Attributes.Path] = cookie.path() ? cookie.path() : i18nString(UIStrings.na);
    } else {
      data[SDK.Cookie.Attributes.Domain] = cookie.domain() || '';
      data[SDK.Cookie.Attributes.Path] = cookie.path() || '';
    }

    let expiresTooltip = undefined;
    if (cookie.maxAge()) {
      data[SDK.Cookie.Attributes.Expires] = i18n.TimeUtilities.secondsToString(Math.floor(cookie.maxAge()));
    } else if (cookie.expires()) {
      const expires = cookie.expires();
      if (expires < 0) {
        data[SDK.Cookie.Attributes.Expires] = expiresSessionValue();
      } else {
        // See https://tc39.es/ecma262/#sec-time-values-and-time-range
        const maxTimestamp: number = 8640000000000000;
        if (expires > maxTimestamp) {
          const date = new Date(maxTimestamp).toISOString();
          data[SDK.Cookie.Attributes.Expires] = i18nString(UIStrings.timeAfter, {date});
          expiresTooltip = i18nString(UIStrings.timeAfterTooltip, {seconds: expires, date});
        } else {
          data[SDK.Cookie.Attributes.Expires] = new Date(expires).toISOString();
        }
      }
    } else {
      data[SDK.Cookie.Attributes.Expires] =
          cookie.type() === SDK.Cookie.Type.Request ? i18nString(UIStrings.na) : expiresSessionValue();
    }

    data[SDK.Cookie.Attributes.Size] = cookie.size();
    data[SDK.Cookie.Attributes.HttpOnly] = cookie.httpOnly();
    data[SDK.Cookie.Attributes.Secure] = cookie.secure();
    data[SDK.Cookie.Attributes.SameSite] = cookie.sameSite() || '';
    data[SDK.Cookie.Attributes.SourcePort] = cookie.sourcePort();
    data[SDK.Cookie.Attributes.SourceScheme] = cookie.sourceScheme();
    data[SDK.Cookie.Attributes.Priority] = cookie.priority() || '';
    data[SDK.Cookie.Attributes.PartitionKey] = cookie.partitionKey() || '';

    const blockedReasons = this.cookieToBlockedReasons?.get(cookie);
    const node = new DataGridNode(data, cookie, blockedReasons || null);
    if (expiresTooltip) {
      node.setExpiresTooltip(expiresTooltip);
    }
    node.selectable = true;
    return node;
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
    if (this.isValidCookieData(editingNode.data)) {
      this.saveNode(editingNode);
    } else {
      editingNode.setDirty(true);
    }
  }

  private setDefaults(node: DataGridNode): void {
    if (node.data[SDK.Cookie.Attributes.Name] === null) {
      node.data[SDK.Cookie.Attributes.Name] = '';
    }
    if (node.data[SDK.Cookie.Attributes.Value] === null) {
      node.data[SDK.Cookie.Attributes.Value] = '';
    }
    if (node.data[SDK.Cookie.Attributes.Domain] === null) {
      node.data[SDK.Cookie.Attributes.Domain] = this.cookieDomain;
    }
    if (node.data[SDK.Cookie.Attributes.Path] === null) {
      node.data[SDK.Cookie.Attributes.Path] = '/';
    }
    if (node.data[SDK.Cookie.Attributes.Expires] === null) {
      node.data[SDK.Cookie.Attributes.Expires] = expiresSessionValue();
    }
    if (node.data[SDK.Cookie.Attributes.PartitionKey] === null) {
      node.data[SDK.Cookie.Attributes.PartitionKey] = '';
    }
  }

  private saveNode(node: DataGridNode): void {
    const oldCookie = node.cookie;
    const newCookie = this.createCookieFromData(node.data);
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

  private createCookieFromData(data: {[x: string]: string}): SDK.Cookie.Cookie {
    const cookie = new SDK.Cookie.Cookie(
        data[SDK.Cookie.Attributes.Name], data[SDK.Cookie.Attributes.Value], null,
        data[SDK.Cookie.Attributes.Priority] as Protocol.Network.CookiePriority);

    cookie.addAttribute(SDK.Cookie.Attributes.Domain, data[SDK.Cookie.Attributes.Domain]);
    cookie.addAttribute(SDK.Cookie.Attributes.Path, data[SDK.Cookie.Attributes.Path]);
    if (data.expires && data.expires !== expiresSessionValue()) {
      cookie.addAttribute(SDK.Cookie.Attributes.Expires, (new Date(data[SDK.Cookie.Attributes.Expires])).toUTCString());
    }
    if (data[SDK.Cookie.Attributes.HttpOnly]) {
      cookie.addAttribute(SDK.Cookie.Attributes.HttpOnly);
    }
    if (data[SDK.Cookie.Attributes.Secure]) {
      cookie.addAttribute(SDK.Cookie.Attributes.Secure);
    }
    if (data[SDK.Cookie.Attributes.SameSite]) {
      cookie.addAttribute(SDK.Cookie.Attributes.SameSite, data[SDK.Cookie.Attributes.SameSite]);
    }
    if (SDK.Cookie.Attributes.SourceScheme in data) {
      cookie.addAttribute(SDK.Cookie.Attributes.SourceScheme, data[SDK.Cookie.Attributes.SourceScheme]);
    }
    if (SDK.Cookie.Attributes.SourcePort in data) {
      cookie.addAttribute(
          SDK.Cookie.Attributes.SourcePort, Number.parseInt(data[SDK.Cookie.Attributes.SourcePort], 10) || undefined);
    }
    if (data[SDK.Cookie.Attributes.PartitionKey]) {
      cookie.addAttribute(SDK.Cookie.Attributes.PartitionKey, data[SDK.Cookie.Attributes.PartitionKey]);
    }
    cookie.setSize(data[SDK.Cookie.Attributes.Name].length + data[SDK.Cookie.Attributes.Value].length);
    return cookie;
  }

  private isValidCookieData(data: {[x: string]: string}): boolean {
    return (Boolean(data.name) || Boolean(data.value)) && this.isValidDomain(data.domain) &&
        this.isValidPath(data.path) && this.isValidDate(data.expires);
  }

  private isValidDomain(domain: string): boolean {
    if (!domain) {
      return true;
    }
    const parsedURL = Common.ParsedURL.ParsedURL.fromString('http://' + domain);
    return parsedURL !== null && parsedURL.domain() === domain;
  }

  private isValidPath(path: string): boolean {
    const parsedURL = Common.ParsedURL.ParsedURL.fromString('http://example.com' + path);
    return parsedURL !== null && parsedURL.path === path;
  }

  private isValidDate(date: string): boolean {
    return date === '' || date === expiresSessionValue() || !isNaN(Date.parse(date));
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
    });
    if (IssuesManager.RelatedIssue.hasIssues(cookie)) {
      contextMenu.revealSection().appendItem(i18nString(UIStrings.showIssueAssociatedWithThis), () => {
        // TODO(chromium:1077719): Just filter for the cookie instead of revealing one of the associated issues.
        void IssuesManager.RelatedIssue.reveal(cookie);
      });
    }
  }
}

export class DataGridNode extends DataGrid.DataGrid.DataGridNode<DataGridNode> {
  cookie: SDK.Cookie.Cookie;
  private readonly blockedReasons: SDK.CookieModel.BlockedReason[]|null;
  private expiresTooltip?: Platform.UIString.LocalizedString;

  constructor(
      data: {[x: string]: string|number|boolean}, cookie: SDK.Cookie.Cookie,
      blockedReasons: SDK.CookieModel.BlockedReason[]|null) {
    super(data);
    this.cookie = cookie;
    this.blockedReasons = blockedReasons;
  }

  createCells(element: Element): void {
    super.createCells(element);
    if (this.blockedReasons && this.blockedReasons.length) {
      element.classList.add('flagged-cookie-attribute-row');
    }
  }

  setExpiresTooltip(tooltip: Platform.UIString.LocalizedString): void {
    this.expiresTooltip = tooltip;
  }

  createCell(columnId: string): HTMLElement {
    const cell = super.createCell(columnId);
    if (columnId === SDK.Cookie.Attributes.SourcePort) {
      UI.Tooltip.Tooltip.install(cell, i18nString(UIStrings.sourcePortTooltip));
    } else if (columnId === SDK.Cookie.Attributes.SourceScheme) {
      UI.Tooltip.Tooltip.install(cell, i18nString(UIStrings.sourceSchemeTooltip));
    } else if (columnId === SDK.Cookie.Attributes.Expires && this.expiresTooltip) {
      UI.Tooltip.Tooltip.install(cell, this.expiresTooltip);
    } else {
      UI.Tooltip.Tooltip.install(cell, cell.textContent || '');
    }

    let blockedReasonString = '';
    if (this.blockedReasons) {
      for (const blockedReason of this.blockedReasons) {
        const attributeMatches = blockedReason.attribute === columnId as string;
        const useNameColumn = !blockedReason.attribute && columnId === SDK.Cookie.Attributes.Name;
        if (attributeMatches || useNameColumn) {
          if (blockedReasonString) {
            blockedReasonString += '\n';
          }
          blockedReasonString += blockedReason.uiString;
        }
      }
    }

    if (blockedReasonString) {
      const infoElement = UI.Icon.Icon.create('smallicon-info', 'cookie-warning-icon');
      UI.Tooltip.Tooltip.install(infoElement, blockedReasonString);
      cell.insertBefore(infoElement, cell.firstChild);
      cell.classList.add('flagged-cookie-attribute-cell');
    }

    return cell;
  }
}
