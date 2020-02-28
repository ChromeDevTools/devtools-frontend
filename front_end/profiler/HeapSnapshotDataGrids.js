/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as Components from '../components/components.js';
import * as DataGrid from '../data_grid/data_grid.js';
import * as HeapSnapshotModel from '../heap_snapshot_model/heap_snapshot_model.js';
import * as SDK from '../sdk/sdk.js';  // eslint-disable-line no-unused-vars
import * as UI from '../ui/ui.js';

import {AllocationGridNode, HeapSnapshotConstructorNode, HeapSnapshotDiffNode, HeapSnapshotGridNode, HeapSnapshotObjectNode, HeapSnapshotRetainingObjectNode,} from './HeapSnapshotGridNodes.js';  // eslint-disable-line no-unused-vars
import {HeapSnapshotProxy} from './HeapSnapshotProxy.js';  // eslint-disable-line no-unused-vars
import {DataDisplayDelegate} from './ProfileHeader.js';    // eslint-disable-line no-unused-vars

/**
 * @unrestricted
 */
export class HeapSnapshotSortableDataGrid extends DataGrid.DataGrid.DataGridImpl {
  /**
   * @param {?SDK.HeapProfilerModel.HeapProfilerModel} heapProfilerModel
   * @param {!DataDisplayDelegate} dataDisplayDelegate
   * @param {!DataGrid.DataGrid.Parameters} dataGridParameters
   */
  constructor(heapProfilerModel, dataDisplayDelegate, dataGridParameters) {
    // TODO(allada) This entire class needs to be converted to use the templates in DataGridNode.
    super(dataGridParameters);
    this._heapProfilerModel = heapProfilerModel;
    this._dataDisplayDelegate = dataDisplayDelegate;
    const tooltips = [
      ['distance', ls`Distance from window object`], ['shallowSize', ls`Size of the object itself in bytes`],
      ['retainedSize', ls`Size of the object plus the graph it retains in bytes`]
    ];
    for (const info of tooltips) {
      const headerCell = this.headerTableHeader(info[0]);
      if (headerCell) {
        headerCell.setAttribute('title', info[1]);
      }
    }

    /**
     * @type {number}
     */
    this._recursiveSortingDepth = 0;
    /**
     * @type {?HeapSnapshotGridNode}
     */
    this._highlightedNode = null;
    /**
     * @type {boolean}
     */
    this._populatedAndSorted = false;
    /**
     * @type {?UI.Toolbar.ToolbarInput}
     */
    this._nameFilter = null;
    this._nodeFilter = new HeapSnapshotModel.HeapSnapshotModel.NodeFilter();
    this.addEventListener(HeapSnapshotSortableDataGrid.Events.SortingComplete, this._sortingComplete, this);
    this.addEventListener(DataGrid.DataGrid.Events.SortingChanged, this.sortingChanged, this);
    this.setRowContextMenuCallback(this._populateContextMenu.bind(this));
  }

  /**
   * @return {?SDK.HeapProfilerModel.HeapProfilerModel}
   */
  heapProfilerModel() {
    return this._heapProfilerModel;
  }

  /**
   * @return {!DataDisplayDelegate}
   */
  dataDisplayDelegate() {
    return this._dataDisplayDelegate;
  }

  /**
   * @return {!HeapSnapshotModel.HeapSnapshotModel.NodeFilter}
   */
  nodeFilter() {
    return this._nodeFilter;
  }

  /**
   * @param {!UI.Toolbar.ToolbarInput} nameFilter
   */
  setNameFilter(nameFilter) {
    this._nameFilter = nameFilter;
  }

  /**
   * @return {number}
   */
  defaultPopulateCount() {
    return 100;
  }

  _disposeAllNodes() {
    const children = this.topLevelNodes();
    for (let i = 0, l = children.length; i < l; ++i) {
      children[i].dispose();
    }
  }

  /**
   * @override
   */
  wasShown() {
    if (this._nameFilter) {
      this._nameFilter.addEventListener(UI.Toolbar.ToolbarInput.Event.TextChanged, this._onNameFilterChanged, this);
      this.updateVisibleNodes(true);
    }
    if (this._populatedAndSorted) {
      this.dispatchEventToListeners(HeapSnapshotSortableDataGrid.Events.ContentShown, this);
    }
  }

  _sortingComplete() {
    this.removeEventListener(HeapSnapshotSortableDataGrid.Events.SortingComplete, this._sortingComplete, this);
    this._populatedAndSorted = true;
    this.dispatchEventToListeners(HeapSnapshotSortableDataGrid.Events.ContentShown, this);
  }

  /**
   * @override
   */
  willHide() {
    if (this._nameFilter) {
      this._nameFilter.removeEventListener(UI.Toolbar.ToolbarInput.Event.TextChanged, this._onNameFilterChanged, this);
    }
    this._clearCurrentHighlight();
  }

  /**
   * @param {!UI.ContextMenu.ContextMenu} contextMenu
   * @param {!DataGrid.DataGrid.DataGridNode} gridNode
   */
  _populateContextMenu(contextMenu, gridNode) {
    const node = /** @type {!HeapSnapshotGridNode} */ (gridNode);
    node.populateContextMenu(contextMenu, this._dataDisplayDelegate, this.heapProfilerModel());

    if (gridNode.linkElement && !contextMenu.containsTarget(gridNode.linkElement)) {
      contextMenu.appendApplicableItems(gridNode.linkElement);
    }
  }

  resetSortingCache() {
    delete this._lastSortColumnId;
    delete this._lastSortAscending;
  }

  /**
   * @return {!Array<!HeapSnapshotGridNode>}
   */
  topLevelNodes() {
    return this.rootNode().children;
  }

  /**
   * @param {!Protocol.HeapProfiler.HeapSnapshotObjectId} heapSnapshotObjectId
   * @return {!Promise<?HeapSnapshotGridNode>}
   */
  revealObjectByHeapSnapshotId(heapSnapshotObjectId) {
    return Promise.resolve(/** @type {?HeapSnapshotGridNode} */ (null));
  }

  /**
   * @param {!HeapSnapshotGridNode} node
   */
  highlightNode(node) {
    this._clearCurrentHighlight();
    this._highlightedNode = node;
    UI.UIUtils.runCSSAnimationOnce(this._highlightedNode.element(), 'highlighted-row');
  }

  _clearCurrentHighlight() {
    if (!this._highlightedNode) {
      return;
    }
    this._highlightedNode.element().classList.remove('highlighted-row');
    this._highlightedNode = null;
  }

  resetNameFilter() {
    this._nameFilter.setValue('');
  }

  _onNameFilterChanged() {
    this.updateVisibleNodes(true);
    this._deselectFilteredNodes();
  }

  _deselectFilteredNodes() {
    let currentNode = this.selectedNode;
    while (currentNode) {
      if (this._isFilteredOut(currentNode)) {
        this.selectedNode.deselect();
        this.selectedNode = null;
        return;
      }
      currentNode = currentNode.parent;
    }
  }

  sortingChanged() {
    const sortAscending = this.isSortOrderAscending();
    const sortColumnId = this.sortColumnId();
    if (this._lastSortColumnId === sortColumnId && this._lastSortAscending === sortAscending) {
      return;
    }
    this._lastSortColumnId = sortColumnId;
    this._lastSortAscending = sortAscending;
    const sortFields = this._sortFields(sortColumnId, sortAscending);

    function SortByTwoFields(nodeA, nodeB) {
      let field1 = nodeA[sortFields[0]];
      let field2 = nodeB[sortFields[0]];
      let result = field1 < field2 ? -1 : (field1 > field2 ? 1 : 0);
      if (!sortFields[1]) {
        result = -result;
      }
      if (result !== 0) {
        return result;
      }
      field1 = nodeA[sortFields[2]];
      field2 = nodeB[sortFields[2]];
      result = field1 < field2 ? -1 : (field1 > field2 ? 1 : 0);
      if (!sortFields[3]) {
        result = -result;
      }
      return result;
    }
    this._performSorting(SortByTwoFields);
  }

  _performSorting(sortFunction) {
    this.recursiveSortingEnter();
    const children = this.allChildren(this.rootNode());
    this.rootNode().removeChildren();
    children.sort(sortFunction);
    for (let i = 0, l = children.length; i < l; ++i) {
      const child = children[i];
      this.appendChildAfterSorting(child);
      if (child.expanded) {
        child.sort();
      }
    }
    this.recursiveSortingLeave();
  }

  appendChildAfterSorting(child) {
    const revealed = child.revealed;
    this.rootNode().appendChild(child);
    child.revealed = revealed;
  }

  recursiveSortingEnter() {
    ++this._recursiveSortingDepth;
  }

  recursiveSortingLeave() {
    if (!this._recursiveSortingDepth) {
      return;
    }
    if (--this._recursiveSortingDepth) {
      return;
    }
    this.updateVisibleNodes(true);
    this.dispatchEventToListeners(HeapSnapshotSortableDataGrid.Events.SortingComplete);
  }

  /**
   * @param {boolean} force
   */
  updateVisibleNodes(force) {
  }

  /**
   * @param {!DataGrid.DataGrid.DataGridNode} parent
   * @return {!Array.<!HeapSnapshotGridNode>}
   */
  allChildren(parent) {
    return parent.children;
  }

  /**
   * @param {!DataGrid.DataGrid.DataGridNode} parent
   * @param {!DataGrid.DataGrid.DataGridNode} node
   * @param {number} index
   */
  insertChild(parent, node, index) {
    parent.insertChild(node, index);
  }

  /**
   * @param {!HeapSnapshotGridNode} parent
   * @param {number} index
   */
  removeChildByIndex(parent, index) {
    parent.removeChild(parent.children[index]);
  }

  /**
   * @param {!HeapSnapshotGridNode} parent
   */
  removeAllChildren(parent) {
    parent.removeChildren();
  }
}

/** @override @suppress {checkPrototypalTypes} @enum {symbol} */
HeapSnapshotSortableDataGrid.Events = {
  ContentShown: Symbol('ContentShown'),
  SortingComplete: Symbol('SortingComplete')
};

/**
 * @unrestricted
 */
export class HeapSnapshotViewportDataGrid extends HeapSnapshotSortableDataGrid {
  /**
   * @param {?SDK.HeapProfilerModel.HeapProfilerModel} heapProfilerModel
   * @param {!DataDisplayDelegate} dataDisplayDelegate
   * @param {!DataGrid.DataGrid.Parameters} dataGridParameters
   */
  constructor(heapProfilerModel, dataDisplayDelegate, dataGridParameters) {
    super(heapProfilerModel, dataDisplayDelegate, dataGridParameters);
    this.scrollContainer.addEventListener('scroll', this._onScroll.bind(this), true);
    this._topPaddingHeight = 0;
    this._bottomPaddingHeight = 0;
  }

  /**
   * @override
   * @return {!Array.<!HeapSnapshotGridNode>}
   */
  topLevelNodes() {
    return this.allChildren(this.rootNode());
  }

  /**
   * @override
   */
  appendChildAfterSorting(child) {
    // Do nothing here, it will be added in updateVisibleNodes.
  }

  /**
   * @override
   * @param {boolean} force
   */
  updateVisibleNodes(force) {
    // Guard zone is used to ensure there are always some extra items
    // above and below the viewport to support keyboard navigation.
    const guardZoneHeight = 40;
    const scrollHeight = this.scrollContainer.scrollHeight;
    let scrollTop = this.scrollContainer.scrollTop;
    let scrollBottom = scrollHeight - scrollTop - this.scrollContainer.offsetHeight;
    scrollTop = Math.max(0, scrollTop - guardZoneHeight);
    scrollBottom = Math.max(0, scrollBottom - guardZoneHeight);
    let viewPortHeight = scrollHeight - scrollTop - scrollBottom;
    // Do nothing if populated nodes still fit the viewport.
    if (!force && scrollTop >= this._topPaddingHeight && scrollBottom >= this._bottomPaddingHeight) {
      return;
    }
    const hysteresisHeight = 500;
    scrollTop -= hysteresisHeight;
    viewPortHeight += 2 * hysteresisHeight;
    const selectedNode = this.selectedNode;
    this.rootNode().removeChildren();

    this._topPaddingHeight = 0;
    this._bottomPaddingHeight = 0;

    this._addVisibleNodes(this.rootNode(), scrollTop, scrollTop + viewPortHeight);

    this.setVerticalPadding(this._topPaddingHeight, this._bottomPaddingHeight);

    if (selectedNode) {
      // Keep selection even if the node is not in the current viewport.
      if (selectedNode.parent) {
        selectedNode.select(true);
      } else {
        this.selectedNode = selectedNode;
      }
    }
  }

  /**
   * @param {!DataGrid.DataGrid.DataGridNode} parentNode
   * @param {number} topBound
   * @param {number} bottomBound
   * @return {number}
   */
  _addVisibleNodes(parentNode, topBound, bottomBound) {
    if (!parentNode.expanded) {
      return 0;
    }

    const children = this.allChildren(parentNode);
    let topPadding = 0;
    // Iterate over invisible nodes beyond the upper bound of viewport.
    // Do not insert them into the grid, but count their total height.
    let i = 0;
    for (; i < children.length; ++i) {
      const child = children[i];
      if (this._isFilteredOut(child)) {
        continue;
      }
      const newTop = topPadding + this._nodeHeight(child);
      if (newTop > topBound) {
        break;
      }
      topPadding = newTop;
    }

    // Put visible nodes into the data grid.
    let position = topPadding;
    for (; i < children.length && position < bottomBound; ++i) {
      const child = children[i];
      if (this._isFilteredOut(child)) {
        continue;
      }
      const hasChildren = child.hasChildren();
      child.removeChildren();
      child.setHasChildren(hasChildren);
      parentNode.appendChild(child);
      position += child.nodeSelfHeight();
      position += this._addVisibleNodes(child, topBound - position, bottomBound - position);
    }

    // Count the invisible nodes beyond the bottom bound of the viewport.
    let bottomPadding = 0;
    for (; i < children.length; ++i) {
      const child = children[i];
      if (this._isFilteredOut(child)) {
        continue;
      }
      bottomPadding += this._nodeHeight(child);
    }

    this._topPaddingHeight += topPadding;
    this._bottomPaddingHeight += bottomPadding;
    return position + bottomPadding;
  }

  /**
   * @param {!HeapSnapshotGridNode} node
   * @return {boolean}
   */
  _isFilteredOut(node) {
    const nameFilterValue = this._nameFilter ? this._nameFilter.value().toLowerCase() : '';
    if (nameFilterValue && node.filteredOut && node.filteredOut(nameFilterValue)) {
      return true;
    }
    return false;
  }

  /**
   * @param {!HeapSnapshotGridNode} node
   * @return {number}
   */
  _nodeHeight(node) {
    let result = node.nodeSelfHeight();
    if (!node.expanded) {
      return result;
    }
    const children = this.allChildren(node);
    for (let i = 0; i < children.length; i++) {
      result += this._nodeHeight(children[i]);
    }
    return result;
  }

  /**
   * @param {!Array<!HeapSnapshotGridNode>} pathToReveal
   * @return {!Promise<!Profiler.HeapSnapshotGridNode>}
   */
  revealTreeNode(pathToReveal) {
    const height = this._calculateOffset(pathToReveal);
    const node = /** @type {!HeapSnapshotGridNode} */ (pathToReveal.peekLast());
    const scrollTop = this.scrollContainer.scrollTop;
    const scrollBottom = scrollTop + this.scrollContainer.offsetHeight;
    if (height >= scrollTop && height < scrollBottom) {
      return Promise.resolve(node);
    }

    const scrollGap = 40;
    this.scrollContainer.scrollTop = Math.max(0, height - scrollGap);
    return new Promise(resolve => {
      console.assert(!this._scrollToResolveCallback);
      this._scrollToResolveCallback = resolve.bind(null, node);
      // Still resolve the promise if it does not scroll for some reason.
      this.scrollContainer.window().requestAnimationFrame(() => {
        if (!this._scrollToResolveCallback) {
          return;
        }
        this._scrollToResolveCallback();
        this._scrollToResolveCallback = null;
      });
    });
  }

  /**
   * @param {!Array.<!HeapSnapshotGridNode>} pathToReveal
   * @return {number}
   */
  _calculateOffset(pathToReveal) {
    let parentNode = this.rootNode();
    let height = 0;
    for (let i = 0; i < pathToReveal.length; ++i) {
      const node = pathToReveal[i];
      const children = this.allChildren(parentNode);
      for (let j = 0; j < children.length; ++j) {
        const child = children[j];
        if (node === child) {
          height += node.nodeSelfHeight();
          break;
        }
        height += this._nodeHeight(child);
      }
      parentNode = node;
    }
    return height - pathToReveal.peekLast().nodeSelfHeight();
  }

  /**
   * @override
   * @param {!DataGrid.DataGrid.DataGridNode} parent
   * @return {!Array.<!HeapSnapshotGridNode>}
   */
  allChildren(parent) {
    return parent._allChildren || (parent._allChildren = []);
  }

  /**
   * @param {!DataGrid.DataGrid.DataGridNode} parent
   * @param {!HeapSnapshotGridNode} node
   */
  appendNode(parent, node) {
    this.allChildren(parent).push(node);
  }

  /**
   * @override
   * @param {!DataGrid.DataGrid.DataGridNode} parent
   * @param {!DataGrid.DataGrid.DataGridNode} node
   * @param {number} index
   */
  insertChild(parent, node, index) {
    this.allChildren(parent).splice(index, 0, /** @type {!HeapSnapshotGridNode} */ (node));
  }

  /**
   * @override
   */
  removeChildByIndex(parent, index) {
    this.allChildren(parent).splice(index, 1);
  }

  /**
   * @override
   */
  removeAllChildren(parent) {
    parent._allChildren = [];
  }

  removeTopLevelNodes() {
    this._disposeAllNodes();
    this.rootNode().removeChildren();
    this.rootNode()._allChildren = [];
  }

  /**
   * @param {!Element} element
   * @return {boolean}
   */
  _isScrolledIntoView(element) {
    const viewportTop = this.scrollContainer.scrollTop;
    const viewportBottom = viewportTop + this.scrollContainer.clientHeight;
    const elemTop = element.offsetTop;
    const elemBottom = elemTop + element.offsetHeight;
    return elemBottom <= viewportBottom && elemTop >= viewportTop;
  }

  /**
   * @override
   */
  onResize() {
    super.onResize();
    this.updateVisibleNodes(false);
  }

  /**
   * @param {!Event} event
   */
  _onScroll(event) {
    this.updateVisibleNodes(false);

    if (this._scrollToResolveCallback) {
      this._scrollToResolveCallback();
      this._scrollToResolveCallback = null;
    }
  }
}

/**
 * @unrestricted
 */
export class HeapSnapshotContainmentDataGrid extends HeapSnapshotSortableDataGrid {
  /**
   * @param {?SDK.HeapProfilerModel.HeapProfilerModel} heapProfilerModel
   * @param {!DataDisplayDelegate} dataDisplayDelegate
   * @param {string} displayName
   * @param {!Array.<!DataGrid.DataGrid.ColumnDescriptor>=} columns
   */
  constructor(heapProfilerModel, dataDisplayDelegate, displayName, columns) {
    columns = columns || (/** @type {!Array<!DataGrid.DataGrid.ColumnDescriptor>} */ ([
                {id: 'object', title: ls`Object`, disclosure: true, sortable: true},
                {id: 'distance', title: ls`Distance`, width: '70px', sortable: true, fixedWidth: true},
                {id: 'shallowSize', title: ls`Shallow Size`, width: '110px', sortable: true, fixedWidth: true}, {
                  id: 'retainedSize',
                  title: ls`Retained Size`,
                  width: '110px',
                  sortable: true,
                  fixedWidth: true,
                  sort: DataGrid.DataGrid.Order.Descending
                }
              ]));
    const dataGridParameters = {displayName, columns};
    super(heapProfilerModel, dataDisplayDelegate, dataGridParameters);
  }

  /**
   * @param {!HeapSnapshotProxy} snapshot
   * @param {number} nodeIndex
   */
  setDataSource(snapshot, nodeIndex) {
    this.snapshot = snapshot;
    const node = {nodeIndex: nodeIndex || snapshot.rootNodeIndex};
    const fakeEdge = {node: node};
    this.setRootNode(this._createRootNode(snapshot, fakeEdge));
    this.rootNode().sort();
  }

  _createRootNode(snapshot, fakeEdge) {
    return new HeapSnapshotObjectNode(this, snapshot, fakeEdge, null);
  }

  /**
   * @override
   */
  sortingChanged() {
    const rootNode = this.rootNode();
    if (rootNode.hasChildren()) {
      rootNode.sort();
    }
  }
}

/**
 * @unrestricted
 */
export class HeapSnapshotRetainmentDataGrid extends HeapSnapshotContainmentDataGrid {
  /**
   * @param {?SDK.HeapProfilerModel.HeapProfilerModel} heapProfilerModel
   * @param {!DataDisplayDelegate} dataDisplayDelegate
   */
  constructor(heapProfilerModel, dataDisplayDelegate) {
    const columns = /** @type {!Array<!DataGrid.DataGrid.ColumnDescriptor>} */ ([
      {id: 'object', title: ls`Object`, disclosure: true, sortable: true}, {
        id: 'distance',
        title: ls`Distance`,
        width: '70px',
        sortable: true,
        fixedWidth: true,
        sort: DataGrid.DataGrid.Order.Ascending
      },
      {id: 'shallowSize', title: ls`Shallow Size`, width: '110px', sortable: true, fixedWidth: true},
      {id: 'retainedSize', title: ls`Retained Size`, width: '110px', sortable: true, fixedWidth: true}
    ]);
    super(heapProfilerModel, dataDisplayDelegate, ls`Heap Snapshot Retainment`, columns);
  }

  /**
   * @override
   */
  _createRootNode(snapshot, fakeEdge) {
    return new HeapSnapshotRetainingObjectNode(this, snapshot, fakeEdge, null);
  }

  _sortFields(sortColumn, sortAscending) {
    return {
      object: ['_name', sortAscending, '_count', false],
      count: ['_count', sortAscending, '_name', true],
      shallowSize: ['_shallowSize', sortAscending, '_name', true],
      retainedSize: ['_retainedSize', sortAscending, '_name', true],
      distance: ['_distance', sortAscending, '_name', true]
    }[sortColumn];
  }

  reset() {
    this.rootNode().removeChildren();
    this.resetSortingCache();
  }

  /**
   * @override
   * @param {!HeapSnapshotProxy} snapshot
   * @param {number} nodeIndex
   */
  setDataSource(snapshot, nodeIndex) {
    super.setDataSource(snapshot, nodeIndex);
    this.rootNode().expand();
  }
}

/** @override @suppress {checkPrototypalTypes} @enum {symbol} */
HeapSnapshotRetainmentDataGrid.Events = {
  ExpandRetainersComplete: Symbol('ExpandRetainersComplete')
};

/**
 * @unrestricted
 */
export class HeapSnapshotConstructorsDataGrid extends HeapSnapshotViewportDataGrid {
  /**
   * @param {?SDK.HeapProfilerModel.HeapProfilerModel} heapProfilerModel
   * @param {!DataDisplayDelegate} dataDisplayDelegate
   */
  constructor(heapProfilerModel, dataDisplayDelegate) {
    const columns = /** @type {!Array<!DataGrid.DataGrid.ColumnDescriptor>} */ ([
      {id: 'object', title: ls`Constructor`, disclosure: true, sortable: true},
      {id: 'distance', title: ls`Distance`, width: '70px', sortable: true, fixedWidth: true},
      {id: 'shallowSize', title: ls`Shallow Size`, width: '110px', sortable: true, fixedWidth: true}, {
        id: 'retainedSize',
        title: ls`Retained Size`,
        width: '110px',
        sort: DataGrid.DataGrid.Order.Descending,
        sortable: true,
        fixedWidth: true
      }
    ]);
    super(heapProfilerModel, dataDisplayDelegate, {displayName: ls`Heap Snapshot Constructors`, columns});
    this._profileIndex = -1;
    this._objectIdToSelect = null;
  }

  /**
   * @param {string} sortColumn
   * @param {boolean} sortAscending
   * @return {!Array}
   */
  _sortFields(sortColumn, sortAscending) {
    return {
      object: ['_name', sortAscending, '_retainedSize', false],
      distance: ['_distance', sortAscending, '_retainedSize', false],
      shallowSize: ['_shallowSize', sortAscending, '_name', true],
      retainedSize: ['_retainedSize', sortAscending, '_name', true]
    }[sortColumn];
  }

  /**
   * @override
   * @param {!Protocol.HeapProfiler.HeapSnapshotObjectId} id
   * @return {!Promise<?HeapSnapshotGridNode>}
   */
  async revealObjectByHeapSnapshotId(id) {
    if (!this.snapshot) {
      this._objectIdToSelect = id;
      return null;
    }

    const className = await this.snapshot.nodeClassName(parseInt(id, 10));
    if (!className) {
      return null;
    }

    const parent = this.topLevelNodes().find(classNode => classNode._name === className);
    if (!parent) {
      return null;
    }

    const nodes = await parent.populateNodeBySnapshotObjectId(parseInt(id, 10));
    return nodes.length ? this.revealTreeNode(nodes) : null;
  }

  clear() {
    this._nextRequestedFilter = null;
    this._lastFilter = null;
    this.removeTopLevelNodes();
  }

  /**
   * @param {!HeapSnapshotProxy} snapshot
   */
  setDataSource(snapshot) {
    this.snapshot = snapshot;
    if (this._profileIndex === -1) {
      this._populateChildren();
    }

    if (this._objectIdToSelect) {
      this.revealObjectByHeapSnapshotId(this._objectIdToSelect);
      this._objectIdToSelect = null;
    }
  }

  /**
   * @param {number} minNodeId
   * @param {number} maxNodeId
   */
  setSelectionRange(minNodeId, maxNodeId) {
    this._nodeFilter = new HeapSnapshotModel.HeapSnapshotModel.NodeFilter(minNodeId, maxNodeId);
    this._populateChildren(this._nodeFilter);
  }

  /**
   * @param {number} allocationNodeId
   */
  setAllocationNodeId(allocationNodeId) {
    this._nodeFilter = new HeapSnapshotModel.HeapSnapshotModel.NodeFilter();
    this._nodeFilter.allocationNodeId = allocationNodeId;
    this._populateChildren(this._nodeFilter);
  }

  /**
   * @param {!HeapSnapshotModel.HeapSnapshotModel.NodeFilter} nodeFilter
   * @param {!Object<string, !HeapSnapshotModel.HeapSnapshotModel.Aggregate>} aggregates
   */
  _aggregatesReceived(nodeFilter, aggregates) {
    this._filterInProgress = null;
    if (this._nextRequestedFilter) {
      this.snapshot.aggregatesWithFilter(this._nextRequestedFilter)
          .then(this._aggregatesReceived.bind(this, this._nextRequestedFilter));
      this._filterInProgress = this._nextRequestedFilter;
      this._nextRequestedFilter = null;
    }
    this.removeTopLevelNodes();
    this.resetSortingCache();
    for (const constructor in aggregates) {
      this.appendNode(
          this.rootNode(), new HeapSnapshotConstructorNode(this, constructor, aggregates[constructor], nodeFilter));
    }
    this.sortingChanged();
    this._lastFilter = nodeFilter;
  }

  /**
   * @param {!HeapSnapshotModel.HeapSnapshotModel.NodeFilter=} maybeNodeFilter
   */
  async _populateChildren(maybeNodeFilter) {
    const nodeFilter = maybeNodeFilter || new HeapSnapshotModel.HeapSnapshotModel.NodeFilter();

    if (this._filterInProgress) {
      this._nextRequestedFilter = this._filterInProgress.equals(nodeFilter) ? null : nodeFilter;
      return;
    }
    if (this._lastFilter && this._lastFilter.equals(nodeFilter)) {
      return;
    }
    this._filterInProgress = nodeFilter;

    const aggregates = await this.snapshot.aggregatesWithFilter(nodeFilter);
    this._aggregatesReceived(nodeFilter, aggregates);
  }

  filterSelectIndexChanged(profiles, profileIndex) {
    this._profileIndex = profileIndex;
    this._nodeFilter = undefined;
    if (profileIndex !== -1) {
      const minNodeId = profileIndex > 0 ? profiles[profileIndex - 1].maxJSObjectId : 0;
      const maxNodeId = profiles[profileIndex].maxJSObjectId;
      this._nodeFilter = new HeapSnapshotModel.HeapSnapshotModel.NodeFilter(minNodeId, maxNodeId);
    }

    this._populateChildren(this._nodeFilter);
  }
}

/**
 * @unrestricted
 */
export class HeapSnapshotDiffDataGrid extends HeapSnapshotViewportDataGrid {
  /**
   * @param {?SDK.HeapProfilerModel.HeapProfilerModel} heapProfilerModel
   * @param {!DataDisplayDelegate} dataDisplayDelegate
   */
  constructor(heapProfilerModel, dataDisplayDelegate) {
    const columns = /** @type {!Array<!DataGrid.DataGrid.ColumnDescriptor>} */ ([
      {id: 'object', title: ls`Constructor`, disclosure: true, sortable: true},
      {id: 'addedCount', title: ls`# New`, width: '75px', sortable: true, fixedWidth: true},
      {id: 'removedCount', title: ls`# Deleted`, width: '75px', sortable: true, fixedWidth: true},
      {id: 'countDelta', title: ls`# Delta`, width: '65px', sortable: true, fixedWidth: true}, {
        id: 'addedSize',
        title: ls`Alloc. Size`,
        width: '75px',
        sortable: true,
        fixedWidth: true,
        sort: DataGrid.DataGrid.Order.Descending
      },
      {id: 'removedSize', title: ls`Freed Size`, width: '75px', sortable: true, fixedWidth: true},
      {id: 'sizeDelta', title: ls`Size Delta`, width: '75px', sortable: true, fixedWidth: true}
    ]);
    super(heapProfilerModel, dataDisplayDelegate, {displayName: ls`Heap Snapshot Diff`, columns});
  }

  /**
   * @override
   * @return {number}
   */
  defaultPopulateCount() {
    return 50;
  }

  _sortFields(sortColumn, sortAscending) {
    return {
      object: ['_name', sortAscending, '_count', false],
      addedCount: ['_addedCount', sortAscending, '_name', true],
      removedCount: ['_removedCount', sortAscending, '_name', true],
      countDelta: ['_countDelta', sortAscending, '_name', true],
      addedSize: ['_addedSize', sortAscending, '_name', true],
      removedSize: ['_removedSize', sortAscending, '_name', true],
      sizeDelta: ['_sizeDelta', sortAscending, '_name', true]
    }[sortColumn];
  }

  setDataSource(snapshot) {
    this.snapshot = snapshot;
  }

  /**
   * @param {!HeapSnapshotProxy} baseSnapshot
   */
  setBaseDataSource(baseSnapshot) {
    this.baseSnapshot = baseSnapshot;
    this.removeTopLevelNodes();
    this.resetSortingCache();
    if (this.baseSnapshot === this.snapshot) {
      this.dispatchEventToListeners(HeapSnapshotSortableDataGrid.Events.SortingComplete);
      return;
    }
    this._populateChildren();
  }

  async _populateChildren() {
    // Two snapshots live in different workers isolated from each other. That is why
    // we first need to collect information about the nodes in the first snapshot and
    // then pass it to the second snapshot to calclulate the diff.
    const aggregatesForDiff = await this.baseSnapshot.aggregatesForDiff();
    const diffByClassName = await this.snapshot.calculateSnapshotDiff(this.baseSnapshot.uid, aggregatesForDiff);

    for (const className in diffByClassName) {
      const diff = diffByClassName[className];
      this.appendNode(this.rootNode(), new HeapSnapshotDiffNode(this, className, diff));
    }
    this.sortingChanged();
  }
}

/**
 * @unrestricted
 */
export class AllocationDataGrid extends HeapSnapshotViewportDataGrid {
  /**
   * @param {?SDK.HeapProfilerModel.HeapProfilerModel} heapProfilerModel
   * @param {!DataDisplayDelegate} dataDisplayDelegate
   */
  constructor(heapProfilerModel, dataDisplayDelegate) {
    const columns = /** @type {!Array<!DataGrid.DataGrid.ColumnDescriptor>} */ ([
      {id: 'liveCount', title: ls`Live Count`, width: '75px', sortable: true, fixedWidth: true},
      {id: 'count', title: ls`Count`, width: '65px', sortable: true, fixedWidth: true},
      {id: 'liveSize', title: ls`Live Size`, width: '75px', sortable: true, fixedWidth: true},
      {
        id: 'size',
        title: ls`Size`,
        width: '75px',
        sortable: true,
        fixedWidth: true,
        sort: DataGrid.DataGrid.Order.Descending
      },
      {id: 'name', title: ls`Function`, disclosure: true, sortable: true},
    ]);
    super(heapProfilerModel, dataDisplayDelegate, {displayName: ls`Allocation`, columns});
    this._linkifier = new Components.Linkifier.Linkifier();
  }

  dispose() {
    this._linkifier.reset();
  }

  /**
   * @param {!HeapSnapshotProxy} snapshot
   */
  async setDataSource(snapshot) {
    this.snapshot = snapshot;
    this._topNodes = await this.snapshot.allocationTracesTops();
    this._populateChildren();
  }

  _populateChildren() {
    this.removeTopLevelNodes();
    const root = this.rootNode();
    const tops = this._topNodes;
    for (const top of tops) {
      this.appendNode(root, new AllocationGridNode(this, top));
    }
    this.updateVisibleNodes(true);
  }

  /**
   * @override
   */
  sortingChanged() {
    this._topNodes.sort(this._createComparator());
    this.rootNode().removeChildren();
    this._populateChildren();
  }

  /**
   * @return {function(!Object, !Object):number}
   */
  _createComparator() {
    const fieldName = this.sortColumnId();
    const compareResult = (this.sortOrder() === DataGrid.DataGrid.Order.Ascending) ? +1 : -1;
    /**
     * @param {!Object} a
     * @param {!Object} b
     * @return {number}
     */
    function compare(a, b) {
      if (a[fieldName] > b[fieldName]) {
        return compareResult;
      }
      if (a[fieldName] < b[fieldName]) {
        return -compareResult;
      }
      return 0;
    }
    return compare;
  }
}
