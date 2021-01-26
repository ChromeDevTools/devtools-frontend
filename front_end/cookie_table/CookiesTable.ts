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

/* eslint-disable rulesdir/no_underscored_properties */

import * as BrowserSDK from '../browser_sdk/browser_sdk.js';
import * as Common from '../common/common.js';
import * as DataGrid from '../data_grid/data_grid.js';
import * as i18n from '../i18n/i18n.js';
import * as Platform from '../platform/platform.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

export const UIStrings = {
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
};
const str_ = i18n.i18n.registerUIStrings('cookie_table/CookiesTable.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const expiresSessionValue = i18nString(UIStrings.session);

export class CookiesTable extends UI.Widget.VBox {
  _saveCallback?: ((arg0: SDK.Cookie.Cookie, arg1: SDK.Cookie.Cookie|null) => Promise<boolean>);
  _refreshCallback?: (() => void)|undefined;
  _deleteCallback?: ((arg0: SDK.Cookie.Cookie, arg1: () => void) => void);
  _dataGrid: DataGrid.DataGrid.DataGridImpl<DataGridNode>;
  _lastEditedColumnId: string|null;
  _data: {folderName: string|null; cookies: Array<SDK.Cookie.Cookie>| null;}[];
  _cookieDomain: string;
  _cookieToBlockedReasons: Map<SDK.Cookie.Cookie, SDK.CookieModel.BlockedReason[]>|null;
  constructor(
      renderInline?: boolean,
      saveCallback?: ((arg0: SDK.Cookie.Cookie, arg1: SDK.Cookie.Cookie|null) => Promise<boolean>),
      refreshCallback?: (() => void), selectedCallback?: (() => void),
      deleteCallback?: ((arg0: SDK.Cookie.Cookie, arg1: () => void) => void)) {
    super();

    this.registerRequiredCSS('cookie_table/cookiesTable.css', {enableLegacyPatching: true});
    this.element.classList.add('cookies-table');

    this._saveCallback = saveCallback;
    this._refreshCallback = refreshCallback;
    this._deleteCallback = deleteCallback;

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
        id: SDK.Cookie.Attributes.SameParty,
        title: 'SameParty',
        sortable: true,
        align: DataGrid.DataGrid.Align.Center,
        weight: 7,
        dataType: DataGrid.DataGrid.DataType.Boolean,
        editable: false,
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

    if (editable) {
      this._dataGrid = new DataGrid.DataGrid.DataGridImpl({
        displayName: i18nString(UIStrings.editableCookies),
        columns,
        editCallback: this._onUpdateCookie.bind(this),
        deleteCallback: this._onDeleteCookie.bind(this),
        refreshCallback,
      });
    } else {
      this._dataGrid = new DataGrid.DataGrid.DataGridImpl({
        displayName: i18nString(UIStrings.cookies),
        columns,
        editCallback: undefined,
        deleteCallback: undefined,
        refreshCallback: undefined,
      });
    }
    this._dataGrid.setStriped(true);
    this._dataGrid.setName('cookiesTable');
    this._dataGrid.addEventListener(DataGrid.DataGrid.Events.SortingChanged, this._rebuildTable, this);
    this._dataGrid.setRowContextMenuCallback(this._populateContextMenu.bind(this));
    if (renderInline) {
      this._dataGrid.renderInline();
    }

    if (selectedCallback) {
      this._dataGrid.addEventListener(DataGrid.DataGrid.Events.SelectedNode, selectedCallback, this);
    }

    this._lastEditedColumnId = null;

    this._dataGrid.asWidget().show(this.element);

    this._data = [];

    this._cookieDomain = '';

    this._cookieToBlockedReasons = null;
  }

  setCookies(
      cookies: SDK.Cookie.Cookie[],
      cookieToBlockedReasons?: Map<SDK.Cookie.Cookie, SDK.CookieModel.BlockedReason[]>): void {
    this.setCookieFolders([{cookies: cookies, folderName: null}], cookieToBlockedReasons);
  }

  setCookieFolders(
      cookieFolders: {folderName: string|null; cookies: Array<SDK.Cookie.Cookie>| null;}[],
      cookieToBlockedReasons?: Map<SDK.Cookie.Cookie, SDK.CookieModel.BlockedReason[]>): void {
    this._data = cookieFolders;
    this._cookieToBlockedReasons = cookieToBlockedReasons || null;
    this._rebuildTable();
  }

  setCookieDomain(cookieDomain: string): void {
    this._cookieDomain = cookieDomain;
  }

  selectedCookie(): SDK.Cookie.Cookie|null {
    const node = this._dataGrid.selectedNode as DataGridNode | null;
    return node ? node.cookie : null;
  }

  _getSelectionCookies(): {current: SDK.Cookie.Cookie|null; neighbor: SDK.Cookie.Cookie | null;} {
    const node = this._dataGrid.selectedNode as DataGridNode | null;
    const nextNeighbor = node && node.traverseNextNode(true) as DataGridNode | null;
    const previousNeighbor = node && node.traversePreviousNode(true) as DataGridNode | null;

    return {
      current: node && node.cookie,
      neighbor: (nextNeighbor && nextNeighbor.cookie) || (previousNeighbor && previousNeighbor.cookie),
    };
  }

  willHide(): void {
    this._lastEditedColumnId = null;
  }

  _findSelectedCookie(
      selectionCookies: {current: SDK.Cookie.Cookie|null; neighbor: SDK.Cookie.Cookie | null;},
      cookies: SDK.Cookie.Cookie[]|null): SDK.Cookie.Cookie|null {
    if (!cookies) {
      return null;
    }

    const current = selectionCookies.current;
    const foundCurrent = cookies.find(cookie => this._isSameCookie(cookie, current));
    if (foundCurrent) {
      return foundCurrent;
    }

    const neighbor = selectionCookies.neighbor;
    const foundNeighbor = cookies.find(cookie => this._isSameCookie(cookie, neighbor));
    if (foundNeighbor) {
      return foundNeighbor;
    }

    return null;
  }

  _isSameCookie(cookieA: SDK.Cookie.Cookie, cookieB: SDK.Cookie.Cookie|null|undefined): boolean {
    return cookieB !== null && cookieB !== undefined && cookieB.name() === cookieA.name() &&
        cookieB.domain() === cookieA.domain() && cookieB.path() === cookieA.path();
  }

  _rebuildTable(): void {
    const selectionCookies = this._getSelectionCookies();
    const lastEditedColumnId = this._lastEditedColumnId;
    this._lastEditedColumnId = null;
    this._dataGrid.rootNode().removeChildren();
    for (let i = 0; i < this._data.length; ++i) {
      const item = this._data[i];
      const selectedCookie = this._findSelectedCookie(selectionCookies, item.cookies);
      if (item.folderName) {
        const groupData = {} as {
          [x: string]: string|number;
        };
        groupData[SDK.Cookie.Attributes.Name] = item.folderName;
        groupData[SDK.Cookie.Attributes.Value] = '';
        groupData[SDK.Cookie.Attributes.Size] = this._totalSize(item.cookies);
        groupData[SDK.Cookie.Attributes.Domain] = '';
        groupData[SDK.Cookie.Attributes.Path] = '';
        groupData[SDK.Cookie.Attributes.Expires] = '';
        groupData[SDK.Cookie.Attributes.HttpOnly] = '';
        groupData[SDK.Cookie.Attributes.Secure] = '';
        groupData[SDK.Cookie.Attributes.SameSite] = '';
        groupData[SDK.Cookie.Attributes.SameParty] = '';
        groupData[SDK.Cookie.Attributes.Priority] = '';

        const groupNode = new DataGrid.DataGrid.DataGridNode(groupData) as DataGrid.DataGrid.DataGridNode<DataGridNode>;
        groupNode.selectable = true;
        this._dataGrid.rootNode().appendChild(groupNode);
        groupNode.element().classList.add('row-group');
        this._populateNode(groupNode, item.cookies, selectedCookie, lastEditedColumnId);
        groupNode.expand();
      } else {
        this._populateNode(this._dataGrid.rootNode(), item.cookies, selectedCookie, lastEditedColumnId);
      }
    }
    if (selectionCookies.current && lastEditedColumnId && !this._dataGrid.selectedNode) {
      this._addInactiveNode(this._dataGrid.rootNode(), selectionCookies.current, lastEditedColumnId);
    }
    if (this._saveCallback) {
      this._dataGrid.addCreationNode(false);
    }
  }

  _populateNode(
      parentNode: DataGrid.DataGrid.DataGridNode<DataGridNode>, cookies: SDK.Cookie.Cookie[]|null,
      selectedCookie: SDK.Cookie.Cookie|null, lastEditedColumnId: string|null): void {
    parentNode.removeChildren();
    if (!cookies) {
      return;
    }

    this._sortCookies(cookies);
    for (let i = 0; i < cookies.length; ++i) {
      const cookie = cookies[i];
      const cookieNode = this._createGridNode(cookie);
      parentNode.appendChild(cookieNode);
      if (this._isSameCookie(cookie, selectedCookie)) {
        cookieNode.select();
        if (lastEditedColumnId !== null) {
          this._dataGrid.startEditingNextEditableColumnOfDataGridNode(cookieNode, lastEditedColumnId);
        }
      }
    }
  }

  _addInactiveNode(
      parentNode: DataGrid.DataGrid.DataGridNode<DataGridNode>, cookie: SDK.Cookie.Cookie,
      editedColumnId: string|null): void {
    const cookieNode = this._createGridNode(cookie);
    parentNode.appendChild(cookieNode);
    cookieNode.select();
    cookieNode.setInactive(true);
    if (editedColumnId !== null) {
      this._dataGrid.startEditingNextEditableColumnOfDataGridNode(cookieNode, editedColumnId);
    }
  }
  _totalSize(cookies: SDK.Cookie.Cookie[]|null): number {
    let totalSize = 0;
    for (let i = 0; cookies && i < cookies.length; ++i) {
      totalSize += cookies[i].size();
    }
    return totalSize;
  }

  _sortCookies(cookies: SDK.Cookie.Cookie[]): void {
    const sortDirection = this._dataGrid.isSortOrderAscending() ? 1 : -1;

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
        case SDK.Cookie.Attributes.SameParty:
          return String(cookie.sameParty());
        default:
          return String(cookie.name());
      }
    }

    function compareTo(property: string, cookie1: SDK.Cookie.Cookie, cookie2: SDK.Cookie.Cookie): number {
      return sortDirection * Platform.StringUtilities.compare(getValue(cookie1, property), getValue(cookie2, property));
    }

    function numberCompare(cookie1: SDK.Cookie.Cookie, cookie2: SDK.Cookie.Cookie): number {
      return sortDirection * (cookie1.size() - cookie2.size());
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
    const columnId = this._dataGrid.sortColumnId() || SDK.Cookie.Attributes.Name;
    if (columnId === SDK.Cookie.Attributes.Expires) {
      comparator = expiresCompare;
    } else if (columnId === SDK.Cookie.Attributes.Size) {
      comparator = numberCompare;
    } else if (columnId === SDK.Cookie.Attributes.Priority) {
      comparator = priorityCompare;
    } else {
      comparator = compareTo.bind(null, columnId);
    }
    cookies.sort(comparator);
  }

  _createGridNode(cookie: SDK.Cookie.Cookie): DataGridNode {
    const data = {} as {
      [x: string]: string|number|boolean;
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

    if (cookie.maxAge()) {
      data[SDK.Cookie.Attributes.Expires] = Number.secondsToString(Math.floor(cookie.maxAge()));
    } else if (cookie.expires()) {
      if (cookie.expires() < 0) {
        data[SDK.Cookie.Attributes.Expires] = expiresSessionValue;
      } else {
        data[SDK.Cookie.Attributes.Expires] = new Date(cookie.expires()).toISOString();
      }
    } else {
      data[SDK.Cookie.Attributes.Expires] =
          cookie.type() === SDK.Cookie.Type.Request ? i18nString(UIStrings.na) : expiresSessionValue;
    }

    data[SDK.Cookie.Attributes.Size] = cookie.size();
    data[SDK.Cookie.Attributes.HttpOnly] = cookie.httpOnly();
    data[SDK.Cookie.Attributes.Secure] = cookie.secure();
    data[SDK.Cookie.Attributes.SameSite] = cookie.sameSite() || '';
    data[SDK.Cookie.Attributes.SameParty] = cookie.sameParty();
    data[SDK.Cookie.Attributes.Priority] = cookie.priority() || '';

    const blockedReasons = this._cookieToBlockedReasons ? this._cookieToBlockedReasons.get(cookie) : null;
    const node = new DataGridNode(data, cookie, blockedReasons || null);
    node.selectable = true;
    return node;
  }

  _onDeleteCookie(node: DataGridNode): void {
    if (node.cookie && this._deleteCallback) {
      this._deleteCallback(node.cookie, () => this._refresh());
    }
  }

  _onUpdateCookie(editingNode: DataGridNode, columnIdentifier: string, _oldText: string, _newText: string): void {
    this._lastEditedColumnId = columnIdentifier;
    this._setDefaults(editingNode);
    if (this._isValidCookieData(editingNode.data)) {
      this._saveNode(editingNode);
    } else {
      editingNode.setDirty(true);
    }
  }

  _setDefaults(node: DataGridNode): void {
    if (node.data[SDK.Cookie.Attributes.Name] === null) {
      node.data[SDK.Cookie.Attributes.Name] = '';
    }
    if (node.data[SDK.Cookie.Attributes.Value] === null) {
      node.data[SDK.Cookie.Attributes.Value] = '';
    }
    if (node.data[SDK.Cookie.Attributes.Domain] === null) {
      node.data[SDK.Cookie.Attributes.Domain] = this._cookieDomain;
    }
    if (node.data[SDK.Cookie.Attributes.Path] === null) {
      node.data[SDK.Cookie.Attributes.Path] = '/';
    }
    if (node.data[SDK.Cookie.Attributes.Expires] === null) {
      node.data[SDK.Cookie.Attributes.Expires] = expiresSessionValue;
    }
  }

  _saveNode(node: DataGridNode): void {
    const oldCookie = node.cookie;
    const newCookie = this._createCookieFromData(node.data);
    node.cookie = newCookie;
    if (!this._saveCallback) {
      return;
    }
    this._saveCallback(newCookie, oldCookie).then(success => {
      if (success) {
        this._refresh();
      } else {
        node.setDirty(true);
      }
    });
  }

  _createCookieFromData(data: {[x: string]: string;}): SDK.Cookie.Cookie {
    const cookie = new SDK.Cookie.Cookie(
        data[SDK.Cookie.Attributes.Name], data[SDK.Cookie.Attributes.Value], null,
        data[SDK.Cookie.Attributes.Priority] as Protocol.Network.CookiePriority);

    cookie.addAttribute(SDK.Cookie.Attributes.Domain, data[SDK.Cookie.Attributes.Domain]);
    cookie.addAttribute(SDK.Cookie.Attributes.Path, data[SDK.Cookie.Attributes.Path]);
    if (data.expires && data.expires !== expiresSessionValue) {
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
    if (data[SDK.Cookie.Attributes.SameParty]) {
      cookie.addAttribute(SDK.Cookie.Attributes.SameParty);
    }
    cookie.setSize(data[SDK.Cookie.Attributes.Name].length + data[SDK.Cookie.Attributes.Value].length);
    return cookie;
  }

  _isValidCookieData(data: {[x: string]: string;}): boolean {
    return (Boolean(data.name) || Boolean(data.value)) && this._isValidDomain(data.domain) &&
        this._isValidPath(data.path) && this._isValidDate(data.expires);
  }

  _isValidDomain(domain: string): boolean {
    if (!domain) {
      return true;
    }
    const parsedURL = Common.ParsedURL.ParsedURL.fromString('http://' + domain);
    return parsedURL !== null && parsedURL.domain() === domain;
  }

  _isValidPath(path: string): boolean {
    const parsedURL = Common.ParsedURL.ParsedURL.fromString('http://example.com' + path);
    return parsedURL !== null && parsedURL.path === path;
  }

  _isValidDate(date: string): boolean {
    return date === '' || date === expiresSessionValue || !isNaN(Date.parse(date));
  }

  _refresh(): void {
    if (this._refreshCallback) {
      this._refreshCallback();
    }
  }

  _populateContextMenu(contextMenu: UI.ContextMenu.ContextMenu, gridNode: DataGrid.DataGrid.DataGridNode<DataGridNode>):
      void {
    const maybeCookie = (gridNode as DataGridNode).cookie;
    if (!maybeCookie) {
      return;
    }
    const cookie = maybeCookie;

    contextMenu.revealSection().appendItem(i18nString(UIStrings.showRequestsWithThisCookie), () => {
      const evt = new CustomEvent('networkrevealandfilter', {
        bubbles: true,
        composed: true,
        detail: [
          {
            filterType: 'cookie-domain',
            filterValue: cookie.domain(),
          },
          {
            filterType: 'cookie-name',
            filterValue: cookie.name(),
          },
        ],
      });

      this.element.dispatchEvent(evt);
    });
    if (BrowserSDK.RelatedIssue.hasIssues(cookie)) {
      contextMenu.revealSection().appendItem(i18nString(UIStrings.showIssueAssociatedWithThis), () => {
        // TODO(chromium:1077719): Just filter for the cookie instead of revealing one of the associated issues.
        BrowserSDK.RelatedIssue.reveal(cookie);
      });
    }
  }
}

export class DataGridNode extends DataGrid.DataGrid.DataGridNode<DataGridNode> {
  cookie: SDK.Cookie.Cookie;
  _blockedReasons: SDK.CookieModel.BlockedReason[]|null;
  constructor(
      data: {[x: string]: string|number|boolean;}, cookie: SDK.Cookie.Cookie,
      blockedReasons: SDK.CookieModel.BlockedReason[]|null) {
    super(data);
    this.cookie = cookie;
    this._blockedReasons = blockedReasons;
  }

  createCells(element: Element): void {
    super.createCells(element);
    if (this._blockedReasons && this._blockedReasons.length) {
      element.classList.add('flagged-cookie-attribute-row');
    }
  }

  createCell(columnId: string): HTMLElement {
    const cell = super.createCell(columnId);
    UI.Tooltip.Tooltip.install(cell, cell.textContent || '');

    let blockedReasonString = '';
    if (this._blockedReasons) {
      for (const blockedReason of this._blockedReasons) {
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
