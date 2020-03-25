// Copyright (c) 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as DataGrid from '../data_grid/data_grid.js';
import * as Formatter from '../formatter/formatter.js';
import * as TextUtils from '../text_utils/text_utils.js';
import * as UI from '../ui/ui.js';
import * as Workspace from '../workspace/workspace.js';

import {CoverageType, URLCoverageInfo} from './CoverageModel.js';  // eslint-disable-line no-unused-vars

export class CoverageListView extends UI.Widget.VBox {
  /**
   * @param {function(!URLCoverageInfo):boolean} filterCallback
   */
  constructor(filterCallback) {
    super(true);
    /** @type {!Map<!URLCoverageInfo, !GridNode>} */
    this._nodeForCoverageInfo = new Map();
    this._filterCallback = filterCallback;
    /** @type {?RegExp} */
    this._highlightRegExp = null;
    this.registerRequiredCSS('coverage/coverageListView.css');
    const columns = [
      {id: 'url', title: Common.UIString.UIString('URL'), width: '250px', fixedWidth: false, sortable: true},
      {id: 'type', title: Common.UIString.UIString('Type'), width: '45px', fixedWidth: true, sortable: true}, {
        id: 'size',
        title: Common.UIString.UIString('Total Bytes'),
        width: '60px',
        fixedWidth: true,
        sortable: true,
        align: DataGrid.DataGrid.Align.Right
      },
      {
        id: 'unusedSize',
        title: Common.UIString.UIString('Unused Bytes'),
        width: '100px',
        fixedWidth: true,
        sortable: true,
        align: DataGrid.DataGrid.Align.Right,
        sort: DataGrid.DataGrid.Order.Descending
      },
      {id: 'bars', title: ls`Usage Visualization`, width: '250px', fixedWidth: false, sortable: true}
    ];
    this._dataGrid = new DataGrid.SortableDataGrid.SortableDataGrid({displayName: ls`Code Coverage`, columns});
    this._dataGrid.setResizeMethod(DataGrid.DataGrid.ResizeMethod.Last);
    this._dataGrid.element.classList.add('flex-auto');
    this._dataGrid.element.addEventListener('keydown', this._onKeyDown.bind(this), false);
    this._dataGrid.addEventListener(DataGrid.DataGrid.Events.OpenedNode, this._onOpenedNode, this);
    this._dataGrid.addEventListener(DataGrid.DataGrid.Events.SortingChanged, this._sortingChanged, this);

    const dataGridWidget = this._dataGrid.asWidget();
    dataGridWidget.show(this.contentElement);
    this.setDefaultFocusedChild(dataGridWidget);
  }

  /**
   * @param {!Array<!URLCoverageInfo>} coverageInfo
   */
  update(coverageInfo) {
    let hadUpdates = false;
    const maxSize = coverageInfo.reduce((acc, entry) => Math.max(acc, entry.size()), 0);
    const rootNode = this._dataGrid.rootNode();
    for (const entry of coverageInfo) {
      let node = this._nodeForCoverageInfo.get(entry);
      if (node) {
        if (this._filterCallback(node._coverageInfo)) {
          hadUpdates = node._refreshIfNeeded(maxSize) || hadUpdates;
        }
        continue;
      }
      node = new GridNode(entry, maxSize);
      this._nodeForCoverageInfo.set(entry, node);
      if (this._filterCallback(node._coverageInfo)) {
        rootNode.appendChild(node);
        hadUpdates = true;
      }
    }
    if (hadUpdates) {
      this._sortingChanged();
    }
  }

  reset() {
    this._nodeForCoverageInfo.clear();
    this._dataGrid.rootNode().removeChildren();
  }

  /**
   * @param {?RegExp} highlightRegExp
   */
  updateFilterAndHighlight(highlightRegExp) {
    this._highlightRegExp = highlightRegExp;
    let hadTreeUpdates = false;
    for (const node of this._nodeForCoverageInfo.values()) {
      const shouldBeVisible = this._filterCallback(node._coverageInfo);
      const isVisible = !!node.parent;
      if (shouldBeVisible) {
        node._setHighlight(this._highlightRegExp);
      }
      if (shouldBeVisible === isVisible) {
        continue;
      }
      hadTreeUpdates = true;
      if (!shouldBeVisible) {
        node.remove();
      } else {
        this._dataGrid.rootNode().appendChild(node);
      }
    }
    if (hadTreeUpdates) {
      this._sortingChanged();
    }
  }

  selectByUrl(url) {
    for (const [info, node] of this._nodeForCoverageInfo.entries()) {
      if (info.url() === url) {
        node.revealAndSelect();
        break;
      }
    }
  }

  _onOpenedNode() {
    this._revealSourceForSelectedNode();
  }

  /**
   * @param {!Event} event
   */
  _onKeyDown(event) {
    if (!isEnterKey(event)) {
      return;
    }
    event.consume(true);
    this._revealSourceForSelectedNode();
  }

  async _revealSourceForSelectedNode() {
    const node = this._dataGrid.selectedNode;
    if (!node) {
      return;
    }
    const coverageInfo = /** @type {!GridNode} */ (node)._coverageInfo;
    let sourceCode = Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(coverageInfo.url());
    if (!sourceCode) {
      return;
    }

    const formatData = await Formatter.sourceFormatter.format(sourceCode);
    sourceCode = formatData.formattedSourceCode;

    if (this._dataGrid.selectedNode !== node) {
      return;
    }
    Common.Revealer.reveal(sourceCode);
  }

  _sortingChanged() {
    const columnId = this._dataGrid.sortColumnId();
    if (!columnId) {
      return;
    }
    let sortFunction;
    switch (columnId) {
      case 'url':
        sortFunction = compareURL;
        break;
      case 'type':
        sortFunction = compareType;
        break;
      case 'size':
        sortFunction = compareNumericField.bind(null, 'size');
        break;
      case 'bars':
      case 'unusedSize':
        sortFunction = compareNumericField.bind(null, 'unusedSize');
        break;
      default:
        console.assert(false, 'Unknown sort field: ' + columnId);
        return;
    }

    this._dataGrid.sortNodes(sortFunction, !this._dataGrid.isSortOrderAscending());

    /**
     * @param {!DataGrid.DataGrid.DataGridNode} a
     * @param {!DataGrid.DataGrid.DataGridNode} b
     * @return {number}
     */
    function compareURL(a, b) {
      const nodeA = /** @type {!GridNode} */ (a);
      const nodeB = /** @type {!GridNode} */ (b);

      return nodeA._url.localeCompare(nodeB._url);
    }

    /**
     * @param {string} fieldName
     * @param {!DataGrid.DataGrid.DataGridNode} a
     * @param {!DataGrid.DataGrid.DataGridNode} b
     * @return {number}
     */
    function compareNumericField(fieldName, a, b) {
      const nodeA = /** @type {!GridNode} */ (a);
      const nodeB = /** @type {!GridNode} */ (b);

      return nodeA._coverageInfo[fieldName]() - nodeB._coverageInfo[fieldName]() || compareURL(a, b);
    }

    /**
     * @param {!DataGrid.DataGrid.DataGridNode} a
     * @param {!DataGrid.DataGrid.DataGridNode} b
     * @return {number}
     */
    function compareType(a, b) {
      const nodeA = /** @type {!GridNode} */ (a);
      const nodeB = /** @type {!GridNode} */ (b);
      const typeA = CoverageListView._typeToString(nodeA._coverageInfo.type());
      const typeB = CoverageListView._typeToString(nodeB._coverageInfo.type());
      return typeA.localeCompare(typeB) || compareURL(a, b);
    }
  }

  /**
   * @param {!CoverageType} type
   */
  static _typeToString(type) {
    const types = [];
    if (type & CoverageType.CSS) {
      types.push(Common.UIString.UIString('CSS'));
    }
    if (type & CoverageType.JavaScriptPerFunction) {
      types.push(Common.UIString.UIString('JS (per function)'));
    } else if (type & CoverageType.JavaScript) {
      types.push(Common.UIString.UIString('JS (per block)'));
    }
    return types.join('+');
  }
}

export class GridNode extends DataGrid.SortableDataGrid.SortableDataGridNode {
  /**
   * @param {!URLCoverageInfo} coverageInfo
   * @param {number} maxSize
   */
  constructor(coverageInfo, maxSize) {
    super();
    this._coverageInfo = coverageInfo;
    /** @type {number|undefined} */
    this._lastUsedSize;
    this._url = coverageInfo.url();
    this._maxSize = maxSize;
    this._highlightDOMChanges = [];
    /** @type {?RegExp} */
    this._highlightRegExp = null;
  }

  /**
   * @param {?RegExp} highlightRegExp
   */
  _setHighlight(highlightRegExp) {
    if (this._highlightRegExp === highlightRegExp) {
      return;
    }
    this._highlightRegExp = highlightRegExp;
    this.refresh();
  }

  /**
   * @param {number} maxSize
   * @return {boolean}
   */
  _refreshIfNeeded(maxSize) {
    if (this._lastUsedSize === this._coverageInfo.usedSize() && maxSize === this._maxSize) {
      return false;
    }
    this._lastUsedSize = this._coverageInfo.usedSize();
    this._maxSize = maxSize;
    this.refresh();
    return true;
  }

  /**
   * @override
   * @param {string} columnId
   * @return {!Element}
   */
  createCell(columnId) {
    const cell = this.createTD(columnId);
    switch (columnId) {
      case 'url': {
        cell.title = this._url;
        const outer = cell.createChild('div', 'url-outer');
        const prefix = outer.createChild('div', 'url-prefix');
        const suffix = outer.createChild('div', 'url-suffix');
        const splitURL = /^(.*)(\/[^/]*)$/.exec(this._url);
        prefix.textContent = splitURL ? splitURL[1] : this._url;
        suffix.textContent = splitURL ? splitURL[2] : '';
        if (this._highlightRegExp) {
          this._highlight(outer, this._url);
        }
        this.setCellAccessibleName(this._url, cell, columnId);
        break;
      }
      case 'type': {
        cell.textContent = CoverageListView._typeToString(this._coverageInfo.type());
        if (this._coverageInfo.type() & CoverageType.JavaScriptPerFunction) {
          cell.title = ls
          `JS coverage with per function granularity: Once a function was executed, the whole function is marked as covered.`;
        } else if (this._coverageInfo.type() & CoverageType.JavaScript) {
          cell.title = ls
          `JS coverage with per block granularity: Once a block of JavaScript was executed, that block is marked as covered.`;
        }
        break;
      }
      case 'size': {
        const sizeSpan = cell.createChild('span');
        sizeSpan.textContent = Number.withThousandsSeparator(this._coverageInfo.size() || 0);
        const sizeAccessibleName =
            (this._coverageInfo.size() === 1) ? ls`1 byte` : ls`${this._coverageInfo.size() || 0} bytes`;
        this.setCellAccessibleName(sizeAccessibleName, cell, columnId);
        break;
      }
      case 'unusedSize': {
        const unusedSize = this._coverageInfo.unusedSize() || 0;
        const unusedSizeSpan = cell.createChild('span');
        const unusedPercentsSpan = cell.createChild('span', 'percent-value');
        unusedSizeSpan.textContent = Number.withThousandsSeparator(unusedSize);
        const unusedPercentFormatted = ls`${this._percentageString(this._coverageInfo.unusedPercentage())} %`;
        unusedPercentsSpan.textContent = unusedPercentFormatted;
        const unusedAccessibleName = (unusedSize === 1) ? ls`1 byte, ${unusedPercentFormatted}` :
                                                          ls`${unusedSize} bytes, ${unusedPercentFormatted}`;
        this.setCellAccessibleName(unusedAccessibleName, cell, columnId);
        break;
      }
      case 'bars': {
        const barContainer = cell.createChild('div', 'bar-container');
        const unusedPercent = this._percentageString(this._coverageInfo.unusedPercentage());
        const usedPercent = this._percentageString(this._coverageInfo.usedPercentage());
        if (this._coverageInfo.unusedSize() > 0) {
          const unusedSizeBar = barContainer.createChild('div', 'bar bar-unused-size');
          unusedSizeBar.style.width = ((this._coverageInfo.unusedSize() / this._maxSize) * 100 || 0) + '%';
          if (this._coverageInfo.type() & CoverageType.JavaScriptPerFunction) {
            unusedSizeBar.title = ls`${this._coverageInfo.unusedSize()} bytes (${
                unusedPercent} %) belong to functions that have not (yet) been executed.`;
          } else if (this._coverageInfo.type() & CoverageType.JavaScript) {
            unusedSizeBar.title = ls`${this._coverageInfo.unusedSize()} bytes (${
                unusedPercent} %) belong to blocks of JavaScript that have not (yet) been executed.`;
          }
        }
        if (this._coverageInfo.usedSize() > 0) {
          const usedSizeBar = barContainer.createChild('div', 'bar bar-used-size');
          usedSizeBar.style.width = ((this._coverageInfo.usedSize() / this._maxSize) * 100 || 0) + '%';
          if (this._coverageInfo.type() & CoverageType.JavaScriptPerFunction) {
            usedSizeBar.title = ls`${this._coverageInfo.usedSize()} bytes (${
                usedPercent} %) belong to functions that have executed at least once.`;
          } else if (this._coverageInfo.type() & CoverageType.JavaScript) {
            usedSizeBar.title = ls`${this._coverageInfo.usedSize()} bytes (${
                usedPercent} %) belong to blocks of JavaScript that have executed at least once.`;
          }
        }
        this.setCellAccessibleName(
            ls`${unusedPercent} % of file unused, ${usedPercent} % of file used`, cell, columnId);
      }
    }
    return cell;
  }

  /**
   * @param {number} value
   * @return {string}
   */
  _percentageString(value) {
    return value.toFixed(1);
  }

  /**
   * @param {!Element} element
   * @param {string} textContent
   */
  _highlight(element, textContent) {
    const matches = this._highlightRegExp.exec(textContent);
    if (!matches || !matches.length) {
      return;
    }
    const range = new TextUtils.TextRange.SourceRange(matches.index, matches[0].length);
    UI.UIUtils.highlightRangesWithStyleClass(element, [range], 'filter-highlight');
  }
}
