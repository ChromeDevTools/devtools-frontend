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

import * as Common from '../common/common.js';
import * as DataGrid from '../data_grid/data_grid.js';
import * as Network from '../network/network.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

const expiresSessionValue = Common.UIString.UIString('Session');

/**
 * @unrestricted
 */
export class CookiesTable extends UI.Widget.VBox {
  /**
   * @param {boolean=} renderInline
   * @param {function(!SDK.Cookie.Cookie, ?SDK.Cookie.Cookie): !Promise<boolean>=} saveCallback
   * @param {function()=} refreshCallback
   * @param {function()=} selectedCallback
   * @param {function(!SDK.Cookie.Cookie, function())=} deleteCallback
   */
  constructor(renderInline, saveCallback, refreshCallback, selectedCallback, deleteCallback) {
    super();

    this.registerRequiredCSS('cookie_table/cookiesTable.css');
    this.element.classList.add('cookies-table');


    this._saveCallback = saveCallback;
    this._refreshCallback = refreshCallback;
    this._deleteCallback = deleteCallback;

    const editable = !!saveCallback;

    const columns = /** @type {!Array<!DataGrid.DataGrid.ColumnDescriptor>} */ ([
      {
        id: SDK.Cookie.Attributes.Name,
        title: ls`Name`,
        sortable: true,
        disclosure: editable,
        sort: DataGrid.DataGrid.Order.Ascending,
        longText: true,
        weight: 24,
        editable: editable
      },
      {
        id: SDK.Cookie.Attributes.Value,
        title: ls`Value`,
        sortable: true,
        longText: true,
        weight: 34,
        editable: editable,
      },
      {id: SDK.Cookie.Attributes.Domain, title: ls`Domain`, sortable: true, weight: 7, editable: editable},
      {id: SDK.Cookie.Attributes.Path, title: ls`Path`, sortable: true, weight: 7, editable: editable},
      {id: SDK.Cookie.Attributes.Expires, title: ls`Expires / Max-Age`, sortable: true, weight: 7, editable: editable},
      {
        id: SDK.Cookie.Attributes.Size,
        title: ls`Size`,
        sortable: true,
        align: DataGrid.DataGrid.Align.Right,
        weight: 7,
      },
      {
        id: SDK.Cookie.Attributes.HttpOnly,
        title: ls`HttpOnly`,
        sortable: true,
        align: DataGrid.DataGrid.Align.Center,
        weight: 7,
        dataType: DataGrid.DataGrid.DataType.Boolean,
        editable,
      },
      {
        id: SDK.Cookie.Attributes.Secure,
        title: ls`Secure`,
        sortable: true,
        align: DataGrid.DataGrid.Align.Center,
        weight: 7,
        dataType: DataGrid.DataGrid.DataType.Boolean,
        editable,
      },
      {
        id: SDK.Cookie.Attributes.SameSite,
        title: ls`SameSite`,
        sortable: true,
        weight: 7,
        editable: editable,
      },
      {
        id: SDK.Cookie.Attributes.Priority,
        title: ls`Priority`,
        sortable: true,
        sort: DataGrid.DataGrid.Order.Descending,
        weight: 7,
        editable: editable,
      },
    ]);

    if (editable) {
      this._dataGrid = new DataGrid.DataGrid.DataGridImpl({
        displayName: ls`Editable Cookies`,
        columns,
        editCallback: this._onUpdateCookie.bind(this),
        deleteCallback: this._onDeleteCookie.bind(this),
        refreshCallback
      });
    } else {
      this._dataGrid = new DataGrid.DataGrid.DataGridImpl({displayName: ls`Cookies`, columns});
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

    /** @type {?string} */
    this._lastEditedColumnId = null;

    this._dataGrid.asWidget().show(this.element);
    this._data = [];

    /** @type {string} */
    this._cookieDomain = '';

    /** @type {?Map<!SDK.Cookie.Cookie, !Array<!SDK.CookieModel.BlockedReason>>} */
    this._cookieToBlockedReasons = null;
  }

  /**
   * @param {!Array.<!SDK.Cookie.Cookie>} cookies
   * @param {!Map<!SDK.Cookie.Cookie, !Array<!SDK.CookieModel.BlockedReason>>=} cookieToBlockedReasons
   */
  setCookies(cookies, cookieToBlockedReasons) {
    this.setCookieFolders([{cookies: cookies}], cookieToBlockedReasons);
  }

  /**
   * @param {!Array.<!{folderName: ?string, cookies: ?Array.<!SDK.Cookie.Cookie>}>} cookieFolders
   * @param {!Map<!SDK.Cookie.Cookie, !Array<!SDK.CookieModel.BlockedReason>>=} cookieToBlockedReasons
   */
  setCookieFolders(cookieFolders, cookieToBlockedReasons) {
    this._data = cookieFolders;
    this._cookieToBlockedReasons = cookieToBlockedReasons || null;
    this._rebuildTable();
  }

  /**
   * @param {string} cookieDomain
   */
  setCookieDomain(cookieDomain) {
    this._cookieDomain = cookieDomain;
  }

  /**
   * @return {?SDK.Cookie.Cookie}
   */
  selectedCookie() {
    const node = this._dataGrid.selectedNode;
    return node ? node.cookie : null;
  }

  /**
   * @return {{current: ?SDK.Cookie.Cookie, neighbor: ?SDK.Cookie.Cookie}}
   */
  _getSelectionCookies() {
    const node = this._dataGrid.selectedNode;
    const nextNeighbor = node && node.traverseNextNode(true);
    const previousNeighbor = node && node.traversePreviousNode(true);

    return {
      current: node && node.cookie,
      neighbor: (nextNeighbor && nextNeighbor.cookie) || (previousNeighbor && previousNeighbor.cookie)
    };
  }

  /**
   * @override
   */
  willHide() {
    this._lastEditedColumnId = null;
  }

  /**
   * @param {{current: ?SDK.Cookie.Cookie, neighbor: ?SDK.Cookie.Cookie}} selectionCookies
   * @param {?Array<!SDK.Cookie.Cookie>} cookies
   * @return {?SDK.Cookie.Cookie}
   */
  _findSelectedCookie(selectionCookies, cookies) {
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

  /**
   * @param {!SDK.Cookie.Cookie} cookieA
   * @param {?SDK.Cookie.Cookie} cookieB
   * @return {boolean}
   */
  _isSameCookie(cookieA, cookieB) {
    return !!cookieB && cookieB.name() === cookieA.name() && cookieB.domain() === cookieA.domain() &&
        cookieB.path() === cookieA.path();
  }

  _rebuildTable() {
    const selectionCookies = this._getSelectionCookies();
    const lastEditedColumnId = this._lastEditedColumnId;
    this._lastEditedColumnId = null;
    this._dataGrid.rootNode().removeChildren();
    for (let i = 0; i < this._data.length; ++i) {
      const item = this._data[i];
      const selectedCookie = this._findSelectedCookie(selectionCookies, item.cookies);
      if (item.folderName) {
        const groupData = {};
        groupData[SDK.Cookie.Attributes.Name] = item.folderName;
        groupData[SDK.Cookie.Attributes.Value] = '';
        groupData[SDK.Cookie.Attributes.Size] = this._totalSize(item.cookies);
        groupData[SDK.Cookie.Attributes.Domain] = '';
        groupData[SDK.Cookie.Attributes.Path] = '';
        groupData[SDK.Cookie.Attributes.Expires] = '';
        groupData[SDK.Cookie.Attributes.HttpOnly] = '';
        groupData[SDK.Cookie.Attributes.Secure] = '';
        groupData[SDK.Cookie.Attributes.SameSite] = '';
        groupData[SDK.Cookie.Attributes.Priority] = '';

        const groupNode = new DataGrid.DataGrid.DataGridNode(groupData);
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

  /**
   * @param {!DataGrid.DataGrid.DataGridNode} parentNode
   * @param {?Array.<!SDK.Cookie.Cookie>} cookies
   * @param {?SDK.Cookie.Cookie} selectedCookie
   * @param {?string} lastEditedColumnId
   */
  _populateNode(parentNode, cookies, selectedCookie, lastEditedColumnId) {
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

  /**
   * @param {!DataGrid.DataGrid.DataGridNode} parentNode
   * @param {!SDK.Cookie.Cookie} cookie
   * @param {?string} editedColumnId
   */
  _addInactiveNode(parentNode, cookie, editedColumnId) {
    const cookieNode = this._createGridNode(cookie);
    parentNode.appendChild(cookieNode);
    cookieNode.select();
    cookieNode.setInactive(true);
    if (editedColumnId !== null) {
      this._dataGrid.startEditingNextEditableColumnOfDataGridNode(cookieNode, editedColumnId);
    }
  }

  _totalSize(cookies) {
    let totalSize = 0;
    for (let i = 0; cookies && i < cookies.length; ++i) {
      totalSize += cookies[i].size();
    }
    return totalSize;
  }

  /**
   * @param {!Array.<!SDK.Cookie.Cookie>} cookies
   */
  _sortCookies(cookies) {
    const sortDirection = this._dataGrid.isSortOrderAscending() ? 1 : -1;

    /**
     * @param {!SDK.Cookie.Cookie} cookie
     * @param {string} property
     * @return {string}
     */
    function getValue(cookie, property) {
      return typeof cookie[property] === 'function' ? String(cookie[property]()) : String(cookie.name());
    }

    /**
     * @param {string} property
     * @param {!SDK.Cookie.Cookie} cookie1
     * @param {!SDK.Cookie.Cookie} cookie2
     * @return {number}
     */
    function compareTo(property, cookie1, cookie2) {
      return sortDirection * getValue(cookie1, property).compareTo(getValue(cookie2, property));
    }

    /**
     * @param {!SDK.Cookie.Cookie} cookie1
     * @param {!SDK.Cookie.Cookie} cookie2
     * @return {number}
     */
    function numberCompare(cookie1, cookie2) {
      return sortDirection * (cookie1.size() - cookie2.size());
    }

    /**
     * @param {!SDK.Cookie.Cookie} cookie1
     * @param {!SDK.Cookie.Cookie} cookie2
     * @return {number}
     */
    function priorityCompare(cookie1, cookie2) {
      const priorities = [
        Protocol.Network.CookiePriority.Low,
        Protocol.Network.CookiePriority.Medium,
        Protocol.Network.CookiePriority.High,
      ];

      const priority1 = priorities.indexOf(cookie1.priority());
      const priority2 = priorities.indexOf(cookie2.priority());
      return sortDirection * (priority1 - priority2);
    }

    /**
     * @param {!SDK.Cookie.Cookie} cookie1
     * @param {!SDK.Cookie.Cookie} cookie2
     * @return {number}
     */
    function expiresCompare(cookie1, cookie2) {
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
    const columnId = this._dataGrid.sortColumnId() || 'name';
    if (columnId === 'expires') {
      comparator = expiresCompare;
    } else if (columnId === 'size') {
      comparator = numberCompare;
    } else if (columnId === 'priority') {
      comparator = priorityCompare;
    } else {
      comparator = compareTo.bind(null, columnId);
    }
    cookies.sort(comparator);
  }

  /**
   * @param {!SDK.Cookie.Cookie} cookie
   * @return {!DataGrid.DataGrid.DataGridNode}
   */
  _createGridNode(cookie) {
    const data = {};
    data[SDK.Cookie.Attributes.Name] = cookie.name();
    data[SDK.Cookie.Attributes.Value] = cookie.value();

    if (cookie.type() === SDK.Cookie.Type.Request) {
      data[SDK.Cookie.Attributes.Domain] = cookie.domain() ? cookie.domain() : ls`N/A`;
      data[SDK.Cookie.Attributes.Path] = cookie.path() ? cookie.path() : ls`N/A`;
    } else {
      data[SDK.Cookie.Attributes.Domain] = cookie.domain() || '';
      data[SDK.Cookie.Attributes.Path] = cookie.path() || '';
    }

    if (cookie.maxAge()) {
      data[SDK.Cookie.Attributes.Expires] = Number.secondsToString(parseInt(cookie.maxAge(), 10));
    } else if (cookie.expires()) {
      if (cookie.expires() < 0) {
        data[SDK.Cookie.Attributes.Expires] = expiresSessionValue;
      } else {
        data[SDK.Cookie.Attributes.Expires] = new Date(cookie.expires()).toISOString();
      }
    } else {
      data[SDK.Cookie.Attributes.Expires] = cookie.type() === SDK.Cookie.Type.Request ? ls`N/A` : expiresSessionValue;
    }

    data[SDK.Cookie.Attributes.Size] = cookie.size();
    data[SDK.Cookie.Attributes.HttpOnly] = cookie.httpOnly();
    data[SDK.Cookie.Attributes.Secure] = cookie.secure();
    data[SDK.Cookie.Attributes.SameSite] = cookie.sameSite() || '';
    data[SDK.Cookie.Attributes.Priority] = cookie.priority() || '';

    const node =
        new DataGridNode(data, cookie, this._cookieToBlockedReasons ? this._cookieToBlockedReasons.get(cookie) : null);
    node.selectable = true;
    return node;
  }

  /**
   * @param {!DataGrid.DataGrid.DataGridNode} node
   */
  _onDeleteCookie(node) {
    if (node.cookie && this._deleteCallback) {
      this._deleteCallback(node.cookie, () => this._refresh());
    }
  }

  /**
   * @param {!DataGrid.DataGrid.DataGridNode} editingNode
   * @param {string} columnIdentifier
   * @param {string} oldText
   * @param {string} newText
   */
  _onUpdateCookie(editingNode, columnIdentifier, oldText, newText) {
    this._lastEditedColumnId = columnIdentifier;
    this._setDefaults(editingNode);
    if (this._isValidCookieData(editingNode.data)) {
      this._saveNode(editingNode);
    } else {
      editingNode.setDirty(true);
    }
  }

  /**
   * @param {!DataGrid.DataGrid.DataGridNode} node
   */
  _setDefaults(node) {
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

  /**
   * @param {!DataGrid.DataGrid.DataGridNode} node
   */
  _saveNode(node) {
    const oldCookie = node.cookie;
    const newCookie = this._createCookieFromData(node.data);
    node.cookie = newCookie;
    this._saveCallback(newCookie, oldCookie).then(success => {
      if (success) {
        this._refresh();
      } else {
        node.setDirty(true);
      }
    });
  }

  /**
   * @param {!Object.<string, string>} data
   * @returns {!SDK.Cookie.Cookie}
   */
  _createCookieFromData(data) {
    const cookie = new SDK.Cookie.Cookie(
        data[SDK.Cookie.Attributes.Name], data[SDK.Cookie.Attributes.Value], null,
        /** @type {!Protocol.Network.CookiePriority} */ (data[SDK.Cookie.Attributes.Priority]));

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
    cookie.setSize(data[SDK.Cookie.Attributes.Name].length + data[SDK.Cookie.Attributes.Value].length);
    return cookie;
  }

  /**
   * @param {!Object.<string, *>} data
   * @returns {boolean}
   */
  _isValidCookieData(data) {
    return (data.name || data.value) && this._isValidDomain(data.domain) && this._isValidPath(data.path) &&
        this._isValidDate(data.expires);
  }

  /**
   * @param {string} domain
   * @returns {boolean}
   */
  _isValidDomain(domain) {
    if (!domain) {
      return true;
    }
    const parsedURL = Common.ParsedURL.ParsedURL.fromString('http://' + domain);
    return !!parsedURL && parsedURL.domain() === domain;
  }

  /**
   * @param {string} path
   * @returns {boolean}
   */
  _isValidPath(path) {
    const parsedURL = Common.ParsedURL.ParsedURL.fromString('http://example.com' + path);
    return !!parsedURL && parsedURL.path === path;
  }

  /**
   * @param {string} date
   * @returns {boolean}
   */
  _isValidDate(date) {
    return date === '' || date === expiresSessionValue || !isNaN(Date.parse(date));
  }

  _refresh() {
    if (this._refreshCallback) {
      this._refreshCallback();
    }
  }

  /**
   * @param {!UI.ContextMenu.ContextMenu} contextMenu
   * @param {!DataGrid.DataGrid.DataGridNode} gridNode
   */
  _populateContextMenu(contextMenu, gridNode) {
    const cookie = /** @type {!SDK.Cookie.Cookie} */ (gridNode.cookie);

    contextMenu.revealSection().appendItem(ls`Show Requests With This Cookie`, () => {
      Network.NetworkPanel.NetworkPanel.revealAndFilter([
        {
          filterType: 'cookie-domain',
          filterValue: cookie.domain(),
        },
        {
          filterType: 'cookie-name',
          filterValue: cookie.name(),
        }
      ]);
    });
  }
}

export class DataGridNode extends DataGrid.DataGrid.DataGridNode {
  /**
   * @param {!Object<string, *>} data
   * @param {!SDK.Cookie.Cookie} cookie
   * @param {?Array<!SDK.CookieModel.BlockedReason>} blockedReasons
   */
  constructor(data, cookie, blockedReasons) {
    super(data);
    this.cookie = cookie;
    this._blockedReasons = blockedReasons;
  }

  /**
   * @override
   * @param {!Element} element
   */
  createCells(element) {
    super.createCells(element);
    if (this._blockedReasons && this._blockedReasons.length) {
      element.classList.add('flagged-cookie-attribute-row');
    }
  }

  /**
   * @override
   * @param {string} columnId
   * @return {!Element}
   */
  createCell(columnId) {
    const cell = super.createCell(columnId);
    cell.title = cell.textContent;

    let blockedReasonString = '';
    if (this._blockedReasons) {
      for (const blockedReason of this._blockedReasons) {
        const attributeMatches = blockedReason.attribute === /** @type {!SDK.Cookie.Attributes} */ (columnId);
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
      infoElement.title = blockedReasonString;
      cell.insertBefore(infoElement, cell.firstChild);
      cell.classList.add('flagged-cookie-attribute-cell');
    }

    return cell;
  }
}
