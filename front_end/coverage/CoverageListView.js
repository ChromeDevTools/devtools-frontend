// Copyright (c) 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

import * as Common from '../common/common.js';
import * as DataGrid from '../data_grid/data_grid.js';
import * as Formatter from '../formatter/formatter.js';
import {ls} from '../platform/platform.js';
import * as TextUtils from '../text_utils/text_utils.js';
import * as UI from '../ui/ui.js';
import * as Workspace from '../workspace/workspace.js';

import {CoverageType, URLCoverageInfo} from './CoverageModel.js';  // eslint-disable-line no-unused-vars

/**
 * @param {!CoverageType} type
 * @returns {string}
 */
export function coverageTypeToString(type) {
  const types = [];
  if (type & CoverageType.CSS) {
    types.push(ls`CSS`);
  }
  if (type & CoverageType.JavaScriptPerFunction) {
    types.push(ls`JS (per function)`);
  } else if (type & CoverageType.JavaScript) {
    types.push(ls`JS (per block)`);
  }
  return types.join('+');
}

export class CoverageListView extends UI.Widget.VBox {
  /**
   * @param {function(!URLCoverageInfo):boolean} isVisibleFilter
   */
  constructor(isVisibleFilter) {
    super(true);
    /** @type {!Map<!URLCoverageInfo, !GridNode>} */
    this._nodeForCoverageInfo = new Map();
    this._isVisibleFilter = isVisibleFilter;
    /** @type {?RegExp} */
    this._highlightRegExp = null;
    this.registerRequiredCSS('coverage/coverageListView.css');
    const columns = [
      {id: 'url', title: ls`URL`, width: '250px', fixedWidth: false, sortable: true},
      {id: 'type', title: ls`Type`, width: '45px', fixedWidth: true, sortable: true}, {
        id: 'size',
        title: ls`Total Bytes`,
        width: '60px',
        fixedWidth: true,
        sortable: true,
        align: DataGrid.DataGrid.Align.Right
      },
      {
        id: 'unusedSize',
        title: ls`Unused Bytes`,
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
        if (this._isVisibleFilter(node._coverageInfo)) {
          hadUpdates = node._refreshIfNeeded(maxSize) || hadUpdates;
        }
        continue;
      }
      node = new GridNode(entry, maxSize);
      this._nodeForCoverageInfo.set(entry, node);
      if (this._isVisibleFilter(node._coverageInfo)) {
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
      const shouldBeVisible = this._isVisibleFilter(node._coverageInfo);
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

  /**
   * @param {string} url
   */
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
    const sortFunction =
        /** @type {null|function(!DataGrid.SortableDataGrid.SortableDataGridNode<!GridNode>, !DataGrid.SortableDataGrid.SortableDataGridNode<!GridNode>):number} */
        (GridNode.sortFunctionForColumn(columnId));
    if (!sortFunction) {
      return;
    }
    this._dataGrid.sortNodes(sortFunction, !this._dataGrid.isSortOrderAscending());
  }
}

/**
 * @extends {DataGrid.SortableDataGrid.SortableDataGridNode<!GridNode>}
 */
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
   * @return {!HTMLElement}
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
        cell.textContent = coverageTypeToString(this._coverageInfo.type());
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
    if (!this._highlightRegExp) {
      return;
    }
    const matches = this._highlightRegExp.exec(textContent);
    if (!matches || !matches.length) {
      return;
    }
    const range = new TextUtils.TextRange.SourceRange(matches.index, matches[0].length);
    UI.UIUtils.highlightRangesWithStyleClass(element, [range], 'filter-highlight');
  }

  /**
   *
   * @param {string} columnId
   * @returns {null|function(!GridNode, !GridNode):number}
   */
  static sortFunctionForColumn(columnId) {
    /**
     * @param {!GridNode} a
     * @param {!GridNode} b
     */
    const compareURL = (a, b) => a._url.localeCompare(b._url);
    switch (columnId) {
      case 'url':
        return compareURL;
      case 'type':
        return (a, b) => {
          const typeA = coverageTypeToString(a._coverageInfo.type());
          const typeB = coverageTypeToString(b._coverageInfo.type());
          return typeA.localeCompare(typeB) || compareURL(a, b);
        };
      case 'size':
        return (a, b) => a._coverageInfo.size() - b._coverageInfo.size() || compareURL(a, b);
      case 'bars':
      case 'unusedSize':
        return (a, b) => a._coverageInfo.unusedSize() - b._coverageInfo.unusedSize() || compareURL(a, b);
      default:
        console.assert(false, 'Unknown sort field: ' + columnId);
        return null;
    }
  }
}
